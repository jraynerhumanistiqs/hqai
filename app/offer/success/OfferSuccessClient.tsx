'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type State =
  | { kind: 'pending' }
  | { kind: 'fulfilled'; documentId: string; shareUrl: string; emailSent: boolean }
  | { kind: 'already';   documentId: string }
  | { kind: 'error';     message: string }

interface Props {
  sessionId: string | null
}

export default function OfferSuccessClient({ sessionId }: Props) {
  const [state, setState] = useState<State>({ kind: 'pending' })

  useEffect(() => {
    if (!sessionId) {
      setState({ kind: 'error', message: 'Missing checkout session.' })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/administrator/one-off/fulfil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setState({ kind: 'error', message: data?.error || `Fulfilment failed (HTTP ${res.status}).` })
          return
        }
        if (data.already_fulfilled) {
          setState({ kind: 'already', documentId: data.document_id })
        } else {
          setState({
            kind: 'fulfilled',
            documentId: data.document_id,
            shareUrl:   data.share_url,
            emailSent:  !!data.email_sent,
          })
        }
      } catch (err) {
        if (!cancelled) setState({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' })
      }
    })()
    return () => { cancelled = true }
  }, [sessionId])

  return (
    <main className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold text-ink hover:text-accent">
            HQ.ai
          </Link>
          <Link href="/offer" className="text-xs font-bold text-ink-soft hover:text-ink">
            Need another letter?
          </Link>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-16">
        {state.kind === 'pending' && (
          <Block
            title="I'm writing your Letter of Offer now."
            body="This usually takes a minute or two. Keep this tab open - the preview will appear here and a copy will land in your inbox."
            spinner
          />
        )}

        {state.kind === 'fulfilled' && (
          <Block
            title="Done. It's on its way to your inbox."
            body={state.emailSent
              ? "Word doc + PDF are attached to the email. The shareable preview link is also below if you want to forward it to the candidate."
              : "The document is generated and saved. The email did not send - download it directly using the buttons below or contact support@humanistiqs.com.au."}
          >
            <div className="flex flex-wrap gap-2 mt-5">
              <a
                href={state.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-accent hover:bg-accent-hover text-ink-on-accent text-small font-bold rounded-full px-5 py-2.5"
              >
                Open shareable link
              </a>
              <a
                href={`/api/administrator/documents/${state.documentId}/render?format=pdf`}
                className="border border-border hover:bg-bg-soft text-ink text-small font-bold rounded-full px-5 py-2.5"
              >
                Download PDF
              </a>
              <a
                href={`/api/administrator/documents/${state.documentId}/render?format=docx`}
                className="border border-border hover:bg-bg-soft text-ink text-small font-bold rounded-full px-5 py-2.5"
              >
                Download DOCX
              </a>
            </div>
            <UpsellPanel />
          </Block>
        )}

        {state.kind === 'already' && (
          <Block
            title="You've already collected this Letter."
            body="If you've lost the email, use the buttons below to grab the document again - or contact support to resend."
          >
            <div className="flex flex-wrap gap-2 mt-5">
              <a
                href={`/doc/${state.documentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-accent hover:bg-accent-hover text-ink-on-accent text-small font-bold rounded-full px-5 py-2.5"
              >
                Open shareable link
              </a>
              <a
                href={`/api/administrator/documents/${state.documentId}/render?format=pdf`}
                className="border border-border hover:bg-bg-soft text-ink text-small font-bold rounded-full px-5 py-2.5"
              >
                Download PDF
              </a>
              <a
                href={`/api/administrator/documents/${state.documentId}/render?format=docx`}
                className="border border-border hover:bg-bg-soft text-ink text-small font-bold rounded-full px-5 py-2.5"
              >
                Download DOCX
              </a>
            </div>
          </Block>
        )}

        {state.kind === 'error' && (
          <Block
            title="Something went sideways."
            body={state.message + ' Your payment is safe - reply to your Stripe receipt or email support@humanistiqs.com.au with this session id and we will sort it within the hour.'}
          >
            <p className="mt-3 text-xs text-ink-muted">
              session_id: <code className="font-mono">{sessionId ?? 'n/a'}</code>
            </p>
          </Block>
        )}
      </section>
    </main>
  )
}

function Block({
  title,
  body,
  spinner,
  children,
}: {
  title: string
  body: string
  spinner?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="bg-bg-elevated border border-border rounded-panel p-8 shadow-card">
      {spinner && (
        <div className="w-8 h-8 mb-5 rounded-full border-2 border-border border-t-accent animate-spin" />
      )}
      <h1 className="font-display text-h1 font-bold text-ink mb-3">{title}</h1>
      <p className="text-body text-ink-soft max-w-xl">{body}</p>
      {children}
    </div>
  )
}

function UpsellPanel() {
  return (
    <div className="mt-8 border-t border-border pt-6">
      <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
        Want unlimited letters?
      </p>
      <p className="text-small text-ink-soft mb-4 max-w-xl">
        AI Administrator is the same engine running every HR document
        your business needs - contracts, variations, warning letters,
        policies. Cited to Fair Work. $99 / month, 500 credits, three
        seats.
      </p>
      <Link
        href="/login?intent=signup"
        className="inline-block text-small font-bold text-ink underline-offset-4 hover:underline hover:text-accent"
      >
        Start a 14-day trial
      </Link>
    </div>
  )
}
