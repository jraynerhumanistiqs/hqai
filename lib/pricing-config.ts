// lib/pricing-config.ts
//
// Single source of truth for HQ.ai pricing (v2 - May 2026).
//
// Source: docs/research/retention-and-monetisation-brief.md section 2.8.
// Lifted verbatim from the brief and typed. Components, API routes, and
// docs must import PRICING from here - never duplicate prices inline.
//
// All prices are AUD whole dollars (the brief uses whole-dollar headline
// figures; the Stripe Price catalogue stores cents). The Price IDs in
// stripePriceIdMonthly / stripePriceIdAnnual / etc. are env-var KEYS,
// not literal IDs - the runtime resolver in lib/stripe.ts reads
// process.env[key] to get the real Stripe price id.

export type Currency = 'AUD'

export type BillingCycle = 'monthly' | 'annual'

export interface PricingTier {
  id: 'solo' | 'business'
  name: string
  tagline: string
  priceMonthly: number
  priceAnnualMonthly: number
  priceAnnualTotal: number
  currency: Currency
  seats: number
  includedCredits: number
  overageCreditPackPrice: number
  overageCreditPackCredits: number
  stripePriceIdMonthly: string
  stripePriceIdAnnual: string
  features: string[]
  cta: string
  highlight: boolean
  badge?: string
}

export interface OneOffSku {
  id: string
  name: string
  price: number
  currency: Currency
  stripePriceId: string
  noSignupRequired: boolean
  description: string
}

export interface FoundationOffer {
  enabled: boolean
  cap: number
  tierId: 'business'
  lockedMonthly: number
  requiresAnnualCommit: boolean
  perks: string[]
  stripePriceIdAnnual: string
}

export interface TrialConfig {
  days: number
  cardRequired: boolean
  creditAllowance: number
  accessLevel: 'business'
}

export interface CreditsConfig {
  chatTurn: number
  documentGeneration: number
  cvScored: number
  phoneScreenProcessed: number
  knowledgeIngestionPerDoc: number
  awardInterpretation: number
}

export type EnterpriseVariantId =
  | 'enterprise-people'
  | 'enterprise-recruit'
  | 'enterprise-full'

export interface EnterpriseOverageLine {
  label: string
  rate: string
}

export interface EnterpriseVariant {
  id: EnterpriseVariantId
  name: string
  tagline: string
  // ANNUAL-CONTRACT pricing (the anchor). Customer commits to 12 months
  // and either pays upfront or quarterly via Stripe Invoicing.
  priceMonthlyDisplay: number       // monthly equivalent of the annual price (e.g. 1,495)
  priceAnnualTotal: number          // annual contract value (e.g. 17,940)
  contractTermMonths: 12
  // MONTHLY-ROLLING pricing. Same scope of work; customer pays a premium
  // for the cash-flow flexibility and the option to give 30 days' notice.
  // Founder's call (May 2026): some customers will pay for 12+ months
  // anyway but won't sign a fixed-term, so make it a Stripe option.
  // The premium protects the advisor calendar (no churn-and-rehire
  // burn) and aligns with the inverse of the Solo/Business 16.7%
  // annual discount band.
  priceMonthlyRolling: number       // monthly-billed price (e.g. 1,795)
  monthlyRollingNoticePeriodDays: 30
  // Env-var keys, not literals. Sales-assisted - never surfaced in the
  // public checkout flow. The founder issues the Stripe Invoice using
  // whichever Price ID matches the cycle the customer chose.
  stripePriceIdEnvKeyAnnual: string
  stripePriceIdEnvKeyMonthly: string
  currency: Currency
  includedSummary: string[]
  notIncluded: string[]
  overage: EnterpriseOverageLine[]
  qualifyingHeadcountMin: number
}

export interface EnterpriseInauguralOffer {
  enabled: boolean
  slotsRemaining: number
  discountPerMonth: number
}

