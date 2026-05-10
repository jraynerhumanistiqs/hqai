import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { businessSlug, campaignSlug } from '@/lib/slugs'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.humanistiqs.ai'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select(
        `id, role_profile, launched_at,
         businesses:businesses ( id, name, slug )`,
      )
      .eq('status', 'launched')
      .order('launched_at', { ascending: false })
      .limit(5000)

    if (error || !data) {
      return [{ url: `${BASE_URL}/careers`, changeFrequency: 'daily', priority: 0.5 }]
    }

    const rows = data as unknown as Array<{
      id: string
      role_profile: { title?: string } | null
      launched_at: string | null
      businesses: { id: string; name: string; slug?: string | null } | null
    }>

    const entries: MetadataRoute.Sitemap = rows
      .filter((r) => r.businesses)
      .map((r) => {
        const biz = r.businesses!
        const bs = businessSlug({ id: biz.id, slug: biz.slug, name: biz.name })
        const cs = campaignSlug({ id: r.id, role_profile: r.role_profile || undefined })
        return {
          url: `${BASE_URL}/careers/${bs}/${cs}`,
          lastModified: r.launched_at ? new Date(r.launched_at) : new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.7,
        }
      })

    entries.unshift({
      url: `${BASE_URL}/careers`,
      changeFrequency: 'daily',
      priority: 0.5,
      lastModified: new Date(),
    })

    return entries
  } catch {
    return [{ url: `${BASE_URL}/careers`, changeFrequency: 'daily', priority: 0.5 }]
  }
}
