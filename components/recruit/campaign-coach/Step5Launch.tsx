'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from './wizard-state'
import type { RoleProfile, JobAdDraft } from '@/lib/campaign-types'

// CAMPAIGN_COACH_HANDOFF_KEY stores a small role-context payload in
// sessionStorage so the CV Scoring Agent can pre-fill a fresh rubric with
// the title, must-haves and nice-to-haves the recruiter just defined,
// when the user clicks "Finalise Campaign". This is the lightweight
// pre-Job-Board integration handoff path - the proper API-side wire-up
// arrives when the job-board feature lands.
const CAMPAIGN_COACH_HANDOFF_KEY = 'hqai:campaign-coach:handoff'

export default function Step5Launch() {
  const { state, callLaunch } = useWizard()
  const router = useRouter()
  const [questions, setQuestions] = useState<string[]>(defaultQuestions(state.role_profile))
  // Interview types chosen by the recruiter (mirrors the Shortlist
  // Agent's CreateRoleModal multi-select). Carried through to the
  // CV Scoring Agent handoff so the downstream batch-handoff can
  // stamp the prescreen_session correctly. Defaults to video.
  const [interviewTypes, setInterviewTypes] = useState<Array<'video' | 'phone'>>(['video'])
  const [launching, setLaunching] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedAd, setCopiedAd] = useState(false)

  function handoffToResumeAgent() {
    if (typeof window === 'undefined') return
    const profile = state.role_profile
    if (!profile) {
      setError('Finish the role profile first - I need the title and must-have skills before I can hand this off.')
      return
    }
    // Persist this campaign so it appears under "Reuse a recent campaign"
    // on Step 1 next time. The real flow hands off to the CV Scoring Agent
    // (which creates the prescreen session later), so /api/campaign/launch -
    // the only other writer of the campaigns table - is never reached.
    // Fire-and-forget: a failure here must not block the handoff.
    if (state.job_ad_draft) {
      void fetch('/api/campaign/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_profile: profile,
          job_ad_draft: state.job_ad_draft,
          distribution_plan: state.distribution_plan,
          coach_score: state.coach_score ?? null,
        }),
      }).catch(() => {/* non-fatal - recent campaigns just won't show this one */})
    }
    // Full job ad content carried through so the rubric-suggestion
    // endpoint has the same context the recruiter just iterated on
    // (overview / about_us / responsibilities / requirements /
    // benefits / apply_cta) instead of guessing from title + must-haves
    // alone. Fixes feedback #14 "role flowed through to CV Scoring
    // Agent but created the incorrect role name + thin content".
    const draftBlocks = state.job_ad_draft?.blocks
    const payload = {
      title:       profile.title,
      location:    profile.location,
      salary:      profile.salary,
      must_have:   profile.must_have_skills ?? [],
      nice_to_have: profile.nice_to_have_skills ?? [],
      questions,
      interview_types: interviewTypes,
      // Full ad blocks - the rubric will synthesise from this content
      // so the criteria reflect the actual brief, not just must-haves.
      ad: draftBlocks ? {
        overview:         draftBlocks.overview ?? '',
        about_us:         draftBlocks.about_us ?? '',
        responsibilities: draftBlocks.responsibilities ?? [],
        requirements_must: draftBlocks.requirements?.must ?? [],
        requirements_nice: draftBlocks.requirements?.nice ?? [],
        benefits:         draftBlocks.benefits ?? [],
        apply_cta:        draftBlocks.apply_cta ?? '',
      } : null,
      createdAt:   new Date().toISOString(),
    }
    try {
      window.sessionStorage.setItem(CAMPAIGN_COACH_HANDOFF_KEY, JSON.stringify(payload))
    } catch {/* private mode - ignore, the user can still create the role manually */}
    router.push('/dashboard/recruit/cv-screening?source=campaign-coach')
  }

  const profile = state.role_profile
  const draft = state.job_ad_draft

  const onLaunch = async () => {
    setLaunching(true)
    setError(null)
    try {
      const res = await callLaunch()
      if (!res || res.ok === false) {
        setError(res?.error || 'Launch failed.')
      } else {
        setResult(res)
      }
    } finally {
      setLaunching(false)
    }
  }

  const copyAdText = async () => {
    try {
      await navigator.clipboard.writeText(adToPlainText(profile, draft))
      setCopiedAd(true)
      setTimeout(() => setCopiedAd(false), 1500)
    } catch {/* clipboard blocked - the text is still fully visible to select */}
  }

  if (result) return <LaunchSuccess result={result} />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-2">
          Finish - your ad and screening, ready to use
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Here's everything your coach put together. Have a read through, tweak anything you like,
          then send it out to candidates.
        </p>
      </div>

      {/* 1. Ad preview */}
      <div className="bg-bg-elevated shadow-card rounded-3xl p-5 sm:p-6">
        <SectionHeading n={1} title="Your job ad">
          This is the finished ad. Copy the text and paste it into your job board of choice -
          SEEK, LinkedIn, Indeed, or anywhere else you post roles.
        </SectionHeading>

        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-charcoal">
              {profile?.title || '-'}
            </h3>
            <p className="text-xs text-mid">
              {profile?.location?.suburb}, {profile?.location?.state}
              {profile?.salary
                ? ` · $${profile.salary.min.toLocaleString()}-${profile.salary.max.toLocaleString()} ${profile.salary.currency} / ${profile.salary.period ?? 'year'}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={copyAdText}
            className="flex-shrink-0 bg-bg border border-border text-charcoal text-xs font-bold px-4 py-2 rounded-full hover:bg-light transition-colors"
          >
            {copiedAd ? 'Copied!' : 'Copy ad text'}
          </button>
        </div>

        <div className="prose prose-sm max-w-none text-charcoal text-sm leading-relaxed space-y-3">
          {draft?.blocks.overview && <p>{draft.blocks.overview}</p>}
          {draft?.blocks.about_us && (
            <>
              <h4 className="font-bold">About us</h4>
              <p>{draft.blocks.about_us}</p>
            </>
          )}
          {draft?.blocks.responsibilities && draft.blocks.responsibilities.length > 0 && (
            <>
              <h4 className="font-bold">Responsibilities</h4>
              <ul className="list-disc pl-5">
                {draft.blocks.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
          {draft?.blocks.requirements?.must && draft.blocks.requirements.must.length > 0 && (
            <>
              <h4 className="font-bold">Must have</h4>
              <ul className="list-disc pl-5">
                {draft.blocks.requirements.must.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
          {draft?.blocks.requirements?.nice && draft.blocks.requirements.nice.length > 0 && (
            <>
              <h4 className="font-bold">Nice to have</h4>
              <ul className="list-disc pl-5">
                {draft.blocks.requirements.nice.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
          {draft?.blocks.benefits && draft.blocks.benefits.length > 0 && (
            <>
              <h4 className="font-bold">Benefits</h4>
              <ul className="list-disc pl-5">
                {draft.blocks.benefits.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </>
          )}
          {draft?.blocks.apply_cta && (
            <p className="font-bold mt-2">{draft.blocks.apply_cta}</p>
          )}
        </div>
      </div>

      {/* 2. Screening questions */}
      <div className="bg-bg-elevated shadow-card rounded-3xl p-5 sm:p-6">
        <SectionHeading n={2} title="Screening questions">
          Every candidate sees these questions when they apply, and answers them using the interview
          type you pick below. Edit any question, remove one, or add your own.
        </SectionHeading>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted w-5">{i + 1}.</span>
              <input
                value={q}
                onChange={e => {
                  const next = [...questions]
                  next[i] = e.target.value
                  setQuestions(next)
                }}
                className="flex-1 bg-bg border border-border rounded-2xl px-3 py-2 text-sm text-charcoal outline-none focus:border-charcoal"
              />
              <button
                onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}
                className="w-7 h-7 rounded-full hover:bg-light flex items-center justify-center text-mid"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => setQuestions([...questions, ''])}
            className="text-xs font-bold text-mid hover:text-charcoal"
          >
            + Add question
          </button>
        </div>
      </div>

      {/* 3. Interview type */}
      <div className="bg-bg-elevated shadow-card rounded-3xl p-5 sm:p-6">
        <SectionHeading n={3} title="How candidates will answer">
          Choose how you'd like candidates to answer the questions above. You can pick one or both -
          not sure? Most teams start with video, since it's the fastest way to compare a lot of
          candidates before anyone picks up the phone.
        </SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                id: 'video',
                title: 'Video pre-screen',
                tagline: 'Fast to review, no scheduling',
                desc: "The candidate records short video answers themselves, straight in their browser, whenever suits them. You watch and compare the clips later, in your own time.",
              },
              {
                id: 'phone',
                title: 'Phone screen',
                tagline: 'A real conversation, done for you',
                desc: 'You call the candidate yourself. HQ Recruit records the call, then transcribes and scores the answers against the same questions automatically.',
              },
            ] as const
          ).map(opt => {
            const checked = interviewTypes.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setInterviewTypes(prev => {
                    if (prev.includes(opt.id)) {
                      if (prev.length === 1) return prev
                      return prev.filter(t => t !== opt.id)
                    }
                    return [...prev, opt.id]
                  })
                }}
                className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${checked ? 'border-border-strong bg-ink/5' : 'border-border hover:border-mid'}`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 ${checked ? 'border-ink bg-ink' : 'border-border'}`}>
                  {checked && (
                    <svg className="w-3 h-3 text-ink-on-accent" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-charcoal">{opt.title}</p>
                  <p className="text-[11px] font-bold text-mid uppercase tracking-wide mt-0.5">{opt.tagline}</p>
                  <p className="text-xs text-mid mt-1.5 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. What happens next */}
      <div className="bg-bg-elevated shadow-card rounded-3xl p-5 sm:p-6">
        <SectionHeading n={4} title="What happens next">
          Direct posting to job boards is coming soon - here's how to get this role live today.
        </SectionHeading>

        <ol className="space-y-3 mb-5">
          <li className="flex gap-3">
            <NextStepNumber>1</NextStepNumber>
            <p className="text-sm text-mid leading-relaxed pt-0.5">
              Copy the ad text above and paste it into your job board of choice - SEEK, LinkedIn,
              Indeed, or wherever you post roles.
              <InfoDot label="Direct job board posting - in development">
                We&apos;re building direct posting to SEEK, LinkedIn and Indeed so you won&apos;t need
                to copy and paste. It&apos;s in development - for now, pasting the ad in is the
                quickest way to get the role live.
              </InfoDot>
            </p>
          </li>
          <li className="flex gap-3">
            <NextStepNumber>2</NextStepNumber>
            <p className="text-sm text-mid leading-relaxed pt-0.5">
              Candidates apply through the job board as usual and send you their CV.
            </p>
          </li>
          <li className="flex gap-3">
            <NextStepNumber>3</NextStepNumber>
            <p className="text-sm text-mid leading-relaxed pt-0.5">
              As CVs come in, upload them to the <span className="font-bold text-charcoal">CV Scoring Agent</span>
              {' '}(the next stage of HQ Recruit) to score and shortlist them automatically against this role.
            </p>
          </li>
        </ol>

        <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-mid leading-relaxed max-w-md">
            Clicking below saves this campaign and takes you straight to the CV Scoring Agent, ready
            for when applications start arriving.
          </p>
          <button
            type="button"
            onClick={handoffToResumeAgent}
            className="flex-shrink-0 bg-accent text-ink-on-accent text-sm font-bold px-7 py-3.5 rounded-full hover:bg-accent-hover transition-colors"
          >
            Finalise campaign - move to CV Scoring Agent →
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">{error}</div>
      )}

    </div>
  )
}

function SectionHeading({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-ink text-ink-on-accent text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <h3 className="font-display text-base font-bold text-charcoal">{title}</h3>
        <p className="text-xs text-mid leading-relaxed mt-0.5 max-w-xl">{children}</p>
      </div>
    </div>
  )
}

function NextStepNumber({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-clay-soft text-clay-ink text-xs font-bold flex items-center justify-center">
      {children}
    </div>
  )
}

// Inline info dot with a small popover - opens on hover, focus or tap.
// Used to tuck the "direct posting is in development" note behind an icon
// at the end of step 1 so the step reads cleanly.
function InfoDot({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block align-middle ml-1.5">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-clay-soft text-clay-ink text-[10px] font-bold leading-none hover:bg-clay/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-clay"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-30 mt-2 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-left shadow-modal"
        >
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-clay-ink">{label}</span>
          <span className="block text-xs font-normal normal-case leading-relaxed text-mid">{children}</span>
        </span>
      )}
    </span>
  )
}

// Builds a plain-text version of the ad from the drafted blocks, suitable
// for pasting straight into a job board's plain-text ad field. Kept
// deliberately simple (no markdown/HTML) since most boards strip formatting
// anyway.
function adToPlainText(profile?: RoleProfile, draft?: JobAdDraft): string {
  if (!draft) return ''
  const lines: string[] = []

  if (profile?.title) lines.push(profile.title)
  const locationLine = [profile?.location?.suburb, profile?.location?.state].filter(Boolean).join(', ')
  if (locationLine) lines.push(locationLine)
  if (profile?.salary) {
    const { min, max, currency, period } = profile.salary
    lines.push(`$${min.toLocaleString()}-${max.toLocaleString()} ${currency} / ${period ?? 'year'}`)
  }
  lines.push('')

  if (draft.blocks.overview) {
    lines.push(draft.blocks.overview, '')
  }
  if (draft.blocks.about_us) {
    lines.push('About us', draft.blocks.about_us, '')
  }
  if (draft.blocks.responsibilities?.length) {
    lines.push('Responsibilities')
    draft.blocks.responsibilities.forEach(r => lines.push(`- ${r}`))
    lines.push('')
  }
  if (draft.blocks.requirements?.must?.length) {
    lines.push('Must have')
    draft.blocks.requirements.must.forEach(r => lines.push(`- ${r}`))
    lines.push('')
  }
  if (draft.blocks.requirements?.nice?.length) {
    lines.push('Nice to have')
    draft.blocks.requirements.nice.forEach(r => lines.push(`- ${r}`))
    lines.push('')
  }
  if (draft.blocks.benefits?.length) {
    lines.push('Benefits')
    draft.blocks.benefits.forEach(r => lines.push(`- ${r}`))
    lines.push('')
  }
  if (draft.blocks.apply_cta) lines.push(draft.blocks.apply_cta)

  return lines.join('\n').trim()
}

// Reference: callLaunch + LaunchSuccess kept in this file so the
// /api/campaign/launch path stays alive for the future job-board
// publishing feature. Neither is reachable from the current UI; the
// Step 5 user flow ends at handoffToResumeAgent.

function LaunchSuccess({ result }: { result: any }) {
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedAd, setCopiedAd] = useState(false)
  const candidateUrl: string = result.candidate_url || ''
  const adText: string = result.copy_paste_text || ''
  const sessionId: string | undefined = result.session?.id

  const copy = async (text: string, which: 'url' | 'ad') => {
    try {
      await navigator.clipboard.writeText(text)
      if (which === 'url') {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 1500)
      } else {
        setCopiedAd(true)
        setTimeout(() => setCopiedAd(false), 1500)
      }
    } catch {}
  }

  return (
    <div className="bg-bg-elevated shadow-card rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-ink text-ink-on-accent flex items-center justify-center font-bold">
          ✓
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-charcoal uppercase tracking-wider">
            Campaign launched
          </h2>
          <p className="text-xs text-mid">
            Your HQ Recruit session is ready and the ad is on its way.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
            Candidate invite link
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={candidateUrl}
              className="flex-1 bg-bg border border-border rounded-full px-3 py-2 text-sm text-charcoal outline-none"
            />
            <button
              onClick={() => copy(candidateUrl, 'url')}
              className="bg-accent text-ink-on-accent text-xs font-bold px-3 py-2 rounded-full hover:bg-accent-hover transition-colors"
            >
              {copiedUrl ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
            Open in board (deep links)
          </p>
          <div className="flex flex-wrap gap-2">
            {result.deep_links?.seek && (
              <DeepLinkButton href={result.deep_links.seek}>Open in SEEK</DeepLinkButton>
            )}
            {result.deep_links?.indeed && (
              <DeepLinkButton href={result.deep_links.indeed}>Open in Indeed</DeepLinkButton>
            )}
            {result.deep_links?.linkedin && (
              <DeepLinkButton href={result.deep_links.linkedin}>Open in LinkedIn</DeepLinkButton>
            )}
            <button
              onClick={() => copy(adText, 'ad')}
              className="bg-bg-elevated border border-border text-charcoal text-xs font-bold px-4 py-2 rounded-full hover:bg-light transition-colors"
            >
              {copiedAd ? 'Copied ad text' : 'Copy ad text'}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-3">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
            What's next
          </p>
          <p className="text-sm text-mid leading-relaxed">
            Once applications start arriving, head to CV Screening to score them against this role's rubric, then on to the Shortlist Agent for video pre-screens.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/dashboard/recruit/cv-screening"
              className="bg-accent text-ink-on-accent text-sm font-bold px-5 py-2.5 rounded-full text-center hover:bg-accent-hover transition-colors"
            >
              Move to CV Screening →
            </Link>
            <Link
              // Pass the just-created session id so RecruitDashboard
              // (which reads ?session=<id>) lands the recruiter directly on
              // the role they just built rubric/questions for, instead of
              // defaulting to the first role in their list. Fix for Item 9.
              href={sessionId ? `/dashboard/recruit/shortlist?session=${sessionId}` : '/dashboard/recruit/shortlist'}
              className="bg-bg-elevated border border-border text-charcoal text-sm font-bold px-5 py-2.5 rounded-full text-center hover:bg-light transition-colors"
            >
              Skip to Shortlist Agent →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeepLinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-ink text-ink-on-accent text-xs font-bold px-4 py-2 rounded-full hover:bg-accent-hover transition-colors"
    >
      {children}
    </a>
  )
}

function defaultQuestions(profile: any): string[] {
  if (!profile) return []
  const role = profile.title || 'this role'
  const skills: string[] = profile.must_have_skills || []
  const out = [
    `Walk us through a recent example of work most relevant to ${role}.`,
    `Why are you interested in this role specifically, and why now?`,
  ]
  if (skills[0]) out.push(`Tell us about your experience with ${skills[0]}.`)
  if (skills[1]) out.push(`How would you approach a problem that needed ${skills[1]}?`)
  out.push(`What does a great working environment look like for you?`)
  return out
}
