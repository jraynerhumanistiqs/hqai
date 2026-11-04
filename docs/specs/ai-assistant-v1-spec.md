# AI Assistant v1 - Implementation Specification

Status: DRAFT v0.1 (2026-10-30). Owner decision required on section 2.4.
Audience: the dev team building `/dashboard/assistant`.
Scope: turning the `ComingSoon` stub at `app/dashboard/assistant/page.tsx` into
the thing its own blurb promises - "your day-to-day helper for the admin around
people management - drafting, chasing, summarising and keeping track of what
needs doing."

Every claim about current behaviour cites a file. Verify before you build.

---

## 0. Read this first - the one-paragraph answer

Build a **worklist**, not a chat. The Assistant's landing surface is a derived
list of what is overdue or coming up across the user's own employee register,
with a small drafting drawer behind each item. It needs **no new tables and no
migrations** - every input already exists in `employees` and
`compliance_events`, and two of them
(`compliance_events.metadata.follow_up_date`, and the per-employee gap summary
already computed in `app/api/employees/route.ts`) are written today and never
read back. The only genuinely new AI route is a short-message drafter, and its
scope is set by a **closed allow-list of draft kinds** rather than by prompt
instructions, which is what keeps it off the legal line and off the withdrawn
AI Administrator's turf.

---

## 1. Current state, verified

| Thing | Where | State |
|---|---|---|
| Assistant route | `app/dashboard/assistant/page.tsx` | `ComingSoon` stub. Blurb quoted above. |
| Sidebar entry | `components/sidebar/Sidebar.tsx:305` | Live, flat tab, `RiRobot2Line`, sibling of AI Advisor. **Do not edit - another agent is in this file.** |
| Home tile | `app/dashboard/page.tsx:61` | Live tile pointing at `/dashboard/assistant`. **Do not edit - another agent is in this file.** |
| Chat surface | `components/chat/ChatInterface.tsx` (976 lines) | Working. AI Elements primitives, SSE from `app/api/chat/route.ts`. |
| Chat route | `app/api/chat/route.ts` (940 lines) | Streaming, 2-iteration forced-RAG tool loop, 3-tier model routing, hard-triage short-circuit. Q&A only. |
| Employee register | `supabase/migrations/employee_register_and_evidence_trail.sql`, `lib/employees.ts`, `components/people/TeamRegister.tsx` | Live, RLS on. |
| Evidence trail | `compliance_events`, append-only (no UPDATE policy by design) | Live. `event_type` is deliberately free text. |
| Record gaps | `lib/record-gaps.ts` | Live. Already computed for the whole business in one query by `GET /api/employees`. |
| Reactive signals | `lib/people-context.ts`, `app/api/people-context/route.ts`, `components/people/PeopleContextHint.tsx` | Live, but only mounted inside the chat composer. |
| Timing gate | `lib/timing-gate.ts`, `app/api/employees/[id]/timing-check/route.ts`, `components/people/EndEmployment.tsx` | Live. The "risky action, held and routed" pattern already exists. |
| File-note drafting | `lib/file-note-kb.ts`, `app/api/file-notes/assist/route.ts`, `components/people/FileNoteComposer.tsx` | Live, but only reachable from inside `TeamRegister`. |
| Record export | `lib/record-export.ts`, `app/api/employees/[id]/export/route.ts` | Live. PDF/DOCX of one person's record. |
| Document engine | `app/api/documents/contract/route.ts`, `lib/template-ip.ts` (33 templates) | **Live.** Generates a DOCX from a template's `promptInstructions` plus form data, saves a `documents` row, returns `X-Document-Id`. Only the 5 Recruitment templates are exposed, at `/dashboard/recruit/templates`. |
| Doc editor | `components/docs/*`, `/api/documents/[id]/render(-html)` | Live. `/dashboard/documents` works but is unlinked. |
| AI Administrator | `_archive/ai-administrator/` | Withdrawn Aug 2026. Not imported, excluded from tsconfig and eslint. |

### 1.1 Two live contradictions you will trip over

These are not hypothetical. Fix them in step 0 of section 7, before any
Assistant work, because they are the same promise the Assistant is being built
to keep.

1. **The AI Advisor's own empty state advertises document generation it will
   refuse.** `components/chat/ChatInterface.tsx:82-87` ships
   `SUGGESTIONS_PEOPLE = ['Draft a termination letter', 'Casual to permanent
   conversion', 'Calculate redundancy pay', 'Write a formal warning notice']`.
   Three of those four are on the always-escalate deny-list in
   `lib/prompts.ts` (`HQ_PEOPLE_GROUNDING`), and `MASTER_SYSTEM_PROMPT` states
   flatly "You do not produce documents". Clicking chip 1 on a brand new
   account produces a refusal and an advisor handoff.

2. **`TemplatesList` deep-links into a chat that cannot do the job.**
   `components/templates/TemplatesList.tsx:89` pushes
   `/dashboard/people?prompt=I need to generate a <template title>` into the
   AI Advisor. The Advisor answers in prose about what the document should
   cover; it never produces the document.

