// Daily retention cron - APP 11 implementation.
//
// 1. Hard-deletes prescreen_sessions soft-deleted more than RETENTION_DAYS
//    ago. The add_soft_delete_prescreen.sql migration set deleted_at on
//    sessions; this cron is the second half of that retention design.
// 2. Cascades the hard delete to:
//    - all prescreen_responses for that session
//    - every Cloudflare Stream video the responses referenced
// 3. Hard-deletes cv_screenings older than RETENTION_DAYS that are not
//    linked to an active prescreen_session.
//
// Security: protected by CRON_SECRET env var. Vercel sets the Authorization
// header automatically when calling registered crons; the check matches
// the docs/CRON-SECRET-SETUP.md convention.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const RETENTION_DAYS = 80
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const CLOUDFLARE_STREAM_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN

export async function GET(req: NextRequest) {
  // Auth check - Vercel cron sets Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const summary = {
    sessions_purged: 0,
    responses_purged: 0,
    videos_purged: 0,
    cv_screenings_purged: 0,
    errors: [] as string[],
  }

  // 1. Find sessions to hard-delete
  const { data: staleSessions, error: staleErr } = await supabaseAdmin
    .from('prescreen_sessions')
    .select('id')
    .lt('deleted_at', cutoff)
    .not('deleted_at', 'is', null)
  if (staleErr) {
    summary.errors.push(`list stale sessions: ${staleErr.message}`)
  }

  // 2. For each stale session, collect video_ids from responses, then delete
  for (const s of (staleSessions ?? [])) {
    try {
      const { data: responses } = await supabaseAdmin
        .from('prescreen_responses')
        .select('id, video_ids')
        .eq('session_id', s.id)

      // Cloudflare Stream video deletion
      if (CLOUDFLARE_ACCOUNT_ID && CLOUDFLARE_STREAM_API_TOKEN) {
        const allVideoIds: string[] = []
        for (const r of (responses ?? [])) {
          const ids = Array.isArray(r.video_ids) ? r.video_ids as string[] : []
          for (const uid of ids) if (uid) allVideoIds.push(uid)
        }
        for (const uid of allVideoIds) {
          try {
            const res = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`,
              {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}` },
              },
            )
            if (res.ok) summary.videos_purged += 1
            else summary.errors.push(`cf stream delete ${uid}: HTTP ${res.status}`)
          } catch (cfErr) {
            summary.errors.push(`cf stream delete ${uid}: ${(cfErr as Error).message}`)
          }
        }
      } else {
        summary.errors.push('CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_STREAM_API_TOKEN not set - videos not deleted')
      }

      // Delete responses
      const { error: delRespErr, count } = await supabaseAdmin
        .from('prescreen_responses')
        .delete({ count: 'exact' })
        .eq('session_id', s.id)
      if (delRespErr) summary.errors.push(`delete responses for ${s.id}: ${delRespErr.message}`)
      else summary.responses_purged += count ?? 0

      // Delete session
      const { error: delSessErr } = await supabaseAdmin
        .from('prescreen_sessions')
        .delete()
        .eq('id', s.id)
      if (delSessErr) summary.errors.push(`delete session ${s.id}: ${delSessErr.message}`)
      else summary.sessions_purged += 1

    } catch (err) {
      summary.errors.push(`session ${s.id}: ${(err as Error).message}`)
    }
  }

  // 3. cv_screenings retention - keep linked to an active session, purge
  // older orphans. Uses created_at as the age signal since cv_screenings
  // does not have a soft-delete column.
  try {
    const { data: oldCv } = await supabaseAdmin
      .from('cv_screenings')
      .select('id, prescreen_session_id')
      .lt('created_at', cutoff)

    const orphanIds: string[] = []
    for (const cv of (oldCv ?? [])) {
      if (cv.prescreen_session_id) {
        // Linked to a session - keep if session still exists
        const { count } = await supabaseAdmin
          .from('prescreen_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('id', cv.prescreen_session_id)
        if ((count ?? 0) > 0) continue // session still alive, keep
      }
      orphanIds.push(cv.id)
    }
    if (orphanIds.length > 0) {
      const { error, count } = await supabaseAdmin
        .from('cv_screenings')
        .delete({ count: 'exact' })
        .in('id', orphanIds)
      if (error) summary.errors.push(`delete cv_screenings: ${error.message}`)
      else summary.cv_screenings_purged = count ?? 0
    }
  } catch (err) {
    summary.errors.push(`cv_screenings purge: ${(err as Error).message}`)
  }

  return NextResponse.json({ ok: true, cutoff, retention_days: RETENTION_DAYS, ...summary })
}
