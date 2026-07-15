// Shared docx letterhead logo builder for the CV report routes
// (app/api/cv-screening/report, app/api/cv-screening/screenings/[id]/export).
//
// Fetches the customer's uploaded brand logo (businesses.logo_url) and
// returns a docx Header that places it top-right of every page. The
// image-size probe reads the natural dimensions of the uploaded image so
// we can scale it to fit a bounding box without stretching (fix: tall or
// square logos previously came out squashed or oversized and overlapped
// the report heading when the transformation was hard-coded).
//
// Fails gracefully: missing URL, fetch error, undecodable image, or
// natural dimensions unavailable -> null (no header) rather than failing
// the document build. Callers can fall back to a text-only letterhead.

import { AlignmentType, Header, ImageRun, Paragraph } from 'docx'

// Bounding box the logo is scaled into (docx px). Small enough that the
// header never collides with the document heading below it.
const BOX_W = 160
const BOX_H = 56

export async function buildLogoHeader(
  logoUrl: string | null | undefined,
  logPrefix = '[report-logo]',
): Promise<Header | null> {
  if (!logoUrl) return null
  try {
    const res = await fetch(logoUrl, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`${logPrefix} logo fetch failed (${res.status}) for ${logoUrl}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const ct = (res.headers.get('content-type') ?? '').toLowerCase()
    const type: 'png' | 'jpg' | 'gif' | 'bmp' =
        ct.includes('png')  ? 'png'
      : ct.includes('jpeg') ? 'jpg'
      : ct.includes('jpg')  ? 'jpg'
      : ct.includes('gif')  ? 'gif'
      : ct.includes('bmp')  ? 'bmp'
      : 'png'

    // Probe natural dimensions so we can scale proportionally inside the
    // bounding box. image-size is already in node_modules (transitive
    // dep). If the probe fails, fall back to a small fixed size so the
    // header still renders, just slightly squashed.
    let drawW = 120
    let drawH = 40
    try {
      const probe = (await import('image-size')).default(buf) as { width?: number; height?: number }
      if (probe?.width && probe?.height) {
        const scale = Math.min(BOX_W / probe.width, BOX_H / probe.height)
        drawW = Math.max(1, Math.round(probe.width * scale))
        drawH = Math.max(1, Math.round(probe.height * scale))
      }
    } catch (err) {
      console.warn(`${logPrefix} image-size probe failed, using default 120x40:`, (err as Error).message)
    }

    return new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          // Breathing room below the logo so it never touches the
          // document heading that follows.
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: buf,
              transformation: { width: drawW, height: drawH },
              type,
            } as ConstructorParameters<typeof ImageRun>[0]),
          ],
        }),
      ],
    })
  } catch (err) {
    console.warn(`${logPrefix} logo embed failed:`, (err as Error).message)
    return null
  }
}
