// Section 5: the pay-as-you-go marketplace tease.
//
// Reworked June 2026 from an auto-playing slider to a static, scannable
// grid (founder preference - no slider). Each document is a card with a
// Clay icon, name, price and one-line teaser, plus a "Coming soon" tag.
// Reads as a clean catalogue rather than a moving carousel.

interface Item {
  name: string
  price: string
  teaser: string
}

const ITEMS: Item[] = [
  { name: 'Letter of Offer',              price: 'from $25',    teaser: 'A ready-to-sign offer letter, done right, in 3 minutes.' },
  { name: 'Employment Contract',          price: 'from $49',    teaser: 'A full contract with all the legal bits, your details filled in.' },
  { name: 'Termination Letter',           price: 'from $45',    teaser: 'A safe letting-go letter, with the notice and final pay worked out.' },
  { name: 'First-and-Final Warning',      price: 'from $35',    teaser: 'A warning letter that holds up if it is ever challenged.' },
  { name: 'Position Description',         price: 'from $29',    teaser: 'A clean role description with the duties and pay set out.' },
  { name: 'Performance Improvement Plan', price: 'from $55',    teaser: 'A performance plan with clear goals and review dates.' },
  { name: 'Single Job Ad (SEEK-ready)',   price: 'from $39',    teaser: 'A SEEK-ready job ad in your voice, checks included.' },
  { name: 'CV Reformatting',              price: 'from $19/CV', teaser: 'Candidate CVs tidied into one clean, name-free layout.' },
  { name: 'Single Reference Check',       price: 'from $15',    teaser: 'A reference-check script with the right questions to ask.' },
]

interface Props {
  onReserve: () => void
}

export default function MarketplaceCarousel({ onReserve }: Props) {
  return (
    <section id="marketplace" className="bg-bg py-20 md:py-28" aria-labelledby="marketplace-heading">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-clay">Pay-as-you-go - launching soon</p>
        <h2 id="marketplace-heading" className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink md:text-[40px]">
          Just need one letter today? From $25.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          Buy a single HR document without a subscription. Reserve yours now - first 100 reservations get $10 off launch pricing.
        </p>

        {/* Static catalogue grid */}
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <li
              key={item.name}
              className="group relative flex flex-col rounded-3xl border border-border bg-bg-elevated p-5 shadow-card transition-colors hover:border-clay/50"
            >
              <span className="absolute right-4 top-4 rounded-full border border-border bg-bg-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Coming soon
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-soft/30">
                <DocIcon n={i} />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink">{item.name}</h3>
              <p className="mt-1 text-sm font-semibold text-clay">{item.price}</p>
              <p className="mt-2 text-sm leading-snug text-ink-soft">{item.teaser}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={onReserve}
            className="inline-flex h-12 items-center justify-center rounded-full border border-clay bg-transparent px-6 text-sm font-semibold text-clay transition-colors hover:bg-clay-soft/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            Reserve your spot -&gt;
          </button>
          <p className="text-xs text-ink-muted">First 100 reservations get $10 off launch pricing.</p>
        </div>
      </div>
    </section>
  )
}

function DocIcon({ n }: { n: number }) {
  const variants = [
    <path key="0" d="M14 8h22v32H14z M14 8l6-6h16l6 6 M22 22h12 M22 28h12" />,
    <path key="1" d="M12 10h26v30H12z M18 18h14 M18 24h14 M18 30h10" />,
    <path key="2" d="M12 12h26v28H12z M22 22l-4 4 4 4 M28 22l4 4-4 4" />,
    <path key="3" d="M14 8h22v32H14z M20 18l4 4-4 4 M28 26h-8" />,
    <path key="4" d="M12 10h26v30H12z M18 20h14 M18 26h8 M18 32h11" />,
    <path key="5" d="M14 10h22v30H14z M20 18l3 3 7-7 M20 28l3 3 7-7" />,
    <path key="6" d="M14 10h22v30H14z M20 18h14 M20 24h14 M20 30h8 M30 30h4" />,
    <path key="7" d="M12 12h26v28H12z M19 20h12 M19 26h12 M19 32h12" />,
    <path key="8" d="M12 10h26v30H12z M20 22h10 M20 28h10 M25 16v18" />,
  ]
  return (
    <svg viewBox="0 0 50 50" className="h-6 w-6 text-clay" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {variants[n] ?? variants[0]}
    </svg>
  )
}
