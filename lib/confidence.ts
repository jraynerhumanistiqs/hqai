// Speech-rate confidence indicator + Tier-1 multidimensional speech
// analysis.
//
// Shared between the candidate-side recording flow (RecordingFlow.tsx)
// and the staff-side response review (RoleDetail / ResponsesKanban) so
// both sides see the same readings from the same transcript.
//
// IMPORTANT - this is intentionally a SPEECH-ONLY analysis. We do not
// model facial expression, body language, or "emotion AI" because the
// science is weak, the regulatory environment (EU AI Act, AHRC,
// disability discrimination law) is hostile, and our published
// position in docs/AI-FAIRNESS-FAIR-WORK.md is that AI outputs are
// decision support and not behavioural assessment. See
// docs/BODY-LANGUAGE-ROADMAP.md for the full decision.
//
// Every signal here can be measured, explained, and rebutted from the
// transcript. If a candidate complains, you can show them the exact
// text and the exact metric.

// ---------------------------------------------------------------------------
// Legacy single-band confidence reading (kept for back-compat with v1)
// ---------------------------------------------------------------------------

export interface ConfidenceReading {
  label: string
  detail: string
  /** 0-100 rough score for sorting/comparison. null when "not enough data". */
  score: number | null
  /** Words per minute - the raw signal the bands derive from. */
  wpm: number | null
}

export function computeConfidence(transcript: string, seconds: number): ConfidenceReading {
  const pace = paceSignal(transcript, seconds)
  return {
    label: pace.label,
    detail: pace.detail,
    score: pace.score,
    wpm: pace.value,
  }
}

// ---------------------------------------------------------------------------
// Tier-1 multidimensional speech analysis (this is what new UI renders)
// ---------------------------------------------------------------------------

export interface SpeechSignal {
  /** Stable id you can switch on in UI (e.g. icon picker). */
  id: 'pace' | 'fillers' | 'completion' | 'vocabulary' | 'pauses'
  /** Short label users see, e.g. "Pace". */
  label: string
  /** Band the metric falls into, e.g. "Confident and clear". */
  band: string
  /** One-line rationale to explain the band. */
  detail: string
  /** Raw value for the metric (wpm, % etc.). null when not enough data. */
  value: number | null
  /** 0-100 for sorting/comparison. null when not measurable. */
  score: number | null
  /** Human-friendly unit (e.g. "wpm", "%", "/min"). */
  unit: string
}

export interface SpeechAnalysis {
  pace: SpeechSignal
  fillers: SpeechSignal
  completion: SpeechSignal
  vocabulary: SpeechSignal
  pauses: SpeechSignal
  /** Quick aggregate "fluency" score (mean of the available signals). */
  fluencyScore: number | null
}

export interface MinimalUtterance {
  transcript?: string
  start?: number
  end?: number
  question?: number
}

// Pull all five signals at once. Pass utterances when available - they
// unlock pauses + a more accurate sentence-completion read - and
// transcript+seconds for the basics. Either path produces a meaningful
// reading.
export function analyseSpeech(opts: {
  transcript: string
  seconds: number
  utterances?: MinimalUtterance[]
}): SpeechAnalysis {
  const transcript = (opts.transcript ?? '').trim()
  const seconds = Number.isFinite(opts.seconds) ? opts.seconds : 0
  const us = Array.isArray(opts.utterances) ? opts.utterances : []

  const pace = paceSignal(transcript, seconds)
  const fillers = fillerSignal(transcript, seconds)
  const completion = completionSignal(transcript, us)
  const vocabulary = vocabularySignal(transcript)
  const pauses = pauseSignal(us)

  const scores = [pace.score, fillers.score, completion.score, vocabulary.score, pauses.score]
    .filter((s): s is number => typeof s === 'number')
  const fluencyScore = scores.length === 0 ? null : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  return { pace, fillers, completion, vocabulary, pauses, fluencyScore }
}

// Per-question analyser. Filters utterances by question index and runs
// the full multi-signal analysis on the subset.
export function analyseSpeechForQuestion(
  utterances: MinimalUtterance[] | null | undefined,
  questionIndex0Based: number,
): SpeechAnalysis {
  const items = (utterances ?? []).filter(u => (u.question ?? 0) - 1 === questionIndex0Based)
  const text = items.map(u => u.transcript ?? '').join(' ').trim()
  const totalSec = items.reduce((acc, u) => acc + Math.max(0, (u.end ?? 0) - (u.start ?? 0)), 0)
  return analyseSpeech({ transcript: text, seconds: totalSec, utterances: items })
}

// Legacy single-question reader. Wraps the multi-signal analyser and
// returns only the pace band - the old caller still works.
export function confidenceForQuestion(
  utterances: MinimalUtterance[] | null | undefined,
  questionIndex0Based: number,
): ConfidenceReading {
  const a = analyseSpeechForQuestion(utterances, questionIndex0Based)
  return {
    label: a.pace.band,
    detail: a.pace.detail,
    score: a.pace.score,
    wpm: a.pace.value,
  }
}

