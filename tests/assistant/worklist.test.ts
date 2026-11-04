// Unit tests for the AI Assistant worklist derivation (lib/worklist.ts).
// Run: npx tsx --test tests/assistant/worklist.test.ts
// (matches the tests/checkout + tests/model-router.test.ts convention of
// tsx --test, so the real module is imported rather than re-implemented.)

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWorklist,
  suppressedKeys,
  asDateOnly,
  WORKLIST_DISMISSED_EVENT,
  WORKLIST_DONE_EVENT,
  type WorklistEvent,
} from '../../lib/worklist'
import type { Employee } from '../../lib/employees'

const NOW = new Date('2026-10-30T09:00:00')

function emp(over: Partial<Employee> & { id: string; start_date: string }): Employee {
  return {
    business_id: 'biz-1',
    first_name: 'Sarah',
    last_name: 'Nguyen',
    email: null,
    job_title: null,
    end_date: null,
    employment_type: 'full_time',
    fixed_term_end: null,
    award: null,
    classification: null,
    award_confirmed: true,
    state: 'NSW',
    status: 'active',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over,
  } as Employee
}

function ev(over: Partial<WorklistEvent> & { id: string }): WorklistEvent {
  return {
    employee_id: null,
    event_type: 'other',
    occurred_at: '2026-10-01T00:00:00Z',
    metadata: {},
    ...over,
  } as WorklistEvent
}

/** Every string a user could read off the page, for leak assertions. */
function visibleText(items: ReturnType<typeof buildWorklist>['items']) {
  return items.map(i => `${i.fact} ${i.because} ${i.name ?? ''}`).join(' | ')
}

// --- the first-run item (s6.1) ---------------------------------------------

describe('empty register (the most likely real state)', () => {
  test('produces the first-run item, not an empty list', () => {
    const w = buildWorklist({ employees: [], events: [], headcount: 0, now: NOW })
    assert.equal(w.firstRun, true)
    assert.equal(w.items.length, 1)
    assert.equal(w.items[0].kind, 'register_empty')
    assert.deepEqual(w.items[0].action, { type: 'add_people' })
    assert.equal(w.counts.total, 1)
  })

  test('the first-run item cannot be dismissed away into a blank tab', () => {
    const w = buildWorklist({ employees: [], events: [], headcount: 0, now: NOW })
    assert.equal(w.items[0].dismissible, false)
    // ...and a dismissal event on its key does not suppress it either.
    const w2 = buildWorklist({
      employees: [],
      events: [ev({ id: 'e1', event_type: WORKLIST_DISMISSED_EVENT, metadata: { item_key: 'register:empty' } })],
      headcount: 0,
      now: NOW,
    })
    assert.equal(w2.items.length, 1)
    assert.equal(w2.items[0].kind, 'register_empty')
  })

  test('uses the stated headcount band when onboarding captured one', () => {
    const w = buildWorklist({ employees: [], events: [], headcount: 0, statedHeadcount: '1-14', now: NOW })
    assert.match(w.items[0].fact, /1-14 people/)
    assert.match(w.items[0].fact, /None of them are on the register yet/)
  })

  test('a bare number band reads as a count, not a range', () => {
    const w = buildWorklist({ employees: [], events: [], headcount: 0, statedHeadcount: '12', now: NOW })
    assert.match(w.items[0].fact, /around 12 people/)
  })

  test('says nothing about a headcount it was not given', () => {
    const w = buildWorklist({ employees: [], events: [], headcount: 0, now: NOW })
    assert.equal(w.items[0].fact, 'No one is on your employee register yet.')
  })

  test('an ended-only register is still the first-run state', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2024-01-01', status: 'ended' })],
      events: [],
      headcount: 0,
      now: NOW,
    })
    assert.equal(w.firstRun, true)
  })
})

// --- follow-up dates out of an unconstrained jsonb blob (s6.4) -------------

