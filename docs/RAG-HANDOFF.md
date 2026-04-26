# RAG Quality Handoff — HQ.ai Eval Smoke Test (2026-04-25)

Status: pipeline verified working end-to-end, but **0/3 NES smoke questions pass**. Root cause is RAG quality, not plumbing. This doc is a complete handoff for the next engineer.

---

## What's working ✅

- Supabase `knowledge_chunks` table populated with **~3,800 chunks**:
  - 41 Modern Awards (~2,600 chunks)
  - 32 FWO/NES/ATO summary pages (196 chunks)
  - Fair Work Act 2009 — 3 docx volumes (737 chunks)
- Auth bypass for the eval runner via `EVAL_BYPASS_TOKEN` (Vercel Preview env + `.env.local`).
- Eval harness: `npm run eval` self-loads `.env.local`, hits the chat API, runs three judges (numeric / narrative / citation), writes `eval-report.json` + `eval-report.md`.
- LLM judge using `claude-haiku-4-5-20251001`.
- Chat route handles streaming SSE, surfaces `error` chunks as runner errors (not silent empty answers).
- Forced `search_knowledge` on first tool-use iteration so Sonnet can't sidestep grounding.
- `tool_choice: 'none'` on the final streaming iteration so the model commits to text.

## What's broken ❌

### Bug 1 — Chunker dilutes legislative sections
The chunker (`scripts/ingest/chunk.ts`) packs ~800-token windows. Fair Work Act sections frequently span fewer tokens, so multiple sections share a chunk and the vector embedding becomes a smeared average.

**Concrete example:** s 87(1)(a) "(a) 4 weeks of paid annual leave" lives in a chunk that opens with pre-adoption leave clauses. A query "annual leave entitlement under NES" returns cosine similarity ~0.4 to that chunk. Even with `minSimilarity` lowered to 0.25, the chunk often loses to noisier matches because the start of its content (about pre-adoption leave) dominates the embedding.

**Verified via:** `select content from knowledge_chunks where source='fair-work-act' and content ilike '%4 weeks of paid%'` — exactly one chunk, mostly off-topic.

### Bug 2 — Function latency hits 300s ceiling
Every question in the latest smoke run took 300.7s — Vercel `maxDuration` is the ceiling. Tracing:
- Iter 0 (forced search): Anthropic non-stream call ~30s, RPC ~5s.
- Iter 1 (auto): Anthropic call with ~12 large chunks (~38K chars) in context ~60-90s.
- Iter 2 (final stream): another 30-90s to write 1KB of text.

That's 125-215s in the happy path. Hitting 300s suggests the model sometimes calls another tool in iter 1, blowing past the limit. With `MAX_TOOL_ITERATIONS=3` this shouldn't recurse but the per-call latency has clearly degraded with the larger context.

### Bug 3 — Sonnet 4 over-refuses on weak grounding
When `search_knowledge` returns weak hits, the model says *"I can't verify the specific X from the grounded sources"* instead of trying again or giving a hedged answer keyed to the closest hit. The current prompt at `lib/prompts.ts` line 282-283 explicitly instructs this fallback — which is the right behaviour for hallucination prevention but the wrong behaviour when the chunks are diluted (Bug 1).

---

## Remediation plan

Roughly half a day of focused engineering. Order matters.

### Step 1 — Section-aware chunker for the FWA (~2 hours)
Replace `chunkText` for Act content (or add a sibling `chunkAct`). Rules:
- Split on lines matching `/^\s*\d+[A-Z]?\s+[A-Z][^\n]+$/` (section headers like `87 Entitlement to annual leave`).
- One chunk per section. If a section exceeds ~1,500 tokens, split on subsection markers `/^\s*\(\d+\)/` with the section heading repeated at the top of every continuation chunk.
- Drop chunks that are pure ToC (heuristic: more than 60% of lines match `/\d+\s*$/`).
- Set `section` field on every chunk to the parent section number + heading.

Verify by re-extracting Vol 1 with mammoth and confirming s 87 produces a chunk that opens with `87 Entitlement to annual leave\n\nAmount of leave\n(1) For each year of service…`.

### Step 2 — Hybrid retrieval (~1 hour)
The `match_knowledge` RPC already accepts `query_text`. Confirm it does BM25 + vector hybrid scoring; if not, modify the SQL to:
```sql
-- Pseudocode
score = 0.5 * cosine_similarity + 0.5 * ts_rank_cd(content_tsv, plainto_tsquery(query_text))
```
This means an exact "annual leave" keyword guarantees the right chunk surfaces even when the embedding is mediocre.

Drop `topK` back to 6 once Step 1 fixes the chunk sizing.

