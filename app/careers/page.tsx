import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { businessSlug, campaignSlug } from '@/lib/slugs'

export const dynamic = 'force-dynamic'
export const revalidate = 600

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://hqai.vercel.app'

export const metadata: Metadata = {
  title: 'Hiring with HQ.ai · Open roles across Australia',
  description:
    'Live roles published by Australian businesses using HQ.ai. Indexed by Google for Jobs and Jora.',
  alternates: { canonical: `${BASE_URL}/careers` },
}

interface Row {
  id: string
  role_profile: { title?: string; location?: { suburb?: string; state?: string } } | null
  launched_at: string | null
  created_at: string
  businesses: { id: string; name: string; slug?: string | null } | null
}

async function fetchRecent(): Promise<Row[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select(
        `id, role_profile, launched_at, created_at,
         businesses:businesses ( id, name, slug )`,
      )
      .eq('status', 'launched')
      .order('launched_at', { ascending: false })
      .limit(10)
    if (error || !data) return []
    return data as unknown as Row[]
  } catch {
    return []
  }
}

export default async function CareersIndexPage() {
  const rows = await fetchRecent()

  const itemListJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'ItemList',
    itemListElement: rows
      .filter((r) => r.businesses)
      .map((r, i) => {
        const biz = r.businesses!
        const bs = businessSlug({ id: biz.id, slug: biz.slug, name: biz.name })
        const cs = campaignSlug({ id: r.id, role_profile: r.role_profile || undefined })
        return {
          '@type': 'ListItem',
          position: i + 1,
          url: `${BASE_URL}/careers/${bs}/${cs}`,
          name: r.role_profile?.title || 'Role',
        }
      }),
  }

  return (
    <main className="min-h-screen bg-white text-charcoal">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <header className="sticky top-0 z-10 w-full bg-white border-b border-border">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="font-display font-bold text-xl text-black">HQ.ai</Link>
          <Link
            href="/"
            className="bg-light rounded-full px-3 py-1 text-xs font-bold text-mid hover:bg-border transition"
          >
            Powered by HQ.ai
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10">
        <div className="text-xs uppercase tracking-wider text-mid font-bold">Hiring with HQ.ai</div>
        <h1 className="mt-3 text-display font-display font-bold text-charcoal leading-tight">
          Open roles
        </h1>
        <p className="mt-4 text-mid max-w-xl">
          Every role our businesses post lives at{' '}
          <code className="bg-light rounded px-1.5 py-0.5 text-xs">
            /careers/&lt;business&gt;/&lt;role&gt;
          </code>
          . Listings are picked up by Google for Jobs and Jora automatically.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20">
        {rows.length === 0 ? (
          <div className="bg-white shadow-card rounded-2xl p-8 text-center text-mid">
            No roles published yet. Check back soon.
          </div>
        ) : (
          <ul className="space-y-3">
            {rows
              .filter((r) => r.businesses)
              .map((r) => {
                const biz = r.businesses!
                const bs = businessSlug({ id: biz.id, slug: biz.slug, name: biz.name })
                const cs = campaignSlug({ id: r.id, role_profile: r.role_profile || undefined })
                const loc = [r.role_profile?.location?.suburb, r.role_profile?.location?.state]
                  .filter(Boolean)
                  .join(', ')
                return (
                  <li key={r.id}>
                    <Link
                      href={`/careers/${bs}/${cs}`}
                      className="block bg-white shadow-card rounded-2xl p-6 hover:translate-y-[-1px] transition"
                    >
                      <div className="text-xs uppercase tracking-wider text-mid font-bold">
                        {biz.name}
                      </div>
                      <div className="mt-1 font-display text-xl font-bold text-charcoal">
                        {r.role_profile?.title || 'Role'}
                      </div>
                      {loc && <div className="mt-1 text-sm text-mid">{loc}</div>}
                    </Link>
                  </li>
                )
              })}
          </ul>
        )}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-mid">
          © {new Date().getFullYear()} HQ.ai · Hosted by Humanistiqs · Equal opportunity.
        </div>
      </footer>
    </main>
  )
}
