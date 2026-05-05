# Ops Team Runbook

How to actually use the team in a Claude Code session inside this repo.

## Single agent, single task

Open Claude Code in `hqai/`. Run:

```
Agent({
  description: "<short task name>",
  subagent_type: "general-purpose",
  prompt: "Read ops/agents/<role>.md and follow it as your full system prompt.\n\nTask: <the specific task>\n\nWrite output to: <ops/.../path.md>"
})
```

Replace `<role>` with one of: `researcher`, `strategist`, `copywriter`, `builder`, `marketer`.

## Five agents, parallel kickoff (full campaign)

Send one Claude Code message with five Agent calls. Order matters only for dependencies (Researcher first, then the rest can fan out once the brief lands).

Pattern:

1. Spawn Researcher. Wait for the brief.
2. Spawn Strategist (reads Researcher brief), Copywriter (waits for Strategist bet), Marketer (waits for Strategist bet) in parallel once Strategist lands.
3. Spawn Builder once Copywriter copy is approved.

## Worked example: launch a free Modern Award classifier

```
Step 1 - Researcher (single message)
Agent({
  description: "Award classification pain - hospitality NSW",
  subagent_type: "general-purpose",
  prompt: "Read ops/agents/researcher.md as your system prompt.\n\nTask: Pull 100+ data points from Reddit (r/AusFinance, r/smallbusiness, r/sydney), Australian hospitality owner Facebook groups, Google reviews of Employsure / BreatheHR / Workforce, and ProductReview.com.au. Topic: pain around classifying hospitality staff under the Hospitality Industry (General) Award MA000009. Focus on NSW. Output to ops/research/2026-05-hospitality-nsw-award-classification.md."
})

Step 2 - Strategist
Agent({
  description: "Strategy: free award classifier",
  subagent_type: "general-purpose",
  prompt: "Read ops/agents/strategist.md as your system prompt.\n\nTask: Based on ops/research/2026-05-hospitality-nsw-award-classification.md, design a free 60-second Modern Award classifier as the lead magnet. Smallest test this week. Output to ops/campaigns/2026-05-award-classifier/strategy.md."
})

Step 3 - Copywriter + Marketer (parallel)
Agent({ description: "Copy: award classifier landing page", ... })
Agent({ description: "Marketing plan: award classifier launch", ... })

Step 4 - Builder (after copy approved)
Agent({ description: "Build: award classifier landing page", ... })
```

## Autopilot scheduling

Once 4-6 weeks of human-in-the-loop builds trust, schedule the recurring runs with the schedule skill:

- Daily 08:00 AEST: Researcher daily scan
- Mon 07:00 AEST: Strategist weekly brief
- Wed 09:00 AEST: Marketer channel review
- Fri 16:00 AEST: Copywriter voice-rubric audit

See `ops/team.md` for the cadence table.

## Quality gates before publish

For anything customer-facing:
1. Brand-voice.md rubric pass (no banned words, plain hyphens, 5-second test passes)
2. Compliance citation check (every legal claim sourced)
3. Australian English check
4. Human approval recorded as a `## Approved by` line at the top of the file

For anything that goes live on hqai.vercel.app:
- All of the above plus a Lighthouse mobile run (Builder ships with scores in the handoff)
- Confirm route doesn't collide with `app/dashboard/**` or any product surface
