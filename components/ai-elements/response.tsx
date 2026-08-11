'use client'

// Vercel AI Elements - Response. Wraps `streamdown` (the streaming-aware
// markdown renderer) so partial markdown during a stream never renders
// broken. Re-skinned to HQ.ai: because this project does not ship the
// Tailwind typography plugin, prose element styling is applied here via
// child-combinator utilities that map onto the Wattle Gold tokens, so the
// output matches the rest of the product surface in light and dark.

import { cn } from '@/lib/utils'
import { memo } from 'react'
import { Streamdown } from 'streamdown'

type ResponseProps = React.ComponentProps<typeof Streamdown>

const PROSE = [
  'text-sm leading-relaxed text-ink',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  '[&_p]:mb-2.5 [&_p:last-child]:mb-0',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1',
  '[&_li]:leading-relaxed [&_li]:marker:text-ink-muted',
  '[&_h1]:font-display [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1',
  '[&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1',
  '[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1',
  '[&_strong]:font-semibold [&_strong]:text-ink',
  '[&_em]:italic',
  '[&_a]:text-clay-ink [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-clay-hover',
  '[&_code]:rounded [&_code]:bg-bg-soft [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-ink',
  '[&_pre]:my-2.5 [&_pre]:rounded-xl [&_pre]:bg-bg-soft [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-ink-soft [&_blockquote]:my-2',
  '[&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse',
  '[&_th]:border [&_th]:border-border [&_th]:bg-bg-soft [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
  '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
  '[&_hr]:my-3 [&_hr]:border-border',
  '[&_img]:max-w-full [&_img]:rounded-xl',
].join(' ')

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown className={cn(PROSE, className)} {...props} />
  ),
  (prev, next) => prev.children === next.children,
)

Response.displayName = 'Response'
