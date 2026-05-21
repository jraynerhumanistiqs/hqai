// POST /api/onboarding
//
// Server-side completion of the 3-step onboarding wizard. Uses the
// service-role admin client to insert the business row and link the
// signed-in user's profile to it, sidestepping client-side RLS races
// entirely. Onboarding is a privileged one-shot setup operation - it
// is not a regular user write - so service-role is the right tool.
//
// Why this exists:
//   Bianca (internal pilot tester, 2026-05-21) hit
//   "new row violates row-level security policy table 'businesses'"
//   when the onboarding page tried a client-side anon insert. RLS
//   policy chains on profiles + businesses are fragile at this exact
//   moment (the chicken-and-egg of "profile.business_id is still null
//   so we can't reference our own business yet"). Doing this server-
//   side with service-role removes that entire failure mode.
//
// Guardrails:
//   - Caller must be authenticated. We resolve the user from the
//     Supabase session cookie before any write.
//   - Caller must not already have a business. If profile.business_id
//     is already set we 409 and refuse - prevents accidental clobber
//     of an existing tenant.
//   - All writes are scoped to the resolved auth.uid().

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

interface Body {
  bizName?: string
  industry?: string
  country?: string
  state?: string
  awards?: string[]
  headcount?: string
  empTypes?: string[]
  advisorName?: string
  userName?: string
  plan?: string
}

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve the signed-in user from their Supabase session cookie.
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // 2. Belt-and-braces: refuse if this user is already linked to a
    //    business. Prevents an attacker (or buggy retry) from creating
    //    a duplicate tenant under the same auth.uid().
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile?.business_id) {
      return NextResponse.json(
        { error: 'You already have a business set up. Reload and you will go straight to the dashboard.' },
        { status: 409 },
      )
    }

    // 3. Parse + sanity-check the payload.
    const body = (await req.json().catch(() => ({}))) as Body
    const bizName = (body.bizName || '').trim() || 'My Business'
    const industry = (body.industry || '').trim()
    const country = (body.country || 'Australia').trim()
    const stateVal = (body.state || '').trim()
    const headcount = (body.headcount || '').trim()
    const advisorName = (body.advisorName || '').trim() || 'Hugo'
    const userName = (body.userName || '').trim()
    const plan = (body.plan || 'free').trim()
    const awards = Array.isArray(body.awards) ? body.awards.join(', ') : ''
    const empTypes = Array.isArray(body.empTypes) ? body.empTypes.join(', ') : ''

    // 4. Create the business row.
    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: bizName,
        industry,
        country,
        state: stateVal,
        award: awards,
        headcount,
        // Comma-separated string for backward compatibility with the AI
        // prompts that interpolate employment_types verbatim. Settings
        // UI reads and writes the same shape.
        employment_types: empTypes,
        advisor_name: advisorName,
        plan,
      })
      .select('id')
      .single()

    if (bizError || !business) {
      console.error('[onboarding/POST] business insert failed', bizError)
      return NextResponse.json(
        { error: 'Could not save business details.', detail: bizError?.message ?? 'unknown' },
        { status: 500 },
      )
    }

    // 5. Link the user's profile to the new business. The
    //    handle_new_user trigger should have created the profile row
    //    on signup, but use upsert as a belt-and-braces so we never
    //    fail here just because the trigger was disabled in this
    //    environment.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        business_id: business.id,
        full_name: userName,
        email: user.email,
        role: 'owner',
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('[onboarding/POST] profile upsert failed', profileError)
      // Roll back the business so the user can retry without orphaning.
      await supabaseAdmin.from('businesses').delete().eq('id', business.id)
      return NextResponse.json(
        { error: 'Could not save profile.', detail: profileError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ business_id: business.id })
  } catch (err) {
    console.error('[POST /api/onboarding]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Onboarding failed', detail }, { status: 500 })
  }
}
