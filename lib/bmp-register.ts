// GENERATED from docs/research/au-hr-recruitment-2026/bare-minimum-processes/bare_minimum_processes.csv by scripts/build-bmp-register.mjs - do not hand-edit.
// Edit the CSV, then run: node scripts/build-bmp-register.mjs
//
// Bare Minimum HR Processes register. triggerType is the primary navigation
// axis, riskTier the sort order and badge, surface the UI treatment - see
// CATEGORISATION-ANALYSIS.md beside the CSV. These are operational reminders
// for the clock, not employment-law advice.

export const BMP_TRIGGER_TYPES = ["per_hire", "tenure_countdown", "payroll_cycle", "calendar", "event", "standing"] as const
export const BMP_RISK_TIERS = ["critical", "high", "moderate"] as const
export const BMP_SURFACES = ["checklist", "countdown", "recurring", "calendar", "playbook", "status"] as const

export type BmpTriggerType = (typeof BMP_TRIGGER_TYPES)[number]
export type BmpRiskTier = (typeof BMP_RISK_TIERS)[number]
export type BmpSurface = (typeof BMP_SURFACES)[number]

export type BmpLifecycleStage =
  | "Day 1"
  | "Day 1 / every pay"
  | "Day 1 / onboarding"
  | "Early tenure / ongoing"
  | "Every payday"
  | "Exit"
  | "Onboarding & early tenure"
  | "Ongoing"
  | "Ongoing / compliance"
  | "Ongoing / compliance (forward)"
  | "Ongoing / compliance maintenance"
  | "Ongoing / proactive"
  | "Pre-hire"
  | "Pre-hire / ongoing"
  | "Pre-hire / renewal"

export type BmpSourceTier =
  | "T1"
  | "T2"

export type BmpId =
  | "BMP-001"
  | "BMP-002"
  | "BMP-003"
  | "BMP-004"
  | "BMP-005"
  | "BMP-006"
  | "BMP-007"
  | "BMP-008"
  | "BMP-009"
  | "BMP-010"
  | "BMP-011"
  | "BMP-012"
  | "BMP-013"
  | "BMP-014"
  | "BMP-015"
  | "BMP-016"
  | "BMP-017"
  | "BMP-018"
  | "BMP-019"
  | "BMP-020"
  | "BMP-021"

export interface BmpProcess {
  readonly id: BmpId
  readonly process: string
  readonly lifecycleStage: BmpLifecycleStage
  readonly bareMinimumAction: string
  readonly clockTrigger: string
  readonly cadence: string
  readonly commonMistake: string
  readonly hotWaterLater: string
  readonly fairWorkExposure: string
  readonly linkedChallengeCodes: string
  readonly linkedTemplateIds: string
  readonly prevalence: string
  readonly assistantHook: string
  readonly sourceTier: BmpSourceTier
  readonly triggerType: BmpTriggerType
  readonly riskTier: BmpRiskTier
  readonly surface: BmpSurface
}

