# Job Board Integration Research

How HQ.ai can let Campaign Coach push a `JobAdDraft` from a Campaign Coach session out to the four major Australian job boards: SEEK, LinkedIn, Indeed, and Jora. Includes a phased v1 specification we can ship in a 2-3 week window.

Author: Research agent
Date: 2026-05-10
Audience: HQ.ai engineering and product
Source artefact: `lib/campaign-types.ts` (`JobAdDraft`, `RoleProfile`, `DistributionPlan`)

---

## 1. Problem statement

Today Campaign Coach produces a structured `JobAdDraft` plus a `RoleProfile` and publishes a careers microsite at `/careers/[business_slug]/[campaign_slug]` with Schema.org `JobPosting` JSON-LD. The candidate apply flow lands on that microsite. We do not currently push the role to any external board, so SMEs still have to re-key the same content into SEEK, Indeed, LinkedIn, and Jora. That is the workflow gap this research addresses.

The structured input we have to work with is already board-friendly:

- `RoleProfile.title`, `alt_titles`, `level`, `contract_type`, `hours_per_week`
- `RoleProfile.location { suburb, state, postcode, remote }`
- `RoleProfile.salary { min, max, currency, super_inclusive }`
- `RoleProfile.award { code, name, classification, min_weekly_rate }`
- `JobAdDraft.blocks { overview, about_us, responsibilities[], requirements{must,nice}, benefits[], apply_cta }`

The aggregator-friendly shape is mostly there. The work is mapping enums, picking the right integration channel per board, and handling the apply flow.

---

## 2. Per-board integration paths

### 2.1 SEEK

