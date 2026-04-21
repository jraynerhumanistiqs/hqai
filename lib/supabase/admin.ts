import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Lazy service-role Supabase client — bypasses RLS.
 * Initialised on first call so the missing env var doesn't crash at build time.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local and Vercel environment variables.
 */
let _admin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _admin
}

/** Convenience alias — same as getSupabaseAdmin() */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop]
  },
})
