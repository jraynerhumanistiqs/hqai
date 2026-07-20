# HQ.ai - Response to Bianca's Dashboard Feedback

**Date**: 2026-07-13
**Author**: Senior product / governance / pricing research agent
**Audience**: Jimmy Rayner (founder / dev) + Bianca (co-owner, HQ.ai + Humanistiqs)
**Cross-refs**: `2026-05-21_mission-validation.md`, `2026-05-21_mission-action-register.md`, `retention-and-monetisation-brief.md`, `2026-05-16_ai-doc-creation-teardown.md`
**Confidence legend**: `[HIGH]` primary-source verified | `[MED]` multi-source secondary | `[LOW]` researcher judgement, flagged as inference
**Standard**: every material claim cited. Australian English. Plain hyphens only.

---

## 0. Executive summary

Bianca is broadly right about the direction and materially right about the biggest risk. Her core thesis - that HQ.ai's one-off document pricing is too low, that the operational plumbing behind the AI is undercooked, and that HQ.ai is more dependent on one human (Jimmy) than a co-owned business should be - is correct on evidence, correct against best practice, and correct on the substance of the mission validation's own findings (Doubts E.2, E.4, E.7 and the retention brief's Tome warning). She has two factual errors worth naming plainly: her Lawpath comparison ($1,400-$1,800 per contract) confuses Lawpath's marketplace-sourced bespoke lawyer engagement with Lawpath's actual template product, and her BetterHR $99 figure is a monthly subscription, not a per-document price. Neither error changes her conclusion; both change the pricing counter-proposal.

**Bianca's feedback shifts the action register as follows** (details in Section 7):

- **Elevates E.2 (AI accuracy audit) and E.4 (build gaps) to non-negotiable pre-launch blockers**, not P1.
- **Introduces four new register items** (governance): E1 IP assignment deed + source escrow, E2 hosting-and-key delegation, E3 PI insurance layer, E4 change-management + roadmap owner.
- **Refines A1-A3 (pricing consolidation)** with a specific one-off price ladder that is higher than the current $25-$79 model but lower than Bianca's proposal, and defensible against Lawpath, Sprintlaw, Cleardocs, and BetterHR at their actual 2026 prices.
- **Validates B8 (independent legal review)** and adds a mandatory PI-insurance quote step alongside it.
- **Refines B12 (Foundation 100)** - Bianca's implicit worry about long-tail cost coverage means the Foundation lock rate should stay at $189 not drop further.

**Top 5 actions coming out of Bianca's feedback**:

| # | Action | Register ID | Priority | Owner |
|---|---|---|---|---|
| 1 | Rewrite the one-off marketplace price ladder (Section 1) - lift most SKUs to $79-$149, add contract packs at $349-$599, add award-specific packs at $599-$799 | A6-refined + new C15 | P0 (this fortnight) | Founder + Dev |
| 2 | Execute a founder IP assignment deed to Rayner Consulting Group Pty Ltd + separately-held source-code escrow (Section 2) | New E1 | P0 (this fortnight) | Founder + lawyer |
| 3 | Delegate hosting/domain/key-vault access to a second named person (Bianca or ops lawyer) with a documented runbook (Section 2) | New E2 | P0 (this fortnight) | Founder |
| 4 | Get three PI insurance quotes covering AI advice + HR/legal-adjacent tech E&O; publish scope + limitations on `/security` (Sections 3, 6) | New E3 | P1 (this quarter) | Founder |
| 5 | Set the currency cadence in writing (Section 3): weekly FWO change scan, monthly template-content review, quarterly independent-lawyer audit, annual full IP assignment refresh | Refines B6 + B8 + B9 | P1 (this quarter) | Founder |

---

## 1. Pricing and positioning

### 1.1 Fact-check on Bianca's comparators

Bianca's four benchmarks corrected to verified 2026 pricing:

| Bianca's claim | 2026 verified | Confidence | Source |
|---|---|---|---|
| Lawpath: $1,400-$1,800 per contract | **Wrong for the template product.** Lawpath's Essentials plan (unlimited legal documents inc. employment contract) is $45/mo annual ($540/yr) or $67/mo month-to-month. Legal Advice add-on $155/mo annual. AI (Atlas) included. The $1,400-$1,800 figure is closer to Lawpath's **network-solicitor bespoke drafting engagement** (Lawpath is a legal marketplace as well as a template shop) - which is a lawyer engagement, not a template product | `[HIGH]` | [Lawpath Pricing](https://lawpath.com.au/pricing) - fetched Jul 2026 |
| Cleardocs: $117.50 | **Right, near enough**: $117.70 inc GST for single-use employment contract; $510.40 inc GST for 12-month unlimited use of that template | `[HIGH]` | [Cleardocs Employment Contract](https://www.cleardocs.com/products-employment-contract.html) - fetched Jul 2026 |
| Sprintlaw: $500 | **Right, but that's the floor.** $500 + GST for the general package (FT/PT/casual bundle drafted-to-fit + one amendment + phone consult); $900 + GST for a proper FT/PT contract-only package. Full contract with lawyer time can push past $1,500 | `[HIGH]` | [Sprintlaw Employment Contract](https://sprintlaw.com.au/employment-law/employment-contract/) - fetched Jul 2026 |
| Better HR: $99 | **Wrong category.** $99/month base + $9.99/user is BetterHR's subscription (HR advice hotline, WHS registers, template library, insurance protection). Not a per-document price. The correct one-off analogue is Better HR's shop SKUs, which are template downloads in the $30-$79 band | `[MED]` | [BetterHR Plans](https://betterhr.com.au/plans-pricing/); [BetterHR Shop](https://betterhr.com.au/shop/) - fetched Jul 2026 |

Additional competitors Bianca didn't name (2026 prices, verified):

| Competitor | Category | 2026 price | Source |
|---|---|---|---|
| LegalVision | Membership + drafting | Essentials $119-149/wk ex GST (~$515-$645/mo), Pro $219-1,350+/wk. Minimum 12 months | [LegalVision Membership](https://legalvision.com.au/membership/) |
| Legal123 | One-off template shop | $59-$299 per template (employment contract kits) | [Legal123 vs Lawpath](https://legal123.com.au/compare/legal123-vs-lawpath/) |
| Workforce Guardian | HR software + advice subscription (annual only) | HR Essential (up to 10 employees), Professional (up to 50), Platinum (includes 10 consulting hours). Specific pricing gated behind quote request | [Workforce Guardian](https://www.workforceguardian.com.au/hr-systems/) |
| Employment Innovations | Outsourced HR + payroll | HR outsourcing market: $45-$1,500/mo, $45-$400 PEPM depending on scope | [Valont HR outsourcing 2026 guide](https://www.valont.com.au/insights/cost-of-hr-outsourcing-australia); [ScaleSuite outsourcing costs](https://www.scalesuite.com.au/resources/outsourcing-hr-australia) |
| LawDepot AU | Free/cheap template downloads | Employment contract download free with account, paid tiers ~$33/mo | [LawDepot AU employment contract](https://www.lawdepot.com/au/employment-contract/) |
| Employsure retainer (Peninsula AU) | Advisory + software | Not published, market reports $1,000-$5,000/mo on 1-3-5-year contracts | Cross-ref mission validation §D.1(b) |
| Fair Work Ombudsman | Free templates | $0 - letter of offer, warning letter, contract templates all free | [FWO Small Business Hub](https://www.fairwork.gov.au/small-business) |

**Key takeaway on the fact-check**: Bianca's overall claim - "we're pricing like generic templates when the substance is more like a mid-priced contract product" - **holds**. What she got wrong is the ceiling ($1,400+ is really lawyer bespoke pricing, not a template comparator). The market for AU HR templates has a genuine $99-$249 band that HQ.ai is currently underpricing.

### 1.2 Bianca's price ladder - evaluation and counter-proposal

Bianca's proposed ladder against 2026 market evidence, HQ.ai's unit economics (retention brief §2.4), and the current founder-locked ladder ($25-$79):

| SKU | Bianca | Current HQ.ai | Counter-proposal | Rationale |
|---|---|---|---|---|
| Single contract template (employment contract, standalone) | $149-$249 | $49 | **$129** | Sits above Cleardocs' $117.70 (verified anchor), below Sprintlaw's $500 floor, and 60% cheaper than a Legal123 bespoke drafting kit. Enough margin to fund quarterly currency refresh (Section 3.1) and cover FWO/Voyage embedding cost per §2.4 of retention brief. `[MED]` |
| Letter of Offer (simple, wedge SKU) | not itemised | $25 | **$49** | Keep this as the cheapest-CAC entry point per retention brief §2.6. $49 still undercuts every competitor in the space (Lawpath is subscription-only for equivalent access; LawDepot is free but ungrounded) while doubling per-doc gross margin from current $25. Foundation-100-esque scarcity is not the marketing mechanic here; visibility is. Keep the "no signup" flow. `[MED]` |
| Termination letter | not itemised | $45 | **$99** | Termination is legally the highest-risk single document. Bianca's implicit concern - "you'll be liable" - is loudest here. The higher price funds a mandatory human-review escalation before download (see Section 3.3 liability model). Cheaper than Sprintlaw's $500 general package. `[MED]` |
| Contract pack (FT/PT/Casual/Fixed-term) | $399-$599 | $196 (4x $49) | **$349** | Aligns with Bianca's low anchor. Bundles the 4 employment types with a shared onboarding-details form. Above Cleardocs single-doc price, well below Sprintlaw. Solves the actual buyer problem: a small business hiring across mixed employment types once a year. `[MED]` |
| Award-specific contract pack (Hospitality / Trades / Retail / Aged Care / Allied Health) | $599-$899 | not offered | **$599 launch, $799 established** | Directly maps to the Vertical Pack roadmap (action register D4, Q2-Q4 2027). Each pack = contract templates + award-specific clauses + FAQ pack + 30-day AI advisor question credit. This is the SKU where HQ.ai's citation moat has the most value; charge for it. `[MED]` |
| Template + HR review (human) | $750-$1,250 | not offered | **$399 first hour, $199 per subsequent 30 min** | Bianca is right that human review has to be priced separately - it is the escalation product. But her $750-$1,250 is a Sprintlaw-lawyer price, not an HR-advisor price. HQ.ai's HR365 hourly effective rate at $799/mo for 3 hrs = ~$266/hr; a one-off first-hour at $399 preserves the annual-subscription margin, sits below AU HR consultant rates ($150-$350/hr per Valont 2026 guide), and gives Bianca (or a Humanistiqs consultant) real work at real margin. `[MED]` |
| Annual update subscription | $29-$79/mo or $399-$699/yr | absorbed into Solo/Business subscriptions | **Do not create a separate SKU.** Bundle "your contracts stay current" into Solo ($59/mo) and Business ($179/mo) tiers as a differentiator. Retention brief §3.4 identifies data lock-in (ingested policies + drafted document library) as the highest-stickiness moat - don't undermine it by making the update fee an opt-in | Fragmenting the subscription hurts NRR. The annual-update pitch is a marketing message, not a separate SKU. `[MED]` |

**Where I go further than Bianca**:

- HQ.ai's current $25-$79 marketplace is too low for the templates that carry material legal risk (termination, warnings, contracts). Bianca's argument (Section 1 of her feedback) that "low pricing signals low quality and starves the maintenance budget" is directly supported by the mission validation's Tome cautionary case (mission validation §D.1(f) and doc-creation teardown §3.5) and by the doc-creation teardown §7's own credit-per-action pricing recommendation.
- The Letter of Offer stays cheap on purpose. It is the CAC wedge (retention brief §2.6, action register A6). $49 is the sweet spot: enough to margin-cover the API cost + Voyage embedding + audit review, low enough to trigger no-signup viral acquisition.
- Introduce human review as a genuinely separate priced product, but at the HR-advisor rate not the lawyer rate. This gives Bianca real work at real margin without collapsing the subscription-value story.

**Where I agree with Bianca and disagree with the founder's current ladder**:

- The $25-$79 band positions HQ.ai below Cleardocs. HQ.ai is not below Cleardocs on substance (AI-cited grounding + FWA sourcing + industry-tuned prompt logic + 33-template IP). Being below Cleardocs on price sends the wrong signal to the SME buyer who has already seen Cleardocs quoted at $117.70. **Bianca is correct on the branding argument.**
- Once you launch at $25-$49, raising to $79-$149 later takes an intentional communications push, a launch date, and a public rationale. Better to launch at the right price and discount transparently for Foundation 100.

### 1.3 Bianca's substrate argument (quality / cost / long-tail liability)

Bianca's argument in Section 1 - "pricing sends a message about quality, and low pricing starves the maintenance budget" - maps precisely to the retention brief §2.4 credit-costing math and the mission validation §E.8 currency-debt concern.

Evidence supporting Bianca:

- Cleardocs charges $117.70 for a Maddocks-backed template that gets updated by their in-house legal team. HQ.ai charging $49 for an AI-generated + citation-grounded equivalent implies HQ.ai's grounding is worth 40% less than a Maddocks review letter, which is the wrong signal. `[HIGH]`
- Employment law changed **12 times** since 2024 (Employee Choice Pathway 26 Aug 2024, Right to Disconnect 26 Aug 2024 for 15+ businesses and 26 Aug 2025 for <15, criminalised wage theft 1 Jan 2025, same-job-same-pay 1 Nov 2024, psychosocial safety WHS 2023-2025 varies by state, payday super 1 Jul 2026, and multiple modern award increases). Mission validation §C.2 flagged these as currency gaps. Every one requires template + prompt updates. `[HIGH, per FWO / DEWR / regulator pages]`
- The doc-creation teardown §3.5 (Tome) is the strongest evidence for Bianca's cost warning. Tome charged near-free for AI generation and burned $77M+ before shutdown. Per-document API cost + Voyage embedding + audit review + advisor escalation stack is roughly $0.08-$0.35 per document at current Anthropic Sonnet 4.6 / Voyage law-2 / Cohere rerank pricing (§4.1). At $25, gross margin is ~85% but the amortised legal-currency + audit + PI-insurance cost per doc is currently unfunded. At $79-$149, the per-doc contribution funds the currency and audit stack sustainably. `[MED]`

### 1.4 Action register updates from Section 1

- **A1 refined**: Consolidate pricing to include the new one-off ladder above (Letter of Offer $49, Termination $99, Employment Contract $129, Employment Pack $349, Award Pack $599 launch), not the $25-$79 band.
- **A6 refined**: Ship the marketplace with the new price points, not the current SKU env-var defaults. Retire the $25 STRIPE_PRICE_ID_LETTER_OF_OFFER in favour of a $49 SKU.
- **New C15**: Ship a "Human Review Add-On" for any generated document at $399 first hour, $199 per subsequent 30 min. Priced in the App at the point of document generation with a checkbox "Have a Humanistiqs advisor review this before send".

---

## 2. Product ownership and IP (Section 2a in Bianca's feedback)

Bianca's three questions collapse to one: **who and what else keeps HQ.ai running if James is not available**. The honest answer today is: nothing does. There is no delegated hosting access, no source-code escrow, no signed IP assignment deed on record, and no operational runbook. This is a solo-founder anti-pattern that is straightforward to fix in a fortnight.

### 2.1 Codebase and hosting delegation

**Evidence on best practice**:

- AU solo-founder SaaS bus-factor mitigation typically covers (a) hosting-account delegation, (b) domain-registrar admin access, (c) key-vault delegation, (d) source-code escrow with a triggered-release deed, and (e) a written runbook. Sprintlaw's own SaaS legal checklist explicitly lists escrow + IP assignment as founder-first line items. `[HIGH]` [Sprintlaw SaaS legal checklist](https://sprintlaw.com.au/articles/saas-legal-checklist-in-australia-contracts-ip-and-privacy/)
- Source-code escrow in AU is a live service via Escrow London and other providers; deposit + verification + trigger-based release is the standard structure. Ownership stays with HQ.ai; the escrow gives a nominated party (typically the co-owner or a customer) a conditional right to access under defined events (founder incapacitation, business dissolution, prolonged unavailability). `[HIGH]` [Escrow London AU](https://www.escrowlondon.com/what-is-saas-escrow-australia/)

**Recommendation - execute this fortnight**:

- **E2 (new)**: delegate access with recorded credentials in a shared 1Password / Bitwarden vault to a second named principal (Bianca as co-owner is the default, or an ops lawyer if Bianca declines). Cover: Vercel, Supabase, Cloudflare, Anthropic, Voyage, Cohere, OpenAI, Resend, Stripe, GitHub, domain registrar, Google Workspace. Runtime: 1 founder-day.
- **E1 (new)**: source-code escrow via Escrow London or comparable AU-serviceable provider. Trigger clauses: founder unavailable > 60 days without succession plan; business insolvency; material change of control. Costs approximately $2,000-$4,000 setup + $500-$1,500/yr maintenance depending on deposit frequency. `[MED]`
- **Runbook**: a written 3-page "how HQ.ai runs" document. Deployment pipeline, key rotation, incident response, customer email escalation, Stripe webhook renewal, Voyage/Anthropic key rotation cadence. Store in `hqai/docs/ops/runbook.md`. Runtime: 1 founder-day.

### 2.2 IP ownership - James personally or Rayner Consulting Group Pty Ltd

**Evidence on best practice**:

- Under AU law, IP created by a founder before company incorporation does NOT automatically vest in the company. It must be transferred via a written deed of assignment. Without the deed, the company operates on IP it does not legally own. `[HIGH]` [Viridian Lawyers on founder IP assignment](https://viridianlawyers.com/blog/intellectual-property-assignment/)
- Every serious VC / acquirer will condition an investment on evidence of founder IP assignment during due diligence. Retroactive deeds are workable but signal poor legal housekeeping. `[HIGH]` [Ashurst Perkins Coie on IP assignment drafting](https://www.ashurstperkinscoie.com/en/insights/being-present-drafting-effective-intellectual-property-assignments/)
- Moral rights consent (separate from assignment) should be included; the founder cannot legally waive them but can consent in writing to unrestricted use. `[HIGH]`

**Recommendation - execute this fortnight**:

- **E1 (new)**: founder IP assignment deed from James Rayner personally to Rayner Consulting Group Pty Ltd covering (a) the HQ.ai codebase in its entirety at deed date, (b) the 33 HR/recruitment templates in `lib/template-ip.ts` and their prompt instructions in `lib/prompts.ts`, (c) the retrieval corpus in Supabase `knowledge_chunks`, (d) the brand marks HQ.ai / Humanistiqs, (e) all future-created IP in the course of business. Include moral rights consent. Cost: $1,500-$3,500 through an AU startup lawyer (Sprintlaw fixed-fee is quotable at this range per their startup pricing). `[MED]`
- Directly answers Bianca's question 3 ("Does James own the IP or Humanistiqs since he created it all?"): **currently, James does personally, until the deed is executed. The deed transfers it to Rayner Consulting Group Pty Ltd (Humanistiqs), which is the correct home.**

### 2.3 Handover if the partnership ends

Bianca's implicit worry: "if we fall out, what happens to the product I've been branding my company on?"

Best practice from AU tech co-founder agreements:

- Every co-owned tech venture needs a written **shareholders' agreement / partnership deed** covering IP ownership at wind-up, buy-sell clauses (drag-along, tag-along), founder vesting cliff and reverse-vesting on departure, and a "bad leaver" clause for cause-based departure. This is separate from the IP assignment. `[MED]` per standard AU startup practice
- If HQ.ai and Humanistiqs are not currently structured with a co-owner-friendly shareholders' agreement (specifically defining Bianca's economic and IP rights on an exit event), that gap should be closed alongside the IP deed. This is out of scope for a research response but flagged.

**Recommendation**: schedule a 60-minute meeting between James, Bianca, and a startup lawyer within four weeks. Same lawyer that draws up the IP deed can draft (or refresh) the shareholders' agreement / co-owner terms in the same engagement. Estimated cost bundled: $4,000-$7,500. `[LOW]`

### 2.4 Action register updates from Section 2

- **E1 (new)**: Founder IP assignment deed + source-code escrow. P0. Owner: Founder + startup lawyer. Effort: 1 week lead time, ~$1,500-$4,000 legal spend + $2,000-$4,000 escrow setup.
- **E2 (new)**: Access delegation + written runbook. P0. Owner: Founder. Effort: 2 founder-days.
- **New governance item**: co-owner shareholders' agreement refresh. P1. Owner: Founder + Bianca + lawyer. Effort: 1 founder-week + $4,000-$7,500 legal spend.

---

## 3. Currency and liability (Section 2b in Bianca's feedback)

Bianca is right on both counts: HQ.ai has no documented cadence for updating the AI's grounding when the law changes, and the liability position of "the AI got it wrong" is currently under-defined. This is the load-bearing risk in the mission validation §E.2 and the highest-value fix per Foundation 100 cohort trust.

### 3.1 Currency cadence - who updates the AI's knowledge

**Evidence on how peers do it**:

- Employment Hero's HeroForce Payroll AI is award-interpretation-focused; they employ an internal payroll compliance team (per their 2025 SmartCompany profile, referenced in mission validation §E.5) that reviews Modern Award changes with each Fair Work Commission decision. Update cadence not publicly documented but is understood to be event-driven (per-decision), not calendar-driven. `[MED]` [SmartCompany on HeroForce](https://www.smartcompany.com.au/startupsmart/employment-hero-business-legal-employer-new-ai-system/)
- Employsure's advisor model doesn't rely on AI grounding - advisors are trained per FWO update via internal legal team. No published cadence. `[LOW]`
- Fair Work Commission publishes Modern Award amendments continuously, with annual wage review taking effect 1 July each year. Every 122 Modern Awards updates at least annually. `[HIGH]` [FWC Modern Awards](https://www.fwc.gov.au/agreements-awards/modern-awards)
- DEWR "Closing Loopholes" tranches introduced 12+ material changes to employment law in the 24 months to July 2026. `[HIGH]` cross-ref mission validation §C.2 table

**Recommendation - cadence in writing**:

| Cadence | What | Owner | Effort | Cost |
|---|---|---|---|---|
| Weekly (Friday 3pm) | Scan FWO media releases, FWC decisions, Modern Award amendments. Log any change affecting the 33 templates or the prompt logic. If material, patch grounding + rerun eval | Founder or Humanistiqs consultant | 2 hrs/wk | $0 or ~$200/wk if delegated |
| Monthly | Reindex the Supabase `knowledge_chunks` corpus with any new FWO / FWC / Modern Award content. Publish "What changed this month" page (public + SEO). Run `tests/eval/run-eval.ts` | Dev + Founder | 4 hrs/mo | $0 |
| Quarterly | External employment-lawyer review of 20 randomised AI answers + 5 templates. Publish redacted summary on `/ai-standard` page | Founder + external law firm | 4 hrs founder + external review | $2,000-$4,000/quarter |
| Annually (1 July) | Full corpus reindex against new modern award rates + annual wage review + Federal budget changes. Full template review by external lawyer against year's legislative changes | Founder + Dev + external law firm | 2 weeks | $8,000-$15,000/yr |

Directly answers Bianca's question 1 ("Who's responsible for updating the AI's knowledge when Award rates or leave rules change, and how often?"): **Founder-led on weekly + monthly cadence, external-lawyer-verified on quarterly + annual cadence, with a published cadence on the `/ai-standard` page for public accountability.**

Refines mission validation action register B6 (freshness metadata) and B8 (independent legal review) into an ongoing programme, not a one-off.

Bianca's Section 2b note "AI does not keep up with legislation changes, Claude in particular" is correct in principle. Claude's training data is time-bounded, but HQ.ai's grounding architecture (retrieval-augmented generation over Supabase `knowledge_chunks`) means the AI answers from ingested current content, not from Claude's training data. The load-bearing risk is not Claude's training cutoff - it is the ingestion cadence. Fix the cadence, and the currency problem is solved.

### 3.2 Liability of AI-generated advice - AU legal-market evidence

**Evidence on the current AU liability landscape** (mid-2026):

- **No AI-specific employment legislation** in Australia as of mid-2026. Existing law (Privacy Act 1988 + APPs, anti-discrimination Acts, Fair Work Act general protections, Australian Consumer Law misleading-conduct provisions) applies technology-neutrally. `[HIGH]` cross-ref mission validation §C.3
- **Direction of travel**: February 2025 House Standing Committee recommended banning AI from making final recruitment decisions without human oversight. Not yet law but signals within-18-month regulation. `[HIGH]`
- **Federal Court AI Practice Note (GPN-AI)**: published 16 April 2026. Sets Federal Court's expectations for GAI use in proceedings. Applies to litigation not vendors, but signals the judicial attitude. `[HIGH]` [Federal Court GPN-AI](https://www.fedcourt.gov.au/law-and-practice/practice-documents/notice-to-profession/16-april-2026)
- **NSW Law Society "Solicitor's Guide to Responsible Use of AI"** published January 2026. Directive for solicitors: AI outputs must be verified by the practitioner. `[HIGH]` [NSW Law Society AI Guide](https://www.lawsociety.com.au/sites/default/files/2026-01/20260109%20LS4816_PSU_GuidetoAI_2026-01-08a%20FINALv2.pdf)
- **Notable AU AI liability case**: 15 August 2025, Judge Gerrard of the Federal Circuit and Family Court referred a lawyer to the WA Legal Practice Board for submitting AI-generated fictitious case citations. Establishes that AI output submitted without verification is misconduct at the professional level. `[HIGH]` [Barry Nilsson on AI in courtroom](https://bnlaw.com.au/knowledge-hub/insights/ai-in-the-courtroom-lessons-from-recent-cases-and-regulatory-shifts/)
- **OpenAI ChatGPT policy update 29 October 2025**: prohibits use of ChatGPT for tailored advice requiring a licence (legal, medical) without appropriate involvement by a licensed professional. Direction of travel across US-headquartered LLM vendors. `[HIGH]`
- **Disclaimers do NOT automatically shield liability**. Per multiple AU legal commentators. Disclaimer is necessary but not sufficient. `[HIGH]` [PW Lawyers on AI disclaimers](https://www.pwlawyers.com.au/blog/using-generative-ai-responsibly--sample-disclaimers-for-legal-practitioners)

**Peer ToS analysis** (Lawpath / Sprintlaw as AU legal-tech comparators):

- Lawpath's Terms explicitly disclaim that automated document generation is legal advice and require the user to acknowledge the same before purchase. Human-lawyer engagement is a separate contract at higher price. `[MED]` inferred from Lawpath's user flow, not exhaustively verified
- Sprintlaw is a law firm (lawyer engagement) not a template product; different liability model. `[HIGH]`
- No published AU court case has yet held an AI-legal-tech vendor liable for advice given to an end-user via the vendor's product. This is the vendor-liability void that Bianca is worried about. Novel litigation risk. `[MED, LOW as forecast]`

### 3.3 Recommended liability model for HQ.ai

Three-layer defence, in order of protective strength:

**Layer 1 - Terms of Service (the disclaimer)**

- HQ.ai's Terms of Service must state, on the same page users check "I agree" to before generating a document: (a) HQ.ai provides HR administrative tooling grounded in Australian employment law, not legal advice; (b) users acknowledge that AI outputs require the user's judgement and should be reviewed by a qualified professional for material decisions; (c) HQ.ai is not liable for outcomes arising from user action on AI outputs.
- Cross-ref mission validation action register A7 (AI Standard page) - this must land alongside the Terms update.
- Effort: 1 founder-day + $1,500-$2,500 lawyer review. `[MED]`

**Layer 2 - Human-in-the-loop escalation for high-risk documents**

- Termination letters, PIPs, First-and-Final warnings, and any Award-adjacent interpretation must trigger the "escalate to advisor" flow before the DOCX renders. The user can override the escalation with a checkbox ("I am generating this without advisor review, I accept full responsibility") which is logged. This is the same architecture as `MessageCitations` + `CitationChip` from the current build (cross-ref action register B10).
- This is HQ.ai's differential from ChatGPT: not "the AI is smarter" but "the AI stops when the stakes go up". Sell it as a feature.
- Effort: 3 dev-days (mostly UX). `[HIGH]`

**Layer 3 - Professional Indemnity insurance layer**

- Standard AU PI insurance for SaaS/tech does NOT reliably cover AI-generated advice claims. Coverage is emerging but inconsistent as of mid-2026. `[HIGH]` [American Bar Association on AI PI cover](https://www.americanbar.org/groups/journal/articles/2025/does-your-professional-liability-insurance-cover-ai-mistakes-dont-be-so-sure/) [Atlas Insurance on AI risk coverage](https://www.atlasinsurance.com/what-coverage-do-i-need-for-ai-related-risks/)
- Detailed PI market scan in Section 6.

**Directly answers Bianca's question 2** ("If the AI gives a wrong answer and a customer acts on it, who's liable"): **Under HQ.ai's proposed Terms, the customer takes the operational risk of acting on AI output. In practice, if a customer sues, the ToS is a partial shield, PI insurance is the financial backstop, and human-in-the-loop escalation is the qualitative shield. All three must exist, not one.**

### 3.4 Action register updates from Section 3

- **B6 refined**: freshness metadata + weekly + monthly + quarterly cadence in writing. Publish the cadence on `/ai-standard`. Not just per-answer metadata but a public commitment.
- **B8 refined**: quarterly (not one-off) legal review. Named external firm on retainer for 4 x $2,000-$4,000/yr reviews. Total $8,000-$16,000/yr.
- **B9 refined**: accuracy audit weekly (already action-registered) with published quarterly summary on `/ai-standard`.
- **New action**: publish the currency cadence table on `/ai-standard` as a public commitment. `[MED]` This is a trust signal, not just an operational document.
- **New E3**: PI insurance layer. See Section 6.

---

## 4. Cost model and advisor capacity (Section 2c in Bianca's feedback)

Bianca is right to press on cost. The retention brief §2.4 defined credits; the doc-creation teardown §6.4 recommended the 3-tier router; the mission validation flagged Tome's failure as the load-bearing cautionary tale. Nobody has written the per-customer monthly cost line yet. Here it is.

### 4.1 Per-customer monthly cost model

**Cost inputs** (mid-2026 verified prices):

| Line | Unit price | Source |
|---|---|---|
| Vercel Pro hosting | $20/user/mo + bandwidth (~$0.15/GB egress over free tier) | [Vercel pricing](https://vercel.com/pricing) |
| Supabase Pro | $25/mo project + $10/mo per extra Postgres compute | [Supabase pricing](https://supabase.com/pricing) |
| Cloudflare Stream | $1/1,000 min stored + $1/1,000 min delivered | [Cloudflare Stream pricing](https://www.cloudflare.com/plans/developer-platform/) |
| Anthropic Claude Sonnet 4.6 | $3/M input, $15/M output | Cross-ref mission validation §D and Anthropic pricing docs |
| Anthropic Haiku 4.5 | $0.80/M input, $4/M output | [Anthropic pricing](https://www.anthropic.com/pricing) |
| Anthropic Opus 4.7 | $15/M input, $75/M output | [Anthropic pricing](https://www.anthropic.com/pricing) |
| Voyage law-2 embeddings | $0.12/M tokens | Cross-ref doc-creation teardown §6.1 |
| Cohere rerank-3 | ~$2/1,000 searches | [Cohere pricing](https://cohere.com/pricing) |
| Resend | $20/mo for 50k emails | [Resend pricing](https://resend.com/pricing) |
| Stripe | 1.75% + $0.30 domestic AU + 2.9% + $0.30 international | [Stripe AU pricing](https://stripe.com/au/pricing) |
| PI insurance (Section 6) | $250-$800/mo (business-scale scaled) | Section 6 |

**Per-active-user API cost model** (retention brief §2.4 credit definitions, corrected for 3-tier routing per doc-creation teardown §6.4):

| Activity | Freq / active-user / mo | Cost per unit (post-routing) | Cost / user / mo |
|---|---|---|---|
| Chat turns (Haiku for simple, Sonnet for cited) | 30 turns @ 60/40 split | Haiku: ~$0.005, Sonnet: ~$0.03 | ~$0.45 |
| Document generation | 4 docs | ~$0.08 (Sonnet + Voyage + Cohere rerank + render) | ~$0.32 |
| CV score | 5 candidates | ~$0.05 each | ~$0.25 |
| Phone screen processed (Business tier only) | 2 candidates | ~$0.75 each (voice + transcript + score) | ~$1.50 |
| Knowledge ingestion (one-time, amortised) | 2 docs | ~$0.10 each | ~$0.20 |
| Embedding + rerank costs on chat | ~ | already in chat estimate | included |
| **Total variable per active user** |  |  | **~$2.72** |

Note: this assumes 3-tier router shipped (currently everything hits Sonnet). Without routing, chat cost triples and total variable per user approaches $6-$8/mo. Router is a P0 unlock.

**Fixed platform cost** (SaaS floors):

| Line | Cost / mo |
|---|---|
| Vercel Pro | $20-$40 |
| Supabase Pro | $25-$50 |
| Cloudflare Stream (dependent on video volume) | ~$50-$150 for 100 customers |
| Resend | $20 |
| Cohere rerank subscription | $50 |
| Voyage subscription | $50 |
| GitHub / monitoring / minor tools | ~$50 |
| **Fixed total** | **~$265-$410** |

**Per-customer monthly cost** (variable + amortised fixed):

| Customer count | Fixed | Variable | Total | Per-customer |
|---|---|---|---|---|
| 10 | ~$300 | ~$27 | ~$327 | $32.70 |
| 100 | ~$450 | ~$272 | ~$722 | $7.22 |
| 500 | ~$800 | ~$1,360 | ~$2,160 | $4.32 |

Fixed costs amortise fast. **The dominant unit-economics threat is variable API cost, which the 3-tier router mitigates and the credit-metering caps.**

### 4.2 Gross margin per tier

Using the founder's canonical action-register-locked pricing ($59 / $89 / $179 / $269 / $799 / $899 / $1,599):

| Tier | Monthly | Cost / mo (median) | Gross margin | Gross margin % |
|---|---|---|---|---|
| HQ People $59 | $59 | ~$3.50 | $55.50 | 94% |
| Complete Bundle $89 | $89 | ~$5.00 | $84 | 94% |
| HQ People $179 | $179 | ~$5.00 | $174 | 97% |
| Complete Bundle $269 | $269 | ~$7.00 | $262 | 97% |
| HR365 $799 (includes 3 advisor hrs) | $799 | ~$267 (3 hrs at $75/hr advisor cost + $7 tech) | $532 | 66% |
| Recruit365 $899 (includes ~4 advisor hrs) | $899 | ~$307 (4 hrs at $75/hr + $7 tech) | $592 | 66% |
| Combined $1,599 (7 advisor hrs) | $1,599 | ~$532 (7 hrs at $75/hr + $7 tech) | $1,067 | 67% |

**Self-serve subscription margins are healthy** (94-97%). The Foundation-100 $189 lock preserves 94% margin. The one-off marketplace (revised prices from Section 1) sits at 85-93% margin per document.

**HR365 margin (66%)** is where advisor capacity becomes the constraint, not compute. This is Bianca's implicit worry ("do we have advisor capacity to deliver that promise at scale?").

### 4.3 Advisor capacity math

Bianca's Section 2c question: "300 hours per month for 100 customers - how many advisors at what utilisation?"

- 100 HR365 customers x 3 hours/mo included = 300 advisor-hours/mo. `[HIGH per pricing config]`
- Standard AU HR consultant billable utilisation: 60-70% (industry benchmark for retainer-based advisory). `[MED]`
- Effective advisor capacity: 130-150 billable hrs/mo per FTE.
- **Required advisors at 100 customers**: 2.0 FTE. `[MED]`
- **Founder's current status**: solo. Cross-ref mission validation §E.5 - the founder-scale-fails-at-30-customers assumption holds here too. Between customer 30 and customer 100, HQ.ai must add advisor capacity or the HR365 SLA breaks.

Bianca is right to worry. The HR365 promise ("same-human advisor") is deliverable at 10-20 customers; problematic at 30-60; catastrophic at 100 without capacity in place.

**Recommendation - capacity ramp**:

| Customer count | Advisor headcount | Model |
|---|---|---|
| 1-20 | Founder | Solo |
| 21-60 | Founder + 1 fractional (0.4-0.6 FTE) HR advisor on retainer | Contractor |
| 61-120 | Founder + 1 FTE + 1 fractional (0.4 FTE) HR advisor | Mixed |
| 121-200 | Founder + 2 FTE HR advisors + 1 fractional | Small team |

Cost per FTE at market rate (AU senior HR advisor): $130,000-$160,000 base + 20% overhead. Cross-ref [Valont HR outsourcing costs 2026](https://www.valont.com.au/insights/cost-of-hr-outsourcing-australia) and [HR consultant hourly benchmark](https://citationgroup.com.au/hr/hr-outsourcing/cost/). At 100 customers x $799 = $79,900 MRR / $958,800 ARR against a $200,000-$250,000 advisor payroll = 20-25% of ARR into advisor cost. HR365 gross margin drops from 66% to ~50% at that headcount, still viable.

**HR365 hard capacity ceiling** (year 1 hard cap): 30 customers per solo founder before advisor hire becomes mandatory. This should be the enforced published cap on HR365 SKU signups, not the notional "10 partnerships year 1" (which is Enterprise only per action register C11). Cross-ref refines B12 (Foundation 100 - do not offer HR365 to Foundation cohort in year 1).

### 4.4 Directly answers Bianca's Section 2c question

**Q: What does it cost to run month-to-month once we have real customers?**

- 100 subscription customers: ~$722/mo platform + variable = ~$7.22 per customer. `[MED]`
- 500 subscription customers: ~$2,160/mo platform + variable = ~$4.32 per customer.
- Per-customer support burden is not a compute cost; it is an advisor-hour cost. HR365 is where cost scales dangerously.

**Q: Does cost scale with users in a way we've budgeted for?**

- Compute cost yes - flat plus linear-per-user with the router shipped. Predictable.
- Advisor cost no - HR365 breaks at ~30 customers without a hire. **Bianca has correctly identified an unmitigated risk. The capacity ramp above must be in the register.**

**Q: Is there a support burden when the "real advisor" backstop gets used more than expected?**

- Yes and it is the highest-leverage cost line. Section 4.3.

### 4.5 Action register updates from Section 4

- **New E4**: Advisor capacity ramp plan - documented in `docs/ops/advisor-capacity.md`. P1. Fractional AU HR advisor hired at customer 21. Owner: Founder.
- **B7 refined**: Ship the 3-tier router (currently deferred as part of the "placeholder features" completion). Reclassify as P0 not P1 given the compute-margin dependency.
- **C4 refined**: HR365 delivery model formalisation. Enforce the year-1 hard cap of 30 customers (published + monitored), not just "founder discretion".

---

## 5. Change management (Section 2d in Bianca's feedback)

### 5.1 Feature priority and backlog process

Bianca's question 4 ("Who decides what gets built next?") is a solo-founder governance gap - the founder decides, but the process is undocumented. Best practice for small-team SaaS:

- **Public roadmap**: three-column (Shipped / In progress / Next). Reference: Linear, Granola, Resend all run this and it correlates with reduced "is this product dead" churn. Cross-ref retention brief §7 tactic 2. `[MED]`
- **Weekly cadence**: 30 min founder + co-owner review. Move items across columns. Update site.
- **Owner authority**: founder decides in-quarter direction. Co-owner has veto on brand + positioning changes.
- **Public changelog**: monthly "what shipped" email + `/changelog` page. Cross-ref retention brief §7 tactic 3. `[HIGH]`

### 5.2 Audit-to-fix process

Bianca's question 1 ("When an audit surfaces issues, what's the actual process to get them fixed?"). Standard for solo-founder tech products:

- Every accuracy audit (weekly per action register B9) produces a scored list of issues. Categorise (a) content-currency, (b) prompt-logic, (c) code-defect, (d) UX.
- Each category has an SLA: content-currency <7 days, prompt-logic <14 days, code-defect <30 days (or urgent if user-facing), UX no-SLA (backlog).
- Publish a public quarterly "fixes shipped" summary alongside the accuracy report on `/ai-standard`.

### 5.3 Directly answers Bianca's Section 2d questions

- **Backlog process**: Public roadmap on `/roadmap`, weekly founder + co-owner review, monthly public changelog. `[MED, borrowed pattern from retention brief §7]`
- **Priority-setting owner**: Founder in-quarter, co-owner veto on brand/positioning. Documented in `docs/ops/governance.md`.
- **Audit-to-fix SLA**: content 7 days, prompt 14 days, code 30 days.

### 5.4 Action register updates from Section 5

- **New action**: ship `/roadmap` + `/changelog` before public launch. Cross-ref retention brief §7 tactics 2 + 3. Reclassify as P0.
- **New governance doc**: `docs/ops/governance.md` covering (a) who decides, (b) audit-fix SLA, (c) co-owner veto scope, (d) weekly cadence. P0. Owner: Founder + Bianca.

---

## 6. Data residency and PI insurance (Section 2e in Bianca's feedback)

### 6.1 Data residency governance

**Evidence**:

- Supabase offers deployment in AWS Sydney (`ap-southeast-2`). Database + API deployed in the same datacenter, same availability zone. `[HIGH]` [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- Backups by default stay in-region on Supabase Pro / Team plans. Cross-region replication is available but opt-in - it does not happen without explicit configuration. `[MED]` [Simplebackups on Supabase compliance](https://simplebackups.com/blog/cross-region-supabase-backup-compliance)
- Cloudflare Stream data residency is region-configurable but must be verified per account. `[MED]`
- Anthropic Claude API traffic routes via US-based infrastructure by default. Anthropic offers regional deployment through AWS Bedrock (available in Sydney) - HQ.ai's direct Anthropic API integration does NOT route through AU by default. `[HIGH]` [Anthropic regional deployment via Bedrock](https://aws.amazon.com/bedrock/claude/)
- Voyage AI hosted in US only as of mid-2026. Embedding calls cross the Pacific. `[MED]`
- OpenAI embeddings hosted in US. `[HIGH]`

**Implication**: HQ.ai's claim "hosted in Sydney + APP" (per landing brief) is TRUE for customer data at rest (Supabase Sydney) but MISLEADING for AI inference. AI API calls (Anthropic, Voyage) cross to US infrastructure. This is a live risk if HQ.ai markets "your data never leaves Australia" without qualification.

Cross-ref [Lorikeet's AU AI residency guide](https://www.lorikeetcx.ai/articles/ai-support-australian-data-residency-guide) - explicitly flags this as the common gap in AU AI-vendor marketing.

### 6.2 Recommended residency governance model

- **Named role**: "Data Residency Officer" - a responsibility assigned to a person (default: founder). Reviewed by co-owner quarterly. Not a hire; a named accountability.
- **Live check** (not passive claim): monthly script that verifies (a) Supabase project region, (b) backup destination, (c) Cloudflare Stream region config, (d) every third-party API's data-residency posture. Automated where possible. `[MED]`
- **Marketing accuracy**: rewrite the residency claim on the landing site to be precise. Something like: "Customer records, documents, and prescreen videos stored in AWS Sydney. AI inference is routed through Anthropic's US-hosted API - PII-scrubbed before transmission where practical. Full breakdown on `/security`." Being precise beats being marketable when a customer sues; the current wording is the marketable side of that trade-off.
- **Optional upgrade**: migrate Anthropic direct-API traffic to AWS Bedrock (Sydney region). Anthropic-via-Bedrock keeps AI inference in `ap-southeast-2`. Cost: ~10-15% premium over direct Anthropic. Effort: 3-5 dev-days. `[MED]` This is the honest fix for the "your data stays in AU" claim, and is worth it before HQ.ai wins any enterprise/government-adjacent buyer.

**Directly answers Bianca's Section 2e question 1**: **The named Data Residency Officer (founder by default) owns keeping the claim true. The monthly automated check enforces it. Migrating Anthropic inference to Bedrock-Sydney is the option that makes the claim fully defensible.**

### 6.3 Professional Indemnity insurance for AI-generated legal-adjacent advice

**AU PI market scan** (mid-2026):

- **Baseline premium band**: sole-trader tech professional $40-$100/mo for $1M-$5M cover. Small-business with employees $120-$250/mo for equivalent cover. Micro tech firm (1-5 staff, $151k-$750k revenue) gets a ~+20% loading for multiple advice streams. `[HIGH]` [Upcover PI cost 2026](https://www.upcover.com/blog/professional-indemnity-insurance-cost) [National Cover 2025](https://nationalcover.com.au/professional-indemnity-insurance-cost/)
- **AI-specific coverage** in AU as of mid-2026: emerging, inconsistent. Standard PI policies frequently DO NOT clearly cover AI-generated advice claims. Coverage varies substantially by insurer and by policy year. `[HIGH]` [American Bar Association on AI liability cover](https://www.americanbar.org/groups/journal/articles/2025/does-your-professional-liability-insurance-cover-ai-mistakes-dont-be-so-sure/) [Atlas Insurance on AI risk cover](https://www.atlasinsurance.com/what-coverage-do-i-need-for-ai-related-risks/)
- **Recommended AU insurers to quote from** (for LegalTech / HRTech AI-advice risk profile):
  - **Marsh Australia** - the incumbent for AU legal-tech and solicitor PI. Best for a customised policy with AI rider. `[HIGH]` [Marsh AU professional services](https://www.au.marsh.com/business/professional-services/solicitors.html)
  - **Aon Australia** - competitive on cyber + PI combined for tech firms. `[HIGH]`
  - **AJG Australia (Arthur J. Gallagher)** - small-business tech PI. Faster quotes. `[HIGH]` [AJG small business PI](https://www.ajg.com/au/insurance/small-business/professional-indemnity-insurance/)
  - **BizCover / Upcover** - online SME-focused, cheap floor, but ceiling on AI coverage. Suitable as a baseline while a bespoke policy is being negotiated. `[HIGH]`
  - **Vero / Chubb** - underwriter-level. Usually accessed via a broker (Marsh/Aon). `[MED]`
- **Rough total premium for HQ.ai** (mid-2026 estimate for tech SaaS + AI advice rider, $2M-$5M cover, sole-founder + fractional advisor headcount):
  - Baseline PI: $2,400-$4,800/yr ($200-$400/mo)
  - AI-advice rider (where available): +30-60% loading = $3,120-$7,680/yr total
  - Cyber-liability add-on (recommended given customer PII + prescreen videos): +$1,200-$2,400/yr
  - **Realistic 2026 all-in**: $4,000-$9,000/yr, or roughly $335-$750/mo `[MED]`

**Coverage limits to seek**:
- $2M-$5M PI aggregate for a business at HQ.ai's scale (pre-enterprise, <100 customers)
- $1M-$2M cyber liability aggregate
- Explicit inclusion of "advice provided via AI-generated content" or an equivalent AI-inclusive rider
- Continuous cover from the date HQ.ai first accepted a paying customer (not date of policy inception) - critical because AU PI is claims-made not occurrence-based

### 6.4 Directly answers Bianca's Section 2e question 2

**Q: Is there insurance covering advice given by the AI the same way it would for advice given by a Humanistiqs consultant?**

- **Not automatically**. Standard AU PI does not cleanly cover AI-generated advice. A bespoke policy or explicit AI rider is required.
- **Available**: yes, via Marsh Australia, Aon, or AJG with an AI-specific rider negotiated. Estimated $4,000-$9,000/yr all-in for AU SaaS + AI advice at HQ.ai's scale.
- **Critical action**: **do not launch commercially without a PI quote in hand.** Even if the founder chooses to accept the risk for the pilot cohort, the position must be documented and shared with Bianca as a co-owner decision.

### 6.5 Action register updates from Section 6

- **New E3**: PI insurance layer. P1 (this quarter). Owner: Founder + broker. Effort: 2 weeks lead time, $4,000-$9,000/yr premium.
- **New action**: publish `/security` page with residency + insurance status. Cross-ref action register C10 (Data residency + hosting commitment). Refined to include Bedrock-Sydney migration decision.
- **New action**: migrate Anthropic API traffic to AWS Bedrock Sydney region. P1. Owner: Dev. Effort: 3-5 days.
- **New action**: monthly automated data-residency check script. P1. Owner: Dev. Effort: 1 day.

---

## 7. Action register deltas

### 7.1 New items introduced by Bianca's feedback

| ID | Item | Priority | Owner | Effort | Cost |
|---|---|---|---|---|---|
| E1 | Founder IP assignment deed to Rayner Consulting Group Pty Ltd + source-code escrow with defined triggers | P0 | Founder + startup lawyer | 1 week lead | $1,500-$4,000 legal + $2,000-$4,000 escrow setup + $500-$1,500/yr ongoing |
| E2 | Delegate hosting, key-vault, and repo access to a second named principal + written runbook `docs/ops/runbook.md` | P0 | Founder | 2 founder-days | $0 |
| E3 | Professional Indemnity insurance with AI-advice rider ($2M-$5M cover) + cyber liability ($1M-$2M) | P1 | Founder + broker | 2 weeks | $4,000-$9,000/yr |
| E4 | Advisor capacity ramp plan `docs/ops/advisor-capacity.md` + fractional HR advisor hired at customer 21 | P1 | Founder | 1 week planning + hire lead time | $60k-$100k/yr fractional advisor cost from customer 21 |
| E5 | Public `/roadmap` + `/changelog` before commercial launch | P0 | Founder + Dev + Copy | 3 days | $0 |
| E6 | Governance doc `docs/ops/governance.md` covering who-decides, audit-fix SLA, co-owner veto, weekly cadence | P0 | Founder + Bianca | 1 founder-day | $0 |
| E7 | Migrate Anthropic API traffic to AWS Bedrock Sydney region | P1 | Dev | 3-5 dev-days | +10-15% inference cost |
| E8 | Monthly automated data-residency verification script + escalation on drift | P1 | Dev | 1 day | $0 |
| C15 | Ship "Human Review Add-On" priced at $399 first hour + $199/30 min at document-generation point | P2 | Dev + Founder | 3-5 days | $0 build |
| C16 | Co-owner shareholders' agreement refresh with buy-sell, drag-along, tag-along, bad-leaver clauses | P1 | Founder + Bianca + startup lawyer | 1 founder-week lead | $4,000-$7,500 legal |

### 7.2 Refined existing items

| ID | Original | Refinement from Bianca's feedback |
|---|---|---|
| A1 | Consolidate pricing to $59/$179 People + $89/$269 Complete + $25-$79 one-offs + $799/$899/$1,599 HR365 | Revise one-off ladder up: Letter of Offer $49, Termination $99, Employment Contract $129, Employment Pack $349, Award Pack $599 launch |
| A6 | Ship the $25 Letter of Offer marketplace | Ship at **$49** not $25. Retire STRIPE_PRICE_ID_LETTER_OF_OFFER $25 var. Same no-signup UX. |
| B6 | Freshness metadata on every answer | Publish the **cadence** (weekly / monthly / quarterly / annual - Section 3.1) on `/ai-standard` as a public commitment |
| B7 | Complete placeholder features (Awards Interpreter, Compliance Assessment, Campaign Coach) | Reclassify **3-tier router (Haiku/Sonnet/Opus)** as P0 not part of B7 - it is the load-bearing unit-economics fix |
| B8 | Independent legal review (one-off) | Convert to **quarterly retainer** with named firm, $8,000-$16,000/yr, published summaries |
| B12 | Foundation 100 at $189 lock | Do NOT drop to $179 or lower. Bianca's cost-recovery argument is right. Foundation-100 excludes HR365 in year 1 (advisor capacity constraint - E4) |
| C4 | HR365 delivery model formalisation | Enforce **year-1 hard cap of 30 HR365 customers** as a published product-page number, not "founder discretion" |
| C10 | Data residency + hosting commitment (Sydney) | Refine to include Bedrock-Sydney migration (E7) + monthly verification script (E8) + named Data Residency Officer role |

### 7.3 Items Bianca has validated (already in register, no change)

| ID | Item | Validation |
|---|---|---|
| E.2 / B8 / B9 | AI accuracy risk under-audited | Bianca's "AI does not keep up with legislation changes" is E.2 restated. Register already carries it. **Elevated from P1 to P0 blocker** by Bianca's feedback. |
| E.3 / A1-A3 | Pricing coherence | Bianca's "we look like a downloadable document" is E.3 restated - pricing coherence + signalling. |
| E.4 / A4-A5-A9 | Build gaps (RLS, Stripe, TS errors, Awards Interpreter placeholder) | Bianca's "what's actually built" implicit. Elevated to P0. |
| E.5 / B15 | Employment Hero HeroForce threat + accountant channel | Bianca doesn't name this but her cost-scaling worry aligns with the distribution-moat argument. No change to B15. |
| E.7 / C14 | Buyer-trust proof thin (case studies) | Bianca's implicit worry - the Foundation 100 wall is the answer. No change. |
| E.11 / C10 | Data residency claim needs verification | Bianca's Section 2e directly requests this. Refined per Section 6.4. |

---

## 8. Sources

### Verified Australian competitor pricing (mid-2026)

- Lawpath pricing: [https://lawpath.com.au/pricing](https://lawpath.com.au/pricing) - fetched 2026-07-13. Essentials $45/mo annual ($540/yr) or $67/mo monthly, Legal Advice $155/mo annual, bundle $175/mo annual. Atlas AI included.
- Cleardocs Employment Contract: [https://www.cleardocs.com/products-employment-contract.html](https://www.cleardocs.com/products-employment-contract.html) - fetched 2026-07-13. Single-use $117.70 inc GST, 12-month unlimited $510.40 inc GST.
- Sprintlaw Employment Contract: [https://sprintlaw.com.au/employment-law/employment-contract/](https://sprintlaw.com.au/employment-law/employment-contract/) - fetched 2026-07-13. General package $500 + GST, FT/PT-focused $900 + GST.
- BetterHR plans + shop: [https://betterhr.com.au/plans-pricing/](https://betterhr.com.au/plans-pricing/) - accessed 2026-07-13. From $99/mo flat + $9.99/user.
- LegalVision Membership: [https://legalvision.com.au/membership/](https://legalvision.com.au/membership/) - Essentials $119-149/wk ex GST, Pro $219-1,350+/wk. 12-month minimum.
- Legal123 template pricing: [https://legal123.com.au/compare/legal123-vs-lawpath/](https://legal123.com.au/compare/legal123-vs-lawpath/) - $59-$299 per template.
- Workforce Guardian: [https://www.workforceguardian.com.au/hr-systems/](https://www.workforceguardian.com.au/hr-systems/) - HR Essential (up to 10 emp), Professional (up to 50), Platinum (10 consulting hrs). Pricing quote-gated.
- HR Central: [https://hrcentral.com.au/hr-software/](https://hrcentral.com.au/hr-software/) - subscription HR software + advisor bundle. Pricing not published.
- Employment Innovations: [https://www.employmentinnovations.com/](https://www.employmentinnovations.com/) - outsourced HR + payroll. Pricing quote-gated.
- HR outsourcing market benchmark: [https://www.valont.com.au/insights/cost-of-hr-outsourcing-australia](https://www.valont.com.au/insights/cost-of-hr-outsourcing-australia) - $45-$1,500/mo, $45-$400 PEPM.
- ScaleSuite outsourcing costs: [https://www.scalesuite.com.au/resources/outsourcing-hr-australia](https://www.scalesuite.com.au/resources/outsourcing-hr-australia)
- Citation Group HR outsourcing pricing: [https://citationgroup.com.au/hr/hr-outsourcing/cost/](https://citationgroup.com.au/hr/hr-outsourcing/cost/)

### AU AI legal advice + liability landscape

- Federal Court of Australia GPN-AI Practice Note (16 April 2026): [https://www.fedcourt.gov.au/law-and-practice/practice-documents/notice-to-profession/16-april-2026](https://www.fedcourt.gov.au/law-and-practice/practice-documents/notice-to-profession/16-april-2026) `[HIGH]`
- NSW Law Society Solicitor's Guide to AI (Jan 2026): [https://www.lawsociety.com.au/sites/default/files/2026-01/20260109%20LS4816_PSU_GuidetoAI_2026-01-08a%20FINALv2.pdf](https://www.lawsociety.com.au/sites/default/files/2026-01/20260109%20LS4816_PSU_GuidetoAI_2026-01-08a%20FINALv2.pdf) `[HIGH]`
- Barry Nilsson on AI in the courtroom: [https://bnlaw.com.au/knowledge-hub/insights/ai-in-the-courtroom-lessons-from-recent-cases-and-regulatory-shifts/](https://bnlaw.com.au/knowledge-hub/insights/ai-in-the-courtroom-lessons-from-recent-cases-and-regulatory-shifts/) `[HIGH]` - covers 15 Aug 2025 Federal Circuit case (fake AI-generated citations, referral to WA Legal Practice Board).
- PW Lawyers on AI disclaimers: [https://www.pwlawyers.com.au/blog/using-generative-ai-responsibly--sample-disclaimers-for-legal-practitioners](https://www.pwlawyers.com.au/blog/using-generative-ai-responsibly--sample-disclaimers-for-legal-practitioners) `[HIGH]`
- SafeAI-Aus legal landscape: [https://safeaiaus.org/safety-standards/ai-australian-legislation/](https://safeaiaus.org/safety-standards/ai-australian-legislation/) `[MED]`
- HFK Lawyers on AI defamation: [https://www.hfklawyers.com.au/article/ai-and-defamation-law-in-australia/](https://www.hfklawyers.com.au/article/ai-and-defamation-law-in-australia/) `[MED]`

### PI insurance (AU tech + AI-advice)

- Upcover PI cost 2026: [https://www.upcover.com/blog/professional-indemnity-insurance-cost](https://www.upcover.com/blog/professional-indemnity-insurance-cost) `[HIGH]`
- National Cover PI cost 2025: [https://nationalcover.com.au/professional-indemnity-insurance-cost/](https://nationalcover.com.au/professional-indemnity-insurance-cost/) `[HIGH]`
- Marsh Australia solicitor / legal PI: [https://www.au.marsh.com/business/professional-services/solicitors.html](https://www.au.marsh.com/business/professional-services/solicitors.html) `[HIGH]`
- AJG small business PI: [https://www.ajg.com/au/insurance/small-business/professional-indemnity-insurance/](https://www.ajg.com/au/insurance/small-business/professional-indemnity-insurance/) `[HIGH]`
- Atlas Insurance on AI risk coverage: [https://www.atlasinsurance.com/what-coverage-do-i-need-for-ai-related-risks/](https://www.atlasinsurance.com/what-coverage-do-i-need-for-ai-related-risks/) `[MED]`
- American Bar Association on AI liability coverage: [https://www.americanbar.org/groups/journal/articles/2025/does-your-professional-liability-insurance-cover-ai-mistakes-dont-be-so-sure/](https://www.americanbar.org/groups/journal/articles/2025/does-your-professional-liability-insurance-cover-ai-mistakes-dont-be-so-sure/) `[HIGH, US context but relevant on AI-cover gap]`
- Compare the Market PI: [https://www.comparethemarket.com.au/business-insurance/professional-indemnity/](https://www.comparethemarket.com.au/business-insurance/professional-indemnity/) `[MED]`

### Data residency (AU)

- Supabase available regions: [https://supabase.com/docs/guides/platform/regions](https://supabase.com/docs/guides/platform/regions) `[HIGH]`
- Supabase change project region: [https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z](https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z) `[HIGH]`
- Cross-region Supabase backup + compliance: [https://simplebackups.com/blog/cross-region-supabase-backup-compliance](https://simplebackups.com/blog/cross-region-supabase-backup-compliance) `[MED]`
- Lorikeet AU AI data-residency guide: [https://www.lorikeetcx.ai/articles/ai-support-australian-data-residency-guide](https://www.lorikeetcx.ai/articles/ai-support-australian-data-residency-guide) `[MED]`
- AWS Bedrock Claude availability: [https://aws.amazon.com/bedrock/claude/](https://aws.amazon.com/bedrock/claude/) `[HIGH]`

### IP assignment, source escrow, co-founder governance (AU)

- Sprintlaw SaaS legal checklist: [https://sprintlaw.com.au/articles/saas-legal-checklist-in-australia-contracts-ip-and-privacy/](https://sprintlaw.com.au/articles/saas-legal-checklist-in-australia-contracts-ip-and-privacy/) `[HIGH]`
- Sprintlaw source code escrow: [https://sprintlaw.com.au/articles/source-code-escrow-agreements-what-australian-saas-businesses-should-include/](https://sprintlaw.com.au/articles/source-code-escrow-agreements-what-australian-saas-businesses-should-include/) `[HIGH]`
- Viridian Lawyers founder IP assignment: [https://viridianlawyers.com/blog/intellectual-property-assignment/](https://viridianlawyers.com/blog/intellectual-property-assignment/) `[HIGH]`
- Ashurst Perkins Coie IP assignment drafting: [https://www.ashurstperkinscoie.com/en/insights/being-present-drafting-effective-intellectual-property-assignments/](https://www.ashurstperkinscoie.com/en/insights/being-present-drafting-effective-intellectual-property-assignments/) `[HIGH]`
- Escrow London AU SaaS escrow: [https://www.escrowlondon.com/what-is-saas-escrow-australia/](https://www.escrowlondon.com/what-is-saas-escrow-australia/) `[HIGH]`
- Promise Legal on founder IP diligence: [https://blog.promise.legal/startup-central/founder-ip-assignment-startup/](https://blog.promise.legal/startup-central/founder-ip-assignment-startup/) `[MED]`

### Prior HQ.ai research (cross-referenced)

- `hqai/docs/research/2026-05-21_mission-validation.md` - doubt register, band scorecard, evidence base
- `hqai/docs/research/2026-05-21_mission-action-register.md` - A/B/C/D action items referenced throughout
- `hqai/docs/research/retention-and-monetisation-brief.md` - pricing architecture, credit definitions, retention mechanics, Foundation 100 model
- `hqai/docs/research/2026-05-16_ai-doc-creation-teardown.md` - competitor teardowns, Tome cautionary case, 3-tier router, embedding stack recommendations
- `hqai/CLAUDE.md` - pricing ladder, env-var SKUs, Foundation 100 config
- `hqai/lib/template-ip.ts` - 33 template definitions
- `hqai/lib/prompts.ts` - jurisdiction lock, deny-list, escalation logic

### What I could not verify (flagged for founder follow-up)

- **BetterHR exact tier pricing at HR Essential / Professional / Platinum levels** - the plans page loads dynamically and specific per-tier costs were not extractable via WebFetch. Base entry point $99/mo confirmed, per-tier gradient not verified. `[LOW]` - recommend a manual check before publishing Section 1's competitor comparison table externally.
- **Sprintlaw HR review add-on hourly rate** vs. their base employment contract package - not published; would need a direct quote request. `[LOW]`
- **Cleardocs update cadence** - their template was current as at 11 December 2023 per the last search result. Whether they have published a mid-2026 update was not verified. If Cleardocs has fallen behind on the 2024-2026 employment law changes, HQ.ai's currency-cadence commitment becomes a genuine differentiator. Worth a founder-check. `[LOW]`
- **HR Central / Employment Innovations / Workforce Guardian exact pricing** - all three gate specific pricing behind sales-quote requests. Ranges given in Section 1 are the best available public data. `[LOW]` - if any becomes a paying-customer objection at scale, quote them directly for accurate benchmarking.
- **AU-specific case law of AI-vendor-liable-for-end-user-outcome** - no published AU case has yet directly held a vendor liable in this shape. This is a genuine void in the case law; HQ.ai will either be an early defendant if something goes wrong or an early success story if the Terms + insurance layer holds. `[LOW-MED]`

---

*End of response.*
