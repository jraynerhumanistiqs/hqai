// scripts/build-pricing-director-deck.mjs
//
// Generates docs/research/HQai_Pricing_Director_Review.pptx from the
// latest pricing facts. Source docs:
//   - docs/research/retention-and-monetisation-brief.md (Solo/Business
//     + Foundation 100)
//   - docs/research/enterprise-tier-strategy.md (Enterprise variants,
//     capacity model, year-1 ARR)
//   - docs/research/enterprise-tier-director-summary.md (one-pager
//     framing for directors)
//   - docs/research/enterprise-sliding-scale-analysis.md (multiplier
//     schedule and worked examples)
//
// Brand palette (matches the HQ.ai premium-minimal kit):
//   bg:        FFFFFF
//   bg-soft:   F7F7F2
//   ink:       111111
//   ink-soft:  4D4D4D
//   ink-muted: 9A9A99
//   border:    E6E5E0
//   accent (clay): D97757
//   accent-soft:   F5E5DD

import pptxgen from 'pptxgenjs'

const OUT = 'docs/research/HQai_Pricing_Director_Review.pptx'

// Palette
const C = {
  bg:        'FFFFFF',
  bgSoft:    'F7F7F2',
  ink:       '111111',
  inkSoft:   '4D4D4D',
  inkMuted:  '9A9A99',
  border:    'E6E5E0',
  accent:    'D97757',
  accentSoft:'F5E5DD',
}

// Typography
const F = { sans: 'Calibri', serif: 'Georgia' }

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9'  // 10" x 5.625"
pres.author = 'Jimmy Rayner'
pres.title  = 'HQ.ai Pricing - Director Review (May 2026)'
pres.subject = 'Director review of HQ.ai pricing v2 + Enterprise tier'

// ---------- helpers ----------

// Standard footer for every content slide.
function footer(slide, pageNum, total) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.4, w: 10, h: 0.225, fill: { color: C.bgSoft }, line: { type: 'none' },
  })
  slide.addText('HQ.ai Pricing - Director Review - May 2026', {
    x: 0.5, y: 5.4, w: 6, h: 0.225,
    fontFace: F.sans, fontSize: 9, color: C.inkMuted, align: 'left', valign: 'middle',
    margin: 0,
  })
  slide.addText(`${pageNum} / ${total}`, {
    x: 8.5, y: 5.4, w: 1, h: 0.225,
    fontFace: F.sans, fontSize: 9, color: C.inkMuted, align: 'right', valign: 'middle',
    margin: 0,
  })
}

// Eyebrow + title block at the top of a content slide.
function header(slide, eyebrow, title) {
  // Clay accent square (the visual motif we commit to repeating).
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.45, w: 0.18, h: 0.18,
    fill: { color: C.accent }, line: { type: 'none' },
  })
  slide.addText(eyebrow, {
    x: 0.8, y: 0.42, w: 8, h: 0.25,
    fontFace: F.sans, fontSize: 10, color: C.accent, bold: true, charSpacing: 2,
    align: 'left', valign: 'middle', margin: 0,
  })
  slide.addText(title, {
    x: 0.5, y: 0.78, w: 9, h: 0.65,
    fontFace: F.sans, fontSize: 28, color: C.ink, bold: true,
    align: 'left', valign: 'middle', margin: 0,
  })
  // Hairline under header
  slide.addShape(pres.shapes.LINE, {
    x: 0.5, y: 1.45, w: 9, h: 0,
    line: { color: C.border, width: 0.75 },
  })
}

// ---------- slide 1: cover ----------

const totalSlides = 12

;(function coverSlide() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }

  // Big clay block on the right - the visual motif at full strength.
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 7.2, y: 0, w: 2.8, h: 5.625,
    fill: { color: C.accent }, line: { type: 'none' },
  })

  // Logo placement (no logo asset assumed; render the wordmark in type).
  slide.addText('HQ.ai', {
    x: 0.5, y: 0.45, w: 3, h: 0.5,
    fontFace: F.sans, fontSize: 22, color: C.ink, bold: true, charSpacing: 1,
    align: 'left', valign: 'middle', margin: 0,
  })

  // Subline: Humanistiqs ribbon
  slide.addText('a Humanistiqs product', {
    x: 0.5, y: 0.92, w: 3, h: 0.22,
    fontFace: F.sans, fontSize: 10, color: C.inkMuted, charSpacing: 1,
    align: 'left', valign: 'middle', margin: 0,
  })

  // Title block
  slide.addText('Pricing v2 + Enterprise', {
    x: 0.5, y: 2.0, w: 6.4, h: 0.9,
    fontFace: F.sans, fontSize: 44, color: C.ink, bold: true,
    align: 'left', valign: 'middle', margin: 0,
  })
  slide.addText('Director Review', {
    x: 0.5, y: 2.85, w: 6.4, h: 0.55,
    fontFace: F.sans, fontSize: 28, color: C.accent, bold: false,
    align: 'left', valign: 'middle', margin: 0,
  })

  slide.addText('A consolidated view of the May 2026 pricing rebuild: Solo and Business tiers, Foundation 100 offer, the Enterprise tier, and the sliding-scale multipliers that flex Enterprise on real cost-to-serve drivers.', {
    x: 0.5, y: 3.5, w: 6.4, h: 0.95,
    fontFace: F.sans, fontSize: 13, color: C.inkSoft,
    align: 'left', valign: 'top', margin: 0,
    paraSpaceAfter: 4,
  })

  slide.addText('Author: Jimmy Rayner   |   For: Humanistiqs Directors   |   May 2026', {
    x: 0.5, y: 5.05, w: 6.4, h: 0.25,
    fontFace: F.sans, fontSize: 10, color: C.inkMuted, charSpacing: 1,
    align: 'left', valign: 'middle', margin: 0,
  })

  // Vertical accent dotline on the right block
  slide.addText('AI + HQ', {
    x: 7.4, y: 2.4, w: 2.4, h: 0.45,
    fontFace: F.serif, fontSize: 22, italic: true, color: 'FFFFFF',
    align: 'left', valign: 'middle', margin: 0,
  })
  slide.addText('Human Intelligence + Judgement', {
    x: 7.4, y: 2.85, w: 2.4, h: 0.3,
    fontFace: F.sans, fontSize: 11, color: 'FFFFFF', charSpacing: 1,
    align: 'left', valign: 'middle', margin: 0,
  })
})()