// Multiplier model (added May 2026). Source of truth:
// docs/research/enterprise-sliding-scale-analysis.md §3.2 (the schedule)
// and §3.4 (worked examples). Three published, stepped uplifts layered
// on top of the base SKU - customer can self-calculate, no negotiation.
export interface EnterpriseHeadcountBand {
  label: string                          // e.g. "151-250 staff"
  // Per-variant uplift in AUD/month, added to the annual-equivalent base.
  // Use null where the band is out-of-standard (Strategic tier, founder
  // discretion - not a published number).
  upliftPeople: number | null
  upliftRecruit: number | null
  upliftFull: number | null
  isStrategicTier: boolean               // true for 251+ - renders "Talk to us" not a number
}

export interface EnterpriseVolumeBand {
  label: string                          // e.g. "5-6 concurrent / ~60-80 closures per year"
  appliesTo: Array<'enterprise-recruit' | 'enterprise-full'>
  uplift: number | null                  // null for "quoted separately" / Bulk Hiring
  isQuotedSeparately: boolean
}

export interface EnterpriseEntityBand {
  label: string                          // e.g. "2-3 entities"
  upliftPercent: number | null           // 0, 15, 25; null for Strategic tier 6+
  isStrategicTier: boolean
}

export interface EnterpriseMultipliers {
  headcountBands: EnterpriseHeadcountBand[]
  volumeBands: EnterpriseVolumeBand[]
  entityBands: EnterpriseEntityBand[]
  // Plain-English rule that goes on the page and in the engagement letter:
  // bands are sticky at signing, recalculated at anniversary.
  stickyBandsRule: string
}

export interface EnterpriseConfig {
  variants: EnterpriseVariant[]
  // Year-1 hard cap (strategy doc §4.2). Published on the landing page
  // and on /enterprise as both scarcity signal and service-quality
  // protection.
  capacityCapYear1: number
  inaugural: EnterpriseInauguralOffer
  enterpriseMultipliers: EnterpriseMultipliers
  // When true, the public Stripe checkout route refuses these planIds
  // and redirects the buyer to /enterprise for a discovery call.
  salesAssistedOnly: boolean
}

export interface PricingShape {
  currency: Currency
  tiers: PricingTier[]
  oneOffs: OneOffSku[]
  foundation: FoundationOffer
  trial: TrialConfig
  credits: CreditsConfig
  enterprise: EnterpriseConfig
}

