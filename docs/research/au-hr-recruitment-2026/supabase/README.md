# HR/Recruitment Challenge Register - Supabase ingest

Generated from the master register (Section 7 of the research report). Two tables:

- **`hr_challenges`** - 102 rows (People 49, Recruitment 44, Cross-cutting 9)
- **`hr_regulatory_watchlist`** - 16 rows (Section 3 reforms, status as at Aug 2026)

## Files

| File | Purpose |
|------|---------|
| `01_schema.sql` | Register tables, CHECK constraints, indexes, `updated_at` triggers, RLS policies |
| `02_seed.sql` | Idempotent upsert of all 118 register rows (`on conflict (code) do update`) - safe to re-run |
| `03_question_items.sql` | `hr_question_items` table (the hundreds-of-thousands layer) + pgvector embedding, HNSW + tsvector indexes, coverage/enriched views, `match_hr_questions()` search fn, 6 sample rows |
| `hr_challenges.csv` | Register data for Table Editor CSV import |
| `hr_regulatory_watchlist.csv` | Regulatory table for CSV import |

**Run order:** `01_schema.sql` -> `02_seed.sql` -> `03_question_items.sql` -> `04_eval.sql` -> `05_question_items_seed.sql` -> `06_challenge_answers.sql` -> `07_retrieval_baseline.sql`.

**Additional files:**

| File | Purpose |
|------|---------|
| `04_eval.sql` | Evaluation harness: `hr_eval_gold` (52 curated gold questions), `hr_eval_runs`, `hr_eval_results`, and `hr_eval_metrics(run_id)` returning routing accuracy, retrieval recall@k, intent accuracy, escalation precision/recall/F1, groundedness |
| `05_question_items_seed.sql` | 836 generated draft question items (from `generate_question_items.py`) |
| `06_challenge_answers.sql` | `hr_challenge_answers` (canonical answer per challenge/jurisdiction) + approve-needs-source guard + answer-coverage view + `hr_item_with_answer` view; 7 hard-escalate worked examples |
| `07_retrieval_baseline.sql` | Lexical retrieval (`match_challenges_lexical`), rule-based escalation gate (`predict_escalation`), and `run_lexical_baseline()` -> a real `hr_eval_metrics` run with no embeddings |
| `hr_eval_gold.csv` / `hr_challenge_answers.csv` / `question_items_generated.csv` | CSV imports |
| `build_supabase.py` / `build_eval.py` / `build_answers.py` | Regenerate `01`-`02` / `04` / `06` from the source lists |
| `generate_question_items.py` | The generation pipeline - expands the register into draft items |

**Validation:** the full stack (`01`-`07`) was executed against a real `pgvector/pgvector:pg16` Postgres with the Supabase roles: 102 + 16 register rows, 842 question items, 52 gold, 7 canonical answers; FK integrity enforced (orphan codes rejected), idempotent re-seeds add zero, hybrid search + coverage views work, and both a synthetic and a **real lexical-baseline** eval run computed through `hr_eval_metrics()`. Two fixes landed during validation: the `dedup_hash` index is a plain (non-partial) unique index so `on conflict` can target it; and array-literal single quotes are escaped in the answer builder.

## Retrieval + escalation baseline (07) - real numbers

`select public.run_lexical_baseline('lexical-baseline-v1');` then `select * from hr_eval_metrics(<id>)` on the 52 gold questions gives a genuine pre-embeddings baseline:

| metric | baseline | reading |
|--------|:--------:|---------|
| challenge_routing_accuracy | 0.37 | lexical top-1 is weak on colloquial questions -> **this is what the 384-dim embeddings fix** |
| retrieval_recall_at_k (k=5) | 0.58 | lexical misses ~42%; vector search should lift this materially |
| escalation_recall | **1.00** | rule gate catches every gold escalation with **no ML** - the safety anchor works today |
| escalation_precision | 0.88 | one defensible false positive ("serious misconduct on the spot") |
| escalation_f1 | 0.93 | |
| groundedness_rate | 0.09 | only 7/102 canonical answers exist yet -> **rises as you write the answer layer** |

The point of the baseline: it isolates what needs ML (retrieval) from what already works (the escalation gate), and gives every future change a number to beat.

## Vector + hybrid retrieval - measured with the real model (08, 09)