// ---------------------------------------------------------------------------
// Individual signal calculators - each returns a SpeechSignal
// ---------------------------------------------------------------------------

function paceSignal(transcript: string, seconds: number): SpeechSignal {
  const trimmed = (transcript ?? '').trim()
  if (!trimmed || seconds < 5) {
    return { id: 'pace', label: 'Pace', band: 'Not enough data', detail: 'Recording too short for a pace reading.', value: null, score: null, unit: 'wpm' }
  }
  const words = trimmed.split(/\s+/).filter(Boolean).length
  const wpm = (words / seconds) * 60
  if (wpm >= 170) return { id: 'pace', label: 'Pace', band: 'Very fast', detail: `${Math.round(wpm)} wpm. May have been rushing.`, value: wpm, score: 70, unit: 'wpm' }
  if (wpm >= 130) return { id: 'pace', label: 'Pace', band: 'Confident and clear', detail: `${Math.round(wpm)} wpm - strong conversational pace.`, value: wpm, score: 90, unit: 'wpm' }
  if (wpm >= 100) return { id: 'pace', label: 'Pace', band: 'Steady', detail: `${Math.round(wpm)} wpm - measured and easy to follow.`, value: wpm, score: 75, unit: 'wpm' }
  if (wpm >= 60)  return { id: 'pace', label: 'Pace', band: 'Thoughtful', detail: `${Math.round(wpm)} wpm - candidate may have paused to think.`, value: wpm, score: 55, unit: 'wpm' }
  return { id: 'pace', label: 'Pace', band: 'Quiet', detail: `Only ${Math.round(wpm)} wpm detected - may be a microphone issue.`, value: wpm, score: 30, unit: 'wpm' }
}

// Filler-word rate per minute. The list is short and conservative on
// purpose - we count obvious disfluency markers, not natural connectives
// like "and", "but", "well". "Like" is included but only when used as a
// filler (preceded/followed by space, not in "I like ..." constructions
// which are harder to detect cheaply). We accept some false positives
// for "like" and call it out in the description.
const FILLER_REGEX = /\b(um+|uh+|er+|ah+|like|you know|i mean|sort of|kind of|basically|literally|actually)\b/gi

function fillerSignal(transcript: string, seconds: number): SpeechSignal {
  const trimmed = (transcript ?? '').trim()
  if (!trimmed || seconds < 5) {
    return { id: 'fillers', label: 'Filler words', band: 'Not enough data', detail: 'Recording too short for a filler reading.', value: null, score: null, unit: '/min' }
  }
  const matches = trimmed.match(FILLER_REGEX) ?? []
  const perMin = (matches.length / seconds) * 60
  if (perMin < 2)   return { id: 'fillers', label: 'Filler words', band: 'Very polished', detail: `${matches.length} fillers (${perMin.toFixed(1)}/min) across the answer.`, value: perMin, score: 95, unit: '/min' }
  if (perMin < 5)   return { id: 'fillers', label: 'Filler words', band: 'Natural flow', detail: `${matches.length} fillers (${perMin.toFixed(1)}/min) - well within conversational norms.`, value: perMin, score: 80, unit: '/min' }
  if (perMin < 10)  return { id: 'fillers', label: 'Filler words', band: 'Some hesitation', detail: `${matches.length} fillers (${perMin.toFixed(1)}/min) - some "um/like/you know" markers.`, value: perMin, score: 60, unit: '/min' }
  return { id: 'fillers', label: 'Filler words', band: 'Heavy use', detail: `${matches.length} fillers (${perMin.toFixed(1)}/min) - frequent hesitation markers.`, value: perMin, score: 35, unit: '/min' }
}

