'use client'

// PhoneRecorder - recruiter-driven audio capture for a phone screen.
//
// Flow:
//   1. Recruiter clicks "Start phone screen" inside the role detail.
//   2. We request mic permission via getUserMedia({audio:true}).
//   3. We show a clear "RECORDING" indicator + a duration clock + a
//      consent checkbox the recruiter must tick (acknowledging the
//      candidate has consented to being recorded - AU two-party
//      consent baseline).
//   4. When stopped, we upload the resulting Blob to a Supabase Storage
//      signed URL, then POST to /api/prescreen/responses/<id>/recording
//      to create or update the response row and kick off transcription
//      + scoring.
//
// Optional candidate_name + candidate_email props feed the new-response
// branch in the recording API. If response_id is supplied we PATCH
// instead.

import { useEffect, useRef, useState } from 'react'

interface Props {
  sessionId: string
  responseId?: string | null
  candidateName?: string
  candidateEmail?: string | null
  /** Pre-populates the Phone Screen Questions form. If the session already
   *  has questions on file (eg the same set used for the video invite),
   *  pass them in - the recruiter can still edit before the call starts. */
  initialQuestions?: string[]
  onSubmitted?: (responseId: string) => void
  onCancel?: () => void
}

type RecorderState = 'idle' | 'permission' | 'questions' | 'consent' | 'recording' | 'preview' | 'uploading' | 'submitting' | 'done' | 'error'

// Default phone-screen question seed.
// Sourced from the AU video-interview researcher pass (Fair Work-compliant,
// non-discriminatory, behaviour-based). Recruiters can edit, remove, or
// re-order before the call. These are mirrored from the video screen so the
// same scoring rubric applies regardless of channel.
const DEFAULT_PHONE_QUESTIONS: string[] = [
  'Walk me through your most recent role and what your day-to-day looked like.',
  'Why are you looking to leave, and what does your ideal next role look like?',
  'Tell me about a time you had to deliver under pressure. What did you do and what was the outcome?',
  'What are your salary expectations, and what notice period would you need to give?',
  'Do you have full work rights in Australia and the ability to start when we need you?',
]

const MIN_DURATION_SEC = 5
const MAX_DURATION_SEC = 60 * 60 // 60 min hard cap