// ---------- slide 2: executive summary ----------

;(function execSummary() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '01  EXECUTIVE SUMMARY', "What's changed since the last brief")

  // Three column callouts
  const cols = [
    { x: 0.5, h: 'Pricing v2 shipped', b: 'Solo $89, Business $249 replaced the old $99/$199/$379 trio. Foundation 100 locks Business at $179/mo for life on a 12-month commit, capped at 100 customers.' },
    { x: 3.65, h: 'Enterprise launched', b: 'Three SKUs at $1,495 / $2,995 / $3,995 per month annual-equivalent. Annual contract or month-to-month at a ~17% premium with 30 days notice. Sales-assisted via /enterprise.' },
    { x: 6.8, h: 'Multipliers added', b: 'Enterprise flexes on three published, stepped dimensions: headcount band, hiring volume, entity complexity. Customer self-calculates. No quotes-per-deal.' },
  ]
  cols.forEach((c) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: 1.75, w: 2.7, h: 3.3,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    })
    slide.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: 1.75, w: 2.7, h: 0.08,
      fill: { color: C.accent }, line: { type: 'none' },
    })
    slide.addText(c.h, {
      x: c.x + 0.2, y: 1.95, w: 2.3, h: 0.5,
      fontFace: F.sans, fontSize: 16, bold: true, color: C.ink,
      align: 'left', valign: 'top', margin: 0,
    })
    slide.addText(c.b, {
      x: c.x + 0.2, y: 2.55, w: 2.3, h: 2.4,
      fontFace: F.sans, fontSize: 11, color: C.inkSoft,
      align: 'left', valign: 'top', margin: 0, paraSpaceAfter: 4,
    })
  })

  footer(slide, 2, totalSlides)
})()

// ---------- slide 3: pricing stack at a glance ----------

;(function pricingStack() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '02  THE STACK', 'The pricing stack at a glance')

  // 5 layers, top to bottom
  const layers = [
    { name: 'Enterprise (Full)',           price: '$3,995/mo annual or $4,495/mo monthly', detail: 'Both surfaces. One partner team.', accent: true },
    { name: 'Enterprise (Recruit)',        price: '$2,995/mo annual or $3,495/mo monthly', detail: 'Named Talent Partner. Up to 4 concurrent roles.', accent: true },
    { name: 'Enterprise (People)',         price: '$1,495/mo annual or $1,795/mo monthly', detail: 'Named Humanistiqs Advisor. 2 calls + business-day SLA.', accent: true },
    { name: 'Business',                    price: '$249/mo or $2,490/yr',                  detail: '15 seats, 2,500 credits, unlimited recruit. Most popular.', accent: false },
    { name: 'Solo',                        price: '$89/mo or $890/yr',                     detail: '3 seats, 500 credits, 1 active recruit role.', accent: false },
  ]
  const yStart = 1.75
  const rowH = 0.65
  layers.forEach((l, i) => {
    const y = yStart + i * rowH
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9, h: rowH - 0.1,
      fill: { color: l.accent ? C.bg : C.bgSoft }, line: { color: C.border, width: 0.75 },
    })
    if (l.accent) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.5, y, w: 0.08, h: rowH - 0.1,
        fill: { color: C.accent }, line: { type: 'none' },
      })
    }
    slide.addText(l.name, {
      x: 0.75, y, w: 3.0, h: rowH - 0.1,
      fontFace: F.sans, fontSize: 13, bold: true, color: C.ink,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(l.price, {
      x: 3.75, y, w: 3.0, h: rowH - 0.1,
      fontFace: F.sans, fontSize: 12, color: l.accent ? C.accent : C.inkSoft, bold: l.accent,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(l.detail, {
      x: 6.75, y, w: 2.7, h: rowH - 0.1,
      fontFace: F.sans, fontSize: 10, color: C.inkMuted,
      align: 'left', valign: 'middle', margin: 0,
    })
  })

  // Footnote
  slide.addText('Self-serve subscription on Solo + Business. Sales-assisted (founder-led discovery call) for Enterprise. One-off marketplace SKUs from $25-$49 sit alongside as no-signup utility purchases.', {
    x: 0.5, y: 5.0, w: 9, h: 0.32,
    fontFace: F.sans, fontSize: 10, italic: true, color: C.inkMuted,
    align: 'left', valign: 'middle', margin: 0,
  })

  footer(slide, 3, totalSlides)
})()

