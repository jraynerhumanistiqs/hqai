// B4 - AI Administrator generation route.
//
// Replaces the markdown-string -> docx path in
// app/api/documents/generate/route.ts. The old route is preserved
// (redirects, link-from-chat, downstream consumers) until the chat
// surface migrates onto this; both routes co-exist for the moment.
//
// Flow:
//   1. Claude (via the tool-aware router B2) is forced to call the
//      `emit_document` tool defined in lib/doc-model.ts. The model
//      writes the document directly as StructuredDocument JSON.
//   2. The result is validated, persisted to the `documents` table,
//      and returned to the client. The client then chooses which
//      renderer to download via /api/administrator/documents/[id]/render?format=...
//
// Self-verify: builds clean, smoke-test once VOYAGE_API_KEY + the
// administrator UI go live.

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resolveModel, withPromptCache } from '@/lib/router'
import {
  STRUCTURED_DOC_TOOL,
  assertStructuredDocument,
  type StructuredDocument,
} from '@/lib/doc-model'
import { recordCredits } from '@/lib/credits'
import { TEMPLATE_BY_ID } from '@/lib/template-ip'

function getTemplateById(id: string) {
  return TEMPLATE_BY_ID[id] ?? null
}

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface GenerateBody {
  /** Optional - if set, the template's system prompt is fetched and
   *  merged with the form inputs. */
  template_id?: string
  /** Form inputs keyed by template field name. */
  inputs?: Record<string, string>
  /** When provided, used verbatim as the prompt for the LLM. */
  prompt?: string
  /** Intent for the router. Defaults to administrator-template-fill. */
  intent?:
    | 'administrator-template-fill'
    | 'administrator-edit-section'
    | 'administrator-clause-cite'
    | 'administrator-complex-contract'
}

// Best-practice formatting envelope applied to EVERY template.
// Keeps generated documents in a consistent, recognisably-HQ.ai shape
// regardless of which of the 33 IP templates the user picked.
const BEST_PRACTICE_FORMATTING = `Formatting rules - apply to every document you emit:

STRUCTURE
- Open with a clear title (heading level 1) and an optional subtitle
  with the document date in DD/MM/YYYY format.
- Recipient block at top (name, role, address where supplied).
- Issuer block on the same header line (business name, ABN if known).
- Body sections each have a short H2 title and 1-3 paragraphs.
- For employment-doc templates always include sections in this
  order when applicable: Position, Commencement, Hours and Pattern,
  Remuneration, Award and NES, Leave, Probation, Confidentiality
  and IP, Termination and Notice, General Provisions.
- Signature blocks at the end - one per party (employer, employee,
  witness where appropriate).

CITATIONS
- Reference every legal claim. Citations[] must list:
    Fair Work Act 2009 (Cth) sections used (with section number),
    the relevant Modern Award (with clause if specific),
    NES entitlements you refer to, and any state legislation cited.
- Use locator strings like "s 117(1)" or "cl 12.3".
- Include short verbatim quote where the wording is contested.

LANGUAGE
- Australian English throughout (organise, behaviour, optimise).
- Plain hyphens only - never em-dashes or en-dashes.
- Year-9 reading level. If a sentence needs a comma to survive,
  rewrite it. Specific over generic.
- "You" not "the employer"; "they" not "the employee".

BRANDING
- Leave issuer.signatory_name and issuer.signatory_role blank if not
  provided in inputs - the recruiter will fill these in.
- Do NOT mention or render the business logo; the renderer will fit
  it into the document footer automatically.`

