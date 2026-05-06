import type { Rubric } from './cv-screening-types'

const STANDARD_BLIND_FIELDS = ['name', 'photo', 'address', 'dob', 'gender_inferred', 'graduation_year', 'school_name']

export const RUBRIC_CI_ANALYST: Rubric = {
  rubric_id: 'rub_ci_analyst_au_v1',
  role: 'Continuous Improvement Analyst (Customer Service, Contract)',
  country: 'AU',
  version: 1,
  criteria: [
    {
      id: 'process_improvement_depth',
      label: 'Process improvement / business analysis experience',
      weight: 0.25,
      type: 'ordinal_5',
      anchors: {
        '1': 'No PI or BA experience',
        '2': '1-2 yrs in coordinator/admin role with light improvement work',
        '3': '3-5 yrs as a BA or PI analyst, has owned individual workflow reviews',
        '4': '5-8 yrs leading multi-team operational reviews end-to-end with measurable outcomes',
        '5': '8+ yrs senior BA/PI lead, multiple complex reviews delivered with quantified ROI',
      },
      evidence_required: true,
    },
    {
      id: 'workflow_mapping',
      label: 'Workflow mapping and analysis ability',
      weight: 0.20,
      type: 'ordinal_5',
      anchors: {
        '1': 'No documented mapping experience',
        '2': 'Has used templates but not led mapping work',
        '3': 'BPMN, swimlane or value-stream mapping at a working level',
        '4': 'Maps complex multi-system workflows with current/future state and quantified pain points',
        '5': 'Multiple end-to-end mapping engagements delivered with measurable improvements after handover',
      },
      evidence_required: true,
    },
    {
      id: 'lean_methodology',
      label: 'Lean / continuous improvement methodology',
      weight: 0.15,
      type: 'ordinal_5',
      anchors: {
        '1': 'No Lean, Six Sigma or Kaizen exposure',
        '3': 'Lean awareness from a course or single project',
        '4': 'Lean / Six Sigma Green Belt or equivalent applied across multiple projects',
        '5': 'Lean Six Sigma Black Belt or equivalent with delivered Kaizen/value-stream initiatives',
      },
    },
    {
      id: 'stakeholder_engagement',
      label: 'Stakeholder engagement (all levels)',
      weight: 0.15,
      type: 'ordinal_5',
      anchors: {
        '1': 'Limited stakeholder-facing experience',
        '3': 'Comfortable engaging at team-lead and ops-manager level',
        '4': 'Regular engagement with executive sponsors plus frontline, facilitates workshops',
        '5': 'C-suite engagement, runs cross-functional steering groups, manages competing priorities',
      },
    },
    {
      id: 'domain_fit_cs_ops',
      label: 'Customer service / operations / support domain fit',
      weight: 0.10,
      type: 'ordinal_5',
      anchors: {
        '1': 'No customer-service or operations domain experience',
        '3': 'Some exposure via projects in contact centres, ops or shared services',
        '5': 'Deep CS / contact-centre / shared-services / support-ops background',
      },
    },
    {
      id: 'communication',
      label: 'Written communication (CV clarity, quantified outcomes)',
      weight: 0.05,
      type: 'ordinal_5',
    },
    {
      id: 'location_eligibility',
      label: 'AU work rights and Brisbane / hybrid available',
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
  RUBRIC_CI_ANALYST,
  RUBRIC_SALES_AE,
  RUBRIC_OPS_MANAGER,
]

export function getRubric(id: string): Rubric | null {
  return ALL_RUBRICS.find(r => r.rubric_id === id) ?? null
}
