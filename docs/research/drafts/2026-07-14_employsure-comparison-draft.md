# DRAFT - "Why businesses switch to HQ.ai" comparison page (B16)

Status: FOUNDER REVIEW REQUIRED - do not build or publish until Jimmy signs off.
Proposed route: /compare (or /switch - founder to pick)
Author: ops swarm, 14 July 2026
Voice: plain Finito-style layman wording. Comparison, not attack.

STRICT RULES APPLIED IN THIS DRAFT
- Only claims about HQ.ai that are true today are stated as fact.
- Every claim about a competitor is either (a) a general statement about the traditional
  outsourced-HR model, or (b) flagged [FOUNDER: verify before publish].
- No named-competitor claim should go live without a source we can point to (their own
  published terms, their own website, or a public record).
- No disparagement, no penalty/regulator references unless the founder verifies the public
  record and decides the risk is worth it.

---

## Page metadata (proposed)

- Title: Why businesses switch to HQ.ai - HR support without the lock-in
- Description: Comparing HQ.ai with traditional outsourced HR providers: contract length, wait times, pricing transparency and how fast you can get started.

---

## Hero

Eyebrow: Compare

# HR support shouldn't need a long contract and a call queue.

Traditional outsourced HR providers built their model in a different era: multi-year
agreements, phone-based advice, pricing you only learn on a sales call. HQ.ai was built to be
the opposite - self-serve, month-to-month, priced in the open. Here's the honest comparison.

[FOUNDER: decide whether this page names Employsure/Peninsula directly or stays at "traditional
outsourced HR providers". Naming is stronger for SEO ("Employsure alternative") but every named
claim then needs a verifiable source. The draft below is written to work either way - the
named references are all flagged.]

---

## Section 1 - The comparison table

Heading: Side by side.

| | Traditional outsourced HR | HQ.ai |
|---|---|---|
| Contract | Typically a multi-year agreement [FOUNDER: verify - commonly reported for Employsure/Peninsula; source their published terms before naming anyone] | Month-to-month, cancel any time |
| Getting started | Sales call, consultation, onboarding | Sign up and start in minutes |
| Everyday answers | Phone an advice line and wait your turn | Ask the AI, answer in seconds, any hour |
| Documents | Requested through your provider | 33 templates ready in your library, generated on the spot |
| Pricing | Quoted on a sales call [FOUNDER: verify that the named competitor does not publish standard pricing at time of publish - check their site the same week this goes live] | Published on our pricing page, from $59/mo |
| The hard calls | Depends on your plan and who picks up | A real Humanistiqs advisor - on HR365, the same person every time |
| Hiring tools | Often separate or not included [FOUNDER: verify per named competitor] | HQ Recruit built in or standalone from $65/mo |

All HQ.ai claims in this table are current as at July 2026 and match lib/pricing-config.ts.

---

## Section 2 - Contract length and lock-in

Heading: No lock-in. We have to earn your next month.

The traditional model asks you to commit for years before you know if the service fits.
We think that's backwards. HQ.ai is month-to-month on every self-serve plan: if we stop being
useful, you stop paying. That keeps the pressure exactly where it belongs - on us.

[FOUNDER: if naming Employsure, any specific contract-length figure (e.g. "up to 5 years")
must be sourced from their current published terms or removed. Do not rely on old reviews or
forum posts.]

---

## Section 3 - Speed

Heading: Seconds, not hold music.

When a staffing question lands, you want an answer while the problem is in front of you - not
after a callback. HQ.ai answers everyday questions in seconds, at 6am before open or 11pm
after close. And when a question is genuinely hard, it says so and brings in our human team
rather than bluffing.

(Claim check: "answers in seconds" is a product claim about our own chat response time -
defensible. No claim is made here about any competitor's actual wait times, only that
phone-based advice lines involve waiting for a person, which is inherent to the model.)

---

## Section 4 - Pricing transparency

Heading: Our prices are on the website. That's the whole trick.

HQ People from $59/mo. HQ Recruit from $65/mo. HQ Business from $89/mo. HR365 with a
dedicated advisor at $799/mo. It's all on the pricing page, and the price you see is the
price you pay - unlimited logins, no per-seat charges, no surprise extras.

If a provider will only tell you the price on a sales call, ask yourself why.

[FOUNDER: the closing line is pointed but not a factual claim about anyone. Keep or soften -
your call.]

---

## Section 5 - Where the traditional model is genuinely strong

Heading: To be fair.

An honest comparison cuts both ways. If you want someone else to handle everything end to end
and you're comfortable with the commitment that comes with it, a full-service provider can be
the right fit. And parts of what they offer - like insurance-backed products - are things we
don't sell.

That's why we built HR365 and Recruit365: the same done-for-you feel, a dedicated advisor who
knows your business, without the multi-year handcuffs.

[FOUNDER: confirm the insurance point - Employsure has marketed an insurance product
alongside its advice service. Verify current offering before publish, or cut the example and
keep the paragraph generic.]

---

## Section 6 - What we deliberately left out of this page

For the founder, not for publication:

- Any reference to regulatory action or penalties involving Employsure (e.g. the ACCC
  proceedings over its Google ads). There is a public record, but leading with a competitor's
  penalties reads as attack, invites a legal review of every word, and is off-voice.
  [FOUNDER: verify before publish if you ever want to use it - and get advice first.]
- Third-party review scores (ProductReview, Trustpilot, Google). Cherry-picking scores is
  easy to challenge and they move. If used, they need a date-stamped screenshot and a
  "as at [date]" label.
- Any claim about competitor advisor headcount, response-time stats, or churn. Not
  verifiable from public sources.

---

## Closing / CTA

Heading: Try the other model.

No sales call, no contract, no risk. Sign up, use it for a month, and judge us on whether we
made your week lighter.

Buttons: [Get started -> /signup] (filled clay) - [See pricing -> /pricing] (ghost)

---

## Build notes (for whoever implements after sign-off)

- MarketingHeader + MarketingFooter, dark marketing tokens, py-14 md:py-20 rhythm.
- Table renders as a rounded-2xl bordered card; stack to per-row cards on mobile.
- One filled clay CTA max per section - the closing CTA is the only filled button.
- Plain hyphens only, ASCII apostrophes, Australian English.
- Re-verify every [FOUNDER: verify before publish] item in the SAME WEEK the page ships -
  competitor terms and pricing pages change.