---

## 2. Scope

### 2.1 The jobs, as user actions

Four jobs. Each one is useful against data that already exists, and each one
is derivable or draftable without a migration.

**J1. "Show me what needs doing."**
The landing surface. A single list, most urgent first, assembled from the
user's own register:

- a file-note follow-up whose date has passed or is within 14 days
  (`compliance_events.metadata.follow_up_date`, written by
  `components/people/FileNoteComposer.tsx:110`, read by nothing today)
- a missing record item for someone who has been on the books long enough for
  it to matter (`lib/record-gaps.ts` `GapSummary.missing`)
- a probation / minimum-employment-period date inside 120 days
  (`minimumPeriodEndsOn` in `lib/employees.ts`)
- a casual past 6 or 12 months of service (`monthsOfService`)
- a fixed-term contract whose `fixed_term_end` is inside 60 days
- people with no confirmed award (`award_confirmed = false`)

Each row states a fact and a date from their own data and offers one action.
It never says what the user should decide. That rule is already written down
in `lib/people-context.ts` (header comment) and
`components/people/PeopleContextHint.tsx` - inherit it verbatim.

**J2. "Summarise this person's record."**
A readable prose brief for one employee: who they are, how long they have been
there, what is on file, what is not, and the last few dated events. Built from
`GET /api/employees/[id]` (employee plus full trail) and `computeGaps`. Ends
with a link to the existing PDF/DOCX export
(`/api/employees/[id]/export?format=pdf`). Facts and dates only - no
characterisation of conduct, no entitlement figures.

**J3. "Write up what just happened."**
A file note, from guided answers or a paste of rough text. This is the
**existing** `/api/file-notes/assist` route plus `FileNoteComposer`, reached
from the Assistant instead of only from inside the team register. Saves to the
trail via `POST /api/compliance-events` with `event_type: 'file_note'`, and
sets `metadata.follow_up_date`, which closes the loop back into J1.

**J4. "Draft the chase."**
A short piece of administrative text about a person already in the register,
pre-filled from their record. Closed allow-list of kinds (section 5.2): an
information or document request, a meeting confirmation, a follow-up on an
agreed action, or a context summary for the Humanistiqs advisor. Output is
plain text the user edits, copies or sends themselves. It is not a document,
it is not rendered to DOCX, and it is never a letter that forms a step in a
disciplinary or exit process.

**J5 (stretch, same shipping step as J1). "I have done that."**
Mark a work item done or dismissed. Written as an append-only trail event, not
a mutable task row - see section 3.3.

### 2.2 Explicitly out of scope for v1

- A general chat surface. That is `/dashboard/people/advisor`.
- Review cycles, goals, ratings, 1:1 scheduling, org charts. The owner
  rejected this and was right to.
- Any letter that is a step in a disciplinary or exit process: warning,
  show cause, PIP, termination, redundancy, abandonment. See section 5.
- Re-opening the HR half of the template gallery. See 2.4.
- Sending email on the user's behalf. v1 drafts; the user sends. The one
  exception is the existing advisor handoff,
  `POST /api/support/contact-advisor`, which already sends to
  `hq.ai@humanistiqs.com.au`.
- Any user-entered task. Every item in v1 is derived. If the user can type a
  todo, the product becomes a to-do list they must maintain, and it rots.
- Any new chat transport, conversation, or `messages` row.

### 2.3 Is the owner's chosen scope right?

Mostly yes, and it is the right size. Two honest corrections.

**Correction 1 - "drafting" has to be narrowed or the Assistant walks into the
deny-list on day one.** The blurb's verbs are drafting, chasing, summarising
and keeping track. Three of the four are safe. "Drafting" is only safe if it
means a factual record (J3) or an administrative request (J4). The moment it
means a warning letter, it is both (a) an always-escalate topic in
`lib/prompts.ts` and (b) a procedural-fairness question, which is law. So the
spec defines drafting by a positive allow-list rather than trying to fence off
the bad cases. Section 5.

**Correction 2 - "keeping track" is the actual product, and it is being
under-weighted.** The highest-value, lowest-risk and cheapest-to-build part of
the blurb is J1, and it needs no AI at all - it is a pure derivation over data
the user already entered. It is also the only part that gives the Assistant a
reason to exist as its own tab rather than as a chip in the Advisor. If the
build has to shrink to one thing, J1 is the one thing. Build it first and ship
it on its own (section 7, step 3).

### 2.4 Overlap with the withdrawn AI Administrator - owner decision required

This has to be said plainly rather than designed around.

AI Administrator was a **document engine sold as a product**: a template
gallery, a form, a generated DOCX/PDF/PPTX, a documents library, a public
marketplace and a one-off Stripe checkout
(`_archive/ai-administrator/README.md`). It was withdrawn in Aug 2026 as a
product decision, not a technical one. The README is explicit that the code
worked.

