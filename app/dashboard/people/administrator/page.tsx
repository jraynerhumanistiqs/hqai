// AI Administrator - document-first surface, end-to-end.
//
// Renders the template gallery server-side from lib/template-ip.ts,
// then hands off to AdministratorClient for the form + generation +
// live preview flow.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ALL_TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/template-ip'
import AdministratorClient from './AdministratorClient'

export default async function AdministratorPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  // Slim the template payload sent to the client - keep the bits we
  // actually need to render the gallery + form. Keeps the bundle
  // light.
  const templates = ALL_TEMPLATES.map(t => ({
    id:          t.id,
    title:       t.title,
    category:    t.category,
    description: t.description,
    formFields:  t.formFields,
  }))

  return (
    <AdministratorClient
      templates={templates}
      categories={[...TEMPLATE_CATEGORIES]}
      initialTemplateId={params.template ?? null}
    />
  )
}