### Step 3 — Re-ingest the FWA (~30 min)
```bash
# Wipe FWA rows, re-run ingest with new chunker
psql "$DB_URL" -c "delete from knowledge_chunks where source='fair-work-act'"
npm run ingest:act
```
Cost: ~$0.05 in OpenAI embeddings. Expect ~1,500-2,000 sharper chunks instead of 737 fat ones.

### Step 4 — Roll back two emergency fixes (~10 min)
After Step 1-3, tune back:
- `lib/rag.ts`: `minSimilarity` 0.25 → 0.5, `topK` 12 → 6.
- `app/api/chat/route.ts`: `maxDuration` 300 → 90 (will hold once chunks are smaller).
- Optional: revisit forcing `search_knowledge` on iter 0. With cleaner retrieval the prompt mandate may be enough; forcing wastes tokens on small-talk turns.

### Step 5 — Re-run smoke test (~5 min)
```bash
HQAI_EVAL_BASE_URL=https://hqai-git-eval-smoke-humanistiqs-hq-ai.vercel.app \
  npm run eval -- --include-unreviewed --limit 3
```
Target: 3/3 pass on the NES questions, latency under 60s each.

### Step 6 — Engage lawyer for golden-set review
Once smoke passes, send `tests/eval/golden-set.seed.ts` to the employment lawyer per the brief in DEPLOY.md / earlier handoff. They set `reviewedBy` + `reviewedAt` on each entry. Then run the full 10-question eval (drop `--include-unreviewed`) for an actual baseline accuracy number.

---

## State of the eval-smoke branch

Live preview: https://hqai-git-eval-smoke-humanistiqs-hq-ai.vercel.app
Branch: `eval-smoke` (do NOT merge to main without reverting the items below)

Commits introduced for the smoke test:
- `feat: add EVAL_BYPASS_TOKEN auth bypass for eval harness` — keep, useful.
- `debug: surface error detail in chat stream catch (eval-smoke only)` — **revert before main**, leaks stack traces.
- `fix(eval): correct haiku model id, bump chat maxDuration to 90, MAX_TOOL_ITERATIONS 5→3` — keep model id; reconsider the rest after RAG fix.
- `fix(chat): force search_knowledge on first tool iteration` — reconsider after RAG fix.
- `fix(chat): bump maxDuration 90→300` — **revert**, will be unnecessary after Step 1.
- `fix(rag): loosen retrieval threshold + force-stop tools on final stream` — split: keep `tool_choice: 'none'`, revert threshold/topK loosening after Step 1.

Uncommitted local changes worth keeping (not pushed):
- `scripts/ingest/ingest-awards.ts`, `ingest-fwo.ts`: rate-limit retry + 16-batch pacing. Stable.
- `scripts/ingest/ingest-act.ts`: new file, mammoth-based docx ingester. Stable.
- `tests/eval/run-eval.ts`: env-loader override + SSE error throw. Stable.
- `tests/eval/judges/llm-judge.ts`: model id fix. Stable.
- `package.json`: `mammoth` dep, `ingest:act` script. Stable.
- `data/act/`: 3 docx volumes. Keep, but consider gitignoring (.docx of legislation is fine, just heavy).

---

## Repro commands cheat-sheet

```bash
# Confirm env vars are loading (the runner now self-loads .env.local)
cd hqai
node tests/eval/run-eval.ts --help 2>/dev/null  # smoke that imports work

# Hit the chat directly
TOKEN=$(node -e "const t=require('fs').readFileSync('.env.local','utf8');process.stdout.write(t.match(/EVAL_BYPASS_TOKEN=(.+)/)[1])")
curl -X POST https://hqai-git-eval-smoke-humanistiqs-hq-ai.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Eval-Token: $TOKEN" \
  -d '{"module":"people","messages":[{"role":"user","content":"What does the NES say about annual leave?"}]}' \
  --max-time 320

# Inspect what's in the corpus
node -e "
const t=require('fs').readFileSync('.env.local','utf8');
const url=t.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1];
const key=t.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1];
fetch(url+'/rest/v1/knowledge_chunks?select=source,count',{headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact'}}).then(r=>r.json()).then(console.log);
"

# Run smoke eval (3 questions)
HQAI_EVAL_BASE_URL=https://hqai-git-eval-smoke-humanistiqs-hq-ai.vercel.app \
  npm run eval -- --include-unreviewed --limit 3
```

## Ownership

Pipeline + eval harness: stable, no further work needed.
RAG quality (chunker + retrieval): owner needs to do Steps 1-5 above.
Golden-set review: blocked on lawyer engagement.