function buildPrompt(body: GenerateBody): string {
  if (body.prompt && body.prompt.trim()) return body.prompt.trim()
  const tpl = body.template_id ? getTemplateById(body.template_id) : null

  // The previous prompt listed inputs as bullet points only. Claude
  // routinely produced a document that read like a generic template
  // (headings + boilerplate paragraphs) without actually using the
  // recruiter-supplied values - hence "no information is flowing
  // through from form to document - just headings".
  //
  // We now hand the inputs over as a hard-coded data table AND repeat
  // each one as a directive so the model can't miss them. Empty
  // values are dropped entirely so blank fields don't end up in the
  // doc as literal "TBD" / "{{candidate_name}}" placeholders.
  const inputs = (body.inputs ?? {})
  const filled = Object.entries(inputs).filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
  const inputsBlock = filled.length
    ? `\n\nUSE THESE EXACT VALUES IN THE DOCUMENT. Do not paraphrase, do not invent placeholders, do not skip them. Each value MUST appear in the rendered output:\n` +
      filled.map(([k, v]) => `- ${k}: "${v}"`).join('\n') +
      `\n\nWhere a value is a name, place it on the recipient block AND inside the body prose so the document reads naturally. Where a value is a date, format it DD/MM/YYYY. Where a value is a money amount, format it as AUD (eg "$85,000 per annum, plus superannuation").`
    : '\n\n(No inputs provided - generate generic example wording the recruiter can replace.)'

  if (tpl) {
    const tplInstr = (tpl as { promptInstructions?: string }).promptInstructions
    const tplLine = tplInstr ? `\n\nTemplate guidance: ${tplInstr}` : ''
    return `Generate the document "${tpl.title}" for an Australian SME.

${BEST_PRACTICE_FORMATTING}

Template description: ${tpl.description}${tplLine}${inputsBlock}

REQUIRED OUTPUT SHAPE - emit a StructuredDocument with:
- title (use the template title above, optionally suffixed with the candidate / role / employee name from the inputs if one was supplied).
- recipient block populated from the candidate / employee / addressee inputs.
- issuer block populated from the business profile (business_name from the system context, plus signatory_name / signatory_role if supplied).
- sections[] with at least one paragraph block per major heading - never emit a heading-only section. Each paragraph MUST contain real prose that incorporates the inputs above, not "[insert details here]" placeholders.
- citations[] referencing the Fair Work Act / NES / Modern Award clauses you relied on.`
  }

  return `Generate a structured HR document for an Australian SME.

${BEST_PRACTICE_FORMATTING}
${inputsBlock}

REQUIRED OUTPUT SHAPE - emit a StructuredDocument where every section has real paragraph text that incorporates the inputs above. Headings without prose are not acceptable.`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Fetch profile + business in two steps so a missing column on
  // businesses can't fail the whole embedded select (previously the
  // route 400'd with "No business profile" if anything in the
  // businesses(...) embed didn't exist on the table). We only select
  // columns we know exist; everything else is optional.
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id, full_name')
    .eq('id', user.id)
    .single()
  if (!profile?.business_id) return NextResponse.json({ error: 'No business profile' }, { status: 400 })
  const { data: businessRow } = await supabase
    .from('businesses')
    .select('name, advisor_name, logo_url, industry, state, award')
    .eq('id', profile.business_id)
    .single()
  // Cast to a permissive shape - all fields optional so the route
  // never blows up just because the business profile is sparse.
  const business = (businessRow ?? {}) as {
    name?: string
    advisor_name?: string
    logo_url?: string
    industry?: string
    state?: string
    award?: string
  }

  let body: GenerateBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // B2 router - administrator intents map to Haiku/Sonnet/Opus per
  // lib/router.ts. Defaults to template-fill (Haiku).
  const intent = body.intent ?? 'administrator-template-fill'
  const model = resolveModel({ tool: 'administrator', intent })

  // Pass the live business profile to the model so it doesn't make up
  // an issuer block. The model has been seen to invent business names,
  // ABNs and addresses when these weren't present in the prompt, even
  // though the inputs blob was right there. Stating them in the system
  // prompt (cached) closes that gap.
  const issuerContext = [
    business.name ? `Business name: ${business.name}` : null,
    business.industry ? `Industry: ${business.industry}` : null,
    business.state ? `State: ${business.state}` : null,
    business.award ? `Modern Award: ${business.award}` : null,
  ].filter(Boolean).join('\n')

  const systemText = `You are an Australian HR document generator. You write professional, plain-English HR documents grounded in the Fair Work Act 2009 (Cth), the NES, and the relevant Modern Award. Australian English: organise, behaviour, optimise. Plain hyphens only - never em-dashes or en-dashes. Use the emit_document tool exactly once with the full structured document.

NON-NEGOTIABLE BEHAVIOUR:
1. Use the recruiter-supplied input values EXACTLY as provided. Never substitute placeholders like "[Candidate Name]" or "TBD". Never paraphrase a name. Never invent a date / salary / role title the recruiter did not supply.
2. Every section MUST contain at least one paragraph block with real prose. Heading-only sections are rejected.
3. Names and dates from the inputs must appear inside the body text, not only in the recipient/issuer header.
4. Use the issuer business profile below for the issuer block - do not invent business names.

ISSUER BUSINESS PROFILE (use verbatim):
${issuerContext || '(no business profile on file - use a generic placeholder)'}`

  let res: Anthropic.Messages.Message
  try {
    res = await anthropic.messages.create({
      model,
      max_tokens: intent === 'administrator-complex-contract' ? 6000 : 4000,
      // B3 - cached system prompt for the administrator surface.
      system: withPromptCache(systemText),
      tools: [STRUCTURED_DOC_TOOL as unknown as Anthropic.Messages.Tool],
      tool_choice: { type: 'tool', name: STRUCTURED_DOC_TOOL.name },
      messages: [{ role: 'user', content: buildPrompt(body) }],
    })
  } catch (err) {
    console.error('[administrator/generate] Anthropic error:', err)
    return NextResponse.json({ error: 'Generation failed', detail: (err as Error).message }, { status: 502 })
  }

  const toolBlock = res.content.find(b => b.type === 'tool_use') as Anthropic.Messages.ToolUseBlock | undefined
  if (!toolBlock) {
    return NextResponse.json({ error: 'Model did not emit a structured document.' }, { status: 502 })
  }

  let doc: StructuredDocument
  try {
    doc = assertStructuredDocument(toolBlock.input)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid structured document', detail: (err as Error).message }, { status: 422 })
  }

  // Merge any issuer fields the business already has on file so the
  // model doesn't have to hallucinate them - cheap reliability win.
  // ABN + address are not in the live `businesses` schema, so they
  // come from either the form inputs (when the template asks) or
  // the model's own output - never auto-filled here.
  doc.issuer = {
    business_name:  doc.issuer?.business_name  || business.name || 'Your business',
    abn:            doc.issuer?.abn            || undefined,
    address:        doc.issuer?.address        || undefined,
    signatory_name: doc.issuer?.signatory_name,
    signatory_role: doc.issuer?.signatory_role,
    // logo_url is part of the issuer block so renderers can fit the
    // uploaded business logo into the document footer / letterhead.
    // Not yet in the StructuredDocument schema; we add it as a side
    // channel via metadata so renderers can pick it up. See
    // lib/doc-model.ts metadata field.
  }
  if (business.logo_url) {
    doc.metadata = { ...(doc.metadata ?? {}), issuer_logo_url: business.logo_url }
  }

  // Persist. The `documents` table stores the rendered string today
  // for the markdown path; we add a structured_payload jsonb column
  // (covered by supabase/migrations/documents_structured_payload.sql)
  // to round-trip the structured shape so renderers can be re-run on
  // demand without re-calling the LLM.
  // documents.user_id + documents.type are NOT NULL on the live
  // schema. type stores a kebab-case slug for the document kind so
  // the existing /dashboard/documents list groups them sensibly.
  const docType = body.template_id || 'admin-generated'
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('documents')
    .insert({
      business_id: profile.business_id,
      user_id:     user.id,
      title:       doc.title,
      type:        docType,
      // The legacy column is `content` (text). Keep it populated with
      // a plain-text dump of the document so any existing consumer
      // (chat, downloads) still works while the renderers roll out.
      content:     doc.sections.map(s => (s.title ? `## ${s.title}\n` : '') + s.blocks.map(b => 'text' in b ? b.text : '').filter(Boolean).join('\n\n')).join('\n\n'),
      structured_payload: doc,
      template_id: body.template_id ?? null,
    })
    .select('id')
    .single()
  if (insertErr) {
    console.error('[administrator/generate] insert documents failed:', insertErr)
    return NextResponse.json({ error: 'Could not save document', detail: insertErr.message }, { status: 500 })
  }

  // B10 - credit ledger. AI Administrator costs 1 credit per document
  // baseline; complex_contract costs 2 to map to the Opus tier.
  const credits = intent === 'administrator-complex-contract' ? 2 : 1
  await recordCredits({
    business_id: profile.business_id,
    user_id:     user.id,
    tool:        'administrator',
    intent,
    cost:        credits,
    document_id: row.id,
  }).catch(err => {
    console.warn('[administrator/generate] credit ledger record failed:', err)
  })

  return NextResponse.json({
    id: row.id,
    document: doc,
    credits_charged: credits,
  })
}
