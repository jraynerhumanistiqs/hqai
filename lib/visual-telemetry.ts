// Reviewer Visual Telemetry (Tier 2) - browser-side face detection
// using MediaPipe FaceLandmarker.
//
// This module is intentionally narrow:
//   - It runs ONLY in the browser.
//   - It produces three aggregate numbers per question - never the
//     raw landmarks or the frame data.
//   - The aggregates are persisted alongside the response and shown
//     in a separate "Reviewer Diagnostics" panel.
//   - The aggregates are NEVER passed to any AI scoring pipeline.
//     This is the second AIA prerequisite for shipping Tier 2 and
//     is enforced by code path: the score route reads transcripts,
//     not this column.
//
// See docs/AIA-visual-telemetry.md for the full impact assessment.

import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision'

// Lazy-loaded MediaPipe symbols. The bundle is ~9 MB so we only fetch
// it when the candidate hits "Start recording", not at page load.
let _vision: typeof import('@mediapipe/tasks-vision') | null = null
let _faceLandmarker: FaceLandmarker | null = null

async function ensureLandmarker(): Promise<FaceLandmarker | null> {
  if (_faceLandmarker) return _faceLandmarker
  try {
    if (!_vision) {
      _vision = await import('@mediapipe/tasks-vision')
    }
    const vision = _vision!
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    )
    _faceLandmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
        delegate: 'GPU',
      },
      outputFacialTransformationMatrixes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
    })
    return _faceLandmarker
  } catch (err) {
    console.warn('[visual-telemetry] init failed', err)
    return null
  }
}

export interface VisualSample {
  /** Was a face detected in this frame? */
  faceDetected: boolean
  /** Roughly facing camera (head yaw + pitch within +/- 18 degrees of frontal). */
  atCamera: boolean
  /** Mean pixel luminance 0-1 across the face bounding box. */
  brightness: number
}

export interface VisualAggregate {
  /** Percentage of sampled frames where a face was detected. */
  in_frame_pct: number
  /** Percentage of sampled frames where the head pose was roughly at camera. */
  at_camera_pct: number
  /** Mean face brightness across all sampled frames, 0-100. */
  face_brightness: number
  /** Number of frames sampled. Reviewer can use this to gauge confidence. */
  frames_sampled: number
}

export function emptyAggregate(): VisualAggregate {
  return { in_frame_pct: 0, at_camera_pct: 0, face_brightness: 0, frames_sampled: 0 }
}

export function aggregate(samples: VisualSample[]): VisualAggregate {
  if (samples.length === 0) return emptyAggregate()
  const total = samples.length
  const inFrame = samples.filter(s => s.faceDetected).length
  const atCamera = samples.filter(s => s.atCamera).length
  const brightnessSum = samples.reduce((acc, s) => acc + s.brightness, 0)
  return {
    in_frame_pct: Math.round((inFrame / total) * 100),
    at_camera_pct: inFrame === 0 ? 0 : Math.round((atCamera / inFrame) * 100),
    // If brightness was 0 across all samples (no face ever detected),
    // report 0 - don't try to interpret an empty signal.
    face_brightness: Math.round((brightnessSum / total) * 100),
    frames_sampled: total,
  }
}

// VisualSampler - runs alongside a MediaRecorder. Pass it the active
// HTMLVideoElement and it'll sample at ~2fps until you call .stop().
// .takeSamples() returns the array of samples collected so far and
// clears the internal buffer.
export class VisualSampler {
  private video: HTMLVideoElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private samples: VisualSample[] = []
  private rafId: number | null = null
  private running = false
  private landmarker: FaceLandmarker | null = null
  private lastSampleAt = 0
  private samplePeriodMs = 500

  constructor(video: HTMLVideoElement) {
    this.video = video
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
  }

  async start() {
    if (this.running) return
    // Lazy-load and warm the landmarker BEFORE we say we're running so
    // the first batch of samples is consistent.
    this.landmarker = await ensureLandmarker()
    if (!this.landmarker) {
      // MediaPipe failed to init - we silently degrade. The caller
      // sees zero samples and the diagnostics panel hides.
      return
    }
    this.running = true
    this.samples = []
    this.lastSampleAt = 0
    this.loop()
  }

