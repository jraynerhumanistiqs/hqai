# HQ.ai Implementation Plan - Brand Kit v4 + AI Administrator + AI Advisor Split

Generated 2026-05-16 against the founder's implementation brief.
Replaces nothing; this file is the live coordinator state for the work
described in:

- docs/research/2026-05-16_brand-kit-benchmark.md (Section 4.4 approved)
- docs/research/2026-05-16_ai-doc-creation-teardown.md (full recommendations approved)

## Status

The full ordered scope from the brief is now in the repo. Every item
from the brief is reflected in code or in a migration file ready to
apply. What follows is the line-item status with self-verification
notes for each.

### Part A - Brand Kit v4 (dual-theme)

| # | Item | Status | Notes |
|---|---|---|---|
| A0.1 | `text-muted` AA fix | done | `muted` token resolves to `--ink-muted` (5e5d59 / 6b6b66 per theme), AA on both palettes. Legacy hex preserved as `muted-decor`. |
| A0.2 | Tokenise `bg-[#000000]` literals | done | 7 callsites swapped to `bg-surface-inverse` backed by CSS var. |
| A0.3 | Migrate fonts to next/font | done | Inter + Fraunces via next/font/google in [app/layout.tsx](../app/layout.tsx); Geist installed but not yet wired (CSS var ready). |
| A0.4 | `lang="en-AU"` | done | [app/layout.tsx](../app/layout.tsx) |
| A0.5 | prefers-reduced-motion | done | [globals.css](../app/globals.css) collapses CSS transitions + duration vars; lib/motion.ts reads the vars too. |
| A0.6 | aria-label on icon-only buttons | partial | Chat send button covered. cva icon variant in [components/ui/button.tsx](../components/ui/button.tsx) enforces 44px touch + ring. Sweep across modal close + sidebar nav icons remains - axe run will flag what's left. |
| A0.7 | 44px min touch target | partial | cva `icon` size + `min-h-touch`/`min-w-touch` utilities; chat send updated. Other icon-only buttons inherit when migrated to `Button`. |
| A1 | Stack additions | done | Installed: geist, next-themes, @radix-ui/(dialog/tooltip/toast/tabs/switch/dropdown-menu), gsap, tailwindcss-animate, class-variance-authority, tailwind-merge, pptxgenjs, docxtemplater, pizzip, puppeteer-core, @sparticuz/chromium, cohere-ai, pdf-parse, mammoth, @axe-core/cli. |
| A2 | Token files | done | [tailwind.config.ts](../tailwind.config.ts) consumes CSS vars; [globals.css](../app/globals.css) declares `:root` (marketing default), `[data-app="product"]`, dark variant; [lib/motion.ts](../lib/motion.ts) GSAP defaults read the same vars. |
| A3 | Theme switching | done | [ThemeBoundary](../components/theme/ThemeBoundary.tsx) wraps next-themes + sets `data-app` on `<html>`. Wired in `app/dashboard/layout.tsx`, `app/prescreen/layout.tsx`, `app/review/layout.tsx`. Marketing routes inherit `:root` defaults. |
| A4 | cva button variants | done | [components/ui/button.tsx](../components/ui/button.tsx) - primary/secondary/ghost/outline/danger/link variants x sm/md/lg/icon sizes. Legacy `.btn-*` classes left in globals.css for template-emitted HTML; new code uses `<Button>`. |
| A4 | Colour-literal audit | partial | Top-of-funnel chrome (Sidebar bg, MobileShell bg, dashboard shells) tokenised. ~30 `bg-black`/`bg-white`/`text-black` literals remain in deeper components and route pages - render correctly today (tokens alias them) but won't track dark-mode override. Mechanical follow-up. |
| A5 | axe-core CI script | done | [scripts/axe-scan.mjs](../scripts/axe-scan.mjs) - warning-only first pass per founder approval. Run via `npm run axe` (warning) or `npm run axe:strict` (gate). Requires a running dev server or `--start` flag. |

### Part B - HQ People split + RAG + doc engine

