import { getStripe } from '@/lib/stripe'
import { sendPaymentConfirmationEmail, sendWelcomeEmail } from '@/lib/email'
import { C10_SELF_SERVE } from '@/lib/pricing-config'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Display names for the confirmation email, per the C10 branding
// (never "Solo" alone). Unknown plan ids fall back to the raw id.
const PLAN_DISPLAY: Record<string, { name: string; band: string }> = {
  solo:     { name: C10_SELF_SERVE.bundle.name,  band: C10_SELF_SERVE.bundle.solo.label },
  business: { name: C10_SELF_SERVE.bundle.name,  band: C10_SELF_SERVE.bundle.business.label },
  recruit:  { name: C10_SELF_SERVE.recruit.name, band: 'hiring only' },
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      if (session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription)
        const businessId = subscription.metadata.business_id
        const plan = subscription.metadata.plan
        if (businessId) {
          // Read the prior subscription id BEFORE the update - it is the
          // "first ever checkout" signal that gates the welcome email (a
          // cancel-then-resubscribe later must not re-welcome).
          const { data: priorBiz } = await supabase
            .from('businesses')
            .select('stripe_subscription_id')
            .eq('id', businessId)
            .maybeSingle()
          const isFirstCheckout = !priorBiz?.stripe_subscription_id

          await supabase.from('businesses').update({
            stripe_subscription_id: subscription.id,
            subscription_status: 'active',
            plan: plan || 'business',
          }).eq('id', businessId)
          // Grant the recurring credit allocation for this plan. The
          // amounts mirror lib/pricing-config.ts §includedCredits and the
          // brief's §2.3 packaging table.
          // Enterprise customers carry the Business credit ceiling
          // (Full Enterprise gets a higher allowance because it combines
          // both People and Recruit surfaces). Source: lib/pricing-config.ts
          // §enterprise and the strategy doc §2.x.
          const allocationByPlan: Record<
            'solo' | 'business' | 'recruit' | 'enterprise-people' | 'enterprise-recruit' | 'enterprise-full',
            number
          > = {
            solo:                  500,
            business:              2500,
            // Standalone HQ Recruit (hiring only) - mirrors the recruit
            // standalone credit allowance in lib/stripe.ts PLANS.recruit
            // (C10_SELF_SERVE.recruit.bands[0].credits).
            recruit:               500,
            'enterprise-people':   2500,
            'enterprise-recruit':  2500,
            'enterprise-full':     5000,
          }
          type PlanKey = keyof typeof allocationByPlan
          const planKey: PlanKey = (plan && plan in allocationByPlan)
            ? (plan as PlanKey)
            : 'business'
          const allocated = allocationByPlan[planKey]
          await supabase.from('credit_allocations').insert({
            business_id:  businessId,
            allocated,
            period_start: new Date().toISOString(),
            source:       'subscription',
            stripe_invoice_id: session.invoice ?? null,
          })

          // Post-payment emails + funnel event. NOTHING in this block may
          // fail the webhook - the subscription update above already
          // succeeded and Stripe retries on non-2xx, which would double
          // the credit allocation. Log and continue on any failure.
          try {
            const cycle: 'monthly' | 'annual' = subscription.metadata.cycle === 'annual' ? 'annual' : 'monthly'
            const amountAud = typeof session.amount_total === 'number' ? session.amount_total / 100 : null

            // Recipient: the Stripe-confirmed email first, then the
            // business owner's profile as the fallback.
            const { data: owner } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('business_id', businessId)
              .eq('role', 'owner')
              .limit(1)
              .maybeSingle()
            const recipient: string = session.customer_details?.email
              || session.customer_email
              || owner?.email
              || ''
            const firstName = String(owner?.full_name || session.customer_details?.name || '')
              .trim()
              .split(/\s+/)[0] || ''

            if (recipient) {
              const display = PLAN_DISPLAY[planKey] ?? { name: planKey, band: 'plan' }
              const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.humanistiqs.ai'
              const dashboardUrl = `${baseUrl}/dashboard`
              const nextBillDate = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                    .toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
                : null

              if (isFirstCheckout) {
                await sendWelcomeEmail({ toEmail: recipient, firstName, dashboardUrl })
              }
              await sendPaymentConfirmationEmail({
                toEmail: recipient,
                firstName,
                planName: display.name,
                bandLabel: display.band,
                amountAud,
                cycle,
                nextBillDate,
                dashboardUrl,
              })
            } else {
              console.warn('[stripe/webhook] no recipient resolved for welcome email', { businessId })
            }

            // checkout_completed funnel event - server-side, the only
            // reliable place to record it. Soft-fails if the
            // funnel_events migration is unapplied.
            const { error: funnelErr } = await supabase.from('funnel_events').insert({
              event: 'checkout_completed',
              user_id: null,
              plan: planKey,
              cycle,
              source: 'stripe_webhook',
              // is_recovery (a prior checkout_cancelled exists) is left to
              // analysis time - it joins cleanly on user_id/anon_id there,
              // and a wrong live guess is worse than none.
              props: { amount_aud: amountAud, business_id: businessId },
            })
            if (funnelErr) console.warn('[stripe/webhook] funnel_events insert failed:', funnelErr.message)
          } catch (err) {
            console.error('[stripe/webhook] post-payment email/telemetry failed (webhook still OK):', err)
          }
        }
      } else if (session.metadata?.offer_id) {
        // B10 - one-off Letter-of-Offer purchase. Records a credit
        // ledger row keyed by the customer email so the fulfilment
        // worker can locate it when the user follows the success
        // URL.
        const offerId = String(session.metadata.offer_id)
        const credits = Number(session.metadata.credit_amount ?? '1')
        const email = String(session.metadata.customer_email ?? session.customer_email ?? '')
        await supabase.from('credit_ledger').insert({
          business_id:     null,
          user_id:         null,
          tool:            'one_off',
          intent:          `one_off:${offerId}`,
          cost:            -credits, // negative = credit granted
          stripe_event_id: event.id,
          notes:           email ? `one-off purchase for ${email}` : null,
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as any
      const businessId = subscription.metadata?.business_id
      if (businessId) {
        await supabase.from('businesses').update({
          subscription_status: subscription.status,
        }).eq('id', businessId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any
      const businessId = subscription.metadata?.business_id
      if (businessId) {
        await supabase.from('businesses').update({
          subscription_status: 'cancelled',
          plan: 'free',
        }).eq('id', businessId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
