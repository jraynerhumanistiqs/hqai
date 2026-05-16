# Body Language / Behavioural Signal Roadmap

Decision recorded: 15 May 2026 (updated 15 May 2026 to mark Tier 2 shipped)
Decision owner: Jimmy Rayner
Status: Tier 1 in production. Tier 2 in production with the AIA gate
satisfied. Tier 3 explicitly out of scope.

This document records HQ.ai's strategic position on visual /
behavioural analysis of candidate pre-screen videos. It is referenced
from `docs/AI-FAIRNESS-FAIR-WORK.md` Section 2.7 and from the
limitations section of `app/privacy/page.tsx`.

---

## Why this document exists

A common ask from recruitment-product clients is "can the AI tell me
something about how the candidate presented?". The honest answer is
that the science of inferring confidence, fit, or competence from
facial expression, gaze, and gesture is documented as unreliable
(Lisa Feldman Barrett, BPS 2020 review) and is moving from
"controversial" to "explicitly banned" in the regulatory environments
HQ.ai operates or might operate in.

We considered three tiers of implementation and chose to ship Tier 1
only, with a clear path for Tier 2 if a separate compliance
prerequisite is met. Tier 3 is explicitly out of scope.

---

## Tier 1 - Multidimensional speech analysis (SHIPPED)

Implemented in `lib/confidence.ts` via `analyseSpeech()`. Renders via
`components/recruit/SpeechAnalysisPanel.tsx` on both the candidate
side (after each answer) and the staff side (per-question + overall).

Signals:

1. **Pace** - words per minute. Bands: Very fast / Confident and
   clear / Steady / Thoughtful / Quiet.
2. **Filler words** - rate per minute of `um`, `uh`, `er`, `like`,
   `you know`, `i mean`, `sort of`, `kind of`, `basically`,
   `literally`, `actually`. Bands: Very polished / Natural / Some
   hesitation / Heavy use.
3. **Sentence completion** - percent of transcript segments that end
   with terminal punctuation AND contain at least three words.
   Bands: Complete thoughts / Mostly completed / Sometimes trailed
   off / Often unfinished.
4. **Vocabulary richness** - type-token ratio (unique words / total
   words) over the full transcript. Suppressed under 40 words to
   avoid short-text inflation. Bands: Diverse / Standard range /
   Repetitive.
5. **Pauses** - count of long-pauses (>=1.5s between utterances)
   normalised per minute. Requires timestamped utterances (Deepgram
   provides these on the staff side; candidate-side live transcript
   does not).

Aggregate `fluencyScore` = arithmetic mean of available signal scores.

Limitations honestly stated in the UI:
- Filler-word match for "like", "actually", "literally" includes
  some natural-speech false positives. We accept this and disclose.
- Vocabulary richness is sensitive to the topic and the question -
  a "tell me about Xero" answer cannot be richer than the noun
  "Xero" allows.
- Pauses can also indicate careful thought, audio drop-outs, or
  network jitter affecting Deepgram's segmentation. The band
  description does not equate pauses with hesitation.
- The whole analysis is speech-only and ignores non-native-English
  speakers' natural slower rate, accent-induced transcription
  errors, and any disability that affects speech production.

This is the bar HQ.ai is willing to commit to today. Reviewers can
sort or filter on it but no AI hiring recommendation is derived from
it.

---

## Tier 2 - Visual telemetry (SHIPPED 15 May 2026)

Implementation:

- `lib/visual-telemetry.ts` lazy-loads `@mediapipe/tasks-vision` in the
  candidate's browser when recording starts, samples each video frame
  at ~2 fps, and returns three per-question aggregate numbers:
  `in_frame_pct`, `at_camera_pct`, `face_brightness`.
- Sampler runs alongside `MediaRecorder` in `components/prescreen/RecordingFlow.tsx`.
  Per-question aggregates are persisted on the response row via the
  new `prescreen_responses.visual_diagnostics jsonb` column (migration
  `visual_diagnostics_column.sql`).
- Staff side renders `components/recruit/ReviewerDiagnosticsPanel.tsx`
  inside the per-response detail. Visually distinct (blue accent +
  "Diagnostic only" badge) so it's clearly not a scoring surface.

AIA gate satisfied:

1. **Algorithmic Impact Assessment template published** at
   `docs/AIA-TEMPLATE.md`. Completed for this feature at
   `docs/AIA-visual-telemetry.md`.
2. **Visual telemetry never feeds the AI scorer.** Verified by code
   path: `app/api/prescreen/responses/[id]/score/route.ts` reads from
   `prescreen_transcripts.text` only. The `visual_diagnostics` column
   is read only by `components/recruit/ReviewerDiagnosticsPanel.tsx`.

Hard constraints maintained:

1. Metrics live in a separate panel labelled "Reviewer diagnostics".
2. Metrics are never an input to `lib/claude-scoring.ts` or any AI
   scoring path.
3. Per-candidate metrics are visible to the candidate on request via
   the privacy data-request endpoint.
4. AIA published before launch with the disability-discrimination
   risks and the compensating controls.

Kill switch:

Set `NEXT_PUBLIC_VISUAL_TELEMETRY_ENABLED=false` in Vercel env. The
sampler short-circuits and no new diagnostics are captured.

---

## Tier 3 - Emotion / micro-expression scoring (OUT OF SCOPE)

We will not build this. Reasons:

- **EU AI Act**: "emotion recognition in the workplace" is in the
  prohibited-AI list (Article 5). HQ.ai expanding to the EU is
  plausible enough that we will not accept this.
- **AHRC**: 2020 "Human Rights and Technology" report singles out
  emotion-AI in employment as high-risk.
- **DDA + Fair Work General Protections**: any system that scores
  on facial expression or affect will systematically disadvantage
  neurodivergent candidates, people with movement disorders, and
  candidates from cultural backgrounds with different
  expression norms.
- **Scientific validity**: Feldman Barrett et al. and the BPS 2020
  review document that facial expressions are unreliable indicators
  of internal emotion across populations.
- **Product positioning**: HQ.ai sells "every score has verbatim
  evidence, every decision is human-clicked". Tier 3 contradicts
  this directly.

If this becomes a serious commercial ask in future, the right answer
is a separate product line under a separate company shielding,
designed and underwritten against the regulatory regime that
ultimately allows it (currently: none of the regimes that matter to
us).

---

## Tier 2 prerequisites (SATISFIED)

Both prereqs satisfied on 15 May 2026:

1. Algorithmic Impact Assessment template at `docs/AIA-TEMPLATE.md`
   plus completed assessment at `docs/AIA-visual-telemetry.md`.
2. Telemetry never feeds the AI scorer. Enforced in code by the
   scoring route reading transcripts only and the
   `visual_diagnostics` jsonb being read only by the reviewer panel.

---

## Change log

- 2026-05-15: Tier 1 shipped.
- 2026-05-15: Tier 2 shipped after AIA gate satisfied. Tier 3 ruled
  out unchanged.
