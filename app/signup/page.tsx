import { redirect } from 'next/navigation'

// /signup - the URL every marketing CTA (hero, pricing, footer, sticky
// mobile bar) points at. Previously this route did not exist, so every
// "Start the 14-day trial" / "Subscribe" click 404'd - the entire
// interest -> signup funnel was broken at the first click.
//
// It redirects into the existing login page in signup mode, preserving
// the plan / cycle / foundation query params so the user's pricing
// choice flows through signup into onboarding.

export const dynamic = 'force-dynamic'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  qs.set('mode', 'signup')
  for (const key of ['plan', 'cycle', 'foundation'] as const) {
    const v = params[key]
    if (typeof v === 'string' && v) qs.set(key, v)
  }
  redirect(`/login?${qs.toString()}`)
}