  stop() {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  takeSamples(): VisualSample[] {
    const out = this.samples
    this.samples = []
    return out
  }

  private loop = () => {
    if (!this.running) return
    const now = performance.now()
    if (now - this.lastSampleAt >= this.samplePeriodMs) {
      this.lastSampleAt = now
      try {
        this.sampleOnce(now)
      } catch (err) {
        // Don't crash the recorder on a bad frame
        console.warn('[visual-telemetry] sample failed', err)
      }
    }
    this.rafId = requestAnimationFrame(this.loop)
  }

  private sampleOnce(timestamp: number) {
    if (!this.landmarker || !this.ctx) return
    const video = this.video
    if (!video.videoWidth || !video.videoHeight) return

    this.canvas.width = video.videoWidth
    this.canvas.height = video.videoHeight
    this.ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)

    const result: FaceLandmarkerResult = this.landmarker.detectForVideo(video, timestamp)
    const faceDetected = (result.faceLandmarks?.length ?? 0) > 0

    let atCamera = false
    let brightness = 0

    if (faceDetected) {
      // Head pose - the facialTransformationMatrixes give us a 4x4
      // matrix. We pull yaw + pitch from the rotation submatrix to
      // decide if the candidate is roughly looking at the camera.
      const mat = result.facialTransformationMatrixes?.[0]?.data
      if (mat && mat.length >= 16) {
        // Extract yaw (rotation around Y axis) and pitch (around X).
        // Standard rotation-matrix-to-Euler decomposition.
        const r11 = mat[0]
        const r21 = mat[4]
        const r31 = mat[8]
        const r32 = mat[9]
        const r33 = mat[10]
        const pitch = Math.atan2(-r31, Math.sqrt(r32 * r32 + r33 * r33))
        const yaw = Math.atan2(r21, r11)
        const deg = (rad: number) => Math.abs(rad * (180 / Math.PI))
        const THRESH_DEG = 18
        atCamera = deg(pitch) <= THRESH_DEG && deg(yaw) <= THRESH_DEG
      }

      // Brightness inside the face bbox (rough - use the first
      // landmark cluster to get a sample region)
      const landmarks = result.faceLandmarks[0]
      let minX = 1, minY = 1, maxX = 0, maxY = 0
      for (const lm of landmarks) {
        if (lm.x < minX) minX = lm.x
        if (lm.y < minY) minY = lm.y
        if (lm.x > maxX) maxX = lm.x
        if (lm.y > maxY) maxY = lm.y
      }
      const w = this.canvas.width
      const h = this.canvas.height
      const sx = Math.max(0, Math.floor(minX * w))
      const sy = Math.max(0, Math.floor(minY * h))
      const sw = Math.max(1, Math.min(w - sx, Math.ceil((maxX - minX) * w)))
      const sh = Math.max(1, Math.min(h - sy, Math.ceil((maxY - minY) * h)))
      try {
        const data = this.ctx.getImageData(sx, sy, sw, sh).data
        let sum = 0
        let count = 0
        // Sample every 4th pixel for speed (~1/16 of full sweep).
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          // Rec. 709 luminance
          sum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
          count += 1
        }
        brightness = count > 0 ? sum / count : 0
      } catch {
        brightness = 0
      }
    }

    this.samples.push({ faceDetected, atCamera, brightness })
  }
}

// Convenience for the candidate-side flow: persists each question's
// aggregate so we can ship the whole shape with the response submit.
export interface PerQuestionVisualDiagnostic {
  q: number  // 1-indexed
  in_frame_pct: number
  at_camera_pct: number
  face_brightness: number
  frames_sampled: number
}

export interface VisualDiagnosticsPayload {
  per_question: PerQuestionVisualDiagnostic[]
  /** Aggregate across all questions */
  overall: VisualAggregate
  /** Whether MediaPipe could load on this device. Used by the UI to
   *  show "Diagnostics unavailable on this browser" gracefully. */
  available: boolean
}

export function rollUp(perQuestion: PerQuestionVisualDiagnostic[]): VisualAggregate {
  if (perQuestion.length === 0) return emptyAggregate()
  const totalFrames = perQuestion.reduce((a, q) => a + q.frames_sampled, 0)
  if (totalFrames === 0) return emptyAggregate()
  const weighted = (key: keyof VisualAggregate) =>
    perQuestion.reduce((a, q) => a + (q[key] as number) * q.frames_sampled, 0) / totalFrames
  return {
    in_frame_pct: Math.round(weighted('in_frame_pct')),
    at_camera_pct: Math.round(weighted('at_camera_pct')),
    face_brightness: Math.round(weighted('face_brightness')),
    frames_sampled: totalFrames,
  }
}