The engine itself was never removed. `app/api/documents/contract/route.ts` is
live, serves all 33 templates in `lib/template-ip.ts`, saves a `documents` row
and returns the id. Today only the 5 `Recruitment`-category templates are
reachable, at `/dashboard/recruit/templates`.

So the real question is not "should we resurrect the engine" - it is already
running. The question is: **does the Assistant re-expose the HR half of an
engine the owner deliberately stopped selling?**

- J1, J2 and J3 do not. Nothing in them touches `lib/template-ip.ts` or
  `/api/documents/contract`. J3 is the file-note assistant that was built
  *after* the withdrawal and shipped as part of the People phase.
- J4 is adjacent but materially different: short plain text about a specific
  person in the register, pre-filled from their record, no template, no form,
  no file, no DOCX, no library row, not sold.
- Re-exposing `Letters & Offers`, `Performance Management`,
  `Termination & Separation`, `Workplace Policies` or `Return to Work` from
  `lib/template-ip.ts` **would** be the withdrawn product, under a new tab
  name. This spec recommends against it for v1.

**Decision asked of the owner:** confirm that v1 stays off the HR template
gallery. If the answer is "actually, re-open it", that is a product decision
that revisits Aug 2026 and should be logged in `docs/DECISION-LOG.md`, not
smuggled in as a feature of the Assistant tab. Note that if it is re-opened,
section 1.1's second contradiction has an obvious fix (point
`TemplatesList.handleCustomise` at the Assistant, not the Advisor), so the two
decisions are coupled.

---

## 3. Data

### 3.1 New tables or migrations required: NONE

This is the headline and it is worth protecting. Migrations here are run by
hand in the Supabase SQL Editor and several have been half-applied with silent
consequences. A design that needs none is worth more than a design with nicer
semantics.

Everything J1-J5 needs already exists:

| Input | Source | Already written by |
|---|---|---|
| People, dates, employment type, award, status | `employees` | `components/people/TeamRegister.tsx`, `POST /api/employees` |
| Dated events, file notes, linked documents | `compliance_events` | `POST /api/compliance-events`, `AddToRecord`, `FileNoteComposer` |
| Follow-up dates | `compliance_events.metadata.follow_up_date` (jsonb) | `FileNoteComposer.tsx:110`. **Read by nothing today.** |
| Protected-event dates for the timing gate | `compliance_events.metadata.note_type = 'protected_event'` plus `metadata.protected_kind` | `FileNoteComposer`, read by `lib/timing-gate.ts` |
| Record completeness | derived | `lib/record-gaps.ts` via `GET /api/employees` |
| Legal headcount | `business_headcount()` RPC, SECURITY DEFINER | `supabase/migrations/team_invites_and_roles.sql:127` |
| Business profile (state, industry, award) | `businesses` | onboarding |

### 3.2 What the Assistant reads, and what it must never read

Reads: `employees`, `compliance_events`, `businesses` (profile fields only),
`documents` (title, type, created_at - for "what is on file"), and the
`business_headcount()` RPC.

Does **not** read `knowledge_chunks` and does not call `search_knowledge` or
`get_pay_rate` from `lib/chat-tools.ts`. That is a deliberate separation: the
**Advisor** answers questions grounded in the legal corpus; the **Assistant**
works on the user's own data. Keeping the corpus out of the Assistant means it
cannot produce an uncited legal claim, because it has no legal source to draw
on at all. If a worklist item raises a legal question, the Assistant hands off
to the Advisor with the question pre-filled using the existing `?prompt=` deep
link (`app/dashboard/people/advisor/page.tsx` already accepts it).

### 3.3 Item state without a migration

J5 needs "done", "dismissed" and "snooze". Do this as append-only trail
events, which is what `compliance_events` is for and what its free-text
`event_type` was designed to allow:

> "Kept as a plain map (not a DB enum) so new process types can be added
> without a migration - the column is free text by design." - `lib/employees.ts`

Add two keys to the `EVENT_TYPES` map in `lib/employees.ts` (a TypeScript-only
change, no SQL):

```ts
worklist_done:      { label: 'Worklist item marked done' },
worklist_dismissed: { label: 'Worklist item dismissed' },
```

Write them through the existing `POST /api/compliance-events` with
`metadata: { item_key, snooze_until? }`. The derivation in `lib/worklist.ts`
then suppresses any item whose `item_key` has a later `worklist_done` /
`worklist_dismissed` event, or whose `snooze_until` is in the future.

Three constraints to respect:

- The table has **no UPDATE policy**. Undo is a new reversing event, not an
  edit. Take the most recent event per `item_key`.
- `POST /api/compliance-events` rejects an `occurred_at` more than 24h in the
  future (`app/api/compliance-events/route.ts:65`). So a snooze date goes in
  `metadata.snooze_until`, and `occurred_at` stays `now()`.
