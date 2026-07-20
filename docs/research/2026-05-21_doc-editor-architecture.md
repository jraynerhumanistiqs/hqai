# Doc Editor Architecture Decision - AI Administrator + Document Marketplace

**Date**: 2026-05-21
**Audience**: Founder (Jimmy Rayner) - handoff to coder agent
**Author**: System Architecture Designer (research agent)
**Status**: Decision doc. Not a spec change. Not a code change. Read once, then hand to coder.
**Confidence legend**: `[HIGH]` primary-source verified against the codebase or the vendor docs | `[MED]` derived from documented behaviour | `[LOW]` analyst call

---

## 0. TL;DR + the ship recommendation

**Do not adopt the founder's proposal.** The recommendation to add CKEditor 5 or TinyMCE plus html-docx-js is materially wrong for one specific reason: **the editor library the founder is asking to add is already installed, wired, and shipping the AI Administrator surface today.** The codebase runs Tiptap v3.23.4 with 11 official extensions (StarterKit, Underline, Link, TextStyle, FontSize, TextAlign, Image, Table + row/header/cell, Placeholder), a custom ResizableImage node view, a full toolbar, and a Puppeteer-backed PDF export path. It ships from `hqai/components/administrator/DocEditor.tsx`. The $25 Letter of Offer marketplace flow also ships end to end from `/offer` through `/api/stripe/one-off` through `/api/administrator/one-off/fulfil` - it just uses a different UX (payment first, no live edit) that we should unify.

**The one ship decision:** keep Tiptap, keep the StructuredDocument tool-use intermediate model, keep the four-format renderer bank (docx, pdf, pptx, html), and **layer the existing DocEditor onto the marketplace flow** so both surfaces converge on one editor + one export pipeline. Add DOCX export from the same edited HTML using `docx` (already installed) rather than `html-docx-js` (never install it - see Section 9). Fix the one fidelity gap: the current live-edit path renders PDF but not DOCX from edits, so `/offer/success` emails the buyer an unedited docx today.

**The one thing to do this week:** wire the existing `DocEditor` into `/offer/success` so a non-member buyer can edit the drafted Letter of Offer before it lands in their inbox, and add a matching HTML-to-DOCX endpoint at `/api/administrator/documents/[id]/render-html-docx` that mirrors `render-html` for PDF. Two days of work for the coder, unlocks the marketplace as a proper editor product, and removes the last reason to consider CKEditor 5.

---

## 1. Codebase baseline (what's already in place)

Verified by reading files. Every fact here is grounded in a specific path.

### 1.1 Editor library

**Tiptap v3.23.4 is installed and shipping.** Confirmed against `hqai/package.json`:
- `@tiptap/react@^3.23.4`
- `@tiptap/starter-kit@^3.23.4`
- `@tiptap/pm@^3.23.4`
- Extensions: `extension-underline`, `extension-link`, `extension-image`, `extension-placeholder`, `extension-table`, `extension-table-cell`, `extension-table-header`, `extension-table-row`, `extension-text-align`, `extension-text-style`

Wired in `hqai/components/administrator/DocEditor.tsx` (523 lines). Full toolbar exposes: undo/redo, heading levels 1 to 4, font size (9 sizes from 10 to 32px), bold/italic/underline/strike, bullet + numbered lists, blockquote, four-way text alignment, image insert + resize (200/300/450/600px presets), link insert with edit bar, table insert with resizable columns, horizontal rule, page setup (A4 vs Letter, per-side margins, header/footer HTML). A `ResizableImage` node view extends the stock Image extension with width and float attributes.

Lazy-loaded via `hqai/components/administrator/DocEditorLazy.tsx` behind `React.lazy` + `Suspense` with an on-brand `EditorSkeleton` fallback (`hqai/components/administrator/EditorSkeleton.tsx`), specifically to keep Tiptap out of the initial bundle on `/dashboard/documents` and the AI Administrator route.

### 1.2 Intermediate document model (the load-bearing decision)

**The `StructuredDocument` model recommended in the 2026-05-16 teardown section 6.2 has been built.** File: `hqai/lib/doc-model.ts`. It is a discriminated-union block tree with these block types: `heading` (levels 1 to 4), `paragraph`, `list` (ordered flag), `table` (headers + rows), `kv` (two-column field/value for headers and signatures), `spacer`, `page_break`, `signature` (party enum, name, label), `notice` (info/warning/caution variant). Each block carries an optional `citations: string[]` and the document root carries `citations: CitationRef[]`, `metadata`, `issuer`, `recipient`, `title`, `sections[]`.

Claude emits the tree directly via an Anthropic tool called `emit_document` (`STRUCTURED_DOC_TOOL`) with `tool_choice: { type: 'tool', name: 'emit_document' }`. One LLM call, four output formats. The old markdown-to-docx path in `hqai/app/api/documents/generate/route.ts` is preserved but only serves the chat surface; the AI Administrator uses `hqai/app/api/administrator/documents/generate/route.ts`.

### 1.3 Render fan-out

Four renderers all reading the same `StructuredDocument`:
- `hqai/lib/render/docx.ts` - programmatic docx@9 build (headings, paragraphs, tables, images, footer with business logo).
- `hqai/lib/render/pdf.ts` - Puppeteer via `puppeteer-core@25.0.2` + `@sparticuz/chromium@148.0.0` (Vercel-safe headless Chrome).
- `hqai/lib/render/pptx.ts` - `pptxgenjs@4.0.1`.
- `hqai/lib/render/html.ts` - self-contained inline-styled HTML for `/doc/[id]`, PDF input, and email preview.
- `hqai/lib/render/docx-templates.ts` - `docxtemplater@3.68.7` + `docxtemplater-image-module-free@1.1.1` + `pizzip@3.2.0` for the future case where an HR-authored .docx is used as the template file.

Dispatch route: `GET /api/administrator/documents/[id]/render?format=docx|pdf|pptx|html` (`hqai/app/api/administrator/documents/[id]/render/route.ts`).

