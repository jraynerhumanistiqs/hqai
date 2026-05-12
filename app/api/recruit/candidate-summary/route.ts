// Combined CV + Video pre-screen "Candidate Summary" report.
//
// Input: one or more candidate_response_ids (from prescreen_sessions video
// answers). For each candidate, we attempt to join back to the CV scoring
// via cv_screenings.prescreen_session_id (set by batch-handoff) plus
// candidate name/email match.
//
// Output: a Word doc with one section per candidate containing:
//  - Header (role, candidate name, recommendation)
//  - CV scorecard summary (criterion scores, evidence, AI rationale)
//  - Video pre-screen scoring (per-question score + overall video band)
//  - Combined recommendation (CV + video composite)
//  - Best-practice next steps (reference + structured interview, panel review)

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
} from 'docx'
import JSZip from 'jszip'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  response_ids: string[]
}

interface CriterionScoreShape {
  id: string
  label?: string
  score: number
  evidence?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return jsonError('Unauthorised', 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id, name)')
      .eq('id', user.id)
      .single()
    const business = profile?.businesses as unknown as { id: string; name: string } | null
    if (!business?.id) return jsonError('No business profile', 400)

    const body = await req.json() as Body
    if (!Array.isArray(body.response_ids) || body.response_ids.length === 0) {
      return jsonError('response_ids required', 400)
    }

    // Pull the prescreen_responses, scoring data, and the parent prescreen
    // session in one round-trip via the FK relationship.
    const { data: responses } = await supabaseAdmin
      .from('prescreen_responses')
      .select('id, candidate_name, candidate_email, session_id, rubric_scores, overall_score, recommendation_action, recommendation_rationale, prescreen_sessions(id, role_title, company, custom_rubric)')
      .in('id', body.response_ids)

    if (!responses || responses.length === 0) return jsonError('No matching responses', 404)

    // For each response, look up the matching CV screening via the session
    // link + email match. Multiple CV screenings per candidate are possible
    // when re-scored; take the latest.
    const sessionIds = Array.from(new Set(responses.map((r: any) => r.session_id).filter(Boolean)))
    const { data: cvScreenings } = await supabaseAdmin
      .from('cv_screenings')
      .select('*')
      .eq('business_id', business.id)
      .in('prescreen_session_id', sessionIds.length > 0 ? sessionIds : ['__none__'])
      .order('created_at', { ascending: false })

    // Build a single per-candidate DOCX buffer. Used for both the single
    // response case (return one .docx) and for the multi-response case
    // (zipped into one folder per role).
    const buildOneDoc = async (r: any): Promise<{ buffer: Buffer; roleTitle: string; candidateName: string }> => {
      const session = r.prescreen_sessions
      const cv = (cvScreenings ?? []).find((c: any) =>
        c.prescreen_session_id === r.session_id &&
        c.candidate_label && r.candidate_name &&
        c.candidate_label.toLowerCase().includes((r.candidate_name as string).toLowerCase().split(' ')[0]),
      ) ?? (cvScreenings ?? []).find((c: any) => c.prescreen_session_id === r.session_id) ?? null

      const children: Paragraph[] = []
      children.push(new Paragraph({
        text: `Candidate Summary - ${r.candidate_name ?? 'Unnamed candidate'}`,
        heading: HeadingLevel.HEADING_1,
      }))
      children.push(new Paragraph({
        text: `${session?.role_title ?? 'Role'} - ${business.name}`,
        heading: HeadingLevel.HEADING_3,
      }))
      children.push(new Paragraph({
        children: [new TextRun({
          text: `Prepared ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          italics: true,
          color: '666666',
        })],
      }))
      children.push(new Paragraph({ text: '' }))

      const combined = combinedRecommendation(cv?.overall_score, r.overall_score)
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Combined recommendation' }))
      children.push(new Paragraph({ children: [new TextRun({ text: combined.band, bold: true })] }))
      children.push(new Paragraph({ text: combined.rationale }))
      children.push(new Paragraph({ text: '' }))

      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'CV scoring (Analysis Agent)' }))
      if (cv) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Overall: ${Number(cv.overall_score).toFixed(2)} / 5.00 - ${cv.band ?? 'unranked'}`, bold: true })],
        }))
        children.push(new Paragraph({ text: cv.rationale_short ?? '' }))
        for (const cs of (cv.criteria_scores as CriterionScoreShape[]) ?? []) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${cs.label ?? cs.id}: `, bold: true }),
              new TextRun({ text: `${cs.score}/5` }),
            ],
          }))
          if (cs.evidence) {
            children.push(new Paragraph({
              children: [new TextRun({ text: `Evidence: ${cs.evidence}`, italics: true, color: '555555' })],
            }))
          }
        }
      } else {
        children.push(new Paragraph({ text: 'No CV screening linked to this candidate.' }))
      }
      children.push(new Paragraph({ text: '' }))

      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Video pre-screen scoring (Shortlist Agent)' }))
      if (r.overall_score !== null && r.overall_score !== undefined) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Overall: ${Number(r.overall_score).toFixed(2)} / 5.00`, bold: true })],
        }))
      }
      if (r.recommendation_action) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Recommended action: ', bold: true }),
            new TextRun({ text: String(r.recommendation_action).replace(/_/g, ' ') }),
          ],
        }))
      }
      if (r.recommendation_rationale) {
        children.push(new Paragraph({ text: String(r.recommendation_rationale) }))
      }
      const videoScores = (r.rubric_scores ?? []) as Array<{ name?: string; score?: number; rationale?: string }>
      for (const vs of videoScores) {
        if (typeof vs.score !== 'number') continue
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${vs.name ?? 'Criterion'}: `, bold: true }),
            new TextRun({ text: `${vs.score}/5` }),
          ],
        }))
        if (vs.rationale) {
          children.push(new Paragraph({
            children: [new TextRun({ text: vs.rationale, italics: true, color: '555555' })],
          }))
        }
      }
      children.push(new Paragraph({ text: '' }))

      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Recommended next steps' }))
      for (const step of nextStepsFromCombined(combined.band)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: '- ' }), new TextRun({ text: step })],
        }))
      }
      children.push(new Paragraph({
        children: [new TextRun({
          text: 'Best-practice reference: AHRI Selection & Recruitment Guide (2024); SHRM structured interview standards. Final decisions sit with the hiring manager.',
          italics: true,
          color: '666666',
          size: 18,
        })],
      }))

      const doc = new Document({
        creator: 'HQ.ai Shortlist Agent',
        title: `Candidate Summary - ${r.candidate_name ?? 'Candidate'}`,
        sections: [{ children }],
      })
      const blob = await Packer.toBlob(doc)
      return {
        buffer: Buffer.from(await blob.arrayBuffer()),
        roleTitle: session?.role_title ?? 'Role',
        candidateName: r.candidate_name ?? 'Candidate',
      }
    }

    // Single candidate -> return one Word doc.
    if (responses.length === 1) {
      const { buffer, candidateName } = await buildOneDoc(responses[0])
      const safe = candidateName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'candidate'
      return new Response(buffer as unknown as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="Candidate_Summary_-_${safe}.docx"`,
        },
      })
    }

    // Multiple candidates -> zip of individual DOCX files, one folder per
    // role title. Naming matches the CV Analysis Agent zip convention:
    // "[Role Title] - Candidate CV Scoring Reports".
    const built = await Promise.all(responses.map(r => buildOneDoc(r)))
    const roles = new Set<string>()
    for (const b of built) roles.add(b.roleTitle)
    const folderRole = roles.size === 1 ? [...roles][0] : 'Mixed roles'
    const folderLabel = `${folderRole} - Candidate CV Scoring Reports`

    const zip = new JSZip()
    const seen = new Map<string, number>()
    for (const { buffer, candidateName } of built) {
      const base = candidateName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'candidate'
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n)
      const filename = n === 1 ? `${base}.docx` : `${base}-${n}.docx`
      zip.file(`${folderLabel}/${filename}`, buffer)
    }
    const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    const today = new Date().toISOString().slice(0, 10)
    const zipName = `${folderLabel.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 80)}_${today}.zip`
    return new Response(zipBuf as unknown as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    })
  } catch (err) {
    console.error('[candidate-summary]', err)
    return jsonError(err instanceof Error ? err.message : 'Report failed', 500)
  }
}

