# CV Scoring + Role Auto-Match - Developer Specification

Status: DRAFT v0.1 (2026-08-07). Owner: recruitment/scoring.
Audience: the dev team hard-coding the scoring system.
Scope: how an uploaded CV is (a) linked to a role and (b) scored against that
role's rubric, deterministically enough to implement, test, and not regress.

This spec is grounded in the code as wired today. Every claim cites a file so
you can verify before you build. Where the current code has a gap or latent
bug, it is called out in section 8 with the exact fix.

---

## 1. Goals and non-goals

**Goals**
1. An extensive role library: ~121 roles across the 9 dashboard industries
   (`data/rubrics/au-role-taxonomy.json`), each with a research-backed rubric.
2. Deterministic CV -> role linking (auto-match) with a confidence floor and a
   safe fallback, so uploaded CVs attach to the right rubric.
3. Reproducible scoring: same CV + same rubric version -> same score band.
4. Move the bulk data server-side so the client bundle does not grow with the
   role library.

**Non-goals**
- No legal advice. Award/licence data is grounding/scope only (see
  `hqai/CLAUDE.md` "Positioning"). Never surface it as legal interpretation.
- The merit score is not a hire/no-hire decision. It ranks; the recruiter
  decides. Eligibility (licences/work rights) is a **consideration**, never a
  merit deduction (see section 5).

---

## 2. The two scales and the single conversion boundary (READ FIRST)

There are two number systems. Mixing them is the most likely bug.

| Concept | Library JSON (authoring) | Live engine (runtime) |
|---|---|---|
| Per-criterion | `max_points` (integer, sum = 100) | `weight` (0-1, sum ~= 1.0) |
| Advance gate | `advance_threshold` (0-100) | `minimum_score_to_advance` (0-5) |
| Per-criterion CV score | n/a | `score` 0-5 (integer) |
| Overall CV score | n/a | 0-5 weighted, 2dp |

**The ONLY place these convert is the adapter** `lib/rubrics-au/index.ts`:
- `weight = max_points / 100` (`adaptRole`, ~line 114)
- `minimum_score_to_advance = advance_threshold / 20` (~line 174)

Rule for implementers: **never** re-derive one scale from the other anywhere
else. Author in 0-100 in JSON; consume 0-5 from the adapted `Rubric`. If you
need the 0-100 view at runtime, multiply the 0-5 overall by 20 at the edge
(display only) - do not store it.

`computeOverall` (`lib/cv-screening/score.ts:242`) excludes `hard_gate`
criteria and re-normalises across the weights actually scored, so dropping a
gate does not deflate the score. Keep that property.

---

## 3. Data architecture (server-side + spec, per decision)

### 3.1 Source-of-truth files
- `data/rubrics/au-role-taxonomy.json` - canonical role list + matcher signals
  (NEW, this change). 121 roles.
- `data/rubrics/au-industry-role-rubrics.json` - the authored rubric library
  (EXISTING; being expanded from 22 -> ~121 roles).
- `data/awards/*.md` - Fair Work Modern Award texts (grounding for research).

### 3.2 The client-bundle problem (must fix before the library grows)
Today `lib/rubrics-au/index.ts:26` does
`import rawLibrary from '../../data/rubrics/au-industry-role-rubrics.json'`
with `resolveJsonModule`, and `cv-screening-rubrics.ts` folds the result into
`ALL_RUBRICS`. Anything that imports `ALL_RUBRICS` from a client component
pulls the **entire** library into the browser bundle. At 22 roles that is
tolerable; at 121 roles with full research prose it is not.

**Required change (choose one, prefer A):**
- **A. Server-only boundary.** Add `import 'server-only'` to
  `lib/rubrics-au/index.ts` (and any module that re-exports the full library).
  Expose rubrics to the client ONLY through API routes that return the single
  rubric needed (`/api/cv-screening/rubrics/[id]` already exists). Audit every
  client import of `ALL_RUBRICS` / `INDUSTRY_RUBRICS` and replace with a fetch.
- **B. Lazy server import.** Keep the JSON out of shared modules; `await import`
  it inside route handlers only.

Acceptance: `next build` output shows no per-page First Load JS increase
attributable to the rubric JSON; a bundle analyzer confirms the JSON is not in
any client chunk. This is the concrete "bug-avoidant" gate for this milestone.

### 3.3 Optional later: Supabase table
Not required now. If the library needs per-tenant editing at scale, seed a
`rubrics` table from the JSON via migration and serve via API with RLS on
(RLS is being re-enabled pre-launch, see memory `project_stripe_golive`). Until
then the JSON is the source of truth and MUST stay committed (it is imported at
build time).

---

## 4. CV -> role auto-matcher (NEW - the core new component)

