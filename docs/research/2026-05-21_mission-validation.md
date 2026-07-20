# HQ.ai Mission Validation - Does "almost zero doubt" hold?

**Date**: 2026-07-09 (file named per founder convention 2026-05-21)
**Author**: Senior market/strategy research agent, adversarial framing
**Audience**: Founder (Jimmy Rayner). Solo operator. Pilot cohort live.
**Confidence legend**: [HIGH] primary-source verified | [MED] multi-source secondary | [LOW] researcher judgement, flagged as inference
**Standard**: every material claim has a dated source. Every conclusion has a confidence tag. Disconfirming evidence is surfaced first, not last. Australian English throughout. Plain hyphens only.

---

## Pre-flight - what the codebase actually delivers versus what the founder says it delivers

Read into memory before the analysis proper. Three material discrepancies between founder-stated position and the current codebase, all found in the pre-flight, all worth flagging because "almost zero doubt" cannot be met while the founder and the product disagree on what is being sold:

1. **Pricing story is fractured across three parallel schemas.** The founder's brief cites HQ People $59/$179, HQ Recruit add-on $40/$120, Bundle "Complete" $89/$269. `lib/pricing-config.ts` carries the "C10" self-serve model (June 2026) at those exact numbers, alongside the primary Solo $89 / Business $269 two-tier subscription (the wired Stripe path), the Foundation 100 offer locked at $189/mo, and the Enterprise stack HR365 $799 / Recruit365 $899 / HR365+Recruit365 $1,599 (with the enterprise multiplier schedule for 40-500+ staff). Four different pricing narratives are simultaneously live in the codebase. `hqai/CLAUDE.md` documents Business at $249, `pricing-config.ts` has Business at $269, retention brief §2.3 has $249, Foundation locked in CLAUDE.md at $179 vs config at $189. **This is not a small thing.** For a buyer to have "almost zero doubt", the founder must first have zero doubt about which of these is the offer. See §E.3.

2. **Stated capability vs shipped capability.** Per `CLAUDE.md` "Current build status": Stripe subscription checkout is incomplete, Awards Interpreter is a placeholder, Compliance Assessment is a placeholder, Team seat management does not exist, Advisory hours tracking does not exist, Calendly advisor booking is a placeholder, Shortlist Agent / Screening / Campaign Coach are placeholders, RLS is disabled with SQL not applied, TypeScript build errors are suppressed via `ignoreBuildErrors: true`. The AI chat, doc generation, HR templates, prescreen video flow, and CV scoring do work. The founder's public positioning implies a fully wired platform; the reality is a working chat/doc/prescreen surface stapled to a placeholder shell. This is normal for pilot but it is material to a mission validation.

3. **Template count is correct.** 33 templates in `ALL_TEMPLATES` (I counted: 6 Letters/Contracts, 7 Performance, 5 Termination, 7 Policies, 5 Recruitment, 3 Return to Work). The prompt architecture (`lib/prompts.ts`) has proper Australian jurisdiction lock, deny-list, hard-triage regex patterns, and grounding discipline (search_knowledge and get_pay_rate tools). This is a genuine strength - flag it as such.

---

## A. Executive verdict

**"Almost zero doubt that HQ.ai solves legitimate and current real-world problems for Australian businesses, no matter the size" - does that hold today?**

**No, not today. Partially, and only for one band.** Overall confidence in the mission-as-stated being met: **~35%.** [MED-LOW]

Broken down: the mission holds credibly for **small businesses (5-19 employees)** at ~65% confidence, holds partially for **medium (20-199)** at ~35%, holds weakly for **micro (0-4)** at ~25%, and effectively does not hold for **large (200+)** at <10%. The composite "no matter the size" qualifier is the load-bearing failure; HQ.ai is a small-business product being described as if it were size-agnostic, and the size-agnostic claim is false on current evidence.

**The five load-bearing reasons the mission is not yet met:**

1. **The regulatory problem HQ.ai names is genuinely acute for the small-business band, but only for that band.** [HIGH] The FWO recovered $358M for 249,000+ workers in 2024-25 (5-year total >$2B), and the Fair Work Commission logged 44,075 applications with unfair-dismissal claims up 11% YoY (16,500 UDs in 2024-25, described by FWC President Hatcher as "unsustainable"). Wage theft has been a criminal offence since 1 Jan 2025 with individual maxima of 10 years and $1.65M. Right to Disconnect now applies to businesses <15 employees (26 Aug 2025). This is a real, current, priced-in problem. But 60% of FWO 2024-25 recoveries came from large-corporate employers ($213M from ~118k workers at large firms), so the fear-narrative HQ.ai leans on ("Fair Work is complicated, you'll get sued") is empirically weakest exactly where the SME wedge sits. The problem is real; the felt-severity to a 6-person cafe owner is genuinely lower than the marketing implies.

2. **The solution is credible for straightforward HR admin and pre-hire triage, and thin-to-broken for the situations that actually cost businesses money.** The 33 templates and the escalation architecture handle the everyday work of contracts, offers, warnings, PIPs, and pre-screen. They do not, and cannot, handle payroll (the single largest source of $358M FWO recoveries), workplace investigations, EBAs, workers-compensation claims, discrimination cases, or termination decisions - the prompt correctly deny-lists all of these. That is the honest boundary, and it means HQ.ai is a self-serve HR-admin product with an AI advisor layer, not a "complete HR solution". The gap between what the mission implies and what the deny-list requires is the mission-critical honesty problem. Confidence [HIGH] that this gap exists; [MED] that the market will read it as a gap rather than a virtue.

3. **The competitive position is strong against Employsure, defensible against MyHR, and structurally exposed against Employment Hero.** Employment Hero raised A$263M in October 2023 at ~A$2B valuation, has 300k+ businesses on-platform, and launched HeroForce in 2025 with three AI agents (recruitment SmartMatch, payroll/award interpreter, HR bot) targeting the exact same problem HQ.ai targets, with CEO Ben Thompson quoting a A$40k-$80k SME compliance-cost figure - the same figure HQ.ai's landing brief leans on. Employment Hero is running down the same runway with 10-100x the resources, an existing accountant channel that drives ~30% of gross adds, and an integrated payroll product HQ.ai does not have and has correctly chosen not to build. HQ.ai's "flat pricing beats per-employee" argument is genuine [HIGH] for sub-30-employee SMEs, but the moat is thin above 30 staff. Confidence: [HIGH] that HQ.ai wins on price for the small band and [MED] that it loses on breadth for the medium band.

4. **The AI-legal-accuracy risk is under-mitigated relative to the mission bar.** The prompt architecture is disciplined - deny-list, jurisdiction lock, mandatory retrieval before factual claims, and hard-triage patterns for violence/harassment/litigation. But: (a) RLS is disabled in Supabase, TypeScript errors are suppressed, and the codebase has no shipped audit of AI accuracy against a ground-truth Fair Work corpus other than `tests/eval/run-eval.ts` (existence noted, results not surfaced in the mission context). (b) The February 2025 House Standing Committee recommendation to ban AI from making final recruitment decisions without human oversight [HIGH] is a live legislative signal that will constrain HQ Recruit's CV-scoring product within 18 months. (c) A single AI-generated Fair Work error that harms a candidate or employee, in a market where the FWO now has a formalised wage-theft criminal jurisdiction, is a brand-terminal event that no MSA or disclaimer footer can fully absorb. Confidence [MED] that the current mitigations are sufficient for pilot, [LOW] that they are sufficient for the mission bar of "almost zero doubt".

5. **The "no matter the size" clause is not defensible.** ABS Counts of Australian Businesses at 30 June 2025 [HIGH]: 2,729,648 actively trading businesses, 994,178 employing. Only 4,062 employ 200+ staff. HQ.ai has zero enterprise-scale features (no SSO, no HRIS/payroll integration beyond intent, no SOC2, no multi-entity billing in production, no data-residency guarantees in the marketing collateral, and enterprise features are sales-assisted-only with a Year-1 hard cap of 10 customers per `pricing-config.ts` §enterprise.capacityCapYear1). The mission-as-stated cannot be true for large business because HQ.ai has explicitly not built for large business. The honest fix is either amend the mission to "for Australian SMEs" or build the enterprise stack. Confidence [HIGH].

**The single sentence.** HQ.ai is close to meeting the mission for one segment (5-19 employees, hospitality/trades/services), materially short for medium (20-199), and structurally unable to meet it for large. To get to "almost zero doubt" the founder must (a) tighten the mission to that segment, (b) ship the missing operational plumbing that makes the pilot production-safe, and (c) publish external evidence (an accuracy audit, a case-study cohort, an FWO-cited answer log) that lets a buyer verify the claim without taking it on faith.

