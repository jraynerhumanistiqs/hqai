/**
 * HQ.ai Email Utilities - Resend
 * Requires RESEND_API_KEY in .env.local / Vercel environment variables.
 * All functions fail gracefully if the key is missing (logged, not thrown).
 *
 * From address: noreply@hq.humanistiqs.ai
 * Add this domain in Resend -> Domains before enabling in production.
 *
 * BRANDING: every email renders through renderEmailShell() so member,
 * recruit, onboarding and marketing emails share the exact look of the
 * Supabase auth templates (docs/auth/*.html) - white card on #f5f5f4,
 * "A Humanistiqs product" eyebrow, Clay (#D97757) pill CTA, system font.
 */

import { Resend } from 'resend'

const FROM = 'HQ.ai <noreply@hq.humanistiqs.ai>'

// Shared brand tokens for email (mirrors the auth template palette).
const BRAND = {
  bg: '#f5f5f4',
  card: '#ffffff',
  ink: '#111111',
  body: '#404040',
  muted: '#737373',
  faint: '#a3a3a3',
  divider: '#e7e5e4',
  accent: '#D97757',
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Renders the shared branded HTML shell. Pass pre-built (and already
 * escaped where needed) bodyHtml. Keeps every HQ.ai email visually
 * identical to the login / auth emails.
 */
function renderEmailShell(opts: {
  heading: string
  bodyHtml: string
  cta?: { label: string; url: string }
  footnoteHtml?: string
  footerLine?: string
}): string {
  const { heading, bodyHtml, cta, footnoteHtml } = opts
  const footerLine = opts.footerLine
    ?? 'Sent by HQ.ai, a Humanistiqs product. Australian-built AI HR + Recruitment for SMEs.'
  return `<!DOCTYPE html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${BRAND.card};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 40px 8px 40px;">
                <div style="font-size:20px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.ink};">HQ.ai</div>
                <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};margin-top:4px;">A Humanistiqs product</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;">
                <div style="height:1px;background-color:${BRAND.divider};margin:16px 0 24px 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 8px 40px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:600;color:${BRAND.ink};letter-spacing:-0.01em;">${heading}</h1>
                <div style="margin:0 0 ${cta ? '28px' : '8px'} 0;font-size:15px;line-height:1.55;color:${BRAND.body};">${bodyHtml}</div>
              </td>
            </tr>
            ${cta ? `<tr>
              <td style="padding:0 40px 32px 40px;" align="left">
                <a href="${cta.url}" style="display:inline-block;background-color:${BRAND.accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:14px 28px;border-radius:9999px;">${cta.label}</a>
              </td>
            </tr>` : ''}
            ${footnoteHtml ? `<tr>
              <td style="padding:0 40px 16px 40px;">
                <p style="margin:0;font-size:13px;line-height:1.55;color:${BRAND.muted};">${footnoteHtml}</p>
              </td>
            </tr>` : ''}
            <tr>
              <td style="padding:0 40px 32px 40px;">
                <div style="height:1px;background-color:${BRAND.divider};margin:24px 0 16px 0;"></div>
                <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.faint};">${footerLine}</p>
              </td>
            </tr>
          </table>
          <p style="font-size:11px;color:${BRAND.faint};margin:16px 0 0 0;">&copy; Rayner Consulting Group Pty Ltd, trading as Humanistiqs</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set - email skipped')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

// -- Candidate submitted a video pre-screen --------------------------------

export async function sendCandidateSubmittedEmail({
  staffEmail,
  staffName,
  candidateName,
  roleTitle,
  company,
  reviewUrl,
}: {
  staffEmail: string
  staffName: string
  candidateName: string
  roleTitle: string
  company: string
  reviewUrl: string
}) {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: staffEmail,
      subject: `New pre-screen response: ${candidateName} for ${roleTitle}`,
      html: renderEmailShell({
        heading: 'New candidate response',
        bodyHtml: `
          <p style="margin:0 0 14px 0;">${staffName ? `Hi ${escapeHtml(staffName)},` : 'Hi,'}</p>
          <p style="margin:0;"><strong>${escapeHtml(candidateName)}</strong> has submitted their video pre-screen for <strong>${escapeHtml(roleTitle)}</strong> at ${escapeHtml(company)}.</p>
        `,
        cta: { label: 'Review response', url: reviewUrl },
      }),
    })
  } catch (err) {
    console.error('[email] sendCandidateSubmittedEmail failed:', err)
  }
}

// -- Send pre-screen invite link to candidate ------------------------------

// Default subject and plain-text body templates the recruiter can preview and
// edit before sending. Returned by buildInviteEmailDefaults so the UI can
// pre-fill the modal.
export function buildInviteEmailDefaults(args: {
  candidateName?: string
  roleTitle: string
  company: string
  inviteUrl: string
  timeLimitSeconds: number
  questionCount: number
}) {
  const { candidateName, roleTitle, company, inviteUrl, timeLimitSeconds, questionCount } = args
  const timeLabel = timeLimitSeconds < 120
    ? `${timeLimitSeconds} seconds`
    : `${Math.round(timeLimitSeconds / 60)} minutes`
  const subject = `Your video pre-screen for ${roleTitle} at ${company}`
  const body = `${candidateName ? `Hi ${candidateName},` : 'Hi,'}

You've been invited to complete a short video pre-screen for the ${roleTitle} role at ${company}.

It takes about ${questionCount * Math.ceil(timeLimitSeconds / 60)} minute${questionCount === 1 ? '' : 's'} total - ${questionCount} question${questionCount === 1 ? '' : 's'}, ${timeLabel} per answer. You can re-record each answer until you're happy with it.

Start your pre-screen here:
${inviteUrl}

If you have any questions, reply to this email. Good luck.

The ${company} hiring team`
  return { subject, body }
}

export async function sendCandidateInviteEmail({
  candidateEmail,
  candidateName,
  roleTitle,
  company,
  inviteUrl,
  timeLimitSeconds,
  questionCount,
  customSubject,
  customBody,
}: {
  candidateEmail: string
  candidateName?: string
  roleTitle: string
  company: string
  inviteUrl: string
  timeLimitSeconds: number
  questionCount: number
  customSubject?: string
  customBody?: string
}) {
  const resend = getResend()
  if (!resend) return

  const timeLabel = timeLimitSeconds < 120
    ? `${timeLimitSeconds} seconds`
    : `${Math.round(timeLimitSeconds / 60)} minutes`

  // If the recruiter supplied a custom subject and body, use them. The body
  // becomes the email content with line breaks preserved; the invite URL is
  // appended at the end if not already present so it's always reachable.
  if (customSubject && customBody) {
    const safeBody = customBody.includes(inviteUrl) ? customBody : `${customBody}\n\n${inviteUrl}`
    const escaped = escapeHtml(safeBody)
    const linked = escaped.replace(
      new RegExp(inviteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      `<a href="${inviteUrl}" style="color:${BRAND.accent};text-decoration:underline;">${inviteUrl}</a>`,
    )
    try {
      await resend.emails.send({
        from: FROM,
        to: candidateEmail,
        subject: customSubject,
        html: renderEmailShell({
          heading: `Your pre-screen for ${escapeHtml(roleTitle)}`,
          bodyHtml: `<div style="white-space:pre-wrap;">${linked}</div>`,
          footerLine: `Sent by the Humanistiqs team on behalf of ${escapeHtml(company)}.`,
        }),
      })
    } catch (err) {
      console.error('[email] sendCandidateInviteEmail (custom) failed:', err)
    }
    return
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: candidateEmail,
      subject: `Your video pre-screen for ${roleTitle} at ${company}`,
      html: renderEmailShell({
        heading: 'Video pre-screen invitation',
        bodyHtml: `
          <p style="margin:0 0 16px 0;">${candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,'}</p>
          <p style="margin:0 0 16px 0;">You've been invited to complete a short video pre-screen for the <strong>${escapeHtml(roleTitle)}</strong> role at <strong>${escapeHtml(company)}</strong>.</p>
          <div style="background:${BRAND.bg};border:1px solid ${BRAND.divider};border-radius:10px;padding:16px;">
            <p style="margin:0 0 8px 0;font-size:13px;color:${BRAND.muted};">What to expect:</p>
            <ul style="margin:0;padding-left:18px;font-size:14px;color:${BRAND.ink};line-height:1.8;">
              <li>${questionCount} pre-screen question${questionCount === 1 ? '' : 's'}</li>
              <li>Up to ${timeLabel} per response</li>
              <li>Record directly in your browser - no downloads needed</li>
              <li>Link expires in 14 days</li>
            </ul>
          </div>
        `,
        cta: { label: 'Start pre-screen', url: inviteUrl },
        footerLine: `This invitation was sent by the Humanistiqs team on behalf of ${escapeHtml(company)}.`,
      }),
    })
  } catch (err) {
    console.error('[email] sendCandidateInviteEmail failed:', err)
  }
}


// --- Candidate confirmation of submission ---------------------------------
// Sent immediately after a candidate submits their pre-screen response.
// Content must contain ONLY: thank-you, company name, role title, and
// "the team will be in touch". NEVER include scores, rubric, transcript
// or any AI output.

export async function sendCandidateSubmissionConfirmation({
  candidateEmail,
  candidateName,
  roleTitle,
  company,
}: {
  candidateEmail: string
  candidateName?: string
  roleTitle: string
  company: string
}) {
  const resend = getResend()
  if (!resend) return

  try {
    await resend.emails.send({
      from: FROM,
      to: candidateEmail,
      subject: `Interview received - ${company}`,
      html: renderEmailShell({
        heading: `Thank you${candidateName ? `, ${escapeHtml(candidateName)}` : ''}.`,
        bodyHtml: `
          <p style="margin:0 0 16px 0;">We have received your video interview for the <strong>${escapeHtml(roleTitle)}</strong> role at <strong>${escapeHtml(company)}</strong>.</p>
          <p style="margin:0;">The team will be in touch.</p>
        `,
        footerLine: `Sent on behalf of ${escapeHtml(company)} via Humanistiqs.`,
      }),
    })
  } catch (err) {
    console.error('[email] sendCandidateSubmissionConfirmation failed:', err)
  }
}

// -- @mention notification (Phase 3) ---------------------------------------

export async function sendMentionNotification({
  to,
  mentionerName,
  candidateName,
  roleTitle,
  company,
  deepLink,
  bodyExcerpt,
}: {
  to: string
  mentionerName: string
  candidateName: string
  roleTitle: string
  company: string
  deepLink: string
  bodyExcerpt: string
}) {
  const resend = getResend()
  if (!resend) return
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${mentionerName} mentioned you on ${candidateName}`,
      html: renderEmailShell({
        heading: `${escapeHtml(mentionerName)} mentioned you`,
        bodyHtml: `
          <p style="margin:0 0 16px 0;">On <strong>${escapeHtml(candidateName)}</strong>'s pre-screen for <strong>${escapeHtml(roleTitle)}</strong> at <strong>${escapeHtml(company)}</strong>.</p>
          <blockquote style="border-left:3px solid ${BRAND.divider};margin:0;padding:8px 12px;color:${BRAND.body};font-size:14px;">${escapeHtml(bodyExcerpt)}</blockquote>
        `,
        cta: { label: 'Open in HQ.ai', url: deepLink },
      }),
    })
  } catch (err) {
    console.error('[email] sendMentionNotification failed:', err)
  }
}

