import Link from 'next/link'

// Terms of Service - defensible scaffolding for HQ.ai. Liability cap, AI
// output disclaimer, AU governing law, acceptance audit trail expected at
// signup. Review with a commercial lawyer before broad commercial launch
// - this is here so the product can ship today with a published,
// linkable terms document rather than the previous dead "#" link.

export const metadata = {
  title: 'Terms of Service - HQ.ai by Humanistiqs',
  description: 'The terms under which you use HQ.ai, operated by Rayner Consulting Group Pty Ltd t/a Humanistiqs.',
}

const LAST_UPDATED = '15 May 2026'
const TERMS_VERSION = '1.0'
const CONTACT_EMAIL = 'legal@humanistiqs.com.au'
const ENTITY = 'Rayner Consulting Group Pty Ltd trading as Humanistiqs (ABN to be supplied)'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <Link href="/" className="text-xs font-bold text-mid hover:text-ink uppercase tracking-wider">
          &larr; Back to HQ.ai
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-charcoal mt-6 mb-2">
          Terms of Service
        </h1>
        <p className="text-xs text-muted mb-10">
          Version {TERMS_VERSION} - last updated {LAST_UPDATED}
        </p>

        <Section title="1. The agreement">
          <P>
            These terms form the agreement between you (the &quot;Customer&quot;) and
            {' '}{ENTITY} (&quot;Humanistiqs&quot;, &quot;we&quot;, &quot;us&quot;) for use of the HQ.ai service
            (the &quot;Service&quot;). By creating an account, you agree to these terms on
            behalf of yourself and any business entity you represent.
          </P>
        </Section>

        <Section title="2. The service">
          <P>
            HQ.ai is a software-as-a-service platform that supports HR and
            recruitment activity for Australian small and medium businesses. It
            includes AI-assisted features that score CVs, transcribe video
            pre-screens, and produce structured candidate summaries.
          </P>
          <P>
            <strong className="text-charcoal">AI outputs are decision support, not decisions.</strong>
            {' '}HQ.ai does not make hiring decisions on your behalf. Every AI output
            is intended to be reviewed by a human before any action is taken
            that affects a candidate. You are responsible for the hiring
            decisions made using the Service.
          </P>
        </Section>

        <Section title="3. Your obligations">
          <Ul items={[
            'Keep your login credentials secure and confidential.',
            'Use the Service in accordance with applicable Australian employment law, anti-discrimination law, and the Australian Privacy Principles.',
            'Only upload candidate information where you have a lawful basis to do so, and only for the purpose of the role you are recruiting.',
            'Do not use the Service to make automated hiring decisions without human review.',
            'Do not attempt to reverse-engineer, scrape, or interfere with the Service.',
            'Pay invoices on time. Persistent non-payment may result in account suspension.',
          ]} />
        </Section>

        <Section title="4. Our obligations">
          <Ul items={[
            'Provide the Service with reasonable skill and care.',
            'Maintain commercially reasonable security measures consistent with our Privacy Policy.',
            'Notify you of any eligible data breach affecting your account in line with the Notifiable Data Breaches scheme.',
            'Provide reasonable support during Australian business hours.',
          ]} />
        </Section>

        <Section title="5. Fees and billing">
          <P>
            Fees, billing periods, and seat limits are as shown on the Service or
            otherwise agreed in writing. Fees are in Australian dollars and exclude
            GST unless stated otherwise. We may change pricing for future billing
            periods with at least 30 days&apos; written notice.
          </P>
        </Section>

        <Section title="6. AI outputs and accuracy">
          <P>
            HQ.ai uses third-party AI providers (currently Anthropic and OpenAI) to
            produce some outputs. These outputs are generated from the inputs you
            and your candidates supply, and from documents and award data that
            HQ.ai has been configured to reference.
          </P>
          <P>
            We have invested significant work to ensure AI outputs are grounded in
            cited Australian sources, blinded against demographic signals where
            possible, and audited for adverse impact. <strong className="text-charcoal">Despite this, AI
            outputs can be wrong</strong> and must be reviewed by a human. We do not
            warrant that any AI output is accurate, complete, or fit for any
            specific decision you make using it.
          </P>
        </Section>

        <Section title="7. Intellectual property">
          <P>
            We own the Service, including the HQ.ai brand, software, and the
            structured rubrics and prompt design that produce our AI outputs. You
            own the candidate information you upload and the hiring decisions you
            make.
          </P>
          <P>
            You grant us a non-exclusive licence to process your inputs as needed
            to provide the Service. We do not use your candidate data to train
            general-purpose AI models, and our contracts with sub-processors
            (including Anthropic and OpenAI) include zero-retention commitments
            where commercially available.
          </P>
        </Section>

        <Section title="8. Confidentiality">
          <P>
            Each party will keep the other&apos;s confidential information confidential
            and only use it as needed to perform this agreement. Candidate
            information is treated as confidential at all times.
          </P>
        </Section>

        <Section title="9. Limitation of liability">
          <P>
            <strong className="text-charcoal">To the maximum extent permitted by law, our total liability to
            you arising from or in connection with the Service - whether in
            contract, tort (including negligence), or otherwise - is limited to the
            fees you paid us in the twelve (12) months preceding the event giving
            rise to the claim.</strong>
          </P>
          <P>
            We are not liable for indirect, consequential, special or punitive
            damages, including loss of profits, loss of revenue, loss of goodwill,
            or loss of data (other than as required under the Australian Consumer
            Law). Nothing in these terms excludes any right you have under the
            Australian Consumer Law that cannot be lawfully excluded.
          </P>
        </Section>

        <Section title="10. Indemnity">
          <P>
            You indemnify us against any third-party claim arising from (a)
            candidate information you upload that you did not have a lawful basis
            to upload, or (b) a hiring decision you made using the Service without
            human review.
          </P>
        </Section>

        <Section title="11. Termination">
          <P>
            Either party may terminate this agreement at any time by written notice
            (email is sufficient). On termination we will retain your data in line
            with our Privacy Policy retention schedule, then permanently delete it.
            Sections of these terms that by their nature should survive termination
            (intellectual property, confidentiality, limitation of liability,
            indemnity, governing law) will survive.
          </P>
        </Section>

        <Section title="12. Governing law">
          <P>
            These terms are governed by the laws of New South Wales, Australia.
            Each party submits to the exclusive jurisdiction of the courts of New
            South Wales for any matter arising in connection with these terms.
          </P>
        </Section>

        <Section title="13. Changes to these terms">
          <P>
            We may update these terms from time to time. The version and last-updated
            date at the top of this page will change when we do. Material changes
            will be notified by email at least 30 days before they take effect. If
            you do not accept a change, you may terminate your account before it
            takes effect.
          </P>
        </Section>

        <Section title="14. Contact">
          <P>
            Questions or notices in relation to these terms:{' '}
            <a className="underline font-bold text-charcoal" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </P>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="space-y-3 text-sm text-mid leading-relaxed">{children}</div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  )
}
