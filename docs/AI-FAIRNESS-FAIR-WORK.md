# HQ.ai - AI Fairness and Fair Work Anti-Discrimination Considerations

Last updated: 15 May 2026
Owner: Jimmy Rayner

This document is HQ.ai's formal record of the design considerations and
operational mechanisms we have put in place to address anti-discrimination
obligations under the Fair Work Act 2009 (Cth), the Sex Discrimination
Act 1984, the Age Discrimination Act 2004, the Racial Discrimination
Act 1975, the Disability Discrimination Act 1992, and equivalent state
acts, given that HQ.ai's AI features influence hiring decisions.

It exists for two reasons: (1) to be the answer when a client, regulator,
or affected candidate asks "what have you done to prevent discrimination?"
and (2) to give engineers building new features a clear set of guardrails
to design against.

---

## 1. Position

HQ.ai's AI features are **decision support, not decision making**. Every
AI output is paired with structured evidence and a human review surface.
Our Terms of Service require business users to review AI outputs before
taking any action that affects a candidate, and our product is designed
so the path from "AI suggestion" to "action against a candidate" always
passes through a human click.

This is the single most important risk control. The Fair Work risk
exposure for the business user is materially the same as if they had
written the assessment themselves with AI help, provided they actually
review the output.

## 2. Mechanisms in place

### 2.1 CV-blinding before scoring

Implemented in `app/api/cv-screening/score/route.ts` (`extractRealName`,
`blindNameInText`, `blindPII`). Before any CV text is sent to Anthropic
for scoring we strip:

- The candidate's full name (and first/last components individually).
- Email addresses, phone numbers, dates of birth, ages.
- Postal addresses.
- Date-of-birth / graduation-year proxies (high-signal age proxies).
- Photo links.

The blinded text contains placeholder tokens (`[NAME]`, `[EMAIL]`, etc.)
which the model is instructed to ignore for scoring purposes.

### 2.2 Prompt-level guardrails

The CV scoring system prompt at `app/api/cv-screening/score/route.ts`
explicitly instructs the model to:

- Ignore name, photo, date of birth, gender, ethnicity, school name,
  graduation year.
- Not penalise tenure gaps without explicit cause.
- Score on substance and structured evidence only.
- Quote a verbatim CV span as evidence for every score so a human can
  audit.

### 2.3 Structured fairness checks recorded per screening

`lib/cv-screening-types.ts` defines a `FairnessChecks` shape persisted
on every `cv_screenings` row:

- `name_blinded`: blinding pipeline executed.
- `demographic_inference_suppressed`: prompt-level guardrails active.
- `tenure_gap_explained`: free-text annotation if a tenure gap was
  flagged + addressed.

### 2.4 Human-in-the-loop override

`cv_screenings_manual_override.sql` adds override_band, override_next_action,
override_comment columns. The reviewer can:

- Disagree with the AI band (e.g. AI said Yes, reviewer changes to
  Maybe).
- Change the recommended next step.
- Attach a comment explaining the reason for override.

The original AI value stays on the row alongside the override so we
preserve a record of where AI and human assessment diverged. Override
state is visible in the UI as an "edited" badge.

### 2.5 Counterfactual name probe

`app/api/cv-screening/counterfactual/route.ts` re-runs scoring with the
candidate's name swapped to a different cultural background, holding
all other content constant. Material score deltas surface a fairness
warning on the candidate's scorecard. This is a per-candidate adverse
impact probe that complements the population-level monitor below.

### 2.6 Disparate impact dashboard (four-fifths rule)

`components/recruit/cv-screening/CvScreeningClient.tsx`
`DisparateImpactCard` aggregates pass-rates by cohort across rubrics. Any
rubric with five or more screenings is monitored; the dashboard flags
any cohort whose selection rate is below 80% of the top cohort's
selection rate (the EEOC four-fifths rule, also referenced by the
Australian Human Rights Commission for adverse-impact testing). v2.5
of this widget is live; the cohort proxy is the candidate label first
token (a placeholder until structured demographic capture or
name-probe inference is added).

### 2.7 No autonomous adverse action

There is no path in the product where the AI's output triggers an
adverse action against a candidate without a human click. There is no
auto-reject. There is no auto-send-of-rejection-email. The "Reject"
band on a CV scoring still requires the business user to take action
in the UI.

## 3. What is NOT yet covered (open gaps)

- **Video pre-screen blinding.** The video pre-screen scoring path does
  not blind the candidate's name from Anthropic, and the transcript
  obviously cannot blind voice/visual features. Anonymise mode in the
  reviewer UI is a downstream control but does not affect the AI's
  scoring input. Open question: implement transcript-level blinding for
  the prescreen scoring call.
- **Demographic-attribute capture for true adverse impact measurement.**
  We do not capture protected attributes from candidates (intentional -
  reduces collection scope) which means the four-fifths monitor uses
  name-token proxy rather than real demographic data.
- **Model-card / model governance.** We do not publish a formal model
  card describing the rubrics, the prompt design, the blinding scope,
  the known limitations.
- **Challenge / appeal path for candidates.** Candidates cannot today
  see their AI-generated scoring or contest it. APP 12 access requests
  cover this in part (a candidate can request all data we hold) but a
  structured appeal flow does not exist.

## 4. Operational obligations

Items below are not technical controls but documented operational
practice that go with the technology controls above:

- New rubric criteria must be reviewed against protected attributes
  before going live. Use the criteria list in `lib/cv-screening-rubrics.ts`
  as the source of truth; do not embed criteria like "fits the team
  culture" without a defined behavioural anchor.
- Aggregate fairness metrics must be reviewed monthly by the founder
  for the first 6 months of commercial operation, then quarterly.
- Any client report of bias or adverse outcome triggers a re-run of the
  counterfactual probe on all candidates for the affected role and a
  written summary to the client within 5 business days.

## 5. References

- Fair Work Act 2009 (Cth), Part 3-1 General Protections.
- Age Discrimination Act 2004, Sex Discrimination Act 1984, Racial
  Discrimination Act 1975, Disability Discrimination Act 1992.
- Australian Human Rights Commission (2020) "Human Rights and
  Technology" - adverse impact framework.
- EEOC Uniform Guidelines on Employee Selection Procedures (1978) -
  four-fifths rule.
- OAIC (2024) "Privacy and AI" guidance.
- Office of the Inspector-General of Emergency Management Vic (2023)
  AI-assisted recruitment review (for AU public-sector context).

## 6. Change log

- 2026-05-15: Initial documented record. Mechanisms 2.1-2.7 in place;
  Gap list at Section 3 active.
