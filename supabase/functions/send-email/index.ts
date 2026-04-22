// ── Supabase Edge Function: send-email ────────────────────────
// Deploy this to Supabase: supabase functions deploy send-email
// Uses Resend (resend.com) - free tier: 3,000 emails/month
//
// File location in your project:
// supabase/functions/send-email/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'HQ.ai by Humanistiqs <noreply@humanistiqs.ai>'
const APP_URL = Deno.env.get('APP_URL') || 'https://hqai.vercel.app'

// ── Email templates ───────────────────────────────────────────

function welcomeEmail(userName: string, bizName: string) {
  return {
    subject: `Welcome to HQ.ai, ${userName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'DM Sans', -apple-system, sans-serif; background: #F5F0E8; margin: 0; padding: 40px 20px; }
  .card { background: white; border-radius: 16px; padding: 40px; max-width: 520px; margin: 0 auto; }
  .logo { font-size: 24px; font-weight: 400; color: #2C2417; margin-bottom: 8px; }
  .logo span { color: #2D6E63; }
  .sub { font-size: 12px; color: #8B7B66; margin-bottom: 32px; }
  h1 { font-size: 26px; font-weight: 400; color: #2C2417; margin-bottom: 12px; line-height: 1.3; }
  p { font-size: 14px; color: #5C4F3A; line-height: 1.7; margin-bottom: 14px; }
  .btn { display: inline-block; background: #2D6E63; color: white; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; text-decoration: none; margin: 8px 0 24px; }
  .features { background: #F5F0E8; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
  .feature { display: flex; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #5C4F3A; }
  .feature:last-child { margin-bottom: 0; }
  .footer { font-size: 11px; color: #C4BAA8; text-align: center; margin-top: 24px; border-top: 1px solid #EDE7D9; padding-top: 16px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">HQ<span>.ai</span></div>
  <div class="sub">by Humanistiqs</div>
  <h1>Welcome to HQ.ai, ${userName} 👋</h1>
  <p>Your AI-powered HR headquarters is ready. ${bizName} is all set up - here's what you can do right now:</p>
  <div class="features">
    <div class="feature">⚖️ <span>Ask HQ anything about employment law, awards, and compliance</span></div>
    <div class="feature">📄 <span>Generate employment contracts, offer letters, and HR documents</span></div>
    <div class="feature">📢 <span>Create job advertisements and manage your hiring pipeline</span></div>
    <div class="feature">🤝 <span>Connect with your Humanistiqs advisor for complex matters</span></div>
  </div>
  <a href="${APP_URL}" class="btn">Open HQ.ai →</a>
  <p style="font-size:13px;color:#8B7B66;">Questions? Reply to this email or reach your Humanistiqs advisor directly.</p>
  <div class="footer">HQ.ai by Humanistiqs · humanistiqs.ai · Unsubscribe</div>
</div>
</body>
</html>`
  }
}

