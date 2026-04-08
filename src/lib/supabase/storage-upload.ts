import { createClient } from '@/lib/supabase/client'

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function uploadChildPhoto(file: File, childId: string) {
  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { publicUrl: null as string | null, error: 'Please sign in before uploading photos.' }
  }

  const filename = `${Date.now()}-${sanitizeFilename(file.name)}`
  const path = `${user.id}/${childId}/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('child-profiles')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })

  if (uploadError) {
    return { publicUrl: null as string | null, error: uploadError.message }
  }

  const { data } = supabase.storage.from('child-profiles').getPublicUrl(path)
  return { publicUrl: data.publicUrl, error: null as string | null }
}
