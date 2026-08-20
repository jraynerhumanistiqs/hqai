// /offer/success - lands here from Stripe Checkout. Triggers the
// fulfilment endpoint, surfaces the email-delivery state, and provides
// the shareable /doc/<id> link inline so the buyer can preview before
// the email arrives.

import OfferSuccessClient from './OfferSuccessClient'

export const dynamic = 'force-dynamic'

export default async function OfferSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  return <OfferSuccessClient sessionId={params.session_id ?? null} />
}