### 1.4 Live-edit round-trip (partial)

`hqai/app/api/administrator/documents/[id]/render-html/route.ts` accepts the edited HTML from `editor.getHTML()` plus `PageSettings` and returns a PDF. It intentionally does **not** round-trip edits back into `structured_payload` (see the comment at lines 6-13 - parsing arbitrary contenteditable HTML into the block schema is called out as a can of worms). **There is no equivalent DOCX endpoint today.** That is the single gap I would fix first (Section 6, v1.0 acceptance criteria).

### 1.5 Marketplace flow

Route inventory:
- `hqai/app/marketplace/page.tsx` - public browse page, look-and-feel only, no checkout wired yet.
- `hqai/app/offer/page.tsx` + `OfferLandingClient.tsx` - the single-purpose $25 Letter of Offer landing (unauthenticated, no `/dashboard` chrome).
- `hqai/app/offer/success/page.tsx` + `OfferSuccessClient.tsx` - fires fulfilment.
- `hqai/app/api/stripe/one-off/route.ts` - creates the Stripe Checkout session.
- `hqai/app/api/administrator/one-off/fulfil/route.ts` - post-payment: validates Stripe session, generates via Claude tool-use (Sonnet, `administrator-clause-cite` intent), persists to `documents` (with `business_id: null`), renders PDF + DOCX in parallel, emails via `sendOneOffLetterOfOfferEmail` in `hqai/lib/email.ts`.
- Env: `STRIPE_PRICE_ID_LETTER_OF_OFFER` plus nine other one-off SKUs already in `hqai/CLAUDE.md`.

**Marketplace order today: pay first, generate second, no edit before download.** The buyer does not see the letter before paying and does not get to edit it before receiving it.

### 1.6 What is *not* built

- No live editor on the marketplace success page. The generated doc is emailed as an attachment, and the doc is viewable at `/doc/[id]` but as read-only HTML.
- No HTML-to-DOCX endpoint. Only HTML-to-PDF exists for the edit path.
- No `/marketplace/[docType]` per-SKU route. Nine of the ten one-off SKUs have Stripe Price IDs but no landing pages - only `/offer` for Letter of Offer.
- No preview watermark. No capped edit session. No silent account provisioning for non-member retention.
- No track-changes, no comments, no collaboration features (correctly deferred per Section 5.5).

### 1.7 Prior research to cite (not re-derive)

- `2026-05-16_ai-doc-creation-teardown.md` s.6.2 - programmatic docx@9 keep + puppeteer for PDF + pptxgenjs for PPTX + docxtemplater for complex templates. Decision endorsed; already shipped.
- `2026-05-16_ai-doc-creation-teardown.md` s.6.3 - three-layer template model (detection + form + structured JSON + optional .docx template file). Shipped in `lib/doc-model.ts` and `lib/render/docx-templates.ts`.
- `retention-and-monetisation-brief.md` s.2.4 - credit-per-action pricing. Shipped in `hqai/lib/credits.ts` (referenced from the generate route).
- `retention-and-monetisation-brief.md` s.6 - one-off SKUs as the cheapest CAC. Shipped at `/offer` for Letter of Offer, nine other SKUs pending landing pages.

---

## 2. Evaluation of the founder's proposal

The proposal has four components. Each is assessed on its own merits *and* against the codebase reality.

### 2.1 `docx` (npm library)

**What it does**: Programmatic construction of Open Office XML .docx files in Node. Same primitive the current AI Administrator uses.

**Cost**: MIT licence. Free.

**Fit for Next.js 16 + React 18 + Tailwind**: Server-side only (Node runtime). Works today in `runtime = 'nodejs'` route handlers. Zero client-side impact.

**Bundle-size impact**: Nil on the client. Server-side.

**Verdict**: **Adopt (already adopted).** `docx@9.6.1` is in `package.json` and drives both the legacy markdown pipeline (`hqai/app/api/documents/generate/route.ts`) and the new structured pipeline (`hqai/lib/render/docx.ts`). No action required.

### 2.2 CKEditor 5 (Premium)

**What it does**: Enterprise WYSIWYG editor with a proprietary schema, plugin system, and a paid "Export to Word" plugin that server-side converts CKEditor content to real OOXML via CKEditor's cloud service.

**Cost (2026)**: CKEditor 5 core is free under a dual GPL2+/commercial licence, but commercial use in a closed-source product requires the paid plan. Public pricing as of late 2025 quotes seat-based plans starting around USD 39 to USD 89 per month per team, with Premium features (Export to Word, Import from Word, real-time collaboration, comments, track changes) starting around USD 500+ per month billed annually. Export to Word specifically is a Premium-only feature that consumes credits per conversion on top of the base fee. Flag: **specific 2026 prices unverified from primary source at write time - verify against ckeditor.com/pricing before signing anything.**

