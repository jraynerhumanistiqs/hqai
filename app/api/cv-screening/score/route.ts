import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getRubric as getStandardRubric } from '@/lib/cv-screening-rubrics'
import {
  bandFromScore,
  defaultActionForBand,
  type CandidateScreening,
  type FairnessChecks,
  type Rubric,
} from '@/lib/cv-screening-types'
import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { detectBiasSignals } from '@/lib/bias-detect'
import {
  scoreCv,
  computeOverall,
  blindPII,
  blindNameInText,
  extractEmail,
} from '@/lib/cv-screening/score'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-20250514'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('businesses(id)')
      .eq('id', user.id)
      .single()
    const businessId = (profile?.businesses as unknown as { id: string } | null)?.id ?? null

    const form = await req.formData()
    const file = form.get('file') as File | null
    const rubricId = String(form.get('rubricId') ?? '')
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const rubric = await resolveRubric(rubricId)
    if (!rubric) return NextResponse.json({ error: `Unknown rubric: ${rubricId}` }, { status: 400 })

    const filename = file.name || 'cv'
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const cvText = await extractText(buffer, ext)
    if (!cvText || cvText.length < 50) {
      return NextResponse.json({ error: 'Could not read enough text from this file' }, { status: 400 })
    }

    // Mask common PII before sending to model. Belt-and-braces with the prompt
    // instruction below telling the model to score on substance only.
    // Extract the candidate's real full name BEFORE we blind the CV. The
    // recruiter sees the full name in the pipeline; the model only sees the
    // blinded version when actually scoring so demographic signals can't
    // influence the score.
    const realName = extractRealName(cvText, filename)
    // Pull the candidate's real email BEFORE blindPII rewrites it to [EMAIL].
    // We persist it on the screening row so the Shortlist Agent video invite
    // can auto-fill the recipient without the recruiter retyping it. The
    // model still only sees the blinded CV when scoring.
    const candidateEmail = extractEmail(cvText)
    const blinded = blindNameInText(blindPII(cvText), realName)

    const scoreResult = await scoreCv(blinded, rubric.role, rubric.criteria)

    const overall = computeOverall(scoreResult.criteria_scores, rubric.criteria)
    const band = bandFromScore(overall)
    const next_action = defaultActionForBand(band)

    const fairness: FairnessChecks = {
      name_blinded: true,
      demographic_inference_suppressed: true,
      tenure_gap_explained: scoreResult.tenure_note ?? undefined,
    }

    // Bias-trigger rule: if the candidate record contains subconscious-
    // bias signals (ethnic name pattern, photo, DOB, etc.) we flag the
    // screening so the UI can flip the role into anonymise-all-candidates
    // mode automatically. See lib/bias-detect.ts for the heuristic.
    const biasReport = detectBiasSignals({
      candidate_name: realName || scoreResult.candidate_label,
      cv_text: cvText,
    })

    let savedId = `local-${Math.random().toString(36).slice(2, 10)}`
    let createdAt = new Date().toISOString()
    // Surfaces persistence failures up to the UI so the caller can
    // disable download buttons and ask the user to retry / report it,
    // instead of pretending the screening saved when it didn't.
    let persistenceError: string | null = null

    if (businessId) {
      const { data: inserted, error } = await supabase
        .from('cv_screenings')
        .insert({
          business_id: businessId,
          user_id: user.id,
          rubric_id: rubricId,
          // Prefer the extracted CV name. If extraction failed, prefer the filename
// over Claude's literal "Candidate" placeholder so the user sees something
// meaningful rather than a generic word.
candidate_label: realName || filenameToLabel(filename) || scoreResult.candidate_label,
          candidate_email: candidateEmail,
          cv_text: cvText,
          cv_filename: filename,
          overall_score: overall,
          band,
          next_action,
          rationale_short: scoreResult.rationale_short,
          criteria_scores: scoreResult.criteria_scores,
          fairness_checks: fairness,
          bias_signals: biasReport.signals.length > 0 ? biasReport.signals : null,
          status: 'scored',
        })
        .select('id, created_at')
        .single()
      if (!error && inserted) {
        savedId = inserted.id
        createdAt = inserted.created_at
      } else if (error) {
        // Loudly log so the next regression is findable in Vercel logs,
        // and capture the message so the UI can warn the user instead
        // of silently handing them a local- placeholder id.
        console.error('[cv-screening/score] cv_screenings insert failed:', {
          message: error.message,
          code: (error as { code?: string }).code,
          hint: (error as { hint?: string }).hint,
          details: (error as { details?: string }).details,
        })
        persistenceError = error.message
      }

      // If the bias detector tripped on this candidate AND the business
      // hasn't yet opted out of auto-anonymise, flip the global default
      // on. This is a "ratchet" - once any candidate trips the rule for
      // a business, anonymise stays on until a recruiter manually
      // turns it off. Cheap, defensible default.
      if (biasReport.has_signal && businessId) {
        await supabaseAdmin
          .from('businesses')
          .update({ auto_anonymise_candidates: true })
          .eq('id', businessId)
          .then(({ error: e }) => {
            if (e) console.warn('[cv-screening/score] auto-anonymise flip failed:', e.message)
          })
      }
    }

    const screening: CandidateScreening = {
      id: savedId,
      business_id: businessId ?? '',
      user_id: user.id,
      rubric_id: rubricId,
      // Prefer the extracted CV name. If extraction failed, prefer the filename
// over Claude's literal "Candidate" placeholder so the user sees something
// meaningful rather than a generic word.
candidate_label: realName || filenameToLabel(filename) || scoreResult.candidate_label,
      candidate_email: candidateEmail,
      cv_text: cvText,
      overall_score: overall,
      band,
      next_action,
      rationale_short: scoreResult.rationale_short,
      criteria_scores: scoreResult.criteria_scores,
      fairness_checks: fairness,
      status: 'scored',
      created_at: createdAt,
    }

    // persistence_warning surfaces the cv_screenings INSERT error
    // verbatim so the UI can show the user exactly why the row didn't
    // save (typically a missing column from an unapplied migration).
    return NextResponse.json({ screening, persistence_warning: persistenceError })
  } catch (err) {
    console.error('[cv-screening/score]', err)
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Scoring failed', detail }, { status: 500 })
  }
}

