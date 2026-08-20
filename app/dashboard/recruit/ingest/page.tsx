// AI Administrator - Ingest IP.
//
// Wraps /api/administrator/ingest in a UI page so non-API users can
// upload a resume or contract, see the extracted structured payload,
// and (in a future iteration) feed it into a downstream template.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IngestClient from './IngestClient'

export default async function IngestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <IngestClient />
}