// -- Candidate review link email (Phase 3) ---------------------------------

export async function sendCandidateReviewLinkEmail({
  to,
  senderName,
  candidateName,
  roleTitle,
  company,
  reviewUrl,
  expiresAt,
}: {
  to: string
  senderName: string
  candidateName: string
  roleTitle: string
  company: string
  reviewUrl: string
  expiresAt?: string | null
}) {
  const resend = getResend()
  if (!resend) return
  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Candidate review: ${candidateName} - ${roleTitle}`,
      html: renderEmailShell({
        heading: 'Candidate review',
        bodyHtml: `<p style="margin:0;">${escapeHtml(senderName)} has shared <strong>${escapeHtml(candidateName)}</strong>'s video pre-screen for <strong>${escapeHtml(roleTitle)}</strong> at <strong>${escapeHtml(company)}</strong> with you.</p>`,
        cta: { label: 'Open review', url: reviewUrl },
        footnoteHtml: expiryLabel ? `Link expires ${expiryLabel}.` : undefined,
      }),
    })
  } catch (err) {
    console.error('[email] sendCandidateReviewLinkEmail failed:', err)
  }
}

// -- Candidate outcome email (Phase 4) -------------------------------------
// Used for shortlisted / rejected outcome emails. Body is plain text
// rendered inside the branded HTML shell. Reply-to can be set to the
// logged-in staff user's email so candidates can reply to a real person.

