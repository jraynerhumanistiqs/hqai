// CV / job -> role auto-matcher (deterministic, pure).
//
// Implements docs/specs/cv-scoring-and-role-matching-spec.md section 4.
// Source data is data/rubrics/au-role-taxonomy.json (canonical roles + matcher
// signals). This module is pure string/array logic - no timestamps, no
// randomness - so the same inputs always produce the same output and it can be
// snapshot-tested. Intended for server use (API routes); it reads the taxonomy
// JSON, which should not be bundled into client code.
//
// The matcher NEVER fabricates a role: below the confidence floor it returns
// role_key = null and the caller falls back to the recruiter-selected role or
// bespoke rubric generation.
import rawTaxonomy from '../../data/rubrics/au-role-taxonomy.json'

export interface MatchInput {
  /** If the recruiter already chose a role, it is the source of truth. */
  recruiterSelectedRoleKey?: string | null
  /** The job the recruiter is hiring for (strongest signal after selection). */
  jobTitle?: string | null
  jobAd?: string | null
  /** The CV's 1-3 most recent job titles (weaker; disambiguates only). */
  cvTitles?: string[] | null
  /** Optional dashboard industry to pre-filter candidates and cut cross-sector false positives. */
  industry?: string | null
}

export interface MatchCandidate {
  role_key: string
  rubric_id: string | null
  canonical_role: string
  industry: string
  score: number
}

export interface MatchResult {
  role_key: string | null
  rubric_id: string | null
  canonical_role: string | null
  industry: string | null
  confidence: number // 0-1
  source: 'recruiter' | 'auto' | 'ambiguous' | 'none'
  candidates: MatchCandidate[] // top few, best-first (for ambiguous review)
}

// --- Taxonomy shapes (the JSON is the authority) ---
interface TaxRole {
  role_key: string
  canonical_role: string
  rubric_id: string | null
  seniority?: string
  primary_award_code?: string
  aliases?: string[]
  positive_signals?: string[]
  negative_signals?: string[]
}
interface TaxIndustry { industry: string; roles?: TaxRole[] }
interface Taxonomy { industries: TaxIndustry[] }

const taxonomy = rawTaxonomy as unknown as Taxonomy

interface FlatRole extends TaxRole { industry: string }

// Flattened role list, built once at module load.
const ALL_ROLES: FlatRole[] = taxonomy.industries.flatMap(ind =>
  (ind.roles ?? []).map(r => ({ ...r, industry: ind.industry })),
)

// Tuning constants (see spec 4.2).
const MATCH_FLOOR = 3   // below this best score -> no match
const MARGIN = 2        // best-second gap under this -> ambiguous
const POSITIVE_WEIGHT = 3
const ALIAS_WEIGHT = 1
const NEGATIVE_WEIGHT = 4

const SENIORITY_SENIOR = new Set(['manager', 'lead'])
const SENIORITY_JUNIOR = new Set(['entry', 'skilled'])
const SENIOR_CUES = ['senior', 'lead', 'head ', 'principal', 'manager', 'director', 'chief']
const JUNIOR_CUES = ['assistant', 'junior', 'trainee', 'graduate', 'entry level', 'entry-level', 'apprentice']

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Whole-token/phrase match: a signal matches when it appears in the query with
// word boundaries, so "ea" does not match "team" and "chef" does not match
// "kitchenhand". Signals that already contain spaces match as phrases.
function phraseHit(query: string, signal: string): boolean {
  const s = signal.trim().toLowerCase()
  if (!s) return false
  const re = new RegExp(`\\b${escapeRegExp(s)}\\b`, 'i')
  return re.test(query)
}

function countHits(query: string, signals: string[] | undefined): number {
  if (!signals || !signals.length) return 0
  let n = 0
  for (const sig of signals) if (phraseHit(query, sig)) n++
  return n
}