async function resolveRubric(rubricId: string): Promise<Rubric | null> {
  const standard = getStandardRubric(rubricId)
  if (standard) return standard
  // Fall through to a custom rubric stored against the business.
  const { data } = await supabaseAdmin
    .from('cv_custom_rubrics')
    .select('rubric')
    .eq('id', rubricId)
    .single()
  return (data?.rubric as Rubric | undefined) ?? null
}

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  if (ext === 'txt' || ext === '') return buffer.toString('utf-8')
  if (ext === 'docx') {
    const r = await mammoth.extractRawText({ buffer })
    return r.value ?? ''
  }
  if (ext === 'pdf') {
    // Use Claude vision to extract text from the PDF directly. Avoids
    // pulling in a native Node PDF parser. Cheaper to do this once than
    // to try to render with pdf.js in a serverless lambda.
    const base64 = buffer.toString('base64')
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          {
            type: 'text',
            text: 'Extract the entire text content of this CV exactly as written. Preserve section headings, employer names, dates, and bullet points. Do not summarise. Output plain text only with line breaks - no markdown wrappers.',
          },
        ],
      }],
    })
    return res.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')
      .trim()
  }
  throw new Error(`Unsupported file type: .${ext}`)
}

// Pulls the candidate's full name from the top of the CV. CVs almost always
// open with the name on the first non-empty line, sometimes followed by a
// title or contact line. We take the first line that looks like a name
// (2-4 capitalised tokens, no digits, no @). Falls back to filename if the
// first lines look like a header/title.
// Lines we explicitly never treat as a name even if they pass the
// capitalisation heuristic. Covers AU CV headers and work-rights banners
// that are the classic false positives (e.g. "Australian Citizen").
const NON_NAME_HEADERS = /^(curriculum vitae|resume|cv|profile|professional profile|career profile|summary|career summary|professional summary|objective|career objective|contact|contact details|personal details|personal information|address|phone|mobile|email|linkedin|github|portfolio|skills|core skills|key skills|experience|work experience|professional experience|employment|employment history|education|qualifications|certifications|references|australian citizen|permanent resident|new zealand citizen|nz citizen|working holiday|work rights|right to work|visa holder|tfn holder)\b/i

