import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Find Supabase auth cookies
  const sbCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))

  const result: Record<string, any> = {
    total_cookies: allCookies.length,
    supabase_cookies: sbCookies.map(c => ({
      name: c.name,
      value_length: c.value.length,
      value_preview: c.value.slice(0, 50) + '...',
    })),
  }

  // Try getUser (what dashboard layout does)
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    result.getUser = {
      success: !!user,
      user_id: user?.id?.slice(0, 8) || null,
      email: user?.email || null,
      error: error?.message || null,
    }

    if (user) {
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('business_id, full_name')
        .eq('id', user.id)
        .single()

      result.profile = {
        found: !!profile,
        business_id: profile?.business_id?.slice(0, 8) || null,
        full_name: profile?.full_name || null,
        error: profErr?.message || null,
      }

      result.dashboard_would = profile?.business_id ? 'RENDER DASHBOARD' : 'REDIRECT TO /onboarding'
    } else {
      result.dashboard_would = 'REDIRECT TO /login'
    }
  } catch (e: any) {
    result.getUser = { error: e.message }
    result.dashboard_would = 'CRASH'
  }

  return NextResponse.json(result)
}
