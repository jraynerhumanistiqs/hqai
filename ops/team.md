# HQ.ai Operations Team

A 5-person AI department that runs the marketing, research, and growth side of HQ.ai. Built on the Tom Bilyeu framework: elite direction, narrow scope per agent, drafts before autopilot.

## The five roles

| Agent | One-line job | File |
|-------|--------------|------|
| Researcher | Find what Australian SME owners are actually paying to solve, in their words. | [agents/researcher.md](agents/researcher.md) |
| Strategist | Pick the smallest test that proves demand this week, then rank every offer idea by speed and likelihood. | [agents/strategist.md](agents/strategist.md) |
| Copywriter | Build copy step by step. Hook, then bullets, then page. Push back on every weak line. | [agents/copywriter.md](agents/copywriter.md) |
| Builder | Ship a one-page mobile-first site from approved copy. No animations, no 12-page funnels. | [agents/builder.md](agents/builder.md) |
| Marketer | Map a 30/60/90 plan to $5K-$10K MRR. Pick channels owner-operators actually use. Test 10 angles fast. | [agents/marketer.md](agents/marketer.md) |

## How to invoke

In a Claude Code session inside this repo, use the Agent tool with `subagent_type: general-purpose` and the contents of the relevant agent file as the prompt. Drop the specific task at the bottom.

Example:
```
Agent({
  description: "Pain-point research: hospitality NSW",
  subagent_type: "general-purpose",
  prompt: "<paste contents of ops/agents/researcher.md>\n\nTask: Pull 100+ data points from Reddit (r/AusFinance, r/smallbusiness, r/sydney), Facebook owner-operator groups, and Google reviews of competitors (Employsure, Workforce, BreatheHR) on the topic of hospitality HR/award compliance pain in NSW. Output to ops/research/2026-05-hospitality-nsw-pains.md."
})
```

For parallel work, fire all five in one message.

## Marketing baseline (as of 2026-05-05)

**Nothing is live publicly.** No LinkedIn company page, no blog, no socials, no SEO presence, no email list, no ad accounts. The only public surface is the product itself at https://hqai.vercel.app.

This means:
- The Marketer's first 30 days is foundation, not optimisation. Set up the LinkedIn company page, claim the handles, set up Resend audiences, set up Google Search Console + GBP, decide on a single owner channel for thought-leadership.
- The Researcher's first job is the language bank, because there is no organic inbound to study yet.
- The Builder's first 30 days is the lead-magnet page and the SEO landing-page template, not blog infrastructure (blog can wait until there's something worth indexing).
- The Strategist should not assume any audience. The smallest test must include the channel that gets it in front of someone.

## Cadence (autopilot)

Once the human has approved the first 4-6 weeks of drafts, these run on a schedule. Use the schedule skill to set them up.

| When | Agent | What runs |
|------|-------|-----------|
| Daily 08:00 AEST | Researcher | Scan competitor sites + Fair Work news + Reddit/FB groups for new pain signals. Output to `ops/reports/daily-YYYY-MM-DD.md`. |
| Mon 07:00 AEST | Strategist | Weekly ops brief: what's planned, what shipped, what's blocked. Output to `ops/reports/week-YYYY-WW.md`. |
| Wed 09:00 AEST | Marketer | Pull last week's channel metrics, recommend next week's angles. |
| Fri 16:00 AEST | Copywriter | Pull all draft pieces from the week, score them against the voice rubric, flag rewrites. |

Builder runs on demand only.

## Always-review vs safe-to-autopilot

Always-review (human approves before publish):
- Anything published under HQ.ai or Humanistiqs brand (blog, social, ads)
- Anything emailed to a real prospect
- Anything that costs money (paid ads, tools, vendors)
- Anything quoting Australian employment law or making compliance claims

Safe-to-autopilot once trusted:
- Internal research briefs and competitor monitoring
- Draft outlines and headline variants
- Repetitive SEO page generation behind a feature flag
- Draft DM and email replies parked in a queue

## Output structure

```
/ops
  /agents       - the 5 system prompts
  /research     - market intel, competitor briefs, ICP language banks
  /content      - blog drafts, social drafts, email drafts
  /campaigns    - per-campaign brief + creative + tracking
  /pages        - landing page copy + JSON-LD + design briefs
  /outreach     - LinkedIn templates, email sequences
  /reports      - daily and weekly digests
  /assets       - images, exports, PDFs
  brand-voice.md - voice rubric every agent reads first
  team.md       - this file
```

## Scope guardrails

In scope:
- Content production: employment law explainers, "how to handle X" guides, case studies
- SEO landing pages: per-industry, per-state, per-pain-point
- Lead generation: gated downloads, free compliance checks, free award classification tool
- Outreach: LinkedIn and email
- Product marketing pages: per-feature deep-dives
- Social proof: case studies, testimonials, before/after metrics
- Sales enablement: one-pagers, demo scripts, objection handling
- Event/community content if a webinar/podcast track gets greenlit

Out of scope (do not touch):
- `app/dashboard/**` (the authenticated product)
- Eval harness, RAG corpus, Supabase migrations, RLS policies
- Anything touching customer PII or live audit data
- The client dashboard (built separately)

## Working rules every agent must follow

1. Plain hyphens only in all output. Never em-dashes or en-dashes. Code comments are exempt.
2. First-person AI voice ("I'll do X", not "the system will do X").
3. Australian English spelling. Australian context. Australian employment law only.
4. No corporate fluff. Plain English. Warm but not chummy.
5. Cite sources for any legal or compliance claim. Link to FWO, Fair Work Act, or the relevant Modern Award.
6. Read [brand-voice.md](brand-voice.md) before producing any customer-facing copy.
