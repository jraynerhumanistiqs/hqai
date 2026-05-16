# AIA: Reviewer Visual Telemetry (Tier 2)

Completed against the template at `docs/AIA-TEMPLATE.md`.

## 1. Feature snapshot

- **Feature name:** Reviewer Visual Telemetry (Tier 2)
- **Owner (decision-maker):** Jimmy Rayner
- **Engineering lead:** Jimmy Rayner
- **Date completed:** 15 May 2026
- **Date due for review:** 15 May 2027
- **Summary:** During a candidate's video pre-screen, we run a
  client-side MediaPipe FaceLandmarker pass on each frame and compute
  three aggregate signals per question: percentage of frames the
  candidate's face was detected in frame, percentage of frames their
  head pose looked roughly at the camera, and the mean brightness of
  the captured frame. These three numbers are persisted alongside
  the response and rendered in a separate "Reviewer Diagnostics"
  panel that staff can see when reviewing a candidate. **The numbers
  are never fed into the AI scoring pipeline** - they are descriptive
  diagnostic information for the human reviewer.

## 2. Inputs

- **Data collected:** From each video frame during the candidate's
  recording, MediaPipe FaceLandmarker returns face landmarks (478
  points) and a 4x4 facial-transformation matrix. We DO NOT persist
  the landmarks or matrices. We only persist three aggregate numbers
  per question: `in_frame_pct`, `at_camera_pct`, `face_brightness`,
  plus the number of frames sampled.
- **Where it's collected from:** the candidate's own browser, via
  MediaPipe Tasks Vision (WASM bundle loaded lazily from a CDN).
- **Where it's stored:** new column `visual_diagnostics jsonb` on
  `prescreen_responses`, shape `{ per_question: [{ q, in_frame_pct,
  at_camera_pct, face_brightness, frames_sampled }] }`.
- **Retention:** identical to the parent `prescreen_responses` row.
  Hard-deleted by the retention cron at the 80-day retention horizon.
- **Sub-processors that see it:** Supabase (database storage only).
  **The raw landmark data never leaves the candidate's browser.**

## 3. Outputs

- **What the feature returns:** three rounded percentages per
  question shown in a "Reviewer Diagnostics" panel on the staff side
  only.
- **Is the output an input to any other AI scoring pipeline?**
  **NO.** This is the second AIA prerequisite for shipping Tier 2.
  The scoring route (`app/api/prescreen/responses/[id]/score`)
  reads from `prescreen_transcripts.text` only - the visual
  diagnostics JSON is invisible to it.
- **Can the output trigger an automated adverse action?** **No.**
  Per the standing decision in `docs/AI-FAIRNESS-FAIR-WORK.md`
  Section 2.7, there is no path in the product where any signal
  triggers adverse action without a human click.

## 4. Risk register

| # | Risk | Likelihood | Severity | Mitigation | Residual |
|---|---|---|---|---|---|
| 1 | Disability discrimination - blind / low-vision candidates can't track a camera, candidates with movement disorders can't hold a frame steady, neurodivergent candidates may avoid eye contact | High | High | (a) The panel is labelled "Reviewer Diagnostics" and explicitly framed as "what the camera saw, not what the candidate is". (b) Signal is never fed to the scorer. (c) The fairness doc commits to no autonomous adverse action. (d) The reviewer-facing UI carries a permanent disclaimer reminding reviewers of disability-related causes for the same signal. | Med - relies on reviewer interpretation. |
| 2 | Cultural bias - eye-contact norms vary substantially (Western convention is sustained eye-contact = engagement; in many cultures the opposite reads as polite). | Med | High | Same as Risk 1. Disclaimer copy explicitly names cultural eye-contact difference as a confound. | Med |
| 3 | Technical artefact - poor lighting, low webcam quality, slow CPU dropping frames | High | Med | (a) Aggregate samples include `frames_sampled` so the reviewer can see how confident the read is. (b) Low brightness reads suppress the at-camera number. | Low |
| 4 | Re-identification risk | Low | Med | (a) No biometric template persisted - only three numbers per question. (b) Landmarks never leave the browser. | Low |
| 5 | Function creep - the diagnostics end up in a scoring pipeline | Med | High | (a) Hard-wired in code: the score route does not read `visual_diagnostics`. (b) A grep + a CI assertion in `tests/` (TODO) will guard against accidental wiring. (c) Documented here that any change requires re-running this AIA. | Low if guards stay. |
| 6 | Regulatory - EU AI Act Article 5 prohibits emotion recognition in employment | Low for AU only | High for EU expansion | We do not perform emotion recognition. We do not classify expressions. We report only in-frame % and camera-pose %. If we ever expand to the EU, this feature is reviewed against Article 5 specifically. | Low |

