/**
 * Slug helpers for HQ.ai careers microsite.
 * URL shape: /careers/<business_slug>/<campaign_slug>
 */

export function slugify(text: string): string {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '')
}

export function businessSlug(business: {
  id: string
  slug?: string | null
  name?: string | null
}): string {
  if (business.slug && business.slug.trim().length > 0) return business.slug
  const fromName = business.name ? slugify(business.name) : ''
  if (fromName) return fromName
  return (business.id || '').replace(/-/g, '').slice(0, 8) || 'business'
}

export function campaignSlug(campaign: {
  id: string
  role_profile?: { title?: string | null } | null
}): string {
  const title = campaign.role_profile?.title || ''
  const titleSlug = slugify(title)
  const shortId = (campaign.id || '').replace(/-/g, '').slice(0, 6)
  if (titleSlug && shortId) return `${titleSlug}-${shortId}`
  if (titleSlug) return titleSlug
  return campaign.id || 'campaign'
}

export function extractCampaignShortId(slug: string): string | null {
  const m = slug.match(/-([a-f0-9]{6})$/i)
  return m ? m[1] : null
}
