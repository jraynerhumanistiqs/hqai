# Job Board Integration Research

How HQ.ai can let Campaign Coach clients post drafts directly to their own SEEK, LinkedIn, Indeed, and Jora accounts.

Author: Research agent
Date: 2026-05-08
Status: Draft for product review
Audience: HQ.ai product, eng, GTM

---

## 1. Executive summary

HQ.ai's Australian SME customers want one button that says "post this draft to my job boards". The four boards that matter in AU are SEEK (dominant), LinkedIn (second), Indeed (a distant third for AU SMEs), and Jora (aggregator, fourth). All four offer some form of programmatic posting, but the gating, pricing, and effort to integrate are wildly different.

Bottom line: HQ.ai cannot ship four direct integrations on day one and should not try. The realistic path is a layered rollout - deep links for V1, SEEK direct + Indeed Job Sync for V2, LinkedIn Simple Job Postings (or a meta-aggregator) for V3 - with a clear narrative to clients that frames the V1 as "post to all your boards" via guided redirection while real direct integrations land behind the same UI.

---

## 2. Per-board landscape

### 2.1 SEEK (au.seek.com)

- **API availability**: Yes. SEEK Developer Site exposes a GraphQL-based API for Job Posting, Optimised Apply, Apply with SEEK, and the Ad Performance Panel. See [developer.seek.com](https://developer.seek.com/) and [SEEK introduction docs](https://developer.seek.com/introduction).
- **Authentication**: OAuth 2.0 client credentials flow plus per-hirer "hirer relationships" that SEEK must explicitly provision. Each customer (hirer) has to be linked to your partner account on the SEEK side before you can post on their behalf. See [Auth](https://developer.seek.com/auth) and [Hirer relationships](https://developer.seek.com/auth/hirer-relationships).
- **Pricing per post**: SEEK uses variable pricing per job ad (driven by salary, role competitiveness, location, candidate supply). Tiers are Basic, Branded (Advanced), and Premium, with a "Concierge" wrap. Public guides quote roughly AUD 250 to AUD 500 for Basic and AUD 400 to AUD 900+ for Premium per ad in 2026, but the actual figure must be looked up via SEEK's price-lookup tool. See [SEEK pricing help](https://help.seek.com.au/employer/s/article/How-much-does-it-cost-to-post-a-job-ad) and [11 Recruitment guide](https://11recruitment.com.au/advice/how-much-does-it-cost-to-advertise-on-seek/). Actual prices [unverified] for any given role.
- **Posting modes**: Programmatic via API only (no public CSV/XML feed for posting). ATS partners post on behalf of hirers.
- **Gating criteria**: SEEK runs a seven-stage partner onboarding (review terms, fill integration request form, get a Partner Manager, get Playground creds, build, certify, request live creds). Live credentials are not granted until SEEK approves the integration. SEEK explicitly favours integrations with proven hirer demand or an ATS-style use case. There is no self-serve "spin up an API key in 10 minutes" path. See [SEEK Developer site](https://developer.seek.com/) and the [APIscene write-up of the platform](https://www.apiscene.io/graphql/seek-establishing-a-new-api-integration-platform/).

### 2.2 LinkedIn

- **API availability**: Yes - the [Job Posting API](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview?view=li-lts-2026-03) (Simple Job Postings) and [Recruiter System Connect](https://learn.microsoft.com/en-us/linkedin/talent/recruiter-system-connect?view=li-lts-2025-10).
- **Authentication**: OAuth 2.0. The Job Posting API uses client-credentials tokens with a 30-minute lifespan; RSC additionally uses 3-legged OAuth on the customer side. See [Microsoft Learn overview](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview?view=li-lts-2026-03).
- **Pricing per post**: BASIC (free) postings are supported via `listingType: BASIC`. Promoted posts use pay-per-click with daily-budget minimums (commonly USD 7-10/day, USD 1.50-4.50 average CPC, ~USD 2.83 per applicant in published guides). Job Slots (enterprise) run USD 200-1,000/slot/month. AU-specific pricing is not published [unverified]. See [LinkedIn billing FAQ](https://www.linkedin.com/help/linkedin/answer/a517695/billing-for-pay-per-click-job-posts-faqs) and [Pin's pricing breakdown](https://www.pin.com/blog/linkedin-job-posting-pricing/).
- **Posting modes**: Simple Job Postings API (batch up to 100 per call), `XMLFeedJob` (legacy), or manual via the LinkedIn UI. RSC for two-way sync with an ATS.
- **Gating criteria**: To call the Job Posting API at all you need LinkedIn Talent Solutions Partner status. The partner application is at [business.linkedin.com/talent-solutions/ats-partners/partner-application](https://business.linkedin.com/talent-solutions/ats-partners/partner-application). Industry guides describe a 3-6 month review with an approval rate under 10% (see [scale.jobs writeup](https://scale.jobs/blog/linkedin-api-integration-with-ats-step-by-step-guide)) [partially unverified - LinkedIn does not publish approval stats]. Customers also must be Recruiter admins for RSC features.

### 2.3 Indeed

- **API availability**: Yes - the [Job Sync API](https://docs.indeed.com/job-sync-api/job-sync-api-guide) (organic posting) and the [Sponsored Jobs API](https://docs.indeed.com/sponsored-jobs-api/) (paid promotion). Legacy XML feeds are being phased out: organic XML by 31 March 2026, sponsored XML by end of 2026. See [Indeed docs](https://docs.indeed.com/) and the [SAP community write-up](https://community.sap.com/t5/human-capital-management-blog-posts-by-sap/indeed-s-transition-away-from-xml-feeds-what-sap-successfactors-customers/ba-p/14326692).
- **Authentication**: OAuth 2.0 client credentials for both APIs, plus per-employer authorisation for posting on behalf of an employer.
- **Pricing per post**:
  - Free organic posts: AU employers can post up to 3 free jobs per calendar month, each live for 30 days, then they sink in search. See [Indeed AU pricing](https://au.indeed.com/hire/pricing).
  - Sponsored: pay-per-click, AUD 0.10-5.00+ per click (mostly quoted in USD in third-party sources), AUD 5/day minimum, AUD 25/job floor. See [Indeed AU pricing guide](https://au.indeed.com/hire/resources/howtohub/how-pricing-works-on-indeed).
  - From 1 February 2026 the Sponsored Jobs API charges EUR 3 per call for EU/CH advertisers (not AU [unverified for AU]), per [Indeed docs](https://docs.indeed.com/sponsored-jobs-api/).
- **Posting modes**: Job Sync API (programmatic), Sponsored Jobs API (programmatic, paid), legacy XML feed (sunset for sponsored 2022, organic 2026), manual UI posting. ATS partners are also supported via the same APIs.
- **Gating criteria**: Lighter than SEEK or LinkedIn. Calls to Job Sync API are free and not rate-charged. Indeed prefers ATS-style integrations but does grant API access to legitimate posting partners more readily than the other two.

### 2.4 Jora

- **API availability**: No formal posting API. Jora supports XML feed crawling - you publish an XML feed at a URL Jora can hit, they crawl it on a 2-24 hour cadence. See [Jora AU XML feed guide](https://au.jora.com/cms/get-your-feed-included-on-jora) and [Jora India guide](https://in.jora.com/cms/get-your-jobs-published-on-jora-with-an-xml-feed).
- **Authentication**: None on the publishing side - Jora pulls a public (or HTTP-auth-protected) XML URL.
- **Pricing per post**: 10 free posts/month per advertiser; beyond that posts are free if delivered via XML feed but ranked organically. Sponsored upsells exist but are not the primary path. See the [Jora posting guide](https://au.jora.com/blog/posting-a-job-for-free-on-jora/).
- **Posting modes**: XML feed crawl only (or manual UI post). No programmatic real-time posting endpoint.
- **Gating criteria**: Self-serve. Submit your feed URL via Jora's contact form; minimal review. Jora is also fed indirectly by SEEK (same parent group), so a SEEK ad often reaches Jora regardless.

---

## 3. Recommended integration architecture for HQ.ai

There are three plausible shapes:

### Option A - Direct per-board integrations

Build four adapters: SEEK GraphQL, LinkedIn Simple Job Postings, Indeed Job Sync, Jora XML feed. Pros: best UX, fewest middlemen, owned data. Cons: SEEK and LinkedIn both gate access by partner approval; LinkedIn alone can take 3-6 months. This is a 6-9 month engineering effort before a single AU SME can post end-to-end through HQ.ai.

### Option B - Meta-aggregator (Broadbean, VONQ, or similar)

[Broadbean](https://www.broadbean.com/) reaches 7,000+ boards (including SEEK, LinkedIn, Indeed, Jora) and exposes APIs for partners. [VONQ Job Post](https://www.vonq.com/vonq-job-post/) is the other major option, particularly strong in Europe and integrated with Salesforce. Merge.dev is primarily an ATS unification layer rather than a job-distribution layer; it is the wrong tool for outbound posting [unverified - Merge does not appear to operate a job-distribution rail].

Pros: one contract, one auth flow, instant SEEK+LinkedIn+Indeed+Jora coverage, no partner waitlists. Cons: per-post markup on top of board fees (typically 10-30% [unverified for current Broadbean rates]), commercial minimum spend, dependency on a third party for a critical workflow, and HQ.ai loses some posting telemetry (Broadbean owns the analytics call-back).

### Option C - Deep-link redirect (the "appearance of integration")

Pre-fill each board's compose-job URL with as much of the draft as the board accepts in query parameters (or a clipboard-copy + open-tab pattern), then let the user click through and confirm. The user is logged into their own SEEK / LinkedIn / Indeed account in their browser, so HQ.ai never holds their credentials and never has to be a sanctioned partner.

Pros: zero integration risk, ships in days, no per-post fees, no partner approval, no OAuth dance. Cons: requires a manual click-through per board, no programmatic confirmation that the post went live, no analytics back to HQ.ai unless the customer pastes the live URL back.

### Recommendation

Layer all three. Use C as the V1 default, B as a fast follow when one or two enterprise customers justify the meta-aggregator contract, and A selectively for SEEK once HQ.ai has earned its way to a Partner Manager. The same UI metaphor ("Post to SEEK", "Post to LinkedIn", etc.) covers all three under the hood.

---

## 4. What's realistic for an Australian SME-focused product

AU SME hiring is heavily SEEK-weighted. A typical AU SME running an HQ.ai-drafted role will want SEEK first, LinkedIn second, and only sometimes Indeed/Jora.

### V1 (0-8 weeks): deep-link redirection for all four

- "Post to SEEK" opens SEEK's create-job flow in a new tab with title, location, and description copied to clipboard, plus an inline guide.
- Same pattern for LinkedIn, Indeed, Jora.
- HQ.ai stores the user-pasted live URL once posted, so the dashboard can still show a "live on SEEK" status.
- Zero board partner agreements required.

### V2 (2-5 months): SEEK direct integration + Indeed Job Sync + Jora XML feed

- Apply for SEEK partnership in week 1 of V1 (the clock is long, start it early).
- Build SEEK direct posting once SEEK grants live creds. This is the highest-leverage integration for AU SMEs.
- Indeed Job Sync API is comparatively quick; ship as a fast follow.
- Jora XML feed is 1-2 days of work - HQ.ai already has the role data, just publish a feed URL per customer or per HQ.ai org.
- LinkedIn and Indeed Sponsored remain deep-link in V2.

### V3 (5-12 months): LinkedIn direct + Sponsored upsells

- Either complete the LinkedIn Talent Solutions Partner application (long, low approval rate) or contract a meta-aggregator (Broadbean) specifically for LinkedIn coverage and any niche boards customers ask for.
- Add Indeed Sponsored Jobs API for paid promotion as a paid upsell.
- Surface board-level analytics in the HQ.ai dashboard.

This sequencing matches AU SME demand: SEEK is the must-have, Jora is cheap, Indeed is nice-to-have, LinkedIn is strategically important but not urgent for SMEs hiring trades, hospo, and admin roles.

---

## 5. Specific implementation notes

### 5.1 SEEK partner accreditation path

1. Read [SEEK API Terms of Use](https://developer.seek.com/) and the [introduction guide](https://developer.seek.com/introduction).
2. Submit the integration request form (linked from the Developer site). Frame HQ.ai as a hiring-content platform with N existing AU SME customers.
3. SEEK assigns a Partner Manager; expect 2-6 weeks before first contact [unverified - timing depends on SEEK pipeline].
4. Receive Developer Dashboard access. Provision Playground credentials - read-only, mock data.
5. Build against the Playground. SEEK uses GraphQL; the Job Posting mutation is `postPosition` (or equivalent). Capture title, description, location, salary band, work type, custom screening questions.
6. Request live partner credentials. SEEK adds an unsearchable test hirer to your account - test hirers can post free non-searchable ads.
7. Certification: SEEK reviews the integration end to end (auth flow, hirer onboarding UX, ad-creation UX, error handling).
8. Production: each new HQ.ai customer must be linked as a hirer relationship by SEEK before you can post for them. This is provisioned by SEEK staff, not self-serve - plan for a 1-3 day onboarding lag per customer.

### 5.2 LinkedIn OAuth flow for Simple Job Postings

```
HQ.ai user clicks "Connect LinkedIn"
  -> HQ.ai redirects to:
     https://www.linkedin.com/oauth/v2/authorization
       ?response_type=code
       &client_id=<HQ.ai client id>
       &redirect_uri=<HQ.ai callback>
       &scope=w_member_social rw_organization_admin w_organization_social
              r_organization_social r_basicprofile
              w_compliance (job-posting scopes per partner agreement)
       &state=<csrf>
  -> User signs into LinkedIn, approves
  -> LinkedIn redirects to HQ.ai callback with ?code=...
  -> HQ.ai exchanges code at https://www.linkedin.com/oauth/v2/accessToken
     for an access + refresh token
  -> HQ.ai stores tokens per HQ.ai user
  -> When user clicks "Post to LinkedIn":
     POST https://api.linkedin.com/rest/simpleJobPostings
       with header X-Restli-Method: batch_create
       body { elements: [ { externalJobPostingId, title, description,
              listingType: "BASIC", companyApplyUrl, ... } ] }
```

Note that the scopes above cover member-side posting. For full ATS-grade posting via the partner-only `simpleJobPostings` endpoint, HQ.ai must hold Talent Solutions Partner status; without it, the practical fallback is the basic [share + jobs-on-profile flow] (deep-link in V1) or a content share with a "View role" link back to HQ.ai's hosted job page.

### 5.3 Indeed Job Sync onboarding

1. Apply at the [Indeed Partner Docs portal](https://docs.indeed.com/) for API credentials.
2. Indeed issues client_id / client_secret.
3. Per customer: redirect to Indeed's employer auth flow, store the employer-scoped token.
4. POST job objects (JSON) to the Job Sync API. Job Sync calls are not metered.
5. For Sponsored Jobs (paid), upgrade to the Sponsored Jobs API and apply the customer's Indeed billing.

### 5.4 Jora XML feed

- HQ.ai exposes a per-tenant feed at `https://hq.ai/feeds/jora/<tenant>.xml`.
- Each `<job>` element wraps title, description, location, salary, apply URL, reference id, posted timestamp.
- HQ.ai provides the feed URL to the customer; customer (or HQ.ai on their behalf) submits the URL to Jora via [the contact form](https://au.jora.com/cms/get-your-feed-included-on-jora).
- Refresh cadence: 2-24 hours, set by Jora.

### 5.5 Deep-link prefill (V1) - per-board behaviour

| Board | URL | Prefill capability |
|---|---|---|
| SEEK | `https://talent.seek.com.au/employer/job-ads/post` | Limited query-param prefill [unverified]; rely on clipboard + UI guide. |
| LinkedIn | `https://www.linkedin.com/talent/post-a-job` | Title and company pre-fill from session; description via clipboard. |
| Indeed | `https://employers.indeed.com/p/post-job` | No documented prefill API; clipboard + guide. |
| Jora | `https://au.jora.com/employer/post-a-job` | Form fields are simple; clipboard works well. |

---

## 6. Cost projections

Assumptions: 100 / 500 / 1,000 active HQ.ai paid customers, average 3 roles posted per month, AU market. "Post" means one role published once across the chosen mix of boards.

### 6.1 Pass-through board costs (paid by the customer, not HQ.ai)

These are the customer's costs. HQ.ai never pays them, but they shape what customers will tolerate paying HQ.ai on top.

Per-customer per-month assuming 3 roles, posted to SEEK Basic + LinkedIn free + Indeed free + Jora free:
- SEEK Basic: ~AUD 250-400 per ad x 3 = AUD 750-1,200/customer/month [unverified for current variable pricing].
- LinkedIn BASIC, Indeed free organic, Jora free: AUD 0.
- Total customer board spend: ~AUD 750-1,200/customer/month.

| Customers | Monthly customer-borne board spend (mid-point AUD 950) |
|---|---|
| 100 | ~AUD 95,000 |
| 500 | ~AUD 475,000 |
| 1,000 | ~AUD 950,000 |

This matters for HQ.ai because customers will view their HQ.ai sub as additional spend on top, capping willingness to pay.

### 6.2 HQ.ai's own integration costs

Direct integration model:
- Build: 1 senior engineer x 3 months for SEEK + Indeed + Jora ~ AUD 60-90k.
- LinkedIn add: another 2-3 months ~ AUD 40-60k plus partner-application time.
- Ongoing maintenance: ~0.25 FTE = AUD 40-50k/year.
- No per-post fee.

Meta-aggregator (Broadbean) model:
- Build: 1 engineer x 1 month for the Broadbean adapter ~ AUD 25k.
- Broadbean subscription: typically a per-poster monthly fee plus per-post markup [unverified - Broadbean doesn't publish AU pricing]. Industry chatter suggests ~AUD 100-200 per posting seat per month plus a per-post fee of AUD 2-10. Assume AUD 5 per post.

| Customers | Posts/month | Broadbean per-post @ AUD 5 | Annualised |
|---|---|---|---|
| 100 | 300 | AUD 1,500 | AUD 18,000 |
| 500 | 1,500 | AUD 7,500 | AUD 90,000 |
| 1,000 | 3,000 | AUD 15,000 | AUD 180,000 |

Direct beats aggregator on unit economics above ~500 customers; aggregator beats direct on time-to-market.

Deep-link V1 model:
- Build: 1 engineer x 2-3 weeks ~ AUD 8-12k.
- Per-post cost: AUD 0.
- HQ.ai's only ongoing cost is the engineering team keeping prefill URLs working as boards change their UIs.

### 6.3 Recommendation

Run V1 deep-link until paid customers cross ~200-300, then add SEEK direct (pays back fast) and Jora XML (almost free). Hold off on Broadbean unless one or two enterprise customers ask specifically for "post to 50 boards in one click" - at which point Broadbean's per-post fee becomes a margin-acceptable cost of serving them.

---

## 7. Recommended V1 cut

The smallest viable thing HQ.ai ships:

1. **One UI surface**: in the Campaign Coach draft view, a "Post to your boards" panel with four cards - SEEK, LinkedIn, Indeed, Jora.
2. **Each card** shows the board logo, an estimated price ("from AUD 250 on SEEK Basic"), and a primary button. The button:
   - Copies a fully formatted version of the role to clipboard (title block, body, key responsibilities, apply-link back to HQ.ai-hosted application page).
   - Opens the board's compose-job URL in a new tab.
   - Triggers a small inline checklist ("paste into description", "set salary", "submit") so the user feels guided.
3. **Hosted apply page**: HQ.ai hosts a per-role public landing page so the customer can paste a single "Apply here" URL into every board. This becomes the candidate-capture funnel and is HQ.ai's biggest moat for V2.
4. **Status tracking**: after the user posts, prompt them with "Paste the live ad URL to track it". Store this against the role. Show a "Live on SEEK", "Live on LinkedIn" pill on the dashboard. No real API confirmation needed in V1.
5. **Jora feed**: ship the XML feed silently. Submit one feed URL covering all HQ.ai customers' opted-in roles. This gets HQ.ai-hosted apply pages crawled by Jora at zero engineering cost beyond the feed.
6. **SEEK partner application**: submit it on the same day V1 ships. The clock is months long; start it now.
7. **LinkedIn fallback**: until LinkedIn partner status arrives, the deep-link covers it. Optionally add LinkedIn's standard "Share on LinkedIn" intent so the role gets shared as a member post.

This V1 gives the client the felt experience of "HQ.ai posts to all my boards" - they click one card per board, the draft is ready to paste, the apply funnel is hosted and consistent. It commits HQ.ai to zero board partnerships, zero per-post costs, and zero OAuth flows. It buys 6-12 months of runway to either land SEEK direct + Indeed Job Sync, or pull the trigger on Broadbean if scale demands it.

---

## 8. Open questions for product

- Are HQ.ai customers expecting HQ.ai to pay board fees, or pass them through? V1 only works if pass-through is expected.
- Does HQ.ai want to own the candidate funnel (hosted apply page) or let candidates apply on each board? The recommended V1 assumes HQ.ai owns the funnel - this has compliance implications (Privacy Act 1988, candidate data handling) worth a separate doc.
- Is there appetite to white-label Broadbean as "HQ.ai Distribute" for V2 enterprise tiers?
- Should HQ.ai apply for SEEK partner status under the Campaign Coach brand or under an HQ.ai-Hire sub-brand to keep posting concerns separate from drafting concerns?

---

## 9. Sources

- SEEK Developer site - https://developer.seek.com/
- SEEK Developer introduction - https://developer.seek.com/introduction
- SEEK Auth and hirer relationships - https://developer.seek.com/auth and https://developer.seek.com/auth/hirer-relationships
- SEEK pricing help - https://help.seek.com.au/employer/s/article/How-much-does-it-cost-to-post-a-job-ad
- SEEK integrated partners - https://talent.seek.com.au/partners/connected-partners/
- APIscene on SEEK's GraphQL platform - https://www.apiscene.io/graphql/seek-establishing-a-new-api-integration-platform/
- LinkedIn Job Posting API overview - https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview?view=li-lts-2026-03
- LinkedIn Create Jobs - https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/create-jobs?view=li-lts-2026-03
- LinkedIn RSC overview - https://learn.microsoft.com/en-us/linkedin/talent/recruiter-system-connect?view=li-lts-2025-10
- LinkedIn ATS partner application - https://business.linkedin.com/talent-solutions/ats-partners/partner-application
- LinkedIn billing FAQ - https://www.linkedin.com/help/linkedin/answer/a517695/billing-for-pay-per-click-job-posts-faqs
- LinkedIn pricing breakdown (Pin) - https://www.pin.com/blog/linkedin-job-posting-pricing/
- LinkedIn ATS integration guide (scale.jobs) - https://scale.jobs/blog/linkedin-api-integration-with-ats-step-by-step-guide
- Indeed Job Sync API guide - https://docs.indeed.com/job-sync-api/job-sync-api-guide
- Indeed Sponsored Jobs API - https://docs.indeed.com/sponsored-jobs-api/
- Indeed XML transition note (SAP community) - https://community.sap.com/t5/human-capital-management-blog-posts-by-sap/indeed-s-transition-away-from-xml-feeds-what-sap-successfactors-customers/ba-p/14326692
- Indeed AU pricing - https://au.indeed.com/hire/pricing and https://au.indeed.com/hire/resources/howtohub/how-pricing-works-on-indeed
- Jora XML feed (AU) - https://au.jora.com/cms/get-your-feed-included-on-jora
- Jora free posting guide - https://au.jora.com/blog/posting-a-job-for-free-on-jora/
- Broadbean - https://www.broadbean.com/ and https://www.broadbean.com/product-suite/job-distribution-platform/
- VONQ Job Post - https://www.vonq.com/vonq-job-post/
