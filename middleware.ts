import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — this is critical for keeping cookies alive
  const { error } = await supabase.auth.getUser()

  // If the token references a deleted user, clear the bad cookie
  // so the user isn't stuck in a redirect loop
  if (error?.message?.includes('does not exist')) {
    const { pathname } = request.nextUrl
    // Only clear + redirect if they're trying to access a protected page
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      const response = NextResponse.redirect(loginUrl)
      // Delete the stale auth cookie
      response.cookies.delete('sb-rbuxsuuvbeojxcxwxcjf-auth-token')
      return response
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