| Aspect | Detail |
|---|---|
| Channels available | (1) SEEK API for Job Posting via the SEEK Developer Portal, gated to approved partners. (2) Manual paste in SEEK Hirer dashboard. There is no public XML feed and no scrape-friendly path. |
| Auth model | OAuth 2.0 client credentials grant against the SEEK partner platform. Each hirer also authorises the partner via a hirer-relationship call. See https://developer.seek.com/use-cases/hirer-api/job-posting/ . |
| Eligibility | SEEK only opens API access to approved ATS, recruitment platform, or job-multiposter vendors. Application is via https://developer.seek.com/contact . They look for: existing hirer base, a real product (not a single ad campaign), and a partnership case. Approval timeline is typically 8-16 weeks [unverified - based on industry chatter] including a sandbox test, certification, and contract. |
| Pricing exposed to SME | SEEK ads are paid by the hirer per ad. Tiers are Classic, StandOut, and Premium with prices ranging roughly AUD $300 to $1,000 per ad depending on industry and location (https://www.seek.com.au/employer/products-and-prices/). HQ.ai cannot mark up SEEK ads - billing is the hirer's own SEEK account. We surface estimated cost in `DistributionPlan.estimated_cost_aud` and link out for billing. |
| Data shape | Required: `positionTitle`, `positionFormattedDescription` (HTML), `positionLocation` (SEEK location ID, not free text), `positionOrganisations` (advertiser ID), `positionProfile` (work type enum: `FullTime`, `PartTime`, `Casual`, `Contract`), `positionClassifications` (SEEK classification + subClassification IDs), `salary { type: AnnualPackage|HourlyRate, minimumAmount, maximumAmount, currency }`, optional `applicationMethod { applicationUri }`. Reference: https://developer.seek.com/schema/#/named-type/PostingInstruction . |
| Apply flow | Either (a) apply on SEEK using SEEK's standard apply form (candidate data is delivered to the partner via a webhook on the Application Export API), or (b) "ApplyWithLink" which redirects the candidate to an external URL such as our `/careers/[slug]` microsite. SEEK strongly prefers apply-on-SEEK because it preserves their candidate experience and tracking. ApplyWithLink is allowed but reduces ad performance. |
| Compliance / moderation | SEEK enforces no discriminatory language, no salary below minimum award, and no contact details in the body. Their moderation team can suspend ads. Campaign Coach's `CoachScore` already covers most of this. |

### 2.2 LinkedIn

| Aspect | Detail |
|---|---|
| Channels available | (1) Limited Listings (free, unsponsored, organic) via the LinkedIn Job Posting API or the basic XML feed. (2) Sponsored Jobs via the same Job Posting API with a budget object attached (CPC/budgeted). (3) Manual post on a Company Page. See https://learn.microsoft.com/en-us/linkedin/talent/job-postings/ . |
| Auth model | OAuth 2.0 three-legged flow with the `w_member_social` and `r_jobs` scopes plus the Talent Solutions partner program. You also need `r_basicprofile` for the account owner. Tokens are 60-day refresh. |
| Eligibility | LinkedIn requires partnership approval through the Talent Solutions team to access the Job Posting API. Limited Listings is the gentler tier; Sponsored Jobs needs additional contractual approval. Apply via https://learn.microsoft.com/en-us/linkedin/talent/getting-started . Approval takes around 4-8 weeks for Limited Listings, longer for Sponsored [unverified]. |
| Pricing exposed to SME | Limited Listings are free to the SME but appear lower in search and are de-prioritised after 30 days. Sponsored Jobs run on a daily budget (CPC, typical AUD $10-50/day). The hirer's billing is on their own LinkedIn account, the partner cannot mark up. |
| Data shape | Required fields: `companyId` or `companyName`, `title`, `description` (HTML, 200-25000 chars), `location { country, postalCode, city }`, `listingType` (`BASIC` for limited, `PREMIUM` for sponsored), `workplaceTypes` (`on-site`, `remote`, `hybrid`), `employmentStatus` (`FULL_TIME`, `PART_TIME`, `CONTRACT`, `TEMPORARY`, `INTERNSHIP`, `VOLUNTEER`), `industries[]`, `jobFunctions[]`. LinkedIn-specific extras: `remoteAllowed` boolean, `experienceLevel`, `companyApplyUrl` for redirect. |
| Apply flow | Both apply-on-LinkedIn (Easy Apply) and apply-via-redirect (`companyApplyUrl`) are supported. Easy Apply submits candidate JSON to a webhook the partner registers. Redirect is the simplest for HQ.ai - send candidates back to `/careers/[slug]`. |
| Compliance / moderation | LinkedIn Job Posting Policies forbid discriminatory wording, MLM roles, gig work without disclosure, and inflated salary claims. They auto-flag short or low-quality descriptions. https://www.linkedin.com/help/linkedin/answer/a415748 |

### 2.3 Indeed

| Aspect | Detail |
|---|---|
| Channels available | (1) XML feed (free indexing, free Indeed organic). Indeed crawls a publisher feed on a schedule. (2) Sponsored Jobs API for paid CPC promotion. (3) Indeed Apply API for apply-on-Indeed candidate capture. (4) Direct posting in the Indeed employer dashboard. See https://docs.indeed.com/ and https://au.indeed.com/hire . |
| Auth model | XML feed: no auth, just a publicly accessible URL Indeed crawls. Sponsored Jobs API and Indeed Apply API: OAuth 2.0 with publisher credentials issued after onboarding. |
| Eligibility | XML feed has the lowest bar - any employer or platform with hosted job pages can submit a feed for indexing via https://employers.indeed.com/p#post/free-jobs/in . Approval is usually 1-2 weeks. Sponsored Jobs API and Indeed Apply API need partnership onboarding which is typically 4-8 weeks. |
| Pricing exposed to SME | Organic listings via XML are free. Sponsored Jobs are CPC, usually AUD $0.30 - $2.00 per click, with a daily budget the SME sets. Most Indeed posts now require some sponsorship to get visibility - Indeed has been throttling free organic in 2024-2025. |
| Data shape | XML schema: `<job>` element with `<title>`, `<date>`, `<referencenumber>`, `<url>`, `<company>`, `<city>`, `<state>`, `<country>`, `<postalcode>`, `<description>` (HTML in CDATA), `<salary>`, `<jobtype>` enum (`fulltime`, `parttime`, `contract`, `temporary`, `internship`, `commission`, `apprenticeship`), `<category>`, `<experience>`, optional `<remotetype>`, `<indeed-apply-data>` (Base64 JSON for Indeed Apply). Reference: https://docs.indeed.com/job-feeds-and-applies/jobs/job-feed-structure . |
| Apply flow | Default is apply-via-redirect (the `<url>` in the XML). Indeed Apply is opt-in by including `<indeed-apply-data>` and registering a postback endpoint that receives candidate JSON. Both can coexist. |
| Compliance / moderation | Indeed has strict rules on duplicate jobs, expired URLs, missing salary in jurisdictions that require it, and "ghost jobs". Salary disclosure is now mandatory in some jurisdictions and Indeed will down-rank jobs without it. https://employers.indeed.com/job-quality |

### 2.4 Jora

| Aspect | Detail |
|---|---|
| Channels available | (1) XML feed (free, the standard onboarding path). (2) Scraping (Jora aggregates from public careers pages but this is not a controllable channel). (3) Manual post. See https://au.jora.com/ and https://au.jora.com/employer . |
| Auth model | XML feed is unauthenticated. Jora pulls from a publisher URL on a schedule (usually daily). |
| Eligibility | Jora is owned by SEEK and is essentially an aggregator. Onboarding a new publisher feed is informal - email partnerships@jora.com with the feed URL and sample. Approval is typically 1-3 weeks [unverified]. |
| Pricing exposed to SME | Free for organic listings via the feed. Jora's only paid product is a small CPC sponsored placement which is rarely used - the hirer can ignore it. |
| Data shape | Same as Indeed XML in practice (Jora supports both Indeed-style and HR-XML). Required: `title`, `description`, `location`, `company`, `url`, `referencenumber`, `date`, optional `salary`, `jobtype`. |
| Apply flow | Apply-via-redirect only. The `url` element points back to `/careers/[slug]`. There is no apply-on-Jora flow worth integrating. |
| Compliance / moderation | Light. Jora occasionally rejects duplicate or expired ads. They mirror SEEK's basic rules on contact details and discriminatory wording. |

---

## 3. Summary table

| Board | Easiest channel | Auth | SME cost | Vendor approval bar | Apply flow | Eng days |
|---|---|---|---|---|---|---|
| Jora | XML feed | None | Free | Low (email contact) | Redirect | 2-3 |
| Indeed | XML feed | None for organic; OAuth for sponsored | Free organic; CPC sponsored | Low for organic; Medium for sponsored | Redirect or Indeed Apply | 3-5 (organic) + 5-8 (Indeed Apply) |
| LinkedIn | Limited Listings API | OAuth 2.0 + partner | Free for limited; budgeted for sponsored | Medium-High | Redirect or Easy Apply | 8-12 |
| SEEK | Job Posting API | OAuth 2.0 + partner | $300-$1000+ per ad on hirer account | High (8-16 weeks approval) | SEEK apply preferred; redirect allowed | 15-25 + months of partner approval lead time |

---

## 4. Data mapping from `JobAdDraft` and `RoleProfile`

The Campaign Coach output already lines up with most board fields. The translation work per board:

| Source field | SEEK | LinkedIn | Indeed XML | Jora XML |
|---|---|---|---|---|
| `role_profile.title` | `positionTitle` | `title` | `<title>` | `<title>` |
| `role_profile.alt_titles[]` | not used | `alternateJobTitles` | not used | not used |
| `role_profile.location.suburb` + `state` | `positionLocation` (must look up SEEK location ID) | `location.city` + `country: AU` | `<city>` + `<state>` | `<city>` + `<state>` |
| `role_profile.location.remote` | `workArrangement` enum | `workplaceTypes` | `<remotetype>` | `<remotetype>` |
| `role_profile.contract_type` | `positionProfile.workType` | `employmentStatus` | `<jobtype>` | `<jobtype>` |
| `role_profile.salary.min/max` | `offeredRemunerationPackage.ranges[]` | `compensation.min/max` | `<salary>` | `<salary>` |
| `role_profile.salary.super_inclusive` | `description` text | `description` text | `description` text | `description` text |
| `role_profile.award.classification` | `positionClassifications[]` (must map to SEEK taxonomy) | `industries[]` + `jobFunctions[]` | `<category>` | `<category>` |
| `job_ad_draft.blocks.*` (concatenated) | `positionFormattedDescription` (HTML) | `description` (HTML) | `<description>` (CDATA HTML) | `<description>` (CDATA HTML) |
| `apply_url` (microsite) | `applicationMethod.applicationUri` | `companyApplyUrl` | `<url>` | `<url>` |
| `campaign_id` | `positionUri` reference | `externalJobId` | `<referencenumber>` | `<referencenumber>` |

The work that needs new code:

1. **Enum mapping module** (`lib/job-boards/enums.ts`) - translate `RoleProfile.contract_type` into each board's enum, and `location.remote` into each board's workplace type.
2. **HTML body composer** (`lib/job-boards/body.ts`) - take the `JobAdDraft.blocks` and produce a sanitised HTML body using `<h3>`, `<ul>`, `<p>` only (LinkedIn and SEEK both restrict tags).
3. **SEEK location resolver** (`lib/job-boards/seek-locations.ts`) - SEEK requires a numeric location ID, not free text. We will need a static lookup table seeded from SEEK's location reference data.
4. **SEEK classification resolver** - same problem, SEEK has its own taxonomy of `classification` and `subClassification` IDs that we map from `RoleProfile.award.classification` plus `level`. Probably an LLM-assisted mapper that we cache per role title.

---

## 5. Apply-flow constraints

This is the area where boards differ most. The summary:

- **SEEK** strongly prefers apply-on-SEEK. ApplyWithLink works but ranks lower and is increasingly throttled. If we go ApplyWithLink, we send candidates to `/careers/[slug]` and lose SEEK's tracking. If we go apply-on-SEEK, we have to register a webhook for the SEEK Application Export API and ingest candidates into `prescreen_sessions`.
- **LinkedIn** treats both flows equally. Easy Apply gives a richer candidate object (LinkedIn profile data) but we then have to comply with LinkedIn's data retention rules. Redirect is simpler.
- **Indeed** defaults to redirect. Indeed Apply is optional and gives a Base64-encoded postback we register in our publisher account. Indeed strongly nudges sponsored jobs into Indeed Apply.
- **Jora** is redirect only.

**Recommended posture for v1:** redirect everywhere. The apply target is always `/careers/[slug]`. We instrument that page with `utm_source` so we can attribute applications back to the originating board. This lets us avoid building four candidate-ingest webhooks in v1.

**v2 posture:** add Indeed Apply postback (low effort, high value because Indeed is throttling redirect-only ads). Then SEEK Application Export. LinkedIn Easy Apply last.

---

## 6. Compliance and trust signals

Most board moderation rules are already covered by Campaign Coach's `CoachScore`:

- No discriminatory wording (`inclusivity` axis)
- Salary at or above the minimum award (`legal` axis, uses `RoleProfile.award.min_weekly_rate`)
- No contact details in the body (we strip these in the prompt)
- Reading grade and clarity (`clarity` axis)

Board-specific extras to enforce before push:

| Board | Extra rule | Where to enforce |
|---|---|---|
| SEEK | Salary range cannot be wider than 2x (e.g. $50k-$100k is rejected). No "competitive" without numbers. No external URLs in body. | Pre-flight check in the SEEK adapter |
| LinkedIn | Description >= 200 chars, <= 25000 chars. No emojis in title. | Pre-flight check in the LinkedIn adapter |
| Indeed | Mandatory salary in jurisdictions that require it (NSW from 2026 if the proposed bill passes [unverified]). No duplicate jobs across feeds. | Salary requirement in the body composer; dedupe by `referencenumber` |
| Jora | Same as Indeed | Same |

We add a `lib/job-boards/preflight.ts` that runs board-specific validators and returns warnings or hard blocks before the push. The result feeds into the existing `DistributionPlan` UI so the SME sees per-board status before launch.

---

## 7. Recommended sequence

| Phase | Boards | Why |
|---|---|---|
| **v1 (2-3 weeks)** | Jora XML, Indeed XML (organic) | Lowest auth bar, fastest approval, no per-ad cost to the SME, real visible distribution. Both are unauthenticated XML feeds we host at `/api/job-feeds/jora.xml` and `/api/job-feeds/indeed.xml`. |
| **v1.5 (4-6 weeks)** | LinkedIn Limited Listings | Free to the SME, OAuth flow but Limited Listings has a softer approval bar than Sponsored. Adds the LinkedIn brand to our distribution chip set. |
| **v2 (8-12 weeks)** | Indeed Apply postback, LinkedIn Sponsored, deep-link "post to SEEK" prefill (open SEEK Hirer with body pre-filled via clipboard) | Adds candidate ingest from Indeed (high-volume board) and lets SMEs spend on LinkedIn through HQ.ai. SEEK still requires manual paste at this stage. |
| **v3 (3-6 months)** | SEEK Job Posting API + Application Export | Needs the SEEK partner approval cycle. Worth pursuing because SEEK is still the dominant Australian board for SME hiring. |

---

## 8. Cost and effort estimates

Engineering days, single full-stack engineer, including tests and migration to add a `job_board_pushes` table:

| Work item | Eng days | Ongoing maintenance |
|---|---|---|
| Jora XML feed endpoint + dedupe + admin onboarding email | 2-3 | Low - feed format is stable. Re-validate quarterly. |
| Indeed XML feed endpoint (reuse 80% of Jora code) | 1-2 | Low |
| Body composer + enum mapping + preflight validators | 3-4 | Medium - moderation rules drift. Quarterly review. |
| `DistributionPlan` UI changes (per-board status, copy-paste fallback) | 2-3 | Low |
| `job_board_pushes` Supabase table + RLS + push log | 1 | Low |
| LinkedIn Limited Listings OAuth + push | 6-8 | Medium - 60-day token rotation, status polling, error reconciliation |
| Indeed Apply postback ingest into `prescreen_sessions` | 4-5 | Medium - postback signature verification, idempotency |
| LinkedIn Sponsored budget UI + billing surfacing | 4-6 | Medium |
| SEEK partner approval (non-eng) | 0 eng days but 8-16 weeks of partnership work | High - certification re-runs, schema changes |
| SEEK Job Posting API + Application Export webhook | 12-18 | High - SEEK changes their schema annually, location and classification taxonomies drift |

**v1 total: 9-13 eng days.** Achievable in a 2-3 week sprint with one engineer.
**v1.5 add-on: 6-8 days.** A second sprint.
**v2 add-on: 8-11 days.** A third sprint.
**v3: 12-18 days plus the months-long approval lead time.**

---

## 9. Build vs aggregator

The third-party multiposter market is mature. Notable options:

| Aggregator | Coverage | Pricing model | Fit for HQ.ai |
|---|---|---|---|
| **BroadBean** (CareerBuilder) | 1500+ boards including SEEK, LinkedIn, Indeed | Per-posting credit pricing, typical AUD $15-30 per post wholesale, plus a setup fee | Established, good SEEK access, but enterprise-style contracts. https://www.broadbean.com/ |
| **JobAdder Multiposter** | SEEK, LinkedIn, Indeed, Jora and ~300 others | Bundled with the JobAdder ATS subscription | Strong if we wanted to white-label JobAdder, but they are a competitor in the SME ATS space |
| **Pinpoint** | SEEK, LinkedIn, Indeed | Bundled with their ATS | Same competitor concern |
| **LiveHire** | Australian-focused multiposter + talent CRM | Enterprise | Overkill |
| **Workable** | International multiposter | Bundled with ATS | Not a clean partner play |
| **Idibu** | UK-origin multiposter, growing AU coverage | Per-posting credits, ~AUD $10-20 wholesale | Cleanest pure-multiposter API. https://idibu.com/ |
| **VONQ / Recruitics** | Programmatic job ad spend manager | CPC plus management fee | Useful for sponsored optimisation, not for organic posting |

**Trade-off summary:**

- **Aggregator pros:** instant SEEK access (no 16-week approval cycle), a single API to integrate, board-side schema drift handled by the vendor, faster v1.
- **Aggregator cons:** per-post cost cuts into HQ.ai margin or pushes cost onto the SME, brand-on-brand dependency, less control over apply flow, candidate webhooks vary by aggregator, lock-in.

**Recommendation:** for v1 and v1.5 build the XML feeds and LinkedIn ourselves - it is cheap and gives us product surface area. For SEEK access ahead of v3, evaluate Idibu or BroadBean as a SEEK shortcut so we can offer "post to SEEK" in v2 without waiting on the partner cycle. Then back out of the aggregator once our own SEEK API approval lands.

---

## 10. Concrete v1 recommendation

Smallest viable cut that gives Campaign Coach real cross-posting in 2-3 weeks:

### v1 feature list

1. New table `job_board_pushes` linked to `campaigns` row with columns: `board_id`, `status` (`pending` | `live` | `expired` | `error`), `external_id`, `pushed_at`, `last_seen_at`, `error_reason`.
2. Public XML feed endpoints, multi-tenant by query string:
   - `GET /api/job-feeds/indeed.xml` returns all `campaigns` with `status='launched'` and `distribution_plan.boards` containing `indeed`.
   - `GET /api/job-feeds/jora.xml` same shape, filtered for `jora`.
   - Both use the Indeed XML schema (Jora accepts it).
3. Body composer module `lib/job-boards/body.ts` that takes a `JobAdDraft` and `RoleProfile` and produces a sanitised HTML body suitable for both feeds, with appended salary line, work type line, and a "Apply at" CTA back to the `/careers` URL.
4. Enum mapper module `lib/job-boards/enums.ts` covering `contract_type` and `remote` mappings for Indeed XML.
5. Preflight validator `lib/job-boards/preflight.ts` enforcing salary range width, body length, and discriminatory term checks before a campaign can be marked `launched` with Indeed or Jora selected.
6. UI changes to the existing Campaign Coach Distribute step:
   - Per-board status chip (Pending crawl, Live, Error)
   - Copy-paste fallback button for SEEK and LinkedIn that copies the rendered body and opens the relevant Hirer dashboard
   - Estimated cost surfaced from `DistributionPlan.estimated_cost_aud`
7. Admin runbook `docs/JOB-BOARD-OPERATIONS.md` describing how to register the feed URLs with Indeed (https://employers.indeed.com/p#post/free-jobs/in) and Jora (partnerships@jora.com).
8. UTM parameters auto-appended to apply URLs so we can attribute candidate sources in `candidate_responses`.

### Acceptance criteria

- A user completing the Campaign Coach wizard with Indeed and Jora selected sees both boards in the Distribute step.
- The XML feed endpoint returns a valid Indeed-schema XML when called by an unauthenticated client.
- A test job posted to a sandbox Indeed publisher account is indexed within 48 hours and renders correctly (title, location, salary, body, apply URL).
- The same job appears on Jora within 7 days of registering the feed.
- A campaign that fails preflight (e.g. salary range > 2x) shows a blocking warning and cannot be launched with Indeed or Jora selected.
- Clicking Apply on the live Indeed listing redirects to `/careers/[slug]?utm_source=indeed` and the resulting candidate response is tagged `source='indeed'`.
- An admin can mark a campaign expired and the next feed crawl drops the job.
- A campaign that is `archived` is not in the feed.

### 2-3 week phased plan

**Week 1 - Foundations**
- Day 1-2: Schema migration for `job_board_pushes`, RLS policies, `DistributionPlan` UI plumbing.
- Day 3-4: Body composer + enum mapper + preflight, with unit tests.
- Day 5: UTM tagging on apply URLs, `source` column on `candidate_responses`.

**Week 2 - Feeds and UX**
- Day 6-7: `/api/job-feeds/indeed.xml` and `/api/job-feeds/jora.xml` endpoints with caching and dedupe by campaign ID.
- Day 8: Distribute step UI - per-board chips, copy-paste fallback for SEEK and LinkedIn.
- Day 9: Admin runbook, end-to-end test against Indeed sandbox.
- Day 10: Internal QA on a real campaign.

**Week 3 - Soft launch and operate**
- Day 11: Register feeds with Indeed and Jora partnerships teams.
- Day 12-13: Monitor first crawl, fix any rejected ads, document moderation outcomes.
- Day 14-15: Add the `expired` lifecycle, retention rules, and a daily cron to mark old campaigns expired in the feed.

Beyond v1, the LinkedIn Limited Listings work in v1.5 reuses the body composer and preflight modules unchanged - the only new work is the OAuth flow and a per-tenant token store.

---

## 11. Open questions and risks

- **SEEK partner approval lead time** is the single biggest risk to a "post to SEEK" promise. We should start the partner application now in parallel with v1 build so the clock is ticking.
- **Indeed organic throttling** is real. v1 will work but we should set expectations with SMEs that high-visibility distribution requires sponsored. The CPC sponsored API is a v2 unlock.
- **Salary disclosure laws** are tightening across Australian jurisdictions. We should treat salary as required not optional in the preflight even where the law has not landed yet.
- **Multi-tenant feed scaling.** A single XML feed endpoint with hundreds of jobs is fine; if we cross 5,000 active jobs we should partition the feed per business or paginate.
- **Aggregator decision point** for SEEK. Decide at end of v2 whether to wait on direct SEEK approval or shortcut via Idibu/BroadBean.

---

## 12. References

- SEEK Developer Portal: https://developer.seek.com/
- SEEK Job Posting use case: https://developer.seek.com/use-cases/hirer-api/job-posting/
- SEEK schema reference: https://developer.seek.com/schema/
- LinkedIn Talent Solutions: https://learn.microsoft.com/en-us/linkedin/talent/
- LinkedIn Job Posting policies: https://www.linkedin.com/help/linkedin/answer/a415748
- Indeed publisher docs: https://docs.indeed.com/
- Indeed free job posting: https://employers.indeed.com/p#post/free-jobs/in
- Indeed job feed schema: https://docs.indeed.com/job-feeds-and-applies/jobs/job-feed-structure
- Jora employer: https://au.jora.com/employer
- Schema.org JobPosting: https://schema.org/JobPosting
- Idibu multiposter: https://idibu.com/
- BroadBean: https://www.broadbean.com/

Items marked `[unverified]` reflect industry timelines that are not formally published by the vendor.
