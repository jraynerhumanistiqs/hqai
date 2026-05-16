'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { analyseSpeech, type SpeechAnalysis } from '@/lib/confidence'
import { SpeechAnalysisPanel } from '@/components/recruit/SpeechAnalysisPanel'
import { VisualSampler, aggregate as aggregateVisual, type PerQuestionVisualDiagnostic } from '@/lib/visual-telemetry'

// Kill switch documented in docs/AIA-visual-telemetry.md section 9.
const VISUAL_TELEMETRY_ENABLED = process.env.NEXT_PUBLIC_VISUAL_TELEMETRY_ENABLED !== 'false'

interface Props {
  questions: string[]
  timeLimitSeconds: number
  onComplete: (videoIds: string[], extras?: { visual_diagnostics?: PerQuestionVisualDiagnostic[] }) => Promise<void>
}

type RecorderState =
  | 'self_view_prompt' // initial pop-up: do you want to see yourself
  | 'init'             // camera coming up
  | 'idle'             // camera ready, awaiting record
  | 'recording'
  | 'uploading'
  | 'review'           // post-record review: video left, transcript right
  | 'error'

// Pick a supported mimeType with graceful fallback (Safari/iOS compat)
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ]
  for (const mt of candidates) {
    try { if (MediaRecorder.isTypeSupported(mt)) return mt } catch {}
  }
  return undefined
}

// Replay cap per question - candidates get 3 looks at their own video
// before the page locks the playback button. We let them watch once
// without ticking the counter on the immediate post-record render so
// the count reflects intentional re-watches only.
const MAX_REPLAYS = 3

// Web Speech API typings live in the global scope but vary by browser.
// We type-cast loosely to keep TS happy without polluting the global.
type LiveRecogniser = {
  start: () => void
  stop: () => void
  abort: () => void
}

