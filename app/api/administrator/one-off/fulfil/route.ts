// B10 - fulfilment for the $25 Letter-of-Offer one-off purchase.
//
// Called by /offer/success on page load. Steps:
//   1. Validate the Stripe Checkout session id (payment_status = 'paid').
//   2. Pull the buyer's form inputs out of session.metadata.inputs_json.
//   3. Generate the Letter of Offer as a StructuredDocument by calling
//      Anthropic via the B2 router (administrator-clause-cite -> Sonnet).
//   4. Persist to the `documents` table (no business_id - one-off).
//   5. Render PDF + DOCX via the structured renderers.
//   6. Email both attachments + a /doc/<id> link via Resend.
//   7. Mark the credit_ledger row's notes with "fulfilled at <iso>"
//      so retries are idempotent.
//
// Idempotency: keyed off the Stripe session_id. We mark the ledger
// row on success; the success page is safe to call this endpoint as
// many times as the customer refreshes.

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  STRUCTURED_DOC_TOOL,
  assertStructuredDocument,
  type StructuredDocument,
} from '@/lib/doc-model'
import { resolveModel, withPromptCache } from '@/lib/router'
import { renderDocx } from '@/lib/render/docx'
import { renderPdf } from '@/lib/render/pdf'
import { sendOneOffLetterOfOfferEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function parseInputs(raw: string | undefined): Record<string, string> | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object' && !obj._truncated) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(obj)) out[k] = String(v ?? '')
      return out
    }
    return null
  } catch {
    return null
  }
}

