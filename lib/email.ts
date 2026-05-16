/**
 * HQ.ai Email Utilities - Resend
 * Requires RESEND_API_KEY in .env.local / Vercel environment variables.
 * All functions fail gracefully if the key is missing (logged, not thrown).
 *
 * From address: noreply@hq.humanistiqs.ai
 * Add this domain in Resend → Domains before enabling in production.
 */

import { Resend } from 'resend'

const FROM = 'HQ.ai <noreply@hq.humanistiqs.ai>'

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set - email skipped')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

// ── Candidate submitted a video pre-screen ──────────────────────────────────

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
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A;">
          <div style="border-bottom: 1px solid #E4E4E2; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 18px; font-weight: 700; color: #6F8F7A;">HQ.ai</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">New Candidate Response</h2>
          <p style="color: #6B6B6B; margin: 0 0 24px;">
            ${staffName ? `Hi ${staffName},` : 'Hi,'}<br/><br/>
            <strong>${candidateName}</strong> has submitted their video pre-screen for
            <strong>${roleTitle}</strong> at ${company}.
          </p>
          <a href="${reviewUrl}"
            style="display: inline-block; background: #6F8F7A; color: white; font-weight: 700;
                   padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Review Response →
          </a>
          <p style="color: #6B6B6B; font-size: 12px; margin-top: 32px; border-top: 1px solid #E4E4E2; padding-top: 16px;">
            Humanistiqs · humanistiqs.com.au
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[email] sendCandidateSubmittedEmail failed:', err)
  }
}