// ---------- slide 4: Solo + Business tier detail ----------

;(function soloBusinessDetail() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '03  SELF-SERVE', 'Solo and Business tiers')

  // Two cards
  const cards = [
    {
      x: 0.5, name: 'Solo', tag: 'Replace your DIY policy file', price: '$89/mo', annual: '$890/yr (saves 2 months)',
      seats: '3 seats', credits: '500 AI credits/mo', recruit: '1 active recruit role',
      docs: 'Document library (100 docs)', extra: 'Pay-as-you-go advisor escalation at $80/session',
    },
    {
      x: 5.05, name: 'Business', tag: 'Replace your $850/mo Employsure retainer', price: '$249/mo', annual: '$2,490/yr (saves 2 months)',
      seats: '15 seats', credits: '2,500 AI credits/mo', recruit: 'Unlimited recruit roles',
      docs: 'Unlimited document library', extra: 'Founder-led 30-min onboarding call. Most popular.',
      highlight: true,
    },
  ]
  cards.forEach((c) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: 1.75, w: 4.45, h: 3.3,
      fill: { color: C.bg }, line: { color: c.highlight ? C.accent : C.border, width: c.highlight ? 1.5 : 1 },
    })
    if (c.highlight) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: c.x + 3.3, y: 1.6, w: 1.15, h: 0.3,
        fill: { color: C.accent }, line: { type: 'none' },
      })
      slide.addText('MOST POPULAR', {
        x: c.x + 3.3, y: 1.6, w: 1.15, h: 0.3,
        fontFace: F.sans, fontSize: 8, color: 'FFFFFF', bold: true, charSpacing: 2,
        align: 'center', valign: 'middle', margin: 0,
      })
    }
    slide.addText(c.name, {
      x: c.x + 0.25, y: 1.9, w: 4, h: 0.45,
      fontFace: F.sans, fontSize: 22, bold: true, color: C.ink,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(c.tag, {
      x: c.x + 0.25, y: 2.32, w: 4, h: 0.3,
      fontFace: F.sans, fontSize: 11, italic: true, color: C.inkSoft,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(c.price, {
      x: c.x + 0.25, y: 2.7, w: 4, h: 0.45,
      fontFace: F.sans, fontSize: 30, bold: true, color: c.highlight ? C.accent : C.ink,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(c.annual, {
      x: c.x + 0.25, y: 3.15, w: 4, h: 0.25,
      fontFace: F.sans, fontSize: 10, color: C.inkMuted,
      align: 'left', valign: 'middle', margin: 0,
    })

    // Feature lines
    const features = [c.seats, c.credits, c.recruit, c.docs, c.extra]
    features.forEach((f, i) => {
      slide.addText('-', {
        x: c.x + 0.25, y: 3.55 + i * 0.27, w: 0.2, h: 0.25,
        fontFace: F.sans, fontSize: 12, color: C.accent, bold: true,
        align: 'left', valign: 'middle', margin: 0,
      })
      slide.addText(f, {
        x: c.x + 0.45, y: 3.55 + i * 0.27, w: 3.85, h: 0.25,
        fontFace: F.sans, fontSize: 11, color: C.inkSoft,
        align: 'left', valign: 'middle', margin: 0,
      })
    })
  })

  // Below: overage + trial
  slide.addText('14-day free trial of Business features, 200 credits to spend, no card required.   Overage credits: $20 = 500 credits, top-up on either tier.', {
    x: 0.5, y: 5.1, w: 9, h: 0.3,
    fontFace: F.sans, fontSize: 10, italic: true, color: C.inkMuted,
    align: 'left', valign: 'middle', margin: 0,
  })

  footer(slide, 4, totalSlides)
})()

// ---------- slide 5: Foundation 100 ----------

;(function foundationOffer() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '04  EARLY-COHORT OFFER', 'Foundation 100')

  // Big number on left
  slide.addText('100', {
    x: 0.5, y: 1.85, w: 2.5, h: 1.8,
    fontFace: F.serif, fontSize: 140, color: C.accent, bold: true,
    align: 'left', valign: 'middle', margin: 0,
  })
  slide.addText('Foundation customers', {
    x: 0.5, y: 3.7, w: 2.5, h: 0.3,
    fontFace: F.sans, fontSize: 12, color: C.inkSoft, bold: true, charSpacing: 1,
    align: 'left', valign: 'middle', margin: 0,
  })

  // Right column - what they get
  slide.addText('What it is', {
    x: 3.3, y: 1.85, w: 6.2, h: 0.3,
    fontFace: F.sans, fontSize: 11, color: C.accent, bold: true, charSpacing: 2,
    align: 'left', valign: 'middle', margin: 0,
  })
  slide.addText("First 100 customers to sign Business tier on a 12-month annual commit lock the rate at $179/month for life.", {
    x: 3.3, y: 2.15, w: 6.2, h: 0.55,
    fontFace: F.sans, fontSize: 15, color: C.ink, bold: true,
    align: 'left', valign: 'top', margin: 0,
  })
  slide.addText("vs $249/mo standard. Saves $840/yr on year one, locked at $2,148/yr forever even if we raise prices.", {
    x: 3.3, y: 2.7, w: 6.2, h: 0.35,
    fontFace: F.sans, fontSize: 11, italic: true, color: C.inkSoft,
    align: 'left', valign: 'top', margin: 0,
  })

  // Perks
  slide.addText('Foundation perks', {
    x: 3.3, y: 3.25, w: 6.2, h: 0.3,
    fontFace: F.sans, fontSize: 11, color: C.accent, bold: true, charSpacing: 2,
    align: 'left', valign: 'middle', margin: 0,
  })
  slide.addText([
    { text: 'Lifetime-locked $179/mo (saving $840/yr indefinitely)',  options: { bullet: true, breakLine: true } },
    { text: 'Founder Slack channel and monthly cohort call',          options: { bullet: true, breakLine: true } },
    { text: 'First access to every new module (Hospitality, Trades, Allied Health Packs from 2027)', options: { bullet: true, breakLine: true } },
    { text: 'Named on the Foundation 100 wall on the marketing site (opt-in)', options: { bullet: true } },
  ], {
    x: 3.3, y: 3.55, w: 6.2, h: 1.5,
    fontFace: F.sans, fontSize: 11, color: C.inkSoft,
    valign: 'top', margin: 0, paraSpaceAfter: 4,
  })

  footer(slide, 5, totalSlides)
})()

