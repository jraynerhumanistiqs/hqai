# Opportunity Solution Tree - HQ People compliance clock

Built with the `opportunity-solution-tree` skill (Teresa Torres, *Continuous Discovery Habits*) over the 21 bare-minimum processes (BMP-001..021).

**Evidence base:** `bare_minimum_processes.csv` (21 processes, each with failure mode + quantified downside), the 102-challenge register, and the Appendix A practitioner-language bank.

> **Method caveat, stated up front.** A proper OST is built from *continuous customer interviews*. This one is built from **desk research plus forum-mined practitioner language** - real, but not the same thing. Importance scores are grounded in regulator volume and cost data; **Satisfaction scores are analyst estimates and are the weakest input here.** Treat the ranking as a starting hypothesis to test with 5-8 SME interviews, not a settled answer.

---

## 1. Desired outcome (one, measurable)

> **An SME using HQ People never misses a compliance clock.**
>
> Measured as: **% of due compliance actions completed inside their window**, per account.
> Target for first release: **80%+ on-time completion** across tracked actions, and **zero missed hard deadlines** (the irreversible ones: minimum-employment-period expiry, casual-conversion response, the 21-day flexible-work response).

Supporting input metrics: actions surfaced per account per month; median time from prompt to completion; % of accounts with at least one overdue hard deadline.

*Why this outcome:* the register's own finding is that the assistant's job here is not HR advice - it is **owning the clock**. This outcome measures exactly that, and nothing else.

---

## 2. Opportunity space

Opportunities are framed as customer problems, derived from the `common_mistake` field across all 21 processes - i.e. how SMEs *actually* fail, not features we want to build.

| # | Opportunity (customer voice) | Spans | Importance | Satisfaction | **Score** |
|---|---|---|---|:--:|:--:|:--:|
| **O1** | "I don't know what's due, or when - I lose track of dates." | BMP-001, 003, 004, 006, 007, 011, 015, 021 (8) | 0.95 | 0.15 | **0.81** |
| **O2** | "When someone questions what I did, I can't prove it." | BMP-002, 005, 009, 013, 015, 017, 018, 020 (8) | 0.90 | 0.20 | **0.72** |
| **O5** | "I did a reasonable thing at the wrong moment and created risk I never saw." | BMP-005, 008 (2) | 0.80 | 0.10 | **0.72** |
| O4 | "I knew I had to act, but not the right order or form." | BMP-002, 008, 016, 019 (4) | 0.70 | 0.25 | 0.53 |
| O3 | "I didn't know that rule applied to me, or that it changed." | BMP-004, 010, 012, 014, 016 (5) | 0.75 | 0.35 | 0.49 |

Opportunity Score = Importance x (1 - Satisfaction).

**Note on O5:** it spans only 2 processes yet ties for second. That is correct, not an artefact - adverse-action timing carries **reverse onus, no compensation cap, and no minimum employment period**, and *nothing in the market warns an SME that today is a bad day to act*. Low breadth, extreme depth, near-zero current satisfaction.

**Note on O3:** scores lowest because satisfaction is genuinely higher - the FWO website answers "what is the rule" well (2.7m fact-sheet views). SMEs are not short of *information*; they are short of *timing and proof*. That is the strategic insight of this tree.

### Prioritised: **O1, O2, O5**

---

## 3. Solutions (3+ per opportunity, from PM / Designer / Engineer lenses)

### O1 - "I don't know what's due, or when" (score 0.81)

| # | Solution | Lens | Sketch |
|---|---|---|---|
| S1.1 | **Compliance clock engine** | Engineer | Every employee record spawns dated obligations from their start date, award, and employment type. One scheduler, six trigger types (per-hire, tenure countdown, payroll cycle, calendar, event, standing). |
| S1.2 | **"What's due" home surface** | Designer | The dashboard tile answers one question in one glance: what is due, what is overdue. Countdown treatment for hard deadlines; nothing else competes for attention. |
| S1.3 | **Hard-deadline escalating alerts** | PM | For irreversible clocks only (min-employment-period, casual conversion, 21-day flexible response): 30/14/7/1-day prompts that escalate in prominence, plus email. Deliberately scarce so they never become noise. |
| S1.4 | **Onboarding backfill** | PM | On signup, ingest existing staff start dates and immediately show which clocks are *already running* - instant value before any new hire. |

### O2 - "I can't prove what I did" (score 0.72)

| # | Solution | Lens | Sketch |
|---|---|---|---|
| S2.1 | **Automatic evidence trail** | Engineer | Every completed action writes an immutable, timestamped record (what, when, by whom, document attached). Records-of-record, not notes. |
| S2.2 | **One-click "show me the file"** | Designer | Per employee, a chronological compliance file exportable as a single PDF - the artefact you hand a lawyer or the FWO. |
| S2.3 | **Capture at the moment, not after** | Designer | Micro-capture in the flow (a 20-second note on a performance conversation) because contemporaneous beats reconstructed - which is the whole legal point. |
| S2.4 | **Evidence-gap indicator** | PM | Per employee, a quiet completeness read: contract on file, FWIS provided, right-to-work checked, feedback trail present. Shows what is *missing* before it matters. |