- `title` is `not null` and the route falls back to `EVENT_TYPES[type].label`,
  which is why the two keys above must be added.

### 3.4 Optional migration - NOT recommended for v1

Only if the owner later wants assignees, shared ownership of items, or
reporting on completion rates. Do not run this for v1.

```sql
-- OPTIONAL - DO NOT RUN FOR v1. See docs/specs/ai-assistant-v1-spec.md s3.4.
-- Assistant worklist item state. Only needed if derived state via
-- compliance_events (s3.3) proves insufficient. Additive and idempotent.
create table if not exists public.worklist_item_state (
  business_id  uuid not null references public.businesses(id) on delete cascade,
  item_key     text not null,
  employee_id  uuid references public.employees(id) on delete cascade,
  status       text not null default 'open'
                 check (status in ('open','done','dismissed','snoozed')),
  snooze_until date,
  assigned_to  uuid references public.profiles(id) on delete set null,
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (business_id, item_key)
);

comment on table public.worklist_item_state is
  'Mutable state for derived Assistant worklist items. The items themselves are
   derived from employees + compliance_events and are never stored.';

create index if not exists worklist_item_state_business_idx
  on public.worklist_item_state (business_id, status);

alter table public.worklist_item_state enable row level security;

drop policy if exists "worklist_business_select" on public.worklist_item_state;
create policy "worklist_business_select" on public.worklist_item_state
  for select using (business_id = public.current_business_id());

drop policy if exists "worklist_business_write" on public.worklist_item_state;
create policy "worklist_business_write" on public.worklist_item_state
  for all using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());
```

**Manual step, if ever run:** paste into the Supabase SQL Editor for project
`rbuxsuuvbeojxcxwxcjf` and run as one statement block. Then save it as
`supabase/migrations/worklist_item_state.sql`. Verify with
`select count(*) from public.worklist_item_state;` as the anon key (must be 0
rows or a permission error) and as service role.

---

## 4. Surfaces

### 4.1 Route tree

`/dashboard/assistant` stays exactly where it is. The sidebar entry
(`Sidebar.tsx:305`) and the home tile (`page.tsx:61`) already point at it and
neither file is to be touched. No new routes, no sub-routes in v1. Deep links
into a single item use a query param, `?item=<item_key>`, so the home tile and
a future notification can both land on an open drawer.

```
app/dashboard/assistant/page.tsx             <- replace ComingSoon with the real page
components/assistant/AssistantWorklist.tsx   <- NEW, client. The list.
components/assistant/WorkItemCard.tsx        <- NEW, client. One row + its action.
components/assistant/DraftDrawer.tsx         <- NEW, client. Guided -> review -> save.
components/assistant/RecordBrief.tsx         <- NEW, client. J2 output panel.
lib/worklist.ts                              <- NEW, pure. employees+events -> WorkItem[]
lib/assistant-drafts.ts                      <- NEW. Draft-kind allow-list + prompts.
app/api/assistant/worklist/route.ts          <- NEW, GET.
app/api/assistant/brief/route.ts             <- NEW, POST. J2.
app/api/assistant/draft/route.ts             <- NEW, POST. J4.
```

### 4.2 Not ChatInterface

`components/chat/ChatInterface.tsx` is not reused, and the Assistant does not
call `/api/chat`. Reasons, in order of weight:

1. **The owner said it is not a chat surface.** A chat box invites the
   open-ended legal question the Advisor exists to answer, and
   `/dashboard/people/advisor` already answers it better because it is
   RAG-grounded.
2. **The chat route's system prompt is the wrong prompt.** `buildSystemPrompt`
   in `lib/prompts.ts` emits thousands of tokens of Fair Work precedence
   rules, a deny-list and citation discipline. Half of J1-J4 would land on
   that deny-list and be escalated rather than done.
3. **It would put employee PII tools into the legal-corpus loop.** Adding
   `get_employee_record`-style tools to `app/api/chat/route.ts` means the
   forced-search loop and the 10-message history window now carry named
   employee data into a route whose `chat_audit_log` writes the full
   `user_message` and `assistant_text`. That is a privacy decision, not a
   refactor.
4. The chat route's 2-iteration budget and 45s soft budget are tuned for RAG
   retrieval. The Assistant's work is one short non-streaming call.

What **is** reused from the chat stack: the AI Elements primitives
(`components/ai-elements/*`) for the drawer's input and loader, and the
`PortalMenu` pattern (`components/ui/PortalMenu.tsx`) for any row menu - the
worklist rows will clip for the same reason the recruit lists do.

### 4.3 The page

Server component. Auth-gated and redirecting to `/login` like
`app/dashboard/people/team/page.tsx`. Fetches nothing itself; renders
`AssistantWorklist`, which calls `GET /api/assistant/worklist` on mount. That
keeps the page cheap and lets the list refresh after an action without a
route-level revalidate.

Layout, top to bottom:

1. **Header.** Reuse `components/dashboard/PageHeader.tsx`. Title "AI
   Assistant". One line of sub-copy in the blurb's own words.