// ---------- slide 6: Enterprise overview ----------

;(function enterpriseOverview() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '05  ENTERPRISE', 'AI plus HQ - the human-advisor layer')

  // Eyebrow framing
  slide.addText("Enterprise is where HQ.ai stops being a tool and starts being a partner. A Humanistiqs Advisor or Talent Partner embeds into the business; the AI is their leverage, not the product.", {
    x: 0.5, y: 1.7, w: 9, h: 0.55,
    fontFace: F.sans, fontSize: 13, italic: true, color: C.inkSoft,
    align: 'left', valign: 'top', margin: 0,
  })

  // Three SKU cards
  const skus = [
    {
      x: 0.5, name: 'HQ People Enterprise',  annual: '$1,495/mo', annualTotal: '$17,940/yr', monthly: '$1,795/mo monthly',
      tagline: 'A named advisor on the line for the hard 20% of HR.',
      who: '40-150 staff. Office Manager or Operations Lead carrying HR on the side.',
    },
    {
      x: 3.65, name: 'HQ Recruit Enterprise', annual: '$2,995/mo', annualTotal: '$35,940/yr', monthly: '$3,495/mo monthly',
      tagline: 'A Talent Partner running your hiring funnel. Not a recruiter, not an agency.',
      who: '50-250 staff. Hires 12-60 roles/yr. Tired of agency fees, will not hire internal recruiter.',
    },
    {
      x: 6.8, name: 'Full Enterprise', annual: '$3,995/mo', annualTotal: '$47,940/yr', monthly: '$4,495/mo monthly',
      tagline: 'People + Recruit. Single partner team. Operating layer for both functions.',
      who: '80-250 staff. Both shapes of problem. Most chosen.',
      highlight: true,
    },
  ]
  skus.forEach((s) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: s.x, y: 2.45, w: 2.7, h: 2.55,
      fill: { color: C.bg }, line: { color: s.highlight ? C.accent : C.border, width: s.highlight ? 1.5 : 1 },
    })
    slide.addShape(pres.shapes.RECTANGLE, {
      x: s.x, y: 2.45, w: 2.7, h: 0.08,
      fill: { color: C.accent }, line: { type: 'none' },
    })
    slide.addText(s.name, {
      x: s.x + 0.2, y: 2.6, w: 2.3, h: 0.45,
      fontFace: F.sans, fontSize: 13, bold: true, color: C.ink,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(s.tagline, {
      x: s.x + 0.2, y: 3.05, w: 2.3, h: 0.55,
      fontFace: F.sans, fontSize: 10, italic: true, color: C.inkSoft,
      align: 'left', valign: 'top', margin: 0,
    })
    slide.addText(s.annual, {
      x: s.x + 0.2, y: 3.65, w: 2.3, h: 0.35,
      fontFace: F.sans, fontSize: 18, bold: true, color: C.accent,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(s.annualTotal + ' annual', {
      x: s.x + 0.2, y: 4.0, w: 2.3, h: 0.22,
      fontFace: F.sans, fontSize: 9, color: C.inkMuted,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText('or ' + s.monthly, {
      x: s.x + 0.2, y: 4.22, w: 2.3, h: 0.22,
      fontFace: F.sans, fontSize: 9, color: C.inkSoft,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(s.who, {
      x: s.x + 0.2, y: 4.5, w: 2.3, h: 0.45,
      fontFace: F.sans, fontSize: 9, color: C.inkMuted,
      align: 'left', valign: 'top', margin: 0,
    })
  })

  // Capacity cap line
  slide.addText("Year-1 hard cap: 10 partnerships total. Published as scarcity signal AND service-quality protection. Inaugural concession: first 5 customers get $200/mo off in exchange for a public case study.", {
    x: 0.5, y: 5.05, w: 9, h: 0.3,
    fontFace: F.sans, fontSize: 10, italic: true, color: C.inkMuted,
    align: 'left', valign: 'middle', margin: 0,
  })

  footer(slide, 6, totalSlides)
})()

// ---------- slide 7: annual vs monthly ----------

;(function annualVsMonthly() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '06  BILLING CYCLE', 'Annual contract or month-to-month')

  // Table
  const headerRow = [
    { text: 'Variant',              options: { bold: true, color: C.ink,    fill: { color: C.bgSoft }, fontSize: 11, valign: 'middle' } },
    { text: 'Annual contract',      options: { bold: true, color: C.accent, fill: { color: C.bgSoft }, fontSize: 11, valign: 'middle', align: 'center' } },
    { text: 'Month-to-month rate',  options: { bold: true, color: C.ink,    fill: { color: C.bgSoft }, fontSize: 11, valign: 'middle', align: 'center' } },
    { text: 'Annual saves',         options: { bold: true, color: C.ink,    fill: { color: C.bgSoft }, fontSize: 11, valign: 'middle', align: 'center' } },
  ]
  const rows = [
    [
      { text: 'HQ People Enterprise',     options: { fontSize: 11, color: C.ink,     valign: 'middle' } },
      { text: '$1,495/mo, $17,940/yr',    options: { fontSize: 11, color: C.accent,  bold: true, valign: 'middle', align: 'center' } },
      { text: '$1,795/mo',                options: { fontSize: 11, color: C.inkSoft, valign: 'middle', align: 'center' } },
      { text: '$3,600/yr',                options: { fontSize: 11, color: C.ink,     bold: true, valign: 'middle', align: 'center' } },
    ],
    [
      { text: 'HQ Recruit Enterprise',    options: { fontSize: 11, color: C.ink,     valign: 'middle' } },
      { text: '$2,995/mo, $35,940/yr',    options: { fontSize: 11, color: C.accent,  bold: true, valign: 'middle', align: 'center' } },
      { text: '$3,495/mo',                options: { fontSize: 11, color: C.inkSoft, valign: 'middle', align: 'center' } },
      { text: '$6,000/yr',                options: { fontSize: 11, color: C.ink,     bold: true, valign: 'middle', align: 'center' } },
    ],
    [
      { text: 'Full Enterprise',          options: { fontSize: 11, color: C.ink,     valign: 'middle' } },
      { text: '$3,995/mo, $47,940/yr',    options: { fontSize: 11, color: C.accent,  bold: true, valign: 'middle', align: 'center' } },
      { text: '$4,495/mo',                options: { fontSize: 11, color: C.inkSoft, valign: 'middle', align: 'center' } },
      { text: '$5,940/yr',                options: { fontSize: 11, color: C.ink,     bold: true, valign: 'middle', align: 'center' } },
    ],
  ]
  slide.addTable([headerRow, ...rows], {
    x: 0.5, y: 1.75, w: 9, colW: [2.4, 2.8, 2.0, 1.8], rowH: 0.55,
    fontFace: F.sans, border: { type: 'solid', pt: 0.5, color: C.border },
  })

  // Below: rationale
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.0, w: 9, h: 1.15,
    fill: { color: C.bgSoft }, line: { type: 'none' },
  })
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.0, w: 0.08, h: 1.15,
    fill: { color: C.accent }, line: { type: 'none' },
  })
  slide.addText('Why both:', {
    x: 0.75, y: 4.1, w: 1.5, h: 0.3,
    fontFace: F.sans, fontSize: 11, bold: true, color: C.accent, charSpacing: 1,
    align: 'left', valign: 'top', margin: 0,
  })
  slide.addText("Annual is the anchor and the calendar-reservation-aligned choice. Month-to-month carries a ~17% premium (inverse of the Solo/Business annual discount band) with 30 days cancellation notice. Notice period protects the advisor calendar against same-day disappearances. Both routed via Stripe Invoicing; founder picks the right Price ID at engagement-letter signing.", {
    x: 2.2, y: 4.08, w: 7.2, h: 1.0,
    fontFace: F.sans, fontSize: 10, color: C.inkSoft,
    align: 'left', valign: 'top', margin: 0,
  })

  footer(slide, 7, totalSlides)
})()

