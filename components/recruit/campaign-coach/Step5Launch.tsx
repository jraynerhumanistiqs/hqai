'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWizard } from './wizard-state'

// CAMPAIGN_COACH_HANDOFF_KEY stores a small role-context payload in
// sessionStorage so the CV Scoring Agent can pre-fill a fresh rubric with
// the title, must-haves and nice-to-haves the recruiter just defined,
// when the user clicks "Create job in CV Scoring Agent (no ad)". This is
// the lightweight pre-Job-Board integration handoff path - the proper
// API-side wire-up arrives when the job-board feature lands.
const CAMPAIGN_COACH_HANDOFF_KEY = 'hqai:campaign-coach:handoff'

export default function Step5Launch() {
  const { state, callLaunch } = useWizard()
  const router = useRouter()
  const [questions, setQuestions] = useState<string[]>(defaultQuestions(state.role_profile))
  const [launching, setLaunching] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  function handoffToResumeAgent() {
    if (typeof window === 'undefined') return
    const profile = state.role_profile
    if (!profile) {
      setError('Finish the role profile first - I need the title and must-have skills before I can hand this off.')
      return
    }
    const payload = {
      title:       profile.title,
      location:    profile.location,
      salary:      profile.salary,
      must_have:   profile.must_have_skills ?? [],
      nice_to_have: profile.nice_to_have_skills ?? [],
      questions,
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

  if (result) return <LaunchSuccess result={result} />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-charcoal mb-2">
          Step 5 - Launch
        </h2>
        <p className="text-sm text-mid leading-relaxed max-w-xl">
          Final preview on the left. On the right, the screening questions and rubric I'll hand
          off to HQ Recruit. Edit anything before you launch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white shadow-card rounded-3xl p-5 sm:p-6">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">
            Ad preview
          </p>
          <h3 className="font-display text-lg font-bold text-charcoal mb-1">
            {profile?.title || '-'}
          </h3>
          <p className="text-xs text-mid mb-4">
            {profile?.location?.suburb}, {profile?.location?.state}
            {profile?.salary
              ? ` · $${profile.salary.min.toLocaleString()}-${profile.salary.max.toLocaleString()} ${profile.salary.currency}`
              : ''}
          </p>
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

        <div className="bg-white shadow-card rounded-3xl p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
              Screening questions
            </p>
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

          <div>
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
              Rubric (auto-derived from must-haves)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(profile?.must_have_skills || []).slice(0, 6).map((s, i) => (
                <span
                  key={i}
                  className="bg-light text-charcoal text-xs font-medium rounded-full px-3 py-1"
                >
                  {s}
                </span>
              ))}
              {(!profile?.must_have_skills || profile.must_have_skills.length === 0) && (
                <span className="text-xs text-muted">No must-haves defined</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger text-sm rounded-2xl px-4 py-3">{error}</div>
      )}

      {/* Phase 4 - Distribution. Two-track exit: launch publicly across
          job boards, or skip the public ad entirely and continue the
          workflow inside the CV Scoring Agent (useful for internal hires,
          warm referrals, or existing candidate pipelines where the ad
          isn't needed). Job-board integration is on the roadmap; for
          now the secondary path hands the role context through to the
          CV Scoring Agent via sessionStorage so the recruiter can keep
          working without rebuilding the rubric. */}
      <div className="bg-light rounded-2xl px-5 py-4">
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
          Phase 4 - Distribution
        </p>
        <p className="text-xs text-mid leading-relaxed mb-3 max-w-2xl">
          Launch publicly across job boards, or skip the ad and feed the role straight to the CV Scoring Agent. Job-board integration is a future addition; for now you can keep the workflow moving by scoring candidates you already have.
        </p>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            type="button"
            onClick={handoffToResumeAgent}
            className="bg-white border border-border text-charcoal text-sm font-bold px-5 py-2.5 rounded-full hover:bg-bg transition-colors"
          >
            Create Job in CV Scoring Agent (with no ad)
          </button>
          <button
            onClick={onLaunch}
            disabled={launching}
            className="bg-black text-white text-sm font-bold px-7 py-3.5 rounded-full hover:bg-[#1a1a1a] disabled:bg-muted transition-colors"
          >
            {launching ? 'Launching…' : 'Launch campaign →'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
    <div className="bg-white shadow-card rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-charcoal text-white flex items-center justify-center font-bold">
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
              className="bg-black text-white text-xs font-bold px-3 py-2 rounded-full hover:bg-[#1a1a1a] transition-colors"
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
              className="bg-white border border-border text-charcoal text-xs font-bold px-4 py-2 rounded-full hover:bg-light transition-colors"
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
              className="bg-black text-white text-sm font-bold px-5 py-2.5 rounded-full text-center hover:bg-charcoal transition-colors"
            >
              Move to CV Screening →
            </Link>
            <Link
              href={sessionId ? `/dashboard/recruit/shortlist` : '/dashboard/recruit/shortlist'}
              className="bg-white border border-border text-charcoal text-sm font-bold px-5 py-2.5 rounded-full text-center hover:bg-light transition-colors"
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
      className="bg-charcoal text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-black transition-colors"
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