No High/High row survives the mitigation column. Feature ships.

## 5. Lawful basis + consent

- **APP 3 necessity:** the diagnostic supports the reviewer's
  judgement about an interview the candidate already consented to
  record. It is necessary to the function of the recruitment
  workflow.
- **Lawful basis:** consent. Captured at the start of the video
  pre-screen via `components/prescreen/CandidateGate.tsx` consent
  label, version `CONSENT_VERSION = '2026-05-15.v1'` (updated when
  Tier 2 launches to disclose the visual telemetry capture).
- **APP 5 notice:** privacy policy at `app/privacy/page.tsx` will be
  updated with a new sub-bullet under "Information we collect" that
  reads "If you complete a video pre-screen, your browser computes
  three aggregate signals about your video frames (whether your face
  is in frame, whether your head is roughly facing the camera,
  approximate lighting) and sends only those three numbers to us.
  Your video frames and any underlying facial landmarks never leave
  your device."

## 6. Human-in-the-loop checkpoints

- The reviewer must open the candidate detail and read the
  diagnostics before any decision. The decision UI for a candidate
  requires an explicit human click (Reject / Shortlist / Advance).
- There is no UI surface where the visual diagnostics number is
  surfaced as a "score" or rolled into a single ranking number.

## 7. Bias testing plan

Not applicable in the strict EEOC sense because the feature is not a
score and does not gate candidate progression. The Disparate Impact
Dashboard in the CV Scoring Agent monitors actual outcome adverse
impact - that's the mechanism that would catch a downstream effect
if visual diagnostics started biasing reviewers' decisions in
practice.

We commit to a 6-month sanity check (Nov 2026): review whether the
hire / no-hire split has shifted materially for candidates with low
`at_camera_pct` readings vs the population. If yes, escalate to a
formal bias review.

## 8. Reviewer / candidate transparency

- Candidate can request their data via `/privacy/request` (APP 12).
  The returned export will include the three diagnostic numbers
  alongside the transcript.
- Candidate is not shown the diagnostic readings during the
  pre-screen flow itself - by design, this is a reviewer
  diagnostic, not a candidate-facing signal. The privacy policy
  discloses the collection at consent.
- Appeal channel: same as any privacy or hiring complaint, via
  `privacy@humanistiqs.com.au`.

## 9. Kill switch

To disable the feature in production:

1. Set `NEXT_PUBLIC_VISUAL_TELEMETRY_ENABLED=false` in Vercel env -
   the `RecordingFlow` gate short-circuits.
2. Optionally `truncate prescreen_response_visual_diagnostics` (or
   set the column to null on the affected rows) if a data-deletion
   request lands.

Owner: Jimmy Rayner can hit either button. No external dependency.

## 10. Approvals

- **Owner sign-off:** Jimmy Rayner - 15 May 2026
- **Engineering lead sign-off:** Jimmy Rayner - 15 May 2026
- **External privacy/legal review:** Not yet sought. Recommended
  before commercial launch.
- **Date approved:** 15 May 2026

## Implementation note

The two prerequisites from the body-language roadmap brief
(authority to publish this AIA + commitment that visual telemetry
never feeds the scorer) are both satisfied above. Feature ships.