// ---------- slide 8: sliding-scale multipliers ----------

;(function multipliers() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '07  SLIDING SCALE', 'Three published multipliers')

  // Intro line
  slide.addText('Base price is the headline. Three published multipliers flex Enterprise on the dimensions that actually drive advisor and talent-partner workload. Customer can self-calculate before the discovery call. No negotiation.', {
    x: 0.5, y: 1.65, w: 9, h: 0.5,
    fontFace: F.sans, fontSize: 11, italic: true, color: C.inkSoft,
    align: 'left', valign: 'top', margin: 0,
  })

  // Three multiplier panels
  const panels = [
    {
      x: 0.5, h: 'Headcount band',
      rows: [
        ['40-150 staff',  'base'],
        ['151-250 staff', '+$400 / +$300 / +$650'],
        ['251-500 staff', 'Strategic tier'],
        ['500+ staff',    'Strategic tier'],
      ],
      note: 'Uplift per People / Recruit / Full per month.',
    },
    {
      x: 3.65, h: 'Hiring volume',
      rows: [
        ['Up to 4 concurrent',  'base'],
        ['5-6 concurrent',      '+$750/mo'],
        ['7-8 concurrent',      '+$1,500/mo'],
        ['9+ concurrent',       'Bulk Hiring quoted'],
      ],
      note: 'Recruit + Full only. Roughly 50/70/90/100+ closures/yr.',
    },
    {
      x: 6.8, h: 'Entity complexity',
      rows: [
        ['Single entity',  'base'],
        ['2-3 entities',   '+15% of base'],
        ['4-5 entities',   '+25% of base'],
        ['6+ entities',    'Strategic tier'],
      ],
      note: 'Any variant. Entity uplift calculated against base alone, not running subtotal.',
    },
  ]
  panels.forEach((p) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: p.x, y: 2.25, w: 2.7, h: 2.75,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    })
    slide.addShape(pres.shapes.RECTANGLE, {
      x: p.x, y: 2.25, w: 2.7, h: 0.08,
      fill: { color: C.accent }, line: { type: 'none' },
    })
    slide.addText(p.h, {
      x: p.x + 0.2, y: 2.4, w: 2.3, h: 0.3,
      fontFace: F.sans, fontSize: 12, bold: true, color: C.ink,
      align: 'left', valign: 'middle', margin: 0,
    })
    p.rows.forEach((r, i) => {
      slide.addText(r[0], {
        x: p.x + 0.2, y: 2.78 + i * 0.32, w: 1.4, h: 0.28,
        fontFace: F.sans, fontSize: 10, color: C.inkSoft,
        align: 'left', valign: 'middle', margin: 0,
      })
      slide.addText(r[1], {
        x: p.x + 1.55, y: 2.78 + i * 0.32, w: 1.1, h: 0.28,
        fontFace: F.sans, fontSize: 10, color: C.ink, bold: true,
        align: 'right', valign: 'middle', margin: 0,
      })
    })
    slide.addText(p.note, {
      x: p.x + 0.2, y: 4.4, w: 2.3, h: 0.55,
      fontFace: F.sans, fontSize: 9, italic: true, color: C.inkMuted,
      align: 'left', valign: 'top', margin: 0,
    })
  })

  // Sticky-bands rule
  slide.addText('Bands are sticky at signing. We re-price at each annual anniversary with 60 days notice. Mid-contract growth into a higher band does not trigger a mid-cycle re-price.', {
    x: 0.5, y: 5.07, w: 9, h: 0.3,
    fontFace: F.sans, fontSize: 9, italic: true, color: C.inkMuted,
    align: 'left', valign: 'middle', margin: 0,
  })

  footer(slide, 8, totalSlides)
})()