describe('file-note follow-ups', () => {
  const sarah = emp({ id: 'a', start_date: '2026-09-01', award_confirmed: true })

  test('a past follow-up is surfaced with the name and the date', () => {
    const w = buildWorklist({
      employees: [sarah],
      events: [ev({
        id: 'fn-1',
        employee_id: 'a',
        event_type: 'file_note',
        occurred_at: '2026-10-01T00:00:00Z',
        metadata: { follow_up_date: '2026-10-20', topic: 'roster change' },
      })],
      headcount: 4,
      now: NOW,
    })
    const item = w.items.find(i => i.kind === 'follow_up_due')
    assert.ok(item, 'expected a follow_up_due item')
    assert.equal(item.group, 'overdue')
    assert.equal(item.urgency, 'now')
    assert.match(item.fact, /20 October 2026/)
    assert.match(item.fact, /Sarah Nguyen/)
    assert.match(item.fact, /roster change/)
    assert.equal(item.because, 'That date passed 10 days ago.')
    // Most urgent first.
    assert.equal(w.items[0].kind, 'follow_up_due')
  })

  test('a follow-up inside the fortnight is surfaced as coming up', () => {
    const w = buildWorklist({
      employees: [sarah],
      events: [ev({ id: 'fn-1', employee_id: 'a', event_type: 'file_note', metadata: { follow_up_date: '2026-11-05' } })],
      headcount: 4,
      now: NOW,
    })
    const item = w.items.find(i => i.kind === 'follow_up_due')
    assert.ok(item)
    assert.equal(item.group, 'fortnight')
    assert.equal(item.because, 'That is 6 days away.')
  })

  test('a follow-up beyond the fortnight is not surfaced yet', () => {
    const w = buildWorklist({
      employees: [sarah],
      events: [ev({ id: 'fn-1', employee_id: 'a', event_type: 'file_note', metadata: { follow_up_date: '2026-12-25' } })],
      headcount: 4,
      now: NOW,
    })
    assert.equal(w.items.filter(i => i.kind === 'follow_up_due').length, 0)
  })

  test('a very old follow-up ages out rather than becoming wallpaper', () => {
    const w = buildWorklist({
      employees: [sarah],
      events: [ev({ id: 'fn-1', employee_id: 'a', event_type: 'file_note', metadata: { follow_up_date: '2025-01-01' } })],
      headcount: 4,
      now: NOW,
    })
    assert.equal(w.items.filter(i => i.kind === 'follow_up_due').length, 0)
  })

  test('garbage in the jsonb blob degrades to zero items, never a throw', () => {
    const junk: unknown[] = [
      null, undefined, '', 'tomorrow', '20/10/2026', '2026-10-20T00:00:00Z',
      '2026-13-01', '2026-02-31', 0, 1761782400000, {}, [], true, 'YYYY-MM-DD',
    ]
    for (const value of junk) {
      const w = buildWorklist({
        employees: [sarah],
        events: [ev({ id: 'fn-1', employee_id: 'a', event_type: 'file_note', metadata: { follow_up_date: value } })],
        headcount: 4,
        now: NOW,
      })
      assert.equal(
        w.items.filter(i => i.kind === 'follow_up_due').length, 0,
        `follow_up_date ${JSON.stringify(value)} should produce no item`,
      )
    }
  })

  test('asDateOnly only accepts a real calendar YYYY-MM-DD', () => {
    assert.equal(asDateOnly('2026-10-20'), '2026-10-20')
    assert.equal(asDateOnly('2026-02-29'), null)   // 2026 is not a leap year
    assert.equal(asDateOnly('2024-02-29'), '2024-02-29')
    assert.equal(asDateOnly('2026-2-9'), null)
    assert.equal(asDateOnly(20261020 as never), null)
  })
})

// --- the headcount rule (s6.6) ---------------------------------------------