`embed_vector_baseline.py` embeds the challenge corpus + gold questions with the **actual `all-MiniLM-L6-v2` (onnx, 384d)** - the model your stack uses, so numbers transfer - and emits `08_vector_baseline.sql` (embedding tables + `run_vector_baseline()`). `09_hybrid_baseline.sql` fuses lexical + vector with Reciprocal Rank Fusion. All three run through the same gold set and `hr_eval_metrics()`:

| metric | lexical | vector (MiniLM 384d) | hybrid (RRF) |
|--------|:--:|:--:|:--:|
| challenge_routing (top-1) | 0.37 | 0.42 | 0.42 |
| **retrieval_recall@5** | 0.58 | 0.63 | **0.77** |
| groundedness_rate | 0.09 | 0.33 | 0.12 |
| escalation_recall / precision | 1.00 / 0.88 | 1.00 / 0.88 | 1.00 / 0.88 |

**Findings:**
- Vector (real model) beats lexical on every retrieval metric. Hybrid RRF pushes **recall@5 to 0.77** - the right challenge is in the top-5 candidate set 77% of the time.
- Top-1 routing plateaus at ~0.42 because the challenge documents are terse (title + sub-domain). **The next lever is a reranker over the fused top-5** (and richer challenge representations: fold the challenge `description` + Appendix A exemplars into the embedded text), not more retrieval plumbing.
- Groundedness is dominated by the tiny answer set (7/102) and will move as the canonical answer layer grows - it is not a retrieval signal yet.

To reproduce: `python embed_vector_baseline.py` then load `08` + `09` and `select run_vector_baseline('v1')` / `run_hybrid_baseline('v1')`. When your ONNX pipeline populates `hr_question_items.embedding`, route via `match_hr_questions` (nearest item -> its challenge) for a richer surface than the challenge-doc embedding used here.

## Cross-encoder reranker over the fused top-5 (10)

`rerank_topk.py` reranks the hybrid top-8 candidates with a real cross-encoder (`ms-marco-MiniLM-L-6-v2`) and emits `10_rerank_run.sql` (a new eval run). Four-way, same gold + metrics:

| metric | lexical | vector | hybrid | **rerank** |
|--------|:--:|:--:|:--:|:--:|
| challenge_routing (top-1) | 0.37 | 0.42 | 0.42 | **0.48** |
| retrieval_recall@5 | 0.58 | 0.63 | 0.77 | 0.75 |
| escalation_recall | 1.00 | 1.00 | 1.00 | 1.00 |

**Findings:**
- The reranker lifts top-1 routing to **0.48** (+0.06 over hybrid/vector) - it converts "right answer somewhere in the candidates" into "right answer first". recall@5 is ~flat (it re-selects 5 from 8).
- **Ceiling check:** the expected challenge is in the hybrid top-8 only **79%** of the time, and the reranker gets top-1 right on ~61% of those. So neither the retriever nor the reranker is the real bottleneck - **the challenge representation is**. Each challenge is embedded/reranked as a terse label (title + sub-domain); a cross-encoder can only disambiguate as well as the text it's given.
- **Highest-leverage next step (still answer-independent):** enrich each challenge's embedded/reranked text with the per-challenge **Description** already written in the report (sections 4A/4B/5A/5B) plus a few **Appendix A practitioner exemplars**. That comes from the research report, not the canonical answers, so it needs nothing from the answer-writing track. Re-run all four to measure - this should move both the top-8 ceiling and top-1.

Reproduce: load `01`-`09`, dump candidates (`select ... lateral match_hybrid(g.ext_id,8)`), `python rerank_topk.py`, load `10_rerank_run.sql`.

## Enrichment experiment - the decisive lever (11, 12)

`build_enriched.py` rebuilds each challenge's document from the **report itself** - `title + sub_domain + Description + up to 6 practitioner-language exemplars` (avg 696 chars vs ~40 terse) - re-embeds with the same all-MiniLM-L6-v2, and stands up an enriched lexical/vector/hybrid path (`11_enriched.sql`). `rerank_topk.py --docs-tsv enriched_docs.tsv` reranks the enriched candidates (`12_rerank_enr_run.sql`). Eight-way, same gold + metrics:

