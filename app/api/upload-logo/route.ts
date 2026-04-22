import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Lazy-init service role client to avoid build-time env errors
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Verify user is authenticated
  const authClient = await createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get business ID from profile
  const { data: profile } = await authClient
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  if (!profile?.business_id) {
    return NextResponse.json({ error: 'No business found' }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 2MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'png'
  const path = `${profile.business_id}/logo.${ext}`

  // Upload using service role (bypasses RLS)
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const supabaseAdmin = getAdminClient()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('logos')
    .upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    // If bucket doesn't exist, create it
    if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
      // Try creating the bucket
      const { error: bucketError } = await supabaseAdmin.storage.createBucket('logos', {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
      })

      if (bucketError && !bucketError.message?.includes('already exists')) {
        return NextResponse.json({ error: `Could not create storage bucket: ${bucketError.message}` }, { status: 500 })
      }

      // Retry upload after bucket creation
      const { error: retryError } = await supabaseAdmin.storage
        .from('logos')
        .upload(path, buffer, { upsert: true, contentType: file.type })

      if (retryError) {
        return NextResponse.json({ error: `Upload failed: ${retryError.message}` }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('logos').getPublicUrl(path)

  // Save URL to business record (bust CDN cache by appending a version param)
  const versionedUrl = `${publicUrl}?v=${Date.now()}`
  const { error: updateError } = await supabaseAdmin
    .from('businesses')
    .update({ logo_url: versionedUrl })
    .eq('id', profile.business_id)

  if (updateError) {
    return NextResponse.json({ error: `Could not save logo: ${updateError.message}` }, { status: 500 })
  }

  // Invalidate the dashboard layout cache so the new logo renders on refresh
  try {
    revalidatePath('/dashboard', 'layout')
  } catch {}

  return NextResponse.json({ url: versionedUrl })
}