function seniorityNudge(query: string, seniority?: string): number {
  if (!seniority) return 0
  const hasSenior = SENIOR_CUES.some(c => query.includes(c))
  const hasJunior = JUNIOR_CUES.some(c => query.includes(c))
  if (hasSenior && SENIORITY_SENIOR.has(seniority)) return 1
  if (hasJunior && SENIORITY_JUNIOR.has(seniority)) return 1
  if (hasSenior && SENIORITY_JUNIOR.has(seniority)) return -1
  if (hasJunior && SENIORITY_SENIOR.has(seniority)) return -1
  return 0
}

function scoreRole(query: string, role: FlatRole): number {
  const pos = countHits(query, role.positive_signals)
  const alias = countHits(query, (role.aliases ?? []).map(a => a.toLowerCase()))
  const neg = countHits(query, role.negative_signals)
  // Canonical role title is also a strong positive signal.
  const canon = phraseHit(query, role.canonical_role) ? 1 : 0
  let score = POSITIVE_WEIGHT * (pos + canon) + ALIAS_WEIGHT * alias - NEGATIVE_WEIGHT * neg
  score += seniorityNudge(query, role.seniority)
  return score
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Match a job / CV to the most likely taxonomy role. Deterministic and pure.
 * Recruiter selection always wins; below the confidence floor returns
 * source: 'none' so the caller can fall back safely.
 */
export function matchRole(input: MatchInput): MatchResult {
  const none: MatchResult = {
    role_key: null, rubric_id: null, canonical_role: null, industry: null,
    confidence: 0, source: 'none', candidates: [],
  }

  // 1. Recruiter selection is the source of truth.
  if (input.recruiterSelectedRoleKey) {
    const sel = ALL_ROLES.find(r => r.role_key === input.recruiterSelectedRoleKey)
    if (sel) {
      return {
        role_key: sel.role_key, rubric_id: sel.rubric_id, canonical_role: sel.canonical_role,
        industry: sel.industry, confidence: 1, source: 'recruiter', candidates: [],
      }
    }
  }

  // 2. Build the query: job title + ad + the top few CV titles only (a whole
  //    career of unrelated titles would dilute the signal).
  const cvTitles = (input.cvTitles ?? []).slice(0, 3)
  const query = [input.jobTitle ?? '', input.jobAd ?? '', ...cvTitles]
    .join(' ')
    .toLowerCase()
  if (!query.trim()) return none

  // 3. Score every role (optionally pre-filtered to the tenant's industry).
  const pool = input.industry
    ? ALL_ROLES.filter(r => r.industry === input.industry)
    : ALL_ROLES
  const scope = pool.length ? pool : ALL_ROLES

  const ranked = scope
    .map(r => ({ role: r, score: scoreRole(query, r) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.role.role_key.localeCompare(b.role.role_key))

  if (!ranked.length) return none

  const best = ranked[0]
  const second = ranked[1]
  const secondScore = second ? second.score : 0
  const confidence = clamp01(best.score / (best.score + secondScore + 3))

  const candidates: MatchCandidate[] = ranked.slice(0, 3).map(x => ({
    role_key: x.role.role_key,
    rubric_id: x.role.rubric_id,
    canonical_role: x.role.canonical_role,
    industry: x.role.industry,
    score: x.score,
  }))

  // 4. Decide.
  if (best.score < MATCH_FLOOR) return { ...none, candidates }

  const ambiguous = second && (best.score - secondScore) < MARGIN
  return {
    role_key: best.role.role_key,
    rubric_id: best.role.rubric_id,
    canonical_role: best.role.canonical_role,
    industry: best.role.industry,
    confidence,
    source: ambiguous ? 'ambiguous' : 'auto',
    candidates,
  }
}

// Convenience: resolve a taxonomy role by key (e.g. for a recruiter-selected
// role) without running the scorer.
export function roleByKey(roleKey: string | null | undefined): FlatRole | null {
  if (!roleKey) return null
  return ALL_ROLES.find(r => r.role_key === roleKey) ?? null
}

// The full flat role list (canonical role, aliases, rubric id, industry) - for
// building a role picker in the UI or a rubric-suggestion dropdown.
export function allTaxonomyRoles(): FlatRole[] {
  return ALL_ROLES
}