export const PRICING: PricingShape = {
  currency: 'AUD',
  tiers: [
    {
      id: 'solo',
      name: 'Solo',
      tagline: 'Replace your DIY policy file',
      priceMonthly: 89,
      priceAnnualMonthly: 74, // $890/yr = $74/mo equivalent
      priceAnnualTotal: 890,
      currency: 'AUD',
      seats: 3,
      includedCredits: 500,
      overageCreditPackPrice: 20,
      overageCreditPackCredits: 500,
      stripePriceIdMonthly: 'STRIPE_PRICE_ID_SOLO_MONTHLY',
      stripePriceIdAnnual: 'STRIPE_PRICE_ID_SOLO_ANNUAL',
      features: [
        'AI HR Advisor with Fair Work citations',
        '33 HR document templates',
        'HQ Recruit (1 active role)',
        'Document library (100 docs)',
        '500 AI credits/month',
        'Pay-as-you-go advisor escalation ($80/session)',
        'Email support',
      ],
      cta: 'Start the 14-day trial',
      highlight: false,
    },
    {
      id: 'business',
      name: 'Business Complete',
      tagline: 'HR and hiring together - the everything plan',
      priceMonthly: 269,
      priceAnnualMonthly: 224,
      priceAnnualTotal: 2690,
      currency: 'AUD',
      seats: 15,
      includedCredits: 2500,
      overageCreditPackPrice: 20,
      overageCreditPackCredits: 500,
      stripePriceIdMonthly: 'STRIPE_PRICE_ID_BUSINESS_MONTHLY',
      stripePriceIdAnnual: 'STRIPE_PRICE_ID_BUSINESS_ANNUAL',
      features: [
        'Everything in Solo',
        '15 seats',
        'HQ Recruit (unlimited roles)',
        'Unlimited document library',
        '2,500 AI credits/month',
        '2 advisor escalations included/month',
        'Founder-led onboarding call (30 min)',
        'Priority Slack support',
      ],
      cta: 'Start the 14-day trial',
      highlight: true,
      badge: 'Most popular',
    },
  ],
  oneOffs: [
    {
      id: 'letter-of-offer',
      name: 'Letter of Offer',
      price: 25,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_LETTER_OF_OFFER',
      noSignupRequired: true,
      description: 'Fair Work compliant offer letter, drafted from your inputs, in 3 minutes.',
    },
    {
      id: 'termination-letter',
      name: 'Termination Letter',
      price: 45,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_TERMINATION',
      noSignupRequired: true,
      description: 'A safe termination letter with notice and final-pay maths done.',
    },
    {
      id: 'employment-contract',
      name: 'Employment Contract',
      price: 49,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_EMPLOYMENT_CONTRACT',
      noSignupRequired: true,
      description: 'Full-time, part-time or casual - award-aligned, NES-compliant.',
    },
    {
      id: 'first-and-final-warning',
      name: 'First-and-Final Warning',
      price: 35,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_FIRST_FINAL_WARNING',
      noSignupRequired: true,
      description: 'A defensible written warning with the conduct framed properly.',
    },
    {
      id: 'position-description',
      name: 'Position Description',
      price: 29,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_POSITION_DESCRIPTION',
      noSignupRequired: true,
      description: 'A clean role description with classification and responsibilities mapped.',
    },
    {
      id: 'performance-plan',
      name: 'Performance Improvement Plan',
      price: 39,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_PERFORMANCE_PLAN',
      noSignupRequired: true,
      description: 'A 30/60/90-day PIP with measurable targets and review cadence.',
    },
    {
      id: 'casual-conversion-letter',
      name: 'Casual Conversion Letter',
      price: 29,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_CASUAL_CONVERSION',
      noSignupRequired: true,
      description: 'Offer or response letter under the casual conversion rules.',
    },
    {
      id: 'resignation-acceptance',
      name: 'Resignation Acceptance',
      price: 25,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_RESIGNATION_ACCEPTANCE',
      noSignupRequired: true,
      description: 'A clean resignation acknowledgement with notice and final-pay logic.',
    },
    {
      id: 'probation-outcome',
      name: 'Probation Outcome Letter',
      price: 35,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_PROBATION_OUTCOME',
      noSignupRequired: true,
      description: 'Confirm, extend, or end probation - in line with the contract terms.',
    },
    {
      id: 'reference-check-request',
      name: 'Reference Check Request',
      price: 25,
      currency: 'AUD',
      stripePriceId: 'STRIPE_PRICE_ID_REFERENCE_CHECK',
      noSignupRequired: true,
      description: 'A reference request with consent capture and structured questions.',
    },
  ],
  foundation: {
    enabled: true,
    cap: 100,
    tierId: 'business',
    lockedMonthly: 189,
    requiresAnnualCommit: true,
    perks: [
      '$189/mo held for your first 12 months (saving over $950)',
      'Founder Slack and monthly cohort call',
      'First access to all new modules',
      'Named on the Foundation 100 wall',
    ],
    stripePriceIdAnnual: 'STRIPE_PRICE_ID_BUSINESS_FOUNDATION',
  },
  trial: {
    days: 14,
    cardRequired: false,
    creditAllowance: 200,
    accessLevel: 'business',
  },
  credits: {
    chatTurn: 1,
    documentGeneration: 5,
    cvScored: 3,
    phoneScreenProcessed: 25,
    knowledgeIngestionPerDoc: 10,
    awardInterpretation: 5,
  },
  // Enterprise tier - the human-advisor-led layer above the AI product.
  // Source: docs/research/enterprise-tier-strategy.md §2.1, §2.2, §2.3.
  // Sales-assisted only; the founder runs discovery calls and invoices
  // manually via Stripe Invoicing. Never surfaced in the public checkout
  // flow - the public path is the /enterprise inquiry form.
  enterprise: {
    capacityCapYear1: 10,
    inaugural: {
      enabled: true,
      slotsRemaining: 5,
      discountPerMonth: 200,
    },
    // Stepped multiplier schedule. See docs/research/enterprise-sliding-scale-analysis.md
    // §3.2 (schedule), §3.4 (worked examples). Customer self-calculates from the
    // published bands; no negotiation, no custom-quote-per-deal. Entity uplift
    // is a percentage applied against the BASE SKU only (NOT against base +
    // headcount + volume) - this is the analysis doc's actual maths and is
    // what makes Customer D's worked example land at $5,994/mo.
    enterpriseMultipliers: {
      headcountBands: [
        { label: '40-150 staff (base)', upliftPeople: 0,    upliftRecruit: 0,    upliftFull: 0,    isStrategicTier: false },
        { label: '151-250 staff',       upliftPeople: 400,  upliftRecruit: 300,  upliftFull: 650,  isStrategicTier: false },
        { label: '251-500 staff',       upliftPeople: null, upliftRecruit: null, upliftFull: null, isStrategicTier: true  },
        { label: '500+ staff',          upliftPeople: null, upliftRecruit: null, upliftFull: null, isStrategicTier: true  },
      ],
      volumeBands: [
        { label: 'Up to 4 concurrent / ~50 closures per year (base)', appliesTo: ['enterprise-recruit', 'enterprise-full'], uplift: 0,    isQuotedSeparately: false },
        { label: '5-6 concurrent / ~60-80 closures per year',         appliesTo: ['enterprise-recruit', 'enterprise-full'], uplift: 750,  isQuotedSeparately: false },
        { label: '7-8 concurrent / ~80-100 closures per year',        appliesTo: ['enterprise-recruit', 'enterprise-full'], uplift: 1500, isQuotedSeparately: false },
        { label: '9+ concurrent / over 100 closures per year',        appliesTo: ['enterprise-recruit', 'enterprise-full'], uplift: null, isQuotedSeparately: true  },
      ],
      entityBands: [
        { label: 'Single entity', upliftPercent: 0,    isStrategicTier: false },
        { label: '2-3 entities',  upliftPercent: 15,   isStrategicTier: false },
        { label: '4-5 entities',  upliftPercent: 25,   isStrategicTier: false },
        { label: '6+ entities',   upliftPercent: null, isStrategicTier: true  },
      ],
      stickyBandsRule:
        'Bands are sticky at signing. We re-price against your current state at each annual anniversary, with 60 days notice of any change. Mid-contract growth into a higher band does not trigger a mid-cycle re-price.',
    },
    salesAssistedOnly: true,
    variants: [
      {
        id: 'enterprise-people',
        name: 'HR365',
        tagline: 'You are assigned a dedicated Humanistiqs HR advisor on call. The AI does the admin.',
        priceMonthlyDisplay: 799,
        priceAnnualTotal: 9588,
        priceMonthlyRolling: 950,
        monthlyRollingNoticePeriodDays: 30,
        currency: 'AUD',
        contractTermMonths: 12,
        qualifyingHeadcountMin: 40,
        stripePriceIdEnvKeyAnnual: 'STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_ANNUAL',
        stripePriceIdEnvKeyMonthly: 'STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_MONTHLY',
        includedSummary: [
          'Everything in the Complete bundle',
          'A dedicated Humanistiqs advisor - the same person every time, with a photo and direct mobile',
          '3 advisor hours a month (on-call advice); extra time at $250/hour',
          'Same-business-day SLA on Slack and email advisory queries',
          'Quarterly compliance health check, 90 minutes, recorded deliverable',
          'Quarterly roadmap-influence call direct with the founder',
        ],
        notIncluded: [
          'Workplace investigations (referred to external specialist, paid)',
          'Litigation or FWC representation (referred to employment lawyer, paid)',
          'Custom enterprise agreement drafting (referred to ER specialist, paid)',
        ],
        overage: [
          { label: 'Additional advisor time', rate: '$250/hour, billed in 15-min increments' },
          { label: 'After-hours emergency advisory (outside 8am-6pm AEST weekdays)', rate: '$400/hour, capped 4 hours/month' },
        ],
      },
      {
        id: 'enterprise-recruit',
        name: 'Recruit365',
        tagline: 'You are assigned a dedicated Humanistiqs talent advisor on call for your hiring. The AI does the admin.',
        priceMonthlyDisplay: 899,
        priceAnnualTotal: 10788,
        priceMonthlyRolling: 1070,
        monthlyRollingNoticePeriodDays: 30,
        currency: 'AUD',
        contractTermMonths: 12,
        qualifyingHeadcountMin: 50,
        stripePriceIdEnvKeyAnnual: 'STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_ANNUAL',
        stripePriceIdEnvKeyMonthly: 'STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_MONTHLY',
        includedSummary: [
          'Everything in the Complete bundle',
          'A dedicated Humanistiqs talent advisor running your hiring',
          'Up to 4 active roles concurrent (typical throughput 50 closures/year)',
          'Weekly role-status calls with the hiring manager (30 min per role)',
          'Calibration sessions at role kickoff and after first shortlist',
          'Shortlist delivery with named recommendations and structured rationale',
        ],
        notIncluded: [
          'Executive search (over $150k base) - referred to Humanistiqs Executive Search, paid',
          'Bulk hiring campaigns (over 10 simultaneous opens) - quoted separately',
          'Passive sourcing campaigns - quoted at $1,500 per 30-day campaign',
        ],
        overage: [
          { label: '5th and subsequent concurrent active role', rate: '$750/month per additional role, pro-rata' },
          { label: 'Executive search add-on', rate: '$8,500 per placement, fixed fee not contingency' },
          { label: 'Passive sourcing campaign', rate: '$1,500 per 30-day campaign' },
        ],
      },
      {
        id: 'enterprise-full',
        name: 'HR365 + Recruit365',
        tagline: 'Both advisors, one team. HR and hiring on call, with the AI doing the admin.',
        priceMonthlyDisplay: 1599,
        priceAnnualTotal: 19188,
        priceMonthlyRolling: 1899,
        monthlyRollingNoticePeriodDays: 30,
        currency: 'AUD',
        contractTermMonths: 12,
        qualifyingHeadcountMin: 80,
        stripePriceIdEnvKeyAnnual: 'STRIPE_PRICE_ID_ENTERPRISE_FULL_ANNUAL',
        stripePriceIdEnvKeyMonthly: 'STRIPE_PRICE_ID_ENTERPRISE_FULL_MONTHLY',
        includedSummary: [
          'Everything in HQ People Enterprise AND HQ Recruit Enterprise',
          'Single dedicated partner team - one Advisor and one Talent Partner who coordinate',
          'Monthly Executive Review across workforce posture, hiring pipeline and compliance risk',
          'Founder check-in twice yearly (Jimmy Rayner personally)',
          'Priority on new module access (Hospitality, Trades, Allied Health Packs)',
        ],
        notIncluded: [
          'Workplace investigations, litigation and FWC representation (referred, paid)',
          'Executive search over $150k base (referred to Humanistiqs Executive Search, paid)',
          'Bulk hiring campaigns over 10 simultaneous opens (quoted separately)',
        ],
        overage: [
          { label: 'Additional advisor time', rate: '$250/hour, 15-min increments' },
          { label: '5th and subsequent concurrent active role', rate: '$750/month per role' },
          { label: 'Executive search add-on', rate: '$8,500 per placement, fixed fee' },
        ],
      },
    ],
  },
}

