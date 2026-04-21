/**
 * HQ.ai Email Utilities — Resend
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
    console.warn('[email] RESEND_API_KEY not set — email skipped')
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

export async function sendCandidateInviteEmail({
  candidateEmail,
  candidateName,
  roleTitle,
  company,
  inviteUrl,
  timeLimitSeconds,
  questionCount,
}: {
  candidateEmail: string
  candidateName?: string
  roleTitle: string
  company: string
  inviteUrl: string
  timeLimitSeconds: number
  questionCount: number
}) {
  const resend = getResend()
  if (!resend) return

  const timeLabel = timeLimitSeconds < 120
    ? `${timeLimitSeconds} seconds`
    : `${Math.round(timeLimitSeconds / 60)} minutes`

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
              <li>Record directly in your browser — no downloads needed</li>
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