Today there is **no** CV->role matcher. `suggest-rubric`
(`app/api/cv-screening/suggest-rubric/route.ts`) *generates a bespoke rubric
from a job ad* - it does not select a library role. This section specifies the
matcher to build.

### 4.1 Inputs, in priority order
1. `recruiter_selected_role_key` - if the campaign/screening already names a
   role, that is the **source of truth**. Matcher only *confirms* it.
2. `job_ad` / `role_profile.title` (from the campaign) - primary signal when no
   role is selected.
3. `cv_text` - used to disambiguate and to fill `thin_experience`, but a CV's
   most recent title is a weaker signal than the job the recruiter is hiring
   for. Never let the CV override an explicit recruiter selection.

### 4.2 Algorithm (deterministic; no LLM required for the match)
```
match(input) -> { role_key, rubric_id, confidence, source, candidates[] }

1. If recruiter_selected_role_key is set and valid:
     return { role_key, rubric_id, confidence: 1.0, source: 'recruiter' }

2. Build a query string:
     q = lower(role_profile.title + ' ' + job_ad.title + ' ' + top_cv_titles)
   (top_cv_titles = the CV's 1-3 most recent job titles only, to avoid
    diluting with a whole career of unrelated roles.)

3. For each role in taxonomy (optionally pre-filtered to the tenant's industry
   via INDUSTRY_TO_RUBRIC_IDS to cut false positives across sectors):
     score = 3 * count(positive_signals matched as whole-word/phrase in q)
           + 1 * count(alias tokens matched)
           - 4 * count(negative_signals matched in q)
     Apply seniority nudge: if q contains a seniority cue (senior/lead/manager/
       assistant/head) that matches role.seniority, +1; if it contradicts, -1.

4. Rank. Let best, second = top two by score.
   confidence = clamp01( (best.score) / (best.score + second.score + 3) )

5. Decide:
     if best.score < MATCH_FLOOR (=3)                 -> role_key=null (no match)
     else if (best.score - second.score) < MARGIN(=2) -> ambiguous:
            return best but source:'ambiguous', include candidates[0..2]
     else                                              -> source:'auto'
```

### 4.3 Contract / edge cases (these are the test cases)
- **No confident match** -> `role_key = null`. The UI must then require the
  recruiter to pick a role, or fall back to `suggest-rubric` (bespoke). Never
  silently score against a wrong rubric.
- **Ambiguous** (e.g. "Support Worker" -> disability vs aged vs community) ->
  return the top candidate but flag `source:'ambiguous'` and surface
  `candidates` so the recruiter one-clicks the right one.
- **Cross-industry collisions** are handled by `negative_signals`
  (e.g. `it support` pushes away from `disability_support_worker`;
  `sales representative` away from retail `sales_assistant`). Every new role
  MUST add negative_signals for its known confusions.
- **Determinism:** the matcher is pure string/array logic. No timestamps, no
  randomness. Same inputs -> same output. Unit-test with a frozen fixture set.
- **Fallback role, never a wrong role.** If nothing clears the floor, the score
  path uses the recruiter selection or halts for input - it does not guess.

### 4.4 Where it plugs in
- New pure module `lib/rubrics-au/match.ts` (server-only): `matchRole(input)`.
- `POST /api/cv-screening/score` calls `matchRole` when the screening has no
  `rubric_id` yet, persists the chosen `rubric_id` + `match_source` +
  `match_confidence` on the `cv_screenings` row (new nullable columns, additive
  migration - see section 7).
- The scorer itself is unchanged; it always receives a concrete `Rubric`.

---

## 5. Scoring pipeline (end to end, as wired + required additions)

```
upload CV
  -> extract text            (route handler; keep file I/O in the route)
  -> matchRole()             (section 4; NEW) -> rubric_id
  -> load Rubric             (adapter: INDUSTRY_RUBRICS / getRubric)
  -> scoreCv(cvText, role, criteria, execution_guard)   (score.ts:41)
        model returns per-criterion score 0-5 + verbatim evidence span
        - EXECUTION GUARD caps title-only "management" inflation (score.ts:125)
        - REGISTRATION GATE gives held/not-held/unclear for hard gates (:133)
  -> computeOverall()        (score.ts:242) -> 0-5 merit, gates excluded
  -> deriveConsiderations()  (cv-screening-types.ts) -> eligibility pills
  -> advance = overall >= minimum_score_to_advance
               AND no gate = not_met (unclear routes to phone screen)
  -> persist
```

### 5.1 Considerations, not deductions (INVARIANT - do not "fix" this)
Hard gates (work rights, licences, checks) are assessed and shown post-score as
`met | unclear | not_met` and are **excluded from merit** (see
`cv-screening-types.ts deriveConsiderations`, memory
`project_cv_scoring_considerations`). An interstate candidate with full work
rights must not score lower on merit than a local. `unclear` is a phone-screen
question, never an auto-reject.

