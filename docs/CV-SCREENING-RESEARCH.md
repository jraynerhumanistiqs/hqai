# CV Screening Research: Building a Defensible AI Shortlisting Product for HQ.ai

## Executive summary

CV screening is the highest-frequency, highest-pain task in recruitment. A typical corporate role attracts 100-250 applicants, of whom a recruiter spends 6-8 seconds per CV in the first pass and rejects roughly 75% before any human conversation. LinkedIn's 2024 Future of Recruiting report shows 67% of talent professionals already use or plan to use generative AI for sourcing and screening within 12 months, and the global AI-recruitment market is forecast to grow from USD 661M in 2023 to USD 1.12B by 2030 (CAGR ~6.9%). The category is crowded but fragmented: Eightfold, HireVue, Paradox, SeekOut, Findem and Metaview lead at the enterprise end; Manatal, Recruitee, Workable and Ashby compete in mid-market; and a long tail of GPT-wrapper startups (Pyn, Hume, Hireguide, Mercor) chase SMB.

The defensible wedge for HQ.ai in Australia is not "another GPT wrapper that ranks CVs". It is a structured, auditable, role-specific rubric engine that produces a scorecard a hiring manager actually trusts, paired with an explicit next-action recommendation (reject, phone screen, technical task, panel) and tight integration into video interviewing. The compliance backdrop in Australia (Privacy Act reforms, the AHRC's 2024 guidance on AI in employment, and the EU AI Act's high-risk classification of recruitment AI for any AU company hiring into the EU) means an "explainable by design" product is a moat, not overhead.

This report covers market sizing, rubric design with JSON examples, bias and fairness controls, Australian compliance, ingestion architecture, scorecard UX, next-action generation, video integration, wireframes, build vs buy, demo-day risk, and a concrete v1 feature list with acceptance criteria.

---

## 1. Market and competitor landscape

### Market size and growth

Grand View Research (2024) puts the global AI recruitment market at USD 661.6M in 2023, growing to USD 1.12B by 2030. SHRM's 2024 Talent Trends survey reports 65% of US employers using AI in at least one talent process, up from 26% in 2022. In Australia, Seek's 2024 Hiring Insights shows 58% of employers experimented with AI-assisted shortlisting in the last 12 months, but only 11% have it embedded in production workflow - the gap HQ.ai can target.

### Competitor segments

**Enterprise ATS-native AI**: Workday Recruiting Skills Cloud, SAP SuccessFactors, Oracle Recruiting Booster. Strength: data gravity. Weakness: poor UX, slow rubric configuration, no video.

**Specialist AI screening**: Eightfold AI (talent intelligence graph), Paradox Olivia (conversational), HireVue (video + assessment), SeekOut (sourcing), Findem (people analytics). Strength: depth. Weakness: USD 40-150K ACV, 6-12 week implementation, opaque scoring.

**Mid-market ATS with AI add-ons**: Ashby, Greenhouse, Lever, Workable, Manatal, Recruitee. Strength: usable. Weakness: AI is a thin GPT layer over keyword match.

**AI-native challengers (2023-2026)**: Mercor (technical hiring), Metaview (interview notes), Hume (voice), Pyn, Hireguide, Covey, Juicebox, Holly. Strength: fast iteration. Weakness: feature-thin, no compliance story, no ANZ presence.

**Australian context**: Compono, ELMO, Expr3ss!, Scout Talent, Livehire, JobAdder. Mostly ATS plays with weak AI. No credible AU-built AI shortlister with a clear rubric and bias-audit story. **This is HQ.ai's opening.**

---

## 2. Rubric design (the core IP)

A rubric is a structured set of weighted criteria with explicit scoring anchors. Without it, "AI screening" is just vibes-as-a-service. The rubric must be:

- **Role-specific** but generated from a small set of templates (engineering IC, engineering manager, sales AE, sales leader, product, design, ops, customer success, finance, marketing, executive)
- **Editable** by the hiring manager in under 3 minutes
- **Auditable** so every score points to evidence in the CV
- **Calibrated** with anchor descriptions for each level

### Rubric schema (JSON)

