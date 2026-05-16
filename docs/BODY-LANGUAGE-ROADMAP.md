# Body Language / Behavioural Signal Roadmap

Decision recorded: 15 May 2026
Decision owner: Jimmy Rayner
Status: Tier 1 in production. Tier 2 deferred pending the Algorithmic
Impact Assessment template. Tier 3 explicitly out of scope.

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

## Tier 2 - Visual telemetry (DEFERRED)

Status: deferred until the prerequisite in the Decision-needed
section below is met.

Scope if implemented:
- `gaze_at_camera_pct` - rough head-pose direction via
  MediaPipe FaceMesh, computed client-side during recording
- `in_frame_pct` - is the face actually visible
- `face_brightness_mean` - lighting quality proxy
- Stored alongside the video upload as a small JSON
- Rendered as a "Reviewer diagnostics" panel that is **never** fed
  back into the AI scoring prompt

Hard constraints if/when we ship Tier 2:
1. Metrics live in a separate panel labelled "Reviewer diagnostics".
2. Metrics are **never** an input to `lib/claude-scoring.ts` or any
   AI scoring path.
3. Per-candidate metrics are visible to the candidate on request
   (APP 12 access right) - we don't produce information about a
   person we won't share with them.
4. We publish a short Algorithmic Impact Assessment for Tier 2 on
   `/docs` before launch, listing the disability-discrimination risks
   and the compensating control (human review required, no auto-
   reject).

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

## Decision needed before Tier 2 ships

These two questions need a yes from the founder before Tier 2 work
starts:

1. Authority to publish a 1-page Algorithmic Impact Assessment
   template in `/docs` and require it for any reviewer-visible
   visual telemetry before launch.
2. Acceptance that visual telemetry stays in a separate
   "Reviewer diagnostics" panel and is never fed into the AI
   scorer.

The Tier 1 build does not need either prerequisite and is in
production.

---

## Change log

- 2026-05-15: Tier 1 shipped, Tier 2 deferred, Tier 3 ruled out.