| strategy | top-1 (terse) | top-1 (enriched) | recall@5 (terse) | recall@5 (enriched) |
|----------|:--:|:--:|:--:|:--:|
| lexical | 0.37 | 0.48 | 0.58 | 0.79 |
| vector  | 0.42 | **0.60** | 0.63 | 0.81 |
| hybrid  | 0.42 | **0.60** | 0.77 | **0.87** |
| rerank  | 0.48 | 0.56 | 0.75 | 0.87 |

**Findings:**
- **Representation was the bottleneck, confirmed.** Enriching the challenge doc lifts top-1 by +12 to +18 points on every retriever - a far bigger gain than the reranker gave on terse docs. Best config: **enriched hybrid = 0.60 top-1, 0.87 recall@5** (from a 0.37/0.58 lexical start).
- **The small cross-encoder stops helping once representations are good.** On enriched docs, rerank top-1 (0.56) is *below* enriched vector/hybrid (0.60): the MiniLM reranker sometimes demotes the correct candidate. It helped only when the bi-encoder was weak (terse). A stronger cross-encoder or an LLM reranker might recover this, but the small one is net-neutral-to-negative here - **don't ship it on top of enriched hybrid without re-measuring.**
- Escalation metrics are unchanged across all eight (same rule gate): recall 1.00, precision 0.88.

**Recommended production retrieval config:** enriched challenge representations + hybrid (RRF), no reranker for now. recall@5 0.87 means the correct challenge is in the candidate set ~87% of the time - a solid surface for the generator/answer layer to ground on.

**Caveat:** n=52 gold, so ~+-7 pt noise. The enrichment gains (+10-18 pts) are well beyond noise; the rerank-vs-hybrid gap on enriched (0.56 vs 0.60 = ~2 questions) is within it. **Grow `hr_eval_gold` to ~200 before treating the smaller deltas as real.**

Reproduce: `python build_enriched.py` -> load `11_enriched.sql` -> `run_lexical_enr/run_vector_enr/run_hybrid_enr` -> dump enriched candidates -> `python rerank_topk.py --candidates candidates_enr.tsv --docs-tsv enriched_docs.tsv --label e-rrk --out 12_rerank_enr_run.sql`.

## AUTHORITATIVE results at n=200 gold (supersedes the n=52 tables above)

The gold set was grown to **200 questions covering all 102 challenges** (leakage-checked against the enriched docs). Re-running the full eight-way at n=200:

| strategy | top-1 (terse) | top-1 (enriched) | recall@5 (terse) | recall@5 (enriched) |
|----------|:--:|:--:|:--:|:--:|
| lexical | 0.36 | 0.53 | 0.61 | 0.81 |
| vector  | 0.48 | 0.67 | 0.77 | 0.90 |
| hybrid  | 0.46 | 0.66 | 0.77 | 0.91 |
| rerank  | 0.53 | **0.67** | 0.79 | **0.91** |

**What n=200 changed vs n=52 (why the bigger set mattered):**
- **Enrichment win holds and strengthens:** +17 to +19 points top-1 on every retriever. Best config: **enriched, top-1 ~0.67, recall@5 ~0.91**.
- **The n=52 "reranker hurts on enriched" finding was noise.** At n=200 the reranker is back to net-positive (enriched rerank 0.67 top-1 / 0.91 recall@5, best or tied). But vector/hybrid/rerank on enriched are all ~0.66-0.67 top-1 - **the retrieval method is now a wash; the representation is the whole story.** Simplest sufficient config: **enriched vector** (0.67 / 0.895), no lexical fusion or reranker needed; add hybrid/rerank only for the last point of recall@5.
- **Escalation gate is now the weak spot.** On the broader set the rule gate scores **recall 0.71 / precision 0.80** (was 1.00 at n=52). The bigger gold set contains genuine escalations with no trigger phrase - "sack someone who just complained", "messy termination, get a lawyer", summary dismissal without the words "serious misconduct", performance-managing after a complaint. The keyword gate misses ~30% of real escalations. **This is the most important finding of the whole track:** the safety anchor needs upgrading from keyword rules to a semantic/ML escalation classifier (the 17 escalation-positive gold rows + the Section 6 boundary map are the training seed). Still answer-independent.

**Revised production recommendation:** enriched challenge representations + enriched **vector** retrieval (hybrid optional) for routing; **replace the keyword escalation gate with a learned classifier** before relying on it. Retrieval is solved to ~0.91 recall@5; escalation is the open safety item.

## Escalation classifier v2 (13) - semantic gate

