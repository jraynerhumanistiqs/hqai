// A3 - prescreen is candidate-facing product UI. Wraps every
// /prescreen/[id] page in the product (Option 3) theme scope.

import ThemeBoundary from '@/components/theme/ThemeBoundary'

export default function PrescreenLayout({ children }: { children: React.ReactNode }) {
  return <ThemeBoundary app="product">{children}</ThemeBoundary>
}
