// Team invite email. Own small module so the invite route has one clear
// dependency; mirrors the Resend conventions in lib/email.ts (same FROM,
// same reply-to, same "skip if no key" behaviour).

import { Resend } from 'resend'
import { HQ_CONTACT_EMAIL } from './email'

const FROM = 'HQ.ai <noreply@hq.humanistiqs.ai>'

export async function sendTeamInviteEmail(args: {
  to: string
  inviterName: string
  businessName: string
  inviteUrl: string
  role: 'admin' | 'member'
}): Promise<{ sent: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[team-email] RESEND_API_KEY not set - invite email skipped')
    return { sent: false }
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const what = args.role === 'admin'
    ? 'help manage people records'
    : 'join the team'
  const subject = `${args.inviterName} has invited you to ${args.businessName} on HQ.ai`
  const text = `Hi,

${args.inviterName} has invited you to ${what} for ${args.businessName} on HQ.ai.

Accept the invite here:
${args.inviteUrl}

The link is good for 7 days. If you were not expecting this, you can ignore it.

HQ.ai by Humanistiqs`

  try {
    await resend.emails.send({
      from: FROM,
      to: args.to,
      replyTo: HQ_CONTACT_EMAIL,
      subject,
      text,
    })
    return { sent: true }
  } catch (err) {
    console.error('[team-email] send failed', (err as Error).message)
    return { sent: false }
  }
}
