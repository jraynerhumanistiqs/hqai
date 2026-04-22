import { TemplatesList } from '@/components/templates/TemplatesList'
import { ALL_TEMPLATES } from '@/lib/template-ip'

const count = ALL_TEMPLATES.filter(t => t.category === 'Recruitment').length

export default function RecruitmentTemplatesPage() {
  return (
    <TemplatesList
      title="Recruitment Templates"
      subtitle={`${count} best-practice recruitment templates - job ads, screening questions, reference checks, scorecards and candidate emails. Download a blank template or customise with your role details first.`}
      includeCategories={['Recruitment']}
      customiseHref="/dashboard/people"
    />
  )
}
