import type { Rubric } from './cv-screening-types'

const STANDARD_BLIND_FIELDS = ['name', 'photo', 'address', 'dob', 'gender_inferred', 'graduation_year', 'school_name']

export const RUBRIC_BACKEND_ENGINEER: Rubric = {
  rubric_id: 'rub_eng_senior_be_au_v1',
  role: 'Senior Backend Engineer',
  country: 'AU',
  version: 1,
  criteria: [
    {
      id: 'depth_backend',
      label: 'Backend depth',
      weight: 0.25,
      type: 'ordinal_5',
      anchors: {
        '1': 'No production backend experience',
        '2': '1-2 yrs, single language, CRUD only',
        '3': '3-5 yrs, owns services, basic distributed concepts',
        '4': '5-8 yrs, designs systems, mentors, performance tuning',
        '5': '8+ yrs, sets architecture, multi-region, deep concurrency',
      },
      evidence_required: true,
    },
    {
      id: 'scale_signals',
      label: 'Scale and reliability signals',
      weight: 0.15,
      type: 'ordinal_5',
      anchors: {
        '1': 'No traffic or scale signal',
        '3': 'Mentions 100k+ users or 1k+ RPS',
        '5': 'Owned 1M+ DAU or 50k+ RPS systems with SLO ownership',
      },
    },
    {
      id: 'tenure_stability',
      label: 'Tenure pattern',
      weight: 0.05,
      type: 'ordinal_5',
      fairness_flag: 'tenure_can_correlate_with_caregiving_gaps',
    },
    {
      id: 'communication',
      label: 'Written communication (CV clarity)',
      weight: 0.10,
      type: 'ordinal_5',
    },
    {
      id: 'leadership',
      label: 'Tech leadership signals',
      weight: 0.20,
      type: 'ordinal_5',
    },
    {
      id: 'domain_fit',
      label: 'Domain fit',
      weight: 0.15,
      type: 'ordinal_5',
    },
    {
      id: 'location_eligibility',
      label: 'AU work rights / location',
      weight: 0.10,
      type: 'binary',
      hard_gate: true,
    },
  ],
  minimum_score_to_advance: 3.4,
  hard_gates: ['location_eligibility'],
  blind_fields: STANDARD_BLIND_FIELDS,
}

export const RUBRIC_SALES_AE: Rubric = {
  rubric_id: 'rub_sales_ae_au_v1',
  role: 'Sales Account Executive',
  country: 'AU',
  version: 1,
  criteria: [
    {
      id: 'quota_attainment',
      label: 'Quota attainment history',
      weight: 0.30,
      type: 'ordinal_5',
      anchors: {
        '1': 'No quantified attainment',
        '3': 'Met quota in most recent role',
        '5': 'Top decile, 110%+ attainment two years running',
      },
      evidence_required: true,
    },
    {
      id: 'deal_size',
      label: 'Average deal size and complexity',
      weight: 0.20,
      type: 'ordinal_5',
    },
    {
      id: 'segment_fit',
      label: 'Segment fit (SMB vs mid-market vs enterprise)',
      weight: 0.15,
      type: 'ordinal_5',
    },
    {
      id: 'tenure_stability',
      label: 'Tenure pattern',
      weight: 0.05,
      type: 'ordinal_5',
      fairness_flag: 'tenure_can_correlate_with_caregiving_gaps',
    },
    {
      id: 'communication',
      label: 'Written communication (CV clarity)',
      weight: 0.10,
      type: 'ordinal_5',
    },
    {
      id: 'pipeline_management',
      label: 'Pipeline and forecasting discipline signals',
      weight: 0.10,
      type: 'ordinal_5',
    },
    {
      id: 'location_eligibility',
      label: 'AU work rights / location',
      weight: 0.10,
      type: 'binary',
      hard_gate: true,
    },
  ],
  minimum_score_to_advance: 3.4,
  hard_gates: ['location_eligibility'],
  blind_fields: STANDARD_BLIND_FIELDS,
}

export const RUBRIC_OPS_MANAGER: Rubric = {
  rubric_id: 'rub_ops_manager_au_v1',
  role: 'Operations Manager',
  country: 'AU',
  version: 1,
  criteria: [
    {
      id: 'process_design',
      label: 'Process design and improvement',
      weight: 0.25,
      type: 'ordinal_5',
      evidence_required: true,
    },
    {
      id: 'team_leadership',
      label: 'Team size led and direct reports',
      weight: 0.20,
      type: 'ordinal_5',
    },
    {
      id: 'compliance_awareness',
      label: 'Compliance and WHS awareness',
      weight: 0.15,
      type: 'ordinal_5',
    },
    {
      id: 'systems_proficiency',
      label: 'Systems and tooling proficiency',
      weight: 0.10,
      type: 'ordinal_5',
    },
    {
      id: 'tenure_stability',
      label: 'Tenure pattern',
      weight: 0.05,
      type: 'ordinal_5',
      fairness_flag: 'tenure_can_correlate_with_caregiving_gaps',
    },
    {
      id: 'communication',
      label: 'Written communication (CV clarity)',
      weight: 0.15,
      type: 'ordinal_5',
    },
    {
      id: 'location_eligibility',
      label: 'AU work rights / location',
      weight: 0.10,
      type: 'binary',
      hard_gate: true,
    },
  ],
  minimum_score_to_advance: 3.4,
  hard_gates: ['location_eligibility'],
  blind_fields: STANDARD_BLIND_FIELDS,
}

export const ALL_RUBRICS: Rubric[] = [
  RUBRIC_BACKEND_ENGINEER,
  RUBRIC_SALES_AE,
  RUBRIC_OPS_MANAGER,
]

export function getRubric(id: string): Rubric | null {
  return ALL_RUBRICS.find(r => r.rubric_id === id) ?? null
}
