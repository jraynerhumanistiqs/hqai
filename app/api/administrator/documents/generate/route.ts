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

function buildPrompt(body: GenerateBody): string {
  if (body.prompt && body.prompt.trim()) return body.prompt.trim()
  const tpl = body.template_id ? getTemplateById(body.template_id) : null
  const inputsBlock = body.inputs && Object.keys(body.inputs).length
    ? '\n\nInputs:\n' + Object.entries(body.inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    : ''
  if (tpl) {
    return `Generate the document "${tpl.title}" for an Australian SME. Follow Australian English conventions (organise, behaviour, optimise) and plain hyphens only (no em-dashes or en-dashes). Ground every claim in Fair Work / NES / Modern Awards where relevant and include citations in the citations[] array.${inputsBlock}\n\nTemplate description: ${tpl.description}`
  }
  return `Generate a structured HR document for an Australian SME. Australian English, plain hyphens only.${inputsBlock}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id, businesses(name, abn, address, advisor_name)')
    .eq('id', user.id)
    .single()
  if (!profile?.business_id) return NextResponse.json({ error: 'No business profile' }, { status: 400 })
  const business = profile.businesses as unknown as { name: string; abn?: string; address?: string }

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

  const systemText = `You are an Australian HR document generator. You write professional, plain-English HR documents grounded in the Fair Work Act 2009 (Cth), the NES, and the relevant Modern Award. Australian English: organise, behaviour, optimise. Plain hyphens only - never em-dashes or en-dashes. Use the emit_document tool exactly once with the full structured document.`

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
  doc.issuer = {
    business_name:  doc.issuer?.business_name  || business?.name || 'Your business',
    abn:            doc.issuer?.abn            || business?.abn  || undefined,
    address:        doc.issuer?.address        || business?.address || undefined,
    signatory_name: doc.issuer?.signatory_name,
    signatory_role: doc.issuer?.signatory_role,
  }

  // Persist. The `documents` table stores the rendered string today
  // for the markdown path; we add a structured_payload jsonb column
  // (covered by supabase/migrations/documents_structured_payload.sql)
  // to round-trip the structured shape so renderers can be re-run on
  // demand without re-calling the LLM.
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('documents')
    .insert({
      business_id: profile.business_id,
      created_by:  user.id,
      title:       doc.title,
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