// B10 - delivers the one-off Letter of Offer purchased through /offer.
// The buyer paid $25 in Stripe Checkout; the fulfilment endpoint
// (app/api/administrator/one-off/fulfil/route.ts) calls this with the
// generated PDF and DOCX as attachments plus a /doc/<id> link they
// can forward to the candidate.
export async function sendOneOffLetterOfOfferEmail({
  toEmail,
  candidateName,
  roleTitle,
  employerName,
  shareUrl,
  pdfBuffer,
  docxBuffer,
}: {
  toEmail: string
  candidateName: string
  roleTitle: string
  employerName: string
  shareUrl: string
  pdfBuffer: Buffer
  docxBuffer: Buffer
}) {
  const resend = getResend()
  if (!resend) return { ok: false, reason: 'no_resend_key' }

  const subject = `Your Letter of Offer for ${candidateName} - ${roleTitle}`
  const fileBase = (candidateName || 'letter-of-offer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'letter-of-offer'

  const html = renderEmailShell({
    heading: 'Your Letter of Offer is ready',
    bodyHtml: `
      <p style="margin:0 0 14px 0;">Here is the Letter of Offer for <strong>${escapeHtml(candidateName)}</strong> joining ${escapeHtml(employerName)} as ${escapeHtml(roleTitle)}.</p>
      <p style="margin:0 0 14px 0;">Two files are attached: the editable Word doc and a PDF for signing. The same letter is also available at the button below if you want to forward a preview to the candidate.</p>
      <p style="margin:0 0 14px 0;color:${BRAND.muted};font-size:14px;">Every clause references the Fair Work Act, the NES, or the relevant Modern Award. The footnotes at the end of the letter list them so you and the candidate can both check the source.</p>
      <p style="margin:0;color:${BRAND.muted};font-size:14px;">If anything looks off, reply to this email - it goes to a human, not a noreply queue.</p>
    `,
    cta: { label: 'Open the shareable link', url: shareUrl },
  })

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject,
      html,
      text: `Your Letter of Offer for ${candidateName} - ${roleTitle}.\n\nOpen the shareable link: ${shareUrl}\n\nReply to this email if anything needs adjusting.`,
      attachments: [
        { filename: `${fileBase}.pdf`,  content: pdfBuffer },
        { filename: `${fileBase}.docx`, content: docxBuffer },
      ],
    })
    return { ok: true }
  } catch (err) {
    console.error('[email] sendOneOffLetterOfOfferEmail failed:', err)
    return { ok: false, reason: 'send_failed' }
  }
}