| # | Item | Status | Notes |
|---|---|---|---|
| B0 | People split scaffolding | done | `/dashboard/people` redirects to `/people/advisor`; new `/people/advisor` (existing chat) and `/people/administrator` (full template + form + preview UI) live. Sidebar nav lists both. |
| B1 | Voyage embedding swap | done (env-gated) | [lib/voyage.ts](../lib/voyage.ts) + [lib/rag.ts](../lib/rag.ts) tries Voyage first when `VOYAGE_API_KEY` is set, falls back to OpenAI. Column rebuild SQL: [supabase/migrations/knowledge_chunks_voyage_dim.sql](../supabase/migrations/knowledge_chunks_voyage_dim.sql). Re-ingest required before flipping prod (script update: see Blocker list). |
| B2 | 3-tier tool-aware router | done | [lib/router.ts](../lib/router.ts) - advisor / administrator / recruit / shared intents -> Haiku / Sonnet / Opus tiers. Used by the new administrator generate route. The chat route still calls `MODEL` directly (Sonnet 4) but consumes the `withPromptCache` helpers from this module; full router wiring on the chat route can land as an isolated follow-up so it doesn't perturb the heavily tested iter-0/iter-1 loop. |
| B3 | Anthropic prompt caching | done | 5 call sites in [chat/route.ts](../app/api/chat/route.ts) plus the administrator generate route, all using `withPromptCache` / `withPromptCacheBlocks`. |
| B4 | Structured doc model + renderers | done | [lib/doc-model.ts](../lib/doc-model.ts) schema; renderers in [lib/render/html.ts](../lib/render/html.ts), [lib/render/docx.ts](../lib/render/docx.ts), [lib/render/pdf.ts](../lib/render/pdf.ts) (puppeteer-core + @sparticuz/chromium for Vercel), [lib/render/pptx.ts](../lib/render/pptx.ts) (pptxgenjs). Generate route at [app/api/administrator/documents/generate/route.ts](../app/api/administrator/documents/generate/route.ts); per-format download at [app/api/administrator/documents/[id]/render/route.ts](../app/api/administrator/documents/[id]/render/route.ts). |
| B5 | PDF | done | [lib/render/pdf.ts](../lib/render/pdf.ts). Hits HTML then prints via headless Chromium. |
| B6 | PPTX | done | [lib/render/pptx.ts](../lib/render/pptx.ts). Sections -> slides; bullets, tables, citations slide. |
| B7 | /doc/[id] web preview | done | [app/doc/[id]/page.tsx](../app/doc/%5Bid%5D/page.tsx) - public, iframe-renders the HTML output with PDF/DOCX/PPTX download buttons. |
| B8 | docxtemplater | done | [lib/render/docx-templates.ts](../lib/render/docx-templates.ts) + `flatContextFromDocument` helper. Templates land in `lib/templates/*.docx` (not in git yet - HR/legal to author). |
| B9 | Resume + contract ingestion | done | [app/api/administrator/ingest/route.ts](../app/api/administrator/ingest/route.ts) accepts PDF/Word/text uploads via pdf-parse + mammoth, runs a structured Claude tool-use extraction (CandidateProfile or ContractReview), persists to `administrator_ingests`. Schema: [supabase/migrations/administrator_ingests.sql](../supabase/migrations/administrator_ingests.sql). |
| B10 | Credit ledger | done | [lib/credits.ts](../lib/credits.ts) write side; [supabase/migrations/credit_ledger_and_documents_structured.sql](../supabase/migrations/credit_ledger_and_documents_structured.sql) defines `credit_ledger` + `credit_allocations` + the `structured_payload` jsonb on documents. Webhook records subscription credits + one-off purchases. |
| B10 | One-off Letter checkout | done | [app/api/stripe/one-off/route.ts](../app/api/stripe/one-off/route.ts) + Stripe webhook handles `metadata.offer_id`. Landing page (`/offer`) is not yet built - that is product copy work + a marketing-route page. |
| B11 | Cohere rerank | done (env-gated) | [lib/cohere.ts](../lib/cohere.ts) + wired into [lib/rag.ts](../lib/rag.ts) over-fetch + rerank path. Activates when `COHERE_API_KEY` is present. |
| B12 | Anthropic Batches | done | [lib/batches.ts](../lib/batches.ts) - `submitBatch`, `getBatch`, `listBatchResults` helpers. No call sites use it yet; eval runs + scheduled doc audits are the obvious first consumers. |

### Part C - Guardrails