// ---------- slide 9: worked examples ----------

;(function workedExamples() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '08  WORKED EXAMPLES', 'How the maths actually plays out')

  const ex = [
    {
      x: 0.5, label: 'Customer A',
      desc: '200-staff single-entity allied health. People Enterprise.',
      calc: 'Base $1,495 + headcount $400 + volume n/a + entity $0',
      result: '$1,895/mo annual ($22,740/yr)',
    },
    {
      x: 5.05, label: 'Customer B',
      desc: '75-staff franchise group of 4 cafes. Full Enterprise.',
      calc: 'Base $3,995 + headcount $0 + volume $0 + entity 25% of base $999',
      result: '$4,994/mo annual ($59,928/yr)',
    },
    {
      x: 0.5, y2: true, label: 'Customer C',
      desc: '120-staff scaling tech, ~75 roles/yr, 6 concurrent. Recruit Enterprise.',
      calc: 'Base $2,995 + headcount $0 + volume $750 + entity $0',
      result: '$3,745/mo annual ($44,940/yr) - vs RPO at $150k/yr, still 3.3x cheaper',
    },
    {
      x: 5.05, y2: true, label: 'Customer D',
      desc: '220-staff multi-state retail, 3 entities, ~65 roles/yr. Full Enterprise.',
      calc: 'Base $3,995 + headcount $650 + volume $750 + entity 15% of base $599',
      result: '$5,994/mo annual ($71,928/yr) - upper end of standard band',
    },
  ]
  ex.forEach((e) => {
    const y = e.y2 ? 3.62 : 1.75
    slide.addShape(pres.shapes.RECTANGLE, {
      x: e.x, y, w: 4.45, h: 1.7,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    })
    slide.addShape(pres.shapes.RECTANGLE, {
      x: e.x, y, w: 0.08, h: 1.7,
      fill: { color: C.accent }, line: { type: 'none' },
    })
    slide.addText(e.label, {
      x: e.x + 0.25, y: y + 0.1, w: 4.0, h: 0.3,
      fontFace: F.sans, fontSize: 11, bold: true, color: C.accent, charSpacing: 1,
      align: 'left', valign: 'top', margin: 0,
    })
    slide.addText(e.desc, {
      x: e.x + 0.25, y: y + 0.38, w: 4.0, h: 0.35,
      fontFace: F.sans, fontSize: 11, color: C.ink, bold: true,
      align: 'left', valign: 'top', margin: 0,
    })
    slide.addText(e.calc, {
      x: e.x + 0.25, y: y + 0.78, w: 4.0, h: 0.4,
      fontFace: F.sans, fontSize: 10, color: C.inkSoft,
      align: 'left', valign: 'top', margin: 0,
    })
    slide.addText(e.result, {
      x: e.x + 0.25, y: y + 1.2, w: 4.0, h: 0.4,
      fontFace: F.sans, fontSize: 11, color: C.ink, bold: true,
      align: 'left', valign: 'top', margin: 0,
    })
  })

  footer(slide, 9, totalSlides)
})()

// ---------- slide 10: capacity model + sales motion ----------

