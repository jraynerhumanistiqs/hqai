// Speech-rate confidence indicator.
//
// Shared between the candidate-side recording flow (RecordingFlow.tsx)
// and the staff-side response review in the Shortlist Agent (RoleDetail
// + ResponsesKanban) so both sides see the same reading from the same
// transcript.
//
// This is intentionally a SPEECH-RATE heuristic, not a body-language
// or personality score. We don't ship a vetted ML model for those yet
// and `docs/AI-FAIRNESS-FAIR-WORK.md` commits us to not making claims
// we can't back up. When a real model arrives, swap the function body
// without touching either caller.

export interface ConfidenceReading {
  label: string
  detail: string
  /** 0-100 rough score for sorting/comparison. null when "not enough data". */
  score: number | null
  /** Words per minute - the raw signal the bands derive from. */
  wpm: number | null
}

/**
 * Compute a confidence indicator from a transcript + a duration in seconds.
 *
 * Bands tuned to AU conversational speech (slightly slower than US public-
 * speaking norms):
 *   - Very fast: >= 170 wpm
 *   - Confident and clear: 130-170 wpm
 *   - Steady: 100-130 wpm
 *   - Thoughtful pace: 60-100 wpm
 *   - Quiet recording: < 60 wpm
 *
 * Returns "Not enough data" when the recording is too short or the
 * transcript is empty - prevents an unfair reading from a few-second
 * clip.
 */
export function computeConfidence(transcript: string, seconds: number): ConfidenceReading {
  const trimmed = (transcript ?? '').trim()
  if (!trimmed || seconds < 5) {
    return {
      label: 'Not enough data',
      detail: 'Recording is too short or the transcript is empty - skip the indicator for this answer.',
      score: null,
      wpm: null,
    }
  }
  const words = trimmed.split(/\s+/).filter(Boolean).length
  const wpm = (words / seconds) * 60
  if (wpm >= 170) {
    return {
      label: 'Very fast pace',
      detail: `Around ${Math.round(wpm)} words per minute. Candidate may have been rushing - reviewer should watch the video before drawing conclusions.`,
      score: 70,
      wpm,
    }
  }
  if (wpm >= 130) {
    return {
      label: 'Confident and clear',
      detail: `Around ${Math.round(wpm)} words per minute - a strong conversational pace.`,
      score: 90,
      wpm,
    }
  }
  if (wpm >= 100) {
    return {
      label: 'Steady',
      detail: `Around ${Math.round(wpm)} words per minute - measured and easy to follow.`,
      score: 75,
      wpm,
    }
  }
  if (wpm >= 60) {
    return {
      label: 'Thoughtful pace',
      detail: `Around ${Math.round(wpm)} words per minute - candidate may have paused often to think. Not a deficiency on its own.`,
      score: 55,
      wpm,
    }
  }
  return {
    label: 'Quiet recording',
    detail: `Only ${Math.round(wpm)} words per minute detected. May reflect microphone trouble more than candidate behaviour.`,
    score: 30,
    wpm,
  }
}

/**
 * Convenience: derive a per-question confidence reading from a list of
 * Deepgram utterances. Filters by question index then sums end-start
 * timestamps for the duration and joins transcripts for the text.
 *
 * Utterance shape mirrors what the transcribe route persists
 * (`prescreen_transcripts.utterances` items):
 *   - transcript: string
 *   - start: number  (seconds)
 *   - end:   number  (seconds)
 *   - question?: number (1-indexed)
 */
export interface MinimalUtterance {
  transcript?: string
  start?: number
  end?: number
  question?: number
}

export function confidenceForQuestion(
  utterances: MinimalUtterance[] | null | undefined,
  questionIndex0Based: number,
): ConfidenceReading {
  const items = (utterances ?? []).filter(u => (u.question ?? 0) - 1 === questionIndex0Based)
  if (items.length === 0) {
    return { label: 'Not enough data', detail: 'No transcript captured for this question.', score: null, wpm: null }
  }
  const text = items.map(u => u.transcript ?? '').join(' ').trim()
  const totalSec = items.reduce((acc, u) => acc + Math.max(0, (u.end ?? 0) - (u.start ?? 0)), 0)
  return computeConfidence(text, totalSec)
}