// Mirror of §2.4 in the brief - per-action credit costs. Use this map
// to compute the cost of a metered action before debiting the ledger.
export const creditsPerActionType: Record<keyof CreditsConfig, number> = {
  chatTurn: PRICING.credits.chatTurn,
  documentGeneration: PRICING.credits.documentGeneration,
  cvScored: PRICING.credits.cvScored,
  phoneScreenProcessed: PRICING.credits.phoneScreenProcessed,
  knowledgeIngestionPerDoc: PRICING.credits.knowledgeIngestionPerDoc,
  awardInterpretation: PRICING.credits.awardInterpretation,
}

// -------------------------------------------------------------------------
// computeEnterprisePrice - pure helper for the multiplier model.
//
// Lifts the four worked examples in
// docs/research/enterprise-sliding-scale-analysis.md §3.4 directly:
//
//   Customer D - 220-staff multi-state retail, Full Enterprise, 3 entities,
//   ~65 roles/year:
//     base 3,995 + headcount 650 + volume 750 + entity (15% of 3,995 = 599)
//     = 5,994/mo on annual.
//
// Crucially the entity uplift is calculated against the BASE PRICE alone,
// NOT against base + headcount + volume. The analysis doc is the source
// of truth - the helper aligns with it.
//
// The monthly-rolling premium (~17%) is the ratio
// priceMonthlyRolling / priceMonthlyDisplay from the variant itself, so
// the helper stays in sync if a variant's premium ever drifts.
// -------------------------------------------------------------------------