```json
{
  "rubric_id": "rub_eng_senior_be_au_2026",
  "role": "Senior Backend Engineer",
  "country": "AU",
  "version": 3,
  "criteria": [
    {
      "id": "depth_backend",
      "label": "Backend depth",
      "weight": 0.25,
      "type": "ordinal_5",
      "anchors": {
        "1": "No production backend experience",
        "2": "1-2 yrs, single language, CRUD only",
        "3": "3-5 yrs, owns services, basic distributed concepts",
        "4": "5-8 yrs, designs systems, mentors, performance tuning",
        "5": "8+ yrs, sets architecture, multi-region, deep concurrency"
      },
      "evidence_required": true
    },
    {
      "id": "scale_signals",
      "label": "Scale and reliability signals",
      "weight": 0.15,
      "type": "ordinal_5",
      "anchors": {
        "1": "No traffic/scale signal",
        "3": "Mentions 100k+ users or 1k+ RPS",
        "5": "Owned 1M+ DAU or 50k+ RPS systems with SLO ownership"
      }
    },
    {
      "id": "domain_fit",
      "label": "Domain fit (fintech / payments)",
      "weight": 0.15,
      "type": "ordinal_5"
    },
    {
      "id": "tenure_stability",
      "label": "Tenure pattern",
      "weight": 0.05,
      "type": "ordinal_5",
      "fairness_flag": "tenure_can_correlate_with_caregiving_gaps"
    },
    {
      "id": "communication",
      "label": "Written communication (CV clarity)",
      "weight": 0.10,
      "type": "ordinal_5"
    },
    {
      "id": "leadership",
      "label": "Tech leadership signals",
      "weight": 0.15,
      "type": "ordinal_5"
    },
    {
      "id": "values_alignment",
      "label": "Values / mission signals",
      "weight": 0.05,
      "type": "ordinal_5"
    },
    {
      "id": "location_eligibility",
      "label": "AU work rights / location",
      "weight": 0.10,
      "type": "binary",
      "hard_gate": true
    }
  ],
  "minimum_score_to_advance": 3.4,
  "hard_gates": ["location_eligibility"],
  "blind_fields": ["name", "photo", "address", "dob", "gender_inferred"]
}
```

### Score output

```json
{
  "candidate_id": "cand_8f21",
  "rubric_id": "rub_eng_senior_be_au_2026",
  "overall_score": 3.85,
  "band": "phone_screen",
  "criteria_scores": [
    {
      "id": "depth_backend",
      "score": 4,
      "confidence": 0.82,
      "evidence": [
        {"text": "Led migration of payments service from monolith to 14 Go microservices on GKE, p99 < 80ms at 12k RPS", "cv_span": [412, 528]}
      ]
    }
  ],
  "fairness_checks": {
    "name_blinded": true,
    "tenure_gap_explained": "career_break_2022_caregiving",
    "demographic_inference_suppressed": true
  },
  "next_action": "schedule_30m_phone_screen",
  "rationale_short": "Strong backend depth and scale signal at Afterpay. Domain fit moderate. No leadership at staff level yet."
}
```

The rubric engine should expose a library of 12-15 templates, allow per-criterion weight adjustment via slider, and re-score the existing pipeline live when weights change. That live re-rank is the "wow" demo moment.

---

## 3. Bias and fairness

This is non-negotiable and also marketable. The Amazon 2018 case (model penalising "women's chess club") and the iTutorGroup 2023 EEOC settlement (USD 365K for age-based auto-rejection) define the floor. NIST AI RMF (2023), the EU AI Act (recruitment = high-risk, Annex III), and the AHRC's 2024 guidance on AI in employment all point the same direction: document the model, suppress protected attributes, audit disparate impact, and keep a human in the loop on every adverse decision.

**Controls HQ.ai should ship in v1:**

1. **Blind-by-default**: name, photo, address, DOB, gender pronouns, ethnicity-correlated school names, graduation years are masked from the LLM prompt. Recruiter can unmask after shortlist is locked.
2. **Tenure-gap normalisation**: gaps over 6 months are flagged but not penalised unless the recruiter ticks "tenure stability matters for this role".
3. **Disparate impact dashboard**: per-role four-fifths rule check (selection rate of any inferred group < 80% of top group triggers a warning). Inference uses BISG-style probabilistic methods strictly for monitoring, never for scoring.
4. **Counterfactual probe**: for any candidate the recruiter can press "would this candidate score the same if their name were Jane Smith / Jian Sun / Aisha Patel". The system re-runs the prompt and shows score deltas. If delta > 0.3 on overall, system flags model drift.
5. **Decision log**: every adverse action stores the rubric version, model version, prompt hash, and recruiter override, retained 7 years per Fair Work record-keeping.
6. **Human-in-the-loop gate**: no candidate is auto-rejected. The system can recommend reject; only a human clicks reject. This is the single most important compliance feature.

