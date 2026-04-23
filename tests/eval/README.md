# HQ.ai Evaluation Harness

Quarterly-publishable accuracy benchmark for HQ.ai's AU HR/employment-law advisor. Our competitive differentiator — no other AU HR vendor publishes accuracy numbers.

## Target

300 lawyer-reviewed golden questions:

| Category | Count |
|----------|------:|
| NES (National Employment Standards) | 100 |
| Modern Awards | 100 |
| Termination / Redundancy | 50 |
| Edge (awards interactions, casuals, juniors, etc.) | 50 |

## Three judges

1. **numeric-judge** — exact-match on pay rates, hours, dates (tolerance configurable).
2. **llm-judge** — Claude Haiku scores narrative answers against a rubric (`mustInclude` / `mustNotInclude`). Cached by hash.
3. **citation-judge** — verifies at least one returned citation label contains the expected reference (e.g. "Clerks Award cl 15.2").

## Running

```bash
# Local dev against http://localhost:3000
npx tsx tests/eval/run-eval.ts --set all --out eval-report.json

# Subset
npx tsx tests/eval/run-eval.ts --set nes --limit 10

# Include seed questions that haven't been lawyer-reviewed yet
npx tsx tests/eval/run-eval.ts --set all --include-unreviewed
```

## Environment

- `ANTHROPIC_API_KEY` — required (LLM judge uses Claude Haiku).
- `OPENAI_API_KEY` — required if the chat route's `searchKnowledge` calls it for embeddings.
- `HQAI_EVAL_BASE_URL` — optional override (default `http://localhost:3000`). Never point this at production.

## Manual steps (owner + lawyer)

- [ ] **Lawyer review of `golden-set.seed.ts`** — 10 starter questions are marked `reviewedBy: undefined`. An AU employment lawyer must review each entry's `question`, `expectedValue`/`expectedRubric`, `source`, and set `reviewedBy` + `reviewedAt` before those entries count in published metrics.
- [ ] **Author the remaining ~290 questions** — same structure as seed.
- [ ] **CI wiring** — run nightly against preview deploys; post the markdown report to Slack/email.
- [ ] **Publish quarterly** — export the summary to a public `/accuracy` marketing page.

## Reporting

Outputs: `eval-report.json` (machine) and `eval-report.md` (human). The markdown includes per-category pass rates, a "top failing questions" list, and a diff against the previous run if `--previous <path>` supplied.
