// /landing-page now permanently redirects to the root route, which is
// the canonical marketing front door. Kept so any existing links / ads
// pointing at /landing-page still resolve.

import { redirect } from 'next/navigation'

export const metadata = {
  alternates: { canonical: '/' },
  robots: { index: false, follow: true },
}

export default function LandingPageRedirect() {
  redirect('/')
}
