import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requirementsFor } from '@/lib/record-gaps'
import type { EmploymentType } from '@/lib/employees'
import {
  EMPLOYEE_DOCUMENTS_BUCKET,
  checkUpload,
  sanitiseFileName,
} from '@/components/people/upload-rules'

// POST /api/employees/[id]/documents - attach a file to one person's record.
//
// Files live ONLY on the record, in the private 'employee-documents' bucket,
// never in the documents library. Order of operations:
//   1. Authorise with the caller's own Supabase client: selecting the
//      employee goes through RLS + can_access_employee, so a scoped admin
//      cannot attach to someone outside their team.
//   2. Validate type, size and the optional fields.
//   3. Upload with the service role (the bucket has no client access).
//   4. Append a 'document_uploaded' event, again with the caller's client so
//      the trail's own insert policy applies. If that insert fails, the
//      just-uploaded object is removed so nothing is left unreferenced.
// There is no DELETE: the trail is append-only.

export const runtime = 'nodejs'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('business_id').eq('id', user.id).single()
  const businessId = profile?.business_id as string | undefined
  if (!businessId) return NextResponse.json({ error: 'No business' }, { status: 400 })

  const { data: employee } = await supabase
    .from('employees').select('id, business_id, employment_type')
    .eq('id', id).eq('business_id', businessId).maybeSingle()
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Send the file as a form upload' }, { status: 400 })

  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to attach' }, { status: 400 })

  const check = checkUpload(file.name, file.size)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: 400 })

  // Optional: which "What is on file" item this is evidence of. Must be a
  // requirement for this person's employment type.
  const satisfiesRaw = String(form.get('satisfies') ?? '').trim()
  let satisfies: string | null = null
  if (satisfiesRaw) {
    const valid = requirementsFor(employee.employment_type as EmploymentType).some(r => r.key === satisfiesRaw)
    if (!valid) return NextResponse.json({ error: 'That checklist item does not apply to this person' }, { status: 400 })
    satisfies = satisfiesRaw
  }

  // Same rule as POST /api/compliance-events: may be backdated, not more than
  // 24h ahead. created_at still records when it was actually attached.
  let occurredAt = new Date().toISOString()
  const occurredRaw = String(form.get('occurred_at') ?? '').trim()
  if (occurredRaw) {
    const parsed = Date.parse(occurredRaw)
    if (Number.isNaN(parsed)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    if (parsed > Date.now() + 86_400_000) {
      return NextResponse.json({ error: 'Date cannot be in the future' }, { status: 400 })
    }
    occurredAt = new Date(parsed).toISOString()
  }

  const fileName = sanitiseFileName(file.name)
  const title = String(form.get('title') ?? '').trim().slice(0, 200) || fileName
  const path = `${businessId}/${employee.id}/${randomUUID()}-${fileName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const uploadError = await uploadToBucket(path, buffer, check.mime)
  if (uploadError) {
    console.warn('[employees/documents] upload failed:', uploadError)
    return NextResponse.json({ error: 'The file could not be stored. Try again.' }, { status: 500 })
  }

  const { data: event, error } = await supabase.from('compliance_events').insert({
    business_id: businessId,
    employee_id: employee.id,
    event_type: 'document_uploaded',
    title,
    detail: null,
    occurred_at: occurredAt,
    recorded_by: user.id,
    metadata: {
      storage_path: path,
      file_name: fileName,
      mime: check.mime,
      size: file.size,
      satisfies,
    },
  }).select().single()

  if (error || !event) {
    // No event references the object, so it is not part of the trail yet.
    await supabaseAdmin.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).remove([path]).catch(() => undefined)
    return NextResponse.json({ error: error?.message ?? 'Could not add the file to the record' }, { status: 500 })
  }

  return NextResponse.json(event, { status: 201 })
}

// Mirrors the ensure-bucket pattern in app/api/cv-screening/score/route.ts:
// try the upload, and if the bucket is missing create it (private) and retry
// once. Returns an error message, or null on success.
async function uploadToBucket(path: string, buffer: Buffer, contentType: string): Promise<string | null> {
  try {
    const opts = { contentType, upsert: false }
    let { error } = await supabaseAdmin.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).upload(path, buffer, opts)
    if (error && (error.message?.includes('not found') || error.message?.includes('Bucket'))) {
      const { error: bucketError } = await supabaseAdmin.storage.createBucket(EMPLOYEE_DOCUMENTS_BUCKET, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024,
      })
      if (bucketError && !bucketError.message?.includes('already exists')) return bucketError.message
      const retry = await supabaseAdmin.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).upload(path, buffer, opts)
      error = retry.error
    }
    return error ? error.message : null
  } catch (err) {
    return (err as Error).message
  }
}