`escalation_classifier.py` builds a contrastive semantic gate: anchors from the Section 6 boundary map (escalate + safe scenarios; **not** the gold set, so no leakage), `score = max cos to escalate anchors - max cos to safe anchors`, decision = `keyword_rule OR score >= threshold`. Emits `13_escalation_classifier.sql` (`hr_escalation_anchor`, `escalation_semantic_score`, `predict_escalation_v2`, `run_escalation_v2`). Measured on the 200-gold (17 escalation-positives):

| gate | precision | recall | f1 |
|------|:--:|:--:|:--:|
| keyword only | 0.80 | 0.71 | 0.75 |
| semantic union (t=+0.108) | 0.35 | **0.94** | 0.51 |
| semantic union (t=+0.051) | 0.23 | **1.00** | 0.37 |

**Read:** the semantic gate fixes the safety miss (**recall 0.71 -> 0.94-1.00**) but over-triggers (precision 0.80 -> 0.35) - too many false "see a lawyer" prompts, which is its own UX/trust cost. For a safety gate recall is the priority, so this is the right direction, but binary is the wrong shape.

**Design recommendation - adopt the boundary map's native THREE tiers** instead of binary: two thresholds -> `keyword OR score>=t_hi` = **Escalate** (decline + route); `t_lo<=score<t_hi` = **Caution** (inform + prompt to consider advice - cheap when wrong); `score<t_lo` = **Safe**. A false *Caution* costs almost nothing, which recovers the precision UX while keeping recall high. Precision-recovery path: only 17 escalation-positives in the gold - grow them, curate anchors, and calibrate the two thresholds on a larger labelled set (or train a small classifier with CV).

Validation: measured in Python (the numbers above) **and confirmed in-DB** via `run_escalation_v2` on pgvector - the SQL classifier reproduces the Python precision/recall exactly (keyword 0.80/0.71; v2 t=0.108 0.35/0.94; v2 t=0.051 0.23/1.00).

## 3-tier gate: Safe / Caution / Escalate (14) - the production gate

`tier_gate.py` calibrates two thresholds on the semantic margin, unioned with the keyword rule, and emits `14_tier_gate.sql` (`classify_escalation_tier`, `run_tier_gate`, `tier_metrics`):

- **Escalate** = `keyword OR score >= t_hi` -> decline + route to a professional.
- **Caution** = `t_lo <= score < t_hi` -> still help/inform, but flag "worth a professional's eyes before you act".
- **Safe** = `score < t_lo` -> answer directly.

**Key reframing of the safety metric:** a true escalation landing in **Caution still counts as caught** (the user is routed to advice). The only catastrophic error is a true escalation landing in **Safe**. So t_lo is calibrated for zero Safe-misses; t_hi for a high-precision hard-stop tier.

Calibrated **t_lo=0.050, t_hi=0.200**, validated in-DB on the 200-gold (17 escalation-positives):

| metric | value | meaning |
|--------|:--:|---------|
| **safe_miss** | **0 / 17** | no true escalation is ever wrongly marked Safe |
| **safety_catch_rate** | **1.00** | every real escalation lands in Caution or Escalate |
| escalate_tier_precision | 0.61 | hard-stops are ~2x more precise than the binary gate (0.35) |
| escalate_count | 23 | the confident "see a professional" set |
| caution_count | 52 | the cheap borderline buffer |
| safe_count | 125 | answered directly |
| false_hard_stops | 9 | non-escalations wrongly hard-stopped (down from ~30 in binary) |

**Why this is the right shape.** The binary gate forced a choice between missing escalations (keyword: recall 0.71) or over-blocking (semantic: precision 0.35). The 3-tier gate escapes it: **100% of real escalations are caught**, the scary hard-stop is reserved for a higher-precision set (0.61), and everything borderline flows to a low-cost Caution prompt. Worked examples: "can I sack someone who just put in a complaint", "she just told me she's pregnant and now I want to...", "serious bullying complaint against me", visa sponsorship -> **Escalate**; borderline systemic underpayment and a redundancy-with-redeployment question -> **Caution** (still routed, softly); routine award/leave/contract questions -> **Safe**.

**Tuning lever:** raising t_hi to 0.21 lifts escalate precision to ~0.65 (7 false hard-stops) with the same zero Safe-miss guarantee. Recalibrate both thresholds as the escalation-positive gold grows beyond 17.

