import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Hands the PPAD iframe what it needs to talk to PostgREST as the signed-in
 * user: the project URL, the publishable anon key and a short-lived access
 * token.
 *
 * WHY THIS EXISTS. The tool is a static document in a same-origin iframe, not
 * part of the Next bundle, so it cannot use lib/supabase/client. The session
 * itself lives in a chunked, base64 cookie written by @supabase/ssr; parsing
 * that by hand in the iframe would be fragile and would break the moment the
 * cookie format changes. This route asks the SSR client for the session the
 * supported way and returns just the fields the iframe needs.
 *
 * WHAT IS AND IS NOT EXPOSED. The access token is the user's own JWT, already
 * in their browser - this hands it to their own page, not to anyone else.
 * Every query it is then used for is subject to the same RLS as any other
 * client. The service role key is never involved. Only the anon key is
 * returned, which is publishable by design.
 *
 * `no-store` because the token expires; the adapter re-fetches on a 401.
 */
export async function GET() {
  const supabase = await createClient()

  // getUser() revalidates against the auth server. getSession() alone trusts
  // whatever the cookie says, which is not good enough to gate on.
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return NextResponse.json({ error: 'No session' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  // The business is needed so the adapter can scope its reads without a
  // second round trip. It is not a security boundary - RLS scopes every row
  // regardless of what the iframe asks for.
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id, full_name, email')
    .eq('id', user.id)
    .single()

  return NextResponse.json(
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      expiresAt: session.expires_at ?? null,
      user: {
        id: user.id,
        email: profile?.email || user.email || '',
        name: profile?.full_name || '',
        businessId: profile?.business_id || null,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
