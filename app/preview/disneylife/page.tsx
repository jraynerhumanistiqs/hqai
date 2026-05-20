// Disney Life UI-kit theme preview.
//
// Standalone sandbox at /preview/disneylife. Renders representative
// dashboard chrome (sidebar, hero, metric cards, AI advisor chat,
// CV scorecard, pricing card, table, modal, button states) styled
// against the Disney Life colour palette + bold-sans typography the
// founder asked me to test.
//
// Scope is deliberately tight: this page does NOT use the real
// dashboard layout, does NOT modify any live in-app component, and
// does NOT touch app/globals.css tokens. The only file that ships is
// this one - so reverting the experiment is a single `git rm`.

import DisneyLifePreview from './DisneyLifePreview'

export const metadata = {
  title: 'Disney Life palette preview - HQ.ai',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <DisneyLifePreview />
}