### O5 - "Right thing, wrong moment" (score 0.72)

| # | Solution | Lens | Sketch |
|---|---|---|---|
| S5.1 | **Adverse-action timing warning** | PM | When a user starts a discipline/termination/PIP flow, check for a recent protected event (complaint, leave, illness, pregnancy disclosure) and surface a plain-English caution *before* they act. |
| S5.2 | **Reuse the existing 3-tier gate** | Engineer | **Already built and validated:** `classify_escalation_tier` catches "sack someone who just complained" / "she just told me she's pregnant" at 100% safety-catch on the eval set. Wire it to the action flows, not just chat. |
| S5.3 | **Sequenced action flows** | Designer | For redundancy and dismissal, the UI enforces order (consult -> decide -> notify), so "decided first, consulted after" becomes structurally hard. |

---

## 4. Experiments (fast, cheap, skin-in-the-game)

| # | Solution | Hypothesis | Method | Metric | Success threshold |
|---|---|---|---|---|---|
| **E1** | S1.4 Onboarding backfill | SMEs will enter existing staff start dates if shown live clocks in return | Concierge test: 8 SMEs, manually build their clock list from a spreadsheet they send | % who complete the data hand-over unprompted | **6 of 8** |
| **E2** | S1.3 Hard-deadline alerts | A 30/14/7/1-day cadence produces action, not dismissal | Manual email alerts to 10 accounts with a live probation clock, for 6 weeks | % of min-employment decisions made *before* expiry | **>=80%**, and <20% mute rate |
| **E3** | S2.2 Compliance file export | The exportable file is the thing they will actually pay for | Fake-door: "Export compliance file" button; on click, show a 2-question intent survey | Click-through on the button among active accounts | **>=25%** |
| **E4** | S5.1 Timing warning | The warning changes behaviour rather than annoying | Prototype the discipline flow with the timing check; 6 moderated sessions using their own real scenario | % who pause/seek advice vs proceed unchanged | **>=4 of 6 pause**, and none rate it "patronising" |
| **E5** | O1 vs O2 (opportunity level) | Timing pain outranks proof pain | 8 SME interviews: rank 5 opportunities, then a small forced trade-off | Rank order of O1 vs O2 | **O1 first for >=5 of 8**; if not, re-order the tree |

E5 is the important one: it tests the tree's own premise before much gets built.

---

## 5. The tree

```
OUTCOME: An SME using HQ People never misses a compliance clock
         (80%+ on-time completion; zero missed hard deadlines)
   |
   |-- O1 "I don't know what's due, or when"                    [0.81] <- lead
   |     |-- S1.1 Compliance clock engine (6 trigger types)
   |     |-- S1.2 "What's due" home surface .................... E2
   |     |-- S1.3 Hard-deadline escalating alerts .............. E2
   |     +-- S1.4 Onboarding backfill of existing staff ........ E1
   |
   |-- O2 "I can't prove what I did"                            [0.72]
   |     |-- S2.1 Automatic evidence trail
   |     |-- S2.2 One-click compliance file export ............. E3
   |     |-- S2.3 Capture at the moment
   |     +-- S2.4 Evidence-gap indicator
   |
   |-- O5 "Right thing, wrong moment"                           [0.72]
   |     |-- S5.1 Adverse-action timing warning ................ E4
   |     |-- S5.2 Reuse the 3-tier gate  [ALREADY BUILT]
   |     +-- S5.3 Sequenced action flows
   |
   |-- O4 "Wrong order or form"                                 [0.53]  (parked)
   +-- O3 "Didn't know it applied to me"                        [0.49]  (parked - FWO already serves this)
```

---

## 6. What this changes

1. **The lead opportunity is timing (O1), not knowledge (O3).** SMEs are not short of information - the FWO publishes it and they read it 2.7m times a year. They are short of *someone owning the clock*. That reframes the product from "AI that answers HR questions" to "the thing that never lets you miss the date" - and it is a sharper wedge.
2. **Proof (O2) is the monetisable artefact.** The exportable compliance file is what has value at the moment of dispute. E3 tests that cheaply.
3. **O5 is already half-built.** The 3-tier escalation gate (`classify_escalation_tier`, 100% safety-catch on the eval set) is the detector for the highest-depth opportunity in the tree. Wiring it into *action flows* rather than only chat is a small piece of work with outsized risk reduction.
4. **The six trigger groups are the solution architecture, not the opportunity structure.** They belong under S1.1 as the engine's internal taxonomy - which is exactly what the categorisation analysis recommended.

## 7. Next

- Run **E5** first (8 interviews) - it validates or reorders the whole tree for a few days' work.
- Then E1 and E2 (both concierge/manual, no build).
- Hold the BMP CSV schema change (`trigger_type` / `risk_tier` / `surface`) until E5 confirms the opportunity order - if O2 outranks O1, `surface` may need an evidence-first variant.
- Revisit weekly; kill solutions that fail their experiment.
