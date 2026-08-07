// AU industry rubric catalogue - adapter.
//
// Source of truth is the authored library data/rubrics/au-industry-role-rubrics.json
// (9 dashboard industries x common roles, grounded in the Fair Work Modern
// Award texts in data/awards/*.md). This module maps that library's model
// (max_points / hard_gatekeepers / execution_vs_oversight / advance_threshold)
// onto the live app's Rubric type so the rubrics seed the CV-screening
// product directly: cv-screening-rubrics.ts folds INDUSTRY_RUBRICS into
// ALL_RUBRICS, which every business sees as standard starter rubrics and
// which the scorer (lib/cv-screening/score.ts) reads.
//
// Mapping decisions:
// - merit_criteria -> weighted criteria (weight = max_points / 100).
// - mandatory hard_gatekeepers -> binary hard_gate criteria (with gate_tokens)
//   so they flow through the existing consideration pipeline (assessed,
//   surfaced post-score as Eligible / Unclear / Not eligible, and excluded
//   from the weighted merit score). "work_rights" maps to the existing
//   work_eligibility gate and keeps the generous work-rights read (no tokens).
// - execution_vs_oversight -> rubric.execution_guard (anti-spoofing narrative
//   injected into the scoring prompt).
// - advance_threshold (0-100) -> minimum_score_to_advance (0-5) via /20.
// - penalty_overrides / hard_caps -> preserved as metadata (the merit engine
//   has no penalty stage; "cannot practise" is already covered by the
//   gatekeeper-as-consideration).
import type { AwardRef, Gatekeeper, Rubric, RubricCriterion } from '../cv-screening-types'
import rawLibrary from '../../data/rubrics/au-industry-role-rubrics.json'

// --- Library shapes (loose - the JSON is the authority) ---
interface LibGatekeeper { id: string; label: string; mandatory?: boolean | string; note?: string }
interface LibCriterion { id: string; label: string; max_points: number; type?: string; evidence_required?: boolean; anchors?: Record<string, string>; fairness_flag?: string }
interface LibExecVsOversight { near_only?: string; executed_within?: string; supervised_within?: string; disqualifiers?: string[] }
interface LibPenalty { id: string; condition: string; points: number; rationale?: string; fairness_flag?: string }
interface LibHardCap { id: string; condition: string; effect: string; rationale?: string }
interface LibRole {
  rubric_id: string
  role: string
  aliases?: string[]
  award_ref?: { code?: string; name?: string; typical_classification?: string }
  hard_gatekeepers?: LibGatekeeper[]
  execution_vs_oversight?: LibExecVsOversight
  merit_criteria?: LibCriterion[]
  penalty_overrides?: LibPenalty[]
  hard_caps?: LibHardCap[]
  advance_threshold?: number
}
interface LibIndustry {
  industry: string
  modern_award?: { code?: string; name?: string }
  also_relevant_awards?: Array<{ code?: string; name?: string }>
  award_pain_points?: string[]
  tech_stack?: string[]
  roles?: LibRole[]
}
interface Library { meta?: unknown; scoring_model?: unknown; industries: LibIndustry[] }

const library = rawLibrary as unknown as Library