export const BMP_REGISTER: readonly BmpProcess[] = [
  {
    id: "BMP-001",
    process: "Probation review cadence / minimum-employment-period decision",
    lifecycleStage: "Onboarding & early tenure",
    bareMinimumAction: "Diarise and run short, documented review meetings with written feedback at set points, and make the keep/exit call before the minimum employment period ends",
    clockTrigger: "Starts on start date; hard deadline = minimum employment period expiry (6 months, or 12 months for small business <15 employees)",
    cadence: "At 1/3/5 months within the first 6/12 months",
    commonMistake: "No cadence, no documentation, lose track of the date, \"they seemed fine\"",
    hotWaterLater: "Miss the window and the employee gains unfair-dismissal access: termination now needs a valid reason + procedural fairness + likely a PIP; notice can be up to 4-5 weeks vs 1; a quick month-5 decision becomes a months-long high-risk process; UD compensation cap up to $95,050 (FY2026-27)",
    fairWorkExposure: "Unfair dismissal (FW Act Part 3-2); Small Business Fair Dismissal Code; NES notice s117",
    linkedChallengeCodes: "PM1|PM8",
    linkedTemplateIds: "HR-065|HR-064|HR-081",
    prevalence: "Very high",
    assistantHook: "Auto-reminders at 1/3/5 months + \"minimum period ends in 30 days - decide now\" alert; supply review + feedback template",
    sourceTier: "T1",
    triggerType: "tenure_countdown",
    riskTier: "critical",
    surface: "countdown",
  },
  {
    id: "BMP-002",
    process: "Day-1 record-keeping + compliant itemised payslips",
    lifecycleStage: "Day 1 / every pay",
    bareMinimumAction: "Set up 7-year employee records from day 1; issue a compliant, itemised payslip within 1 working day of each pay",
    clockTrigger: "From day 1; each pay run (payslip within 1 working day)",
    cadence: "Every pay cycle",
    commonMistake: "Manual/informal records; bundling pay into one \"gross\" figure; missing allowance/penalty line items; gaps in leave/super/classification history",
    hotWaterLater: "In any underpayment dispute the reverse onus of proof shifts to the employer if records are inadequate - you effectively lose; civil penalties per contravention accumulate per employee per pay period",
    fairWorkExposure: "FW Act s535-536 (records) & s536 (payslips); FW Regs 3.31-3.46; reverse onus in wage disputes",
    linkedChallengeCodes: "PF21|PF22|X2",
    linkedTemplateIds: "HR-055|HR-053|HR-054",
    prevalence: "High / near-universal",
    assistantHook: "Auto record-keeping checklist on hire; payslip required-field validator; 7-year retention timer",
    sourceTier: "T1",
    triggerType: "payroll_cycle",
    riskTier: "critical",
    surface: "recurring",
  },
  {
    id: "BMP-003",
    process: "Annual Wage Review 1 July rate + allowance update",
    lifecycleStage: "Ongoing / compliance maintenance",
    bareMinimumAction: "Update base rates and allowances to the new award rates from the first full pay period on/after 1 July",
    clockTrigger: "Each 1 July (annual)",
    cadence: "Annual",
    commonMistake: "Set-and-forget pay rates; missing the 1 July uplift; forgetting allowances also move",
    hotWaterLater: "Underpayment accrues from 1 July across the whole workforce; strict-liability back-pay + penalties; compounds silently until an audit or claim",
    fairWorkExposure: "Award minimum rates (s45 FW Act); Annual Wage Review",
    linkedChallengeCodes: "PF10",
    linkedTemplateIds: "HR-057",
    prevalence: "High",
    assistantHook: "Annual 1 July alert + new-rate diff per classification",
    sourceTier: "T1",
    triggerType: "calendar",
    riskTier: "critical",
    surface: "calendar",
  },
  {
    id: "BMP-004",
    process: "Superannuation on-time / Payday Super",
    lifecycleStage: "Every payday",
    bareMinimumAction: "Pay SG so it is RECEIVED by the employee's fund within 7 business days of each payday",
    clockTrigger: "Each payday (day 0); 7-business-day deadline (from 1 July 2026)",
    cadence: "Every pay cycle",
    commonMistake: "Still on the quarterly mindset; paying late; treating \"sent\" as \"received\"; missing the new-employee 20-day rule",
    hotWaterLater: "Super Guarantee Charge applies (non-deductible interest + admin fee) on late/short payments; faster-triggering exposure than the old quarterly system; loss of tax deductibility for late SG",
    fairWorkExposure: "SG law; Payday Super regime (Treasury Laws Amendment (Payday Superannuation) Act 2025; commenced 1 July 2026)",
    linkedChallengeCodes: "PF24|PF25",
    linkedTemplateIds: "HR-040|HR-061",
    prevalence: "High",
    assistantHook: "Payday-linked super timer; 7-business-day countdown per pay run; new-employee 20-day-rule flag",
    sourceTier: "T1",
    triggerType: "calendar",
    riskTier: "critical",
    surface: "calendar",
  },
  {
    id: "BMP-005",
    process: "Contemporaneous performance documentation + adverse-action timing",
    lifecycleStage: "Ongoing",
    bareMinimumAction: "File-note every performance/conduct conversation at the time; sequence any adverse action carefully relative to any workplace right the employee has exercised",
    clockTrigger: "At each incident/conversation; before any adverse action",
    cadence: "Continuous",
    commonMistake: "No feedback trail; \"they knew\"; reconstructing notes after the fact; acting right after a complaint or leave request",
    hotWaterLater: "No documentation means no defensible PIP or dismissal - drives avoidable unfair-dismissal losses; ill-timed action after a workplace right triggers general protections (reverse onus on the employer; no compensation cap; no minimum employment period)",
    fairWorkExposure: "Unfair dismissal (Part 3-2); general protections / adverse action (Part 3-1; s340-361 reverse onus)",
    linkedChallengeCodes: "PM4|PM9",
    linkedTemplateIds: "HR-069|HR-064|HR-062",
    prevalence: "High",
    assistantHook: "Prompt to log after 1:1s; file-note template; \"adverse-action risk-check before you act\" gate",
    sourceTier: "T1",
    triggerType: "event",
    riskTier: "critical",
    surface: "playbook",
  },
  {
    id: "BMP-006",
    process: "Casual conversion - Employee Choice notification",
    lifecycleStage: "Early tenure / ongoing",
    bareMinimumAction: "Track each casual's tenure; when a valid employee-choice notification arrives, respond in writing within 21 days (accept, or refuse on valid grounds)",
    clockTrigger: "Eligibility at 6 months (non-small) / 12 months (small business <15); 21-day response clock on any notification",
    cadence: "Per casual, at the 6/12-month mark",
    commonMistake: "Not tracking tenure; assuming a regular fixed shift pattern is still casual; ignoring/late/invalid refusal",
    hotWaterLater: "Misclassification exposes back-pay of leave and entitlements; Fair Work Commission dispute; civil penalties for a non-compliant refusal or failure to respond in time",
    fairWorkExposure: "s15A casual definition; Employee Choice Pathway; 21-day response obligation",
    linkedChallengeCodes: "PF6|PF7",
    linkedTemplateIds: "HR-003|HR-008",
    prevalence: "Med-High",
    assistantHook: "Tenure tracker with 6/12-month flag; 21-day response timer + valid-grounds refusal template",
    sourceTier: "T1",
    triggerType: "tenure_countdown",
    riskTier: "critical",
    surface: "countdown",
  },
  {
    id: "BMP-007",
    process: "Annualised salary annual reconciliation",
    lifecycleStage: "Ongoing / compliance",
    bareMinimumAction: "Record the components the salary covers + outer-limit hours; reconcile actual hours/penalties against the salary each pay period and annually, and top up any shortfall",
    clockTrigger: "Each pay period + an annual reconciliation",
    cadence: "Per pay period + annual",
    commonMistake: "Set-and-forget salary at hire; assuming a \"good salary\" covers everything; never re-checking against actual rostered hours",
    hotWaterLater: "Underpayment even on an above-market salary if actual hours/penalties in a period exceed the pro-rata salary; Woolworths-style remediation; back-pay + penalties; flagged FWO enforcement priority",
    fairWorkExposure: "Annualised wage award clauses (in force since 1 Mar 2020); s45 FW Act",
    linkedChallengeCodes: "PF12",
    linkedTemplateIds: "HR-056|HR-012",
    prevalence: "Med-High",
    assistantHook: "Per-pay-period reconciliation calculator + annual reconciliation reminder",
    sourceTier: "T1",
    triggerType: "payroll_cycle",
    riskTier: "critical",
    surface: "recurring",
  },
  {
    id: "BMP-008",
    process: "Redundancy consultation before acting",
    lifecycleStage: "Exit",
    bareMinimumAction: "Complete award/agreement consultation and genuinely consider redeployment BEFORE the decision is finalised or implemented",
    clockTrigger: "Before the decision is implemented; award consultation-clause trigger",
    cadence: "One-off per restructure",
    commonMistake: "Deciding first and \"consulting\" after; skipping consultation; using redundancy to remove an underperformer",
    hotWaterLater: "Even a genuine redundancy can be an unfair dismissal if consultation/redeployment was skipped; back-pay if award/contract redundancy pay was owed; a role reappearing shortly after is a red flag",
    fairWorkExposure: "NES redundancy (s119-121); modern-award consultation clause; genuine redundancy test (s389)",
    linkedChallengeCodes: "PM10",
    linkedTemplateIds: "HR-086|HR-087|HR-091|HR-089",
    prevalence: "Med-High",
    assistantHook: "\"Consult before you decide\" gate; consultation letter + timeline; redeployment checklist",
    sourceTier: "T1",
    triggerType: "event",
    riskTier: "critical",
    surface: "playbook",
  },
  {
    id: "BMP-009",
    process: "Right-to-work / VEVO check before start",
    lifecycleStage: "Pre-hire",
    bareMinimumAction: "Verify work rights via VEVO before commencement and keep a dated record",
    clockTrigger: "Before commencement (make offer conditional on it)",
    cadence: "Per hire (+ re-check before visa expiry)",
    commonMistake: "Skipped, assumed, or done after the person starts; no record kept",
    hotWaterLater: "Employer sanctions/penalties for employing an unlawful non-citizen; without a dated due-diligence record there is no defence",
    fairWorkExposure: "Migration Act employer sanctions; VEVO verification",
    linkedChallengeCodes: "RS14",
    linkedTemplateIds: "RC-031|RC-038",
    prevalence: "High",
    assistantHook: "Pre-start VEVO checklist; visa-expiry re-check timer for temporary-visa holders",
    sourceTier: "T1",
    triggerType: "per_hire",
    riskTier: "high",
    surface: "checklist",
  },
  {
    id: "BMP-010",
    process: "Written contract issued & signed before start",
    lifecycleStage: "Pre-hire",
    bareMinimumAction: "Issue a compliant written contract (award, classification, set-off, hours, employment type) for signature before day 1",
    clockTrigger: "Before commencement",
    cadence: "Per hire",
    commonMistake: "Verbal offers; contract issued after start or never; silent on hours/classification",
    hotWaterLater: "Sub-minimum terms are void (back-pay); no valid set-off to rely on; casual/fixed-term status disputes; later \"what did we actually agree\" disputes with no anchor",
    fairWorkExposure: "Contract cannot undercut NES/award (offending terms void); interplays with s15A (casual) and s333E (fixed-term)",
    linkedChallengeCodes: "PF1|RS16",
    linkedTemplateIds: "HR-001|HR-002|HR-003|HR-004",
    prevalence: "High",
    assistantHook: "Contract-before-start gate; template by employment type with set-off clause",
    sourceTier: "T1",
    triggerType: "per_hire",
    riskTier: "high",
    surface: "checklist",
  },
  {
    id: "BMP-011",
    process: "Fixed-term 2-year cap + one-renewal + FTCIS",
    lifecycleStage: "Pre-hire / renewal",
    bareMinimumAction: "Track fixed-term tenure and renewals; give the FTCIS at each new/renewed contract; stay within the 2-year / one-renewal limits",
    clockTrigger: "At each offer/renewal; 2-year cumulative cap (since 6 Dec 2023)",
    cadence: "Per fixed-term contract",
    commonMistake: "Rolling 12-month \"trial\" contracts; forgetting the FTCIS; not counting back-to-back contracts cumulatively",
    hotWaterLater: "The offending term is of no effect and the role can become permanent by operation of law; civil penalties for FTCIS non-provision and for deliberate avoidance structuring",
    fairWorkExposure: "FW Act s333E-333N; Fixed Term Contract Information Statement",
    linkedChallengeCodes: "PF2",
    linkedTemplateIds: "HR-004|HR-009",
    prevalence: "Med-High",
    assistantHook: "Fixed-term register with cumulative-tenure + renewal-count flag; FTCIS auto-attach on each contract",
    sourceTier: "T1",
    triggerType: "per_hire",
    riskTier: "moderate",
    surface: "checklist",
  },
  {
    id: "BMP-012",
    process: "Contractor-vs-employee classification at engagement & on change",
    lifecycleStage: "Pre-hire / ongoing",
    bareMinimumAction: "Assess the true nature (whole-of-relationship test) at engagement and re-check when the relationship changes; document the reasoning",
    clockTrigger: "At engagement; test is dynamic/ongoing",
    cadence: "On engagement + on any material change",
    commonMistake: "\"They invoice us, so they're a contractor\"; never re-checking as the relationship deepens",
    hotWaterLater: "Misclassification exposes unpaid NES, super guarantee charge (up to 200%), PAYG, and sham-contracting penalties (up to $19,800 individual / $99,000 small business / greater of $495,000 or 3x underpayment for larger)",
    fairWorkExposure: "s15AA whole-of-relationship test; s357 sham contracting; contractor high-income opt-out $190,100 (from 1 Jul 2026)",
    linkedChallengeCodes: "PF3|PF4|PF5",
    linkedTemplateIds: "HR-005",
    prevalence: "Med-High",
    assistantHook: "Classification questionnaire at engagement; re-assessment prompt on scope change; opt-out-notice flag above $190,100",
    sourceTier: "T1",
    triggerType: "per_hire",
    riskTier: "moderate",
    surface: "checklist",
  },
  {
    id: "BMP-013",
    process: "Fair Work + Casual Employment Information Statements on commencement",
    lifecycleStage: "Day 1",
    bareMinimumAction: "Give the Fair Work Information Statement to every new employee (and the Casual Employment Information Statement to casuals) on or before commencement",
    clockTrigger: "On commencement (s125); CEIS also at 6/12-month intervals",
    cadence: "Per hire (+ CEIS at intervals)",
    commonMistake: "Forgotten in onboarding; no record it was provided",
    hotWaterLater: "Civil penalty for non-provision; compounds evidentiary weakness in any later dispute",
    fairWorkExposure: "NES s125 (FWIS); Casual Employment Information Statement",
    linkedChallengeCodes: "PF13|PF6",
    linkedTemplateIds: "HR-007|HR-008",
    prevalence: "High",
    assistantHook: "Onboarding auto-attach both statements + logged acknowledgement; CEIS interval reminders",
    sourceTier: "T1",
    triggerType: "per_hire",
    riskTier: "high",
    surface: "checklist",
  },
  {
    id: "BMP-014",
    process: "Superannuation stapled-fund / choice at hire",
    lifecycleStage: "Day 1 / onboarding",
    bareMinimumAction: "Give the standard choice form; if no choice is made, request the stapled fund from the ATO before paying to a default fund",
    clockTrigger: "Within 28 days of start; before any default-fund payment",
    cadence: "Per hire",
    commonMistake: "Paying to a default fund without doing the stapled-fund check",
    hotWaterLater: "Choice-of-fund shortfall penalties; additional SGC exposure",
    fairWorkExposure: "Super choice-of-fund + stapled-fund rules (ATO)",
    linkedChallengeCodes: "PF24",
    linkedTemplateIds: "HR-040|HR-041",
    prevalence: "Med-High",
    assistantHook: "Stapled-fund check step in onboarding; 28-day timer",
    sourceTier: "T1",
    triggerType: "per_hire",
    riskTier: "moderate",
    surface: "checklist",
  },
  {
    id: "BMP-015",
    process: "Long service leave accrual tracking from start",
    lifecycleStage: "Ongoing",
    bareMinimumAction: "Record the continuous-service start date and accrue LSL per state/territory rules from day 1",
    clockTrigger: "From start date; state qualifying period + pro-rata triggers on termination",
    cadence: "Continuous",
    commonMistake: "No tracking; start date lost; ignoring pro-rata entitlement on early termination",
    hotWaterLater: "Back-pay of the LSL entitlement + state penalties; pro-rata payout owed on termination (e.g. NSW after 5 years) miscalculated or missed",
    fairWorkExposure: "State/territory LSL Acts (NSW LSL Act 1955; VIC LSL Act 2018; QLD IR Act 2016)",
    linkedChallengeCodes: "PF17",
    linkedTemplateIds: "HR-050",
    prevalence: "Med-High",
    assistantHook: "Service-date clock per employee; state-rule engine; pro-rata alert on exit",
    sourceTier: "T1",
    triggerType: "standing",
    riskTier: "moderate",
    surface: "status",
  },
  {
    id: "BMP-016",
    process: "Flexible-work request - written response within 21 days",
    lifecycleStage: "Ongoing",
    bareMinimumAction: "Discuss and genuinely try to agree, then respond in writing within 21 days; if refusing, document specific reasonable business grounds",
    clockTrigger: "21 days from the written request",
    cadence: "Per request",
    commonMistake: "Informal/verbal refusal; \"we're too small to accommodate that\"; no written response inside the window",
    hotWaterLater: "The Fair Work Commission can order the request granted or make a different determination if the process was not followed; the refusal is now arbitrable",
    fairWorkExposure: "FW Act s65-65A (flexible work requests; FWC arbitration powers)",
    linkedChallengeCodes: "PM12",
    linkedTemplateIds: "HR-092|HR-023",
    prevalence: "High",
    assistantHook: "21-day response timer on a logged request; reasonable-grounds template + alternatives-considered log",
    sourceTier: "T1",
    triggerType: "tenure_countdown",
    riskTier: "high",
    surface: "countdown",
  },
  {
    id: "BMP-017",
    process: "Positive duty (sexual harassment) prevention",
    lifecycleStage: "Ongoing / proactive",
    bareMinimumAction: "Maintain a policy + training + reporting pathway proactively (not just react to complaints) - the AHRC 7 Standards scaled to business size",
    clockTrigger: "Ongoing proactive duty (positive duty since Dec 2022; AHRC enforcement powers since 12 Dec 2023)",
    cadence: "Periodic policy + training refresh",
    commonMistake: "Reactive \"we'll deal with it if someone complains\"; no policy or training record",
    hotWaterLater: "AHRC inquiries, compliance notices, court-ordered compliance and enforceable undertakings; vicarious liability for harassment that occurs",
    fairWorkExposure: "Sex Discrimination Act positive duty (Respect@Work); AHRC enforcement",
    linkedChallengeCodes: "PM20",
    linkedTemplateIds: "HR-016|HR-094|HR-017",
    prevalence: "High",
    assistantHook: "Policy + training-refresh cadence reminders; 7-Standards self-check",
    sourceTier: "T1",
    triggerType: "standing",
    riskTier: "high",
    surface: "status",
  },
  {
    id: "BMP-018",
    process: "WHS psychosocial hazard risk-assessment cadence",
    lifecycleStage: "Ongoing / compliance",
    bareMinimumAction: "Identify-assess-control-review psychosocial hazards with a documented register; consult workers; review periodically and after incidents",
    clockTrigger: "Ongoing duty; review on change or incident",
    cadence: "Periodic review",
    commonMistake: "No documented process; treating it as an EAP/wellbeing nice-to-have; no worker consultation",
    hotWaterLater: "WHS penalties (severe; officer imprisonment for reckless conduct in most jurisdictions); improvement/prohibition notices; NO small-business size carve-out",
    fairWorkExposure: "WHS Act primary duty of care; Managing Psychosocial Hazards Codes of Practice",
    linkedChallengeCodes: "PM14|PM15",
    linkedTemplateIds: "HR-096|HR-015|HR-097",
    prevalence: "High",
    assistantHook: "Psychosocial hazard register template; periodic review reminder; incident-triggered reassessment",
    sourceTier: "T1",
    triggerType: "event",
    riskTier: "high",
    surface: "playbook",
  },
  {
    id: "BMP-019",
    process: "Termination notice + correct final pay",
    lifecycleStage: "Exit",
    bareMinimumAction: "Apply the correct NES (or award/contract) notice scale by tenure; pay all accrued entitlements; meet state final-pay timing",
    clockTrigger: "At termination",
    cadence: "Per exit",
    commonMistake: "Flat notice regardless of tenure; forgetting the extra week for over-45s with 2+ years' service; unpaid accrued leave; assuming the small-business redundancy exemption also removes notice",
    hotWaterLater: "An underpayment dispute layered on top of any dismissal claim; 1 week vs up to 4-5 weeks' notice; FWO recovery + superannuation on top",
    fairWorkExposure: "NES notice of termination (s117); correct final pay",
    linkedChallengeCodes: "PM11",
    linkedTemplateIds: "HR-082|HR-100|HR-102",
    prevalence: "Med-High",
    assistantHook: "Tenure-based notice calculator; final-pay checklist incl. accruals + state timing",
    sourceTier: "T1",
    triggerType: "event",
    riskTier: "moderate",
    surface: "playbook",
  },
  {
    id: "BMP-020",
    process: "Defensible shortlisting / interview rationale",
    lifecycleStage: "Pre-hire",
    bareMinimumAction: "Record job-relevant reasons for each shortlist/reject decision and use structured, lawful questions at the time",
    clockTrigger: "At each screening/interview decision",
    cadence: "Per role / candidate",
    commonMistake: "Gut-feel decisions; no notes; unlawful (protected-attribute) questions; can't reconstruct why later",
    hotWaterLater: "A discrimination claim with no contemporaneous, defensible record - the reasoning has to be built after the fact when it is least credible",
    fairWorkExposure: "Anti-discrimination law (Cth + state); AHRC",
    linkedChallengeCodes: "RS4|RS7|RS8",
    linkedTemplateIds: "RC-017|RC-016|RC-023|RC-024",
    prevalence: "Med-High",
    assistantHook: "Structured scorecard + reason capture; unlawful-question guardrail at interview",
    sourceTier: "T2",
    triggerType: "per_hire",
    riskTier: "moderate",
    surface: "checklist",
  },
  {
    id: "BMP-021",
    process: "Privacy / automated-decision-making transparency update (from 10 Dec 2026)",
    lifecycleStage: "Ongoing / compliance (forward)",
    bareMinimumAction: "Update the privacy collection notice to disclose automated decision-making used in hiring before the 10 Dec 2026 commencement",
    clockTrigger: "Hard date: 10 December 2026",
    cadence: "One-off compliance update",
    commonMistake: "Not tracking the commencement date; no ADM disclosure in the privacy/collection notice",
    hotWaterLater: "OAIC enforcement under the amended Privacy Act; separate discrimination exposure if AI screening produces discriminatory outcomes",
    fairWorkExposure: "Privacy Act automated-decision-making transparency (commences 10 Dec 2026)",
    linkedChallengeCodes: "RS22|RS23",
    linkedTemplateIds: "HR-019|RC-015",
    prevalence: "Med",
    assistantHook: "Countdown to 10 Dec 2026; privacy-notice ADM-disclosure clause template",
    sourceTier: "T2",
    triggerType: "standing",
    riskTier: "moderate",
    surface: "status",
  },
]

const BY_ID: ReadonlyMap<string, BmpProcess> = new Map(BMP_REGISTER.map(p => [p.id, p]))

/** Look up a process by its BMP code (e.g. "BMP-001"). Returns undefined if unknown. */
export function bmpById(id: string): BmpProcess | undefined {
  return BY_ID.get(id)
}
