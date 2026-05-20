// "Premium minimal" UI kit preview - the Apple-store / luxury-product
// aesthetic from the Sketch kit the founder uploaded.
//
// Standalone sandbox at /preview/minimal. Same scope discipline as the
// previous preview: this page is the only file that ships; nothing in
// the live dashboard, the global tokens, or the landing page changes.
// Revert is a single `git rm -r app/preview/minimal`.

import MinimalPreview from './MinimalPreview'

export const metadata = {
  title: 'Premium minimal palette preview - HQ.ai',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <MinimalPreview />
}
