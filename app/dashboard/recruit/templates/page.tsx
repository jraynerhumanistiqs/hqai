import { TemplatesList } from '@/components/templates/TemplatesList'
import { ALL_TEMPLATES } from '@/lib/template-ip'

const count = ALL_TEMPLATES.filter(t => t.category === 'Recruitment').length

export default function RecruitmentTemplatesPage() {
  return (
    <TemplatesList
      title="Recruitment Templates"
      subtitle={`${count} best-practice recruitment templates - job ads, screening questions, reference checks, scorecards and candidate emails. Download a blank template or fill in your role details first.`}
      includeCategories={['Recruitment']}
      // Fix #7 (M7): pass recruit module so Fill in details routes to the recruit chat,
      // not the HR People chat.
      customiseModule="recruit"
    />
  )
}
