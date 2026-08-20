# AI Administrator - withdrawn product (archived 2026-08-20)

This folder holds the code for **AI Administrator**, the AI HR document-generation
product that was removed from HQ.ai in August 2026. It is kept as a historical
reference for future developers. It is **not** wired into the application.

Nothing here is imported, routed to, built, typechecked or linted. `_archive` is
excluded in `tsconfig.json` and `eslint.config.mjs`. Files keep their original
paths under this folder so you can see where each one used to live.

## Why it was removed

The product was withdrawn to make room for a different offer, which was still
being scoped with the development team at the time of removal. This was a
product decision, not a technical one. The code worked.

## What AI Administrator was

A document engine. Members picked an HR template (offer letter, contract,
warning, performance plan, policy), filled in a form, and the AI generated a
finished document as DOCX, PDF, PPTX or HTML, saved to their documents library
and editable in a Notion-style TipTap editor. It was also sold standalone
through a pay-as-you-go marketplace and a one-off Stripe checkout at `/offer`.

## What is in here

| Path | What it was |
|---|---|
| `app/dashboard/people/administrator/` | The product page and its client - template gallery, form, preview |
| `app/api/administrator/documents/generate/` | The generation engine (Claude tool-use, structured document output) |
| `app/api/administrator/one-off/fulfil/` | Post-payment fulfilment for the one-off funnel |
| `app/api/stripe/one-off/` | Stripe checkout session creator for one-off document sales |
| `app/offer/` | The `/offer` one-off landing page, success and cancelled screens |
| `app/api/documents/generate/` | The chat-side document generation route |
| `app/dashboard/templates/page.tsx` | The HR Templates library page |
| `components/landing/DocumentMarketplace.tsx` | The public `/marketplace` body |
| `components/landing/MarketplaceCarousel.tsx` | The landing-page marketplace section |

## What deliberately did NOT come with it

Parts of this product were shared with HQ Recruit, the chat and the documents
library, so they stayed in the codebase under neutral names:

| Was | Now |
|---|---|
| `components/administrator/DocEditor*`, `SlashCommand`, `EditorSkeleton` | `components/docs/` |
| `/api/administrator/documents/[id]/render` | `/api/documents/[id]/render` |
| `/api/administrator/documents/[id]/render-html` | `/api/documents/[id]/render-html` |
| `/api/administrator/ingest` (CV formatter) | `/api/recruit/ingest` |
| `/dashboard/people/administrator/ingest` | `/dashboard/recruit/ingest` |

Also kept and still in active use: `lib/render/*` (docx, pptx, pdf, html),
`lib/doc-model.ts`, `lib/template-ip.ts`, `/api/documents/contract`,
`/api/documents/download`, `/api/documents` (GET and DELETE), and
`/dashboard/documents` - which still works at its URL but is no longer linked
from anywhere in the product.

`/dashboard/recruit/templates` still serves the recruitment-category templates
from the same `lib/template-ip.ts` library.

## Database - untouched on purpose

No migration was written and no data was deleted. Still present and still
readable:

- `public.documents` - still actively written by Recruit and the templates route
- `public.administrator_ingests` - keeps its name; the moved Recruit ingest
  route still writes to it, and its RLS policies are unchanged
- `public.credit_tool` enum - still contains `administrator` and `one_off`.
  Historical `credit_ledger` rows carry those values. Nothing filters on the
  column, so they are harmless. The `CreditTool` TypeScript union was left
  matching the enum on purpose.
- `supabase/migrations/rls_documents_knowledge_administrator.sql` - the filename
  says administrator but its contents are the `documents` / `knowledge_chunks` /
  `conversations` policies every product needs. Do not rename it; renaming an
  applied migration breaks history.

Stripe was not touched either. The one-off products and prices still exist in
the Stripe dashboard and must be archived there by hand if they are no longer
wanted.

## Known pre-existing bug carried through the move

`app/api/recruit/ingest/route.ts` inserts `kind: 'cv_formatter'` into
`administrator_ingests`, whose check constraint only allows `('resume',
'contract')`. The insert result is destructured without an error check, so the
violation is swallowed silently and the ingest row is never written. The CV
formatter still works because the `documents` row is inserted separately.

This predates the removal and was moved verbatim rather than fixed, so it would
not be mistaken for a regression. It still needs its own fix: either widen the
constraint or stop writing the row.

## If you are reviving any of this

Read `docs/research/2026-05-21_doc-editor-architecture.md` for the editor
design, and check the rename table above before restoring any file - the paths
it imports from have moved.