// ── Send pre-screen invite link to candidate ────────────────────────────────

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
    const escaped = safeBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const linked = escaped.replace(
      new RegExp(inviteUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      `<a href="${inviteUrl}" style="color:#000;text-decoration:underline;">${inviteUrl}</a>`,
    )
    try {
      await resend.emails.send({
        from: FROM,
        to: candidateEmail,
        subject: customSubject,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A; line-height: 1.6;">
            <div style="border-bottom: 1px solid #E4E4E2; padding-bottom: 16px; margin-bottom: 24px;">
              <span style="font-size: 18px; font-weight: 700; color: #000000;">HQ.ai</span>
            </div>
            <div style="white-space: pre-wrap; color: #1F1F1F;">${linked}</div>
          </div>
        `,
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
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A;">
          <div style="border-bottom: 1px solid #E4E4E2; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 18px; font-weight: 700; color: #6F8F7A;">HQ.ai</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">
            Video Pre-Screen Invitation
          </h2>
          <p style="color: #6B6B6B; margin: 0 0 16px;">
            ${candidateName ? `Hi ${candidateName},` : 'Hi,'}<br/><br/>
            You've been invited to complete a short video pre-screen for the
            <strong>${roleTitle}</strong> role at <strong>${company}</strong>.
          </p>
          <div style="background: #F7F7F5; border: 1px solid #E4E4E2; border-radius: 10px;
                      padding: 16px; margin: 0 0 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #6B6B6B;">What to expect:</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 14px; color: #0A0A0A; line-height: 1.8;">
              <li>${questionCount} pre-screen questions</li>
              <li>Up to ${timeLabel} per response</li>
              <li>Record directly in your browser - no downloads needed</li>
              <li>Link expires in 14 days</li>
            </ul>
          </div>
          <a href="${inviteUrl}"
            style="display: inline-block; background: #6F8F7A; color: white; font-weight: 700;
                   padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            Start Pre-Screen →
          </a>
          <p style="color: #6B6B6B; font-size: 12px; margin-top: 32px; border-top: 1px solid #E4E4E2; padding-top: 16px;">
            This invitation was sent by the Humanistiqs team on behalf of ${company}.<br/>
            humanistiqs.com.au
          </p>
        </div>
      `,
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
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A;">
          <div style="border-bottom: 1px solid #E4E4E2; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 18px; font-weight: 700; color: #000000;">HQ.ai</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">Thank you${candidateName ? `, ${candidateName}` : ''}.</h2>
          <p style="color: #4b4b4b; margin: 0 0 16px; line-height: 1.6;">
            We have received your video interview for the
            <strong>${roleTitle}</strong> role at <strong>${company}</strong>.
          </p>
          <p style="color: #4b4b4b; margin: 0 0 24px; line-height: 1.6;">
            The team will be in touch.
          </p>
          <p style="color: #afafaf; font-size: 12px; margin-top: 32px; border-top: 1px solid #E4E4E2; padding-top: 16px;">
            Sent on behalf of ${company} via Humanistiqs.<br/>
            humanistiqs.com.au
          </p>
        </div>
      `,
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
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A;">
          <div style="border-bottom: 1px solid #E4E4E2; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 18px; font-weight: 700; color: #000000;">HQ.ai</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">
            ${mentionerName} mentioned you
          </h2>
          <p style="color: #4b4b4b; margin: 0 0 16px; line-height: 1.6;">
            On <strong>${candidateName}</strong>'s pre-screen for <strong>${roleTitle}</strong> at <strong>${company}</strong>.
          </p>
          <blockquote style="border-left: 3px solid #E4E4E2; margin: 0 0 24px; padding: 8px 12px; color: #4b4b4b; font-size: 14px;">
            ${bodyExcerpt.replace(/</g, '&lt;')}
          </blockquote>
          <a href="${deepLink}"
            style="display: inline-block; background: #000000; color: white; font-weight: 700;
                   padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px;">
            Open in HQ.ai -&gt;
          </a>
          <p style="color: #afafaf; font-size: 12px; margin-top: 32px; border-top: 1px solid #E4E4E2; padding-top: 16px;">
            Humanistiqs - humanistiqs.com.au
          </p>
        </div>
      `,
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
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A;">
          <div style="border-bottom: 1px solid #E4E4E2; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 18px; font-weight: 700; color: #000000;">HQ.ai</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px;">
            Candidate review
          </h2>
          <p style="color: #4b4b4b; margin: 0 0 16px; line-height: 1.6;">
            ${senderName} has shared <strong>${candidateName}</strong>'s video pre-screen for
            <strong>${roleTitle}</strong> at <strong>${company}</strong> with you.
          </p>
          <a href="${reviewUrl}"
            style="display: inline-block; background: #000000; color: white; font-weight: 700;
                   padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px;">
            Open review -&gt;
          </a>
          ${expiryLabel ? `<p style="color: #6B6B6B; margin-top: 16px; font-size: 13px;">Link expires ${expiryLabel}.</p>` : ''}
          <p style="color: #afafaf; font-size: 12px; margin-top: 32px; border-top: 1px solid #E4E4E2; padding-top: 16px;">
            Humanistiqs - humanistiqs.com.au
          </p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[email] sendCandidateReviewLinkEmail failed:', err)
  }
}

// -- Candidate outcome email (Phase 4) -------------------------------------
// Used for shortlisted / rejected outcome emails. Body is plain text
// rendered inside the minimal HTML template. Reply-to can be set to the
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

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #141413;">
      <div style="border-bottom: 1px solid #D1CFC5; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="font-size: 18px; font-weight: 700; color: #141413;">HQ.ai</span>
      </div>
      <p style="font-size: 16px; line-height: 1.55;">
        Here is the Letter of Offer for <strong>${candidateName}</strong>
        joining ${employerName} as ${roleTitle}.
      </p>
      <p style="font-size: 15px; line-height: 1.55;">
        Two files are attached: the editable Word doc and a PDF for
        signing. The same letter is also available at the link below
        if you want to forward a preview to the candidate.
      </p>
      <p style="margin: 24px 0;">
        <a href="${shareUrl}" style="display: inline-block; background: #D97757; color: #FFFFFF; padding: 10px 20px; border-radius: 9999px; text-decoration: none; font-weight: 700;">
          Open the shareable link
        </a>
      </p>
      <p style="font-size: 14px; line-height: 1.55; color: #5E5D59;">
        Every clause references the Fair Work Act, the NES, or the
        relevant Modern Award. The footnotes at the end of the letter
        list them so you and the candidate can both check the source.
      </p>
      <p style="font-size: 14px; line-height: 1.55; color: #5E5D59;">
        If anything looks off, reply to this email - it goes to a
        human, not a noreply queue.
      </p>
      <p style="color: #afafaf; font-size: 12px; margin-top: 32px; border-top: 1px solid #D1CFC5; padding-top: 16px;">
        HQ.ai, operated by Rayner Consulting Group Pty Ltd<br/>
        humanistiqs.com.au
      </p>
    </div>
  `

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

  // Escape-less: we accept plain text body; convert newlines to <br/> and
  // linkify http(s) urls so the Calendly link is clickable. Angle brackets
  // are HTML-escaped first to avoid injection.
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const linkify = (s: string) =>
    s.replace(/(https?:\/\/[^\s<]+)/g, (url) =>
      `<a href="${url}" style="color:#000000; text-decoration:underline;">${url}</a>`)
  const htmlBody = linkify(escape(body)).replace(/\n/g, '<br/>')

  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: replyTo || undefined,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #0A0A0A;">
          <div style="border-bottom: 1px solid #E4E4E2; padding-bottom: 16px; margin-bottom: 24px;">
            <span style="font-size: 18px; font-weight: 700; color: #000000;">HQ.ai</span>
          </div>
          <div style="color: #1F1F1F; line-height: 1.6; font-size: 15px;">
            ${htmlBody}
          </div>
          <p style="color: #afafaf; font-size: 12px; margin-top: 32px; border-top: 1px solid #E4E4E2; padding-top: 16px;">
            Sent on behalf of ${company} via Humanistiqs.<br/>
            humanistiqs.com.au
          </p>
        </div>
      `,
      text: body,
    })
    return { ok: true, toName }
  } catch (err) {
    console.error('[email] sendCandidateOutcomeEmail failed:', err)
    return { ok: false, toName }
  }
}
