'use client'

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Routes that never report a pageview.
//
// HQ Performance renders employee performance records. Vercel Analytics is
// pageview-based rather than session replay, and the tool itself lives in a
// static iframe document that the Next layout never wraps - so no record
// content could reach Vercel either way. This is about the URL: a path is
// still a signal about who is being appraised and when, and the honest answer
// to "is this route excluded from analytics" should be yes, not "nothing
// sensitive travels anyway".
const EXCLUDED = ['/dashboard/tools/ppad', '/tools/ppad']

const excluded = (url: string) => {
  try {
    // event.url is absolute; compare on the path so a query string or host
    // cannot slip past the check.
    const path = new URL(url, 'http://localhost').pathname
    return EXCLUDED.some(p => path === p || path.startsWith(p + '/'))
  } catch {
    return EXCLUDED.some(p => url.includes(p))
  }
}

/**
 * Site analytics, with HQ Performance excluded.
 *
 * A client component because `beforeSend` is a function, and a function prop
 * cannot cross from the server-rendered root layout into a client component.
 */
export default function SiteAnalytics() {
  return (
    <>
      <SpeedInsights beforeSend={(data) => (excluded(data.url) ? null : data)} />
      <Analytics beforeSend={(event: BeforeSendEvent) => (excluded(event.url) ? null : event)} />
    </>
  )
}