describe('scoped admins and the headcount leak', () => {
  // business_headcount() is SECURITY DEFINER: it returns 30 for the whole
  // business while this caller can only see four people. The number may be
  // used for date maths and must never reach the page.
  const visible = [
    emp({ id: 'a', start_date: '2026-06-01', first_name: 'Ada', award_confirmed: false }),
    emp({ id: 'b', start_date: '2026-07-01', first_name: 'Ben', award_confirmed: false }),
    emp({ id: 'c', start_date: '2026-08-01', first_name: 'Cal', award_confirmed: true }),
    emp({ id: 'd', start_date: '2026-09-01', first_name: 'Dee', award_confirmed: true }),
  ]

  test('the whole-business headcount never appears in any visible string', () => {
    const w = buildWorklist({ employees: visible, events: [], headcount: 30, now: NOW })
    const text = visibleText(w.items)
    assert.doesNotMatch(text, /\b30\b/, `headcount leaked into: ${text}`)
  })

  test('visible counts come from the rows the caller could read', () => {
    const w = buildWorklist({ employees: visible, events: [], headcount: 30, now: NOW })
    const award = w.items.find(i => i.kind === 'award_unconfirmed')
    assert.ok(award)
    assert.match(award.fact, /^2 of your team do not have a confirmed award/)
    assert.equal(w.counts.total, w.items.length)
    assert.equal(w.counts.attention + w.counts.upcoming, w.items.length)
  })

  test('headcount still drives the minimum employment period date', () => {
    // Under 15 staff the period is 12 months; at 15+ it is 6. Same employee,
    // different headcount, different date - which is why the RPC is needed
    // even though its value is never shown.
    const one = [emp({ id: 'a', start_date: '2026-05-01' })]
    const small = buildWorklist({ employees: one, events: [], headcount: 4, now: NOW })
    const large = buildWorklist({ employees: one, events: [], headcount: 30, now: NOW })
    const smallItem = small.items.find(i => i.kind === 'minimum_period')
    const largeItem = large.items.find(i => i.kind === 'minimum_period')
    // 12 months from 1 May 2026 is 1 May 2027 - past the 120-day window.
    assert.equal(smallItem, undefined)
    // 6 months from the same start date is 1 November 2026 - two days out.
    assert.ok(largeItem, 'the 15+ period lands inside the window')
    assert.equal(largeItem.dueOn, '2026-11-01')
    assert.equal(largeItem.urgency, 'now')
    assert.equal(largeItem.group, 'fortnight')
    assert.doesNotMatch(`${largeItem.fact} ${largeItem.because}`, /\b30\b/)
  })

  test('an event about someone outside the caller scope produces nothing', () => {
    const w = buildWorklist({
      employees: visible,
      events: [ev({
        id: 'fn-x',
        employee_id: 'not-visible',
        event_type: 'file_note',
        metadata: { follow_up_date: '2026-10-01', topic: 'a matter about someone else' },
      })],
      headcount: 30,
      now: NOW,
    })
    assert.equal(w.items.filter(i => i.kind === 'follow_up_due').length, 0)
    assert.doesNotMatch(visibleText(w.items), /someone else/)
  })
})

// --- record gaps -----------------------------------------------------------

describe('record gaps', () => {
  test('a day-one hire is not nagged about commencement paperwork', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-10-29' })],
      events: [],
      headcount: 4,
      now: NOW,
    })
    assert.equal(w.items.filter(i => i.kind === 'record_gap').length, 0)
  })

  test('gaps appear once someone is past the grace window', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-06-01' })],
      events: [],
      headcount: 4,
      now: NOW,
    })
    const gaps = w.items.filter(i => i.kind === 'record_gap')
    assert.ok(gaps.length > 0)
    assert.equal(gaps[0].group, 'overdue')   // due on commencement
    assert.match(gaps[0].fact, /started on 1 June 2026/)
    assert.equal(gaps[0].dueOn, '2026-06-01')
  })

  test('one thin record cannot flood the list', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-06-01' })],
      events: [],
      headcount: 4,
      now: NOW,
    })
    assert.ok(w.items.filter(i => i.kind === 'record_gap').length <= 2)
  })

  test('an item satisfied on the trail stops being a gap', () => {
    const base = { employees: [emp({ id: 'a', start_date: '2026-06-01' })], headcount: 4, now: NOW }
    const keys = (w: ReturnType<typeof buildWorklist>) =>
      w.items.filter(i => i.kind === 'record_gap').map(i => i.key)

    assert.deepEqual(keys(buildWorklist({ ...base, events: [] })), ['gap:a:contract'])
    // Satisfy the four commencement items; only the probation review is left.
    const after = buildWorklist({
      ...base,
      events: [
        ev({ id: '1', employee_id: 'a', event_type: 'contract_issued' }),
        ev({ id: '2', employee_id: 'a', event_type: 'fwis_provided' }),
        ev({ id: '3', employee_id: 'a', event_type: 'right_to_work_check' }),
        ev({ id: '4', employee_id: 'a', event_type: 'super_choice' }),
      ],
    })
    assert.deepEqual(keys(after), ['gap:a:probation_review'])
    // A probation review is due by the end of the minimum employment period,
    // not on commencement, so it is not filed under Overdue.
    const probation = after.items.find(i => i.key === 'gap:a:probation_review')
    assert.equal(probation?.dueOn, '2027-06-01')
  })

  test('a document on the record counts as evidence, same as an event', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-06-01' })],
      events: [ev({
        id: '1', employee_id: 'a', event_type: 'document_linked',
        metadata: { doc_type: 'employment-contract' },
      })],
      headcount: 4,
      now: NOW,
    })
    const gapKeys = w.items.filter(i => i.kind === 'record_gap').map(i => i.key)
    assert.ok(!gapKeys.includes('gap:a:contract'), 'a linked contract satisfies the contract item')
  })

  test('the gap copy reads as a sentence, not a reversed checklist label', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-06-01', first_name: 'Tom', last_name: 'Ellis' })],
      events: [ev({ id: '1', employee_id: 'a', event_type: 'contract_issued' })],
      headcount: 4,
      now: NOW,
    })
    const gap = w.items.find(i => i.kind === 'record_gap')
    assert.ok(gap)
    assert.equal(
      gap.fact,
      'Tom Ellis started on 1 June 2026. Their record does not show the Fair Work Information Statement.',
    )
  })
})

