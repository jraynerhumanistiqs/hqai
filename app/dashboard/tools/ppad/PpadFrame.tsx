import { PageHeader } from '@/components/dashboard/PageHeader'

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
 * WHY THE IFRAME IS FULL-BLEED AND THE HEADER IS NOT.
 *
 * The page keeps the shared DASH-06 PageHeader, so HQ Tools reads as part of
 * the dashboard rather than a different product bolted into the shell. The
 * tool itself gets the whole width below it - no card, no gutters.
 *
 * It was briefly in a bordered card matching HQ Assistant's panels. That is
 * the right treatment for a panel of content and the wrong one for an
 * application: the tool is a dense working surface with its own header, nav,
 * cycle selector and wide tables, and every pixel the frame took was a pixel
 * it could not use. The card cost 48px of gutters plus 2px of border, which is
 * free at 1366px and above (the tool caps its own content at 1180) but bites
 * on a 1280px laptop, exactly where the tool is already tightest.
 *
 * So: header grammar from the dashboard, full width for the application. The
 * iframe is edge-to-edge and runs to the bottom of the viewport.
 *
 * Nothing inside the iframe is touched by any of this: same src, same
 * same-origin isolation, same adapter, same access model.
 */
export default function PpadFrame() {
  return (
    // Column, not a scroll container. The iframe owns its own scrolling, so
    // the header stays put and there is never a second scrollbar.
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      {/* The header keeps the dashboard's gutters. The iframe below does not -
          it is the application, not a panel. */}
      <div className="px-4 pt-6 sm:px-6">
        <PageHeader
          eyebrow="HQ Tools"
          title="HQ Performance"
          subtitle="Plan, perform, assess, develop - one cycle a year. You see your own record and anyone you are allocated to, and nothing else."
          className="mb-4"
        />
      </div>

      <iframe
        src="/tools/ppad/app.html"
        title="HQ Performance"
        className="block min-h-0 w-full flex-1 border-0"
      />
    </div>
  )
}
