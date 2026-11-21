/** @type {import('next').NextConfig} */

// Security response headers applied to every route. Vercel sets a default
// HSTS upstream but we set our own here so the policy is visible in the
// repo and travels with the deployment regardless of provider.
//
// Notes:
// - CSP is intentionally NOT set yet because the chat + recruit surface
//   uses inline event handlers + Cloudflare Stream iframes + Supabase
//   subscriptions; a strict CSP would need a long allow-list and is best
//   added in a focused follow-up. Other headers are safe to apply now.
const securityHeaders = [
  // HSTS - tell browsers to only use HTTPS for the next 2 years.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Block clickjacking framing of our pages.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers MIME-sniffing responses, blocks one class of XSS.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't send full URL referer to other origins (no leaking conv ids etc).
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Lock down browser feature access we don't use.
  { key: 'Permissions-Policy', value: 'camera=(self "https://*.cloudflarestream.com"), microphone=(self "https://*.cloudflarestream.com"), geolocation=(), payment=(self "https://js.stripe.com"), usb=(), interest-cohort=()' },
  // No FLoC / Topics inclusion (defensive even though deprecated).
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  // Pin the workspace root to this directory.
  //
  // The parent folder carries its own package-lock.json, so Next detects two
  // lockfiles and infers the PARENT as the workspace root. Turbopack then
  // watches and resolves against that whole tree, and `next dev` hangs at
  // "Compiling /" without ever serving a request. Setting the root explicitly
  // keeps resolution and filesystem watching inside hqai/.
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Barrel-file optimisation. These packages export everything through a
  // single index (a "barrel"), so a plain `import { X } from 'pkg'` can pull
  // the whole package into the bundle. optimizePackageImports rewrites those
  // to direct deep imports at build time, so only the pieces actually used
  // ship. TipTap (the doc editor) and Radix are the heaviest modular client
  // libraries in the app; trimming them shrinks the editor + dialog/menu
  // surfaces' JS.
  experimental: {
    optimizePackageImports: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
    ],
  },
  // Vercel / Next bundles server modules through Webpack which relocates
  // node_modules into the lambda. @sparticuz/chromium ships a `bin/`
  // directory with the Chromium binary (.tar.br) that the relocator
  // does not copy, so the runtime throws:
  //   "The input directory /var/task/node_modules/@sparticuz/chromium/bin
  //    does not exist."
  // Externalising the package keeps it in node_modules at its expected
  // path, and outputFileTracingIncludes tells Next's lambda packer to
  // include the bin/ assets in the deployment artefact.
  // See: https://github.com/Sparticuz/chromium#bundler-configuration
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/documents/**': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/**/render**':                ['./node_modules/@sparticuz/chromium/bin/**'],
  },
  async headers() {
    return [
      {
        // Apply to all routes.
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // HQ Performance (PPAD). The app document is a static file under
        // public/, so unlike the /dashboard route that frames it, it is
        // directly reachable and would otherwise be crawlable. It carries its
        // own noindex meta too; this covers the case where a crawler reads
        // headers without executing the page. There is no root sitemap to
        // exclude it from (only app/careers/sitemap.ts, which is scoped).
        source: '/tools/ppad/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          // The global policy above sends X-Frame-Options: DENY, which
          // forbids framing by ANYONE - same-origin included. HQ Performance
          // is rendered in a same-origin iframe by /dashboard/tools/ppad, so
          // under DENY the browser refuses the document and leaves an empty
          // cross-origin placeholder: a blank white page with no console
          // error in the framed document itself.
          //
          // SAMEORIGIN for old browsers, frame-ancestors 'self' for the ones
          // that honour CSP (it supersedes X-Frame-Options where both are
          // present). Every other route keeps DENY.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // Route renamed July 2026: /enterprise -> /outsourcing. Permanent so
      // existing links, already-sent discovery emails, and SEO forward cleanly.
      { source: '/enterprise', destination: '/outsourcing', permanent: true },
    ]
  },
}
module.exports = nextConfig