// -- Enterprise inquiry notification (founder) -----------------------------
// Sent to the founder when a new inquiry lands on /enterprise. Structured
// for fast triage - the founder reads this in 30 seconds and decides
// whether to book a discovery call within 48 hours.

export async function sendEnterpriseInquiryEmail({
  toEmail,
  inquiryId,
  fullName,
  workEmail,
  businessName,
  staffHeadcount,
  variantInterest,
  urgency,
  currentSpend,
  notes,
  entityCount,
  annualHiringVolume,
  belowThreshold,
  inquirerIp,
}: {
  toEmail: string
  inquiryId: string
  fullName: string
  workEmail: string
  businessName: string
  staffHeadcount: string
  variantInterest: string
  urgency: string
  currentSpend?: string | null
  notes?: string | null
  // Multiplier-relevant fields (May 2026). Optional - empty for legacy
  // submissions. Founder uses these to quote effective price pre-call.
  entityCount?: string | null
  annualHiringVolume?: string | null
  belowThreshold: boolean
  inquirerIp?: string | null
}) {
  const resend = getResend()
  if (!resend) return { ok: false, reason: 'no_resend_key' as const }

  const subject = `[Enterprise inquiry] ${businessName} - ${variantInterest} - ${urgency}`
  const thresholdLine = belowThreshold
    ? '\nBelow qualifying threshold - recommend Business tier.\n'
    : ''

  const text = [
    'NEW ENTERPRISE INQUIRY',
    '',
    `Business: ${businessName}`,
    `Contact: ${fullName} <${workEmail}>`,
    `Staff size: ${staffHeadcount}`,
    `Variant: ${variantInterest}`,
    `Urgency: ${urgency}`,
    `Current spend: ${currentSpend && currentSpend.trim() ? currentSpend : 'not stated'}`,
    '',
    'PRICING SIGNALS (for multiplier quote)',
    `Entity count: ${entityCount && entityCount.trim() ? entityCount : 'not stated'}`,
    `Annual hiring volume: ${annualHiringVolume && annualHiringVolume.trim() ? annualHiringVolume : 'not stated'}`,
    thresholdLine,
    'Notes from inquirer:',
    notes && notes.trim() ? notes : 'none',
    '',
    `Submission id: ${inquiryId}`,
    `IP: ${inquirerIp || 'unknown'}`,
    '',
    'Action: review in Supabase, qualify, book discovery call within 48h.',
  ].join('\n')

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:${BRAND.body};width:160px;">${label}</td><td style="padding:6px 0;">${value}</td></tr>`

  const bodyHtml = `
    ${belowThreshold ? `<p style="background:#FFF6E0;border:1px solid #C8850A;color:#7a5400;padding:10px 12px;border-radius:8px;font-size:13px;margin:0 0 16px 0;">Below qualifying threshold - recommend Business tier.</p>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.55;">
      ${row('Business', `<strong>${escapeHtml(businessName)}</strong>`)}
      ${row('Contact', `${escapeHtml(fullName)} &lt;<a href="mailto:${escapeHtml(workEmail)}" style="color:${BRAND.accent};">${escapeHtml(workEmail)}</a>&gt;`)}
      ${row('Staff size', escapeHtml(staffHeadcount))}
      ${row('Variant', escapeHtml(variantInterest))}
      ${row('Urgency', escapeHtml(urgency))}
      ${row('Current spend', escapeHtml(currentSpend && currentSpend.trim() ? currentSpend : 'not stated'))}
    </table>
    <h3 style="margin:24px 0 8px;font-size:13px;color:${BRAND.body};text-transform:uppercase;letter-spacing:0.08em;">Pricing signals (for multiplier quote)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.55;">
      ${row('Entity count', escapeHtml(entityCount && entityCount.trim() ? entityCount : 'not stated'))}
      ${row('Annual hiring volume', escapeHtml(annualHiringVolume && annualHiringVolume.trim() ? annualHiringVolume : 'not stated'))}
    </table>
    <h3 style="margin:24px 0 8px;font-size:13px;color:${BRAND.body};text-transform:uppercase;letter-spacing:0.08em;">Notes from inquirer</h3>
    <p style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:${BRAND.ink};margin:0;">${escapeHtml(notes && notes.trim() ? notes : 'none')}</p>
  `

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: workEmail,
      subject,
      text,
      html: renderEmailShell({
        heading: 'New Enterprise inquiry',
        bodyHtml,
        footerLine: `Submission id: ${escapeHtml(inquiryId)} - IP: ${escapeHtml(inquirerIp || 'unknown')} - review in Supabase, qualify, book discovery call within 48h.`,
      }),
    })
    return { ok: true as const }
  } catch (err) {
    console.error('[email] sendEnterpriseInquiryEmail failed:', err)
    return { ok: false as const, reason: 'send_failed' as const }
  }
}

// -- Enterprise inquiry confirmation (to the inquirer) ---------------------
// A short personal note signed by the founder. Plain language, no marketing
// padding. Sets the expectation that Jimmy himself will reply within 48h.

export async function sendEnterpriseInquiryConfirmation({
  toEmail,
  fullName,
  businessName,
}: {
  toEmail: string
  fullName: string
  businessName: string
}) {
  const resend = getResend()
  if (!resend) return { ok: false, reason: 'no_resend_key' as const }

  const subject = 'Thanks for reaching out about HR365 and Recruit365'
  const text = [
    `Hi ${fullName},`,
    '',
    'Thanks for reaching out. I personally read every inquiry, so this has landed with me.',
    '',
    `I'll come back to you within 48 hours to book a 30-minute discovery call. Before then, have a look at the plan detail at humanistiqs.ai/enterprise so the call gets straight to the specifics for ${businessName}.`,
    '',
    'Speak soon,',
    'Jimmy Rayner',
    'Founder, Humanistiqs',
  ].join('\n')

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: 'jrayner@humanistiqs.com.au',
      subject,
      text,
      html: renderEmailShell({
        heading: 'Thanks for reaching out',
        bodyHtml: `
          <p style="margin:0 0 14px 0;">Hi ${escapeHtml(fullName)},</p>
          <p style="margin:0 0 14px 0;">Thanks for reaching out. I personally read every Enterprise inquiry, so this has landed with me.</p>
          <p style="margin:0 0 14px 0;">I'll come back to you within 48 hours to book a 30-minute discovery call. Before then, have a look at the variant detail at <a href="https://humanistiqs.ai/enterprise" style="color:${BRAND.accent};text-decoration:underline;">humanistiqs.ai/enterprise</a> so the call gets straight to the specifics for ${escapeHtml(businessName)}.</p>
          <p style="margin:18px 0 0 0;">Speak soon,<br/>Jimmy Rayner<br/><span style="color:${BRAND.body};">Founder, Humanistiqs</span></p>
        `,
      }),
    })
    return { ok: true as const }
  } catch (err) {
    console.error('[email] sendEnterpriseInquiryConfirmation failed:', err)
    return { ok: false as const, reason: 'send_failed' as const }
  }
}

