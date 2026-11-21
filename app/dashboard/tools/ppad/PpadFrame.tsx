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
 */
export default function PpadFrame() {
  return (
    <div className="flex-1 min-h-0 bg-bg">
      <iframe
        src="/tools/ppad/app.html"
        title="HQ Performance"
        className="h-full w-full border-0 block"
      />
    </div>
  )
}
