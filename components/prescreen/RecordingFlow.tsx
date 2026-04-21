'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  questions: string[]
  timeLimitSeconds: number
  onComplete: (videoIds: string[]) => Promise<void>
}

type RecorderState = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export function RecordingFlow({ questions, timeLimitSeconds, onComplete }: Props) {
  const [currentQ, setCurrentQ]     = useState(0)
  const [recState, setRecState]     = useState<RecorderState>('idle')
  const [elapsed, setElapsed]       = useState(0)
  const [errorMsg, setErrorMsg]     = useState('')
  const [videoIds, setVideoIds]     = useState<(string | null)[]>(questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      })
      .catch(() => {
        setRecState('error')
        setErrorMsg('Camera or microphone not available. Please check browser permissions and try again.')
      })
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = handleUpload
    mr.start(1000)
    mediaRef.current = mr
    setRecState('recording')
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= timeLimitSeconds) stopRecording()
        return prev + 1
      })
    }, 1000)
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRef.current?.stop()
    setRecState('uploading')
  }

  const handleUpload = useCallback(async () => {
    setRecState('uploading')
    try {
      const urlRes = await fetch('/api/prescreen/videos/upload-url', { method: 'POST' })
      if (!urlRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, videoId } = await urlRes.json()

      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: blob })
      if (!uploadRes.ok) throw new Error('Video upload failed')

      setVideoIds(prev => { const n = [...prev]; n[currentQ] = videoId; return n })
      setRecState('done')
    } catch (err) {
      console.error(err)
      setRecState('error')
      setErrorMsg('Upload failed. Please re-record your response.')
    }
  }, [currentQ])

  function redoRecording() {
    setVideoIds(prev => { const n = [...prev]; n[currentQ] = null; return n })
    setRecState('idle')
    setElapsed(0)
    setErrorMsg('')
  }

  async function nextQuestion() {
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1)
      setRecState('idle')
      setElapsed(0)
    } else {
      setSubmitting(true)
      await onComplete(videoIds.map(v => v ?? ''))
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const pct = Math.min((elapsed / timeLimitSeconds) * 100, 100)
  const isLast = currentQ === questions.length - 1

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8 justify-center">
        {questions.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full flex-1 max-w-[60px] transition-colors ${
            i < currentQ ? 'bg-green-500' : i === currentQ ? 'bg-black' : 'bg-gray-200'
          }`} />
        ))}
      </div>

      {/* Question */}
      <div className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
          Question {currentQ + 1} of {questions.length}
        </p>
        <h2 className="text-xl font-semibold text-gray-900 leading-snug">{questions[currentQ]}</h2>
      </div>

      {/* Camera */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 aspect-video relative">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

        {/* Recording indicator */}
        {recState === 'recording' && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-bold">REC</span>
          </div>
        )}

        {/* Timer bar */}
        {recState === 'recording' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-black transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Overlays */}
        {recState === 'uploading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
            <p className="text-white text-sm font-medium">Uploading…</p>
          </div>
        )}
        {recState === 'done' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <p className="text-white text-sm font-semibold">Response saved</p>
          </div>
        )}
        {recState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6">
            <p className="text-white text-sm text-center">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Timer display when recording */}
      {recState === 'recording' && (
        <p className="text-center text-sm text-gray-500 mb-4">
          {fmt(elapsed)} <span className="text-gray-300">/ {fmt(timeLimitSeconds)}</span>
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {recState === 'idle' && (
          <button onClick={startRecording}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white/80" />
            Record
          </button>
        )}
        {recState === 'recording' && (
          <button onClick={stopRecording}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
            <span className="w-3 h-3 bg-white" />
            Stop
          </button>
        )}
        {recState === 'done' && (
          <button onClick={redoRecording}
            className="bg-white hover:bg-gray-50 text-gray-700 font-bold px-6 py-3 rounded-xl border border-gray-300 transition-colors text-sm">
            Re-record
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCurrentQ(q => q - 1); setRecState('idle'); setElapsed(0) }}
          className={`text-sm text-gray-500 hover:text-gray-800 transition-colors ${currentQ === 0 ? 'invisible' : ''}`}
        >
          ← Back
        </button>
        <button
          disabled={recState !== 'done' || submitting}
          onClick={nextQuestion}
          className="bg-black hover:bg-[#1a1a1a] disabled:opacity-40 text-white font-bold px-8 py-3 rounded-full transition-colors text-sm"
        >
          {submitting ? 'Submitting…' : isLast ? 'Submit →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
