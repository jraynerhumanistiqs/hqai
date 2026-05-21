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

export interface EnterpriseConfig {
  variants: EnterpriseVariant[]
  // Year-1 hard cap (strategy doc §4.2). Published on the landing page
  // and on /enterprise as both scarcity signal and service-quality
  // protection.
  capacityCapYear1: number
  inaugural: EnterpriseInauguralOffer
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
      name: 'Business',
      tagline: 'Replace your $850/mo Employsure retainer',
      priceMonthly: 249,
      priceAnnualMonthly: 207,
      priceAnnualTotal: 2490,
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
    lockedMonthly: 179,
    requiresAnnualCommit: true,
    perks: [
      'Lifetime-locked $179/mo (saving $840/yr)',
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
    salesAssistedOnly: true,
    variants: [
      {
        id: 'enterprise-people',
        name: 'HQ People Enterprise',
        tagline: 'A named Humanistiqs Advisor on the line for the hard 20% of HR.',
        priceMonthlyDisplay: 1495,
        priceAnnualTotal: 17940,
        priceMonthlyRolling: 1795,
        monthlyRollingNoticePeriodDays: 30,
        currency: 'AUD',
        contractTermMonths: 12,
        qualifyingHeadcountMin: 40,
        stripePriceIdEnvKeyAnnual: 'STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_ANNUAL',
        stripePriceIdEnvKeyMonthly: 'STRIPE_PRICE_ID_ENTERPRISE_PEOPLE_MONTHLY',
        includedSummary: [
          'Everything in Business (15 seats, 2,500 credits, unlimited recruit roles)',
          'Named Humanistiqs Advisor - same person every time, photo and direct mobile',
          'Two scheduled 45-minute advisory calls per month',
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
        name: 'HQ Recruit Enterprise',
        tagline: 'A Talent Partner running your hiring funnel. Not a recruiter, not an agency.',
        priceMonthlyDisplay: 2995,
        priceAnnualTotal: 35940,
        priceMonthlyRolling: 3495,
        monthlyRollingNoticePeriodDays: 30,
        currency: 'AUD',
        contractTermMonths: 12,
        qualifyingHeadcountMin: 50,
        stripePriceIdEnvKeyAnnual: 'STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_ANNUAL',
        stripePriceIdEnvKeyMonthly: 'STRIPE_PRICE_ID_ENTERPRISE_RECRUIT_MONTHLY',
        includedSummary: [
          'Everything in Business tier',
          'Named Humanistiqs Talent Partner running HQ Recruit on your behalf',
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
        name: 'Full Enterprise',
        tagline: 'People and Recruit. One partner team. The operating layer for both functions.',
        priceMonthlyDisplay: 3995,
        priceAnnualTotal: 47940,
        priceMonthlyRolling: 4495,
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

export type PricingTierId = PricingTier['id']
