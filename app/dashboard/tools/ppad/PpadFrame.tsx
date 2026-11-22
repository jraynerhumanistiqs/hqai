/**
 * Frames the HQ Performance app.
 *
 * The document lives at public/tools/ppad/app.html and is served as a static
 * file. It holds no data - every record comes from Supabase at runtime behind
 * RLS - so serving the shell statically costs nothing and keeps it out of the
 * Next bundle entirely, which is the isolation this route is built around.
 *
 * `title` is required for screen readers. `sandbox` is deliberately NOT set:
 * the frame needs same-origin to read the Supabase session cookie, and
 * `allow-same-origin` with `allow-scripts` on our own document is equivalent
 * to no sandbox while reading as though it were hardened.
 *
 * WHY THERE IS NO PAGE HEADER HERE ANY MORE.
 *
 * This route used to carry the shared DASH-06 PageHeader above the iframe.
 * That stacked TWO header bands before a single row of content: the
 * dashboard's eyebrow + title + subtitle, and then the tool's own 60px
 * sticky header holding the app name, the tabs, the cycle selector and the
 * save status. The tabs sat in the second band while the first one carried a
 * wide empty space beside the title - which is exactly what looked unfinished.
 *
 * The fix moves the TITLE DOWN rather than the tabs up. The tool's own header
 * is now the page header: its app name is set at page-title weight and the
 * tabs sit on that same line. One band instead of two.
 *
 * The alternative - rendering the tabs out here in React - was considered and
 * rejected. The tabs live inside the iframe; lifting them would need a bridge
 * across the document boundary, would duplicate the role logic out here (an
 * employee is offered two tabs, an admin five), and would leave the tool with
 * no navigation when opened directly at /tools/ppad/app.html. That coupling
 * is the precise thing the iframe was chosen to prevent.
 *
 * Nothing inside the iframe is touched by any of this: same src, same
 * same-origin isolation, same adapter, same access model. PpadUpsell keeps
 * its PageHeader - that one IS an ordinary dashboard page.
 */
export default function PpadFrame() {
  return (
    // Edge to edge and top to bottom. The tool owns the whole pane and does
    // its own scrolling, so there is never a second scrollbar.
    <iframe
      src="/tools/ppad/app.html"
      title="HQ Performance"
      className="block min-h-0 w-full flex-1 border-0 bg-bg"
    />
  )
}
