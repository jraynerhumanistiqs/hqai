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

export interface PricingShape {
  currency: Currency
  tiers: PricingTier[]
  oneOffs: OneOffSku[]
  foundation: FoundationOffer
  trial: TrialConfig
  credits: CreditsConfig
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