// -- Self-serve funnel: welcome email (first successful checkout) ----------
// Sent once from the Stripe webhook when checkout.session.completed
// lands for a business with no prior subscription. Email failures are
// logged and swallowed - they must NEVER fail the webhook.

export async function sendWelcomeEmail({
  toEmail,
  firstName,
  dashboardUrl,
}: {
  toEmail: string
  firstName: string
  dashboardUrl: string
}) {
  const resend = getResend()
  if (!resend) return { ok: false, reason: 'no_resend_key' as const }

  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const text = [
    greeting,
    '',
    'Your workspace is set up. The fastest way to see what HQ can do:',
    '',
    'Ask it one real question. Something on your plate right now - a leave',
    'question, a pay question, or "draft a letter of offer for a part-time',
    'retail assistant."',
    '',
    "You'll have an answer in about 30 seconds, and your first document in",
    'about three minutes.',
    '',
    `Open your workspace: ${dashboardUrl}`,
    '',
    'Worth knowing:',
    '- Unlimited logins. Add your managers at no extra cost.',
    '- No lock-in. Cancel any time from Settings > Billing.',
    '- When something is genuinely hard, a real Humanistiqs advisor is one',
    '  step away.',
    '',
    'Reply to this email if you get stuck - a real person reads it.',
    '',
    'Jimmy Rayner',
    'Founder, HQ.ai (Humanistiqs)',
  ].join('\n')

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: 'jrayner@humanistiqs.com.au',
      subject: 'Your HQ.ai workspace is ready',
      text,
      html: renderEmailShell({
        heading: 'Your workspace is ready',
        bodyHtml: `
          <p style="margin:0 0 14px 0;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 14px 0;">Your workspace is set up. The fastest way to see what HQ can do:</p>
          <p style="margin:0 0 14px 0;"><strong>Ask it one real question.</strong> Something on your plate right now - a leave question, a pay question, or "draft a letter of offer for a part-time retail assistant."</p>
          <p style="margin:0 0 14px 0;">You'll have an answer in about 30 seconds, and your first document in about three minutes.</p>
          <p style="margin:0 0 8px 0;">Worth knowing:</p>
          <ul style="margin:0 0 14px 0;padding-left:18px;line-height:1.7;">
            <li>Unlimited logins. Add your managers at no extra cost.</li>
            <li>No lock-in. Cancel any time from Settings &gt; Billing.</li>
            <li>When something is genuinely hard, a real Humanistiqs advisor is one step away.</li>
          </ul>
          <p style="margin:0 0 14px 0;">Reply to this email if you get stuck - a real person reads it.</p>
          <p style="margin:18px 0 0 0;">Jimmy Rayner<br/><span style="color:${BRAND.body};">Founder, HQ.ai (Humanistiqs)</span></p>
        `,
        cta: { label: 'Open your workspace', url: dashboardUrl },
      }),
    })
    return { ok: true as const }
  } catch (err) {
    console.error('[email] sendWelcomeEmail failed:', err)
    return { ok: false as const, reason: 'send_failed' as const }
  }
}

