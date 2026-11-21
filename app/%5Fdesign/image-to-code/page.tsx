// Design pilot: the homepage recomposed under the `image-to-code` skill.
//
// WHAT THIS IS
// A side-by-side candidate for `/`, built so the real home page stays
// untouched. The composition here was extracted from four generated
// reference images (hero, contrast, product showcase, closing CTA), all
// prompted hard against the existing HQ.ai marketing brand so generation
// could not invent a palette.
//
// WHAT CAME FROM THE IMAGES - composition only:
//   - the hero carries a headline, two lines of support, one CTA and ONE
//     card. No eyebrow, no second tile, no feature strip.
//   - sections are divided by hairlines, not by bordered filled cards.
//   - at most ONE framing container per section; several have none.
//   - no icons anywhere.
//   - the gold appears once, at most twice, per section.
//   - eyebrows are occasional, not on every section.
//
// WHAT DID NOT COME FROM THE IMAGES:
//   - colour, type and radius. Those are owned by the token system
//     (tailwind.config.ts + app/globals.css) and are read from tokens
//     here, never sampled from a render.
//   - copy. The generated images invented their own wording and claims
//     (payroll, superannuation, Fair Work rule tracking) which HQ.ai does
//     not do. Every string below is carried from the live homepage
//     components or from lib/pricing-config.ts.
//
// Entrances are the existing CSS keyframes in app/globals.css. No JS
// animation library - motion must never own visibility.
//
// Copy rules: Australian English, plain hyphens only, ASCII apostrophes.

import Link from 'next/link'
import MarketingHeader from '@/components/landing/MarketingHeader'
import MarketingFooter from '@/components/landing/MarketingFooter'
import { C10_SELF_SERVE } from '@/lib/pricing-config'
import ToolPanels from './ToolPanels'

export const metadata = {
  title: 'Design pilot - image-to-code',
  robots: { index: false, follow: false },
}

const { people, recruit, bundle } = C10_SELF_SERVE

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

// Reference 02 carries a gold uppercase micro-label with NO leading rule.
// The live page pairs every eyebrow with a 20px gold dash; dropping it is
// part of the micro-UI reduction.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-clay">{children}</p>
  )
}

