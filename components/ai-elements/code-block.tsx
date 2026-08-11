'use client'

// Vercel AI Elements - CodeBlock. Code fences inside a Response are rendered
// (with a copy control) by `streamdown` directly, so this module re-exports
// streamdown's CodeBlock primitives under the AI Elements name for any
// standalone use (e.g. rendering a fenced snippet outside a Response).

export {
  CodeBlock,
  CodeBlockCopyButton,
} from 'streamdown'