export interface EnterpriseQuoteInputs {
  variantId: EnterpriseVariantId
  cycle: 'annual' | 'monthly-rolling'
  headcountBandIndex: number   // index into enterpriseMultipliers.headcountBands
  volumeBandIndex: number | null  // null = not applicable (People variant)
  entityBandIndex: number      // index into enterpriseMultipliers.entityBands
}

export interface EnterpriseQuoteResult {
  baseMonthly: number                    // the headline monthly equiv ($1,495 etc)
  headcountUplift: number                // 0+ AUD/mo
  volumeUplift: number                   // 0+ AUD/mo, 0 if not applicable
  entityUpliftPercent: number            // 0/15/25
  entityUpliftAmount: number             // calculated against BASE alone, rounded
  subtotalMonthlyAnnualBasis: number     // base + all uplifts (the annual-equivalent monthly)
  effectiveMonthly: number               // subtotal, plus monthly-rolling premium if cycle is monthly-rolling
  effectiveAnnualTotal: number           // subtotal * 12 (only meaningful on annual cycle)
  isStrategicTier: boolean               // true if any selected band is Strategic
  isQuotedSeparately: boolean            // true if volume band requires Bulk Hiring quote
}

export function computeEnterprisePrice(inputs: EnterpriseQuoteInputs): EnterpriseQuoteResult {
  const { variantId, cycle, headcountBandIndex, volumeBandIndex, entityBandIndex } = inputs

  const variant = PRICING.enterprise.variants.find((v) => v.id === variantId)
  if (!variant) {
    throw new Error(`computeEnterprisePrice: unknown variantId "${variantId}"`)
  }

  const mult = PRICING.enterprise.enterpriseMultipliers

  if (headcountBandIndex < 0 || headcountBandIndex >= mult.headcountBands.length) {
    throw new Error(`computeEnterprisePrice: headcountBandIndex ${headcountBandIndex} out of range`)
  }
  if (entityBandIndex < 0 || entityBandIndex >= mult.entityBands.length) {
    throw new Error(`computeEnterprisePrice: entityBandIndex ${entityBandIndex} out of range`)
  }
  if (volumeBandIndex !== null && (volumeBandIndex < 0 || volumeBandIndex >= mult.volumeBands.length)) {
    throw new Error(`computeEnterprisePrice: volumeBandIndex ${volumeBandIndex} out of range`)
  }

  const headcountBand = mult.headcountBands[headcountBandIndex]
  const entityBand = mult.entityBands[entityBandIndex]
  const volumeBand = volumeBandIndex !== null ? mult.volumeBands[volumeBandIndex] : null

  const baseMonthly = variant.priceMonthlyDisplay

  // Headcount uplift - variant-specific, null when Strategic tier.
  let headcountUplift = 0
  let headcountStrategic = false
  if (headcountBand.isStrategicTier) {
    headcountStrategic = true
  } else {
    if (variantId === 'enterprise-people') headcountUplift = headcountBand.upliftPeople ?? 0
    else if (variantId === 'enterprise-recruit') headcountUplift = headcountBand.upliftRecruit ?? 0
    else if (variantId === 'enterprise-full') headcountUplift = headcountBand.upliftFull ?? 0
  }

  // Volume uplift - not applicable to People; "quoted separately" flags Bulk Hiring.
  let volumeUplift = 0
  let volumeQuotedSeparately = false
  if (volumeBand && variantId !== 'enterprise-people') {
    if (volumeBand.isQuotedSeparately) {
      volumeQuotedSeparately = true
    } else {
      volumeUplift = volumeBand.uplift ?? 0
    }
  }

  // Entity uplift - percent of BASE price alone, per the analysis doc.
  // Customer D: 15% of $3,995 = $599 (rounded).
  let entityUpliftPercent = 0
  let entityStrategic = false
  if (entityBand.isStrategicTier) {
    entityStrategic = true
  } else {
    entityUpliftPercent = entityBand.upliftPercent ?? 0
  }
  const entityUpliftAmount = Math.round((baseMonthly * entityUpliftPercent) / 100)

  const subtotalMonthlyAnnualBasis = baseMonthly + headcountUplift + volumeUplift + entityUpliftAmount

  // Monthly-rolling premium - the ratio carried by the variant itself.
  // Apply to the post-uplift subtotal so the premium scales with the
  // effective price, not just the base.
  const rollingRatio = variant.priceMonthlyRolling / variant.priceMonthlyDisplay
  const effectiveMonthly =
    cycle === 'monthly-rolling'
      ? Math.round(subtotalMonthlyAnnualBasis * rollingRatio)
      : subtotalMonthlyAnnualBasis

  const effectiveAnnualTotal = subtotalMonthlyAnnualBasis * 12

  return {
    baseMonthly,
    headcountUplift,
    volumeUplift,
    entityUpliftPercent,
    entityUpliftAmount,
    subtotalMonthlyAnnualBasis,
    effectiveMonthly,
    effectiveAnnualTotal,
    isStrategicTier: headcountStrategic || entityStrategic,
    isQuotedSeparately: volumeQuotedSeparately,
  }
}

