import { TemplatesList } from '@/components/templates/TemplatesList'
import { ALL_TEMPLATES } from '@/lib/template-ip'

// Recruitment templates live in HQ Recruit → Recruitment Templates. Exclude them here.
const count = ALL_TEMPLATES.filter(t => t.category !== 'Recruitment').length

export default function TemplatesPage() {
  return (
    <TemplatesList
      title="HR Templates"
      subtitle={`${count} best-practice HR templates curated by Humanistiqs. Download a blank template or customise with your business details first. Recruitment templates are available in HQ Recruit.`}
      excludeCategories={['Recruitment']}
      customiseHref="/dashboard/people"
    />
  )
}
