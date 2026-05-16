# Algorithmic Impact Assessment (AIA) Template

Use this template for any new AI / algorithmic feature that produces
a signal about a person (candidate, employee, applicant). Fill it in
**before** the feature ships, attach a copy to the relevant decision
log entry, and review it whenever the feature changes substance.

Why we do this: the AHRC's Human Rights and Technology report (2020),
the OAIC's Privacy and AI guidance (2024), and the EU AI Act all
require or recommend an impact assessment for AI used in employment
decisions. Publishing the template + a completed assessment per
feature is the cheapest way to be auditable.

A completed AIA lives at `docs/AIA-<feature-shortname>.md`.

---

## 1. Feature snapshot

- **Feature name:**
- **Owner (decision-maker):**
- **Engineering lead:**
- **Date completed:**
- **Date due for review:** (default: 12 months)
- **One-paragraph summary:** What does the feature do? What signal
  does it produce, who sees it, what decision is it adjacent to?

## 2. Inputs

- **Data collected:** list every personal-information field this
  feature ingests (including derived data and any biometric-adjacent
  signals like facial landmarks, voice features, gaze position).
- **Where it's collected from:** browser, server, an external API,
  client upload.
- **Where it's stored:** specific table + column, or "in-memory only,
  not persisted".
- **Retention:** how long is it kept, when is it deleted, by which
  scheduled job.
- **Sub-processors that see it:** list every third party with file
  access or API access to this data.

## 3. Outputs

- **What the feature returns:** the shape of the result and who sees
  it (candidate, reviewer, AI scorer, none of the above).
- **Is the output an input to any other AI scoring pipeline?**
  yes / no. **If yes, justify** - the default position in this
  product is NO.
- **Can the output trigger an automated adverse action against the
  candidate?** yes / no. **If yes, name the human-review checkpoint
  before adverse action is taken.** The default position is no
  autonomous adverse action.

## 4. Risk register

For each risk, score Likelihood (Low / Med / High) and Severity
(Low / Med / High), describe the mitigation in place, and name the
residual risk after the mitigation.

| # | Risk | Likelihood | Severity | Mitigation | Residual |
|---|---|---|---|---|---|
| 1 | Disability discrimination (e.g. signal worse for users with movement disorder, neurodivergence, vision impairment) | | | | |
| 2 | Cultural / racial bias (e.g. eye-contact norms differ across cultures, speech rate differs across English variants) | | | | |
| 3 | Technical artefact misread as candidate behaviour (e.g. low light, poor mic, dropped network) | | | | |
| 4 | Re-identification risk (data combined with other rows or external sets to re-identify someone) | | | | |
| 5 | Function creep (signal originally for diagnostics ends up in a scoring pipeline) | | | | |
| 6 | Regulatory risk (EU AI Act, AHRC, OAIC, US state laws if relevant) | | | | |

## 5. Lawful basis + consent

- **APP 3 - is the personal information necessary for our function?**
- **Lawful basis for collection:** consent / contract / lawful
  interest. Most candidate features use consent - if so, link to the
  exact consent text + version.
- **APP 5 - have we told the candidate this signal is being computed
  about them?** Privacy policy + consent text + UI surface that
  discloses the feature.

## 6. Human-in-the-loop checkpoints

List every decision point where a human reviews this feature's
output before any action is taken. The default and strong preference
is that adverse action against a candidate requires a human click.

## 7. Bias testing plan

- **What test data will we use?** (Real data only after consent;
  synthetic if pre-launch.)
- **What protected attributes will we test for adverse impact?** Use
  the EEOC four-fifths rule as the default threshold (cohort selection
  rate < 80% of the top cohort triggers a review).
- **Who reviews the result?** Named.
- **When does the next test run?** Default 12 months.

## 8. Reviewer / candidate transparency

- **Can the candidate request their data under APP 12?** Yes by
  default (we already have the request flow at `/privacy/request`).
- **Will the candidate see the signal we computed about them?** If
  yes, name the surface. If no, justify why not.
- **Can the candidate challenge or appeal the signal?** Name the
  channel.

## 9. Kill switch

- **What's the procedure to disable this feature in production
  immediately if a problem is discovered?** Name the file / config
  flag / migration that turns it off, the person who can hit it, and
  the comms plan to affected users.

## 10. Approvals

- **Owner sign-off:**
- **Engineering lead sign-off:**
- **(Optional) External privacy/legal review:**
- **Date approved:**

---

## Notes for filling this in

- A 1-page AIA is fine. A 5-page AIA is fine. The point is the
  decisions are visible to a third party reading it cold.
- "I don't know" is a valid answer; it's information. Add a TODO
  with the date you commit to closing it out.
- If any risk in Section 4 is High likelihood + High severity, the
  feature does not ship until you have a control that drops one of
  those to Medium or below.
- Bias testing in Section 7 is mandatory for features that score or
  compare candidates. It's nice-to-have but not mandatory for pure
  reviewer-diagnostic features (per the second AIA prerequisite
  for Tier 2 visual telemetry: must not be fed to the AI scorer).