// Tokens the scorer looks for to confirm a mandatory registration / check is
// held. Keyed by the library's gatekeeper id. "work_rights" is intentionally
// absent: it maps to the work_eligibility gate which keeps the generous
// work-rights read (citizenship / PR / visa, location-blind).
const GATE_TOKENS: Record<string, string[]> = {
  rsa: ['RSA', 'responsible service of alcohol'],
  rsg: ['RSG', 'RCG', 'responsible service of gambling', 'responsible conduct of gambling'],
  police_check: ['national police check', 'police check', 'police certificate', 'criminal history check'],
  approved_manager: ['approved manager', 'nominated manager', 'RSA manager', 'licensee'],
  food_safety_supervisor: ['food safety supervisor', 'FSS certificate', 'FSS'],
  food_safety: ['food safety certificate', 'food handling certificate', 'safe food handling', 'HACCP'],
  cert_iii_commercial_cookery: ['certificate iii in commercial cookery', 'cert iii commercial cookery', 'commercial cookery', 'SIT30821', 'SIT30816'],
  ahpra_rn: ['AHPRA', 'NMBA', 'registered nurse', 'nursing and midwifery board', 'registration number'],
  ndis_screening: ['NDIS worker screening', 'ndis worker screening check', 'NDISWC', 'worker screening clearance'],
  wwcc: ['working with children check', 'WWCC', 'blue card', 'ochre card', 'WWC check'],
  immunisation: ['immunisation history', 'immunisation', 'vaccination', 'vaccinated'],
  cert_iii_individual_support: ['certificate iii in individual support', 'cert iii individual support', 'CHC33021', 'CHC33015', 'individual support (ageing)'],
  first_aid_cpr: ['first aid', 'CPR', 'HLTAID'],
  ahpra_pharmacist: ['AHPRA', 'pharmacy board', 'registered pharmacist', 'pharmacist registration'],
  immunisation_accreditation: ['immunisation accreditation', 'vaccination accreditation', 'vaccinator', 'immuniser'],
  first_aid: ['first aid', 'HLTAID'],
  cert_iii_community_pharmacy: ['certificate ii in community pharmacy', 'certificate iii in community pharmacy', 'community pharmacy', 'SIR20116', 'SIR30116'],
  electrical_licence: ['electrical licence', 'electrical work licence', 'A-grade electrician', 'licensed electrician', 'electrical contractor licence'],
  white_card: ['white card', 'construction induction', 'CPCCWHS1001', 'general construction induction'],
  drivers_licence: ["driver's licence", 'drivers licence', 'driver licence', 'current licence', 'C class'],
  hrwl: ['high risk work licence', 'HRWL', 'EWP licence', 'elevated work platform', 'WP licence'],
  trade_cert: ['certificate iii in carpentry', 'cert iii carpentry', 'trade certificate', 'trade qualified', 'CPC30220'],
  supervisor_licence: ['QBCC', 'site supervisor licence', 'builder licence', 'supervisor licence'],
  bas_agent: ['BAS agent', 'registered BAS agent', 'TPB', 'tax practitioners board', 'tax agent'],
  acecqa_qual: ['ACECQA', 'certificate iii in early childhood', 'diploma of early childhood', 'CHC30121', 'CHC50121', 'early childhood education and care'],
  first_aid_child: ['HLTAID012', 'first aid', 'anaphylaxis', 'asthma', 'CPR'],
  supervisor_certificate: ['nominated supervisor', 'supervisor certificate', 'certified supervisor'],
  cert_iii_iv: ['certificate iii in individual support', 'certificate iv in disability', 'CHC33021', 'CHC43121', 'community services'],
  relevant_qualification: ['certificate iv', 'diploma', 'degree', 'community services', 'social work', 'bachelor'],
  security_clearance: ['baseline clearance', 'NV1', 'NV2', 'security clearance', 'AGSVA'],
}

const STOPWORDS = new Set(['the', 'and', 'or', 'a', 'an', 'of', 'for', 'to', 'in', 'with', 'incl', 'e.g', 'current', 'valid', 'registration', 'certificate', 'check', 'licence', 'license'])

// Fallback tokens for any gatekeeper id not in GATE_TOKENS: distinctive words
// from its label, so an uncurated gate still has a deterministic read.
function fallbackTokens(label: string): string[] {
  const words = label.toLowerCase().replace(/[()/,.]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w))
  const tokens = Array.from(new Set(words)).slice(0, 5)
  return tokens.length ? tokens : [label.toLowerCase()]
}

function isMandatory(m: LibGatekeeper['mandatory']): boolean {
  return m === true || m === 'true'
}