function inviteEmail(inviterBizName: string, role: string, inviteUrl: string) {
  return {
    subject: `You've been invited to ${inviterBizName}'s HQ.ai workspace`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #F5F0E8; margin: 0; padding: 40px 20px; }
  .card { background: white; border-radius: 16px; padding: 40px; max-width: 520px; margin: 0 auto; }
  .logo { font-size: 22px; color: #2C2417; margin-bottom: 4px; }
  .logo span { color: #2D6E63; }
  .sub { font-size: 11px; color: #8B7B66; margin-bottom: 28px; }
  h1 { font-size: 22px; font-weight: 400; color: #2C2417; margin-bottom: 10px; }
  p { font-size: 14px; color: #5C4F3A; line-height: 1.7; margin-bottom: 14px; }
  .role-pill { display: inline-block; background: #EAF4F2; color: #2D6E63; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-bottom: 16px; }
  .btn { display: inline-block; background: #2D6E63; color: white; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; text-decoration: none; margin: 4px 0 20px; }
  .footer { font-size: 11px; color: #C4BAA8; text-align: center; margin-top: 24px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">HQ<span>.ai</span></div>
  <div class="sub">by Humanistiqs</div>
  <h1>${inviterBizName} has invited you to HQ.ai</h1>
  <div class="role-pill">${role} access</div>
  <p>You've been given ${role} access to ${inviterBizName}'s HQ.ai workspace - their AI-powered HR and recruitment platform.</p>
  <p>Click below to create your account and get started.</p>
  <a href="${inviteUrl}" class="btn">Accept invitation →</a>
  <p style="font-size:12px;color:#8B7B66;">This invite link expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
  <div class="footer">HQ.ai by Humanistiqs · humanistiqs.ai</div>
</div>
</body>
</html>`
  }
}

function advisorHandoffEmail(
  advisorName: string,
  advisorEmail: string,
  bizName: string,
  bizIndustry: string,
  bizState: string,
  bizAward: string,
  bizSize: string,
  lastQuestion: string,
  sessionSummary: string
) {
  return {
    to: advisorEmail,
    subject: `HQ.ai handoff - ${bizName} needs your help`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #F5F0E8; margin: 0; padding: 40px 20px; }
  .card { background: white; border-radius: 16px; padding: 36px; max-width: 560px; margin: 0 auto; }
  .badge { display: inline-block; background: #FAF0EC; color: #C4593A; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; margin-bottom: 16px; }
  h1 { font-size: 20px; font-weight: 500; color: #2C2417; margin-bottom: 6px; }
  .context-block { background: #F5F0E8; border-radius: 10px; padding: 16px; margin: 16px 0; font-size: 13px; color: #5C4F3A; line-height: 1.7; }
  .context-row { display: flex; gap: 8px; margin-bottom: 6px; }
  .context-label { font-weight: 500; min-width: 80px; color: #8B7B66; }
  .question-block { background: #EAF4F2; border-left: 3px solid #2D6E63; border-radius: 0 8px 8px 0; padding: 14px; margin: 16px 0; font-size: 13px; color: #2C2417; line-height: 1.6; font-style: italic; }
  p { font-size: 14px; color: #5C4F3A; line-height: 1.7; margin-bottom: 14px; }
  .footer { font-size: 11px; color: #C4BAA8; text-align: center; margin-top: 20px; border-top: 1px solid #EDE7D9; padding-top: 14px; }
</style>
</head>
<body>
<div class="card">
  <div class="badge">⚠️ Advisor handoff</div>
  <h1>Hi ${advisorName}, ${bizName} needs your help</h1>
  <p>HQ.ai has escalated a conversation from one of your clients. Here's everything you need to know before reaching out - no need for them to repeat context.</p>
  <div class="context-block">
    <div class="context-row"><span class="context-label">Business</span><span>${bizName}</span></div>
    <div class="context-row"><span class="context-label">Industry</span><span>${bizIndustry}</span></div>
    <div class="context-row"><span class="context-label">State</span><span>${bizState}</span></div>
    <div class="context-row"><span class="context-label">Award</span><span>${bizAward || 'Not specified'}</span></div>
    <div class="context-row"><span class="context-label">Headcount</span><span>${bizSize}</span></div>
  </div>
  <p><strong>Their last question:</strong></p>
  <div class="question-block">"${lastQuestion}"</div>
  ${sessionSummary ? `<p><strong>Session summary:</strong></p><div class="context-block">${sessionSummary}</div>` : ''}
  <p>Recommended next step: reach out within 2 business hours and reference their specific situation above.</p>
  <div class="footer">HQ.ai by Humanistiqs · This is an automated handoff notification</div>
</div>
</body>
</html>`
  }
}

function weeklyDigestEmail(
  userName: string,
  bizName: string,
  conversationCount: number,
  documentCount: number,
  topTopics: string[]
) {
  return {
    subject: `Your HQ.ai weekly summary - ${bizName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #F5F0E8; margin: 0; padding: 40px 20px; }
  .card { background: white; border-radius: 16px; padding: 36px; max-width: 520px; margin: 0 auto; }
  .logo { font-size: 20px; color: #2C2417; margin-bottom: 4px; }
  .logo span { color: #2D6E63; }
  .sub { font-size: 11px; color: #8B7B66; margin-bottom: 24px; }
  h1 { font-size: 22px; font-weight: 400; color: #2C2417; margin-bottom: 16px; }
  .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; background: #F5F0E8; border-radius: 10px; padding: 14px; text-align: center; }
  .stat-num { font-size: 28px; font-weight: 400; color: #2D6E63; }
  .stat-label { font-size: 11px; color: #8B7B66; margin-top: 2px; }
  p { font-size: 13px; color: #5C4F3A; line-height: 1.7; margin-bottom: 12px; }
  .topic-list { padding-left: 18px; margin: 8px 0 16px; }
  .topic-list li { font-size: 13px; color: #5C4F3A; margin-bottom: 4px; }
  .footer { font-size: 11px; color: #C4BAA8; text-align: center; margin-top: 20px; border-top: 1px solid #EDE7D9; padding-top: 14px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">HQ<span>.ai</span></div>
  <div class="sub">by Humanistiqs</div>
  <h1>Your week in review, ${userName}</h1>
  <div class="stats-row">
    <div class="stat"><div class="stat-num">${conversationCount}</div><div class="stat-label">Conversations</div></div>
    <div class="stat"><div class="stat-num">${documentCount}</div><div class="stat-label">Documents</div></div>
  </div>
  ${topTopics.length > 0 ? `
  <p><strong>Topics you asked about this week:</strong></p>
  <ul class="topic-list">
    ${topTopics.map(t => `<li>${t}</li>`).join('')}
  </ul>` : ''}
  <p>Keep building - your Humanistiqs advisor is always one click away for anything complex.</p>
  <div class="footer">HQ.ai by Humanistiqs · humanistiqs.ai · Manage email preferences</div>
</div>
</body>
</html>`
  }
}

// ── Edge Function handler ─────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { type, to, data } = await req.json()

  let emailPayload: { subject: string; html: string; to?: string } | null = null

  switch (type) {
    case 'welcome':
      emailPayload = { to, ...welcomeEmail(data.userName, data.bizName) }
      break
    case 'invite':
      emailPayload = { to, ...inviteEmail(data.bizName, data.role, `${APP_URL}?invite=${data.inviteId}`) }
      break
    case 'advisor-handoff':
      emailPayload = advisorHandoffEmail(
        data.advisorName, data.advisorEmail,
        data.bizName, data.bizIndustry, data.bizState,
        data.bizAward, data.bizSize, data.lastQuestion, data.sessionSummary
      )
      break
    case 'weekly-digest':
      emailPayload = { to, ...weeklyDigestEmail(data.userName, data.bizName, data.conversationCount, data.documentCount, data.topTopics || []) }
      break
    default:
      return new Response('Unknown email type', { status: 400 })
  }

  if (!emailPayload) {
    return new Response('Failed to build email', { status: 500 })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: emailPayload.to || to,
      subject: emailPayload.subject,
      html: emailPayload.html
    })
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  const result = await res.json()
  return new Response(JSON.stringify({ id: result.id }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
