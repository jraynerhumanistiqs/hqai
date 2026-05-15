import Link from 'next/link'

// Privacy Policy - APP-aligned scaffolding for HQ.ai (Humanistiqs).
// This document is a defensible starting position written against the
// Australian Privacy Principles (APP 1-13). It should be reviewed by a
// privacy lawyer before commercial launch - the boilerplate is here so the
// product can ship today with a published, linkable policy rather than the
// previous dead "#" link.
//
// Last reviewed: see metadata.lastUpdated below. Update this date and the
// version string whenever the substance changes.

export const metadata = {
  title: 'Privacy Policy - HQ.ai by Humanistiqs',
  description: 'How HQ.ai (operated by Rayner Consulting Group Pty Ltd t/a Humanistiqs) collects, uses, stores and protects personal information.',
}

const LAST_UPDATED = '15 May 2026'
const POLICY_VERSION = '1.0'
const CONTACT_EMAIL = 'privacy@humanistiqs.com.au'
const ENTITY = 'Rayner Consulting Group Pty Ltd trading as Humanistiqs (ABN to be supplied)'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <Link href="/" className="text-xs font-bold text-mid hover:text-black uppercase tracking-wider">
          &larr; Back to HQ.ai
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-charcoal mt-6 mb-2">
          Privacy Policy
        </h1>
        <p className="text-xs text-muted mb-10">
          Version {POLICY_VERSION} - last updated {LAST_UPDATED}
        </p>

        <Section title="1. Who we are (APP 1)">
          <P>
            HQ.ai is operated by {ENTITY} (&quot;Humanistiqs&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
            We are an Australian-domiciled business and HQ.ai is an AI-assisted HR
            and recruitment platform for Australian small and medium businesses.
          </P>
          <P>
            This policy explains what personal information we collect, why we collect
            it, who we share it with, how long we keep it, and how you can access,
            correct or delete it. It is aligned to the Australian Privacy Principles
            (APP 1-13) under the Privacy Act 1988 (Cth).
          </P>
        </Section>

        <Section title="2. The information we collect (APP 3, APP 5)">
          <P>
            Depending on which side of HQ.ai you use, we collect:
          </P>
          <Ul items={[
            'Account information for business users - name, email, role, business name, ABN, address, phone, billing details.',
            'Candidate information you upload to the platform - resumes, work history, contact details, references, and any other data contained in candidate documents you provide.',
            'Candidate-submitted information at the video pre-screen stage - name, email, video recordings of answers to your interview questions, the transcripts we generate from those videos, and an AI scoring summary against the rubric you configure.',
            'Usage information - login times, browser, IP address, the pages you visit, and the actions you take inside the product.',
            'Communications - any messages, support tickets, or chat content you exchange with us or with our AI advisor.',
          ]} />
          <P>
            We do not collect sensitive information (as defined by the Privacy Act)
            unless it is volunteered in a candidate-supplied document or video answer.
            HQ.ai is configured to mask names, photos, addresses, dates of birth and
            graduation years before any AI scoring runs.
          </P>
        </Section>

        <Section title="3. Why we collect it (APP 3, APP 6)">
          <Ul items={[
            'To provide the HQ.ai service to our business clients - hosting role campaigns, scoring CVs, hosting video pre-screens, and producing scoring reports.',
            'To verify identity, manage accounts, process billing, and provide customer support.',
            'To improve the platform - including bias auditing of our AI models (we use aggregate metrics and never use a single individual\'s data to train any AI model).',
            'To meet legal obligations, including responses to lawful requests from regulators or law enforcement.',
          ]} />
          <P>
            We will not use personal information for a purpose materially different
            to the one we collected it for without your express consent or a basis
            under APP 6.
          </P>
        </Section>

        <Section title="4. Lawful basis and consent">
          <P>
            For candidate-submitted information (CVs and video pre-screens), our
            lawful basis is the candidate&apos;s explicit consent given before recording.
            That consent is documented and time-stamped at the start of the video
            pre-screen flow. The consent text covers video recording, automated
            transcription, AI scoring, secure storage by our sub-processors, and
            retention for up to 80 days following role closure.
          </P>
          <P>
            Candidates can withdraw consent and request erasure of their data at
            any time - see Section 8 below.
          </P>
        </Section>

        <Section title="5. Who we share it with (APP 6, APP 8)">
          <P>
            We use a small number of carefully chosen service providers to operate
            the platform. Each is bound by a contract that includes confidentiality
            and data-protection obligations. Some are domiciled outside Australia,
            primarily in the United States. The sub-processors we currently use are:
          </P>
          <table className="w-full text-sm my-4 border border-border rounded-2xl overflow-hidden">
            <thead className="bg-light text-charcoal">
              <tr>
                <th className="text-left px-4 py-2 font-bold">Sub-processor</th>
                <th className="text-left px-4 py-2 font-bold">Purpose</th>
                <th className="text-left px-4 py-2 font-bold">Jurisdiction</th>
              </tr>
            </thead>
            <tbody className="text-mid">
              <Row name="Supabase Inc." purpose="Database, authentication, file storage" loc="USA (data hosted in AWS Sydney where available)" />
              <Row name="Vercel Inc." purpose="Application hosting and content delivery" loc="USA (Edge servers globally, including Sydney)" />
              <Row name="Anthropic PBC" purpose="AI chat and scoring (Claude). Zero-retention API tier - prompts and outputs are not used to train Anthropic models." loc="USA" />
              <Row name="OpenAI LLC" purpose="Text embeddings for our knowledge base search" loc="USA" />
              <Row name="Cloudflare Inc. (Stream)" purpose="Video recording and playback storage" loc="USA (Edge servers globally)" />
              <Row name="Deepgram Inc." purpose="Speech-to-text transcription of video answers" loc="USA" />
              <Row name="Resend Inc." purpose="Transactional email delivery" loc="USA" />
              <Row name="Stripe Inc." purpose="Billing and payment processing" loc="USA, Ireland" />
            </tbody>
          </table>
          <P>
            By using HQ.ai you consent to cross-border disclosure of your personal
            information to these sub-processors for the purposes described above.
            Where the recipient is overseas, we take reasonable steps to ensure they
            handle the information consistently with the APPs.
          </P>
          <P>
            We do not sell personal information. We do not share personal information
            with advertisers. We do not allow any third-party AI provider to use your
            content to train their general-purpose models.
          </P>
        </Section>

        <Section title="6. How we keep it secure (APP 11)">
          <Ul items={[
            'All traffic between your browser and HQ.ai is encrypted in transit (TLS 1.2 or higher).',
            'All data is encrypted at rest by our hosting providers (AES-256).',
            'Access to production systems is restricted to a small number of authorised personnel, requires two-factor authentication, and is logged.',
            'We log who accessed which candidate record and when - audit trails are retained for at least 12 months.',
            'We undertake regular security reviews and intend to commission an independent penetration test prior to broad commercial launch.',
            'In the unlikely event of an eligible data breach we will notify affected individuals and the OAIC in line with the Notifiable Data Breaches scheme.',
          ]} />
        </Section>

        <Section title="7. How long we keep it (APP 11)">
          <Ul items={[
            'Candidate video responses, transcripts, and AI scoring outputs - up to 80 days after role closure, unless the candidate has been progressed to hire (in which case standard employee record-keeping applies once they join your business as an employee).',
            'CV scoring records - up to 80 days after role closure.',
            'Business user account data - retained for the life of the account and for 7 years after closure for tax, financial and legal record-keeping.',
            'Audit logs - 12 months.',
            'Backups - up to 30 days, then permanently destroyed.',
          ]} />
        </Section>

        <Section title="8. Access, correction and deletion (APP 12, APP 13)">
          <P>
            You can ask us at any time to:
          </P>
          <Ul items={[
            'Confirm whether we hold personal information about you.',
            'Provide you with a copy of the personal information we hold.',
            'Correct any personal information that is inaccurate, incomplete or out of date.',
            'Delete your personal information (other than information we are required by law to keep).',
          ]} />
          <P>
            Send your request to <a className="underline font-bold text-charcoal" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
            from the email address linked to the record, or use our online form at{' '}
            <Link href="/privacy/request" className="underline font-bold text-charcoal">/privacy/request</Link>.
            We will respond within 30 days. Candidates can also withdraw consent for
            their pre-screen recording at any time using the same channel.
          </P>
        </Section>

        <Section title="9. Complaints">
          <P>
            If you have a privacy concern about HQ.ai, please write to us first at
            {' '}<a className="underline font-bold text-charcoal" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
            so we have a chance to resolve it. If you are not satisfied with our
            response, you can lodge a complaint with the Office of the Australian
            Information Commissioner (OAIC) at <a className="underline font-bold text-charcoal" href="https://www.oaic.gov.au/" target="_blank" rel="noreferrer">oaic.gov.au</a>.
          </P>
        </Section>

        <Section title="10. Changes to this policy">
          <P>
            We may update this policy from time to time. The version and last-updated
            date at the top of this page will change when we do. Material changes
            will be notified by email to active business users.
          </P>
        </Section>

        <div className="border-t border-border pt-6 mt-10 text-xs text-muted">
          Questions or feedback: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
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

function Row({ name, purpose, loc }: { name: string; purpose: string; loc: string }) {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2 font-bold text-charcoal align-top">{name}</td>
      <td className="px-4 py-2 align-top">{purpose}</td>
      <td className="px-4 py-2 align-top">{loc}</td>
    </tr>
  )
}
