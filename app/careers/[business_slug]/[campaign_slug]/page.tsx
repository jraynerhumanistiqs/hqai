import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { businessSlug, campaignSlug, extractCampaignShortId } from '@/lib/slugs'

export const dynamic = 'force-dynamic'
export const revalidate = 300

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://hqai.vercel.app'

interface JobAdDraft {
  blocks: {
    overview?: string
    about_us?: string
    responsibilities?: string[]
    requirements?: { must?: string[]; nice?: string[] }
    benefits?: string[]
    apply_cta?: string
  }
}

interface RoleProfile {
  title: string
  level?: string
  contract_type?: string
  hours_per_week?: number
  location?: { suburb?: string; state?: string; postcode?: string; country?: string }
  salary?: { min?: number; max?: number; currency?: string; period?: string }
  award?: { code?: string; classification?: string }
}

interface BusinessRow {
  id: string
  name: string
  slug?: string | null
  website?: string | null
  industry?: string | null
  state?: string | null
}

interface CampaignRow {
  id: string
  business_id: string
  prescreen_session_id: string | null
  role_profile: RoleProfile
  job_ad_draft: JobAdDraft
  status: 'draft' | 'launched' | 'archived'
  launched_at: string | null
  created_at: string
  businesses: BusinessRow | null
}

async function fetchCampaign(bizSlug: string, campSlug: string): Promise<CampaignRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select(
        `id, business_id, prescreen_session_id, role_profile, job_ad_draft,
         status, launched_at, created_at,
         businesses:businesses ( id, name, slug, website, industry, state )`,
      )
      .eq('status', 'launched')
      .order('launched_at', { ascending: false })
      .limit(200)

    if (error || !data) return null

    const shortId = extractCampaignShortId(campSlug)
    const match = (data as unknown as CampaignRow[]).find((row) => {
      const biz = row.businesses
      if (!biz) return false
      const computedBizSlug = businessSlug({ id: biz.id, slug: biz.slug, name: biz.name })
      const computedCampSlug = campaignSlug({ id: row.id, role_profile: row.role_profile })
      if (computedBizSlug !== bizSlug) return false
      if (computedCampSlug === campSlug) return true
      if (shortId && row.id.replace(/-/g, '').startsWith(shortId)) return true
      return false
    })

    return match || null
  } catch {
    return null
  }
}

function mapEmploymentType(contract?: string): string {
  switch (contract) {
    case 'permanent_ft': return 'FULL_TIME'
    case 'permanent_pt': return 'PART_TIME'
    case 'contract':
    case 'fixed_term': return 'CONTRACTOR'
    case 'casual':
    case 'temporary': return 'TEMPORARY'
    case 'intern': return 'INTERN'
    case 'volunteer': return 'VOLUNTEER'
    default: return 'FULL_TIME'
  }
}

function contractLabel(contract?: string): string | null {
  const map: Record<string, string> = {
    permanent_ft: 'Full-time',
    permanent_pt: 'Part-time',
    casual: 'Casual',
    fixed_term: 'Fixed term',
    contract: 'Contract',
    intern: 'Internship',
    volunteer: 'Volunteer',
  }
  return contract ? map[contract] || null : null
}

function formatSalary(s?: RoleProfile['salary']): string | null {
  if (!s || (!s.min && !s.max)) return null
  const cur = s.currency || 'AUD'
  const period = (s.period || 'year').toLowerCase()
  const fmt = (n?: number) => (n ? `$${Math.round(n).toLocaleString('en-AU')}` : '')
  if (s.min && s.max) return `${fmt(s.min)}-${fmt(s.max)} ${cur} / ${period}`
  return `${fmt(s.min || s.max)} ${cur} / ${period}`
}

