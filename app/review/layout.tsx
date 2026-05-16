// A3 - review tokens are product UI for client share-links.
import ThemeBoundary from '@/components/theme/ThemeBoundary'

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <ThemeBoundary app="product">{children}</ThemeBoundary>
}