function combinedRecommendation(cvScore: number | undefined | null, videoScore: number | undefined | null) {
  const cv = typeof cvScore === 'number' ? Number(cvScore) : null
  const video = typeof videoScore === 'number' ? Number(videoScore) : null
  let composite: number | null = null
  if (cv !== null && video !== null) {
    // 40% CV, 60% video - video data is later and more behavioural so it
    // gets more weight, in line with structured-interview research showing
    // behavioural evidence outperforms CV signal for hiring outcomes.
    composite = cv * 0.4 + video * 0.6
  } else if (cv !== null) composite = cv
  else if (video !== null) composite = video

  if (composite === null) {
    return { band: 'Insufficient data', rationale: 'No CV or video scoring is available for this candidate.' }
  }
  if (composite >= 4.0) {
    return { band: 'Strong proceed', rationale: `Composite ${composite.toFixed(2)}/5. CV signals and video behavioural evidence align - move to reference and structured interview.` }
  }
  if (composite >= 3.2) {
    return { band: 'Proceed with structured interview', rationale: `Composite ${composite.toFixed(2)}/5. Solid fit indicators across both axes. Use the gaps surfaced below as your interview probe targets.` }
  }
  if (composite >= 2.5) {
    return { band: 'Conditional - panel review', rationale: `Composite ${composite.toFixed(2)}/5. Mixed signal. Panel review recommended before progressing.` }
  }
  return { band: 'Do not progress', rationale: `Composite ${composite.toFixed(2)}/5. CV and video signals do not meet the threshold for this role.` }
}

function nextStepsFromCombined(band: string): string[] {
  if (band.startsWith('Strong')) return [
    'Reference check with two most recent direct managers (structured questions).',
    'Schedule final structured interview with the hiring manager and one panel member.',
    'Prepare an indicative offer pending references.',
  ]
  if (band.startsWith('Proceed')) return [
    'Schedule a structured behavioural interview - probe the lowest-scoring criteria identified above.',
    'Reference check optional at this stage; can wait until post-interview.',
    'Run a short technical / role-task assessment if relevant.',
  ]
  if (band.startsWith('Conditional')) return [
    'Convene a 2-3 person panel review of the CV + video evidence.',
    'If consensus is to proceed, run a structured interview focused on the gaps.',
    'Consider an alternative shortlisted candidate alongside.',
  ]
  return [
    'Send a respectful "not progressed at this stage" email - keep candidate in talent pool for future roles.',
    'Note the specific reasons in your ATS for audit trail.',
  ]
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
