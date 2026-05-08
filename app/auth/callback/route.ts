import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// Handles both legacy ?code= OAuth-style callbacks and the newer
// ?token_hash= + type= magic-link flow that Supabase ships by default.
// Falls back to /login on any error.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const baseOrigin = process.env.NEXT_PUBLIC_BASE_URL || url.origin
  const next = searchParams.get('next') ?? '/dashboard'

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${baseOrigin}/login?reason=missing_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  let errorMessage: string | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) errorMessage = error.message
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) errorMessage = error.message
  } else if (tokenHash) {
    // Some Supabase setups send token_hash without an explicit type;
    // default to 'email' (covers magic links and signup confirmations).
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
    if (error) errorMessage = error.message
  }

  if (errorMessage) {
    console.warn('[auth/callback] verification failed:', errorMessage)
    return NextResponse.redirect(`${baseOrigin}/login?reason=auth_failed`)
  }

  return NextResponse.redirect(`${baseOrigin}${next}`)
}