// Percent of sentences that look "complete". Best-effort heuristic:
// split on terminal punctuation, count segments that have at least 3
// words. Compare to the total spoken-segment count. If we have proper
// utterances we use those instead (Deepgram gives us per-turn
// boundaries from punctuation:true smart_format:true).
function completionSignal(transcript: string, utterances: MinimalUtterance[]): SpeechSignal {
  const trimmed = (transcript ?? '').trim()
  if (!trimmed) {
    return { id: 'completion', label: 'Sentence completion', band: 'Not enough data', detail: 'No transcript to analyse.', value: null, score: null, unit: '%' }
  }
  let complete = 0
  let total = 0
  if (utterances.length > 0) {
    for (const u of utterances) {
      const t = (u.transcript ?? '').trim()
      if (!t) continue
      total += 1
      if (/[.!?]\s*$/.test(t) && t.split(/\s+/).length >= 3) complete += 1
    }
  } else {
    const segments = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
    total = segments.length
    complete = segments.filter(s => s.split(/\s+/).length >= 3).length
  }
  if (total === 0) {
    return { id: 'completion', label: 'Sentence completion', band: 'Not enough data', detail: 'Not enough sentence boundaries to read.', value: null, score: null, unit: '%' }
  }
  const pct = (complete / total) * 100
  if (pct >= 80) return { id: 'completion', label: 'Sentence completion', band: 'Complete thoughts', detail: `${Math.round(pct)}% of sentences fully completed.`, value: pct, score: 90, unit: '%' }
  if (pct >= 60) return { id: 'completion', label: 'Sentence completion', band: 'Mostly completed', detail: `${Math.round(pct)}% completion rate - some trailed off.`, value: pct, score: 70, unit: '%' }
  if (pct >= 40) return { id: 'completion', label: 'Sentence completion', band: 'Sometimes trailed off', detail: `${Math.round(pct)}% completion - quite a few sentences hung.`, value: pct, score: 50, unit: '%' }
  return { id: 'completion', label: 'Sentence completion', band: 'Often unfinished', detail: `${Math.round(pct)}% completion - many sentences left hanging.`, value: pct, score: 25, unit: '%' }
}

// Vocabulary richness via type-token ratio. TTR inflates on short
// texts so we suppress the reading under 40 words. We also lowercase
// + strip simple punctuation before counting so "Run" and "running"
// are not falsely diversified by stemming differences.
function vocabularySignal(transcript: string): SpeechSignal {
  const trimmed = (transcript ?? '').trim()
  if (!trimmed) {
    return { id: 'vocabulary', label: 'Vocabulary', band: 'Not enough data', detail: 'No transcript to analyse.', value: null, score: null, unit: '%' }
  }
  const tokens = trimmed
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (tokens.length < 40) {
    return { id: 'vocabulary', label: 'Vocabulary', band: 'Not enough data', detail: `Only ${tokens.length} words spoken - need ~40 for a vocabulary reading.`, value: null, score: null, unit: '%' }
  }
  const types = new Set(tokens)
  const ttr = types.size / tokens.length
  const pct = ttr * 100
  if (ttr >= 0.60) return { id: 'vocabulary', label: 'Vocabulary', band: 'Diverse', detail: `${types.size} unique words across ${tokens.length} - rich vocabulary.`, value: pct, score: 85, unit: '%' }
  if (ttr >= 0.45) return { id: 'vocabulary', label: 'Vocabulary', band: 'Standard range', detail: `${types.size}/${tokens.length} unique words - normal conversational range.`, value: pct, score: 70, unit: '%' }
  return { id: 'vocabulary', label: 'Vocabulary', band: 'Repetitive', detail: `${types.size}/${tokens.length} unique words - repeated phrasing.`, value: pct, score: 45, unit: '%' }
}

// Long-pause density per minute. A "long pause" is a gap between
// adjacent utterances of >= 1.5 seconds. Requires utterances with
// start/end timestamps. Falls back to "not enough data" if not.
const LONG_PAUSE_SEC = 1.5

function pauseSignal(utterances: MinimalUtterance[]): SpeechSignal {
  if (utterances.length < 2) {
    return { id: 'pauses', label: 'Pauses', band: 'Not enough data', detail: 'Need at least two transcribed segments to measure pauses.', value: null, score: null, unit: '/min' }
  }
  const sorted = [...utterances].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  let longPauses = 0
  let totalSec = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i].start ?? 0) - (sorted[i - 1].end ?? 0)
    if (gap >= LONG_PAUSE_SEC) longPauses += 1
  }
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  totalSec = Math.max(0, (last.end ?? 0) - (first.start ?? 0))
  if (totalSec < 5) {
    return { id: 'pauses', label: 'Pauses', band: 'Not enough data', detail: 'Recording too short to measure pause density.', value: null, score: null, unit: '/min' }
  }
  const perMin = (longPauses / totalSec) * 60
  if (perMin < 1)  return { id: 'pauses', label: 'Pauses', band: 'Fluent delivery', detail: `${longPauses} long pause${longPauses === 1 ? '' : 's'} (${perMin.toFixed(1)}/min).`, value: perMin, score: 90, unit: '/min' }
  if (perMin < 3)  return { id: 'pauses', label: 'Pauses', band: 'Some thinking pauses', detail: `${longPauses} long pauses (${perMin.toFixed(1)}/min).`, value: perMin, score: 70, unit: '/min' }
  if (perMin < 6)  return { id: 'pauses', label: 'Pauses', band: 'Frequent pausing', detail: `${longPauses} long pauses (${perMin.toFixed(1)}/min).`, value: perMin, score: 50, unit: '/min' }
  return { id: 'pauses', label: 'Pauses', band: 'Heavily paused', detail: `${longPauses} long pauses (${perMin.toFixed(1)}/min).`, value: perMin, score: 30, unit: '/min' }
}
