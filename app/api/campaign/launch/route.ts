// POST /api/campaign/launch — atomic hand-off from Campaign Coach to HQ Recruit.
// See docs/CAMPAIGN-COACH-RESEARCH.md §5.1.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  RoleProfile,
  JobAdDraft,
  DistributionPlan,
} from '@/lib/campaign-types'

export const runtime = 'nodejs'
export const maxDuration = 60

type LaunchOptions = {
  question_count?: number
  rubric_mode?: 'auto' | 'manual'
  auto_send_outcomes?: boolean
}

type LaunchBody = {
  role_profile: RoleProfile
  job_ad_draft: JobAdDraft
  distribution_plan: DistributionPlan
  options?: LaunchOptions
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map(w => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function deriveCustomRubric(profile: RoleProfile): { name: string; description: string }[] {
  const skills = (profile.must_have_skills ?? []).slice(0, 6)
  const items = skills.map(skill => ({
    name: titleCase(skill),
    description: `Demonstrated ability with ${skill} relevant to a ${profile.level} ${profile.title}.`,
  }))
  const topUps: { name: string; description: string }[] = [
    { name: 'Communication', description: `Clear, structured communication appropriate for a ${profile.level} ${profile.title}.` },
    { name: 'Cultural fit / motivation', description: `Genuine motivation for this role and alignment with the team described in the ad.` },
    { name: 'Working style', description: `Working habits, autonomy, and reliability suited to this role.` },
  ]
  let i = 0
  while (items.length < 3 && i < topUps.length) {
    items.push(topUps[i++])
  }
  return items.slice(0, 6)
}

function buildRoleDescription(draft: JobAdDraft): string {
  const overview = draft.blocks.overview?.trim() ?? ''
  const resps = (draft.blocks.responsibilities ?? []).map(r => `- ${r}`).join('\n')
  const must = (draft.blocks.requirements?.must ?? []).map(r => `- ${r}`).join('\n')
  return [
    overview,
    resps && `Responsibilities:\n${resps}`,
    must && `Must-haves:\n${must}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildDeepLinks(profile: RoleProfile): { seek: string; indeed: string; linkedin: string } {
  const title = encodeURIComponent(profile.title || '')
  const location = encodeURIComponent(
    [profile.location?.suburb, profile.location?.state].filter(Boolean).join(', '),
  )
  const state = encodeURIComponent(profile.location?.state || '')

  const seek = `https://talent.seek.com.au/employer/job-ad/new?title=${title}` +
    (state ? `&location=${state}` : '')
  const indeed = `https://employers.indeed.com/p/post-job?title=${title}&location=${location}`
  const linkedin = `https://www.linkedin.com/jobs/post?title=${title}`
  return { seek, indeed, linkedin }
}

function adToPlainText(profile: RoleProfile, draft: JobAdDraft): string {
  const lines: string[] = []
  lines.push(profile.title)
  const loc = [profile.location?.suburb, profile.location?.state].filter(Boolean).join(', ')
  if (loc) lines.push(loc)
  lines.push('')
  if (draft.blocks.overview) { lines.push(draft.blocks.overview); lines.push('') }
  if (draft.blocks.about_us) { lines.push('ABOUT US'); lines.push(draft.blocks.about_us); lines.push('') }
  if (draft.blocks.responsibilities?.length) {
    lines.push('WHAT YOU\'LL DO')
    for (const r of draft.blocks.responsibilities) lines.push(`- ${r}`)
    lines.push('')
  }
  if (draft.blocks.requirements?.must?.length || draft.blocks.requirements?.nice?.length) {
    lines.push('WHAT YOU\'LL BRING')
    for (const r of draft.blocks.requirements?.must ?? []) lines.push(`- ${r}`)
    for (const r of draft.blocks.requirements?.nice ?? []) lines.push(`- (nice to have) ${r}`)
    lines.push('')
  }
  if (draft.blocks.benefits?.length) {
    lines.push('WHAT WE OFFER')
    for (const b of draft.blocks.benefits) lines.push(`- ${b}`)
    lines.push('')
  }
  if (draft.blocks.apply_cta) { lines.push(draft.blocks.apply_cta) }
  return lines.join('\n').replace(/[*_`]/g, '').trim()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const body = (await req.json()) as LaunchBody
    if (!body?.role_profile || !body?.job_ad_draft || !body?.distribution_plan) {
      return NextResponse.json(
        { error: 'role_profile, job_ad_draft and distribution_plan are required' },
        { status: 400 },
      )
    }

    const opts: LaunchOptions = body.options ?? {}
    const questionCount = Math.max(1, Math.min(10, Number(opts.question_count ?? 5)))
    const autoSendOutcomes = Boolean(opts.auto_send_outcomes)

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, business_id, businesses(*)')
      .eq('id', user.id)
      .single()
    const business = (profile as any)?.businesses
    if (!business) {
      return NextResponse.json({ error: 'No business associated with this user' }, { status: 400 })
    }

    const roleDescription = buildRoleDescription(body.job_ad_draft)
    const customRubric = deriveCustomRubric(body.role_profile)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://hqai.vercel.app'
    const cookieHeader = req.headers.get('cookie') ?? ''
    const sessionRes = await fetch(`${baseUrl}/api/prescreen/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        company: business.name,
        role_title: body.role_profile.title,
        role_description: roleDescription,
        ai_generate: true,
        questions: new Array(questionCount).fill(''),
        time_limit_seconds: 90,
        status: 'active',
        rubric_mode: 'custom',
        custom_rubric: customRubric,
        auto_send_outcomes: autoSendOutcomes,
        extras: {
          must_have_skills: body.role_profile.must_have_skills,
          level: body.role_profile.level,
          contract_type: body.role_profile.contract_type,
        },
      }),
    })
    if (!sessionRes.ok) {
      const detail = await sessionRes.text()
      console.error('[campaign/launch] prescreen create failed:', detail)
      return NextResponse.json(
        { error: 'Failed to create prescreen session', detail },
        { status: 502 },
      )
    }
    const sessionPayload = await sessionRes.json()
    const session = sessionPayload?.session
    if (!session?.id) {
      return NextResponse.json({ error: 'Prescreen session response malformed' }, { status: 502 })
    }

    const { data: campaign, error: insertErr } = await supabaseAdmin
      .from('campaigns')
      .insert({
        business_id: business.id,
        created_by: user.id,
        prescreen_session_id: session.id,
        role_profile: body.role_profile,
        job_ad_draft: body.job_ad_draft,
        distribution_plan: body.distribution_plan,
        coach_score: null,
        status: 'launched',
        launched_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (insertErr) {
      console.error('[campaign/launch] campaigns insert failed:', insertErr)
      return NextResponse.json({ error: 'Failed to persist campaign' }, { status: 500 })
    }

    const deepLinks = buildDeepLinks(body.role_profile)
    const copyPasteText = adToPlainText(body.role_profile, body.job_ad_draft)
    const candidatePath = session.slug || session.id
    const candidateUrl = `${baseUrl}/prescreen/${candidatePath}`

    return NextResponse.json({
      ok: true,
      campaign_id: campaign.id,
      session,
      candidate_url: candidateUrl,
      deep_links: deepLinks,
      copy_paste_text: copyPasteText,
    })
  } catch (err) {
    console.error('[campaign/launch] error:', err)
    return NextResponse.json({ error: 'Failed to launch campaign' }, { status: 500 })
  }
}