function inputsBlock(inputs: Record<string, string>): string {
  return Object.entries(inputs)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { session_id?: string } | null
  if (!body?.session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  // 1. Stripe session validation
  let session
  try {
    session = await getStripe().checkout.sessions.retrieve(body.session_id)
  } catch (err) {
    console.error('[one-off/fulfil] retrieve session failed', err)
    return NextResponse.json({ error: 'Invalid session id' }, { status: 404 })
  }
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not complete', status: session.payment_status }, { status: 409 })
  }
  const offerId = session.metadata?.offer_id
  if (offerId !== 'letter_of_offer') {
    return NextResponse.json({ error: `Unsupported offer ${offerId}` }, { status: 400 })
  }
  const email = session.metadata?.customer_email || session.customer_email || ''
  if (!email) return NextResponse.json({ error: 'No customer email on session' }, { status: 422 })

  // 2. Inputs
  const inputs = parseInputs(session.metadata?.inputs_json)
  if (!inputs) {
    return NextResponse.json({
      error: 'Form details could not be read from the session. Please contact support@humanistiqs.com.au.',
    }, { status: 422 })
  }

  // Idempotency: if a previous fulfilment marked the ledger row,
  // pull the saved document id and skip regeneration.
  const { data: existingLedger } = await supabaseAdmin
    .from('credit_ledger')
    .select('id, notes, document_id')
    .eq('stripe_event_id', body.session_id)
    .maybeSingle()
  if (existingLedger?.notes?.startsWith('fulfilled:') && existingLedger.document_id) {
    return NextResponse.json({
      already_fulfilled: true,
      document_id: existingLedger.document_id,
    })
  }

  // 3. Generate via Anthropic tool-use
  const intent = 'administrator-clause-cite' as const
  const model = resolveModel({ tool: 'administrator', intent })
  const systemText = 'You generate Australian Letters of Offer. Australian English (organise, behaviour, optimise), plain hyphens only, never em-dashes. Reference the Fair Work Act 2009 (Cth), the National Employment Standards, and the relevant Modern Award. Emit exactly one tool call with the structured document. Citations must include every Act / award clause you rely on.'

  const userPrompt = `Draft a Letter of Offer with these inputs:\n\n${inputsBlock(inputs)}\n\nThe document must include:\n- Header naming the employer and the candidate\n- Position, start date, employment type and hours\n- Remuneration block with the pay rate and unit\n- Award coverage statement with the named award (or "Award free")\n- NES summary (annual leave, personal/carer's leave, public holidays, notice of termination)\n- Probation note only if listed in inputs.notes\n- Confidentiality + return of property clause\n- Signature blocks for employer and employee\n- Citations panel referencing the Act, the NES, and the named award`

  let res: Anthropic.Messages.Message
  try {
    res = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      system: withPromptCache(systemText),
      tools: [STRUCTURED_DOC_TOOL as unknown as Anthropic.Messages.Tool],
      tool_choice: { type: 'tool', name: STRUCTURED_DOC_TOOL.name },
      messages: [{ role: 'user', content: userPrompt }],
    })
  } catch (err) {
    console.error('[one-off/fulfil] Anthropic error', err)
    return NextResponse.json({ error: 'Generation failed', detail: (err as Error).message }, { status: 502 })
  }

  const toolBlock = res.content.find(b => b.type === 'tool_use') as Anthropic.Messages.ToolUseBlock | undefined
  if (!toolBlock) {
    return NextResponse.json({ error: 'Model did not emit a structured document' }, { status: 502 })
  }
  let doc: StructuredDocument
  try {
    doc = assertStructuredDocument(toolBlock.input)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid structured document', detail: (err as Error).message }, { status: 422 })
  }

  // Force a sensible title + issuer/recipient from the form inputs so
  // the model can't drop required identity fields.
  doc.title = doc.title || `Letter of Offer - ${inputs.candidate_name} - ${inputs.role_title}`
  doc.issuer = {
    business_name:  doc.issuer?.business_name  || inputs.employer_name,
    abn:            doc.issuer?.abn            || inputs.employer_abn  || undefined,
    address:        doc.issuer?.address        || undefined,
    signatory_name: doc.issuer?.signatory_name,
    signatory_role: doc.issuer?.signatory_role,
  }
  doc.recipient = {
    name:    doc.recipient?.name    || inputs.candidate_name,
    role:    doc.recipient?.role    || inputs.role_title,
    address: doc.recipient?.address || inputs.candidate_address || undefined,
  }

  // 4. Persist
  const { data: row, error: insertErr } = await supabaseAdmin
    .from('documents')
    .insert({
      business_id: null,
      created_by:  null,
      title:       doc.title,
      content:     doc.sections.map(s => (s.title ? `## ${s.title}\n` : '') + s.blocks.map(b => 'text' in b ? b.text : '').filter(Boolean).join('\n\n')).join('\n\n'),
      structured_payload: doc,
      template_id: 'one_off_letter_of_offer',
    })
    .select('id')
    .single()
  if (insertErr || !row) {
    console.error('[one-off/fulfil] insert documents failed', insertErr)
    return NextResponse.json({ error: 'Could not save the generated document', detail: insertErr?.message }, { status: 500 })
  }

  // 5. Render PDF + DOCX
  let pdf: Buffer
  let docx: Buffer
  try {
    [pdf, docx] = await Promise.all([renderPdf(doc), renderDocx(doc)])
  } catch (err) {
    console.error('[one-off/fulfil] render failed', err)
    return NextResponse.json({ error: 'Render failed', detail: (err as Error).message }, { status: 502 })
  }

  // 6. Email
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.humanistiqs.ai'
  const shareUrl = `${baseUrl}/doc/${row.id}`
  const mail = await sendOneOffLetterOfOfferEmail({
    toEmail:       email,
    candidateName: inputs.candidate_name,
    roleTitle:     inputs.role_title,
    employerName:  inputs.employer_name,
    shareUrl,
    pdfBuffer:     pdf,
    docxBuffer:    docx,
  })

  // 7. Mark the ledger row as fulfilled. If the row does not exist
  // yet (the webhook hasn't fired) insert one - we cannot let the
  // customer leave the success page without a credit trail.
  if (existingLedger?.id) {
    await supabaseAdmin
      .from('credit_ledger')
      .update({
        notes: `fulfilled:${new Date().toISOString()}:${mail.ok ? 'email_sent' : 'email_failed'}`,
        document_id: row.id,
      })
      .eq('id', existingLedger.id)
  } else {
    await supabaseAdmin.from('credit_ledger').insert({
      business_id:     null,
      user_id:         null,
      tool:            'one_off',
      intent:          'one_off:letter_of_offer',
      cost:            -1,
      stripe_event_id: body.session_id,
      document_id:     row.id,
      notes:           `fulfilled:${new Date().toISOString()}:${mail.ok ? 'email_sent' : 'email_failed'}`,
    })
  }

  return NextResponse.json({
    document_id: row.id,
    share_url:   shareUrl,
    email_sent:  mail.ok,
  })
}