---

## 4. Australian compliance specifics

**Privacy Act 1988 (Cth) and 2024 reforms**: APP 1, 3, 5, 6, 11. The 2024 reform tranche introduces a statutory tort for serious invasions of privacy and stronger automated-decision-making transparency. From late 2026, organisations must disclose in their privacy policy if personal information is used in automated decisions that substantially affect the individual.

**Anti-Discrimination**: Sex Discrimination Act 1984, Age Discrimination Act 2004, Disability Discrimination Act 1992, Racial Discrimination Act 1975, plus state acts. Indirect discrimination via proxy variables (postcode, school, name) is the live risk.

**Fair Work Act 2009**: record-keeping s535 requires 7-year retention of employee records; pre-employment records sit under APP 11 retention-and-destruction rules.

**AHRC 2024 guidance ("Human Rights and Technology")**: recommends explainability, human oversight, and impact assessments for AI in employment.

**EU AI Act (relevant if hiring into EU)**: recruitment AI is Annex III high-risk. Requires risk management system, data governance, technical documentation, logging, human oversight, accuracy and robustness, and post-market monitoring. Compliance is a ~12-week programme; HQ.ai should architect for it from day one.

**Practical implication**: HQ.ai needs a one-page "AI Notice" template customers can embed in their job ads, plus a Data Processing Addendum, plus an exportable "decision dossier" per candidate.

---

## 5. CV ingestion architecture

CVs arrive in PDF (60%), DOCX (25%), images-of-PDFs (10%), and LinkedIn exports / web links (5%). The pipeline must handle all five and degrade gracefully.

**Stage 1 - Intake**: drag-and-drop, ATS webhook (Greenhouse, Lever, Ashby, Workable, JobAdder, Employment Hero), email forward (jobs+req123@inbound.hq.ai), Zapier.

**Stage 2 - Parse**:
- Native PDF text extraction (pdfplumber or PyMuPDF).
- Fallback OCR for scanned PDFs and images (AWS Textract or Azure Document Intelligence; Textract wins on tables).
- DOCX via python-docx.
- LinkedIn URL via authenticated scrape with rate limiting (or push the user to paste).

**Stage 3 - Structure**: LLM extraction into a canonical Candidate JSON (work history, education, skills, certifications, links, location, work rights). Use a small fine-tuned or few-shot Haiku-tier model for cost; reserve Sonnet for ambiguous cases. Target cost under AUD 0.02 per CV.

**Stage 4 - Enrich**: optional GitHub, public talks, patents, publications via background workers. Skip for non-tech roles.

**Stage 5 - Score**: rubric engine (see Section 2). Run blinded prompt. Persist evidence spans.

**Stage 6 - Persist**: Postgres for structured data, S3 for original files (encrypted at rest, AU region for AU customers - use ap-southeast-2), pgvector or Pinecone for semantic search, audit log in append-only table.

**Latency target**: 30 seconds end-to-end per CV at p95. Bulk upload of 200 CVs completes in under 4 minutes via parallel workers.

---

## 6. Scorecard UX

The scorecard is what the hiring manager sees. It must answer three questions in 10 seconds:

1. Should I talk to this person?
2. Why this score?
3. What do I do next?

**Layout**:
- Top strip: name (or "Candidate #8f21" in blind mode), overall score with band colour, recommended next action button.
- Left column: rubric criteria with score, weight, and one-line rationale per criterion. Click to expand evidence.
- Right column: CV preview with evidence highlights. Hovering a criterion highlights the matching CV span.
- Bottom: recruiter notes, override button, "explain this score" button (regenerates rationale in plain English), and adverse-decision log.

**Bands**:
- 4.3-5.0: Strong yes - schedule panel
- 3.6-4.2: Yes - phone screen
- 3.0-3.5: Maybe - technical task or recruiter screen
- 2.0-2.9: Likely no - hold for review
- 0-1.9: Reject (recruiter must confirm)

The "recommended next action" must be a single button, not a dropdown. Cognitive load kills adoption.

---

## 7. Next-action generation

The next-action engine takes the rubric scores plus role context and outputs one of: reject, recruiter screen, technical task, hiring manager screen, panel, offer-track. It also generates the artefact for the next step:

- For phone screen: a 5-question script tailored to the candidate's gaps and strengths, time-boxed to 25 minutes.
- For technical task: pulls from a task library indexed by role and seniority; suggests time limit and rubric for grading the task.
- For panel: drafts the panel composition (skills coverage matrix), individual interviewer focus areas, and 4 questions per interviewer with follow-up prompts.

**Prompt skeleton**:

```
Given:
- Rubric scores: {criteria_scores}
- Role: {role}
- Seniority: {level}
- Top 3 evidence spans: {evidence}
- Top 3 gaps: {gaps}

Produce:
1. Recommended next step (one of: reject, phone, task, panel)
2. Justification (max 40 words)
3. If phone: 5 questions probing the top 2 gaps
4. If task: select task_id from library matching gaps
5. If panel: 3 interviewers x focus areas x 4 questions each
```

This is the second "wow" demo moment: scoring is table stakes; generating the actual next-step artefact is the differentiator.

---

## 8. Video interview integration

Video is where HQ.ai compounds. Three integration patterns:

**Pattern A - Async video screen**: candidate records 3-5 short responses to questions generated from the rubric gaps. HQ.ai transcribes (Whisper), scores against rubric criteria (communication, role-specific competencies), and updates the scorecard. HireVue and Willo own this category but their AI scoring is contested (Illinois AI Video Interview Act, Maryland HB 1202). HQ.ai's edge: the questions are derived from the candidate's specific CV gaps, not a generic question bank.

**Pattern B - Live interview copilot**: during a Zoom/Meet/Teams call, HQ.ai listens, transcribes in real time, surfaces follow-up questions tied to rubric criteria still ungraded, and at the end produces a structured interview note that updates the scorecard. Metaview and Hume lead here. HQ.ai's edge: tight loop with the rubric so the interview directly closes the open scoring gaps.

**Pattern C - Post-interview synthesis**: ingest recordings from any platform via API or upload, transcribe, extract rubric evidence, push to ATS. Lower-effort integration; broadest reach.

**Recommendation**: ship Pattern C in v1 (lowest integration cost), Pattern B in v2 (highest stickiness), Pattern A in v3 (commodity, last priority).

**Compliance flags**: Illinois AIVIA requires consent and notice; AU has no direct equivalent but the Privacy Act consent rules apply. Facial-expression analysis is banned under the EU AI Act for recruitment. **Do not ship facial analysis. Audio and transcript only.**

---

## 9. ASCII wireframes

### Screen 1: Pipeline view

```
+----------------------------------------------------------------------+
| HQ.ai   Senior Backend Engineer  -  Req #BE-204   -  Sydney  -  AU   |
+----------------------------------------------------------------------+
| Rubric: Engineering / Senior IC v3   [edit]   [re-rank]              |
| Filter: All (147)  Strong (12)  Yes (28)  Maybe (44)  No (63)        |
+----------------------------------------------------------------------+
| #   Candidate         Score   Band         Next action      Status   |
| 01  Cand-8f21         4.6     Strong yes   [ Panel ]        New      |
| 02  Cand-3a99         4.2     Yes          [ Phone ]        New      |
| 03  Cand-7c10         3.8     Yes          [ Phone ]        Sent     |
| 04  Cand-1b22         3.5     Maybe        [ Tech task ]    New      |
| 05  Cand-9d44         2.7     Likely no    [ Hold ]         New      |
| ...                                                                  |
+----------------------------------------------------------------------+
| [ Bulk: send phone-screen invites to all Yes ]   [ Export CSV ]      |
+----------------------------------------------------------------------+
```

### Screen 2: Candidate scorecard

```
+----------------------------------------------------------------------+
| Cand-8f21   Score 4.6   Strong yes   [  Schedule panel  ]  [ Reject ]|
+----------------------------------------------------------------------+
| Criterion              Score  Weight  Rationale                      |
| Backend depth            5     25%    14 Go services, p99 80ms 12kRPS|
| Scale signals            5     15%    Owned payments at 50k RPS      |
| Domain fit (fintech)     4     15%    Afterpay 3 yrs                 |
| Tenure                   3      5%    Avg 2.1 yrs, one 8mo gap*      |
| Communication            4     10%    CV clear, quantified           |
| Tech leadership          4     15%    Mentored 6, led migration      |
| Values                   3      5%    Limited signal                 |
| AU work rights           Y     10%    Citizen                        |
+----------------------------------------------------------------------+
| Evidence: [highlighted CV preview - hover criteria to see spans]     |
+----------------------------------------------------------------------+
| Suggested phone-screen questions (25 min):                           |
|   1. Walk me through the monolith-to-microservices decision...       |
|   2. Tell me about an SLO you owned and a time it broke...           |
|   3. ... [edit] [send to candidate]                                  |
+----------------------------------------------------------------------+
| * 8-month gap 2022 - candidate noted caregiving. Not penalised.      |
| [ Counterfactual: re-score with name "Jane Smith" -> 4.6 (no change)]|
+----------------------------------------------------------------------+
```

