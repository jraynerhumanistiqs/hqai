import { TemplatesList } from '@/components/templates/TemplatesList'
import { ALL_TEMPLATES } from '@/lib/template-ip'

const count = ALL_TEMPLATES.filter(t => t.category === 'Recruitment').length

export default function RecruitmentTemplatesPage() {
  return (
    <TemplatesList
      title="Recruitment Templates"
      subtitle={`${count} best-practice recruitment templates - job ads, screening questions, reference checks, scorecards and candidate emails. Download a blank template or fill in your role details first.`}
      includeCategories={['Recruitment']}
      // No customiseHref: there is no surface today that takes a template and
      // a ?prompt= and produces the filled document. This used to point at
      // /dashboard/recruit, which is a tile grid that ignores the query
      // string, so the button navigated away and threw the request out. Blank
      // downloads work and are honest; wire customiseHref back up the day a
      // real destination exists.
    />
  )
}
