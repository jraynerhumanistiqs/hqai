'use client'

// RoleStepperRail - the in-role 4-step workflow rail consumed by RoleDetail.
// Renders via the shared RecruitFlowRail (desktop aside + mobile bar),
// so the role workflow matches the unified HQ Recruit navigation pattern.

import type { ReactNode } from 'react'
import RecruitFlowRail, { type FlowStep } from './RecruitFlowRail'

export type RoleStep = 1 | 2 | 3 | 4

interface Props {
  currentStep: RoleStep
  onStepChange: (step: RoleStep) => void
  children?: ReactNode
}

const STEPS: FlowStep[] = [
  { id: 1, label: 'Score CVs',  hint: 'Upload and rank CVs' },
  { id: 2, label: 'Prescreen',  hint: 'Video + phone responses' },
  { id: 3, label: 'Shortlist',  hint: 'Confirm who moves to interview' },
  { id: 4, label: 'Interviews', hint: 'Guide, notes & outcome' },
]

export function RoleStepperRail({ currentStep, onStepChange }: Props) {
  const steps: FlowStep[] = STEPS.map((s) => ({
    ...s,
    done: currentStep > s.id,
  }))

  return (
    <RecruitFlowRail
      eyebrow="Role workflow"
      blurb="Move this candidate pool through four phases."
      steps={steps}
      current={currentStep}
      onStepChange={(id) => onStepChange(id as RoleStep)}
      canNavigate={() => true}
    />
  )
}
