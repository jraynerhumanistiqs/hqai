import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.slice(-8) + ')' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
    },
  }

  // Test Supabase connection
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    checks.supabase = {
      connected: true,
      authenticated: !!user,
      user_id: user?.id?.slice(0, 8) || null,
      error: error?.message || null,
    }
  } catch (e: any) {
    checks.supabase = { connected: false, error: e.message }
  }

  // Test Supabase DB
  try {
    const supabase = await createClient()
    const { count, error } = await supabase.from('businesses').select('*', { count: 'exact', head: true })
    checks.database = { connected: true, business_count: count, error: error?.message || null }
  } catch (e: any) {
    checks.database = { connected: false, error: e.message }
  }

  return NextResponse.json(checks)
}