// Title-case a name that may have arrived as ALL CAPS. Keep particles like
// "de", "van", "von", "of" lowercase and recognise common Mc/Mac/O' patterns
// so "JANE MCDONALD" -> "Jane McDonald", not "Jane Mcdonald".
function titleCaseName(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((tok, i) => {
      if (i > 0 && /^(de|del|della|der|van|von|of|du|da|la|le|al|el|bin|ibn|y)$/.test(tok)) return tok
      // Mc + capitalised tail
      const mc = tok.match(/^(mc)(.+)$/)
      if (mc) return 'Mc' + mc[2].charAt(0).toUpperCase() + mc[2].slice(1)
      // Mac + capitalised tail (>= 5 chars to avoid mangling "Mack")
      const mac = tok.match(/^(mac)(.{3,})$/)
      if (mac) return 'Mac' + mac[2].charAt(0).toUpperCase() + mac[2].slice(1)
      // Hyphen / apostrophe each component
      if (tok.includes('-') || tok.includes("'") || tok.includes('’')) {
        return tok.split(/(['’-])/).map(seg => seg.length > 1 ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg).join('')
      }
      // Single-letter initial - keep upper with trailing dot if any
      if (tok.length <= 2 && /^[a-z]\.?$/.test(tok)) return tok.toUpperCase()
      return tok.charAt(0).toUpperCase() + tok.slice(1)
    })
    .join(' ')
}

// Heuristic name extractor. Looks at the first ~15 non-empty lines and
// accepts the first one that looks like a personal name and doesn't match
// the non-name header denylist. Handles ALL CAPS, middle initials, accented
// chars, hyphens, apostrophes, and Mc/Mac prefixes.
function extractRealName(cvText: string, filename: string): string | null {
  const lines = cvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 15)
  // 2-4 capitalised tokens (allowing ALL CAPS), optional middle initial
  // ("Jane A. Smith"), Unicode-aware letter class. Trailing punctuation
  // like (she/her) or - Title is stripped before testing in the second pass.
  const namePattern = /^(?:\p{Lu}\.?\p{Ll}*[’'\-]?\p{Lu}*\p{Ll}*|\p{Lu}{2,})(?:\s+(?:\p{Lu}\.?\p{Ll}*[’'\-]?\p{Lu}*\p{Ll}*|\p{Lu}{2,}|\p{Lu}\.))?(?:\s+(?:\p{Lu}\.?\p{Ll}*[’'\-]?\p{Lu}*\p{Ll}*|\p{Lu}{2,}|\p{Lu}\.)){0,2}$/u
  const isLikelyName = (s: string) => {
    if (!s || s.length > 60) return false
    if (NON_NAME_HEADERS.test(s)) return false
    if (s.includes('@') || /\d/.test(s)) return false
    return namePattern.test(s)
  }
  const normalise = (s: string) => {
    const trimmed = s.trim()
    return /^[A-Z\s.'’\-]+$/.test(trimmed) && trimmed === trimmed.toUpperCase() && trimmed.length > 3
      ? titleCaseName(trimmed)
      : trimmed
  }
  for (const line of lines) {
    if (isLikelyName(line)) return normalise(line)
  }
  // Pass 2 - strip parenthetical pronouns / title suffixes, then retry.
  for (const line of lines) {
    if (line.includes('@') || /\d/.test(line)) continue
    const cleaned = line
      .replace(/\([^)]*\)/g, '')
      .split(/\s[-|]\s|,/)[0]
      ?.trim()
    if (cleaned && isLikelyName(cleaned)) return normalise(cleaned)
  }
  // Filename fallback - "James_Williams_CV.pdf" -> "James Williams"
  const fromFile = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(cv|resume|curriculum vitae|final|draft|v\d+|copy|updated)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (isLikelyName(fromFile)) return normalise(fromFile)
  // Filename fallback (relaxed) - title-case the filename if it has 2+
  // word-like tokens even when not strictly matching the name pattern.
  // Better to show "Jane Smith-Doe" from a filename than "Australian Citizen".
  const fromFileTokens = fromFile.split(/\s+/).filter(t => t.length >= 2)
  if (fromFileTokens.length >= 2 && fromFileTokens.length <= 4 && !NON_NAME_HEADERS.test(fromFile)) {
    return titleCaseName(fromFile)
  }
  // CV-text source-of-truth fallback. Most CVs put the candidate's full name
  // on the first non-empty line. When the regex extractor and the filename
  // both fail, fall back to the first line of the parsed CV text after
  // skipping section headers, work-rights banners, and lines that obviously
  // can't be a name (emails, phone numbers, postal addresses).
  // This is preferred over Claude's "Candidate" placeholder because the
  // user explicitly told us "most CV text will have Full Name as the first
  // line item".
  for (const line of lines) {
    if (!line) continue
    if (line.length > 80) continue
    if (line.includes('@')) continue          // email
    if (/\+?\d[\d\s\-()]{6,}/.test(line)) continue // phone
    if (/\d/.test(line)) continue             // any digit -> probably address / DOB
    if (NON_NAME_HEADERS.test(line)) continue // CV/Profile/Summary/Australian Citizen etc.
    const cleaned = line
      .replace(/\([^)]*\)/g, '')             // drop (she/her)
      .split(/\s[-|]\s|,/)[0]                // drop " - Title" / ", Town" suffixes
      ?.trim()
    if (!cleaned) continue
    const tokenCount = cleaned.split(/\s+/).filter(Boolean).length
    if (tokenCount < 2 || tokenCount > 5) continue // single word or "address line" too long
    // If all caps, title-case it. Otherwise return as-is.
    return /^[A-Z\s.'’\-]+$/.test(cleaned) && cleaned === cleaned.toUpperCase()
      ? titleCaseName(cleaned)
      : cleaned
  }
  return null
}

function filenameToLabel(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80)
}

// scoreCv, computeOverall, blindPII, blindNameInText all moved to
// @/lib/cv-screening/score so the rescore endpoint reuses the same
// pipeline. This route only owns file I/O, name extraction, and DB
// persistence.
