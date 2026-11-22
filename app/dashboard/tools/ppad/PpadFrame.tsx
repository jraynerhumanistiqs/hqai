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
 * WHY THE PAGE HEADER IS HERE AND THE WIDTH IS NOT.
 *
 * This route used to be a bare full-bleed iframe with no dashboard chrome at
 * all, so HQ Tools read as a different product bolted into the shell while
 * every other surface carried the DASH-06 header. It now uses the same shared
 * PageHeader as HQ Assistant.
 *
 * What it does NOT copy is HQ Assistant's max-w-4xl column, and that is
 * deliberate. PageHeader's own note is explicit - "each page keeps its own
 * content width... Consistency = header grammar, not column width" - and here
 * the width is load-bearing rather than cosmetic: the tool's header is a
 * single flex row that only just fits seven admin tabs at 1180px. Squeezing
 * the iframe to 896px would put its nav back into a permanent scroll and hide
 * the org name on every screen, which is a change to the tool's behaviour, not
 * its frame. The header gets the dashboard's gutters so its left edge lines up
 * with the card below it, and the tool keeps the room it needs.
 *
 * Nothing inside the iframe is touched by any of this: same src, same
 * same-origin isolation, same adapter, same access model.
 */
export default function PpadFrame() {
  return (
    // Column, not a scroll container. The iframe owns its own scrolling, so
    // the header stays put and there is never a second scrollbar.
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <div className="px-4 pt-8 sm:px-6">
        <PageHeader
          eyebrow="HQ Tools"
          title="HQ Performance"
          subtitle="Plan, perform, assess, develop - one cycle a year. You see your own record and anyone you are allocated to, and nothing else."
          className="mb-5"
        />
      </div>

      <div className="min-h-0 flex-1 px-4 pb-6 sm:px-6">
        {/* The card treatment HQ Assistant uses for its panels. overflow-hidden
            is what makes the iframe's square corners follow the radius; it
            cannot affect the tool's own sticky header, which is positioned
            against the iframe's viewport, not this one. */}
        <div className="h-full overflow-hidden rounded-3xl border border-border bg-bg-elevated shadow-card">
          <iframe
            src="/tools/ppad/app.html"
            title="HQ Performance"
            className="block h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  )
}
