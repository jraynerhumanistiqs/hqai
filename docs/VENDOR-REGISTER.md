# HQ.ai - Sub-processor and Vendor Register

Last updated: 15 May 2026
Owner: Jimmy Rayner

This register is the source-of-truth list of every third party that touches
candidate or business personal information processed through HQ.ai. It
satisfies APP 8 cross-border disclosure obligations and supports the
"sub-processor list" requested by clients in DPA negotiations.

For each vendor, status against the four standard data-protection questions:
- **Data:** what personal information they receive
- **Purpose:** why they receive it
- **Retention:** how long they keep it
- **Training:** whether they may use the data to train their own models
- **DPA:** whether a Data Processing Agreement is in place
- **Jurisdiction:** where they are domiciled
- **Config:** where they are wired up in this repo

Update this file whenever a vendor is added, removed, or their data
posture changes. Mirror any change in the user-facing privacy policy at
`app/privacy/page.tsx` Section 5.

---

## Supabase Inc.

- **Data:** All business + candidate PII including names, emails, CVs (as
  text), AI scoring outputs, video URLs (references only - videos
  themselves live on Cloudflare Stream), conversation history, audit logs.
- **Purpose:** Primary database, authentication, file storage.
- **Retention:** Permanent until we delete. Backups retained ~30 days.
- **Training:** No - Supabase is infrastructure, not an AI provider.
- **DPA:** Supabase publishes a standard DPA. **TODO:** counter-sign and
  file the signed copy.
- **Jurisdiction:** USA (corporate). Data hosted in AWS ap-southeast-2
  (Sydney) on our project tier - confirm in Supabase project settings.
- **Config:** `lib/supabase/{admin,server,client}.ts`, `middleware.ts`
- **Cross-border notice:** Yes (USA corporate, AU data hosting).

## Vercel Inc.

- **Data:** Application logs, request/response metadata. Does not see
  HTTP request bodies for our API routes. May briefly see incoming HTTP
  bodies in transit for caching layers - none of our endpoints opt in
  to edge caching.
- **Purpose:** Application hosting + content delivery.
- **Retention:** Function logs ~30 days; request analytics ~30-90 days
  depending on plan.
- **Training:** No.
- **DPA:** Vercel publishes a standard DPA. **TODO:** counter-sign.
- **Jurisdiction:** USA. Edge servers globally, including Sydney.
- **Config:** `vercel.json`, deployment is implicit via the repo
- **Cross-border notice:** Yes.

## Anthropic PBC (Claude)

- **Data:** Candidate name (only on per-candidate scoring; chat is
  un-blinded), CV text (with PII blinded - see `app/api/cv-screening/score/route.ts`
  blindNameInText / blindPII helpers), video transcript text, chat
  content, role rubric content.
- **Purpose:** AI chat (HQ People AI Advisor), CV scoring, video
  pre-screen scoring, structured question generation.
- **Retention:** **Zero-retention API tier** - Anthropic does not retain
  prompts or outputs from API calls beyond the 30 days they need for
  abuse monitoring (per their commercial terms). **TODO:** confirm we
  are on the commercial tier (we are - API key has `claude-sonnet-4-`
  access). Capture an attestation in writing.
- **Training:** **NO** - Anthropic's commercial API terms explicitly
  state API content is not used to train models.
- **DPA:** **TODO:** request and file Anthropic's commercial DPA.
- **Jurisdiction:** USA.
- **Config:** `lib/claude-scoring.ts`, `app/api/chat/route.ts`,
  `app/api/cv-screening/score/route.ts`, `app/api/cv-screening/handoff/route.ts`
- **Cross-border notice:** Yes.

## OpenAI LLC (Embeddings only)

- **Data:** Query text only. We send the user's search query (or the
  model's tool-generated query) to OpenAI to compute a 1536-dimensional
  embedding vector for our RAG corpus search. **No CV or candidate
  content is sent to OpenAI.**
- **Purpose:** Text embeddings for AU employment-law knowledge-base
  search.
- **Retention:** Per OpenAI commercial API terms - no training, 30 days
  abuse log retention.