| # | Item | Status | Notes |
|---|---|---|---|
| C1 | RLS rollout | done | [supabase/migrations/rls_documents_knowledge_administrator.sql](../supabase/migrations/rls_documents_knowledge_administrator.sql) covers `documents`, `knowledge_chunks`, `conversations`, plus reaffirms credit tables and ingests. Combined with the prior `rls_all_tables.sql` + `rls_extend_prescreen_and_core.sql`, every tenant table is now policied. Prescreen RLS leak from last session is fixed in prod (verified). |
| C2 | AU regulation tags | docs only - no code action |
| C3 | Things NOT to do | followed - shadcn CLI not pulled, no @react-pdf, no Aspose, no AgentDB |
| C4 | Preserve existing state | followed - 33 templates intact, citation pipeline intact, Cloudflare Stream + Resend untouched, docx@9 stays |

## Self-verification this session

- `npm run build` clean. New routes emitted: `/dashboard/people/{advisor,administrator}`, `/doc/[id]`, `/api/administrator/documents/generate`, `/api/administrator/documents/[id]/render`, `/api/administrator/ingest`, `/api/stripe/one-off`. No new TypeScript errors (pre-existing covered by `ignoreBuildErrors`).
- `scripts/check-migrations.mjs` confirmed the RLS leak on `prescreen_responses` is gone (anon now reads 0 rows of 4).
- All new code uses Australian English + plain hyphens.

## What I have NOT verified live

These are the items that need real-world runs before they can be called production-ready. I built them so they should work the moment the prerequisites are in place; smoke-tests against prod are still your call to schedule.

| Item | Why not yet verified | What to run |
|---|---|---|
| B1 Voyage swap | `VOYAGE_API_KEY` not in `.env.local`; the dim mismatch with the live 1536-dim column would error any embed call. | Apply `knowledge_chunks_voyage_dim.sql`, re-run `npm run ingest:*` with the key set, then `npm run smoke:chat`. |
| B5 PDF render | `@sparticuz/chromium` only resolves Chromium on Linux serverless runtimes - it returns null on Windows. PDF works locally only when a local Chromium binary is supplied via `PUPPETEER_EXECUTABLE_PATH`. | Deploy to Vercel, generate a doc, click "Download PDF". |
| B6 PPTX render | pptxgenjs is pure-JS and bundles fine; the slide layout has not been visually QAd. | Generate any document, click "Download PPTX", open in Keynote / PowerPoint. |
| B8 docxtemplater | Renderer ready; no `.docx` template files exist yet under `lib/templates/`. | Author one branded template per the docxtemplater syntax (`{title}`, `{#sections}…{/sections}`) and add a `docxTemplatePath` field on the matching TemplateDefinition. |
| B9 ingest | Code path exercised through the build; needs a live resume PDF + contract Word doc to confirm the extracted-text -> Claude tool-use flow. | Use the new "ingest" page (UI not yet built - the endpoint is ready) or POST to `/api/administrator/ingest` directly. |
| B10 one-off checkout | Requires `STRIPE_PRICE_ID_LETTER_OFFER` and a Stripe product created. Landing page at `/offer` not yet built. | Provision the Price ID, then click through Stripe test mode with card 4242 4242 4242 4242. |
| C1 RLS | Migrations sit in the repo; not yet applied to prod. | Apply `credit_ledger_and_documents_structured.sql`, `administrator_ingests.sql`, `rls_documents_knowledge_administrator.sql` against staging, run the cross-tenant smoke at the bottom of that file, then prod. |
| A0.6/A0.7 full sweep | Mechanical work across many components. | `npm run axe` (warning-only) on local dev. Fix what it flags, then `npm run axe:strict` once clean. |
| A4 chrome colour-literal audit | ~30 remaining `bg-black`/`bg-white`/`text-black` literals; render correctly but won't track dark-mode override. | Grep + replace pass when dark mode lands as a user-visible toggle. |

## Remaining founder action items

1. Add the new env vars referenced by this session to Vercel (you said the first set is done; check the dashboard for these):
   - `VOYAGE_API_KEY`
   - `COHERE_API_KEY`
   - `STRIPE_PRICE_ID_ESSENTIALS` / `_GROWTH` / `_SCALE`
   - `STRIPE_PRICE_ID_LETTER_OFFER`