2. **Count strip.** "4 things need attention, 6 coming up." Suppressed at
   zero. Never render a whole-business headcount here - see section 6.6.
3. **The list.** Grouped into `Overdue`, `This fortnight`, `Coming up`. Within
   a group, `WorkItemCard` rows in a `rounded-3xl bg-bg-elevated border
   border-border divide-y divide-border` panel, matching the Next actions
   block on the dashboard home. Each row carries: the fact, the date, the
   person's name linking to `/dashboard/people/team`, one filled accent action
   button, and a `PortalMenu` with "Mark done", "Dismiss", "Remind me in a
   fortnight".
4. **A quick-actions row.** Three ghost buttons that start a job without an
   item: "Write up a conversation" (J3), "Summarise someone's record" (J2),
   "Draft a chase" (J4).
5. **Empty state.** Section 6.1. Not a "nothing to do" pat on the head.

Per the house style in `CLAUDE.md`: buttons `rounded-full`, cards
`rounded-2xl`/`rounded-3xl` with `shadow-card`, one filled accent CTA per
section, tokens only, no gradients, no accent bars, remixicon glyphs, plain
hyphens, Australian English.

### 4.4 The drawer

`DraftDrawer` is modelled directly on
`components/people/FileNoteComposer.tsx`, which already has the right shape:
choose a path, answer a few short questions or paste rough text, get a
structured draft, **review and edit it**, then save. Reuse that flow rather
than inventing a second one.

Three states: `collect` -> `review` -> `saved`. The user always sees and edits
the draft before anything is written or copied. Nothing is auto-sent and
nothing is auto-saved.

For J3 the drawer is literally `FileNoteComposer` with the employee
pre-selected. Lift it out of `TeamRegister` unchanged if it is already
self-contained; otherwise pass the employee in as a prop and leave its
internals alone.

---

## 5. The legal-positioning constraint

### 5.1 The line, and why "draft a warning letter" is on the wrong side of it

`CLAUDE.md`: "HQ.ai NEVER claims to cite/perform/advise on employment law."
`lib/prompts.ts` holds the operative rules. Two of them bind here:

- `HQ_PEOPLE_GROUNDING` deny-list: "Termination (any form, any reason) ...
  Redundancy ... Bullying, harassment, discrimination allegations ... For
  deny-list topics, give a brief general orientation, do NOT issue a specific
  recommendation or generate a document."
- `MASTER_SYSTEM_PROMPT`, "WHEN THE USER ASKS FOR A DOCUMENT": "You do not
  produce documents ... For dismissal, redundancy, or serious misconduct, do
  not walk them through it at all: escalate to their Humanistiqs advisor
  first."

A warning letter fails on both counts. It is a step in a disciplinary process
whose validity turns on procedural fairness, and the phrasing of it is
evidence. Drafting one is performing employment-law work, whatever the
disclaimer says.

The Assistant therefore does **not** define its drafting scope by excluding
bad topics. It defines it by a closed allow-list of kinds whose content is
either a factual record of something that happened or an administrative
request. Everything else is not refused with a lecture - it is **routed**, to
the Advisor for a question or to the Humanistiqs advisor for a situation.

### 5.2 The allow-list

In `lib/assistant-drafts.ts`, as a closed union. `POST /api/assistant/draft`
takes `kind` from this union and nothing else. A free-text request for a
warning letter cannot reach the model as a draft kind, because there is no
kind for it.

| `kind` | What it produces | Why it is inside the line |
|---|---|---|
| `file_note` | A factual record of a conversation or observation | Delegates entirely to the existing `/api/file-notes/assist`. `lib/file-note-kb.ts` header: "Everything here is about writing a factual record. None of it is advice on what to do about the situation, and the prompt is told so." |
| `info_request` | "Could you send your super choice form / certificate / bank details by Friday" | An administrative request for a document. States no entitlement and no consequence. |
| `meeting_confirm` | "Confirming we are meeting Tuesday 2pm to go through X" | Logistics. Must not state the meeting's legal character or outcome. |
| `follow_up` | A nudge on an action already agreed and already on the trail | Quotes the user's own recorded agreement back. Adds nothing new. |
| `record_brief` | J2's prose summary of one person's record, for the owner's own reading | Facts and dates from their own data. Same boundary `lib/record-export.ts` already holds: "states facts and dates and never characterises them." |
| `advisor_handoff` | A context summary for the Humanistiqs advisor | This is the escalation itself. Sends via the existing `POST /api/support/contact-advisor`. |

### 5.3 Four mechanical guards, in order

Prompt text alone is not a guard. These run as code.

**Guard 1 - closed kind union.** `POST /api/assistant/draft` validates `kind`
against the allow-list and returns 400 otherwise. No `kind` exists for a
warning, show-cause, PIP, termination, redundancy or abandonment letter.