;(function capacityAndSales() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '09  OPERATIONS', 'Capacity model and sales motion')

  // LEFT: capacity table
  slide.addText('Year-1 capacity envelope', {
    x: 0.5, y: 1.7, w: 4.5, h: 0.3,
    fontFace: F.sans, fontSize: 11, bold: true, color: C.accent, charSpacing: 2,
    align: 'left', valign: 'middle', margin: 0,
  })
  const capacityTable = [
    [
      { text: 'Resource',                 options: { bold: true, fontSize: 10, color: C.ink, fill: { color: C.bgSoft } } },
      { text: 'FTE',                      options: { bold: true, fontSize: 10, color: C.ink, fill: { color: C.bgSoft }, align: 'center' } },
      { text: 'Slots',                    options: { bold: true, fontSize: 10, color: C.ink, fill: { color: C.bgSoft }, align: 'center' } },
    ],
    [
      { text: 'Jimmy (founder)',          options: { fontSize: 10, color: C.ink } },
      { text: '0.4',                      options: { fontSize: 10, color: C.inkSoft, align: 'center' } },
      { text: '6-8 People Ent',           options: { fontSize: 10, color: C.inkSoft, align: 'center' } },
    ],
    [
      { text: 'Contract Advisor',         options: { fontSize: 10, color: C.ink } },
      { text: '0.6',                      options: { fontSize: 10, color: C.inkSoft, align: 'center' } },
      { text: '8-12 People Ent',          options: { fontSize: 10, color: C.inkSoft, align: 'center' } },
    ],
    [
      { text: 'Contract Talent Partner',  options: { fontSize: 10, color: C.ink } },
      { text: '0.7',                      options: { fontSize: 10, color: C.inkSoft, align: 'center' } },
      { text: '4-5 Recruit Ent',          options: { fontSize: 10, color: C.inkSoft, align: 'center' } },
    ],
    [
      { text: 'Year-1 hard cap',          options: { bold: true, fontSize: 10, color: C.accent } },
      { text: '',                         options: { fontSize: 10, fill: { color: C.bgSoft } } },
      { text: '10 customers total',       options: { bold: true, fontSize: 10, color: C.accent, align: 'center' } },
    ],
  ]
  slide.addTable(capacityTable, {
    x: 0.5, y: 2.05, w: 4.5, colW: [2.0, 0.7, 1.8], rowH: 0.4,
    fontFace: F.sans, border: { type: 'solid', pt: 0.5, color: C.border },
  })

  // RIGHT: sales motion timeline
  slide.addText('Sales motion - founder-led, no team', {
    x: 5.3, y: 1.7, w: 4.2, h: 0.3,
    fontFace: F.sans, fontSize: 11, bold: true, color: C.accent, charSpacing: 2,
    align: 'left', valign: 'middle', margin: 0,
  })
  const steps = [
    { num: '01', t: 'Landing page Enterprise card',  d: 'Both Solo/Business + Enterprise visible on /pricing.' },
    { num: '02', t: '/enterprise page + inquiry form', d: 'Three variants, multiplier schedule, self-calculation.' },
    { num: '03', t: 'Founder discovery call (48h)',   d: 'Jimmy runs first 10 personally. 30 minutes.' },
    { num: '04', t: 'Scoping doc + Stripe Invoice',   d: 'Within 5 business days. Signed within 14 days typical.' },
    { num: '05', t: '30-day onboarding sprint',       d: 'Tool walkthrough, knowledge ingestion, cadence locked by day 21.' },
  ]
  steps.forEach((s, i) => {
    const y = 2.05 + i * 0.62
    slide.addShape(pres.shapes.OVAL, {
      x: 5.3, y: y, w: 0.4, h: 0.4,
      fill: { color: C.accent }, line: { type: 'none' },
    })
    slide.addText(s.num, {
      x: 5.3, y: y, w: 0.4, h: 0.4,
      fontFace: F.sans, fontSize: 9, color: 'FFFFFF', bold: true,
      align: 'center', valign: 'middle', margin: 0,
    })
    slide.addText(s.t, {
      x: 5.85, y: y - 0.04, w: 3.7, h: 0.24,
      fontFace: F.sans, fontSize: 11, color: C.ink, bold: true,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(s.d, {
      x: 5.85, y: y + 0.18, w: 3.7, h: 0.24,
      fontFace: F.sans, fontSize: 9, color: C.inkMuted,
      align: 'left', valign: 'middle', margin: 0,
    })
  })

  footer(slide, 10, totalSlides)
})()

// ---------- slide 11: ARR projections ----------