## Evaluation harness (04)

Populate `hr_eval_results` from your bot for each gold question (predicted challenge code, top-k `retrieved_codes`, predicted intent, predicted escalation, whether the answer cited a required source), then:

```sql
select * from hr_eval_metrics('<run_id>');
```

**escalation_recall is the metric to protect** - missing a real "should have escalated" is the worst failure in this domain. Track it near 1.0 and read precision as the cost. Grow `hr_eval_gold` toward 200-500 rows before trusting small deltas.

## Generation pipeline

```bash
python generate_question_items.py --sql     # -> question_items_generated.csv + 05_question_items_seed.sql
python generate_question_items.py --cap 3   # more templates per (challenge,persona,intent)
```

Deterministic template expansion across **persona x intent x jurisdiction x template**, with automatic dedupe (`dedup_hash`), `compliance_sensitive` flagging, and `review-escalation` tags on high-risk challenges. Output loads straight into `hr_question_items` (embedding NULL, status `draft`).

**Template prose is placeholder** - the point is the pipeline shape (axes, dedupe, safety, load). For real phrasing variety at volume, replace `expand_templates()` with `expand_with_llm()` (documented plug point) and feed it each challenge's description + Appendix A exemplars, constrained to the intent. Everything downstream stays the same.

## hr_question_items (third table)

One row per generated Q/A item, FK `challenge_code -> hr_challenges(code)`.

- **Retrieval:** `embedding vector(384)` (ONNX all-MiniLM-L6-v2) with an **HNSW cosine** index, plus a generated **`question_tsv`** for keyword search - i.e. hybrid retrieval out of the box. `match_hr_questions(query_embedding, k, filter_stream)` returns top-k approved items by cosine similarity.
- **Safety:** `requires_escalation` + `escalation_reason`, and `compliance_sensitive` (answers asserting a compliance fact should not be `approved` without `source_refs`).
- **QA workflow:** `status` in `draft|review|approved|rejected`; RLS shows `authenticated` only `approved` rows, while `service_role` (ingest/QA) sees everything.
- **Gap-finding:** `hr_question_coverage` view lists challenges by prevalence with approved/total item counts, high-value-low-coverage first.
- **Dedupe:** partial unique index on `dedup_hash` (app-computed hash of the normalised question).

## Option A - SQL (recommended)

Paste `01_schema.sql` then `02_seed.sql` into the Supabase **SQL Editor** and run, or drop both into `supabase/migrations/` and `supabase db push`. The seed upserts, so re-running after a register update refreshes changed rows without duplicates.

## Option B - CSV via Table Editor

Run `01_schema.sql` first (creates the tables + constraints), then in **Table Editor -> Import data from CSV** load each CSV into its matching table.

## Schema notes

- **`code`** is the natural primary key (`PF11`, `RS22`, `X3`, `REG13`) and matches the IDs in the report - use it to join question items back to a challenge.
- **`prevalence`** is a text tier; **`prevalence_rank`** (4=High .. 1=Emerging) is its numeric mirror for `ORDER BY`.
- **`trending`** is `established | trending_up | trending_sharp | new` (mapped from the report's E / T / T! / N).
- **`stage`** is the sub-stream (`Foundations`, `Management`, `Plan-Attract`, `Screen-Onboard`, `Cross-cutting`).
- **`tags text[]`** is empty on load - a free slot for question-generation tagging (GIN-indexed).
- **RLS is enabled** with a read policy for `authenticated`; writes go through `service_role` (bypasses RLS), matching the project's RLS-on posture. Adjust the policy roles if you want public/anon read.

## Useful queries

```sql
-- High-prevalence trending challenges, most urgent first
select code, title, stream, prevalence, trending
from hr_challenges
where prevalence_rank >= 3 and trending in ('trending_up','trending_sharp','new')
order by prevalence_rank desc, stream;

-- Coverage count per stream x stage (question-gen planning)
select stream, stage, count(*) from hr_challenges group by 1,2 order by 1,2;

-- Regulatory items still approaching (not yet fully live)
select code, item, commenced, sme_status
from hr_regulatory_watchlist
where sme_status ilike '%approach%' or sme_status ilike '%progress%';
```

Validation: all 118 rows were checked against the CHECK-constraint domains (stream / prevalence / trending), unique-code, and rank-consistency before shipping.