- **Training:** No (commercial API).
- **DPA:** **TODO:** confirm we are using the API not ChatGPT path,
  request DPA.
- **Jurisdiction:** USA.
- **Config:** `lib/rag.ts:33-56`
- **Cross-border notice:** Yes (low data sensitivity since no candidate
  data flows here).

## Cloudflare Inc. (Stream)

- **Data:** Candidate video recordings (encoded MP4 + thumbnails),
  internal video UID references stored in our DB.
- **Purpose:** Video upload + transcoding + secure playback storage.
- **Retention:** Stored indefinitely until our retention job deletes via
  the Cloudflare API (see `app/api/prescreen/sessions/[id]/purge/route.ts`
  and the new `app/api/cron/retention-purge/route.ts`). Cloudflare's
  contractual retention policy aligns with our deletion calls.
- **Training:** No - infrastructure provider, not an AI provider.
- **DPA:** Cloudflare publishes a standard DPA. **TODO:** confirm filed.
- **Jurisdiction:** USA. Edge nodes worldwide; viewing region is the
  closest edge to the candidate.
- **Config:** `lib/cloudflare.ts`, `app/api/prescreen/videos/upload-url/route.ts`
- **Cross-border notice:** Yes.

## Deepgram Inc.

- **Data:** Candidate video audio (we send a Cloudflare Stream MP4 URL;
  Deepgram fetches and transcribes it).
- **Purpose:** Speech-to-text transcription with diarisation timestamps.
- **Retention:** Per Deepgram commercial terms - API submissions are not
  retained beyond the transcription window. **TODO:** confirm setting
  and capture attestation.
- **Training:** Configurable. Deepgram Nova-3 commercial API has a
  no-training setting. **TODO:** confirm our account has the model
  improvement opt-out flag set.
- **DPA:** **TODO:** request and file.
- **Jurisdiction:** USA.
- **Config:** `lib/deepgram.ts`
- **Cross-border notice:** Yes.

## Resend Inc.

- **Data:** Candidate email address, candidate name, transactional
  email content (invite link, submission confirmation, daily digest).
- **Purpose:** Transactional email delivery.
- **Retention:** Email metadata retained ~30 days for delivery
  diagnostics, plain-text body content per Resend retention settings.
- **Training:** No.
- **DPA:** Resend publishes a standard DPA. **TODO:** counter-sign.
- **Jurisdiction:** USA.
- **Config:** `lib/email.ts`
- **Cross-border notice:** Yes.

## Stripe Inc.

- **Data:** Business owner billing details only - name, email, business
  address, payment card token. **No candidate data is ever sent to
  Stripe.**
- **Purpose:** Subscription billing.
- **Retention:** Per Stripe terms - tax/financial regulatory retention.
- **Training:** No.
- **DPA:** Stripe publishes a standard DPA. **TODO:** counter-sign.
- **Jurisdiction:** USA, Ireland.
- **Config:** `lib/stripe.ts`, `app/api/stripe/*`
- **Cross-border notice:** Yes (but candidate data is not in scope).

---

## Outstanding actions

- [ ] Anthropic commercial DPA - request, counter-sign, file
- [ ] OpenAI commercial DPA - request, counter-sign, file
- [ ] Cloudflare DPA - confirm filed
- [ ] Deepgram DPA - request, counter-sign, file
- [ ] Deepgram - confirm "improve model" opt-out is OFF on our account
- [ ] Resend DPA - counter-sign
- [ ] Stripe DPA - counter-sign
- [ ] Supabase DPA - counter-sign
- [ ] Vercel DPA - counter-sign
- [ ] Add Anthropic zero-retention attestation to this file once received
- [ ] Confirm Supabase project is hosted in ap-southeast-2 (Sydney)

## Reviewer notes

- This register MUST stay in sync with the user-facing list in
  `app/privacy/page.tsx` Section 5. If you add or remove a vendor here,
  update the privacy page in the same commit.
- A change to retention or training posture is a material privacy
  policy change - bump POLICY_VERSION in `app/privacy/page.tsx` and
  email active business users per APP 1.