**Guard 2 - hard triage before any model call.** Run
`detectHardTriage(freeText)` from `lib/prompts.ts` on every piece of user text
that reaches the route. On a hit, return `buildTriageReply(...)` and the
`{ category, summary }` payload, with **no LLM call at all**. This is exactly
what `app/api/chat/route.ts:92-147` does. The drawer renders it as the
advisor-handoff card and offers `advisor_handoff` as the only next action.

**Guard 3 - timing gate on anything near performance or exit.** Before
drafting about a named person for `follow_up` or `file_note`, call
`evaluateGate()` from `lib/timing-gate.ts` over their trail. On `escalate` (a
protected event inside 30 days) hold the draft and route, reusing the
`components/people/EndEmployment.tsx` three-tier pattern verbatim - including
its re-check at the moment of action and its recorded override. On `caution`
(31-90 days) draft, but surface the date and distance above the draft.

**Guard 4 - escalation sweep on the output.** Run `detectEscalation()` on the
user's text plus the produced draft. On a hit, the drawer shows the advisor
handoff alongside the draft rather than instead of it, using the escalation
message format already specified in `MASTER_SYSTEM_PROMPT`.

### 5.4 Copy rules for the drafting prompt

`lib/assistant-drafts.ts` builds a **short, purpose-built system prompt**. It
does **not** call `buildSystemPrompt()` and it does not include
`MASTER_SYSTEM_PROMPT`, `DOCUMENT_TEMPLATE_IP` or `HQ_PEOPLE_GROUNDING` -
those are for the grounded advisory path and would invite the model to reason
about law. The Assistant's prompt says, in substance:

- You are writing short internal workplace admin text for an Australian small
  business. You are not giving advice and you are not interpreting law.
- State only what the user told you and what their own record says. Never
  state an entitlement, a notice period, a leave balance, a dollar figure, a
  date calculation you were not given, or a legislative reference. If the user
  asks for one, say it needs the AI Advisor and stop.
- Never characterise conduct as misconduct, poor performance, unsatisfactory,
  a breach or a warning. Record what was said and done.
- Never state or imply a consequence of non-compliance.
- Plain hyphens only. Australian English. No em or en dashes.
- Refer to the human escalation target as "your Humanistiqs advisor". Never a
  first name, never "your AI advisor". (Same rule as `MASTER_SYSTEM_PROMPT`
  NAMING DISCIPLINE.)
- No disclaimer footers. The surface carries the framing.

Reuse the structured-output shape from `app/api/file-notes/assist/route.ts`: a
single forced tool call, fields read back individually, and the
`.replace(/[—–]/g, '-')` sweep that route already applies on every
field.

### 5.5 Worklist copy rules

Every row states a fact and a date derived from the user's own data, plus a
reason it is being surfaced now. It never states what to decide. The pattern,
the tone and the exact failure mode to avoid are already written down in
`lib/people-context.ts` and `components/people/PeopleContextHint.tsx`:

> "Sarah's minimum employment period ends on 14 March" is a date from their
> data. "You should dismiss her before then" would be advice, and is out of
> bounds.

Reuse `signalsFor()`'s `fact` / `because` split in the `WorkItem` type so the
distinction is structural rather than a matter of writing care.

### 5.6 What must go to a human

Unchanged from `lib/prompts.ts`. The Assistant adds no new escalation triggers
and removes none. On any of these it holds the action, states the reason in one
line, and offers `advisor_handoff`:

Everything in `detectHardTriage` (workplace violence, sexual harassment
incident, mental health crisis, active litigation, visa or immigration,
discriminatory request, imminent termination), everything on the
`HQ_PEOPLE_GROUNDING` deny-list, and additionally any timing-gate `escalate`
tier from Guard 3. Plus one Assistant-specific trigger: a request for a draft
whose `kind` does not exist. That is not an error state, it is a routing state
- "that one is your Humanistiqs advisor's" or "ask the AI Advisor", depending
on whether it is a situation or a question.

---

## 6. Risks, unknowns, and the cut list

### 6.1 An empty register means an empty product. Highest risk.

J1 has nothing to say until someone has added employees, and the self-serve
funnel has never had an account reach active - so the register is empty nearly
everywhere. A tab that renders "nothing needs doing" on first open reads as
broken.

Mitigation, and this is a build requirement not a nicety: the zero-employee
state is the **first work item**. "HQ cannot keep track of dates it does not
have. Add the people you employ and the Assistant starts watching the dates
that matter." One accent CTA to `/dashboard/people/team`. If
`businesses.headcount` is set, use it: "You told us you have around 12 people.
None are on the register yet." Build and review this state first, not last.

### 6.2 Stale items turn the tab into noise

If an item cannot be cleared it becomes wallpaper, and the whole surface loses
credibility. Mitigations: every item dismissible (J5 ships with J1, not after
it); no user-entered tasks; items age out of the list by their own rules
(`signalsFor` already caps its windows at 120 days either side); and the list
is capped - 10 rows with "show all" rather than an unbounded scroll.

