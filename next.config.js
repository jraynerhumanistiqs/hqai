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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
    '/api/administrator/documents/**': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/**/render**':                ['./node_modules/@sparticuz/chromium/bin/**'],
  },
  async headers() {
    return [
      {
        // Apply to all routes.
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
module.exports = nextConfig