export function RecordingFlow({ questions, timeLimitSeconds, onComplete }: Props) {
  // Pop-up "Do you want to see yourself?" runs once at the start. If the
  // candidate says No, the camera still captures video, but the live
  // self-view is hidden behind an opaque card so they don't get
  // anxiety from watching themselves on camera. Recording still ships
  // to Cloudflare exactly the same way.
  const [selfViewPrompted, setSelfViewPrompted] = useState(false)
  const [showSelfView, setShowSelfView] = useState(true)

  const [currentQ, setCurrentQ]     = useState(0)
  const [recState, setRecState]     = useState<RecorderState>('self_view_prompt')
  const [elapsed, setElapsed]       = useState(0)
  const [errorMsg, setErrorMsg]     = useState('')
  const [videoIds, setVideoIds]     = useState<(string | null)[]>(questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)

  // Post-record review state per question
  const [replayCounts, setReplayCounts] = useState<number[]>(questions.map(() => 0))
  const [reviewBlobUrls, setReviewBlobUrls] = useState<(string | null)[]>(questions.map(() => null))
  const [transcripts, setTranscripts] = useState<string[]>(questions.map(() => ''))
  // Multidimensional speech analysis per question - pace, fillers,
  // completion, vocab, pauses. See lib/confidence.ts for the methodology.
  const [speech, setSpeech] = useState<Array<SpeechAnalysis | null>>(questions.map(() => null))
  // Reviewer-only visual diagnostics (in-frame %, at-camera %,
  // brightness). NEVER fed into AI scoring - see
  // docs/AIA-visual-telemetry.md for the formal commitment.
  const [visualDiagnostics, setVisualDiagnostics] = useState<PerQuestionVisualDiagnostic[]>([])
  const visualSamplerRef = useRef<VisualSampler | null>(null)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const reviewVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeRef   = useRef<string | undefined>(undefined)
  const recogniserRef = useRef<LiveRecogniser | null>(null)
  const liveTranscriptRef = useRef<string>('')
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null)

  const initCamera = useCallback(async () => {
    setErrorMsg('')
    setRecState('init')
    try {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try { await videoRef.current.play() } catch {}
      }
      mimeRef.current = pickMimeType()
      if (!mimeRef.current) {
        setRecState('error')
        setErrorMsg('Your browser does not support video recording. Please try Chrome, Edge or Safari 14+.')
        return
      }
      setRecState('idle')
    } catch (err: any) {
      setRecState('error')
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg('Camera and microphone access was blocked. Please allow access in your browser settings and try again.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorMsg('No camera or microphone found. Please connect one and try again.')
      } else if (name === 'NotReadableError') {
        setErrorMsg('Your camera is already in use by another app. Close it and try again.')
      } else {
        setErrorMsg('Could not start your camera. Please check permissions and try again.')
      }
    }
  }, [])

  // Start camera once the candidate has picked self-view yes/no.
  useEffect(() => {
    if (!selfViewPrompted) return
    initCamera()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      stopTts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfViewPrompted])

  // -- Live transcript helper using Web Speech API. Best effort; works in
  // Chrome and Edge, falls back to "(transcript not available)" in other
  // browsers. We don't block recording on transcription.
  function startLiveTranscript() {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      liveTranscriptRef.current = ''
      return
    }
    try {
      const r = new SR() as any
      r.lang = 'en-AU'
      r.continuous = true
      r.interimResults = false
      r.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const txt = e.results[i][0]?.transcript ?? ''
          if (e.results[i].isFinal) {
            liveTranscriptRef.current = (liveTranscriptRef.current + ' ' + txt).trim()
          }
        }
      }
      r.onerror = () => {}
      r.start()
      recogniserRef.current = r
    } catch {
      // ignored - we fall back to a placeholder transcript
    }
  }
  function stopLiveTranscript() {
    try { recogniserRef.current?.stop() } catch {}
    recogniserRef.current = null
  }

  function startRecording() {
    if (!streamRef.current) {
      setRecState('error')
      setErrorMsg('Camera is not ready. Please try again.')
      return
    }
    chunksRef.current = []
    liveTranscriptRef.current = ''
    try {
      const options = mimeRef.current ? { mimeType: mimeRef.current } : undefined
      const mr = new MediaRecorder(streamRef.current, options)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = handleStopAndUpload
      mr.onerror = () => {
        if (timerRef.current) clearInterval(timerRef.current)
        setRecState('error')
        setErrorMsg('Recording stopped unexpectedly. Please try again.')
      }
      mr.start(1000)
      mediaRef.current = mr
      setRecState('recording')
      setElapsed(0)
      startLiveTranscript()
      // Tier-2 visual telemetry. Lazy-init the sampler. If MediaPipe
      // fails to load (older browsers, slow connection), the sampler
      // silently degrades to zero samples and the reviewer-side panel
      // shows "diagnostics unavailable" rather than blocking the
      // recording. Skipped entirely when the feature flag is off.
      if (VISUAL_TELEMETRY_ENABLED && videoRef.current) {
        try {
          if (!visualSamplerRef.current) {
            visualSamplerRef.current = new VisualSampler(videoRef.current)
          }
          void visualSamplerRef.current.start()
        } catch (vsErr) {
          console.warn('[visual-telemetry] start failed', vsErr)
        }
      }
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= timeLimitSeconds) stopRecording()
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording', err)
      setRecState('error')
      setErrorMsg('Could not start recording. Your browser may not support it. Please try a different browser.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    try { mediaRef.current?.stop() } catch {}
    stopLiveTranscript()
    try { visualSamplerRef.current?.stop() } catch {}
    setRecState('uploading')
  }

  const handleStopAndUpload = useCallback(async () => {
    setRecState('uploading')
    try {
      if (chunksRef.current.length === 0) {
        throw new Error('RECORDING_EMPTY: No video data was captured. Try recording again.')
      }
      const urlRes = await fetch('/api/prescreen/videos/upload-url', { method: 'POST' })
      if (!urlRes.ok) {
        const body = await urlRes.text().catch(() => '')
        console.error('[upload-url] failed', urlRes.status, body)
        throw new Error(`UPLOAD_URL_${urlRes.status}: ${body.slice(0, 200)}`)
      }
      const { uploadUrl, videoId } = await urlRes.json()
      if (!uploadUrl || !videoId) throw new Error('UPLOAD_URL_MALFORMED')

      const blobType = mimeRef.current?.startsWith('video/mp4') ? 'video/mp4' : 'video/webm'
      const blob = new Blob(chunksRef.current, { type: blobType })
      const ext = blobType === 'video/mp4' ? 'mp4' : 'webm'
      const fd = new FormData()
      fd.append('file', blob, `response.${ext}`)

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: fd })
      if (!uploadRes.ok) {
        const body = await uploadRes.text().catch(() => '')
        console.error('[cf-upload] failed', uploadRes.status, body)
        throw new Error(`CF_UPLOAD_${uploadRes.status}: ${body.slice(0, 200)}`)
      }

      // Cache a local URL so the review pane can play back without a
      // round-trip to Cloudflare (Stream takes a few seconds to be
      // playable after upload). We revoke when moving to next question.
      const localUrl = URL.createObjectURL(blob)
      const transcriptText = liveTranscriptRef.current.trim() || '(Transcript not captured in this browser. The full transcript will be generated server-side after submission.)'
      // Tier-1 multidimensional analysis. The candidate-side live
      // transcript doesn't carry timestamped utterances so the pause
      // and per-utterance completion signals will show "Not enough
      // data" here - that's intentional, the staff side has the full
      // Deepgram output and will compute the complete set.
      const analysis = analyseSpeech({ transcript: transcriptText, seconds: elapsed })

      // Tier-2 visual telemetry - pull what the sampler collected
      // during this question and aggregate. Sampler stops here so we
      // don't keep MediaPipe warm between questions.
      if (visualSamplerRef.current) {
        visualSamplerRef.current.stop()
        const samples = visualSamplerRef.current.takeSamples()
        if (samples.length > 0) {
          const agg = aggregateVisual(samples)
          const entry: PerQuestionVisualDiagnostic = {
            q: currentQ + 1,
            in_frame_pct: agg.in_frame_pct,
            at_camera_pct: agg.at_camera_pct,
            face_brightness: agg.face_brightness,
            frames_sampled: agg.frames_sampled,
          }
          setVisualDiagnostics(prev => {
            const next = prev.filter(d => d.q !== entry.q)
            next.push(entry)
            return next
          })
        }
      }

      setVideoIds(prev => { const n = [...prev]; n[currentQ] = videoId; return n })
      setReviewBlobUrls(prev => {
        const n = [...prev]
        // Revoke prior url if we're re-recording
        const prev_ = n[currentQ]
        if (prev_) try { URL.revokeObjectURL(prev_) } catch {}
        n[currentQ] = localUrl
        return n
      })
      setTranscripts(prev => { const n = [...prev]; n[currentQ] = transcriptText; return n })
      setSpeech(prev => { const n = [...prev]; n[currentQ] = analysis; return n })
      // Reset replay counter when a fresh recording lands.
      setReplayCounts(prev => { const n = [...prev]; n[currentQ] = 0; return n })
      setRecState('review')
    } catch (err: any) {
      console.error('[handleStopAndUpload]', err)
      setRecState('error')
      const raw = err?.message || 'Unknown error'
      if (raw.startsWith('RECORDING_EMPTY')) {
        setErrorMsg('No video was captured. Please record again - make sure your camera is on.')
      } else if (raw.startsWith('UPLOAD_URL_')) {
        setErrorMsg(`Could not prepare upload. Please refresh and try again. (${raw.split(':')[0]})`)
      } else if (raw.startsWith('CF_UPLOAD_')) {
        setErrorMsg(`Video upload rejected by server. Please try again. (${raw.split(':')[0]})`)
      } else {
        setErrorMsg(`Upload failed. Check your connection and try again. (${raw.slice(0, 80)})`)
      }
    }
  }, [currentQ, elapsed])

  function redoRecording() {
    setVideoIds(prev => { const n = [...prev]; n[currentQ] = null; return n })
    setRecState('idle')
    setElapsed(0)
    setErrorMsg('')
    // The blob URL stays around until next stopAndUpload revokes it.
  }

  function playReplay() {
    if (!reviewVideoRef.current) return
    const used = replayCounts[currentQ]
    if (used >= MAX_REPLAYS) return
    setReplayCounts(prev => { const n = [...prev]; n[currentQ] = used + 1; return n })
    reviewVideoRef.current.currentTime = 0
    void reviewVideoRef.current.play()
  }

  async function nextQuestion() {
    stopTts()
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1)
      setRecState('idle')
      setElapsed(0)
    } else {
      setSubmitting(true)
      // Revoke all local blob URLs before submit
      reviewBlobUrls.forEach(u => { if (u) try { URL.revokeObjectURL(u) } catch {} })
      // Stop any final sampling and pass the diagnostics through so
      // they can be persisted on the response row. See
      // docs/AIA-visual-telemetry.md for the data shape commitment.
      try { visualSamplerRef.current?.stop() } catch {}
      await onComplete(
        videoIds.map(v => v ?? ''),
        VISUAL_TELEMETRY_ENABLED && visualDiagnostics.length > 0
          ? { visual_diagnostics: visualDiagnostics }
          : undefined,
      )
    }
  }

  function readQuestionAloud() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    stopTts()
    const u = new SpeechSynthesisUtterance(questions[currentQ])
    u.lang = 'en-AU'
    u.rate = 0.95
    u.pitch = 1
    ttsRef.current = u
    window.speechSynthesis.speak(u)
  }
  function stopTts() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel() } catch {}
    }
    ttsRef.current = null
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const pct = Math.min((elapsed / timeLimitSeconds) * 100, 100)
  const isLast = currentQ === questions.length - 1
  const replayUsed = replayCounts[currentQ]
  const replayRemaining = Math.max(MAX_REPLAYS - replayUsed, 0)

  // ------ Self-view pop-up ----------------------------------------------
  if (recState === 'self_view_prompt') {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-modal border border-border p-6 sm:p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-mid mb-3">Before we start</p>
          <h2 className="text-xl sm:text-2xl font-bold text-charcoal mb-3">Would you like to see yourself while recording?</h2>
          <p className="text-sm text-mid mb-6 leading-relaxed">
            Some candidates prefer to hide their own video preview to avoid the
            anxiety of watching themselves on camera. Your answers will still
            be recorded either way - this only changes whether the live preview
            is visible to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-center">
            <button
              onClick={() => { setShowSelfView(true); setSelfViewPrompted(true) }}
              className="bg-black text-white font-bold rounded-full px-6 py-3 hover:bg-charcoal text-sm transition-colors"
            >
              Yes, show me
            </button>
            <button
              onClick={() => { setShowSelfView(false); setSelfViewPrompted(true) }}
              className="bg-white text-charcoal font-bold rounded-full px-6 py-3 border border-border hover:bg-light text-sm transition-colors"
            >
              No, hide the preview
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ------ Main flow -----------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8 justify-center">
        {questions.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full flex-1 max-w-[60px] transition-colors ${
            i < currentQ ? 'bg-green-500' : i === currentQ ? 'bg-black' : 'bg-gray-200'
          }`} />
        ))}
      </div>

      {/* Question */}
      <div className="mb-6">
        <div className="flex items-start justify-center gap-2.5">
          <div className="text-center max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              Question {currentQ + 1} of {questions.length}
            </p>
            <h2 className="text-xl font-semibold text-gray-900 leading-snug">{questions[currentQ]}</h2>
          </div>
          <button
            onClick={readQuestionAloud}
            title="Read this question out loud"
            aria-label="Read this question out loud"
            className="mt-7 sm:mt-7 w-9 h-9 rounded-full bg-white border border-border hover:bg-light flex items-center justify-center transition-colors flex-shrink-0 group relative"
          >
            <svg className="w-4 h-4 text-charcoal" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.786L4.586 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.586l3.797-2.786a1 1 0 011-.138zM14 7a3 3 0 010 6V7zM15.657 4.343a8 8 0 010 11.314l-1.414-1.414a6 6 0 000-8.486l1.414-1.414z"/>
            </svg>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-black text-white text-[10px] font-semibold uppercase tracking-wider rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">Read aloud</span>
          </button>
        </div>
      </div>

      {/* PRE-RECORD + RECORDING: classic single-column camera view */}
      {(recState === 'init' || recState === 'idle' || recState === 'recording' || recState === 'uploading' || recState === 'error') && (
        <>
          <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 aspect-video relative">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover transition-opacity ${showSelfView ? 'opacity-100' : 'opacity-0'}`}
              muted
              playsInline
            />
            {!showSelfView && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white/70" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478zM10 17c4.478 0 8.268-2.943 9.542-7a9.973 9.973 0 00-1.563-3.029l-1.435 1.435a8.012 8.012 0 011.45 2.121A8.005 8.005 0 0110 15c-.85 0-1.673-.13-2.45-.37l-1.566 1.567A9.96 9.96 0 0010 17z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-white text-sm font-semibold">Self-view hidden</p>
                <p className="text-white/70 text-xs mt-1">Your video is still being recorded. Just look at the camera and speak naturally.</p>
              </div>
            )}

            {recState === 'init' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                <p className="text-white text-sm font-medium">Starting camera…</p>
              </div>
            )}
            {recState === 'recording' && (
              <>
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-xs font-bold">REC</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full bg-black transition-all duration-1000" style={{ width: `${pct}%` }} />
                </div>
              </>
            )}
            {recState === 'uploading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                <p className="text-white text-sm font-medium">Uploading…</p>
              </div>
            )}
            {recState === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
                <p className="text-white text-sm text-center max-w-sm">{errorMsg}</p>
              </div>
            )}
          </div>

          {recState === 'recording' && (
            <p className="text-center text-sm text-gray-500 mb-4">
              {fmt(elapsed)} <span className="text-gray-300">/ {fmt(timeLimitSeconds)}</span>
            </p>
          )}

          <div className="flex items-center justify-center gap-3 mb-8">
            {recState === 'idle' && (
              <button onClick={startRecording}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-full transition-colors flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white/80" />
                Record
              </button>
            )}
            {recState === 'recording' && (
              <button onClick={stopRecording}
                className="bg-black hover:bg-[#1a1a1a] text-white font-bold px-8 py-3 rounded-full transition-colors flex items-center gap-2">
                <span className="w-3 h-3 bg-white" />
                Stop
              </button>
            )}
            {recState === 'error' && (
              <div className="flex items-center gap-3">
                <button onClick={initCamera}
                  className="bg-black hover:bg-[#1a1a1a] text-white font-bold px-6 py-3 rounded-full transition-colors text-sm">
                  Try again
                </button>
                {videoIds[currentQ] == null && streamRef.current && (
                  <button onClick={() => { setRecState('idle'); setErrorMsg('') }}
                    className="bg-white hover:bg-light text-charcoal font-bold px-6 py-3 rounded-full border border-border transition-colors text-sm">
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* POST-RECORD: review layout (video left, transcript right) */}
      {recState === 'review' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video relative">
            <video
              ref={reviewVideoRef}
              src={reviewBlobUrls[currentQ] ?? undefined}
              className="w-full h-full object-cover"
              controls={false}
              playsInline
            />
            {replayRemaining === 0 && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-none">
                <p className="text-white text-xs text-center px-4 leading-relaxed">
                  You&apos;ve used all 3 replays for this answer.<br />
                  Re-record below if you want to try again.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white border border-border rounded-2xl p-4 flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-widest text-mid mb-2">Your answer</p>
            <div className="flex-1 overflow-y-auto text-sm text-charcoal leading-relaxed mb-3 max-h-64">
              {transcripts[currentQ] || '(transcript not available)'}
            </div>
            {speech[currentQ] && (
              <SpeechAnalysisPanel
                analysis={speech[currentQ]!}
                density="tight"
                title="Speech analysis"
              />
            )}
            <p className="text-[10px] text-mid italic leading-snug mt-2">
              Transcript is captured live in your browser - the hiring team
              also receives a full server-side transcript with more accurate
              pause + completion readings.
            </p>
          </div>
        </div>
      )}

      {recState === 'review' && (
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          <button
            onClick={playReplay}
            disabled={replayRemaining === 0}
            className="bg-white text-charcoal font-bold px-5 py-2.5 rounded-full border border-border hover:bg-light text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ▶ Watch back ({replayRemaining} left)
          </button>
          <button
            onClick={redoRecording}
            className="bg-white text-charcoal font-bold px-5 py-2.5 rounded-full border border-border hover:bg-light text-sm transition-colors"
          >
            Re-record
          </button>
        </div>
      )}

      {/* Navigation */}
      {recState !== 'self_view_prompt' && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => { stopTts(); setCurrentQ(q => q - 1); setRecState('idle'); setElapsed(0) }}
            className={`text-sm text-gray-500 hover:text-gray-800 transition-colors ${currentQ === 0 ? 'invisible' : ''}`}
          >
            ← Back
          </button>
          <button
            disabled={recState !== 'review' || submitting}
            onClick={nextQuestion}
            className="bg-black hover:bg-[#1a1a1a] disabled:opacity-40 text-white font-bold px-8 py-3 rounded-full transition-colors text-sm"
          >
            {submitting ? 'Submitting…' : isLast ? 'Submit →' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  )
}

// Confidence indicator is now provided by lib/confidence.ts so the
// staff-side Shortlist Agent shows the same reading from the same
// transcript as the candidate sees here. See that file for the rationale.