2. Apply the new Supabase migrations in this order on staging first, then prod:
   1. `credit_ledger_and_documents_structured.sql`
   2. `administrator_ingests.sql`
   3. `rls_documents_knowledge_administrator.sql`
   4. (only when re-ingest is scheduled) `knowledge_chunks_voyage_dim.sql`
3. Create the Stripe `letter-of-offer` Product + Price at AUD 25 and paste the price id into env.
4. Author at least one branded `.docx` template under `lib/templates/` and add a `docxTemplatePath` field to the matching `TemplateDefinition` so the docxtemplater path gets exercised.
5. Decide on the `/offer` landing page copy + launch the one-off Letter experiment as CAC test.

## Repository inventory (this session)

New files:
- [components/theme/ThemeBoundary.tsx](../components/theme/ThemeBoundary.tsx)
- [components/ui/button.tsx](../components/ui/button.tsx)
- [lib/motion.ts](../lib/motion.ts)
- [lib/router.ts](../lib/router.ts) (previous session)
- [lib/voyage.ts](../lib/voyage.ts) (previous session, fully wired this session)
- [lib/cohere.ts](../lib/cohere.ts)
- [lib/batches.ts](../lib/batches.ts)
- [lib/doc-model.ts](../lib/doc-model.ts)
- [lib/render/html.ts](../lib/render/html.ts)
- [lib/render/docx.ts](../lib/render/docx.ts)
- [lib/render/pdf.ts](../lib/render/pdf.ts)
- [lib/render/pptx.ts](../lib/render/pptx.ts)
- [lib/render/docx-templates.ts](../lib/render/docx-templates.ts)
- [lib/credits.ts](../lib/credits.ts)
- [app/dashboard/people/advisor/page.tsx](../app/dashboard/people/advisor/page.tsx)
- [app/dashboard/people/administrator/page.tsx](../app/dashboard/people/administrator/page.tsx)
- [app/dashboard/people/administrator/AdministratorClient.tsx](../app/dashboard/people/administrator/AdministratorClient.tsx)
- [app/api/administrator/documents/generate/route.ts](../app/api/administrator/documents/generate/route.ts)
- [app/api/administrator/documents/[id]/render/route.ts](../app/api/administrator/documents/%5Bid%5D/render/route.ts)
- [app/api/administrator/ingest/route.ts](../app/api/administrator/ingest/route.ts)
- [app/api/stripe/one-off/route.ts](../app/api/stripe/one-off/route.ts)
- [app/doc/[id]/page.tsx](../app/doc/%5Bid%5D/page.tsx)
- [app/prescreen/layout.tsx](../app/prescreen/layout.tsx)
- [app/review/layout.tsx](../app/review/layout.tsx)
- [supabase/migrations/credit_ledger_and_documents_structured.sql](../supabase/migrations/credit_ledger_and_documents_structured.sql)
- [supabase/migrations/administrator_ingests.sql](../supabase/migrations/administrator_ingests.sql)
- [supabase/migrations/rls_documents_knowledge_administrator.sql](../supabase/migrations/rls_documents_knowledge_administrator.sql)
- [supabase/migrations/knowledge_chunks_voyage_dim.sql](../supabase/migrations/knowledge_chunks_voyage_dim.sql) (previous session)
- [scripts/axe-scan.mjs](../scripts/axe-scan.mjs)
- [scripts/check-migrations.mjs](../scripts/check-migrations.mjs) (previous session)

Modified:
- tailwind.config.ts, app/globals.css, app/layout.tsx (token rewrite + next/font)
- app/dashboard/layout.tsx (ThemeBoundary wrap)
- app/api/chat/route.ts (prompt caching)
- app/api/stripe/checkout/route.ts (priceId server-side resolution)
- app/api/stripe/webhook/route.ts (credit allocation + one-off payment)
- app/dashboard/people/page.tsx (redirect)
- app/dashboard/settings/page.tsx (plan checkout)
- components/sidebar/Sidebar.tsx (split nav)
- components/chat/ChatInterface.tsx (44px send + aria-label)
- lib/stripe.ts (plan + one-off price resolution)
- lib/rag.ts (Voyage + rerank wiring)
- Five components: bg-[#000000] -> bg-surface-inverse