### 6.3 The template-gallery decision could reopen (2.4)

If the owner says yes to re-exposing HR templates, J4's allow-list is no
longer the boundary and section 5 needs rewriting. Get the answer before
building J4. J1-J3 are unaffected either way, which is another reason to build
them first.

### 6.4 `metadata.follow_up_date` may never have been written

It is set by `FileNoteComposer` into a jsonb blob with no constraint. There may
be zero rows with it in the live database, and any that exist may hold a bad
string. `lib/worklist.ts` must validate with `/^\d{4}-\d{2}-\d{2}$/` plus
`Date.parse`, and must degrade to zero items rather than throwing. **Verify
before building J1:** run a read against the live database for the count of
`compliance_events` rows where `metadata->>'follow_up_date'` is not null. If it
is zero, J1's follow-up source contributes nothing on day one and the gap and
date sources carry the list. That changes the demo, not the design.

### 6.5 The Advisor handoff lands on an ungrounded surface

All 4,275 `knowledge_chunks` rows are currently unembedded, so the Advisor
answers with no grounding and empty citations. The Assistant does not depend on
RAG, so this does not block it - but "ask the AI Advisor" is a handoff to
something that is itself broken today. Not the Assistant's bug to fix; state it
so nobody is surprised when the handoff disappoints.

### 6.6 Scoped admins and the headcount leak. Specific and real.

`profiles.admin_scope` can be `all`, `selected` or `team`, and
`can_access_employee()` enforces it in RLS
(`supabase/migrations/team_invites_and_roles.sql`). So a scoped admin sees only
some `employees` rows. But `business_headcount()` is SECURITY DEFINER and
returns the **whole** business count - correct, because the minimum employment
period depends on the real legal headcount, and wrong if it is rendered to a
user as "you have 30 people" when they can see four.

Rule: `business_headcount()` is an input to date calculations only. Never
render it, never derive a visible count from it, and derive the count strip
(4.3 item 2) from the rows actually returned. Add a test for this.

### 6.7 Cost and latency

J1 makes **no model call** - it is a pure derivation plus two Supabase queries,
the same shape `GET /api/employees` already runs. Only the drawer calls Claude:
one non-streaming forced-tool call on `CLAUDE_MODELS.standard`
(`lib/ai-models.ts`), `max_tokens` around 1200, the same configuration
`/api/file-notes/assist` already uses. Do not wire `lib/model-router.ts` or
prompt caching in v1 - there is no long stable system prompt to cache and no
tier decision to make.

### 6.8 Unknowns I could not resolve from the code

- Whether any live `compliance_events` row carries a `follow_up_date` (6.4).
- Whether the owner's "chasing" meant chasing *employees* for paperwork, or
  chasing their *own* overdue admin. This spec builds both - J1 is the second,
  J4's `info_request` is the first - but if it meant something else again
  (chasing a candidate, chasing the advisor) the allow-list needs one more
  entry.
- Whether `FileNoteComposer` is self-contained enough to mount outside
  `TeamRegister` without refactoring. Check before estimating step 4.

### 6.9 The cut list, in the order I would cut

1. **J4 (`draft the chase`).** The only genuinely new AI route, the only one
   needing the full guard stack, and the one closest to the 2.4 decision.
   Cutting it removes all four guards from the critical path.
2. **J2 (`summarise a record`).** Nice, and `/api/employees/[id]/export`
   already gives a worse-but-real version of it as a PDF today.
3. **J3's new entry point.** `FileNoteComposer` already works from the team
   register. Linking to it from the Assistant is a convenience.
4. **J5's snooze.** Done and dismissed are enough.

What I would not cut under any circumstances: **J1 plus the empty state.** That
is the product. It needs no AI, no migration and no new prompt, and it is the
only part that justifies the tab.

---

## 7. Sequencing

Each step is independently shippable and leaves the build green
(`npm run build`, then `npm run lint` against the known baseline of 5 errors
and 63 warnings - do not treat those as regressions).