// --- date-driven items -----------------------------------------------------

describe('date-driven items', () => {
  test('a casual past 6 months and past 12 months key differently', () => {
    const six = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-02-01', employment_type: 'casual' })],
      events: [], headcount: 4, now: NOW,
    }).items.find(i => i.kind === 'casual_tenure')
    const twelve = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2025-02-01', employment_type: 'casual' })],
      events: [], headcount: 4, now: NOW,
    }).items.find(i => i.kind === 'casual_tenure')
    assert.equal(six?.key, 'casual:a:6')
    assert.equal(six?.urgency, 'soon')
    assert.equal(twelve?.key, 'casual:a:12')
    assert.equal(twelve?.urgency, 'now')
    assert.deepEqual(twelve?.action, { type: 'ask_advisor', prompt: 'How does casual conversion work?' })
  })

  test('a fixed-term end inside 60 days is surfaced, beyond it is not', () => {
    const near = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-01-01', employment_type: 'fixed_term', fixed_term_end: '2026-11-20' })],
      events: [], headcount: 4, now: NOW,
    }).items.find(i => i.kind === 'fixed_term_ending')
    const far = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-01-01', employment_type: 'fixed_term', fixed_term_end: '2027-06-01' })],
      events: [], headcount: 4, now: NOW,
    }).items.find(i => i.kind === 'fixed_term_ending')
    assert.ok(near)
    assert.match(near.fact, /20 November 2026/)
    assert.equal(far, undefined)
  })

  test('a bad fixed_term_end is ignored rather than thrown on', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-01-01', employment_type: 'fixed_term', fixed_term_end: 'not a date' })],
      events: [], headcount: 4, now: NOW,
    })
    assert.equal(w.items.filter(i => i.kind === 'fixed_term_ending').length, 0)
  })

  test('contractors are left out of the award and minimum-period items', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-05-01', employment_type: 'contractor', award_confirmed: false })],
      events: [], headcount: 4, now: NOW,
    })
    assert.equal(w.items.filter(i => i.kind === 'award_unconfirmed').length, 0)
    assert.equal(w.items.filter(i => i.kind === 'minimum_period').length, 0)
  })
})

// --- clearing items, append-only (s3.3) ------------------------------------

describe('done, dismissed and snoozed', () => {
  // 12 months from 1 January 2026 is 1 January 2027, inside the 120-day
  // window at NOW, so there is a minimum_period item to clear.
  const people = [emp({ id: 'a', start_date: '2026-01-01', award_confirmed: false })]

  function keyFor(kind: string) {
    const w = buildWorklist({ employees: people, events: [], headcount: 4, now: NOW })
    const item = w.items.find(i => i.kind === kind)
    assert.ok(item, `expected a ${kind} item to clear`)
    return item.key
  }

  test('a dismissal removes the item and it stays gone', () => {
    const key = keyFor('minimum_period')
    const w = buildWorklist({
      employees: people,
      events: [ev({ id: 'd1', event_type: WORKLIST_DISMISSED_EVENT, employee_id: 'a', metadata: { item_key: key } })],
      headcount: 4, now: NOW,
    })
    assert.equal(w.items.some(i => i.key === key), false)
  })

  test('marking done removes the item', () => {
    const key = keyFor('award_unconfirmed')
    const w = buildWorklist({
      employees: people,
      events: [ev({ id: 'd1', event_type: WORKLIST_DONE_EVENT, metadata: { item_key: key } })],
      headcount: 4, now: NOW,
    })
    assert.equal(w.items.some(i => i.key === key), false)
  })

  test('a snooze hides the item until its date, then it comes back', () => {
    const key = keyFor('minimum_period')
    const events = [ev({
      id: 'd1',
      event_type: WORKLIST_DISMISSED_EVENT,
      employee_id: 'a',
      occurred_at: '2026-10-30T09:00:00Z',
      metadata: { item_key: key, snooze_until: '2026-11-13' },
    })]
    const during = buildWorklist({ employees: people, events, headcount: 4, now: NOW })
    assert.equal(during.items.some(i => i.key === key), false)
    const after = buildWorklist({ employees: people, events, headcount: 4, now: new Date('2026-11-14T09:00:00') })
    assert.equal(after.items.some(i => i.key === key), true, 'an elapsed snooze must resurface the item')
  })

  test('undo is a newer reversing event, not an edit', () => {
    const key = keyFor('minimum_period')
    const suppressed = suppressedKeys([
      ev({ id: '1', event_type: WORKLIST_DISMISSED_EVENT, occurred_at: '2026-10-01T00:00:00Z', metadata: { item_key: key } }),
      ev({ id: '2', event_type: WORKLIST_DISMISSED_EVENT, occurred_at: '2026-10-20T00:00:00Z', metadata: { item_key: key, snooze_until: '2026-10-25' } }),
    ], NOW)
    // The later event carries an elapsed snooze, so the item is live again
    // even though an outright dismissal is still on the trail.
    assert.equal(suppressed.has(key), false)
  })

  test('a clearing event with no item_key is ignored', () => {
    const suppressed = suppressedKeys([
      ev({ id: '1', event_type: WORKLIST_DISMISSED_EVENT, metadata: {} }),
      ev({ id: '2', event_type: WORKLIST_DONE_EVENT, metadata: { item_key: 42 } }),
    ], NOW)
    assert.equal(suppressed.size, 0)
  })

  test('a file note is not a clearing event', () => {
    const suppressed = suppressedKeys([
      ev({ id: '1', event_type: 'file_note', metadata: { item_key: 'min_period:a' } }),
    ], NOW)
    assert.equal(suppressed.size, 0)
  })
})