function Section({
  id,
  labelledBy,
  children,
}: {
  id?: string
  labelledBy?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="border-t border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-10">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 1. Hero - reference 01                                              */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative isolate" aria-labelledby="pilot-hero-heading">
      {/* Single column until lg - at tablet width the split squeezed the
          headline to five lines, past the three-line ceiling the hero
          references hold to. */}
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-24 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
        <div className="max-w-2xl">
          <h1
            id="pilot-hero-heading"
            style={{ animationDelay: '40ms' }}
            className="hq-hero-lead font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[40px] md:text-[42px] lg:text-[46px]"
          >
            HR and hiring are complicated. HQ.ai makes it{' '}
            <span className="text-clay">easy, quick and accurate.</span>
          </h1>

          {/* Reference 01 allows two short lines here. The live hero runs
              five sentences; these two are carried from it verbatim. */}
          <p
            style={{ animationDelay: '150ms' }}
            className="hq-hero-rise mt-7 max-w-md text-lg leading-relaxed text-ink-soft"
          >
            HQ.ai handles the everyday HR work and hiring processes that cost you time and money.
            From $59/month. Cancel any time.
          </p>

          <div style={{ animationDelay: '260ms' }} className="hq-hero-rise mt-10">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-7 text-sm font-semibold text-ink-on-clay shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              Get started
            </Link>
          </div>
        </div>

        {/* ONE card. The live hero stacks a live chat preview AND a second
            scorecard tile; reference 01 shows a single quiet panel. */}
        <div style={{ animationDelay: '150ms' }} className="hq-hero-rise">
          <div className="rounded-3xl border border-border bg-bg-soft p-6 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">You</p>
            <div className="mt-2 rounded-2xl rounded-tl-md bg-bg-elevated px-5 py-4 text-sm leading-relaxed text-ink">
              One of my casuals has been on the same roster for a year. Do I have to offer them
              permanent work?
            </div>

            <p className="mt-6 text-right font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              HQ People
            </p>
            <div className="mt-2 rounded-2xl rounded-tr-md border border-border px-5 py-4 text-sm leading-relaxed text-ink-soft">
              Yes - after 12 months with a regular pattern you need to make a written offer, and
              record it either way. Here is the wording to send them.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Contrast - reference 02: hairline columns, no cards, no icons    */
/* ------------------------------------------------------------------ */

const CONTRAST = [
  {
    topic: 'People decisions',
    without: 'Googling for an hour, then second-guessing the answer anyway.',
    with: 'The right answer in under a minute, in plain English.',
  },
  {
    topic: 'Hiring',
    without: '80 CVs, six interviews, and a hire you picked on gut feel.',
    with: 'Every CV scored in minutes. Quick interviews. A clear shortlist.',
  },
  {
    topic: 'The cost',
    without: 'A retainer you pay every month and use twice a year.',
    with: 'From $59 a month. No lock-in. Cancel any time.',
  },
]

function Contrast() {
  return (
    <Section labelledBy="pilot-problem-heading">
      <Eyebrow>The problem</Eyebrow>
      <h2
        id="pilot-problem-heading"
        className="mt-5 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]"
      >
        As your business gets busier, HR and hiring doesn&apos;t get easier.
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        You didn&apos;t start a business to become an HR or Recruitment Manager. Here is the old
        way, next to the HQ.ai way.
      </p>

      {/* Three columns divided by hairlines only. The live page wraps each
          of these in a rounded-3xl bordered, filled, shadowed card with an
          inner header row and two circular icon badges. */}
      <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-0">
        {CONTRAST.map((c, i) => (
          <div
            key={c.topic}
            className={[
              'md:px-8',
              i === 0 ? 'md:pl-0' : 'md:border-l md:border-border',
              i === CONTRAST.length - 1 ? 'md:pr-0' : '',
            ].join(' ')}
          >
            <h3 className="font-display text-lg font-semibold tracking-tight text-ink">{c.topic}</h3>
            <p className="mt-5 text-sm leading-relaxed text-ink-muted line-through decoration-ink-muted/40">
              {c.without}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-ink">{c.with}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Stat band - already hairline-ruled on the live page; eyebrow cut */
/* ------------------------------------------------------------------ */

const DELTAS = [
  { from: 'Half a day', to: '3 minutes', label: 'to sort a typical HR question' },
  { from: '$850/mo', to: 'from $59', label: 'for everyday HR help' },
  { from: '80 CVs by hand', to: 'minutes', label: 'to score a stack of applicants' },
]

function StatBand() {
  return (
    <Section labelledBy="pilot-metrics-heading">
      <h2 id="pilot-metrics-heading" className="sr-only">
        The difference
      </h2>
      <dl className="grid gap-12 md:grid-cols-3 md:gap-0">
        {DELTAS.map((d, i) => (
          <div
            key={d.label}
            className={[
              'text-center md:px-8',
              i === 0 ? 'md:pl-0' : 'md:border-l md:border-border',
              i === DELTAS.length - 1 ? 'md:pr-0' : '',
            ].join(' ')}
          >
            <dd className="font-display text-sm font-medium text-ink-muted line-through decoration-ink-muted/40">
              {d.from}
            </dd>
            <dd className="mt-3 font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink md:text-[52px]">
              {d.to}
            </dd>
            <dt className="mt-4 text-sm leading-relaxed text-ink-soft">{d.label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-12 text-center text-[11px] text-ink-muted">
        Estimates based on our own modelling against typical Australian retainer prices.
      </p>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Tools - reference 03: one framed panel under two text tabs       */
/* ------------------------------------------------------------------ */

function Tools() {
  return (
    <Section id="product" labelledBy="pilot-tools-heading">
      <h2
        id="pilot-tools-heading"
        className="max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]"
      >
        One login. Everything people and hiring.
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        Two tools, one location. Tap through to see each one in action.
      </p>
      <ToolPanels />
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 5. Industries - no icons, no cards, no carousel                     */
/* ------------------------------------------------------------------ */

const INDUSTRIES = [
  { label: 'Pubs and hospitality', pain: 'Casuals, split shifts and penalty rates, worked out without picking up the phone.' },
  { label: 'Cafes and restaurants', pain: 'Rosters, junior pay and a quick casual hire, sorted between services.' },
  { label: 'Trades and construction', pain: 'Apprentice pay, notice periods and warnings, without leaving the job.' },
  { label: 'Retail', pain: 'A clear answer on rosters, probation and seasonal hiring in minutes.' },
  { label: 'Clinics and allied health', pain: 'Classifications, leave and what you have to keep on file, without the admin pile-up.' },
  { label: 'Medical and dental', pain: 'Onboarding, leave and the rules for a busy practice, answered in minutes.' },
  { label: 'Fitness and gyms', pain: 'Casual trainers, shift cover and pay, answered on the spot.' },
  { label: 'Beauty and salons', pain: 'Junior pay, probation and warnings, without booking a consultant.' },
  { label: 'Childcare and early learning', pain: 'Onboarding, leave and the records you keep for your educators, in plain English.' },
  { label: 'Professional services', pain: 'Straight answers on hiring, performance and pay.' },
  { label: 'Real estate', pain: 'How commission roles, hiring and pay actually work, without the guesswork.' },
  { label: 'Automotive', pain: 'Apprentices, shift cover and warnings, handled between jobs.' },
  { label: 'Transport and logistics', pain: 'Driver onboarding, hours and pay, explained clearly.' },
  { label: 'Not-for-profits', pain: 'Volunteers, casual staff and the rules that apply, without the overhead.' },
  { label: 'Agriculture', pain: 'Seasonal workers, pay rates and hours, sorted before the season starts.' },
]

function Industries() {
  return (
    <Section labelledBy="pilot-industry-heading">
      <Eyebrow>Who it&apos;s for</Eyebrow>
      <h2
        id="pilot-industry-heading"
        className="mt-5 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]"
      >
        Built for your industry, not a corporate HR team.
      </h2>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        No matter the industry or the types of everyday people challenges you face, HQ.ai has the
        answers.
      </p>

      {/* 15 plain typographic entries. The live page renders these as 15
          bordered, filled cards with a bespoke SVG icon each, paginated
          behind a carousel with arrows and dots. */}
      <ul className="mt-14 grid gap-x-10 border-t border-border sm:grid-cols-2 lg:grid-cols-3">
        {INDUSTRIES.map((p) => (
          <li key={p.label} className="border-b border-border py-6">
            <h3 className="font-display text-base font-semibold tracking-tight text-ink">
              {p.label}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.pain}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 6. Story - container removed, rendered as an editorial pull quote   */
/* ------------------------------------------------------------------ */

const OUTCOMES = [
  'Saved ~10 hours a week on HR admin',
  'Cancelled the $850/mo retainer in week two',
  'Filled two roles in three days with HQ Recruit',
]

function Story() {
  return (
    <Section labelledBy="pilot-story-heading">
      <Eyebrow>What this looks like for real</Eyebrow>
      <h2
        id="pilot-story-heading"
        className="mt-5 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]"
      >
        Pat ran an HR team of one. Now he has HQ.ai.
      </h2>

      {/* No card and no decorative quote-mark glyph - the type carries it. */}
      <blockquote className="mt-14 max-w-4xl font-display text-[24px] font-semibold leading-snug tracking-tight text-ink md:text-[32px]">
        &ldquo;I cancelled our $850 a month outsourced HR retainer in the second week. The HQ People
        Advisor answered my questions in minutes - the same questions I was put on a 20 minute hold
        for by my previous provider. And when we had two roles to fill, HQ Recruit did the sorting
        for us.&rdquo;
      </blockquote>
      <p className="mt-8 text-sm text-ink-muted">
        Pat M., owner-operator, 38-person hospitality group, NSW.
      </p>

      <dl className="mt-14 grid gap-10 border-t border-border pt-10 md:grid-cols-3 md:gap-0">
        {OUTCOMES.map((o, i) => (
          <div
            key={o}
            className={[
              'md:px-8',
              i === 0 ? 'md:pl-0' : 'md:border-l md:border-border',
              i === OUTCOMES.length - 1 ? 'md:pr-0' : '',
            ].join(' ')}
          >
            <dd className="text-[15px] leading-relaxed text-ink-soft">{o}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 text-[11px] text-ink-muted">
        Composite case based on early access customer interviews; details anonymised. Real-name
        testimonials shipping at v2.
      </p>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 7. Retainer comparison - hairline table, no outer card              */
/* ------------------------------------------------------------------ */

const ROWS: Array<[string, string, string, string]> = [
  ['Average monthly cost', 'From $59', '~$850/mo', '$0 (with risk)'],
  ['Contract length', 'Cancel anytime', 'Multi-year lock-in (typical)', 'n/a'],
  ['Pricing', 'Published, transparent', 'Quote on a sales call', 'n/a'],
  ['Answers the everyday questions', 'Yes', 'Sometimes', 'No'],
  ['Covers hiring too', 'Yes - full recruit suite', 'Usually extra', 'No'],
]

function Comparison() {
  return (
    <Section labelledBy="pilot-comparison-heading">
      <Eyebrow>The retainer trap</Eyebrow>
      <h2
        id="pilot-comparison-heading"
        className="mt-5 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]"
      >
        Don&apos;t lock into a multi-year contract for support you&apos;re not ready to use.
      </h2>
      <p className="mt-6 max-w-2xl text-base text-ink-soft md:text-lg">
        The same everyday HR and hiring support, minus the lock-in contract with exit penalties, and
        the wait. A fraction of the price. Cancel any time.
      </p>

      {/* No outer card, no filled header band - hairlines only. */}
      <div className="mt-14 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-border">
              <th scope="col" className="py-4 pr-6 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                &nbsp;
              </th>
              <th scope="col" className="py-4 pr-6 font-mono text-[11px] uppercase tracking-[0.06em] text-clay">
                HQ.ai
              </th>
              <th scope="col" className="py-4 pr-6 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                Traditional HR &amp; recruitment retainer
              </th>
              <th scope="col" className="py-4 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                DIY
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, hq, retainer, diy]) => (
              <tr key={label} className="border-b border-border">
                <th scope="row" className="py-5 pr-6 font-medium text-ink">
                  {label}
                </th>
                <td className="py-5 pr-6 font-semibold text-ink">{hq}</td>
                <td className="py-5 pr-6 text-ink-soft">{retainer}</td>
                <td className="py-5 text-ink-soft">{diy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-10 max-w-3xl text-sm leading-relaxed text-ink-soft">
        <strong className="text-ink">Worth knowing:</strong> in 2020 the Federal Court ordered a $3
        million penalty against a major Australian workplace-advice firm for unfair contract terms
        and misleading conduct. Always read the contract before you sign a multi-year retainer.
      </p>
      <p className="mt-4 max-w-3xl text-xs text-ink-muted">
        Sources: retainer pricing per public SmartCompany reporting; Federal Court penalty per the
        ACCC public record (accc.gov.au). Comparison is to a typical HR retainer, not any specific
        provider.
      </p>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 8. Pricing - one container, hairline columns, one filled CTA        */
/* ------------------------------------------------------------------ */

interface Plan {
  kicker: string
  name: string
  price: string
  sub: string
  features: string[]
  cta: string
  href: string
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    kicker: 'HR only',
    name: people.name,
    price: `$${people.bands[0].monthly}`,
    sub: `For a team ${people.bands[0].label}. $${people.bands[1].monthly}/mo ${people.bands[1].label}.`,
    features: people.features.slice(0, 5),
    cta: 'Start with HQ People',
    href: '/signup?plan=people-solo&cycle=monthly',
  },
  {
    kicker: recruit.kicker,
    name: recruit.name,
    price: `$${recruit.standaloneMonthly}`,
    sub: `Hiring on its own, billed monthly. Go Pro for unlimited roles at $${recruit.bands[1].monthly}/mo.`,
    features: recruit.features,
    cta: 'Start with HQ Recruit',
    href: `/signup?plan=${recruit.standalonePlanId}`,
  },
  {
    kicker: bundle.kicker,
    name: bundle.name,
    price: `$${bundle.solo.monthly}`,
    sub: `For a team ${bundle.solo.label}. Everything in HQ People and HQ Recruit, together.`,
    features: bundle.features,
    cta: 'Start with HQ Business',
    href: `/signup?plan=${bundle.solo.planId}&cycle=monthly`,
    highlight: true,
  },
]

function Pricing() {
  return (
    <Section id="pricing" labelledBy="pilot-pricing-heading">
      <Eyebrow>Plans</Eyebrow>
      <h2
        id="pilot-pricing-heading"
        className="mt-5 max-w-3xl font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]"
      >
        Pick what you need: HR, hiring, or both.
      </h2>
      <p className="mt-6 max-w-2xl text-base text-ink-soft md:text-lg">
        HR only with HQ People, hiring only with HQ Recruit, or both with HQ Business - the
        best-value way to get the lot. Unlimited logins on every plan, with no lock-in.
      </p>

      {/* ONE container, three hairline-divided columns - not three cards. */}
      <div className="mt-14 grid rounded-3xl border border-border md:grid-cols-3">
        {PLANS.map((p, i) => (
          <div
            key={p.name}
            className={[
              'flex flex-col p-8',
              i === 0 ? '' : 'border-t border-border md:border-l md:border-t-0',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
                {p.kicker}
              </p>
              {p.highlight && (
                <span className="rounded-full bg-clay px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-on-clay">
                  Best value
                </span>
              )}
            </div>

            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-ink">{p.name}</h3>
            <p className="mt-5 font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink">
              {p.price}
              <span className="ml-1 text-sm font-normal text-ink-muted">/mo</span>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">{p.sub}</p>

            <ul className="mt-7 flex-1 space-y-2.5 text-sm text-ink-soft">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            <div className="mt-9">
              <Link
                href={p.href}
                className={[
                  'inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay',
                  p.highlight
                    ? 'bg-clay text-ink-on-clay shadow-card hover:bg-clay-hover'
                    : 'border border-border-strong text-ink hover:border-ink-muted',
                ].join(' ')}
              >
                {p.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink-muted">
        Three minutes from here: create your account, answer a few questions about your business,
        start your plan. Unlimited logins on every plan - you are never charged per person.
      </p>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 9. FAQ - native disclosure, hairline rules                          */
/* ------------------------------------------------------------------ */

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Will it actually save me time?',
    a: "Yes. That's the whole point. A job that used to eat half a day - Googling, calling an advisor, waiting for a callback - takes three minutes here. We track it for every customer in their first month.",
  },
  {
    q: 'Why pay when I can just Google it?',
    a: 'Google gives you 47 American answers and a few Fair Work pages buried on page two. We give you the right answer for your business in 30 seconds, and show you where it comes from. Your time is worth more than $59 a month.',
  },
  {
    q: 'Can I trust the AI on real decisions?',
    a: 'Every answer is in plain English with the working shown, so you can sanity-check it yourself. And when it gets tricky, the same real advisor steps in - you never repeat yourself.',
  },
  {
    q: 'What does it cost?',
    a: 'Pick what you need. HQ People (HR help) is from $59 a month. HQ Recruit (hiring) is a $40 add-on. Or take the HQ Business bundle - $89 a month for a small team, $269 for a bigger one. Every plan has unlimited logins. Cancel any time.',
  },
  {
    q: 'Do you offer a dedicated advisor?',
    a: 'Yes. HR365 gives you a dedicated Humanistiqs HR advisor on call; Recruit365 is the recruitment equivalent. HR365 starts at $799 a month and includes 3 advisor hours, with extra time at $250 an hour. We only take on 10 in 2026. See our outsourced HR & recruitment page for more.',
  },
  {
    q: 'How long does setup take?',
    a: 'Three minutes. Sign up, tell us your industry, and we pick the right award for you and remember it. Nothing to install. The chat just works.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In Sydney, on Australian servers. We follow the Australian Privacy Principles 1-13. We never sell it.',
  },
  {
    q: 'Why trust an Aussie startup over the big HR platforms?',
    a: 'Because we are built to help you make decisions - not to run payroll or sell you a panic-button contract. Different problem, different tool. And the same real advisor is there when the AI hits its limit, not a new person every call.',
  },
]

function Faq() {
  return (
    <Section labelledBy="pilot-faq-heading">
      <div className="mx-auto max-w-3xl">
        <h2
          id="pilot-faq-heading"
          className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-ink md:text-[44px]"
        >
          The stuff you&apos;re wondering.
        </h2>

        <div className="mt-12 border-t border-border">
          {FAQS.map((item) => (
            <details key={item.q} name="pilot-faq" className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-medium text-ink transition-colors hover:text-ink-soft [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-sm text-ink-muted group-open:hidden"
                >
                  +
                </span>
                <span
                  aria-hidden
                  className="hidden shrink-0 font-mono text-sm text-ink-muted group-open:inline"
                >
                  -
                </span>
              </summary>
              <p className="pb-6 text-sm leading-relaxed text-ink-soft md:text-base">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ */
/* 10. Closing CTA - reference 04                                      */
/* ------------------------------------------------------------------ */

function ClosingCta() {
  return (
    <section className="border-t border-border py-28 md:py-36" aria-labelledby="pilot-cta-heading">
      <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
        <h2
          id="pilot-cta-heading"
          className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-ink md:text-[52px]"
        >
          Three minutes. Better decisions today.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-base text-ink-soft md:text-lg">
          You&apos;ll have your first HR question answered and your team set up before the kettle
          boils.
        </p>
        <div className="mt-10">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-clay px-8 text-sm font-semibold text-ink-on-clay shadow-card transition-colors hover:bg-clay-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            Get started - it&apos;s three minutes
          </Link>
        </div>

        <div className="mt-20 border-t border-border pt-8 text-sm text-ink-muted">
          Built for Australian workplaces. Hosted in Sydney. Made in Australia.
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

export default function ImageToCodePilot() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-bg text-ink antialiased">
        <Hero />
        <Contrast />
        <StatBand />
        <Tools />
        <Industries />
        <Story />
        <Comparison />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <MarketingFooter />
    </>
  )
}
