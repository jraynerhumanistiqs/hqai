# Australian HR/ER & Recruitment Document-Template Register

**Purpose:** the most commonly required document/template types across the two product areas - **HR & Employee Relations** and **Recruitment** - for Australian employers (SME lens). This is the "DRAFT" surface of the assistant: each template is the artefact a user would ask the bot to produce or check.

**How this was built:** grounded in this project's 102-challenge register (each template links back to the `challenge_code`(s) it serves), cross-referenced with standard Australian HR/ER and recruitment practice and the regulatory watchlist (Section 3 of the research report). Australia only. Compiled 11 Aug 2026.

**Counts:** 148 templates - **102 HR & ER**, **46 Recruitment**. By legal status: 4 statutory-to-provide, 65 compliance-critical, 60 advisable, 19 best-practice. By drafting sensitivity: 80 Standard, 56 Caution, **12 Escalate**.

## Legend

- **Status** - Australian legal necessity:
  - `Statutory-provide` = a document the employer must give (Fair Work Information Statement, Casual/Fixed-Term Information Statements, compliant pay slip).
  - `Compliance-critical` = legally required to have/do in practice, or carries direct compliance exposure if wrong.
  - `Advisable` = strongly recommended; reduces risk and disputes.
  - `Best-practice` = value-add, low direct legal risk.