// -- Self-serve funnel: payment confirmation (checkout completed) -----------
// Sent from the Stripe webhook on every completed subscription checkout.
// The Stripe receipt arrives separately - this one confirms the plan in
// HQ.ai's own voice. Failures are logged and swallowed.

export async function sendPaymentConfirmationEmail({
  toEmail,
  firstName,
  planName,
  bandLabel,
  amountAud,
  cycle,
  nextBillDate,
  dashboardUrl,
}: {
  toEmail: string
  firstName: string
  planName: string
  bandLabel: string
  amountAud: number | null
  cycle: 'monthly' | 'annual'
  nextBillDate: string | null
  dashboardUrl: string
}) {
  const resend = getResend()
  if (!resend) return { ok: false, reason: 'no_resend_key' as const }

  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const billedLabel = cycle === 'annual' ? 'annually' : 'monthly'
  const amountLine = amountAud !== null
    ? `Amount: $${amountAud.toLocaleString('en-AU')} AUD, billed ${billedLabel}`
    : `Billed ${billedLabel}`
  const nextBillLine = nextBillDate ? `Next bill: ${nextBillDate}` : ''

  const text = [
    greeting,
    '',
    'Thanks - your payment went through and your plan is active.',
    '',
    `Plan: ${planName} (${bandLabel})`,
    amountLine,
    ...(nextBillLine ? [nextBillLine] : []),
    '',
    'Your Stripe receipt arrives in a separate email.',
    '',
    'You can change or cancel your plan any time in Settings > Billing.',
    'No lock-in, no notice period.',
    '',
    `Open your workspace: ${dashboardUrl}`,
    '',
    'Jimmy Rayner',
    'Founder, HQ.ai (Humanistiqs)',
  ].join('\n')

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: 'jrayner@humanistiqs.com.au',
      subject: `Payment received - your ${planName} plan is active`,
      text,
      html: renderEmailShell({
        heading: 'Payment received',
        bodyHtml: `
          <p style="margin:0 0 14px 0;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 14px 0;">Thanks - your payment went through and your plan is active.</p>
          <div style="background:${BRAND.bg};border:1px solid ${BRAND.divider};border-radius:10px;padding:16px;margin:0 0 14px 0;font-size:14px;line-height:1.8;">
            <div>Plan: <strong>${escapeHtml(planName)} (${escapeHtml(bandLabel)})</strong></div>
            <div>${escapeHtml(amountLine)}</div>
            ${nextBillLine ? `<div>${escapeHtml(nextBillLine)}</div>` : ''}
          </div>
          <p style="margin:0 0 14px 0;">Your Stripe receipt arrives in a separate email.</p>
          <p style="margin:0 0 14px 0;">You can change or cancel your plan any time in Settings &gt; Billing. No lock-in, no notice period.</p>
          <p style="margin:18px 0 0 0;">Jimmy Rayner<br/><span style="color:${BRAND.body};">Founder, HQ.ai (Humanistiqs)</span></p>
        `,
        cta: { label: 'Open your workspace', url: dashboardUrl },
      }),
    })
    return { ok: true as const }
  } catch (err) {
    console.error('[email] sendPaymentConfirmationEmail failed:', err)
    return { ok: false as const, reason: 'send_failed' as const }
  }
}