---

## B. Per-size-band scorecard

Business-size definitions per ABS (Small Business Counts methodology, 2025) [HIGH]: micro 0-4 employees, small 5-19, medium 20-199, large 200+. ASBFEO uses "small = 0-19" (which is why the "97.3% of Aussie businesses are small" figure appears in market copy); for a mission validation the finer split matters.

**Distribution of employing businesses (Jun 2025)** [HIGH, ABS]:
- Non-employing (sole traders): 1,735,470 (63.6% of total)
- 1-19 employees: ~928,000 (98.4% of employing)
- 20-199 employees: ~62,000 (6.2% of employing)
- 200+ employees: ~4,062 (0.4% of employing)

### Band 1 - Micro (0-4 employees, sole-trader + micro-employer)

| Dimension | Assessment | Confidence |
|---|---|---|
| Problem severity | LOW-MED. The buyer does 0-2 hires/year, has 0-2 employees, and drafts 1-2 documents/year. Fair Work risk is genuine but rare enough that the average micro-employer is not thinking about it monthly. Underpayment cases at this band are almost always inadvertent (not "intentional" per the criminal threshold), so wage-theft criminalisation is not felt. Right to Disconnect applies but a 2-person business rarely tests its edges. | [MED] |
| Solution fit | PARTIAL. The one-off document marketplace ($25-$49) is a genuinely good fit for this buyer. The subscription ($89-$269) is over-priced for actual usage - the buyer would burn <100 credits/month. | [HIGH] |
| Competitive position | The one-off marketplace beats Lawpath ($28/mo subscription + $48+ per document) [HIGH]. The subscription loses to ChatGPT-plus-free-FWO-search for the price-sensitive buyer. | [HIGH] |
| Willingness to pay | $25-$49 for one document, occasionally. $89/mo subscription is above the psychological ceiling for most micro-employers. | [MED] |
| Mission met? | **PARTIAL (marketplace path only). 25% confidence in the subscription mission.** | |

Steelman argument against HQ.ai in this band: "I have two apprentices and a bookkeeper. When something goes wrong I call my accountant. HQ.ai wants $89 a month for a problem I have twice a year. Give me the $25 letter of offer and I'm done." This buyer is right, and the mission-as-stated cannot claim them without the marketplace. **The marketplace is not yet live** (per CLAUDE.md build status, "one-off documents" are Stripe SKUs defined in env-vars but the marketplace surface with no-signup checkout is not confirmed shipped). Without it, HQ.ai does not meet the mission for this band.

### Band 2 - Small (5-19 employees) - **the wedge**

| Dimension | Assessment | Confidence |
|---|---|---|
| Problem severity | HIGH. The buyer runs 4-15 hires/year, drafts warnings/PIPs occasionally, hits Modern Award classification confusion regularly, and lives in the "one FWC claim would ruin my week" fear-zone that the landing brief captures well. Right to Disconnect (26 Aug 2025), casual conversion (Employee Choice Pathway from 26 Aug 2024), and the psychosocial safety duty are live compliance duties this band routinely fails. | [HIGH] |
| Solution fit | STRONG. The 33 templates cover >90% of the actual paperwork this buyer generates in a year. The AI advisor handles Fair Work Q&A. The prescreen video/CV scoring is a real productivity gain in a hiring band where the founder is the recruiter. | [HIGH] |
| Competitive position | Wins on price vs Employment Hero (per-employee at $19-$49/emp makes a 12-staff business pay $228-$588/mo just for HR software vs $89-$269 flat). Wins on brand vs Employsure (which the buyer resents on principle). Loses on integrated payroll to Employment Hero and to KeyPay/Xero payroll. | [HIGH] |
| Willingness to pay | $89-$269/mo is credible. Anchor comparisons: MyHR from NZ$295/mo for 10 employees, Employment Hero from ~$228/mo for 12 employees on Lite. | [MED] |
| Mission met? | **YES, at ~65% confidence, conditional on the missing plumbing shipping (Stripe checkout, RLS, awards interpreter, campaign coach).** | |

Steelman argument against: "I have Employment Hero for payroll already. Their HeroForce HR bot answers the same questions HQ.ai's does, and I don't have to add a second subscription." This is the real threat: distribution beats product for this band. HQ.ai wins on positioning ("advisor not vendor") and on unbundled pricing, but Employment Hero owns the account. The counter-strategy - accountant/bookkeeper partner channel per Q1 2027 in the retention brief - is unbuilt.

### Band 3 - Medium (20-199 employees)

| Dimension | Assessment | Confidence |
|---|---|---|
| Problem severity | HIGH but different. This band has an HR function (or a fractional HR consultant), often has a HRIS or payroll platform, faces workplace investigations, EBA questions, redundancy scenarios, and psychosocial safety complexity. The problems HQ.ai deny-lists (investigations, EBAs, complex ER) are the ones this band pays for. | [HIGH] |
| Solution fit | PARTIAL. The HQ People chat is useful as a first-line reference. HQ Recruit is useful at scale. The template library is useful but this band often has bespoke policies already. HR365 at $799/mo and Recruit365 at $899/mo are pitched at this band (qualifying headcount 40-80) but require sales-assisted delivery from a solo founder. | [MED] |
| Competitive position | Employment Hero owns this band via SmartMatch + payroll bundle. MyHR competes with a strong "software + advisor" position at NZ$295+/mo. Chambers/industry associations offer HR helplines free. HR365/Recruit365 competes credibly on advisor-continuity ("same person every time") which is a real weakness for competitors. | [MED] |
| Willingness to pay | HR365 pricing ($799-$1,599/mo) is below HR-advisor-retainer benchmarks (Employsure ~$1k-$5k/mo) [HIGH]. This is credible. The self-serve Business tier at $269/mo is under-priced for the value delivered here. | [MED] |
| Mission met? | **PARTIAL, at ~35% confidence. The self-serve product is thin; the human-advisor product is not yet operationalised for scale.** | |

Steelman argument against: "We already have an HRIS (Dayforce/Employment Hero/ELMO). We have a fractional HR advisor on retainer. What does HQ.ai give us that we don't have?" The honest answer is "an Australian-law-cited AI first-line and a same-human advisor at half the cost of most retainers", which is a real value proposition but not one that unseats an incumbent HRIS. HQ.ai here is complementary, not substitute.

### Band 4 - Large (200+ employees)

| Dimension | Assessment | Confidence |
|---|---|---|
| Problem severity | HIGH. This band accounts for 60% of FWO 2024-25 back-payments ($213M from 118k workers, per FWO Annual Report 2024-25 [HIGH]). But their problems are systemic (multi-entity payroll, EBAs, ER teams, complex Awards interaction with EBAs, RPO/MPHRO contracts). | [HIGH] |
| Solution fit | LOW. HQ.ai has no SSO, no SOC2, no multi-entity billing in production, no HRIS integration, no dedicated payroll interpreter that scales to 500+ headcount, no compliance-audit dashboards, no SLA-backed advisor coverage. The enterprise multiplier schedule (`pricing-config.ts` §enterpriseMultipliers) tops out at 251-500 staff as "Strategic tier, founder discretion, not published" and >500 as unquotable. | [HIGH] |
| Competitive position | Not competitive. Dayforce, ADP, Workday, Rippling, and Employment Hero Unlimited own this band. RPO providers (PeopleScout, Korn Ferry, Hays, Randstad, Chandler Macleod, Hudson) own recruitment at scale. HQ.ai is not in the consideration set. | [HIGH] |
| Willingness to pay | Irrelevant - HQ.ai has not built the product for this band. | - |
| Mission met? | **NO, at <10% confidence.** | |

Steelman argument against: none needed. HQ.ai is explicitly capped at 10 enterprise partnerships in year 1 and the enterprise SKUs are gated behind `salesAssistedOnly: true` (`pricing-config.ts` line 399). The mission-as-stated ("no matter the size") is inconsistent with the product-as-built.

**Summary scorecard**:

| Band | Problem severity | Solution fit | Competitive | Willingness to pay | Mission met? | Confidence |
|---|---|---|---|---|---|---|
| Micro 0-4 | LOW-MED | PARTIAL (marketplace only) | Marketplace: wins vs Lawpath | Sub: over; one-off: yes | Partial | 25% |
| Small 5-19 | HIGH | STRONG | Wins vs Employsure/EH-Lite | Yes | Yes | 65% |
| Medium 20-199 | HIGH | PARTIAL | Loses vs EH+HRIS | Yes for advisor SKUs | Partial | 35% |
| Large 200+ | HIGH | LOW | Not competitive | n/a | No | <10% |

