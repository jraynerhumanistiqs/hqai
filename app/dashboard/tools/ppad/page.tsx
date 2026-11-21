import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpadFrame from './PpadFrame'
import PpadUpsell from './PpadUpsell'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'HQ Performance - HQ.AI',
  // The route is behind auth, but belt and braces: the static document this
  // page frames (public/tools/ppad/app.html) carries its own noindex meta and
  // next.config.js sends X-Robots-Tag for /tools/ppad/*.
  robots: { index: false, follow: false },
}

/**
 * HQ Performance - the performance planning and appraisal tool.
 *
 * WHY AN IFRAME, inside a normal dashboard route.
 *
 * The tool is a self-contained ~1,400 line app that was written to own a whole
 * document. Three things in it are incompatible with sharing a DOM:
 *
 *   1. It registers `document.addEventListener` for input, change and click at
 *      the document root and acts on any element carrying `data-act` /
 *      `data-f`. Mounted inline, those handlers would fire on sidebar clicks
 *      and on every other form in the dashboard.
 *   2. It routes on `location.hash` and listens for `hashchange`. Inline, that
 *      fights the Next.js router.
 *   3. Its CSS is ~200 lines of unscoped element and class selectors
 *      (`table`, `.card`, `.btn`, `:root` custom properties) that would leak
 *      both ways against the design system.
 *
 * A same-origin iframe gives real isolation for all three - its own document,
 * its own hash, its own stylesheet - while the page around it is an ordinary
 * dashboard route with the sidebar, the theme boundary and the session. Being
 * same-origin, Phase 2's Supabase adapter reads the same auth cookie, so there
 * is no token passing and no second login.
 *
 * This is the "option b" the owner chose (inside the shell), implemented
 * without giving up the isolation that option a was there to protect.
 */
export default async function PpadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ppad_businesses_entitlement.sql may not be applied yet. The repo
  // convention for an additive migration is to retry without the column and
  // soft-degrade rather than 500, so an unapplied migration shows the upsell
  // instead of breaking the route.
  type Biz = { id: string; name: string; ppad_enabled?: boolean | null }
  let business: Biz | null = null

  const withFlag = await supabase
    .from('profiles')
    .select('business_id, businesses(id, name, ppad_enabled)')
    .eq('id', user.id)
    .single()

  if (withFlag.error) {
    console.warn('[ppad] ppad_enabled unavailable, treating as disabled:', withFlag.error.message)
    const fallback = await supabase
      .from('profiles')
      .select('business_id, businesses(id, name)')
      .eq('id', user.id)
      .single()
    business = (fallback.data?.businesses as unknown as Biz) ?? null
  } else {
    business = (withFlag.data?.businesses as unknown as Biz) ?? null
  }

  // The tab is visible to every business by design, so the gate lives here.
  // Note this is a usability gate only - it hides a tool the business has not
  // bought. It is NOT the data boundary: every row the tool reads is behind
  // RLS and the record RPCs, so a business without the flag that reached the
  // iframe directly would still see nothing.
  if (!business?.ppad_enabled) {
    return <PpadUpsell bizName={business?.name || 'your business'} />
  }

  return <PpadFrame />
}