| Step | What | Files | Rough effort |
|---|---|---|---|
| **0** | **Fix the two live contradictions (1.1).** Replace the four `SUGGESTIONS_PEOPLE` chips with questions the Advisor can actually answer, grounded and non-deny-list (e.g. "What notice applies to a casual?", "How does casual conversion work?"). Point `TemplatesList.handleCustomise` somewhere honest, or hide the button for categories with no live destination. | `components/chat/ChatInterface.tsx`, `components/templates/TemplatesList.tsx` | 1-2 h |
| **1** | **`lib/worklist.ts`, pure.** `employees[] + compliance_events[] + headcount + now -> WorkItem[]`. Mirror `lib/record-gaps.ts` and `lib/people-context.ts` in shape, tone and purity. Suppression from `worklist_done` / `worklist_dismissed` / `snooze_until` (3.3). Tests with `node:test`, including the 6.6 headcount rule and the 6.4 bad-date tolerance. | `lib/worklist.ts`, `lib/employees.ts` (two `EVENT_TYPES` keys), `tests/assistant/worklist.test.ts` | 0.5 day |
| **2** | **`GET /api/assistant/worklist`.** Business-scoped exactly like `GET /api/employees`: profile -> `business_id`, one `employees` query, one `compliance_events` query, `business_headcount()` RPC, then `lib/worklist.ts`. Returns `{ items, counts }`. Returns empty items rather than erroring when the register is empty. | `app/api/assistant/worklist/route.ts` | 2-3 h |
| **3** | **The page. First shippable product, zero AI.** Replace `ComingSoon`. `AssistantWorklist` + `WorkItemCard` + the empty state from 6.1 + mark done / dismiss / snooze via `POST /api/compliance-events`. Verify in a preview at mobile and desktop width, light and dark. | `app/dashboard/assistant/page.tsx`, `components/assistant/AssistantWorklist.tsx`, `components/assistant/WorkItemCard.tsx` | 1-1.5 days |
| **4** | **J3 - wire the existing file-note assistant in.** Mount `FileNoteComposer` from a work item and from the quick-actions row, employee pre-selected. No new route, no new prompt. Confirm the saved note's `follow_up_date` reappears in the worklist - that closes the loop and is the demo. | `components/assistant/DraftDrawer.tsx`, possibly a small prop on `components/people/FileNoteComposer.tsx` | 0.5 day |
| **5** | **J2 - record brief.** `POST /api/assistant/brief` takes an `employeeId`, loads employee + trail + gaps, one forced-tool Claude call, returns prose. `RecordBrief` renders it with a link to the existing PDF export. Guard 2 and Guard 4 apply. | `app/api/assistant/brief/route.ts`, `components/assistant/RecordBrief.tsx`, `lib/assistant-drafts.ts` | 0.5-1 day |
| **6** | **J4 - the chase drafter, with all four guards.** `lib/assistant-drafts.ts` allow-list and prompts; `POST /api/assistant/draft`. Blocked on the 2.4 decision. Needs its own tests: one per guard, plus a case asserting that a warning-letter request returns a routing response and makes no model call. | `lib/assistant-drafts.ts`, `app/api/assistant/draft/route.ts`, `tests/assistant/draft-guards.test.ts` | 1-1.5 days |
| **7** | **Polish.** `?item=` deep link, "show all" beyond 10 rows, `PortalMenu` row actions, the count strip, `aria-live` on the list, keyboard path through the drawer. | as above | 0.5 day |

Total: roughly 5-6 days with step 6, roughly 3.5-4 days without. Steps 0-3 are
about half of that and deliver the part that matters.

### 7.1 Definition of done for step 3 (the gate that matters)

- A brand new account with no employees sees the 6.1 first-run item, not an
  empty panel and not an error.
- An account with three employees and one file note carrying a past
  `follow_up_date` sees that follow-up at the top, with the person's name and
  the date.
- Dismissing an item removes it and it stays gone after a reload.
- A scoped admin (`admin_scope = 'team'`) sees only their own people and no
  whole-business count anywhere on the page (6.6).
- No model call is made anywhere in the step-3 path.
- `npm run build` green; `npm run lint` at the documented baseline.
- Verified in a preview, not just locally: dark default plus the light toggle,
  and mobile width.

---

## 8. Appendix - the `WorkItem` contract

Illustrative only. The point is the `fact` / `because` split from
`lib/people-context.ts` and the closed `action` union, which is what keeps the
surface on the right side of section 5.

```ts
export type WorkItemKind =
  | 'follow_up_due'        // metadata.follow_up_date has passed or is near
  | 'record_gap'           // lib/record-gaps.ts missing item
  | 'minimum_period'       // minimumPeriodEndsOn inside 120 days
  | 'casual_tenure'        // casual past 6 or 12 months
  | 'fixed_term_ending'    // fixed_term_end inside 60 days
  | 'award_unconfirmed'    // award_confirmed = false
  | 'register_empty'       // the first-run item, s6.1

export type WorkItemAction =
  | { type: 'write_file_note'; employeeId: string }
  | { type: 'open_record'; employeeId: string }
  | { type: 'summarise_record'; employeeId: string }
  | { type: 'draft'; kind: DraftKind; employeeId: string }
  | { type: 'ask_advisor'; prompt: string }   // ?prompt= deep link
  | { type: 'contact_advisor'; summary: string }
  | { type: 'add_people' }

export interface WorkItem {
  /** Stable across recomputation - this is what done/dismiss keys on. */
  key: string              // e.g. `gap:${employeeId}:fwis`
  kind: WorkItemKind
  employeeId?: string
  name?: string
  /** A fact from their own data. Never a direction. */
  fact: string
  /** Why it is surfaced now. Never a consequence or an obligation. */
  because: string
  dueOn?: string           // ISO date
  urgency: 'now' | 'soon' | 'info'
  action: WorkItemAction
}
```