- **Sens** - drafting sensitivity (drives the assistant's DRAFT vs ESCALATE behaviour):
  - `·` Standard - safe to self-serve draft.
  - `!` Caution - draft, but review before use (compliance content).
  - `!!` Escalate - do not self-serve draft; route to a lawyer/specialist (e.g. deeds of release, summary dismissal, redundancy selection, restraints, offer withdrawal, contractor agreements).
- **Linked** - the `challenge_code`(s) this template serves (or another `doc_id` it composes with).

## How to read the analysis

The register is deliberately weighted to HR & ER (102 vs 46) because ER carries the bulk of legally-sensitive, document-heavy process (discipline, termination, redundancy, investigations, leave, payroll, WHS) - which is also where the escalation flags concentrate: **11 of 12 Escalate-flagged templates are HR & ER** (termination, redundancy, deeds, restraints, contractor agreements, underpayment rectification), plus one Recruitment (offer withdrawal). That distribution is a signal for the product: the recruitment DRAFT surface is largely safe to automate; the ER DRAFT surface needs the escalation gate wired tightly.

The four `Statutory-provide` documents are the only ones the employer is legally obliged to hand over as-is (they are FWO/ATO-issued, not drafted) - the assistant's job there is to prompt and track provision, not generate.

## Register

### HR & ER


**Contracts & engagement**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-001 | Employment contract - full-time (permanent) | Compliance-critical | ! | PF1|PF8|PF9 | New permanent full-time hire |
| HR-002 | Employment contract - part-time | Compliance-critical | ! | PF1|PF8 | New part-time hire |
| HR-003 | Employment contract - casual | Compliance-critical | ! | PF1|PF6|PF7 | New casual hire |
| HR-004 | Employment contract - fixed/maximum-term | Compliance-critical | ! | PF1|PF2 | Fixed-term engagement |
| HR-006 | Letter of offer / engagement | Advisable | · | PF1|RS16 | Confirming an offer |
| HR-007 | Fair Work Information Statement (provide) | Statutory-provide | · | PF13|PF1 | Every new employee |
| HR-009 | Fixed Term Contract Information Statement (provide) | Statutory-provide | · | PF2 | Each fixed-term contract |
| HR-010 | Confidentiality & IP assignment deed | Advisable | ! | PF1 | Roles with IP/sensitive data |
| HR-011 | Restraint of trade clause/deed | Advisable | !! | PF1 | Senior/client-facing roles |

**Classification**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-005 | Independent contractor / services agreement | Compliance-critical | !! | PF3|PF4|PF5 | Engaging a contractor |
| HR-008 | Casual Employment Information Statement (provide) | Statutory-provide | · | PF6|PF7 | Every new casual + at intervals |

**Pay & entitlements**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-012 | Individual Flexibility Arrangement (IFA) | Compliance-critical | ! | PF12 | Varying award/agreement terms |
| HR-052 | Time-in-lieu (TOIL) agreement | Advisable | ! | PF11 | Award-permitted TOIL |
| HR-056 | Annualised salary arrangement + reconciliation record | Compliance-critical | ! | PF12 | Salaried award staff |
| HR-057 | Wage/rate change letter | Advisable | · | PF10 | Pay changes / wage review |
| HR-061 | Salary sacrifice agreement | Advisable | ! | PF24 | Salary packaging |

**Policies**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-013 | Employee handbook / policy manual (master) | Advisable | · | PM3 | Onboarding / policy suite |
| HR-014 | Code of conduct | Advisable | · | PM3|PM6 | All staff |
| HR-018 | Workplace surveillance policy & notice | Compliance-critical | ! | PM3 | Monitoring staff/devices |
| HR-019 | Privacy & employee data collection notice | Compliance-critical | ! | RS23|PM3 | Handling personal info |
| HR-020 | Social media policy | Advisable | · | PM3 | All staff |
| HR-021 | IT / acceptable use / BYOD policy | Advisable | · | PM3 | All staff |
| HR-029 | Whistleblower policy | Compliance-critical | ! | PM3 | Larger/regulated employers |
| HR-034 | Conflict of interest / secondary employment policy | Advisable | · | PM3 | All staff |
| HR-035 | Expenses & reimbursement policy | Best-practice | · | PM3 | All staff |
| HR-036 | Motor vehicle / tool of trade policy | Best-practice | · | PM3 | Roles with vehicles |
| HR-037 | Uniform / dress code policy | Best-practice | · | PM3 | Customer-facing roles |

**WHS**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-015 | WHS / work health & safety policy | Compliance-critical | · | PM14|PM15 | All workplaces |
| HR-025 | Working-from-home WHS self-assessment | Advisable | · | PM14|PM12 | Remote workers |
| HR-030 | Drug & alcohol policy | Advisable | · | PM14 | Safety-sensitive roles |
| HR-044 | Induction / WHS induction record | Compliance-critical | · | PM14|PM2 | Every new hire |
| HR-095 | Return-to-work plan / suitable duties | Compliance-critical | ! | PM14 | Injury / workers comp |
| HR-096 | Psychosocial hazard risk assessment / register | Compliance-critical | ! | PM14 | WHS duty |
| HR-097 | WHS risk assessment / SWMS | Compliance-critical | ! | PM15 | High-risk work |
| HR-098 | Incident / hazard report form & register | Compliance-critical | · | PM15 | Incident/near-miss |
| HR-099 | Toolbox talk / safety meeting record | Best-practice | · | PM15 | Ongoing WHS |

**DEI/harassment**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-016 | Bullying, discrimination & sexual harassment policy | Compliance-critical | ! | PM20|PM16 | All workplaces |
| HR-017 | Equal opportunity / EEO & diversity policy | Advisable | · | PM20 | All workplaces |
| HR-094 | Reasonable adjustment request & plan | Compliance-critical | ! | PM20|RS11 | Disability adjustment |

**NES/leave**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-022 | Leave policy | Advisable | · | PF13|PF14 | All staff |
| HR-031 | Parental leave policy | Advisable | · | PF16 | All staff |
| HR-032 | Family & domestic violence support policy | Advisable | ! | PF19 | All staff |
| HR-045 | Leave application form (annual/personal) | Advisable | · | PF14|PF15 | Leave requests |
| HR-046 | Annual leave cash-out agreement | Compliance-critical | ! | PF14 | Cashing out leave |
| HR-047 | Excess annual leave direction letter | Advisable | ! | PF14 | Excess accrual |
| HR-048 | Parental leave request & response letters | Compliance-critical | · | PF16 | Parental leave |
| HR-049 | Return-to-work / keeping-in-touch agreement | Advisable | · | PF16 | Return from parental leave |
| HR-050 | Long service leave application & calculation record | Compliance-critical | ! | PF17 | LSL requests |
| HR-051 | Leave without pay agreement | Advisable | · | PF13 | Unpaid leave |

**Flexible work**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-023 | Flexible work / hybrid / remote policy | Advisable | · | PM12 | Hybrid workforces |
| HR-024 | Right to disconnect policy/guidance | Advisable | · | PM13 | All staff |
| HR-092 | Flexible work request response (approve/refuse) | Compliance-critical | ! | PM12 | FW flexible request |
| HR-093 | Right to disconnect - complaint response guide | Advisable | ! | PM13 | RTD dispute |

**Conflict**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-026 | Grievance / dispute resolution policy | Advisable | · | PM16 | All staff |
| HR-090 | Grievance lodgement form & response | Advisable | · | PM16 | Employee grievance |

**Performance**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-027 | Performance management policy | Advisable | · | PM4|PM5 | All staff |
| HR-062 | Performance review / appraisal template | Advisable | · | PM4 | Review cycle |
| HR-063 | KPI / objectives setting template | Best-practice | · | PM4 | Goal setting |
| HR-064 | Performance improvement plan (PIP) | Compliance-critical | ! | PM5 | Underperformance |

**Discipline**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-028 | Disciplinary policy | Advisable | ! | PM6|PM7 | All staff |
| HR-069 | Informal counselling file note | Advisable | · | PM4|PM6 | Minor issues |
| HR-070 | First written warning | Compliance-critical | ! | PM6 | Misconduct/underperformance |
| HR-071 | Second written warning | Compliance-critical | ! | PM6 | Repeat issue |
| HR-072 | Final written warning | Compliance-critical | ! | PM6 | Serious/repeat issue |
| HR-073 | Allegation / show-cause / invite-to-meeting letter | Compliance-critical | ! | PM6|PM7 | Before disciplinary meeting |
| HR-074 | Suspension / stand-down (with pay) letter | Compliance-critical | !! | PM7 | Pending investigation |
| HR-078 | Outcome of disciplinary meeting letter | Compliance-critical | ! | PM6|PM7 | After meeting |

**Wellbeing**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-033 | Wellbeing / mental health / EAP policy | Best-practice | · | PM21 | All staff |

**L&D**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-038 | Training & development policy | Best-practice | · | PM19 | All staff |
| HR-066 | Individual development plan (IDP) | Best-practice | · | PM19 | Development |
| HR-067 | Succession plan template | Best-practice | · | PM19 | Key-person risk |
| HR-068 | Training register / record | Advisable | · | PM19 | Compliance training |

**Onboarding**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-039 | New starter / onboarding checklist | Advisable | · | PM2|RS26 | Every new hire |
| HR-042 | Personal details & emergency contact form | Advisable | · | PM2 | Every new hire |

**Payroll/super**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-040 | Superannuation standard choice form + stapled-fund note | Compliance-critical | · | PF24 | Every new hire |
| HR-041 | TFN declaration process note | Compliance-critical | · | PF24 | Every new hire |

**Payroll**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-043 | Bank details / pay setup form | Advisable | · | PF24 | Every new hire |
| HR-053 | Compliant pay slip template | Statutory-provide | · | PF22 | Every pay |
| HR-054 | Timesheet template | Advisable | · | PF23 | Hourly/award staff |
| HR-055 | Employee records template (7-yr) | Compliance-critical | · | PF21 | All employees |
| HR-058 | Payroll deduction authorisation | Compliance-critical | ! | PF21 | Any deduction |
| HR-059 | Overpayment recovery agreement | Compliance-critical | ! | PF27 | Recovering an overpayment |

**Payroll/compliance**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-060 | Underpayment rectification pack (calc + disclosure + back-pay letter) | Compliance-critical | !! | PF26|PF27 | Discovered underpayment |

**Onboarding/probation**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-065 | Probation review & outcome letter (pass/extend/end) | Compliance-critical | ! | PM1 | End of probation |

**Investigations**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-075 | Investigation plan & terms of reference | Compliance-critical | ! | PM16 | Formal complaint |
| HR-076 | Investigation interview / witness statement record | Compliance-critical | ! | PM16 | During investigation |
| HR-077 | Investigation report | Compliance-critical | !! | PM16 | Serious/contested matters |

**Termination**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-079 | Summary dismissal (serious misconduct) letter | Compliance-critical | !! | PM7 | Serious misconduct |
| HR-080 | Termination letter - notice (performance/other) | Compliance-critical | !! | PM8|PM11 | Ending employment |
| HR-081 | Termination during probation letter | Compliance-critical | ! | PM1|PM8 | Within probation |
| HR-082 | Notice of termination & final pay statement | Compliance-critical | ! | PM11 | Any termination |
| HR-083 | Abandonment of employment letter | Advisable | ! | PM11 | Unexplained absence |
| HR-084 | Deed of release / settlement deed | Compliance-critical | !! | PM9|PM8 | Exit settlement |
| HR-086 | Redundancy consultation letter | Compliance-critical | !! | PM10 | Restructure |
| HR-087 | Redundancy selection criteria matrix | Compliance-critical | !! | PM10 | Selecting between roles |
| HR-088 | Notice of redundancy & redundancy pay calculation | Compliance-critical | !! | PM10 | Confirmed redundancy |
| HR-089 | Redeployment offer letter | Advisable | ! | PM10 | Redeployment option |

**Offboarding**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-085 | Statement of service / employment reference | Advisable | ! | PM8 | On exit |
| HR-100 | Resignation acknowledgement letter | Advisable | · | PM11 | Employee resigns |
| HR-101 | Exit interview template | Best-practice | · | PM17 | On exit |
| HR-102 | Return of property & access revocation checklist | Advisable | · | PM11 | On exit |

**ER/consultation**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| HR-091 | Major change consultation record | Compliance-critical | ! | PM10|PM12 | Roster/structure change |

### Recruitment


**Workforce need**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-001 | Hiring requisition / vacancy business case | Advisable | · | RA1|RA2 | Before advertising |

**Role design**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-002 | Position description / job description | Advisable | · | RA3|RA4 | Every role |
| RC-003 | Role scorecard / success profile | Best-practice | · | RA3|RA4 | Role definition |
| RC-004 | Selection criteria matrix | Advisable | · | RA4|RS3 | Screening/shortlisting basis |

**Job ads**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-005 | Job advertisement template | Compliance-critical | ! | RA6|RA7 | Advertising a role |
| RC-006 | Inclusive-language / discrimination checklist for ads | Compliance-critical | · | RA7 | Before posting |

**EVP**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-007 | EVP / careers page copy | Best-practice | · | RA9 | Employer branding |

**Sourcing**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-008 | Recruitment agency brief | Advisable | · | RA8 | Using an agency |
| RC-009 | Recruitment agency terms / fee agreement | Advisable | ! | RA8 | Engaging an agency |
| RC-010 | Internal job posting / expression of interest | Best-practice | · | RA8 | Internal hiring |
| RC-011 | Employee referral program & form | Best-practice | · | RA8 | Referrals |

**Pay banding**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-012 | Salary band / pay range worksheet | Advisable | ! | RA11|RA14 | Setting pay |

**Offer**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-013 | Offer approval / sign-off form | Advisable | · | RA15|RS16 | Before offer |
| RC-036 | Verbal offer script | Advisable | · | RS16|RS18 | Making an offer |
| RC-037 | Letter of offer (+ contract) | Compliance-critical | ! | RS16|HR-001 | Formal offer |
| RC-038 | Conditional offer letter (subject to checks) | Compliance-critical | ! | RS16|RS14 | Offer pending checks |
| RC-039 | Offer withdrawal letter | Compliance-critical | !! | RS16 | Rescinding an offer |

**Screening**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-014 | Application form (privacy-compliant) | Compliance-critical | ! | RS1|RS23 | Receiving applications |
| RC-015 | Candidate privacy collection notice / consent | Compliance-critical | ! | RS23|RS22 | Collecting candidate data |
| RC-016 | CV screening rubric / scorecard | Advisable | · | RS3|RS2 | Screening CVs |

**Shortlisting**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-017 | Shortlisting matrix (defensible) | Compliance-critical | ! | RS4 | Shortlisting |

**Candidate experience**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-018 | Regret / rejection email - application stage | Advisable | · | RS19 | Not shortlisted |
| RC-040 | Regret letter - post-interview (with feedback) | Advisable | · | RS19|RS20 | Unsuccessful interviewee |
| RC-041 | Talent pool / keep-warm consent & email | Advisable | · | RS19 | Future pipeline |
| RC-046 | Recruitment metrics tracker (time/cost/source-to-hire) | Best-practice | · | RS20|RS21 | Ongoing |

**Phone screen**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-019 | Phone / video screen guide | Advisable | · | RS5|RS6 | Initial screen |
| RC-020 | One-way / AI video interview consent & disclosure | Compliance-critical | ! | RS6|RS22 | AI video screening |

**Interview design**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-021 | Structured interview guide (role-specific) | Advisable | · | RS8|RS7 | Interviews |
| RC-022 | Behavioural / competency question bank | Best-practice | · | RS8 | Interview prep |
| RC-023 | Unlawful-questions guardrail sheet | Compliance-critical | · | RS7 | Interview prep |
| RC-024 | Interview scorecard / rating sheet | Advisable | · | RS9 | Scoring interviews |
| RC-025 | Panel interview coordination & score reconciliation | Best-practice | · | RS9 | Panel interviews |

**Assessments**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-026 | Skills / work-sample test brief & scoring guide | Advisable | · | RS10 | Practical assessment |
| RC-027 | Psychometric assessment consent & feedback | Compliance-critical | ! | RS10 | Psychometrics |
| RC-028 | Reasonable adjustment (assessment) request/plan | Compliance-critical | ! | RS11 | Candidate with disability |

**Checks**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-029 | Reference check consent form | Compliance-critical | · | RS12 | Before referee contact |
| RC-030 | Reference check questionnaire / script | Advisable | · | RS12 | Reference checking |
| RC-031 | Right-to-work / VEVO check record | Compliance-critical | ! | RS14 | Every hire |
| RC-032 | Police / criminal history check consent | Compliance-critical | ! | RS13 | Role-dependent |
| RC-033 | Working with Children / vulnerable people check record | Compliance-critical | ! | RS13 | Child/vulnerable-facing roles |
| RC-034 | Qualification / credential verification record | Advisable | · | RS15 | Credential-dependent roles |
| RC-035 | Pre-employment medical / functional assessment consent | Compliance-critical | ! | RS11 | Physically demanding roles |

**Onboarding handoff**

| ID | Template | Status | Sens | Linked | Trigger |
|----|----------|--------|:----:|--------|---------|
| RC-042 | New starter setup checklist (recruitment->People) | Advisable | · | RS26|HR-039 | Offer accepted |
| RC-043 | Day-one / first-week plan | Best-practice | · | RS26|PM2 | Start date |
| RC-044 | Hiring-manager-to-People handoff form | Advisable | · | RS26 | Recruitment close |
| RC-045 | Onboarding survey (30/60/90) | Best-practice | · | RS26|PM17 | Early tenure |
---

## Depth-gap assessment (honest)

This register is **broad but not yet deep**. It names the template *types* an AU SME commonly needs and links them to challenges, but it is built from domain synthesis, not exhaustive primary-source research. The following depth gaps are real and would materially improve coverage and accuracy:

1. **Industry / modern-award variants.** A "casual contract" or "annualised salary agreement" differs materially by award - Clerks, Hospitality (HIGA), Retail (GRIA), Building & Construction (BCGOA/CW), Manufacturing, Social & Community Services (SCHADS), Nurses, Fast Food (FFIA). Award-specific allowances, classifications, roster/overtime and consultation clauses are not captured.
2. **State / territory variants.** Long service leave forms and rules differ per state; workplace surveillance notice requirements differ (NSW/ACT have specific Acts); WHS codes and psychosocial instruments differ by regulator; portable LSL schemes exist in some states/sectors (construction, contract cleaning, community services); public-holiday substitution differs.
3. **Sector compliance packs.** NDIS, aged care and health (worker screening, AHPRA), education (WWCC, teacher registration), labour-hire licensing (Qld/Vic/SA), transport (chain of responsibility), mining, and franchising each add mandatory documents not in the generic set.
4. **Migration / sponsorship set.** Nomination, Labour Market Testing evidence, sponsor-obligation records, and the visa-specific paperwork (482/494/186) are only implied by RC/RA17.
5. **Collective / enterprise-agreement instruments.** Bargaining notices, protected-action ballot, EA consultation and approval documents (Escalate-class, but real).
6. **New-reform documents (2023-2026).** Casual "employee choice" conversion notice + employer response; fixed-term contract exception declarations; right-to-disconnect dispute process; labour-hire "same job same pay" applications; contractor high-income opt-out notice; ADM/AI transparency statement (from 10 Dec 2026).
7. **Special worker types.** Apprentice/trainee training contracts, junior-rate letters, working-holiday/student conditions, volunteers, interns/work-experience agreements, board/NED and NFP governance letters.
8. **Clause-level structure.** The register names templates but not their internal anatomy - required clauses, sections, mandatory fields, and personalisation variables - which the assistant must actually generate. This is the single biggest gap for build.
9. **Demand ranking.** Status here is legal-necessity-based, not demand-based. Which templates are *most requested* (search demand, Fair Work template-download volume, HR SaaS template-library popularity) is not captured and would sharpen prioritisation.
10. **Canonical source mapping.** Where an authoritative free template already exists (Fair Work Ombudsman template library, Safe Work model documents, ATO forms), each register row should point to it - both to anchor accuracy and to avoid reinventing.

**Conclusion: yes, it lacks depth** on variants, clause-structure, sector packs, and demand ranking. The prompt below is designed to close exactly these gaps.

---

## Research-agent prompt (paste to a research analysis agent)

> **ROLE.** You are a senior Australian HR, employment-relations and talent-acquisition documentation specialist with current (as at August 2026) command of the Fair Work system, the NES, modern awards, WHS/psychosocial law, migration, and state/territory variations. You are rigorous about primary sources and you write for a technical delivery team building an AI document-drafting assistant, not a general audience.
>
> **OBJECTIVE.** Deepen and validate an existing register of Australian HR/ER and Recruitment document templates. You are given a starter register of ~148 template *types* (CSV, columns: `doc_id, name, area, subdomain, linked_challenge_codes, status, sensitivity, trigger, notes`). Do NOT re-list what already exists at type level unless you are correcting it. Your job is to (a) add the missing templates and variants, (b) enrich every high-priority template with clause-level structure and authoritative sourcing, and (c) rank by real demand. Australia only. Federal baseline; flag state/territory, award and industry variance explicitly.
>
> **INPUTS.** The starter register CSV (`hr_document_templates.csv`) and its `doc_id` scheme (`HR-###` for HR & ER, `RC-###` for Recruitment). Continue the numbering; never reuse an id.
>
> **GAPS TO CLOSE (priority order).**
> 1. **Industry/award variants** - for the high-use core docs (employment contracts, annualised salary agreement, pay slip, roster/overtime, casual conversion), specify what changes by major modern award: Clerks, HIGA (hospitality), GRIA (retail), Building & Construction, Manufacturing, SCHADS, Nurses, Fast Food. Capture award-specific allowances, classifications, consultation and overtime/penalty clauses.
> 2. **State/territory variants** - long service leave (each state + portable schemes), workplace surveillance notices (NSW/ACT/others), WHS/psychosocial codes by regulator, public-holiday substitution, payroll tax nuances where document-relevant.
> 3. **Sector compliance packs** - NDIS, aged care, health/AHPRA, education/WWCC, labour-hire licensing (Qld/Vic/SA), transport/chain-of-responsibility, mining, franchising. List the additional mandatory documents each imposes.
> 4. **Migration/sponsorship** - full document set for employer sponsorship (nomination, Labour Market Testing evidence, sponsor-obligation records, 482/494/186).
> 5. **Collective/EA instruments** - bargaining and enterprise-agreement documents (bargaining representative notice, NERR, protected-action ballot, consultation, approval application).
> 6. **New-reform documents (2023-2026)** - casual "employee choice" conversion notice + response, fixed-term contract exception declaration, right-to-disconnect dispute process, "same job same pay" application, contractor opt-out notice, ADM/AI transparency statement (from 10 Dec 2026).
> 7. **Special worker types** - apprentice/trainee training contracts, junior-rate letters, working-holiday/student, volunteers, interns/work-experience, board/NED and NFP governance.
> 8. **Clause-level anatomy** - for at least the top 40 templates by demand, list the required clauses/sections, mandatory fields, and personalisation variables (the merge fields an AI must fill), and note which clauses are legally load-bearing.
> 9. **Demand ranking** - assign each template a prevalence/demand tier (High/Med/Low) using evidence: Fair Work Ombudsman template-download prominence, search interest, HR SaaS template-library coverage (Employment Hero, ELMO, etc.), and practitioner-forum frequency. Distinguish "genuinely common" from "loud on LinkedIn".
> 10. **Canonical source mapping** - for every template that has an authoritative free version, link it: Fair Work Ombudsman template library, Safe Work Australia model documents, ATO forms, state regulators, AHRC. This anchors accuracy.
>
> **PER-TEMPLATE OUTPUT SCHEMA** (extend the CSV; one row per template or variant):
> `doc_id | name | area | subdomain | linked_challenge_codes | status (Statutory-provide/Compliance-critical/Advisable/Best-practice) | sensitivity (Standard/Caution/Escalate) | jurisdiction (federal/state/award/industry + which) | trigger | required_clauses (list) | personalisation_variables (merge fields) | canonical_source_url (+ tier) | demand_tier (High/Med/Low + evidence) | legal_risk_note | source_tier (T1/T2/T3 + citation, access date)`.
>
> **SOURCE RULES.** T1 = Fair Work Ombudsman/Commission, Safe Work Australia, ATO, AHRC, OAIC, Home Affairs, state regulators, legislation. T2 = employment-law firms, AHRI/RCSA, reputable HR SaaS documentation. T3 = vendor template blogs/forums (use for existence and demand signal only, never as the legal authority on content). Grade every source. Triangulate any "mandatory/optional" claim across >=2 independent sources. Date-stamp anything regulatory and confirm status as at August 2026. Never fabricate a source, a mandatory-field claim, or a canonical URL - if unverified, mark it a gap.
>
> **DEDUP & CORRECTIONS.** Match against the starter register by `name`/`doc_id`; if you are correcting an existing row (e.g. its status or sensitivity), reference its `doc_id` and state the correction with a source. Otherwise add new ids.
>
> **OUTPUT.** (1) The extended CSV. (2) A short "corrections to the starter register" list. (3) A clause-anatomy appendix for the top 40 templates. (4) A one-page demand-ranked shortlist of the 25 templates to build first, with rationale. (5) A research-gaps list of anything you could not verify.
>
> **SELF-CHECK before returning:** every new template has status + sensitivity + jurisdiction + a graded source; award/state/sector variance is flagged, not flattened; the top-40 clause anatomy is present; demand tiers cite evidence; no fabricated canonical URLs; escalation-class documents (deeds, summary dismissal, redundancy selection, restraints, EA instruments, sponsorship) are all marked Escalate.

---

*Register compiled from this project's 102-challenge knowledge base + AU HR/ER and recruitment practice. Status/sensitivity are analyst-assigned and must be validated against primary sources (per the prompt above) before any template is used or presented as compliant. Nothing here is legal advice.*