### 5.2 Anti-"semantic spoofing" (already partly wired)
- Role-level narrative: `Rubric.execution_guard` -> prompt block
  (`score.ts:146-156`). WIRED for library rubrics.
- Per-criterion cap: `criterion.execution_tokens` + `execution_cap`
  (`score.ts:125-131`). **DORMANT** for library rubrics - the JSON does not set
  these and the adapter does not map them. See fix 8.3 if you want per-criterion
  caps (recommended for execution-heavy criteria like "hands-on cooking",
  "licensed electrical work", "personal care delivered").

---

## 6. Per-role research output schema (what "systematic research" must produce)

Each pending role in the taxonomy gets one object appended to the matching
industry's `roles[]` in `data/rubrics/au-industry-role-rubrics.json`. Schema
(superset of what the adapter consumes - the adapter ignores unknown keys):

```jsonc
{
  "rubric_id": "rub_<prefix>_<role_key>_au_v1",
  "role": "Canonical role",
  "aliases": ["..."],
  "award_ref": { "code": "MAxxxxxx", "name": "...", "typical_classification": "..." },
  "award_pain_points": ["3-5 award-specific operational realities"],   // role or industry level
  "hard_gatekeepers": [
    { "id": "ahpra_rn", "label": "...", "mandatory": true|"conditional",
      "authority": "AHPRA", "note": "...",
      "gate_tokens": ["verbatim CV strings that evidence it"] }         // NEW: tokens live HERE (fix 8.2)
  ],
  "tech_stack": ["Deputy", "simPRO", "..."],   // FLAT string[] (fix 8.1), industry-level ok
  "funding_frameworks": ["NDIS", "My Aged Care"],   // where relevant (type supports it)
  "execution_vs_oversight": { "near_only": "...", "executed_within": "...",
    "supervised_within": "...", "disqualifiers": ["..."] },
  "merit_criteria": [
    { "id": "...", "label": "...", "max_points": 25, "type": "ordinal_5",
      "anchors": { "1": "...", "3": "...", "5": "..." }, "evidence_required": true,
      "execution_tokens": ["hands-on span words"], "execution_cap": 2 }   // optional, fix 8.3
  ],
  "penalty_overrides": [ { "id": "...", "condition": "...", "points": -8, "rationale": "..." } ],
  "hard_caps": [ { "id": "...", "condition": "...", "effect": "flag_ineligible|cap_advance:59|auto_reject", "rationale": "..." } ],
  "advance_threshold": 60
}
```

**Research invariants (enforced by `scripts/validate-au-rubrics.ts`):**
1. `merit_criteria[].max_points` sum to exactly 100 per role.
2. Every role has a work-rights gate (adapter injects one if omitted, but author
   it explicitly for clarity).
3. Mandatory licence claims must be current AU fact - each researched via the
   **primary source** (Fair Work award text; AHPRA; state licensing authority;
   ACECQA; NDIS Commission). Cite the source URL in a `sources` array per role
   (metadata; adapter ignores it) so claims are auditable.
4. `gate_tokens` must be real strings that appear on Australian CVs/credentials
   (e.g. "White Card", "CPCCWHS1001", "AHPRA", "Blue Card").
5. Australian English, plain hyphens only (no em/en dashes) - repo-wide rule.
6. Fairness: no protected-attribute proxy as a merit criterion; mark
   `fairness_flag` on tenure/gap-sensitive criteria (see existing examples).

---

## 7. Data model / migration (additive, nullable - the repo's rule)

New nullable columns on `cv_screenings` (additive migration; code must retry-
without and soft-warn if unapplied, matching the repo pattern in
`hqai/CLAUDE.md` Supabase note):
- `role_key text` - the taxonomy role the CV was linked to.
- `match_source text` - 'recruiter' | 'auto' | 'ambiguous' | 'bespoke' | null.
- `match_confidence numeric` - 0-1.
- `rubric_id text` - already implied by scoring; ensure it is persisted.

No destructive changes. RLS: when re-enabled, these columns are covered by the
existing `cv_screenings` tenant policy - no new policy needed, but add a test.

---

## 8. Known gaps / latent bugs to fix (verified in code today)

### 8.1 `tech_stack` shape mismatch (latent, silent) - LOW risk, fix cheap
`au-industry-role-rubrics.json` currently stores `tech_stack` as an **object**
(`{ pos: [...], ... }`), but the adapter types it `string[]` and does
`software_ecosystem: industry.tech_stack?.length ? ...` (`index.ts:51,179`). An
object has no `.length`, so `software_ecosystem` silently resolves to
`undefined` for every rubric. No crash, but the data is dropped.
**Fix:** standardise the schema on a **flat `string[]`** (section 6) and, in the
adapter, flatten defensively:
`Array.isArray(t) ? t : Object.values(t ?? {}).flat()`. Add a validator check.