export async function sendCandidateOutcomeEmail({
  toEmail,
  toName,
  subject,
  body,
  company,
  replyTo,
}: {
  toEmail: string
  toName?: string | null
  subject: string
  body: string
  company: string
  replyTo?: string | null
}) {
  const resend = getResend()
  if (!resend) return

  // Accept a plain text body; convert newlines to <br/> and linkify
  // http(s) urls so e.g. a Calendly link is clickable. Angle brackets are
  // HTML-escaped first to avoid injection.
  const linkify = (s: string) =>
    s.replace(/(https?:\/\/[^\s<]+)/g, (url) =>
      `<a href="${url}" style="color:${BRAND.accent};text-decoration:underline;">${url}</a>`)
  const htmlBody = linkify(escapeHtml(body)).replace(/\n/g, '<br/>')

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: replyTo || undefined,
      subject,
      html: renderEmailShell({
        heading: subject,
        bodyHtml: `<div style="line-height:1.6;">${htmlBody}</div>`,
        footerLine: `Sent on behalf of ${escapeHtml(company)} via Humanistiqs.`,
      }),
      text: body,
    })
    return { ok: true, toName }
  } catch (err) {
    console.error('[email] sendCandidateOutcomeEmail failed:', err)
    return { ok: false, toName }
  }
}