;(function arrProjections() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '10  THE NUMBERS', 'Enterprise ARR and gross margin')

  // Two side-by-side year cards
  const yearCards = [
    {
      x: 0.5, label: 'Year 1', dateRange: 'May 2026 - Apr 2027',
      customers: '10',
      arr: '$305,400',
      gm: '24%',
      gmAmount: '$72,120',
      headline: 'Modest absolute margin. Strategically priceless.',
      subline: '10 named partnerships, 3-5 published case studies, 20-30 warm referrals into Business tier.',
    },
    {
      x: 5.05, label: 'Year 2', dateRange: 'May 2027 - Apr 2028',
      customers: '28',
      arr: '$855,000',
      gm: '34%',
      gmAmount: '$290,700',
      headline: 'Margin lift via second-round hires + bench maturity.',
      subline: 'Founder no longer the bottleneck; contractors mature into more customers per FTE; overage revenue compounds (~12% buy at least one overage/qtr).',
      highlight: true,
    },
  ]
  yearCards.forEach((y) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: y.x, y: 1.75, w: 4.45, h: 3.3,
      fill: { color: y.highlight ? C.bg : C.bg }, line: { color: y.highlight ? C.accent : C.border, width: y.highlight ? 1.5 : 1 },
    })
    slide.addText(y.label, {
      x: y.x + 0.25, y: 1.85, w: 1.5, h: 0.35,
      fontFace: F.sans, fontSize: 14, bold: true, color: C.accent, charSpacing: 2,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(y.dateRange, {
      x: y.x + 0.25, y: 2.18, w: 4.0, h: 0.22,
      fontFace: F.sans, fontSize: 9, color: C.inkMuted,
      align: 'left', valign: 'middle', margin: 0,
    })
    // Big ARR number
    slide.addText(y.arr, {
      x: y.x + 0.25, y: 2.45, w: 4.0, h: 0.65,
      fontFace: F.sans, fontSize: 38, bold: true, color: C.ink,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText('Enterprise ARR', {
      x: y.x + 0.25, y: 3.1, w: 4.0, h: 0.25,
      fontFace: F.sans, fontSize: 10, color: C.inkMuted, charSpacing: 1,
      align: 'left', valign: 'middle', margin: 0,
    })
    // Mini metrics row
    slide.addText(y.customers + ' customers', {
      x: y.x + 0.25, y: 3.45, w: 1.5, h: 0.25,
      fontFace: F.sans, fontSize: 11, color: C.ink, bold: true,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(y.gm + ' GM (' + y.gmAmount + ')', {
      x: y.x + 1.85, y: 3.45, w: 2.5, h: 0.25,
      fontFace: F.sans, fontSize: 11, color: C.ink, bold: true,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(y.headline, {
      x: y.x + 0.25, y: 3.85, w: 4.0, h: 0.4,
      fontFace: F.sans, fontSize: 11, color: C.accent, italic: true,
      align: 'left', valign: 'top', margin: 0,
    })
    slide.addText(y.subline, {
      x: y.x + 0.25, y: 4.25, w: 4.0, h: 0.75,
      fontFace: F.sans, fontSize: 10, color: C.inkSoft,
      align: 'left', valign: 'top', margin: 0,
    })
  })

  slide.addText('Margin protected by capacity discipline. Hard 4-customer cap per Talent Partner; "intensive month" mechanic twice per advisor per year; mandatory quarterly utilisation review.', {
    x: 0.5, y: 5.07, w: 9, h: 0.3,
    fontFace: F.sans, fontSize: 10, italic: true, color: C.inkMuted,
    align: 'left', valign: 'middle', margin: 0,
  })

  footer(slide, 11, totalSlides)
})()

// ---------- slide 12: the asks ----------

;(function theAsks() {
  const slide = pres.addSlide()
  slide.background = { color: C.bg }
  header(slide, '11  THE ASK', 'Director sign-off')

  const asks = [
    {
      num: '01', t: 'Founder allocation',
      d: 'Confirm Jimmy is good to allocate 0.4 FTE to Enterprise delivery for the next 12 months. If only 0.3 FTE, year-1 cap drops from 10 to 8.',
    },
    {
      num: '02', t: 'Contract Humanistiqs Advisor hire',
      d: 'Pre-approve the senior ex-HR Director contract hire (~$120k/yr loaded) at the moment customer 9 signs. Lead time on senior contract placement is 6-10 weeks.',
    },
    {
      num: '03', t: 'Contract Talent Partner hire',
      d: 'Pre-approve the senior ex-TA Lead contract hire (~$100k/yr loaded) on the same trigger.',
    },
    {
      num: '04', t: 'Inaugural-customer concession',
      d: 'Sign off the first-5-customers $200/mo discount in exchange for a public case study with named business and dollar saving. After customer 5, no discounting.',
    },
    {
      num: '05', t: 'PI insurance + capacity-cap publication',
      d: 'Confirm professional indemnity policy covers advisory work. Green-light publishing the 10-partnerships cap on the public /enterprise page as scarcity signal.',
    },
  ]
  asks.forEach((a, i) => {
    const y = 1.75 + i * 0.66
    slide.addShape(pres.shapes.OVAL, {
      x: 0.5, y, w: 0.42, h: 0.42,
      fill: { color: C.accent }, line: { type: 'none' },
    })
    slide.addText(a.num, {
      x: 0.5, y, w: 0.42, h: 0.42,
      fontFace: F.sans, fontSize: 10, color: 'FFFFFF', bold: true,
      align: 'center', valign: 'middle', margin: 0,
    })
    slide.addText(a.t, {
      x: 1.1, y: y - 0.04, w: 8.5, h: 0.26,
      fontFace: F.sans, fontSize: 13, color: C.ink, bold: true,
      align: 'left', valign: 'middle', margin: 0,
    })
    slide.addText(a.d, {
      x: 1.1, y: y + 0.22, w: 8.5, h: 0.4,
      fontFace: F.sans, fontSize: 10, color: C.inkSoft,
      align: 'left', valign: 'top', margin: 0,
    })
  })

  footer(slide, 12, totalSlides)
})()

// ---------- write ----------

await pres.writeFile({ fileName: OUT })
console.log(`Wrote ${OUT}`)
