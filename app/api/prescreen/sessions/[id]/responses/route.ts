// POST /api/prescreen/sessions/[id]/responses - candidate submits response
// GET  /api/prescreen/sessions/[id]/responses - staff loads all responses for a session

import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveBusinessScope, assertSessionInScope } from '@/lib/supabase/scope'
import { sendCandidateSubmittedEmail, sendCandidateSubmissionConfirmation } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 300

async function triggerScoringPipeline(responseId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
  try {
    const tx = await fetch(`${baseUrl}/api/prescreen/responses/${responseId}/transcribe`, { method: 'POST' })
    if (!tx.ok) {
      const body = await tx.text().catch(() => '')
      // Surface the response body in the log so the next regression is
      // findable in Vercel function logs without having to repro locally.
      console.error('[responses/POST] transcribe failed', { responseId, status: tx.status, body: body.slice(0, 500) })
      return
    }
    const sc = await fetch(`${baseUrl}/api/prescreen/responses/${responseId}/score`, { method: 'POST' })
    if (!sc.ok) {
      const body = await sc.text().catch(() => '')
      console.error('[responses/POST] score failed', { responseId, status: sc.status, body: body.slice(0, 500) })
    }
  } catch (err) {
    console.error('[responses/POST] scoring pipeline error:', { responseId, err: err instanceof Error ? err.message : String(err) })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: session_id } = await params
  try {
    const body = await req.json()

    // APP 5 / APP 11 evidentiary record - capture the exact consent text the
    // candidate saw, the version string, the timestamp, and their IP. The new
    // columns are added by migration prescreen_responses_consent_meta.sql.
    // If that migration hasn't been applied yet, the insert below falls back
    // to the legacy column set so the candidate submission still works.
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || null
    const userAgent = req.headers.get('user-agent') || null
    const baseRow = {
      session_id,
      candidate_name: body.candidate_name,
      candidate_email: body.candidate_email,
      consent: body.consent,
      video_ids: body.video_ids,
      status: 'submitted' as const,
    }
    const metaRow = {
      ...baseRow,
      consent_text: body.consent_text ?? null,
      consent_version: body.consent_version ?? null,
      consent_at: body.consent_at ?? new Date().toISOString(),
      consent_ip: clientIp,
      consent_user_agent: userAgent,
    }
    // Tier-2 reviewer visual telemetry. Stored in a separate column so
    // the AI scoring pipeline (which reads transcripts only) literally
    // cannot pick it up. See docs/AIA-visual-telemetry.md for the
    // formal data-flow commitment.
    const fullRow = {
      ...metaRow,
      visual_diagnostics: body.visual_diagnostics ?? null,
    }
    let inserted: { id: string } | null = null
    let insertError: Error | null = null

    // UPSERT path: if the candidate arrived via a per-row invite link
    // (?response=<id>), we have an existing placeholder row from the
    // CV-import batch handoff. Update that row in place with the new
    // video + consent metadata instead of inserting a duplicate. The
    // response_id in the request body is the gating check.
    if (body.response_id && typeof body.response_id === 'string') {
      // Confirm the placeholder belongs to this session - guards against
      // a candidate forging another session's response_id.
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from('prescreen_responses')
        .select('id, session_id, video_ids')
        .eq('id', body.response_id)
        .single()
      if (!existingErr && existing && existing.session_id === session_id) {
        // Update the row. Progressive-degrade if optional columns
        // aren't present.
        const updatePayloads: Array<Record<string, unknown>> = [
          // Full update (consent + visual diagnostics)
          {
            candidate_name: body.candidate_name,
            candidate_email: body.candidate_email,
            consent: body.consent,
            video_ids: body.video_ids,
            status: 'submitted',
            consent_text: body.consent_text ?? null,
            consent_version: body.consent_version ?? null,
            consent_at: body.consent_at ?? new Date().toISOString(),
            consent_ip: clientIp,
            consent_user_agent: userAgent,
            visual_diagnostics: body.visual_diagnostics ?? null,
          },
          // No visual diagnostics
          {
            candidate_name: body.candidate_name,
            candidate_email: body.candidate_email,
            consent: body.consent,
            video_ids: body.video_ids,
            status: 'submitted',
            consent_text: body.consent_text ?? null,
            consent_version: body.consent_version ?? null,
            consent_at: body.consent_at ?? new Date().toISOString(),
            consent_ip: clientIp,
            consent_user_agent: userAgent,
          },
          // Last-resort minimum viable update
          {
            candidate_name: body.candidate_name,
            candidate_email: body.candidate_email,
            consent: body.consent,
            video_ids: body.video_ids,
            status: 'submitted',
          },
        ]
        let updatedRow: { id: string } | null = null
        for (const payload of updatePayloads) {
          const { data: u, error: uErr } = await supabaseAdmin
            .from('prescreen_responses')
            .update(payload)
            .eq('id', body.response_id)
            .select('id')
            .single()
          if (!uErr && u) { updatedRow = u; break }
        }
        if (updatedRow) {
          inserted = updatedRow
        } else {
          console.warn('[responses/POST] upsert update fell through, will INSERT a new row instead')
        }
      }
    }

    // No placeholder match - fall back to the original INSERT path with
    // progressive-degrade.
    if (!inserted) {
      const tryInsert = await supabaseAdmin
        .from('prescreen_responses')
        .insert(fullRow)
        .select()
        .single()
      if (tryInsert.error) {
        const tryMeta = await supabaseAdmin
          .from('prescreen_responses')
          .insert(metaRow)
          .select()
          .single()
        if (tryMeta.error) {
          const fallback = await supabaseAdmin
            .from('prescreen_responses')
            .insert(baseRow)
            .select()
            .single()
          if (fallback.error) insertError = new Error(fallback.error.message)
          else inserted = fallback.data
        } else {
          inserted = tryMeta.data
        }
      } else {
        inserted = tryInsert.data
      }
    }
    if (insertError) throw insertError
    const data = inserted as { id: string }

    const { data: session } = await supabaseAdmin
      .from('prescreen_sessions')
      .select('role_title, company, created_by')
      .eq('id', session_id)
      .single()

    if (body.candidate_email && session) {
      try {
        await sendCandidateSubmissionConfirmation({
          candidateEmail: body.candidate_email,
          candidateName: body.candidate_name,
          roleTitle: session.role_title,
          company: session.company,
        })
      } catch (mailErr) {
        console.error('[responses/POST] candidate confirmation error:', mailErr)
      }
    }

    try {
      if (session?.created_by) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', session.created_by)
          .single()

        if (profile?.email) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
          void sendCandidateSubmittedEmail({
            staffEmail: profile.email,
            staffName: profile.full_name || '',
            candidateName: body.candidate_name,
            roleTitle: session.role_title,
            company: session.company,
            reviewUrl: `${baseUrl}/dashboard/recruit`,
          })
        }
      }
    } catch (notifyErr) {
      console.error('[responses/POST] notification error:', notifyErr)
    }

    // Vercel will keep the lambda alive for `after` callbacks even after
    // the HTTP response is flushed. Prior `void fetch()` was getting killed
    // the moment we returned, leaving responses stuck in 'submitted' with
    // no transcript or evaluation.
    after(triggerScoringPipeline(data.id))

    return NextResponse.json({ response: data })
  } catch (err) {
    console.error('[POST /api/prescreen/sessions/:id/responses]', err)
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 })
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: session_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    // Multi-tenant scoping: confirm the session belongs to caller's
    // business before reading any responses. Without this, anyone
    // authenticated can list every candidate's PII + video ids by
    // guessing/iterating session ids.
    const scope = await resolveBusinessScope(user.id)
    if (!(await assertSessionInScope(scope, session_id))) {
      return NextResponse.json({ responses: [], bookings: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('prescreen_responses')
      .select('*')
      .eq('session_id', session_id)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    // Phase 4: attach interview bookings keyed by response_id
    const ids = (data ?? []).map(r => r.id)
    let bookings: any[] = []
    if (ids.length) {
      const { data: bks } = await supabaseAdmin
        .from('prescreen_interview_bookings')
        .select('id, response_id, invitee_email, event_start, event_end, calendly_event_uri, created_at')
        .in('response_id', ids)
      bookings = bks ?? []
    }

    return NextResponse.json({ responses: data, bookings })
  } catch (err) {
    console.error('[GET /api/prescreen/sessions/:id/responses]', err)
    return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 })
  }
}