function formatLocation(loc?: RoleProfile['location']): string | null {
  if (!loc) return null
  const parts = [loc.suburb, loc.state].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function renderDescriptionHtml(draft: JobAdDraft, businessName: string): string {
  const b = draft.blocks || {}
  const esc = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const sections: string[] = []
  if (b.overview) sections.push(`<p>${esc(b.overview)}</p>`)
  if (b.about_us) sections.push(`<h3>About ${esc(businessName)}</h3><p>${esc(b.about_us)}</p>`)
  if (b.responsibilities?.length) {
    sections.push(`<h3>Responsibilities</h3><ul>${b.responsibilities.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`)
  }
  if (b.requirements?.must?.length) {
    sections.push(`<h3>Must-haves</h3><ul>${b.requirements.must.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`)
  }
  if (b.requirements?.nice?.length) {
    sections.push(`<h3>Nice-to-haves</h3><ul>${b.requirements.nice.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`)
  }
  if (b.benefits?.length) {
    sections.push(`<h3>Benefits</h3><ul>${b.benefits.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`)
  }
  return sections.join('\n')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ business_slug: string; campaign_slug: string }>
}): Promise<Metadata> {
  const { business_slug, campaign_slug } = await params
  const campaign = await fetchCampaign(business_slug, campaign_slug)
  if (!campaign || !campaign.businesses) {
    return { title: 'Role not found · HQ.ai' }
  }
  const role = campaign.role_profile
  const biz = campaign.businesses
  const overview = campaign.job_ad_draft.blocks?.overview || ''
  const description = overview.slice(0, 160).trim()
  const canonical = `${BASE_URL}/careers/${business_slug}/${campaign_slug}`
  const title = `${role.title} · ${biz.name} · Hiring with HQ.ai`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: 'HQ.ai Careers',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function CareersCampaignPage({
  params,
}: {
  params: Promise<{ business_slug: string; campaign_slug: string }>
}) {
  const { business_slug, campaign_slug } = await params
  const campaign = await fetchCampaign(business_slug, campaign_slug)
  if (!campaign || !campaign.businesses) notFound()

  const role = campaign.role_profile
  const biz = campaign.businesses!
  const draft = campaign.job_ad_draft
  const blocks = draft.blocks || {}

  const launchedAt = campaign.launched_at || campaign.created_at
  const validThrough = (() => {
    const d = new Date(launchedAt)
    d.setDate(d.getDate() + 60)
    return d.toISOString()
  })()

  const applyHref = campaign.prescreen_session_id ? `/prescreen/${campaign.prescreen_session_id}` : null
  const canonical = `${BASE_URL}/careers/${business_slug}/${campaign_slug}`
  const descriptionHtml = renderDescriptionHtml(draft, biz.name)

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: role.title,
    description: descriptionHtml,
    datePosted: new Date(launchedAt).toISOString(),
    validThrough,
    employmentType: mapEmploymentType(role.contract_type),
    hiringOrganization: {
      '@type': 'Organization',
      name: biz.name,
      sameAs: biz.website || null,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: role.location?.suburb || null,
        addressRegion: role.location?.state || biz.state || null,
        postalCode: role.location?.postcode || null,
        addressCountry: role.location?.country || 'AU',
      },
    },
    directApply: true,
    applicantLocationRequirements: { '@type': 'Country', name: 'Australia' },
    url: canonical,
  }
  if (role.salary && (role.salary.min || role.salary.max)) {
    jsonLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: role.salary.currency || 'AUD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: role.salary.min ?? role.salary.max,
        maxValue: role.salary.max ?? role.salary.min,
        unitText: (role.salary.period || 'YEAR').toUpperCase(),
      },
    }
  }

  const chips: string[] = []
  const loc = formatLocation(role.location)
  if (loc) chips.push(loc)
  const ct = contractLabel(role.contract_type)
  if (ct) chips.push(ct)
  if (role.hours_per_week) chips.push(`${role.hours_per_week} hrs/wk`)
  const sal = formatSalary(role.salary)
  if (sal) chips.push(sal)
  if (role.level) chips.push(role.level.charAt(0).toUpperCase() + role.level.slice(1))
  if (role.award?.code) chips.push(`Award ${role.award.code}`)

  return (
    <main className="min-h-screen bg-white text-charcoal">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
        <div className="text-xs uppercase tracking-wider text-mid font-bold">{biz.name}</div>
        <h1 className="mt-3 text-display font-display font-bold text-charcoal leading-tight">
          {role.title}
        </h1>
        {chips.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span key={c} className="bg-light rounded-full px-3 py-1 text-xs font-bold text-mid">
                {c}
              </span>
            ))}
          </div>
        )}
        {applyHref && (
          <div className="mt-8">
            <Link
              href={applyHref}
              className="inline-block bg-black text-white rounded-full px-8 py-3 text-sm font-bold hover:opacity-90 transition"
            >
              Apply now
            </Link>
          </div>
        )}
      </section>

      <article className="mx-auto max-w-2xl px-6 pb-16 space-y-10">
        {blocks.overview && (
          <Section heading="Overview">
            <p className="whitespace-pre-line">{blocks.overview}</p>
          </Section>
        )}
        {blocks.about_us && (
          <Section heading={`About ${biz.name}`}>
            <div className="prose prose-neutral max-w-none whitespace-pre-line">
              {blocks.about_us}
            </div>
          </Section>
        )}
        {blocks.responsibilities && blocks.responsibilities.length > 0 && (
          <Section heading="Responsibilities">
            <ul className="list-disc pl-5 space-y-2">
              {blocks.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}
        {blocks.requirements?.must && blocks.requirements.must.length > 0 && (
          <Section heading="Must-haves">
            <ul className="list-disc pl-5 space-y-2">
              {blocks.requirements.must.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}
        {blocks.requirements?.nice && blocks.requirements.nice.length > 0 && (
          <Section heading="Nice-to-haves">
            <ul className="list-disc pl-5 space-y-2">
              {blocks.requirements.nice.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}
        {blocks.benefits && blocks.benefits.length > 0 && (
          <Section heading="Benefits">
            <ul className="list-disc pl-5 space-y-2">
              {blocks.benefits.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Section>
        )}

        {applyHref && (
          <div className="pt-6 border-t border-border">
            <Link
              href={applyHref}
              className="inline-block bg-black text-white rounded-full px-8 py-3 text-sm font-bold hover:opacity-90 transition"
            >
              {blocks.apply_cta || 'Apply now'}
            </Link>
            <p className="mt-3 text-xs text-mid">
              You will be taken to a short video prescreen - no account needed.
            </p>
          </div>
        )}
      </article>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-mid">
          © {new Date().getFullYear()} {biz.name} · Hosted by HQ.ai · Equal opportunity employer.
        </div>
      </footer>
    </main>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider font-bold text-mid mb-3">{heading}</h2>
      <div className="text-base text-charcoal leading-relaxed">{children}</div>
    </section>
  )
}