### Screen 3: Rubric editor

```
+----------------------------------------------------------------------+
| Rubric: Senior Backend Engineer   v3                                 |
+----------------------------------------------------------------------+
| Criterion             Weight    [drag to reorder]                    |
| Backend depth         [====25%====]   [edit anchors]   [remove]      |
| Scale signals         [===15%===]                                    |
| Domain fit            [===15%===]                                    |
| Tenure stability      [=5%=]                                         |
| Communication         [==10%==]                                      |
| Tech leadership       [===15%===]                                    |
| Values                [=5%=]                                         |
| AU work rights        [HARD GATE]                                    |
+----------------------------------------------------------------------+
| Min score to advance: [3.4]                                          |
| Blind fields: [x] name [x] photo [x] address [x] DOB [x] grad year   |
| [  Save and re-rank pipeline (147 candidates, ~12s)  ]               |
+----------------------------------------------------------------------+
```

---

## 10. Build vs buy

| Component | Build | Buy | Recommendation |
|---|---|---|---|
| PDF/DOCX parsing | python-docx, PyMuPDF | Affinda, Sovren, Textract | **Buy Textract for OCR**, build native parsing |
| LLM scoring | n/a | Anthropic, OpenAI | **Buy** (Claude Haiku + Sonnet) |
| Vector search | pgvector | Pinecone, Weaviate | **Build on pgvector** until > 5M vectors |
| ATS integrations | n/a | Merge.dev, Finch | **Buy Merge.dev** for unified ATS API (saves 6 months) |
| Video transcription | Whisper self-host | AssemblyAI, Deepgram | **Buy Deepgram** for live latency |
| Bias auditing | Custom dashboards | Holistic AI, Parity | **Build** - this is the IP |
| Rubric engine | Custom | None credible | **Build** - this is the IP |
| Scheduling | Custom | Cal.com, Chili Piper | **Buy Cal.com** embedded |

The IP HQ.ai should own outright: rubric engine, evidence extraction, fairness controls, next-action generation, scorecard UX. Everything else is bought to compress time-to-market.

---

## 11. Demo-day risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM hallucinates evidence span | Med | High | Constrain output to verbatim spans with character offsets; reject if span not found in source |
| Bulk upload OOM at 200 CVs | Med | Med | Stream-process; cap concurrency at 10 workers; show progress bar |
| Live re-rank takes > 15s | High | High | Pre-compute criterion sub-scores; only re-weight on slider change |
| Counterfactual flips score in demo | Low | Very high | Pre-test demo cohort; ship deterministic seeding |
| ATS webhook fails on stage | Med | Med | Have a local CSV fallback path |
| Bias dashboard shows red on demo data | Med | High | Curate demo dataset to be balanced; document the methodology on slide |
| Privacy question from audience | High | Med | Have one-page AU compliance brief ready; rehearse answer |
| Comparison to Eightfold | High | Med | Lead with rubric editability and AU compliance, not breadth |
| Video integration not ready | High | Med | Demo Pattern C only; frame B and C as v2/v3 |
| Pricing question | Very high | Med | AUD 8 per processed CV or AUD 990/seat/mo, whichever lower; defensible vs Workable AUD 299/mo flat |

---

## What HQ.ai should ship in v1

### Feature list

1. CV intake (drag-drop, email, ATS webhook via Merge.dev)
2. Parsing pipeline (PDF, DOCX, OCR fallback)
3. Canonical Candidate JSON
4. Rubric library (12 templates) and editor
5. Blinded scoring with evidence spans
6. Pipeline view with bands
7. Candidate scorecard with evidence highlighting
8. Next-action recommendation + phone-screen question generator
9. Counterfactual name probe
10. Disparate-impact dashboard (four-fifths rule)
11. Decision log with 7-year retention
12. AU data residency (ap-southeast-2)
13. Privacy notice template + DPA
14. Post-interview transcript ingestion (video Pattern C)
15. CSV export and Greenhouse/Ashby/Workable push-back