export function PhoneRecorder({ sessionId, responseId, candidateName, candidateEmail, initialQuestions, onSubmitted, onCancel }: Props) {
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [durationSec, setDurationSec] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [name, setName] = useState(candidateName ?? '')
  const [email, setEmail] = useState(candidateEmail ?? '')
  const [questions, setQuestions] = useState<string[]>(() => {
    const seed = (initialQuestions && initialQuestions.length > 0) ? initialQuestions : DEFAULT_PHONE_QUESTIONS
    return [...seed]
  })
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)

  useEffect(() => () => cleanup(), [])

  function cleanup() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (playbackUrl) URL.revokeObjectURL(playbackUrl)
  }

  async function requestMic() {
    setError(null)
    setState('permission')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      // After mic permission, surface the Phone Screen Questions form
      // so the recruiter can review/edit the question list before the
      // call starts. They then click "Start recording" to begin.
      setState('questions')
    } catch (err) {
      setError(`Could not access microphone: ${err instanceof Error ? err.message : 'unknown'}`)
      setState('error')
    }
  }

  function startRecording() {
    if (!streamRef.current) return
    if (!consent) {
      setError('Tick the consent checkbox first - confirm the candidate has agreed to be recorded.')
      return
    }
    if (!name.trim()) {
      setError('Add the candidate\'s name so this recording lands on the right row.')
      return
    }
    chunksRef.current = []
    const mime = pickAudioMime()
    const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : {})
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const type = recorder.mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type })
      setAudioBlob(blob)
      setPlaybackUrl(URL.createObjectURL(blob))
      const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000)
      setDurationSec(elapsed)
      // Move to preview state so the recruiter can play back + submit.
      // Previously the state stayed on 'recording' which left the UI
      // stuck on the recording indicator and never showed the Submit
      // button - hence "stop recording fails to submit".
      setState('preview')
    }
    recorder.start(1000)
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setDurationSec(0)
    setState('recording')
    tickRef.current = window.setInterval(() => {
      const sec = Math.round((Date.now() - startedAtRef.current) / 1000)
      setDurationSec(sec)
      if (sec >= MAX_DURATION_SEC) stopRecording()
    }, 1000)
  }

  function stopRecording() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    // state moves once onstop fires + blob lands
  }

  async function submitRecording() {
    if (!audioBlob) return
    if (durationSec < MIN_DURATION_SEC) {
      setError(`Recording is only ${durationSec}s - record at least ${MIN_DURATION_SEC}s before submitting.`)
      return
    }
    setError(null)
    setState('uploading')
    try {
      // 1. Get a Supabase Storage signed upload URL.
      const signRes = await fetch('/api/prescreen/audio/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, response_id: responseId ?? null, mime: audioBlob.type }),
      })
      const signed = await signRes.json()
      if (!signRes.ok) throw new Error(signed?.detail || signed?.error || `HTTP ${signRes.status}`)

      // 2. PUT the audio blob.
      const upRes = await fetch(signed.uploadUrl, {
        method: 'PUT',
        body: audioBlob,
        headers: { 'Content-Type': audioBlob.type, 'x-upsert': 'true' },
      })
      if (!upRes.ok) throw new Error(`Upload failed: ${upRes.status}`)

      // 3. Tell the API the audio is there - this kicks off transcription.
      setState('submitting')
      const submitRes = await fetch(`/api/prescreen/responses/${responseId ?? 'new'}/recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          candidate_name: name.trim(),
          candidate_email: email.trim() || null,
          audio_path: signed.path,
          audio_duration_sec: durationSec,
          // The Phone Screen Questions the recruiter agreed before the
          // call - persisted so the AI scorer can ground answers against
          // the same questions the candidate was asked.
          questions: questions.map(q => q.trim()).filter(Boolean),
        }),
      })
      const submitJson = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitJson?.detail || submitJson?.error || `HTTP ${submitRes.status}`)

      setState('done')
      onSubmitted?.(submitJson.response_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setState('error')
    }
  }

  return (
    <div className="bg-bg-elevated border border-border rounded-2xl shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-display text-base font-bold text-charcoal uppercase tracking-wider">Phone screen recorder</p>
          <p className="text-xs text-mid mt-0.5">Capture the call audio from this device. We&apos;ll transcribe and score against the role&apos;s scoring criteria automatically.</p>
        </div>
        {onCancel && state !== 'recording' && state !== 'uploading' && state !== 'submitting' && (
          <button onClick={() => { cleanup(); onCancel() }} className="text-xs font-bold text-mid hover:text-charcoal">Close</button>
        )}
      </div>

      {/* Setup tip - only visible during the pre-record steps so it
          doesn't get in the way once the recruiter is on the call. */}
      {(state === 'idle' || state === 'permission' || state === 'consent') && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl px-3.5 py-2.5 mb-4 flex gap-2.5 items-start">
          <span className="text-base flex-shrink-0">📞</span>
          <div>
            <p className="text-xs font-bold text-charcoal mb-0.5">Before you start: put the call on speakerphone</p>
            <p className="text-[11px] text-mid leading-snug">
              This recorder uses your laptop&apos;s microphone, so it can hear you clearly but not the candidate&apos;s voice through the handset. Place the phone next to the laptop on speakerphone (or use a headset with mic monitoring) so both sides of the conversation are picked up. Test it first with the candidate by asking them to say hello.
            </p>
          </div>
        </div>
      )}

      {(state === 'idle' || state === 'permission') && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1.5">Candidate name</label>
              <input className="w-full text-sm px-3 py-2 bg-bg-elevated border border-border rounded-lg outline-none focus:border-black" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-mid uppercase tracking-wider mb-1.5">Candidate email (optional)</label>
              <input className="w-full text-sm px-3 py-2 bg-bg-elevated border border-border rounded-lg outline-none focus:border-black" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-mid leading-snug">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 accent-black" />
            <span>
              I confirm the candidate has been told this call will be recorded, transcribed, and scored by AI for the role they&apos;re being assessed for, and they have agreed. (Required under AU recording-consent rules.)
            </span>
          </label>

          {state === 'idle' && (
            <button onClick={requestMic} disabled={!consent || !name.trim()} className="bg-accent text-ink-on-accent text-sm font-bold rounded-full px-5 py-2.5 hover:bg-accent-hover disabled:opacity-50">
              Start microphone
            </button>
          )}
          {state === 'permission' && (
            <p className="text-xs text-mid">Waiting for microphone permission...</p>
          )}
        </div>
      )}

      {state === 'questions' && (
        <div className="space-y-3">
          <div className="bg-bg-soft rounded-xl px-3.5 py-3 mb-1">
            <p className="text-xs font-bold text-charcoal mb-1">Phone Screen Questions</p>
            <p className="text-[11px] text-mid leading-snug">
              Review the questions you&apos;ll ask. Edit, reorder, or remove any line. These are mirrored from the video-interview rubric so the AI scoring works the same way.
            </p>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-mid mt-2.5 w-5 text-right tabular-nums">{i + 1}.</span>
                <textarea
                  value={q}
                  onChange={e => setQuestions(qs => qs.map((row, idx) => idx === i ? e.target.value : row))}
                  rows={2}
                  className="flex-1 text-sm px-3 py-2 bg-bg-elevated border border-border rounded-lg outline-none focus:border-ink resize-y"
                />
                <button
                  type="button"
                  onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))}
                  className="text-[11px] font-bold text-mid hover:text-danger mt-2.5 px-1.5"
                  aria-label="Remove question"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setQuestions(qs => [...qs, ''])}
              className="text-xs font-bold text-ink hover:underline"
            >
              + Add question
            </button>
            <button
              onClick={startRecording}
              disabled={!consent || !name.trim()}
              className="bg-accent text-ink-on-accent text-sm font-bold rounded-full px-5 py-2.5 hover:bg-accent-hover disabled:opacity-50"
            >
              Start recording
            </button>
          </div>
        </div>
      )}

      {state === 'recording' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-danger/10 rounded-2xl px-4 py-3">
            <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
            <span className="text-sm font-bold text-danger">Recording</span>
            <span className="text-sm font-mono text-mid">{formatDuration(durationSec)}</span>
          </div>
          {/* Question prompter visible during the call so the recruiter
              can scroll through the agreed list without leaving the page. */}
          {questions.length > 0 && (
            <div className="bg-bg-soft rounded-xl px-3.5 py-3 max-h-56 overflow-y-auto scrollbar-thin">
              <p className="text-[11px] font-bold text-mid uppercase tracking-wider mb-1.5">Questions</p>
              <ol className="text-xs text-charcoal space-y-1.5 list-decimal list-inside leading-snug">
                {questions.filter(q => q.trim()).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
          )}
          <button onClick={stopRecording} className="bg-accent text-ink-on-accent text-sm font-bold rounded-full px-5 py-2.5 hover:bg-accent-hover">
            Stop recording
          </button>
        </div>
      )}

      {audioBlob && state !== 'recording' && state !== 'done' && (
        <div className="space-y-3 mt-4">
          <p className="text-xs font-bold text-mid uppercase tracking-wider">Preview - {formatDuration(durationSec)}</p>
          {playbackUrl && <audio controls src={playbackUrl} className="w-full" />}
          <div className="flex gap-2">
            <button
              onClick={submitRecording}
              disabled={state === 'uploading' || state === 'submitting'}
              className="bg-black text-white text-sm font-bold rounded-full px-5 py-2.5 hover:bg-charcoal disabled:opacity-60"
            >
              {state === 'uploading' ? 'Uploading...' : state === 'submitting' ? 'Submitting...' : 'Submit for AI scoring'}
            </button>
            <button
              onClick={() => { setAudioBlob(null); setPlaybackUrl(null); setState('questions') }}
              className="bg-bg-elevated border border-border text-charcoal text-sm font-bold rounded-full px-5 py-2.5 hover:bg-light"
            >
              Re-record
            </button>
          </div>
        </div>
      )}

      {state === 'done' && (
        <div className="bg-success/10 rounded-2xl px-4 py-3 text-sm text-success font-bold">
          Recording submitted - transcribing now, score will appear on this candidate in a minute or two.
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}

function pickAudioMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const c of candidates) {
    try { if (MediaRecorder.isTypeSupported(c)) return c } catch {}
  }
  return null
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