**Fit for Next.js 16 + React 18 + Tailwind**: CKEditor 5 ships as a React wrapper (`@ckeditor/ckeditor5-react`) and is Next.js compatible with SSR caveats (must be dynamic-imported client-side, similar to Tiptap's `immediatelyRender: false` pattern). Editor styling is a fully custom design system that fights Tailwind's utility classes; theming CKEditor to match the DM Sans + Uber-inspired token palette in `tailwind.config.ts` is a real project, not an afternoon.

**Bundle-size impact**: The published CKEditor 5 classic-editor bundle is around 500 KB minified before extensions; Premium features (import/export) push it to 800 KB+. That is on top of any React runtime already present. For the marketplace surface specifically - where every KB of client JS is a cold-prospect conversion tax - this is a material hit compared with Tiptap StarterKit (around 100 KB min+gz for the same editing feature set).

**Verdict**: **Reject.** We already have a shipping editor at zero incremental cost. Swapping to CKEditor 5 costs money, adds bundle weight, forces a design system re-skin, and delivers no capability that Tiptap doesn't already deliver except the paid "Export to Word" - which we replace with `docx` programmatic emit from the same structured tree.

### 2.3 TinyMCE

**What it does**: The other enterprise WYSIWYG editor. Long-standing, mature, React wrapper available. Paid plans for premium plugins including Export to Word / PDF and AI features.

**Cost (2026)**: TinyMCE is dual-licenced (LGPL + commercial). Cloud pricing publicly quoted around USD 92 per month Essential to USD 340+ per month Professional, with a free tier (Community) limited by editor-loads per month. Premium plugins including Word export are gated behind paid tiers. Flag: **specific 2026 numbers unverified from primary source at write time.**

**Fit for Next.js 16 + React 18 + Tailwind**: Similar to CKEditor - React wrapper exists (`@tinymce/tinymce-react`), needs dynamic import for SSR, has its own skin system that fights Tailwind unless the "silver" skin is heavily overridden or a custom skin is built.

**Bundle-size impact**: TinyMCE bundle is comparable to CKEditor (400 to 700 KB with plugins) or slightly smaller in some builds. Still materially heavier than Tiptap StarterKit.

**Verdict**: **Reject.** Same reasoning as CKEditor. Paid licence, bundle weight, design system mismatch. No new capability.

### 2.4 html-docx-js

**What it does**: Old client-side library that wraps arbitrary HTML in an Office XML shell and calls the result a docx. Uses the `application/vnd.ms-word.document.macroEnabled.12` MIME workaround (or plain word MIME) and Word opens it - because Word opens *most* HTML wrapped in a docx envelope. It is NOT a real OOXML converter; it is a compatibility hack.

**Cost**: MIT. Free.

**Fit for Next.js 16 + React 18 + Tailwind**: Client-side, works in the browser. Last meaningful commit on the original repo is more than seven years old; no active maintenance. Forks exist (html-to-docx, html-docx-ts) with varying quality.

**Bundle-size impact**: Around 40 KB minified. Small.

**Fidelity trade-off**: **This is the key point.** html-docx-js does not lay out headers, footers, page numbers, running images, or tables with any fidelity. It ships the HTML inline and lets Word figure it out. Complex layouts break. Business logo placement is unreliable. The founder's own proposal calls this out ("Cons: Advanced layout features like complex headers/footers can sometimes lose fidelity").

**Verdict**: **Reject.** We have `docx@9` on the server and a `StructuredDocument` intermediate tree. Rendering the edited HTML back to DOCX by re-hydrating into the structured tree and then running `renderDocx()` gives us pixel-consistent output with the PDF, keeps the business-logo footer working (the docx renderer already emits it), and avoids the "sometimes loses fidelity" risk entirely. See Section 4.2 for the mechanic.

### 2.5 CKEditor 5 "Import from Word"

**What it does**: Paid Premium feature that ingests a real .docx (OOXML) and produces CKEditor-native content JSON. Useful if we wanted to accept user-uploaded Word docs as templates and edit them.

**Cost**: Premium tier only, credit-metered.

**Fit for HQ.ai**: We *do* want to accept HR-authored .docx template files (per Section 6.3 of the teardown - the docxtemplater layer). We do NOT need to convert them to editor-native JSON. Our templates are prompt + form + structured emit, not "let the user paste a Word doc and edit it".

**Verdict**: **Reject.** We already have `mammoth@1.12.0` installed for docx-to-HTML if we ever need it (for CV/candidate resume parsing on the HQ Recruit side), and `docxtemplater` for template-fill on the HR-authored .docx path. Both cover their use cases without a paid vendor.

---

## 3. Alternatives evaluated

### 3.1 Tiptap (ProseMirror-based, React-first)

**Strengths**: MIT core. Headless (no imposed UI - we style with Tailwind and it Just Works). Vue and React first-party wrappers. Extension system is small, composable, well-documented. ProseMirror underneath means the schema, transactions, and undo are battle-tested (same engine behind Atlassian Confluence, New York Times editor, Craft, GitLab). Node-view API lets us build custom blocks like the resizable image already in `DocEditor.tsx`. `@tiptap/pro` extensions exist for collaboration, comments, mentions, tables of contents - MIT-compatible optional add-ons at around USD 149 per month for the pro tier if we ever want them.

**Weaknesses**: Rich HTML output is opinionated (ProseMirror's schema constraints); the round-trip from HTML back to structured JSON requires parsing (which is why our current codebase intentionally keeps `structured_payload` as the "as-generated" snapshot and treats live-edited HTML as one-shot for PDF). Learning curve for extensions is not trivial (adding a genuinely new block type is a day, not an hour).

**HQ.ai fit**: **Perfect.** Already installed, already shipping, already extended with a resizable-image node view, already lazy-loaded to protect bundle. Design system already integrated (see the `.doc-editor-page` scoped styles in `DocEditor.tsx` lines 180 to 253).

**Verdict**: **Adopt (already adopted).** This is the answer.

### 3.2 Lexical (Meta, MIT)

**Strengths**: Newer, Meta-backed, React-first with a strong plugin architecture. Excellent accessibility story out of the box. Small core (~22 KB gzipped).

**Weaknesses**: Younger ecosystem than Tiptap; fewer battle-tested plugins for tables, images with resize, and page-oriented layout. Migrating a working Tiptap install would delete two weeks of work in `DocEditor.tsx` and gain nothing measurable.

**HQ.ai fit**: Would be a strong choice if we were starting from scratch. We are not.

**Verdict**: **Reject.** No reason to switch off a working Tiptap install.

### 3.3 Slate.js (React, MIT)

**Strengths**: Long-standing React-first editor, controllable schema, popular in indie React shops.

**Weaknesses**: Notoriously fiddly to build production-grade tables and images on. Selection and input handling has historically been where teams get stuck. Table support is community-plugin territory. Not the choice for a document editor with tables and resizable images.

**HQ.ai fit**: Weaker than Tiptap on every axis we care about.

**Verdict**: **Reject.**

### 3.4 Quill 2.x (framework-agnostic, MIT)

**Strengths**: Mature, framework-agnostic, small core.

**Weaknesses**: Not React-first (works with a wrapper); custom blocks (blots) are more work than ProseMirror node views; tables and images are community territory. Modernised in 2.x but still feels 2018 in developer ergonomics compared with Tiptap.

**HQ.ai fit**: Fine but not better than what we have.

**Verdict**: **Reject.**

### 3.5 Others considered briefly

- **react-quill**: wrapper around Quill 1. Legacy. Reject.
- **contenteditable + regex**: what our `render-html` route already treats the edited HTML as. Fine for the one-shot PDF path; not a plan for a full editor. We're not proposing this as the editor.
- **Microsoft Word Online iframe / Office JS API**: the founder's cut-off "Best Enterprise Solution" is likely this. See Section 9.1 for why we do not go there.
- **Google Docs API embed**: See Section 9.2.

---

## 4. Recommended architecture (the ship decision)

One architecture, both surfaces (AI Administrator + Document Marketplace). Every part below is either already shipped or is a small delta on shipped code.

### 4.1 The chosen editor library

**Tiptap v3.23.4 (already installed).** Extension set as currently configured in `hqai/components/administrator/DocEditor.tsx` lines 93 to 110. Lazy-loaded via `DocEditorLazy` for both surfaces to keep the marketplace initial payload lean.

### 4.2 The DOCX export path

**Two-lane export, both server-side:**

- **Lane A - "as-generated" download**: The structured payload persisted in `documents.structured_payload` is rendered by `renderDocx()` (`hqai/lib/render/docx.ts`) via `GET /api/administrator/documents/[id]/render?format=docx`. This is the path when the buyer downloads without editing. Fidelity: perfect - it's programmatic docx@9 from the canonical tree, business logo goes in the footer.

- **Lane B - "as-edited" download**: NEW endpoint `POST /api/administrator/documents/[id]/render-html-docx` that mirrors `render-html/route.ts` in shape. Accepts `{ html, title, settings }` from `editor.getHTML()`. Internally, converts the edited HTML back to a `StructuredDocument` via a **conservative HTML-to-blocks parser** (h1-h4 -> heading, p -> paragraph, ul/ol -> list, table -> table, img -> paragraph with note, everything else -> paragraph with text extracted). Then runs `renderDocx()` against the reconstituted tree. Fidelity: high for text, headings, lists, tables. Loses: image resize widths (falls back to intrinsic width in the docx), floating image alignment, arbitrary inline styles. This is the honest trade-off - see Section 4.9.

**Do NOT install html-docx-js.** See Section 2.4.

### 4.3 The canonical intermediate representation

**`StructuredDocument` in `hqai/lib/doc-model.ts`.** No changes required. The schema in Section 1.2 above is the source of truth. Every renderer reads it. Every LLM tool-use call emits it. Every "as-generated" export is deterministic against it.

The intentional decision (documented in `render-html/route.ts` lines 12 to 14) is that edits from the live editor are treated as one-shot HTML side-channels and are NOT round-tripped back into `structured_payload`. This is correct and I would keep it. Rationale: parsing arbitrary contenteditable HTML back into the block schema loses the citation IDs, the `kv` blocks, the signature party enum, and the block-level metadata. Better to keep the "as-generated" snapshot as the citation-auditable source of truth and let the edited HTML be the one-shot delivered document.

### 4.4 Where AI-generated content lands

Unchanged. Claude tool-use emits `StructuredDocument` -> `documents.structured_payload` -> `renderHtml()` -> mounted into the Tiptap editor via `editor.commands.setContent(previewHtml)`. Already working in `AdministratorClient.tsx` lines 77 to 91 and lines 402 to 407.

### 4.5 Save state

Existing `documents` table (Supabase):
- `id`, `title`, `type`, `content` (legacy plain-text dump, kept for backwards compatibility with `/dashboard/documents`), `structured_payload` jsonb (canonical tree), `template_id`, `business_id` (nullable for one-offs), `user_id` (nullable for one-offs), `created_at`.

**No schema change proposed.** The current shape already supports both surfaces: `business_id: null` + `user_id: null` handles marketplace buyers who have no account. `structured_payload` round-trips the tree so re-renders don't require re-calling Claude.

**One new column to consider (v1.1)**: `edited_html text` for storing the last-edited HTML if we want to support "come back tomorrow and finish editing". Today the edit lives only in the editor state. If we ship a "your unfinished draft" recovery UX, add this column. Not required for v1.

### 4.6 Same pipeline for both surfaces

The critical hard constraint. Here is how it holds:

| Layer | AI Administrator | Marketplace |
|---|---|---|
| Editor | `DocEditorLazy` on `/dashboard/people/administrator` | `DocEditorLazy` on `/offer/success` (new mount) |
| Generation | `POST /api/administrator/documents/generate` | `POST /api/administrator/one-off/fulfil` (unchanged) |
| Persist | `documents` table with `business_id` | `documents` table with `business_id: null` |
| Render (as-generated) | `GET /render?format=docx|pdf|pptx|html` | Same route, unauthenticated variant needed - see Section 4.7 |
| Render (as-edited) | `POST /render-html` for PDF, new `/render-html-docx` for DOCX | Same routes |
| Auth gate | Supabase auth cookie required today | Stripe session_id validation (already present in fulfil route) |

**The one small change**: `/render` and `/render-html` currently require `supabase.auth.getUser()`. For the marketplace, we need a variant that accepts a short-lived **document access token** issued at fulfilment time. The token is stored in `documents` (new column: `access_token text` with a 30-day TTL, or generate a JWT with document id + expiry). The `/offer/success` client stores the token in state, passes it as `?token=...` on every render call, and the render routes accept either a Supabase session OR a valid access token. This is a 4-hour change, not a re-architecture.

### 4.7 Header/footer + brand-logo handling

**Preserved and unified.** Two mechanisms:

- **Structured DOCX/PDF/PPTX** (as-generated download): `renderDocx()` and `renderPdf()` both consume `doc.metadata.issuer_logo_url` and fit it into the document footer. Set at generate time in `generate/route.ts` lines 289 to 291. Marketplace one-off flow: no business, no logo - the footer stays as "Generated by HQ.ai by Humanistiqs - humanistiqs.com.au" per `hqai/lib/render/docx.ts`.

- **Live-edit PDF** (as-edited via `/render-html`): the editor exposes `PageSettings` (A4/Letter + margins + headerHtml + footerHtml) which flow through to Puppeteer's `headerTemplate` / `footerTemplate`. See `render-html/route.ts` lines 116 to 121. **Logo in the editable header**: not currently in the founder flow but easy to add - the editor already accepts contenteditable HTML in `settings.headerHtml` (see `DocEditor.tsx` line 316), so we pre-populate it with `<img src="{{business.logo_url}}" style="max-height:48px" />` and the recruiter can tweak in-place.

Fidelity note: the live-edit DOCX path (Lane B) will need to inject the logo into the reconstituted `StructuredDocument.metadata.issuer_logo_url` before `renderDocx()` runs, so the footer stays consistent. Coder action item in Section 6.

### 4.8 Two-tier fidelity trade-off (called out honestly)

**As-generated exports (`/render?format=X`)**: Pixel-consistent across all four formats because they all read the same `StructuredDocument` tree. Headers, footers, business logo, signatures, tables all render identically. This is the primary path.

**As-edited exports (`/render-html*`)**: The editor lets the user do anything HTML allows. When the user edits:
- Text edits, heading changes, list toggles, paragraph splits: perfect fidelity into DOCX/PDF.
- Table edits (add/remove rows, edit cells): high fidelity.
- Image resizes and floats: preserved to PDF (Puppeteer honours CSS), degraded in DOCX (docx@9 renders images at intrinsic size unless we teach the HTML-to-blocks parser to read `style="width:..."` off the `<img>`; that's an achievable extension in v1.1).
- Colour/font-weight changes via the toolbar: preserved to both.
- Header/footer text edits: preserved to PDF via Puppeteer templates. Preserved to DOCX by injecting into the reconstituted doc's metadata.
- Signature blocks moved around: high fidelity as paragraphs - lose the block-level `party` semantic that would let a future signing integration know which line is the employee vs employer signature. This is a known limitation and, in v1, an acceptable one.

We tell the user this by simply having them download and check. No warning banner needed.

---

## 5. UI/UX flow (both surfaces)

### 5.1 AI Administrator flow (authenticated)

Already shipped. Steps:

1. `/dashboard/people/administrator` renders the template gallery (category filters + search + 33 cards).
2. Click a card -> template detail view with the form on the right, "How this draft is built" tips on the left.
3. Fill form -> `Generate document` -> `POST /api/administrator/documents/generate` (Haiku for template-fill, Sonnet for clause-cite, Opus for complex-contract per `hqai/lib/router.ts`).
4. Modal opens with Tiptap live-edit view. Full toolbar. A4/Letter page canvas. Editable header + footer bands.
5. Edit anything -> `Download PDF` calls `/render-html` (PDF is the only export in the modal today).

**Additions for parity with the recommended architecture:**

- Add a `Download DOCX` button next to `Download PDF` that calls the new `/render-html-docx` endpoint (Section 4.2 Lane B). Effort: 30 minutes for the button, 1 day for the endpoint.
- Add a `Save and close` button that persists the edited HTML into an `edited_html` column (v1.1 optional).
- Add `Export as web link` action that generates a `/doc/[id]?token=...` shareable URL for candidates to view read-only. Route already exists at `/doc/[id]` - just needs the token gate matching Section 4.6.

### 5.2 Marketplace flow (non-member, $25 Letter of Offer)

Today's shape:
1. `/offer` landing page - hero + form + `Continue to checkout` button.
2. `POST /api/stripe/one-off` -> Stripe Checkout redirect.
3. `/offer/success?session_id=...` -> fires `POST /api/administrator/one-off/fulfil` which generates, persists, renders PDF+DOCX, emails.
4. Buyer sees "Done. It's on its way to your inbox." - end of flow.

**Recommended v1.1 shape (payment first, then edit and export):**

1. `/offer` landing - unchanged.
2. Stripe Checkout - unchanged.
3. `/offer/success?session_id=...` -> fulfil runs synchronously (already does), returns `{ document_id, share_url, access_token, email_sent }`.
4. Instead of a "Done" screen, mount `DocEditorLazy` with the generated HTML + a short-lived access token. Toolbar as normal. `Download PDF` and `Download DOCX` buttons wired to the token-gated render routes.
5. Email still fires in parallel (unedited "as-generated" version - so if the user closes the tab without editing they get the drafted doc automatically).
6. Optional "Send me the edited version" button that re-runs the render on the current editor HTML and emails it as a v2.

### 5.3 Load-bearing UX question: generate before payment, or after?

**Recommendation: keep payment before generation, but show a strong pre-payment preview based on form inputs (not the LLM output).** This is not the founder's proposal exactly, and it deviates from the pure "Tome-style paywall-the-download" model. Reasoning:

- Tome burned money on unlimited free generation (per the 2026-05-16 teardown s.3.5). Every failed conversion cost real API dollars. Our unit economics can't take a "generate before paying" free-tier for a $25 SKU where API cost is around $0.032 to $0.10 per generation.
- Lawpath's own $48 one-off flow does not preview the LLM output pre-payment either - they show a template preview and a form, then paywall. Their conversion is documented as commercially viable, so the pattern works `[MED]`.
- The founder's brand voice ("Three minutes, no signup") is compatible with pay-then-generate as long as the payment step is genuinely three clicks and the fulfilment is fast (which it is - Claude Sonnet finishes in 5 to 15 seconds).
- Buyer trust: the risk with pay-first is refund pressure if the buyer hates the draft. Mitigation: (a) show a sample Letter of Offer PDF on the landing page, (b) offer a 24-hour money-back guarantee framed as "if the draft isn't right, tell me why and I'll refund you", (c) the editor after payment means the buyer can materially fix anything they don't like in-place.

**Do NOT preview the actual LLM output pre-payment.** It's the unit-econ trap.

### 5.4 UX policies (non-member specifics)

- **Preview watermark**: NO. Watermarked PDFs feel cheap and clash with "no signup, three minutes, done." Instead: pre-payment landing page shows an anonymised sample PDF (owned asset, no per-view LLM cost).
- **Capped edit session**: YES, soft cap. The access token expires 30 days after purchase. Reason: prevents indefinite re-render load, aligns with the "one-off purchase" mental model. Buyer keeps the emailed PDF/DOCX forever regardless.
- **Silent account creation**: YES, deferred. After the buyer downloads, the success page shows "Save this for later? Enter a password to keep your library." The buyer's email is already captured for the Stripe receipt; converting them to a Supabase user is one form submit and the retention brief section 3.4 identifies "drafted document library" as MED-stickiness. Do not force it - offer it.

### 5.5 Editor toolbar minimum for HR document editing

The existing `DocEditor.tsx` toolbar is already the right set. To codify:

**Must-have (all shipping today)**:
Bold, italic, underline, strikethrough. Bullet + numbered lists. Heading levels 1 to 4 + body. Text alignment (left/centre/right/justify). Undo/redo. Insert table (with resizable columns). Insert link with URL editor. Insert image (upload from disk, base64-embedded). Insert horizontal rule. Page setup (A4/Letter, per-side margins, add/remove header/footer).

**Nice-to-have (deferred)**:
Font family switcher (deferred - single font is on-brand). Highlight colour (deferred - HR docs are ink on white). Superscript/subscript (deferred - rare in HR docs). Find and replace (deferred - documents are short).

**Explicit no**:
Track-changes and comments (Section 5.6 below). Real-time collaboration cursors. Export as PPTX from the editor (it's a document editor, not a slide editor - PPTX exists as an as-generated format via the render route but is not a first-class editor action).

### 5.6 Track-changes and comments

**Deferred out of v1 and v1.1. Reconsider at 500+ paying customers.**

Reasoning:
- Tiptap Pro extensions cover comments and track-changes but sit behind a USD 149/mo licence (see 3.1 above). The v1 Foundation cohort is 5 to 10 pilots; buying a Pro seat now is premature.
- The buyer persona (SMB owner, allied health practice, publican) does not manage HR docs as multi-reviewer workflows. They edit, they sign, they send. Comments are a Big-4-firm feature, not an SMB feature.
- If a v1.2 Enterprise tier lands (per the retention brief's Q3 2027 schedule), that's the moment. Not before.

---

## 6. Implementation plan for the dev team

Three phases. Each item lists paths, effort, dependencies, acceptance.

### Phase v1.0 - ship the editor into the marketplace (this fortnight)

The AI Administrator editor already ships. The gap is the marketplace side and the DOCX round-trip. Total effort: **4 to 6 dev-days.**

**W1.0-1: Add HTML-to-DOCX endpoint** (2 dev-days)
- Create `hqai/app/api/administrator/documents/[id]/render-html-docx/route.ts` modelled on `render-html/route.ts`.
- Create `hqai/lib/render/html-to-blocks.ts` with a conservative parser (JSDOM or a small hand-rolled regex parser - JSDOM is preferable for correctness, add `jsdom@25.x` to dependencies).
- Reconstitute `StructuredDocument`, inject `metadata.issuer_logo_url` from the persisted row's business, run `renderDocx()`.
- Dependencies: none.
- Acceptance: `curl -X POST /api/administrator/documents/{id}/render-html-docx -d '{"html":"<h1>Hi</h1><p>Test</p>","title":"t","settings":{}}'` returns a valid .docx file that Word opens cleanly.

**W1.0-2: Add document access token** (0.5 dev-day)
- Add `access_token text` column to `documents` (or use signed JWT with document id + expiry - preferred, avoids schema change).
- Generate a token in `one-off/fulfil/route.ts` and return it in the response.
- Modify `render/route.ts` and both `render-html*/route.ts` to accept `?token=...` in addition to Supabase auth cookie.
- Dependencies: W1.0-1.
- Acceptance: an unauthenticated fetch with a valid token returns the render; an invalid/expired token returns 401.

**W1.0-3: Mount the editor on `/offer/success`** (1 dev-day)
- Refactor `OfferSuccessClient.tsx` to render `DocEditorLazy` when fulfilment succeeds.
- Show the drafted document in the editor. Provide `Download PDF` and `Download DOCX` buttons calling the token-gated endpoints.
- Keep the "Email is on its way" line - the parallel unedited email still fires.
- Dependencies: W1.0-1, W1.0-2.
- Acceptance: an anonymous buyer completes checkout, lands on `/offer/success`, sees the drafted Letter of Offer in an editor, edits a paragraph, downloads a DOCX that reflects their edit.

**W1.0-4: Add DOCX button to the AI Administrator modal** (0.5 dev-day)
- Add `Download DOCX` next to `Download PDF` in the modal footer in `AdministratorClient.tsx` line 383.
- Wire it to the new `render-html-docx` endpoint.
- Dependencies: W1.0-1.
- Acceptance: authenticated user in the Administrator modal downloads a DOCX that matches the PDF.

**W1.0-5: Marketplace-flow smoke tests** (1 dev-day)
- Add `hqai/tests/eval/marketplace-flow.test.ts` covering: landing form validation, Stripe checkout redirect (mocked), fulfilment idempotency (repeated `session_id`), token-gated render access, DOCX download smoke.
- Dependencies: W1.0-1 through W1.0-3.
- Acceptance: `npm test` passes with the new suite.

### Phase v1.1 - marketplace expansion (next month)

**W1.1-1: Nine more one-off SKUs** (3 dev-days)
- Create per-SKU landing pages at `/marketplace/[docType]/page.tsx` for each of the nine SKUs beyond Letter of Offer.
- Generalise `one-off/fulfil/route.ts` to look up the template from `session.metadata.offer_id` and drive off `TEMPLATE_BY_ID`.
- Dependencies: W1.0-1 through W1.0-3.
- Acceptance: `/marketplace/termination-letter`, `/marketplace/employment-contract` etc. work end-to-end.

**W1.1-2: Silent-account offer on `/offer/success`** (0.5 dev-day)
- After download, prompt "Save this for later? Set a password" with the pre-filled email.
- Post to `/api/marketplace/claim` which upserts a Supabase user, links the `documents` row via `user_id`, and sends a verification email.
- Dependencies: W1.0-3.
- Acceptance: opt-in claim converts anonymous buyer to authenticated user without re-entering the doc.

**W1.1-3: Header/footer logo in the marketplace path** (0.5 dev-day)
- Add a "Company logo" upload field to the `/offer` form (optional).
- Store as base64 in `session.metadata` (bounded to a KB limit), inject into `doc.metadata.issuer_logo_url` at fulfilment.
- Dependencies: W1.0-3.
- Acceptance: buyer uploads a logo and it appears in the DOCX footer + PDF footer.

**W1.1-4: `edited_html` persistence for recovery** (1 dev-day)
- Add `edited_html text` column to `documents`.
- Editor persists edits every 30 seconds via a debounced `PATCH /api/administrator/documents/[id]/edited-html`.
- `/offer/success` on reload re-hydrates from `edited_html` if present.
- Dependencies: W1.0-3.
- Acceptance: buyer closes tab, reopens with same session id, edits are restored.

### Phase v1.2 - polish (Q4)

**W1.2-1: Editor image resize to DOCX** (1 dev-day) - teach `html-to-blocks.ts` to read `style="width:..."` off `<img>` and preserve it in the docx renderer's `ImageRun`.

**W1.2-2: Export to PPTX from editor** (2 dev-days) - button that runs the same HTML-to-blocks conversion and calls `renderPptx()`. Fidelity honest note in the UI: "PPTX is a presentation format; expect a slide per section."

**W1.2-3: Web link share with view analytics** (1 dev-day) - view-count + last-viewed-at on the `/doc/[id]` page for the AI Administrator "did the candidate open it" use case (per the Pitch teardown insight in the 2026-05-16 doc).

**W1.2-4: Track-changes evaluation** (0.5 dev-day, research only) - after 500+ paying customers, re-evaluate Tiptap Pro comments extension. No code change in v1.2.

---

## 7. package.json changes

**No mandatory adds.** Every library we need is already installed.

**Optional adds for v1.0** (small, MIT, both server-side only):

```bash
npm install jsdom@^25.0.1
```

- **jsdom** - server-side DOM parser for the HTML-to-blocks converter (`hqai/lib/render/html-to-blocks.ts`). MIT. Around 2 MB installed, zero client bundle impact (server-only). Alternative: hand-rolled regex parser (fine for the HR doc block set; cheaper on cold-start but more error-prone for real-world HTML).

**Package removals**: none. `mammoth@1.12.0` is still needed for future CV/resume parsing on the Recruit side; keep it. All existing editor extensions stay.

**Paid licences to sign**: none. Do not sign CKEditor Premium. Do not sign TinyMCE Professional. Do not adopt html-docx-js.

**Flag for future consideration** (v1.2 or later): Tiptap Pro (USD 149/mo, comments + track-changes). Do not adopt in v1 or v1.1.

---

## 8. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | HTML-to-DOCX round trip loses image resize widths and float alignment | High | Medium | Ship the conservative parser in v1.0. Add width/style preservation in v1.2. The founder's own proposal called out this fidelity risk; we own it explicitly rather than hiding it. |
| 2 | Bundle-size regression on the marketplace `/offer` route from mounting the editor on success | Medium | Medium | `DocEditorLazy` already exists and defers the Tiptap chunk behind a Suspense boundary. Verify with `@next/bundle-analyzer` after W1.0-3 lands. If the code-split chunk still bloats the success page over 250 KB, move the editor behind an intent-to-edit button on the success page ("Want to edit before download?" -> loads on click). |
| 3 | Marketplace payment-first design causes refund pressure from buyers who hate the draft | Medium | Medium | (a) Sample PDF on the landing page as a floor of expectations. (b) 24-hour "if the draft is wrong, tell me why and I'll refund" policy. (c) The editor after payment means most "wrong drafts" can be fixed in place. (d) Track refund rate; if it climbs above 5%, revisit generate-before-payment for the specific SKU. |
| 4 | Business logo missing from DOCX in the live-edit lane (Lane B) | High | High | The HTML-to-blocks parser MUST inject `metadata.issuer_logo_url` from the persisted `documents` row before calling `renderDocx()`. Explicit acceptance criterion in W1.0-1. Regression test with a business that has a logo. |
| 5 | Access token leak if a buyer forwards the `/offer/success?session_id=...&token=...` URL | Low | Medium | Tokens are 30-day scoped and read-only. No mutation via token. Same threat model as a signed S3 URL. Accept the trade-off; do not add short-TTL rotation for v1. |
| 6 | Editor licence cost creep if we ever chase real-time collab or comments | Low | Medium | We do not need collab or comments in v1 or v1.1 (Section 5.6). Reconsider at 500+ customers. Tiptap Pro at USD 149/mo is the ceiling if we ever bite. |
| 7 | Track-changes deferred but a partner or enterprise buyer demands it in v1.2 | Low | Low | Explicit deferral. If a paying customer surfaces it as a blocker, Tiptap Pro is a one-week install (the extension exists), not a re-architecture. |
| 8 | Puppeteer + `@sparticuz/chromium` cold-start on Vercel > 15s and Stripe webhook times out | Medium | High | Already an operational concern. `maxDuration = 60` on the render routes. Consider moving PDF render to an async job queue for v1.2 if p95 latency creeps up. Not a blocker for v1.0. |

---

## 9. Anti-recommendations

Five explicit rejections, one per candidate the founder or a coder might reach for.

### 9.1 Pure Microsoft Word Online iframe (Office JS API embed)

**Do NOT adopt.** The founder's message was cut off at "Best Enterprise Solution (Native Word..." and this is the most likely intent. It sounds great in theory - real Word, real fidelity, real DOCX round-trip. In practice:
- Requires a Microsoft 365 licence per authoring user. Non-members do not have one. Kills the marketplace path entirely.
- Requires a registered Azure AD app, Microsoft Graph auth, and hosting the docx in OneDrive or SharePoint before it can be edited in the embed.
- Puts the buyer's Letter of Offer content in a Microsoft-managed tenant, which contradicts our "your data in our Supabase" pitch.
- No path to a token-based unauthenticated edit surface.
- Rejects hard.

### 9.2 Google Docs API embed

**Do NOT adopt.** Same-shape problems as Word Online. Requires a Google Workspace account per user. Requires OAuth into a Google identity. Puts the doc in a Google-managed drive. The "no signup, three minutes" positioning becomes "sign in with Google, connect to your Drive, three minutes."

### 9.3 react-quill / raw Quill 1.x

**Do NOT adopt.** Even if we were replacing Tiptap (we're not), Quill's block model and table story would be a downgrade. react-quill wraps Quill 1 which is not the current major version. Legacy choice.

### 9.4 contenteditable + regex parsing as the "editor"

**Do NOT adopt as the primary editor.** The `render-html/route.ts` route already treats the edited HTML as a one-shot post-editor artefact - that pattern is fine at the boundary. But *building* the editor as raw contenteditable + regex fights every accessibility, undo, selection, and IME edge case that ProseMirror already handles. It is the "roll your own editor" trap and it has consumed teams for months. Tiptap exists precisely so we don't do this.

### 9.5 html-docx-js (or html-to-docx, or any HTML-envelope-in-a-docx hack)

**Do NOT adopt.** Explicitly named in the founder's proposal. Analysed in Section 2.4. Loses fidelity on the exact features we need (header/footer with logo, tables, page numbers, running images). We have `docx@9` on the server and a structured tree. The round-trip through `renderDocx()` gives us proper OOXML with the business-logo footer intact.

### 9.6 CKEditor 5 Premium "Export to Word"

**Do NOT adopt.** Analysed in Section 2.2. Paid, bundle-heavy, requires theming. Delivers no capability we don't already have via `docx@9` + `StructuredDocument`.

---

## 10. Confidence and sources

**Verified against the codebase** `[HIGH]`:
- Every fact in Section 1 is grounded in a specific file read: `hqai/package.json`, `hqai/components/administrator/DocEditor.tsx`, `hqai/components/administrator/DocEditorLazy.tsx`, `hqai/components/administrator/EditorSkeleton.tsx`, `hqai/app/dashboard/people/administrator/AdministratorClient.tsx`, `hqai/lib/doc-model.ts`, `hqai/lib/render/{docx,pdf,pptx,html,docx-templates}.ts`, `hqai/app/api/administrator/documents/generate/route.ts`, `hqai/app/api/administrator/documents/[id]/render/route.ts`, `hqai/app/api/administrator/documents/[id]/render-html/route.ts`, `hqai/app/api/administrator/one-off/fulfil/route.ts`, `hqai/app/offer/{page,OfferLandingClient,success/page,success/OfferSuccessClient}.tsx`, `hqai/app/marketplace/page.tsx`, `hqai/app/api/documents/generate/route.ts`.

**Verified against prior research** `[HIGH]`:
- Structured intermediate representation + Puppeteer + pptxgenjs + docxtemplater choice: `hqai/docs/research/2026-05-16_ai-doc-creation-teardown.md` s.6.2 and s.6.3.
- $25 Letter of Offer SKU and payment-first policy: `hqai/docs/research/retention-and-monetisation-brief.md` s.2.3, s.4.
- Anti-Employsure, brand voice, plain-hyphens rule: `hqai/CLAUDE.md`, `hqai/ops/brand-voice.md`.

**Vendor claims flagged unverified against 2026 primary sources** `[MED]`:
- CKEditor 5 Premium 2026 pricing bands (USD 39-89 seat, USD 500+ Premium). The pricing model is real (documented at ckeditor.com/pricing historically); the exact 2026 numbers should be pulled fresh before any procurement conversation. No procurement conversation is proposed by this doc.
- TinyMCE 2026 pricing bands. Same treatment.
- Tiptap Pro USD 149/mo. Same. All three are marked as flagged rather than load-bearing because none of them are adopted by this doc.

**Analyst calls** `[LOW]`:
- Payment-first vs preview-first for the marketplace (Section 5.3). Grounded in Lawpath precedent and the Tome unit-econ warning but no HQ.ai-specific evidence exists yet. Revisit after 90 days of `/offer` telemetry.
- Track-changes deferral (Section 5.6). Grounded in the ICP being SMB owners not Big-4 firms, not in HQ.ai buyer research.

---

## 11. Handoff summary for the coder

Read Section 6. Do W1.0-1 through W1.0-5 as one branch. That is the ship.

The founder proposed CKEditor 5 or TinyMCE plus html-docx-js. This doc rejects that and endorses what is already in the codebase: Tiptap v3.23.4 with the existing extension set, the `StructuredDocument` intermediate tree, the four programmatic renderers, and the Puppeteer PDF path. The single missing piece is a `render-html-docx` endpoint and mounting the existing `DocEditor` on `/offer/success`. Do those and the marketplace becomes a proper editor product on the same pipeline the AI Administrator already uses.

Do not install html-docx-js. Do not sign CKEditor Premium. Do not sign TinyMCE Professional. Do not build a contenteditable editor from scratch. Do not embed Word Online or Google Docs.

End of decision doc.