### Acceptance criteria

- A recruiter can upload 100 CVs and get a ranked, scored pipeline in under 4 minutes at p95.
- A hiring manager can edit a rubric and see the pipeline re-rank in under 15 seconds for 200 candidates.
- Every score has at least one evidence span pointing to a verbatim CV substring.
- No candidate can be auto-rejected; reject requires a human click that is logged.
- Blind mode masks 8 specified fields and a counterfactual name swap produces overall-score delta < 0.3 on 95% of test cohort.
- Disparate-impact dashboard refreshes daily and flags any role where four-fifths rule is breached.
- All data for AU customers stays in ap-southeast-2; export of a candidate decision dossier completes in under 10 seconds.
- Phone-screen question generator produces 5 questions that map to at least 2 distinct rubric criteria, validated by rubric-criterion-id tags.
- Greenhouse, Ashby and Workable can each receive a candidate status update via Merge.dev within 5 seconds of a recruiter action.
- Privacy notice and DPA are downloadable PDFs from the admin console.
- 99.5% uptime SLO, p95 scoring latency under 30s per CV, error budget tracked.

### What v1 deliberately excludes

- Facial-expression analysis (banned under EU AI Act, reputationally toxic)
- Auto-reject without human click
- Sourcing / outbound (different product, defer to v2)
- Live interview copilot (v2)
- Async one-way video (v3, commodity)
- Custom on-prem deployments (defer until first enterprise pull)

### Pricing recommendation

Two SKUs:
- Team: AUD 990/seat/month, includes 500 CVs/seat/month, then AUD 6/CV.
- Growth: AUD 2,490/month flat for up to 5 seats and 5,000 CVs, ATS integrations included.
- Enterprise: custom, starts AUD 60K ACV, includes DPA, AU residency, SSO, audit logs export, dedicated CSM.

This undercuts Eightfold and HireVue by 4-6x and beats Workable's AI add-on on capability while sitting above pure GPT-wrapper pricing.

---

## Sources

1. https://business.linkedin.com/talent-solutions/global-talent-trends - LinkedIn Future of Recruiting 2024
2. https://www.grandviewresearch.com/industry-analysis/ai-recruitment-market-report - AI Recruitment Market 2024-2030
3. https://www.shrm.org/topics-tools/research/2024-talent-trends - SHRM Talent Trends 2024
4. https://www.seek.com.au/about/news/seek-employment-trends - Seek Hiring Insights 2024
5. https://www.eightfold.ai/resources/talent-intelligence/ - Eightfold platform overview
6. https://www.hirevue.com/platform/assessments - HireVue assessments product
7. https://www.paradox.ai/olivia - Paradox Olivia
8. https://www.metaview.ai/product - Metaview interview intelligence
9. https://www.nist.gov/itl/ai-risk-management-framework - NIST AI Risk Management Framework 2023
10. https://artificialintelligenceact.eu/ - EU AI Act consolidated text
11. https://humanrights.gov.au/our-work/technology-and-human-rights - AHRC Human Rights and Technology
12. https://www.oaic.gov.au/privacy/privacy-legislation/privacy-act-review - OAIC Privacy Act Review tracker
13. https://www.legislation.gov.au/C2004A03712/latest/text - Privacy Act 1988 (Cth)
14. https://www.fairwork.gov.au/about-us/policies-and-guides/fact-sheets/employee-record-keeping - Fair Work record keeping s535
15. https://www.eeoc.gov/newsroom/itutorgroup-pay-365000-settle-eeoc-discriminatory-hiring-suit - iTutorGroup EEOC settlement 2023
16. https://www.reuters.com/article/idUSKCN1MK08G - Amazon scrapped sexist AI recruiting tool 2018
17. https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=4015 - Illinois Artificial Intelligence Video Interview Act
18. https://aws.amazon.com/textract/ - AWS Textract for OCR
19. https://deepgram.com/product/speech-to-text - Deepgram speech-to-text
20. https://www.merge.dev/categories/ats-integration - Merge.dev unified ATS API
21. https://github.com/pgvector/pgvector - pgvector for Postgres
22. https://www.holisticai.com/library - Holistic AI bias audit library
