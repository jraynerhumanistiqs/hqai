# Analyzer: categorising the 21 bare-minimum processes

Assessment of `bare_minimum_processes.csv` (BMP-001..021) and a recommended categorisation that gives real separation between processes, using the HQ Recruit navigation pattern as the UX precedent.

---

## 1. Data-quality findings (fixed)

| Finding | Detail | Status |
|---|---|---|
| **Column-shifted row** | BMP-012 had 15 fields, not 14 - an unescaped comma in a dollar figure (`$183,100`) split field [8]. `linked_challenge_codes` read "100 (from 1 Jul 2026)", pushing codes/templates/prevalence one column right. | **FIXED** - all 22 lines now 14 fields; BMP-012 = PF3/PF4/PF5, HR-005, Med-High |
| **lifecycle_stage is unusable as a category** | 15 distinct values across 21 rows ("Ongoing", "Ongoing / compliance", "Ongoing / compliance maintenance", "Ongoing / proactive", "Ongoing / compliance (forward)"...). Near-zero grouping power. | Recommend replacing as primary axis (below) |
| **prevalence not normalised** | 5 variants ("Very high", "High / near-universal", "High", "Med-High", "Med") | Normalise to 3 tiers before UI use |

---

## 2. Why lifecycle staging fails as the separator

The natural instinct is to group by employee lifecycle (pre-hire, onboarding, ongoing, exit). It fails here because **14 of 21 processes are "ongoing" in some form** - they have no single place on a lifecycle line. Worse, lifecycle answers *"where in the employee's journey"* when the operative question for this process class is **"what starts the clock, and when do I get pinged"**.

These processes were selected for one property: **a clock plus a cheap-now / expensive-later delta.** So the categorisation should separate them by *the shape of the clock*.

---

## 3. Recommended primary axis: TRIGGER TYPE (6 groups)

Tested against all 21 - clean distribution, every process has exactly one obvious home:

| Group | n | What it means to the user | Firing behaviour |
|---|---|---|---|
| **A. Per-hire gate** | 7 | "Do this before/at start, once per person" | Blocking checklist on a new hire |
| **B. Tenure countdown** | 3 | "A clock is running on this person" | Scheduled alerts + hard deadline |
| **C. Payroll cycle** | 2 | "Every pay run, forever" | Recurring per-cycle check |
| **D. Calendar date** | 2 | "A fixed date in the year" | Annual / dated reminder |
| **E. Event-triggered** | 4 | "Something happened - act correctly now" | Reactive, on-demand playbook |
| **F. Standing duty** | 3 | "Always on; review periodically" | Low-frequency review nudge |

**Group A - Per-hire gate (7):** BMP-009 right-to-work/VEVO, BMP-010 contract before start, BMP-011 fixed-term cap/FTCIS, BMP-012 contractor classification, BMP-013 FWIS/CEIS, BMP-014 super stapled-fund/choice, BMP-020 defensible shortlisting rationale.

**Group B - Tenure countdown (3):** BMP-001 probation / minimum-employment-period, BMP-006 casual conversion Employee Choice, BMP-016 flexible-work 21-day response.

**Group C - Payroll cycle (2):** BMP-002 records + payslips, BMP-007 annualised salary reconciliation.

**Group D - Calendar date (2):** BMP-003 1 July Annual Wage Review, BMP-004 Payday Super.

**Group E - Event-triggered (4):** BMP-005 performance documentation / adverse-action timing, BMP-008 redundancy consultation, BMP-018 WHS psychosocial review, BMP-019 termination notice + final pay.

**Group F - Standing duty (3):** BMP-015 LSL accrual tracking, BMP-017 positive duty, BMP-021 privacy/ADM transparency (10 Dec 2026).

*Two borderline calls to settle in build:* BMP-004 (Payday Super) is arguably payroll-cycle (C) rather than calendar (D) - it fires every payday with a 7-business-day deadline. BMP-007 is both per-pay and annual. Suggest a nullable `secondary_trigger` rather than forcing one.

### Why this axis wins

1. **It matches the product insight.** The register's own framing is that the assistant's job is *owning the clock*. Trigger type IS the clock's shape, so category equals firing behaviour - the taxonomy and the notification engine become the same thing.
2. **It separates cleanly** - no process sits ambiguously in two groups (unlike lifecycle).
3. **It matches user mental models** - "things I do when someone joins" vs "things that run every pay" vs "things I do when something happens" is how an owner already thinks.
4. **It is buildable** - each group gets a distinct UI treatment (below), which is exactly the requested degree of separation.

