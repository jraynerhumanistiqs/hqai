# DRAFT - "Our AI Accuracy Standard" page (A7)

Status: FOUNDER REVIEW REQUIRED - do not build or publish until Jimmy signs off.
Proposed route: /ai-standard (or /accuracy - founder to pick)
Author: ops swarm, 14 July 2026
Voice: plain Finito-style layman wording. No legal-advice positioning anywhere.

---

## Page metadata (proposed)

- Title: Our AI Accuracy Standard - how HQ.ai keeps its answers honest
- Description: How HQ.ai grounds its answers in Australian workplace law sources, keeps them current, and hands the hard calls to a real person. Plain English, no fine print.

---

## Hero

Eyebrow: Our AI Accuracy Standard

# An AI you can trust is an AI that shows its working.

Plenty of AI tools will give you a confident answer about managing people. Confidence is easy.
Being right, staying current, and knowing when to hand you to a human - that's the hard part.
This page explains how we do it.

---

## Section 1 - Where the answers come from

Heading: Grounded in Australian sources, not the whole internet.

HQ.ai isn't a general chatbot with an HR costume on. Its answers are grounded in Australian
workplace law sources - the Fair Work Act, the National Employment Standards and the modern
awards system - along with the practical HR know-how our Humanistiqs directors have built up
over 80+ years combined.

That grounding is the boundary, not just the starting point. The AI works inside Australian
workplace rules and nothing else. No US templates, no UK assumptions, no generic advice
translated for an Australian audience.

[FOUNDER: confirm we're comfortable naming Fair Work Act / NES / modern awards here. This is
the approved "grounded in" scope framing, not a claim that the AI cites or interprets law -
but worth a read with fresh eyes.]

---

## Section 2 - How we keep it current

Heading: Workplace rules change. So do we.

Australian workplace rules move constantly - award rates change every July, and the 2024-26
reforms have shifted the ground under small business more than once. An answer that was right
last year can be wrong today.

So keeping HQ.ai current is a standing job, not a one-off:

- We review and update the AI's grounding when significant workplace changes land, including
  the annual wage review each July.
- We're building deeper coverage of the 2024-26 reforms right now - it's on our public
  roadmap, not hidden in a backlog.
- When something changes that affects documents you've already created, our aim is to tell
  you, not leave you to find out the hard way.

[FOUNDER: the third bullet is an intent statement, not a shipped feature. Keep, soften, or
cut - your call. Also confirm the described update cadence matches what we actually do.]

---

## Section 3 - When a human takes over

Heading: The AI knows what it shouldn't handle.

Some situations are too important for any AI to handle alone - things like dismissals,
redundancies, serious complaints, bullying claims, or anything heading towards a dispute.

HQ.ai is built to recognise those moments and say so. Instead of bluffing through a hard
question, it tells you this one needs a person, and points you to our team. On HR365 and
Recruit365, that's your dedicated Humanistiqs advisor - the same human every time, already
across your business.

That honesty is the standard we hold the AI to: a tool that knows its limits beats a tool
that pretends it has none.

---

## Section 4 - What the AI does NOT do

Heading: Let's be straight about the limits.

- It does not give legal advice. HQ.ai is not a law firm and its answers are not a
  substitute for advice from a qualified professional about your specific situation.
- It does not make decisions for you. It prepares the documents, drafts the letters and
  answers the everyday questions - the judgement calls stay with you.
- It does not guess quietly. When it's not confident, it says so and brings in a human,
  rather than dressing up a guess as an answer.
- It does not work outside Australia. Built for Australian workplaces only. If you need
  overseas HR answers, we're honestly not your tool.

---

## Section 5 - Holding ourselves to it

Heading: We're building the scorecard, and we'll show you.

A standard you can't measure is just marketing. We're building an accuracy audit process -
regularly testing the AI's answers against what our human HR advisors would say, and using
what we find to make it better.

Our intent is to publish what we can from that process, so you're not just taking our word
for it. It's on the roadmap as the accuracy audit dashboard.

[FOUNDER: this promises future transparency, not current numbers. Confirm you're happy to
commit publicly to publishing audit results before this ships. If not, cut the second
paragraph and keep the first.]

---

## Closing / CTA

Heading: Questions about how it works?

Ask us. We'd rather explain it properly than hide behind fine print.

Buttons: [Talk to us -> /contact] (filled clay) - [See the roadmap -> /roadmap] (ghost)

---

## Build notes (for whoever implements after sign-off)

- MarketingHeader + MarketingFooter, dark marketing tokens, py-14 md:py-20 rhythm.
- Section 4 works well as a 2x2 card grid (rounded-2xl, border-border, bg-bg-soft).
- One filled clay CTA max per section - the closing CTA is the only filled button.
- Plain hyphens only, ASCII apostrophes, Australian English.
- Once live, link it from the footer (Company or Resources) and consider linking from
  the pricing page FAQ.