### 8.2 `GATE_TOKENS` will drift at 121 roles - MEDIUM risk
Gate tokens live in a hand-maintained map in `index.ts:62-93`, keyed by
gatekeeper id. Every new mandatory gatekeeper needs an entry or it falls back to
label-derived tokens (`fallbackTokens`, often too generic).
**Fix:** move `gate_tokens` **into the JSON** per gatekeeper (section 6). Adapter
reads `g.gate_tokens ?? GATE_TOKENS[g.id] ?? fallbackTokens(g.label)` so
existing behaviour is preserved and new roles are self-describing. Retire the TS
map incrementally.

### 8.3 Per-criterion execution guard is dormant - MEDIUM risk (quality)
`score.ts:125` reads `execution_tokens`/`execution_cap` per criterion, but the
adapter (`adaptRole`, ~line 111) never sets them, so only the role-level guard
fires. For execution-heavy criteria this means a strong title can still inflate.
**Fix (if adopting per-criterion caps):** author `execution_tokens`/
`execution_cap` on the relevant `merit_criteria`, and in `adaptRole` map them
through onto the criterion. Otherwise document that guarding is role-level only
and remove the dead per-criterion branch to avoid confusion.

### 8.4 No auto-matcher - the section 4 build. HIGH value, net-new.

### 8.5 `suggest-rubric` and the library are disconnected - LOW risk
`suggest-rubric` invents a rubric; it never checks whether a good library role
already exists. Consider: run `matchRole` first; only fall back to bespoke
generation when `role_key = null`. Saves an LLM call and yields consistent
scoring.

---

## 9. Security and privacy

- **PII:** CV text contains personal data. Keep extraction + storage in the
  route handler; the scoring core is pure text-in/score-out (`score.ts` header).
  Do not log raw CV text. `aidefence_has_pii` is available if needed.
- **Scoring must ignore personal attributes** (photo, address, DOB, gender,
  ethnicity, school, grad year) - already enforced in the system prompt
  (`score.ts:162`). Any new criteria must not reintroduce these as signals.
- **Prompt-injection:** CV text is untrusted. It is passed as a user message,
  never concatenated into the system prompt or tool schema. Keep it that way; do
  not let CV content select its own rubric or alter gate reads.
- **Tenant isolation:** rubric selection and screening rows are per-tenant.
  With RLS on, the matcher must run under the tenant's context; pre-filtering by
  the tenant's `industry` also narrows false positives (section 4.2 step 3).
- **No secrets in data files.** The JSON carries no credentials.

---

## 10. Testing / bug-avoidance plan

1. **Validator (exists):** `scripts/validate-au-rubrics.ts` - extend to assert:
   points sum 100; flat `tech_stack`; every mandatory gatekeeper has
   `gate_tokens`; every role has a work-rights gate; award code exists in
   `data/awards`; ASCII hyphens only. Run in CI; green build gates merge.
2. **Matcher unit tests:** frozen fixture set of (title, cv_titles) -> expected
   role_key/source. Include the ambiguous "Support Worker", the cross-industry
   "support"/"sales"/"project manager" collisions, and a no-match case.
3. **Golden CVs:** 2-3 CVs per pilot industry with expected score bands (not
   exact numbers - band tolerance, since the model is stochastic). Assert:
   gates never move merit; oversight-only CV is capped; unclear gate -> advance
   still possible.
4. **Determinism boundary:** matcher and adapter are pure - snapshot-test them.
   The LLM step is the only non-deterministic part; assert on bands + on
   structural invariants (evidence span present for every non-zero score).
5. **Bundle check:** section 3.2 acceptance.
6. **Fairness spot-check:** run the fixtures in `docs/AI-FAIRNESS-FAIR-WORK.md`
   lens; tenure gaps and location must not reduce merit.

---

## 11. Delivery phases (budget-aware)

- **P0 (done):** taxonomy (121 roles) + this spec.
- **P1 pilot:** full web-researched rubrics for ONE licensing-heavy industry
  (Construction & Trades) to lock format + validator. Checkpoint.
- **P2 rollout:** research the remaining ~98 roles, industry by industry, via
  parallel research agents with a fixed schema contract; assemble; validate.
- **P3 wiring:** fixes 8.1-8.3, build the matcher (section 4), migration
  (section 7), server-only boundary (3.2), tests (section 10).
- **P4:** ship behind the green build; monitor; version rubrics as `_v2` when
  criteria change (never mutate a shipped rubric's meaning in place).