function adaptRole(role: LibRole, industry: LibIndustry): Rubric {
  // 1. Merit criteria: max_points -> weight (sum to ~1.0).
  const meritCriteria: RubricCriterion[] = (role.merit_criteria ?? []).map(c => ({
    id: c.id,
    label: c.label,
    weight: Number(((c.max_points ?? 0) / 100).toFixed(3)),
    type: c.type === 'binary' ? 'binary' : 'ordinal_5',
    anchors: c.anchors ?? undefined,
    evidence_required: c.evidence_required ?? undefined,
    fairness_flag: c.fairness_flag ?? undefined,
  }))

  // 2. Mandatory gatekeepers -> binary hard_gate criteria (excluded from
  //    merit, surfaced as considerations). work_rights -> work_eligibility.
  const gateKeepers = role.hard_gatekeepers ?? []
  const gateCriteria: RubricCriterion[] = []
  const seenGateIds = new Set<string>()
  for (const g of gateKeepers) {
    if (!isMandatory(g.mandatory)) continue
    const isWorkRights = g.id === 'work_rights'
    const critId = isWorkRights ? 'work_eligibility' : g.id
    if (seenGateIds.has(critId)) continue
    seenGateIds.add(critId)
    gateCriteria.push({
      id: critId,
      label: isWorkRights ? 'AU work rights' : g.label,
      weight: 0,
      type: 'binary',
      hard_gate: true,
      ...(isWorkRights ? {} : { gate_tokens: GATE_TOKENS[g.id] ?? fallbackTokens(g.label) }),
    })
  }
  // Every role must carry a work-rights gate even if the library omitted it.
  if (!seenGateIds.has('work_eligibility')) {
    gateCriteria.unshift({ id: 'work_eligibility', label: 'AU work rights', weight: 0, type: 'binary', hard_gate: true })
  }

  const criteria = [...meritCriteria, ...gateCriteria]

  // 3. Governing awards: role award_ref first, then industry-level awards.
  const awards: AwardRef[] = []
  if (role.award_ref?.code) awards.push({ code: role.award_ref.code, name: role.award_ref.name ?? '', note: role.award_ref.typical_classification })
  else if (industry.modern_award?.code) awards.push({ code: industry.modern_award.code, name: industry.modern_award.name ?? '' })
  for (const a of (industry.also_relevant_awards ?? [])) if (a.code && !awards.find(x => x.code === a.code)) awards.push({ code: a.code, name: a.name ?? '' })
  if (awards.length && (industry.award_pain_points ?? []).length && !awards[0].note) {
    awards[0] = { ...awards[0], note: (industry.award_pain_points ?? []).join('; ') }
  }

  // 4. All gatekeepers (incl. conditional) preserved as metadata.
  const mandatoryGatekeepers: Gatekeeper[] = gateKeepers.map(g => ({
    id: g.id === 'work_rights' ? 'work_eligibility' : g.id,
    label: g.label,
    mandatory: (g.mandatory === true || g.mandatory === 'true') ? true : (g.mandatory === 'conditional' ? 'conditional' : undefined),
    note: g.note,
    tokens: g.id === 'work_rights' ? undefined : (GATE_TOKENS[g.id] ?? fallbackTokens(g.label)),
  }))

  const threshold = typeof role.advance_threshold === 'number' ? role.advance_threshold : 60

  return {
    rubric_id: role.rubric_id,
    role: role.role,
    country: 'AU',
    version: 1,
    criteria,
    minimum_score_to_advance: Number((threshold / 20).toFixed(2)),
    hard_gates: gateCriteria.map(c => c.id),
    industry: industry.industry,
    governing_awards: awards.length ? awards : undefined,
    mandatory_gatekeepers: mandatoryGatekeepers.length ? mandatoryGatekeepers : undefined,
    software_ecosystem: industry.tech_stack?.length ? industry.tech_stack : undefined,
    aliases: role.aliases?.length ? role.aliases : undefined,
    execution_guard: role.execution_vs_oversight ?? undefined,
    penalty_overrides: role.penalty_overrides?.length ? role.penalty_overrides : undefined,
    hard_caps: role.hard_caps?.length ? role.hard_caps : undefined,
  }
}

// All adapted rubrics (every role across every industry).
export const INDUSTRY_RUBRICS: Rubric[] = library.industries.flatMap(ind => (ind.roles ?? []).map(r => adaptRole(r, ind)))

// Dashboard industry label -> the rubric ids that anchor it. Labels match the
// INDUSTRIES arrays in app/onboarding + app/dashboard/settings.
export const INDUSTRY_TO_RUBRIC_IDS: Record<string, string[]> = library.industries.reduce((acc, ind) => {
  acc[ind.industry] = (ind.roles ?? []).map(r => r.rubric_id)
  return acc
}, {} as Record<string, string[]>)

export function rubricsForIndustry(industry: string | null | undefined): Rubric[] {
  if (!industry) return []
  const ids = new Set(INDUSTRY_TO_RUBRIC_IDS[industry] ?? [])
  return INDUSTRY_RUBRICS.filter(r => ids.has(r.rubric_id))
}

// First (primary) rubric for an industry - convenience for callers that want
// a single default per sector.
export function rubricForIndustry(industry: string | null | undefined): Rubric | null {
  return rubricsForIndustry(industry)[0] ?? null
}