### Secondary axes (metadata, not navigation)

- **Risk tier** (prevalence x cost-of-getting-it-wrong) - sort order *within* a group, and the badge colour.
- **lifecycle_stage** - retain as a filter/tag only.
- **linked_challenge_codes / template_ids** - the join into the ML corpus and the doc engine.

---

## 4. UI/UX: mapping to the HQ Recruit precedent

`RecruitFlowRail` is a **sequential, numbered, gated stepper**: one accent (Wattle Gold) carries the current step, done steps recede to a quiet check, upcoming steps are reachable per a `canNavigate` predicate. It works for HQ Recruit because a role genuinely flows 1 - 2 - 3 - 4.

**Key finding: do NOT put all 21 processes in one linear rail.** They are not a sequence - they are six different clock shapes running in parallel and repeating. A single 21-step rail would imply a false order, could never show "done" honestly (most recur and never complete), and would bury the high-risk items.

### Recommended structure - mirror the pattern language, one level up

```
Dashboard tile ("Stay compliant" / "HR Essentials")   <- same card treatment as the HQ Recruit tile
        |
        v
Category index: 6 group cards (A-F)                   <- the separation layer
        |
        v
Per-process detail: its own short RecruitFlowRail     <- reuse the rail where a real sequence exists
```

- **Level 1 (tile):** one dashboard entry matching the HQ Recruit card, with a live "N due / M overdue" count.
- **Level 2 (the separation you want):** six group cards, each with its own icon, a one-line hint (exactly the `hint` pattern in `FlowStep`), and a count. This is where the degree of separation lives - the user picks a *clock shape*, not a wall of 21.
- **Level 3 (per process):** a rail is now genuinely appropriate, because an individual process *does* have ordered steps. E.g. BMP-001 probation: `1 Set the dates - 2 Month-1 review - 3 Month-3 review - 4 Month-5 decision point - 5 Confirm or exit`. Reuse `RecruitFlowRail` directly (`FlowStep[]`, `done`, `canNavigate`) - no new component needed for the linear part.

### Per-group UI treatment (this is what creates the real separation)

| Group | Primary surface | Why |
|---|---|---|
| A. Per-hire gate | **Checklist against a person** (blocking, completable) | Genuinely one-off - "done" is truthful |
| B. Tenure countdown | **Countdown / timeline with a hard deadline** | The date IS the content; show days remaining |
| C. Payroll cycle | **Recurring check tied to the pay run** | Repeats forever; never "done", only "current" |
| D. Calendar date | **Annual calendar item** | Fixed date; a year-planner strip |
| E. Event-triggered | **On-demand playbook** ("this just happened, do this") | No clock until the event; must be findable fast |
| F. Standing duty | **Health / status indicator with review-by date** | Always on; shows freshness, not completion |

Groups A and B reuse the rail most directly. C and D belong in a calendar view. E is where the chat assistant leads (and where the Escalate tier fires most). F is a status panel.

### Design-system notes

One accent (`clay`) marks current/attention only; risk badges use the existing `warning`/`danger` tokens sparingly so the page stays calm. Cards `rounded-2xl`/`rounded-3xl` + `shadow-card`, buttons `rounded-full`, plain hyphens, Australian English - per the HQ.ai design rules.

---

## 5. Recommended schema change

Add to `bare_minimum_processes.csv` (and any future table):

| Column | Values | Purpose |
|---|---|---|
| `trigger_type` | per_hire / tenure_countdown / payroll_cycle / calendar / event / standing | **Primary navigation axis** |
| `secondary_trigger` | same enum, nullable | Handles BMP-004 / BMP-007 dual nature |
| `risk_tier` | critical / high / moderate | Normalised from prevalence x cost; sort + badge |
| `surface` | checklist / countdown / recurring / calendar / playbook / status | Which of the six UI treatments renders it |

Keep `lifecycle_stage` as a tag; stop using it to group.

---

## 6. Open items

- Normalise `prevalence` into the 3 `risk_tier` values (currently 5 variants).
- Settle the two dual-trigger cases (BMP-004, BMP-007).
- The register's own flagged verification gaps (penalty dollar tiers, Payday-Super SGC mechanics, state psychosocial dates, LSL variation) still need a primary-source pass before any of this is surfaced to users as compliance fact.