---

## C. Problem and regulatory-currency findings

### C.1 The problem, quantified

- **Wage recoveries at scale**. FWO recovered $358M in 2024-25 for 249,000+ workers, $473M in 2023-24, >$2B across five years. 60% of 2024-25 was from large corporates ($213M / 118k workers). SME back-payments are still material at ~$145M / ~131k workers. Source: [FWO Annual Report 2024-25, 29 Oct 2025](https://www.fairwork.gov.au/newsroom/media-releases/2025-media-releases/october-2025/20251029-annual-report-2024-25-media-release). [HIGH]
- **Enforcement intensity**. FWO 2024-25: 73 new litigations, $23.7M court penalties (record), 8 Enforceable Undertakings, 1,220 Compliance Notices, $7.3M via dispute assistance. Peak penalty case: Sushi Bay $15.3M for underpaying 163 workers >$650k. Source: [FWO Annual Report 2024-25]. [HIGH]
- **Unfair-dismissal volume**. FWC lodged 44,075 applications in 2024-25; 16,500 unfair dismissals (37% of matters); +11% YoY; +41% since 2022-23. President Hatcher publicly called the trajectory "unsustainable" (Nov 2025). Sources: [Gadens](https://www.gadens.com/legal-insights/a-system-under-strain-the-unsustainable-rise-in-fair-work-commission-applications/); [QLS Proctor](https://www.qlsproctor.com.au/2025/11/unsustainable-increase-prompts-fwc-reform/); [HRD Australia](https://www.hcamag.com/au/specialisation/employment-law/fair-work-commission-unveils-reforms-as-applications-surge/556415). [HIGH]
- **Small-business dismissal rate**. Small-business dismissals (fewer than 15 employees) are handled by the Small Business Fair Dismissal Code; the "unfair dismissal" statistical bucket largely captures 15+-employee employers. Small-business owners still face general-protections and adverse-action claims (16-17% of FWC matters). [MED]
- **Cost of an underpayment finding**. Wage theft criminal offence live from 1 Jan 2025: corporate fines up to A$8.25M or 3x underpayment; individual up to 10 years and A$1.65M. Small-business safe harbour: compliance with the Voluntary Small Business Wage Compliance Code (for <15 employees) prevents referral to prosecution. Source: [DEWR](https://www.dewr.gov.au/closing-loopholes/announcements/new-wage-theft-criminal-offence-will-commence-1-january-2025); [Keypoint Law](https://www.keypointlaw.com.au/keynotes/significant-changes-to-workplace-laws-from-1-january-2025/); [Jake McKinley](https://jakelaw.com.au/criminalisation-of-wage-theft-australia/). [HIGH]
- **Recruitment cost pressure**. Recruitment agency fees 15-25% of salary (average 18%, Aug 2025). AHRI cost-per-hire moved from $10,500 (2020) to $23,860 (2021); SME onboarding costs A$4,000-A$7,000 per new employee. Source: [Scale Suite](https://www.scalesuite.com.au/resources/hiring-cost-recruiter-australia-smes); [Harrison McMillan](https://www.harrisonmcmillan.com.au/do-you-actually-know-your-cost-per-hire-its-likely-higher-than-you-think). [MED]
- **The founder's/Employment Hero's compliance-cost claim**. Employment Hero CEO Ben Thompson: "average SME spends between A$40,000 and A$80,000 annually just to remain compliant with employment law". Not independently verified; the underlying methodology is vendor-published, not ABS/PC. Treat as directional not evidentiary. Source: [SmartCompany](https://www.smartcompany.com.au/startupsmart/employment-hero-business-legal-employer-new-ai-system/). [LOW-MED]

**Adversarial reading**. The FWO/FWC data is loud but concentrated at large employers. For an owner-operator of a 6-person cafe, the *personal* probability of a criminal wage-theft prosecution in the next 12 months is close to zero (the criminal threshold requires "intentional conduct", the small-business safe harbour explicitly protects <15 employees, and the FWO's compliance-first posture with SMEs is repeatedly stated in its Compliance and Enforcement Policy). The fear-narrative HQ.ai's landing brief leans on is empirically calibrated to the wrong band. The problem is legitimate; the marketing calibration is off.

### C.2 Regulatory-currency check

The prompt architecture is grounded in the right law (Fair Work Act 2009, NES, all Modern Awards, state/territory legislation, Anti-Discrimination Acts, WHS Acts, Privacy Act 1988, Super Guarantee Admin Act, Long Service Leave state statutes, Workers Comp state statutes). No non-AU jurisdictions. Deny-list covers termination, redundancy, discrimination, GP claims, workers comp, underpayment, modern slavery, visa. This is genuinely good and should be kept. [HIGH]

**Currency assessment against 2024-2026 changes**:

| Change | Live from | HQ.ai handling | Adequacy |
|---|---|---|---|
| New casual definition + Employee Choice Pathway | 26 Aug 2024 | Casual Conversion Letter template exists; prompt system does not appear to explicitly walk the Employee Choice Pathway 21-day response duty. Verify. | [MED - needs check] |
| Right to Disconnect (15+ employers) | 26 Aug 2024 | Not explicitly named in the prompt or the template library. | [LOW - gap] |
| Right to Disconnect (<15 employers) | 26 Aug 2025 | Same gap. | [LOW - gap] |
| Wage theft criminal offence | 1 Jan 2025 | Deny-list covers "underpayment" - correct. Small Business Wage Compliance Code should be surfaced as a specific pathway; unclear whether it is. | [MED - needs check] |
| Independent contractor definition (Closing Loopholes) | 26 Aug 2024 | The prompt mentions "Contractor vs employee classification uncertainty" as escalation trigger - correct. | [MED] |
| Same-job-same-pay | 1 Nov 2024 | Not surfaced in the prompt. Gap for labour-hire scenarios. | [LOW - gap] |
| Psychosocial safety WHS regulations (state-based) | 2023-2025 (varies) | Not explicitly in the template library or prompt. Warning-letter and PIP templates do not surface the WHS psychosocial duty. | [LOW - gap] |
| Payday super (super paid with wages) | 1 Jul 2026 | Not surfaced. | [LOW - gap] |
| Gender pay gap reporting (WGEA 100+ employers) | Ongoing | Not surfaced. Only bites at 100+ headcount - correctly out of small-band scope. | [n/a for wedge] |
| February 2025 House Committee AI-in-recruitment recommendation | Advisory | Not yet law but flags direction of travel. HQ Recruit CV scoring will need human-review-of-final-decision documentation. | [LOW - watch] |

**Conclusion on currency**. HQ.ai is grounded in the right legal framework and has correct guardrails on the highest-risk topics. It has clear currency gaps on the middle-tier compliance shifts of 2024-2026: Right to Disconnect specifically, psychosocial safety duties, same-job-same-pay, and the payday-super transition. These are exactly the "things the buyer will ask about next" for a 2026 buyer, and their absence in the template library and prompt logic is a currency debt. [MED-HIGH gap identified]

### C.3 Legal liability of AI-generated HR advice

- Australia has no AI-specific employment legislation as of mid-2026. Existing law (Privacy Act 1988 + APPs, anti-discrimination Acts, Fair Work Act general protections) applies technology-neutrally. Source: [aks law](https://akslaw.com.au/2025/03/21/ai-in-recruitment/); [Lexology](https://www.lexology.com/library/detail.aspx?g=310a4007-cdbe-424e-b3e9-077b93f7362a). [HIGH]
- **Direction of travel**: February 2025 House Standing Committee on Employment, Education and Training recommended banning AI from making final recruitment decisions without human oversight. Not yet law but signals within-18-months regulation. [HIGH signal, LOW timing certainty]
- **Discrimination exposure**: an AI-generated CV screen that indirectly filters on protected characteristics creates employer liability under the Sex Discrimination Act, Age Discrimination Act, Racial Discrimination Act, Disability Discrimination Act, and Fair Work Act general protections. The employer, not the vendor, is liable, but a plaintiff's lawyer will attempt to name the vendor as concurrent wrongdoer. Source: [ABL](https://ablawyers.com.au/resources/articles-downloads/bias-by-algorithm-can-ai-make-you-liable-for-discrimination). [HIGH]
- **Privacy exposure**: candidate video, biometric-adjacent data from prescreen, resume PII, and CV scoring all sit under APPs 1-13 with tighter requirements after the Privacy Act reform tranches (2024-2026). HQ.ai's data-residency claim ("hosted in Sydney" per landing brief §3) is correct if verified in Supabase project settings, but must survive an OAIC audit. Verify Cloudflare Stream data-residency for candidate video. [MED - verification needed]

**Mitigations HQ.ai has**: strong prompt architecture, jurisdictional lock, deny-list, hard-triage patterns, escalation to human. **Mitigations HQ.ai lacks or has under-documented**: (a) public accuracy audit of the AI's Fair Work outputs against a ground-truth corpus, (b) a documented human-in-the-loop policy for all CV-scoring outputs (the current UI surfaces a score with rubric but does not enforce that a human sign off before any adverse action), (c) an APP Privacy Impact Assessment for the candidate-video flow, (d) an SLA-backed correction/retraction path if the AI publishes an incorrect answer. These four are all achievable in 2-4 weeks each. Their absence is the load-bearing "trust bar" gap for the mission.

---

## D. Competitive and substitute landscape

### D.1 The five substitute categories and how HQ.ai does against each

**(a) DIY / free / ChatGPT** [HIGH]
- FWO free Pay Calculator, free FWO templates (Letter of Offer, Warning), free FWO Small Business Hub, free 13 13 94 phone line.
- ChatGPT and Copilot are widely used by SME owners for HR drafts (the landing brief captures this: "Tried ChatGPT but it doesn't know Australian law").
- HQ.ai edge: cited answers, deny-list on legal-adverse tasks, awards-and-NES retrieval. Real. Genuinely better than free ChatGPT for Australian-specific questions.
- HQ.ai weakness: the "free" tier stops after 14 days. The Google-Doc drafter of a warning letter is not a lost buyer; they never intended to pay.
- Verdict: HQ.ai wins on quality, loses on price for the truly-DIY buyer. Winnable via marketplace.

**(b) HR/ER advisory subscriptions** [HIGH]
- Employsure (Peninsula Australia): 1/3/5-year contracts, pricing not published, public reports of $1k-$5k/mo, 2,674 reviews on Peninsula AU Trustpilot page (5-star rating displayed, but mixed content; historical ACCC $3M penalty on record). Source: [Peninsula AU Trustpilot](https://au.trustpilot.com/review/peninsulagrouplimited.com.au); [Employsure Pricing](https://employsure.com.au/pricing). [HIGH for existence, MED for pricing]
- Workforce Guardian: annual SaaS subscription, "Australia's #1 HR Compliance System" positioning, pricing not fully public. [MED]
- HR Central: subscription HR software + policy library + advisor access, targets 15-500 headcount. [MED]
- Verdict: HQ.ai wins on brand vs Employsure decisively (the ACCC record + hate-base is a permanent structural advantage). Wins on price vs Employsure. Draws vs Workforce Guardian/HR Central for the small-band buyer.

**(c) HR + payroll platforms** [HIGH]
- Employment Hero: Lite $19/emp, Plus $29/emp, Unlimited $49/emp (min spend $200-$600/mo). 300k+ businesses, 2M+ employees, ~A$2B valuation (Series F 2023 A$263M raise). HeroForce = 3 AI agents (recruitment SmartMatch over 2.3M candidate pool + payroll/award interpreter + HR bot). Accountant partner channel drives ~30% of gross adds. [HIGH]
- ELMO/Dayforce (Ceridian): enterprise-first, works down-market via Dayforce Small Business. [MED]
- Deputy: rostering-first with HR bolt-on. [MED]
- KeyPay (now Employment Hero Payroll): payroll-first, ~A$99+/mo base. [MED]
- MyHR: NZ$295/mo for 10 employees, "software + unlimited HR advisor" bundle. 5-500 target. Cross-Tasman brand. [HIGH]
- Foundu: workforce-management focused. [MED]
- Verdict: HQ.ai loses on integrated payroll. Wins on unbundled pricing for sub-30-employee band. Real risk that Employment Hero's HeroForce normalises "AI HR + payroll bundled" and HQ.ai becomes an unnecessary second subscription.

**(d) Recruitment tools/ATSs** [HIGH]
- SEEK: dominant AU job board. Per-ad pricing $300-$500+, premium ads higher. Not an ATS.
- LinkedIn Recruiter: seat-based, ~US$10k+/year for a single seat. Enterprise-oriented.
- Indeed AU: cost-per-click programmatic + sponsored ads.
- JobAdder: AU-built ATS + agency CRM. Per-user pricing.
- Workable / Recruitee / Breezy HR / Manatal: mid-market ATS at $99-$599/mo depending on tier.
- Verdict: HQ.ai's Recruit product is a lightweight ATS-plus-video-prescreen-plus-AI-scoring. Wins on price and AU-specific compliance vs generic global ATS. Loses on candidate CRM depth, integrations, and agency workflows.

**(e) Recruitment agencies** [HIGH]
- Contingent agency fees 15-25% of salary, average 18%.
- On a $80k salary, agency fee $12k-$16k.
- SME buys agency when either urgent, niche, or thin candidate pool.
- Verdict: HQ.ai does not replace an agency. HQ.ai reduces the volume of hires that need an agency for the SME buyer who was previously outsourcing on autopilot. The strategic re-framing here is "cheaper than an agency for the roles you can self-serve" not "we are a recruitment agency substitute". The founder should say this out loud in copy.

### D.2 MPHRO and RPO - required deep dive

**Definitions and market shape**

MPHRO (Multi-Process HR Outsourcing) = a provider takes on multiple end-to-end HR processes (payroll, benefits, talent management, HR admin, compliance) under a multi-year contract, typically 3-7 years, priced per employee per month (PEPM) or a fixed retainer, with implementation fees. RPO (Recruitment Process Outsourcing) = a provider takes on some or all of the recruitment lifecycle - sourcing, screening, interviewing, offer management - either as a full-service enterprise engagement or as project-based / on-demand / micro-RPO. Both categories originated in the enterprise segment (500+ employees) and are moving down-market through modularisation. Sources: [Zalaris on MPHRO](https://zalaris.com/managed-services/resources/blog/multi-process-hr-outsourcing-transform-processes-and-drive-organisational-efficiency); [Harrison McMillan on RPO/micro-RPO 2025](https://www.harrisonmcmillan.com.au/rpo-in-2025-is-modern-recruitment-process-outsourcing-or-micro-rpo-right-for-your-business). [HIGH]

**Global market size**
- Global RPO: US$8.12B (2023), projected US$25.5B (2031), CAGR ~15%. APAC dominant with 37% of forecast growth. Source: [ResearchAndMarkets](https://www.businesswire.com/news/home/20260128714561/en/); [SNS Insider](https://www.globenewswire.com/en/news-release/2023/11/29/2787852/0/en/Recruitment-Process-Outsourcing-RPO-Market-to-Hit-USD-24-42-Billion-by-2030-Driven-by-Global-Talent-Crunch-and-Globalization-of-Businesses-Research-by-SNS-Insider). [MED]
- Global MPHRO: analyst CAGR 7-9% through 2025-2028; ADP is Everest PEAK Matrix Leader (2024). [MED]
- Australia-specific market size: not independently reported in the searches. Directional inference: AU RPO market is a proportional share of APAC (37% of forecast global growth) with the AU market being the largest APAC market ex-China/India for enterprise-mature RPO buyers. [LOW inference]

**Who operates in Australia**

RPO:
- **PeopleScout** (TrueBlue): APAC HQ in Sydney; runs full-service and project RPO across AU/NZ/Singapore/India. Focus on enterprise (500+ hires/year). [HIGH]
- **Hudson RPO**: AU-headquartered RPO provider, part of Hudson Global. Full-service and project. [HIGH]
- **Talent Solutions (ManpowerGroup)**: Global RPO with AU presence. [HIGH]
- **Korn Ferry**: RPO + executive search + advisory. Enterprise-focused. [HIGH]
- **Hays RPO**: RPO built off staffing footprint. [HIGH]
- **Robert Walters Outsourcing**: RPO + payroll outsourcing. [HIGH]
- **Chandler Macleod**: RPO + on-demand recruiter. [HIGH]
- **HOBAN Recruitment**: AU-owned, RPO among services. [HIGH]
- **Rent a Recruiter**: on-demand / micro-RPO play. [MED]
- **Michael Page, Adecco, Randstad, Aerotek, Uplers, Vanator RPO**: named in AU top-20 lists. [MED]

MPHRO / BPO (HR):
- **ADP**: Everest MPHRO Leader; full-service HRO. AU presence via ADP Australia. Large-corporate focus. [HIGH]
- **Dayforce (Ceridian)**: managed HCM services on the Dayforce platform. AU presence. Mid-to-large market. [HIGH]
- **Employment Innovations**: AU boutique HR outsourcer, mid-market. [MED]
- **Employment Hero Managed Services**: emerging - Employment Hero offering the "HR-as-a-service" wrapper on its own platform. [MED]
- **TMF Group**: global HR/payroll BPO with AU presence. [MED]
- **NGA Human Resources (Alight)**: enterprise HR BPO. [MED]
- **Peninsula Australia (Employsure)**: sold as ER-advisory outsourcing rather than MPHRO; occupies the SME analogue. [HIGH]

**Who buys and why**

- **RPO enterprise buyers (500+ hires/year)**: primarily large corporates with volume hiring or specialist hiring pain, buying to convert internal fixed recruitment cost to variable outsourced cost, gain talent-market intelligence, and access sourcing capacity.
- **RPO mid-market buyers (50-500 hires/year)**: buying project RPO or on-demand RPO for burst hiring, or ongoing modular RPO where they don't want to build an internal TA function.
- **RPO SME buyers (5-50 hires/year)**: emerging "micro-RPO" segment. Buying because they can't attract a senior TA hire and can't sustain agency-fee-per-hire on volume. This is the segment where HQ Recruit and Recruit365 have a legitimate story.
- **MPHRO enterprise buyers (200+ employees)**: buying to shed HR admin, payroll, and compliance risk to a specialist provider; buying for HRIS-as-a-service in cases where they don't want to run their own platform.
- **MPHRO/HR outsourcing SME buyers (20-200)**: buying "fractional HR" from boutique providers like Employment Innovations, buying "outsourced ER advice" from Employsure/Peninsula, buying MyHR's software+advisor bundle.

**Where HQ.ai's HR365 / Recruit365 sits**

*Legitimate lightweight MPHRO/RPO substitute for*:
- **Sole-advisor SMBs (30-100 employees)** who want continuity, priced predictability, and an Australian-law-fluent advisor without either the sales-heavy Employsure model or the enterprise MPHRO integration burden. HR365 at $799/mo is well below MPHRO benchmarks and well below Employsure retainers. [HIGH]
- **Volume-hiring 20-100-employee SMBs** who want a talent partner running 4-10 concurrent roles without agency-fee-per-hire economics. Recruit365 at $899/mo (with $750/role uplift for the 5th+ concurrent role) is a coherent micro-RPO substitute for 30-50 closures/year. [HIGH]

*Not a legitimate substitute for*:
- **Enterprise MPHRO** (200+ headcount, multi-entity, HRIS-managed-service, EBA/ER complexity). HQ.ai has neither the operational surface nor the SLA depth to compete here. [HIGH]
- **Full-lifecycle enterprise RPO** (500+ hires/year, ATS integration, employer-brand campaign, sourcing team). HQ Recruit + Recruit365 is not an enterprise RPO alternative and should not be positioned as one. [HIGH]

**Strategic recommendation per band**

| Band | Compete / Complement / Substitute / Ignore |
|---|---|
| Micro 0-4 | Ignore MPHRO/RPO entirely - the buyer never buys these. |
| Small 5-19 | Substitute for casual/de-facto HR-advisor arrangements; complement for agency-hire (HQ Recruit handles self-serve roles, agency handles the hard ones). |
| Medium 20-199 | Substitute for boutique HR/ER outsourcers and for retainer HR-advisor via HR365. Complement for RPO on burst hiring via Recruit365. |
| Large 200+ | Feed. HQ.ai should refer these buyers to enterprise providers and, in due course, negotiate referral fees. Do not attempt to compete. |

**What MPHRO/RPO market data tells us about willingness to pay for outsourced HR/recruitment**
- Enterprise MPHRO PEPM benchmarks (US-anchored): US$50-$300/employee/month depending on scope. Even at the low end, a 50-employee AU business paying $2.5k/mo for outsourced HR is a real market.
- RPO fees (ratio-of-agency-fee benchmarks): typically 8-15% of salary on placement, or fixed monthly retainer.
- HQ.ai's HR365 at $799/mo for 40-150 headcount = A$5-A$20 PEPM, an order of magnitude below MPHRO PEPM benchmarks. This is priced as a "lightweight advisor" not a "managed service", which is correct. But it means HQ.ai should not sell this to buyers evaluating full MPHRO - HQ.ai will look under-scoped rather than better-value.

### D.3 Head-to-head positioning matrix

| Competitor | Best against | HQ.ai edge | HQ.ai gap | Verdict |
|---|---|---|---|---|
| Employsure | Micro to medium retainer buyers | AU brand, price, ACCC record, no contract lock-in | No sales team, no name recognition | Wins on brand & price, loses on distribution |
| Employment Hero | Small to medium payroll+HR buyers | Unbundled price, AU-law citation discipline | No payroll, no integrated HRIS, no accountant channel | Structurally exposed; must ship partner channel |
| MyHR | Small to medium software+advisor buyers | AI-first advisor, cheaper | Brand, human-advisor scale | Winnable within 12 months |
| Workforce Guardian / HR Central | Small ER/compliance buyers | AI, product depth | Brand recognition | Winnable |
| Dayforce / ADP / Rippling | Medium to large HRIS buyers | Price for small band only | No parity of features at 200+ | Not competitive - ignore |
| Lawpath | Micro DIY-legal buyers | HR specificity, AI cited advice | Legal breadth | Marketplace wins on price |
| SEEK / Indeed | Any hiring buyer | AI CV score + prescreen | Not a job board | Complement, not substitute |
| LinkedIn Recruiter | Medium to enterprise | Price | Talent-graph depth | Not competitive |
| Recruitment agencies | Any hiring buyer | Self-serve unit economics | No senior sourcing | Complement |
| PeopleScout / Hudson RPO / Korn Ferry RPO | Enterprise volume | n/a | n/a at this scale | Refer |
| ADP / Dayforce MPHRO | Enterprise HR outsourcing | n/a | n/a at this scale | Refer |
| ChatGPT / Copilot | DIY buyers | AU-cited answers, deny-list, doc gen | Free | Wins on quality; loses on price for the truly-DIY |

---

## E. Doubt register - what most threatens the mission, ranked

Threat severity: 1 (mission-terminal) to 5 (nice-to-have). Confidence in the threat: [HIGH/MED/LOW]. Every entry names the evidence and the resolver.

### E.1 [Severity 1, HIGH] - The "no matter the size" clause is not defensible

**Evidence**: HQ.ai has no large-enterprise product, no SSO, no HRIS integrations, no multi-entity billing in production, no SOC2, no SLA-backed advisory coverage above the Foundation cohort. Year-1 enterprise cap of 10 (per config). ABS: 4,062 businesses employ 200+ and they collectively employ ~4M workers (~30% of AU workforce) - this is not a rounding error.
**What would resolve**: (a) amend the mission to "for Australian small and medium businesses (up to 200 staff)" - the honest fix; (b) OR build the enterprise stack, which is a 12-18-month project and off-strategy per the retention brief.
**Recommendation**: Fix the mission. This is the load-bearing change.

### E.2 [Severity 1, MED-HIGH] - AI accuracy risk on Australian employment law is under-audited

**Evidence**: `tests/eval/run-eval.ts` exists; results are not published. No externally-visible accuracy audit against a ground-truth Fair Work corpus. The prompt architecture is disciplined but not verified. A single high-visibility incorrect AU-law answer that harms a candidate or employee is brand-terminal for a product whose entire value proposition is "cited answers you can trust". The Feb 2025 House Committee AI-in-recruitment recommendation signals within-18-month regulation of AI decisioning.
**What would resolve**: (a) publish a monthly accuracy report against a public benchmark of 100 curated Fair Work questions with expert-graded answers; (b) name the retrieval corpus versions publicly and pin them; (c) publish an AI-decision-provenance log per user; (d) documented human-in-the-loop enforcement for all CV-scoring adverse actions; (e) an Australian Privacy Impact Assessment for the candidate-video flow.
**Recommendation**: This is 4-6 weeks of work and is required before scale. Consider it non-negotiable.

### E.3 [Severity 1, HIGH] - Pricing coherence

**Evidence**: Four pricing narratives live simultaneously (Solo/Business v2; C10 unbundled People $59/$179 + Recruit $40/$120 + Bundle $89/$269; Foundation 100 at $189 or $179 depending on which file you read; Enterprise HR365/Recruit365 stack with multiplier schedule). `hqai/CLAUDE.md` and `lib/pricing-config.ts` show Business at $249 and $269 respectively. Foundation locked-monthly at $179 (CLAUDE.md) vs $189 (pricing-config.ts). A buyer landing on the pricing page today cannot tell what the offer is.
**What would resolve**: Pick one canonical pricing story. Publish it once. Retire the alternates in code. The C10 model has the clearest wedge for Solo/Micro buyers ("HR help + optional hiring add-on"); the Solo/Business two-tier is the current wired Stripe path. These need to be reconciled in a single decision.
**Recommendation**: One founder-day. Do this week.

### E.4 [Severity 2, HIGH] - Build gaps that block trust for the pilot

**Evidence** (per `CLAUDE.md`): RLS disabled, TypeScript errors suppressed, Stripe subscription checkout incomplete, awards interpreter placeholder, compliance assessment placeholder, campaign coach placeholder, team seats not built.
**What would resolve**: Ship the "Next build priorities" list in CLAUDE.md in the order stated - RLS first, redirect fix, Stripe checkout, then module completions. The specific missing features (Right to Disconnect templates, Employee Choice Pathway walk-through, psychosocial safety WHS, same-job-same-pay for labour-hire) should be added to the template library and the prompt logic - this is a 1-2 week content update.
**Recommendation**: 4-6 weeks of engineering. Sequence per CLAUDE.md; block launch on RLS+Stripe.

### E.5 [Severity 2, HIGH] - Employment Hero HeroForce is running down the same runway with 10-100x resources

**Evidence**: Employment Hero Series F 2023 at ~A$2B valuation; 300k+ businesses; HeroForce launched with three AI agents targeting the exact category HQ.ai targets; accountant partner channel ~30% of gross adds. Their public compliance-cost narrative (A$40k-$80k SME) is being repeated in HQ.ai's marketing collateral because Employment Hero seeded it.
**What would resolve**: (a) Ship the accountant/bookkeeper partner program (retention brief Q1 2027) inside 6 months, not 12; (b) pick a specific vertical HQ.ai will win definitively (Hospitality Pack, Trades Pack per retention brief) inside 9 months and dominate its niche; (c) publish the Fair Work citation quality difference in a way a buyer can verify without a demo (the CitationChip UX in the landing brief is the right idea and should be shipped as the hero interaction).
**Recommendation**: This is the competitive-strategy fight. Multi-quarter.

### E.6 [Severity 2, MED] - The mission's "any size" implies "any industry" and the templates are not industry-tuned

**Evidence**: 33 templates are horizontal (Employment Contract, Warning Letter, PIP, Job Ad). None is industry-specific. Modern Awards vary materially by industry (Hospitality Industry (General) Award, Building & Construction General On-Site Award, General Retail Industry Award, Aged Care Award, etc). The hospitality bartender-refusing-a-Saturday-shift question in the landing brief is a Hospitality Award question, not a Fair Work Act question, and the current architecture retrieves generic passages.
**What would resolve**: Ship the Hospitality Pack, Trades Pack, Allied Health Pack per the retention brief. Each Pack is roughly 4-6 founder-weeks of curated templates + award-specific prompt logic + industry-specific playbooks.
**Recommendation**: One Pack per quarter starting Q3 2026.

### E.7 [Severity 2, MED] - Buyer-trust proof is thin

**Evidence**: No published case studies. No named-customer testimonials in the codebase or docs. No independent security/accuracy attestation. Founder bio present per landing brief but not yet loaded into the site.
**What would resolve**: Foundation 100 cohort must produce, on entry, one named case study per quarter, one accuracy anecdote per quarter, one referral, at the price the Foundation offer sets. This is a small operational discipline.
**Recommendation**: One founder-day per quarter to run the case-study interviews.

### E.8 [Severity 3, MED] - Currency debt on 2024-26 legal changes

**Evidence**: Right to Disconnect, psychosocial safety WHS duties, same-job-same-pay for labour-hire, payday super, and Employee Choice Pathway 21-day mechanics are either absent or under-surfaced in the template library and the prompt logic.
**What would resolve**: A "Compliance Calendar" audit run every quarter that adds any new Fair Work/state-based change to the template library and the prompt. This is exactly what a $799/mo advisor should be doing anyway.
**Recommendation**: One founder-half-day per quarter.

### E.9 [Severity 3, MED-LOW] - The marketplace is a wedge that has not shipped

**Evidence**: Per CLAUDE.md, one-off SKUs are defined in env-vars; the marketplace surface with no-signup checkout is not confirmed live. Landing brief Section 5 requires this to ship for the pre-register mechanic to work.
**What would resolve**: Ship `/pricing/letter-of-offer` as a Stripe-one-off, no-signup checkout landing page. This is the first stream in the retention brief's Q3 2026 sequence and is one founder-week.
**Recommendation**: Ship this before any large paid-search or content campaign.

### E.10 [Severity 3, LOW] - Willingness to pay evidence is thin outside pilot cohort

**Evidence**: The pilot cohort (5-10 users) is not yet transitioned to paid at Foundation-100 rates; no public retention data; no cohort curve.
**What would resolve**: The Foundation-100 cohort itself, at 12-month annual commit, is the willingness-to-pay proof.
**Recommendation**: Ship it, measure it, publish the first-cohort NRR after 6 months.

### E.11 [Severity 4, LOW] - Data residency claim

**Evidence**: Landing brief and CLAUDE.md imply Australian data residency ("Hosted in Sydney"). Supabase project is presumably ap-southeast-2 (verify). Cloudflare Stream data-residency is contract-dependent - verify.
**What would resolve**: Publish the data-residency stack on a `/security` page.
**Recommendation**: 1 day of documentation.

---

## F. Validation plan - what to gather so top doubts move from Med-Low to almost-zero

Concrete, prioritised, evidence-first. Each item names what to build, what evidence it produces, what confidence level it moves.

### F.1 [Priority 1 - do first, ships in one week]

- **Reconcile the pricing story**. Pick canonical: (a) Solo $89 / Business $269 with Foundation locked $189 as the wired path AND (b) surface C10 unbundled People $59/$179 as the "Just HR" entry gate that upgrades into the bundle. Retire the third alternate. Move to E.3 resolved. Evidence: single pricing page, single Stripe price catalogue reconciled.
- **Publish the mission-scope amendment**. "HQ.ai solves legitimate and current real-world problems for Australian small and medium businesses (up to 200 employees)" - honest fix to E.1. Every marketing page and prompt to reflect. Evidence: revised copy in `app/(marketing)/**` and CLAUDE.md.
- **Ship RLS**. Non-negotiable pre-launch. Move E.4 partially.

### F.2 [Priority 2 - two-week window]

- **Ship an AI accuracy audit** [E.2]. Curate 100 Fair Work / NES / Modern Award questions with expert-graded answers. Run monthly. Publish. Evidence: `docs/audit/accuracy-YYYY-MM.md` and a public accuracy page. Confidence-move: LOW -> MED, in one cycle.
- **Ship the marketplace** [E.9]. `/pricing/letter-of-offer` as a Stripe-one-off, no signup, DOCX download.
- **Add the 4 currency-debt templates and prompt logic** [E.8]: Right to Disconnect Policy, Employee Choice Pathway response letter, Psychosocial Safety Assessment, Labour Hire Same-Job-Same-Pay checklist.

### F.3 [Priority 3 - 30-day window]

- **Ship the Stripe subscription checkout end-to-end** and end the "checkout incomplete" state [E.4].
- **Ship the Hospitality Pack scaffold** [E.6] - even a v0.1 that adds 5 hospitality-specific templates and a "your award is the Hospitality Award" prompt path.
- **Publish the founder credibility block** on the marketing site [E.7].
- **Draft and publish a `/security` page** covering RLS, data residency, retention, and access controls [E.11].

### F.4 [Priority 4 - 90-day window]

- **Recruit 3-5 accountant/bookkeeper partners** as the seed of the E.5 channel counter. Pattern per Employment Hero's own accountant channel (20% rev share, badging, co-branded onboarding). Ship a `Partner with HQ.ai` page.
- **Foundation-100 cohort case studies**: two named case studies, one accuracy anecdote, one named referral. Evidence: `/customers` page with three real stories.
- **Move HR365 to shipped-and-verifiable** [B, Band 3]: ship the same-human advisor rota, ship the Same-business-day SLA on Slack/email measurement, ship the quarterly Compliance Health Check deliverable template. Evidence: pilot Enterprise cohort NPS + advisor-response-time telemetry.

### F.5 [Priority 5 - 180-day window]

- **Independent legal review** of the AI's output on 25 randomly-sampled real user sessions by an external AU employment lawyer. Publish the redacted verdict.
- **APP Privacy Impact Assessment** on the candidate-video flow.
- **First Cohort NRR publication** at month 6 of the Foundation cohort.

### F.6 What "almost zero doubt" looks like when the plan is executed

At end of the 180-day window, HQ.ai should be able to point to: (a) an amended mission statement scoped to SMEs to 200 staff [E.1 resolved]; (b) six months of monthly accuracy audits with a published pass rate [E.2 resolved to HIGH]; (c) a single, reconciled pricing page with Stripe catalogue matching [E.3 resolved]; (d) RLS enabled, Stripe checkout live, all listed placeholder pages either shipped or removed from nav [E.4 resolved]; (e) a shipped accountant partner program with 10+ active partners [E.5 partially]; (f) a Hospitality Pack shipped with vertical-specific templates [E.6 partially]; (g) three named case studies with dollar-value outcomes [E.7 resolved]; (h) full currency to 2026 legal changes with a monthly-updated compliance-calendar prompt [E.8 resolved]; (i) shipped marketplace with 10 one-off SKUs [E.9 resolved]; (j) 6-month cohort NRR ≥110% [E.10 resolved]; (k) published security/data-residency page [E.11 resolved].

At that point overall confidence in the (amended) mission moves from ~35% to ~75-80%. "Almost zero doubt" is 90%+; that requires an additional 12-18 months of shipped scale, independent legal review, and paid-customer growth beyond 500 to prove the wedge economics. It is achievable.

---

## G. Sources

Primary Australian government / regulator sources:

- Fair Work Ombudsman Annual Report 2024-25 (Oct 2025): [Media Release](https://www.fairwork.gov.au/newsroom/media-releases/2025-media-releases/october-2025/20251029-annual-report-2024-25-media-release) - $358M recovered, 249k workers, 60% from large corporates, 73 litigations, $23.7M court penalties, 8 EUs, 1,220 Compliance Notices. [HIGH]
- Fair Work Ombudsman Annual Report 2023-24 (Oct 2024): [Media Release](https://www.fairwork.gov.au/newsroom/media-releases/2024-media-releases/october-2024/20241023-annual-report-2023-24-media-release) - $473M recovered. [HIGH]
- Fair Work Commission Annual Report 2024-25: [About the Commission](https://www.transparency.gov.au/publications/employment-and-workplace-relations/fair-work-commission/fair-work-commission-annual-report-2024-25/overview/about-the-commission) - 44,075 lodgments, 16,500 unfair dismissals. [HIGH]
- Australian Bureau of Statistics, Counts of Australian Businesses, Jul 2021 - Jun 2025: [ABS Latest Release](https://www.abs.gov.au/statistics/economy/business-indicators/counts-australian-businesses-including-entries-and-exits/latest-release) - 2.73M actively trading, 994k employing, 4,062 large. [HIGH]
- Department of Employment and Workplace Relations, wage-theft criminal offence commencement 1 Jan 2025: [DEWR announcement](https://www.dewr.gov.au/closing-loopholes/announcements/new-wage-theft-criminal-offence-will-commence-1-january-2025) and [Compliance and enforcement PDF](https://www.dewr.gov.au/download/15937/compliance-and-enforcement-criminalising-wage-theft/35722/compliance-and-enforcement-criminalising-wage-theft/pdf). [HIGH]
- Fair Work Ombudsman, Right to Disconnect small business (26 Aug 2025): [Media Release](https://www.fairwork.gov.au/newsroom/media-releases/2025-media-releases/august-2025/20250826-right-to-disconnect-starts-for-small-business-employees-media-release) and [Guidance](https://www.fairwork.gov.au/newsroom/news/right-to-disconnect-for-small-business-employees-starts-26-august). [HIGH]
- Fair Work Ombudsman, casual employment changes 26 Aug 2024: [Casual employment changes](https://www.fairwork.gov.au/about-us/workplace-laws/legislation-changes/closing-loopholes/casual-employment-changes). [HIGH]
- ANAO Auditor-General Report 2024-25 (Effectiveness of the Fair Work Ombudsman): [ANAO Report PDF](https://www.anao.gov.au/sites/default/files/2025-04/Auditor-General_Report_2024-25_30.pdf). [HIGH]
- ASBFEO Small Business Data Portal: [Number of small businesses in Australia](https://www.asbfeo.gov.au/small-business-data-portal/number-small-businesses-australia). [HIGH]

Secondary / industry-legal sources (referenced for currency, dated):

- Gadens on "unsustainable" FWC growth (Nov 2025): [Gadens](https://www.gadens.com/legal-insights/a-system-under-strain-the-unsustainable-rise-in-fair-work-commission-applications/). [HIGH]
- QLS Proctor on FWC reform (Nov 2025): [Proctor](https://www.qlsproctor.com.au/2025/11/unsustainable-increase-prompts-fwc-reform/). [HIGH]
- HRD Australia on FWC surge (2025): [HCAMag](https://www.hcamag.com/au/specialisation/employment-law/fair-work-commission-unveils-reforms-as-applications-surge/556415). [HIGH]
- Keypoint Law on 1 Jan 2025 workplace-law changes: [Keypoint](https://www.keypointlaw.com.au/keynotes/significant-changes-to-workplace-laws-from-1-january-2025/). [HIGH]
- Jake McKinley on wage-theft criminalisation: [Jake Law](https://jakelaw.com.au/criminalisation-of-wage-theft-australia/). [HIGH]
- HFW on wage theft criminal offence: [HFW PDF](https://www.hfw.com/app/uploads/2024/05/005936-HFW-Australia-Employment-Closing-Loopholes-Wage-Theft-A-New-Criminal-Offence.pdf). [HIGH]
- LegalVision on wage-theft penalties: [LegalVision](https://legalvision.com.au/penalties-for-wage-theft-australia/). [HIGH]
- Cowell Clarke on FWO 2024-25 activity: [Cowell Clarke](https://cowellclarke.com.au/insights/fwo-activity-in-fy2024-25-employment-regulator-releases-its-latest-annual-report). [HIGH]
- MinterEllison on Closing Loopholes No.2: [MinterEllison](https://www.minterellison.com/articles/closing-loopholes-no-2-bill-passes-both-houses). [HIGH]
- Lavan on 1 Jan 2025 wage theft and Closing Loopholes: [Lavan](https://www.lavan.com.au/advice/employment_safety/closing_loopholes_crack_down_on_underpayments_and_wage_theft_1_january_2025_and_key_employment_updates_for_the_new_financial_year). [HIGH]
- Small Business Development Corporation WA on Right to Disconnect impact: [SBDC Blog](https://www.smallbusiness.wa.gov.au/blog/how-will-right-disconnect-laws-affect-small-businesses). [HIGH]
- Master Builders ACT on Right to Disconnect 26 Aug 2025: [MBA ACT](https://mba.org.au/right-to-disconnect-applies-to-small-businesses-from-26-august-2025/). [HIGH]
- PwC on Closing Loopholes casual/contractor/RtD: [PwC AU](https://www.pwc.com.au/workforce/diversity-and-inclusion/closing-loopholes-workplace-law-reforms-redefine-castual-employment-contractor-status-and-introduce-right-to-disconnect-laws.html). [HIGH]
- IRIQ Law on Employee Choice Pathway: [IRIQ](https://www.iriq.com.au/the-closing-loopholes-legislation-employee-choice-pathway-for-casuals/). [HIGH]

AI / algorithmic-discrimination / privacy sources:

- AKS Law on AI in recruitment (Mar 2025): [AKS Law](https://akslaw.com.au/2025/03/21/ai-in-recruitment/). [HIGH]
- Australian Business Lawyers & Advisors, "Bias by algorithm": [ABL](https://ablawyers.com.au/resources/articles-downloads/bias-by-algorithm-can-ai-make-you-liable-for-discrimination). [HIGH]
- Ius Laboris on AI regulation in AU workplaces: [Ius Laboris](https://iuslaboris.com/insights/ai-regulation-in-australian-workplaces-what-employers-need-to-know/). [HIGH]
- Lexology, evolving AI regulation for AU employers: [Lexology](https://www.lexology.com/library/detail.aspx?g=310a4007-cdbe-424e-b3e9-077b93f7362a). [HIGH]
- Landers on AI recruitment tools and discrimination risk: [Landers](https://www.landers.com.au/legal-insights-news/ai-recruitment-tools-when-efficiency-meets-discrimination-risk). [HIGH]
- JobWatch, AI in Hiring rights: [JobWatch](https://jobwatch.org.au/ai-in-hiring-what-rights-do-job-seekers-have/). [HIGH]

Competitor / market sources:

- SmartCompany on Employment Hero HeroForce and A$40-80k SME compliance cost: [SmartCompany](https://www.smartcompany.com.au/startupsmart/employment-hero-business-legal-employer-new-ai-system/). [HIGH]
- Employment Hero press on HeroForce and $12.6B "complexity tax": [Employment Hero](https://employmenthero.com/news/heroforce-ai-fixing-australian-employment-complexity-tax/). [HIGH for statement, LOW for figure]
- Startup Daily on Employment Hero AI/compliance product: [Startup Daily](https://www.startupdaily.net/advice/workplace/employment-hero-offers-to-take-over-your-employee-management-using-ai-for-compliance/). [HIGH]
- Employment Hero Series F blog (Oct 2023, A$263M): [Employment Hero Blog](https://employmenthero.com/blog/series-f-raises-263-million/). [HIGH]
- CB Insights Employment Hero profile: [CB Insights](https://www.cbinsights.com/company/employment-hero/financials). [MED]
- Employsure About/Pricing/FAQ: [About](https://employsure.com.au/about-employsure), [Pricing](https://employsure.com.au/pricing), [FAQs](https://employsure.com.au/faq). [HIGH]
- Peninsula AU Trustpilot: [Trustpilot](https://au.trustpilot.com/review/peninsulagrouplimited.com.au). [MED]
- MyHR AU: [Platform](https://www.myhr.works/au), [Pricing](https://www.myhr.works/au/pricing). [HIGH]
- Workforce Guardian: [HR Systems](https://www.workforceguardian.com.au/hr-systems/); [Better HR](https://www.workforceguardian.com.au/better-hr). [MED]
- Lawpath Pricing and AI: [Pricing](https://lawpath.com.au/pricing); [AI Assistant](https://lawpath.com.au/features/lawpath-ai); [Employment & HR documents](https://lawpath.com.au/legal-documents/employment-hr). [HIGH]

MPHRO / RPO sources:

- Zalaris on MPHRO: [Zalaris](https://zalaris.com/managed-services/resources/blog/multi-process-hr-outsourcing-transform-processes-and-drive-organisational-efficiency). [HIGH]
- Harrison McMillan on RPO 2025 and micro-RPO: [Harrison McMillan](https://www.harrisonmcmillan.com.au/rpo-in-2025-is-modern-recruitment-process-outsourcing-or-micro-rpo-right-for-your-business). [HIGH]
- PeopleScout APAC: [PeopleScout APAC](https://www.peoplescout.com/locations/apac/). [HIGH]
- Korn Ferry RPO AU: [Korn Ferry](https://www.kornferry.com/au/capabilities/talent-acquisition/recruitment-process-outsourcing-rpo). [HIGH]
- Hays RPO AU: [Hays](https://www.hays.com.au/employers/recruitment-services/recruitment-process-outsourcing). [HIGH]
- Robert Walters Outsourcing: [Robert Walters](https://www.robertwalters.com.au/our-services/outsourcing/recruitment-process-outsourcing.html). [HIGH]
- Chandler Macleod RPO: [Chandler Macleod](https://www.chandlermacleod.com/employers/solutions/recruitment-process-outsourcing-rpo). [HIGH]
- HOBAN Recruitment on RPO: [HOBAN](https://hoban.com.au/2025/03/11/what-is-recruitment-process-outsourcing-rpo/). [HIGH]
- ResearchAndMarkets on global RPO 2025-2030: [BusinessWire](https://www.businesswire.com/news/home/20260128714561/en/Recruitment-Process-Outsourcing-RPO-Strategic-Business-Report-2025-2030-Continued-Recovery-in-Labour-Markets-Although-Slow-Ridden-With-Challenges-is-a-Positive-Sign-for-Market-Growth---ResearchAndMarkets.com). [MED]
- SNS Insider on global RPO trajectory to 2030: [SNS Insider](https://www.globenewswire.com/en/news-release/2023/11/29/2787852/0/en/Recruitment-Process-Outsourcing-RPO-Market-to-Hit-USD-24-42-Billion-by-2030-Driven-by-Global-Talent-Crunch-and-Globalization-of-Businesses-Research-by-SNS-Insider.html). [MED]
- Vanator Top RPO in Australia: [Vanator](https://govanator.com/top-rpo-companies-in-australia/). [MED]
- ADP: [ADP AU large business](https://au.adp.com/who-we-serve/by-business-size/1000-employees.aspx); [ADP vs Dayforce](https://www.adp.com/compare/adp-vs-dayforce.aspx). [HIGH]
- Dayforce integrated HCM services AU: [Dayforce](https://www.dayforce.com/au/how-we-help/services-and-support/integrated-hcm-services). [HIGH]

Recruitment cost / hiring market sources:

- Scale Suite recruitment fees calculator (2026): [Scale Suite](https://www.scalesuite.com.au/tools/recruitment-fees-calculator); recruitment agency costs guide: [Scale Suite Article](https://www.scalesuite.com.au/resources/hiring-cost-recruiter-australia-smes). [MED]
- Harrison McMillan on cost per hire: [Harrison McMillan](https://www.harrisonmcmillan.com.au/do-you-actually-know-your-cost-per-hire-its-likely-higher-than-you-think). [MED]

Sentinel / compliance-currency sources:

- Sentrient HR compliance areas 2026: [Sentrient](https://www.sentrient.com.au/blog/hr-compliance-areas-costing-australian-businesses). [MED]
- Money.com.au Australian Business Statistics 2026: [Money.com.au](https://www.money.com.au/business-loans/australian-business-statistics). [MED]

Prior internal research citations (already covered in the pre-flight, cited but not re-researched):
- `hqai/docs/research/retention-and-monetisation-brief.md` (2026-05-21) - pricing architecture, retention mechanics, unit economics.
- `hqai/docs/research/2026-05-16_ai-doc-creation-teardown.md` (2026-05-16) - competitor deep-dives on Employment Hero, Employsure, MyHR, Gamma, Tome; codebase baseline.
- `hqai/docs/research/landing-page-research-brief.md` (2026-05-20) - hero copy, trust signals, objection map, marketplace positioning.
- `hqai/docs/research/recruitment-research/research-report.md` - AU 2025 recruitment market, application volumes, quality-of-hire benchmarks.
- `hqai/docs/research/2026-05-16_brand-kit-benchmark.md` - brand positioning (referenced, not re-analysed).
- `hqai/docs/research/2026-06-23_pricing-deep-analysis.md` - C10 self-serve model rationale.
- `hqai/docs/research/enterprise-tier-strategy.md`, `enterprise-tier-director-summary.md`, `enterprise-sliding-scale-analysis.md` - HR365/Recruit365 pricing and multipliers.

**Age flag**: all live-legal sources are 2024-2026. Global RPO market-size forecasts (SNS Insider, ResearchAndMarkets) are 2023-forward projections and should be treated as directional not evidentiary. All pricing quoted for competitors was retrieved during this session; competitor pricing changes frequently and should be re-verified quarterly.

---

## H. What I didn't do and why

For discipline. Every research report has these; naming them prevents the founder from over-weighting the analysis.

- **I did not run new pricing conjoint or willingness-to-pay tests.** The prior retention brief covered this and my role is validation, not repricing.
- **I did not audit the AI's actual output against a ground-truth corpus.** That is the exact experiment recommended in F.2 and should be run by the team.
- **I did not verify Supabase or Cloudflare Stream data-residency in the running application.** That is a founder-check, not a research question.
- **I did not read every prior research file in full.** I read the 4 highest-priority (retention brief, competitor teardown, landing brief, recruitment research) and cited the rest by name for the founder to consult where useful.
- **I have not spoken to the pilot cohort.** Every claim about willingness to pay above is inferred from market benchmarks and analyst reports, not from HQ.ai users. If the pilot cohort's actual behaviour differs from these benchmarks, the pilot cohort wins the argument.

---

*End of report.*