export type PricingTierId = PricingTier['id']

// -------------------------------------------------------------------------
// C10 self-serve model (June 2026). Source: docs/research/2026-06-23_pricing-
// deep-analysis.md Section 12. Splits the self-serve products so the
// HR-only buyer gets a cheaper door and the expensive hiring usage is a
// metered add-on. The BUNDLE reproduces today's $89 / $269 anchors and
// reuses the existing 'solo' / 'business' plan ids for checkout (so the
// Stripe/webhook/settings plumbing is unchanged). Standalone HQ People and
// HQ Recruit checkout SKUs are a follow-up - until those Stripe products
// exist, all three start on the same no-card 14-day trial.
// -------------------------------------------------------------------------

export interface C10Band { label: string; monthly: number; annualTotal?: number; credits: number }

export const C10_SELF_SERVE = {
  people: {
    name: 'HQ People',
    kicker: 'HR help',
    desc: 'The AI HR advisor, 33 documents and award help. The everyday HR product, used all year.',
    bands: [
      { label: 'up to 25', monthly: 59, annualTotal: 590, credits: 400 },
      { label: 'up to 150', monthly: 179, annualTotal: 1790, credits: 1500 },
    ] as C10Band[],
    features: [
      'AI HR advisor with Fair Work citations',
      '33 HR document templates',
      'Award interpreter',
      'Unlimited logins',
    ],
  },
  recruit: {
    name: 'HQ Recruit',
    kicker: 'Hiring help - add-on',
    desc: 'Score CVs, run video and phone interviews, build a shortlist. A metered add-on, paid when you hire.',
    bands: [
      { label: 'Light - 1 role', monthly: 40, credits: 500 },
      { label: 'Pro - unlimited roles', monthly: 120, credits: 2000 },
    ] as C10Band[],
    features: [
      'CV scoring with evidence',
      'Video + phone interviews',
      'Campaign Coach job ads',
      'Pay only when you hire',
    ],
  },
  bundle: {
    name: 'Complete',
    kicker: 'HR + hiring, best value',
    desc: 'Everything in HQ People and HQ Recruit together, at a discount. Most popular.',
    // Reuses the existing solo/business plan ids + Stripe prices.
    solo: { planId: 'solo' as const, label: 'up to 25', monthly: 89, annualTotal: 890 },
    business: { planId: 'business' as const, label: 'up to 150', monthly: 269, annualTotal: 2690 },
    features: [
      'Everything in HQ People',
      'Everything in HQ Recruit',
      'Unlimited recruit roles (Business)',
      'Founder-led onboarding (Business)',
    ],
  },
}