// --- ordering and shape ----------------------------------------------------

describe('ordering and shape', () => {
  test('overdue before this fortnight before coming up', () => {
    const w = buildWorklist({
      employees: [
        emp({ id: 'a', start_date: '2026-05-01', first_name: 'Ada', award_confirmed: false }),
        emp({ id: 'b', start_date: '2025-02-01', first_name: 'Ben', employment_type: 'casual' }),
      ],
      events: [ev({ id: 'fn', employee_id: 'a', event_type: 'file_note', metadata: { follow_up_date: '2026-10-02' } })],
      headcount: 4,
      now: NOW,
    })
    const groups = w.items.map(i => i.group)
    const rank = { overdue: 0, fortnight: 1, later: 2 }
    for (let i = 1; i < groups.length; i++) {
      assert.ok(rank[groups[i]] >= rank[groups[i - 1]], `out of order at ${i}: ${groups.join(',')}`)
    }
  })

  test('every item carries a fact, a because and a resolvable action', () => {
    const w = buildWorklist({
      employees: [
        emp({ id: 'a', start_date: '2026-05-01', award_confirmed: false }),
        emp({ id: 'b', start_date: '2025-02-01', first_name: 'Ben', employment_type: 'casual' }),
        emp({ id: 'c', start_date: '2026-01-01', first_name: 'Cal', employment_type: 'fixed_term', fixed_term_end: '2026-11-15' }),
      ],
      events: [ev({ id: 'fn', employee_id: 'a', event_type: 'file_note', metadata: { follow_up_date: '2026-10-02' } })],
      headcount: 4,
      now: NOW,
    })
    assert.ok(w.items.length > 0)
    for (const i of w.items) {
      assert.ok(i.key.length > 0, 'key')
      assert.ok(i.fact.trim().length > 0, `fact on ${i.key}`)
      assert.ok(i.because.trim().length > 0, `because on ${i.key}`)
      assert.ok(i.action && typeof i.action.type === 'string', `action on ${i.key}`)
      assert.ok(['overdue', 'fortnight', 'later'].includes(i.group), `group on ${i.key}`)
    }
    // Keys are unique, or done/dismiss would clear more than one row.
    assert.equal(new Set(w.items.map(i => i.key)).size, w.items.length)
  })

  test('no em or en dashes anywhere in the copy', () => {
    const w = buildWorklist({
      employees: [emp({ id: 'a', start_date: '2026-05-01', award_confirmed: false })],
      events: [ev({ id: 'fn', employee_id: 'a', event_type: 'file_note', metadata: { follow_up_date: '2026-10-02' } })],
      headcount: 4,
      now: NOW,
    })
    assert.doesNotMatch(visibleText(w.items), /[—–]/)
  })

  test('no item tells the user what to decide', () => {
    const w = buildWorklist({
      employees: [
        emp({ id: 'a', start_date: '2026-05-01', award_confirmed: false }),
        emp({ id: 'b', start_date: '2025-02-01', first_name: 'Ben', employment_type: 'casual' }),
      ],
      events: [],
      headcount: 4,
      now: NOW,
    })
    const text = visibleText(w.items).toLowerCase()
    for (const banned of ['you should', 'you must', 'you need to dismiss', 'terminate', 'dismiss ', 'sack']) {
      assert.ok(!text.includes(banned), `copy contains "${banned}": ${text}`)
    }
  })
})
