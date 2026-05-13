import { createClient } from '@supabase/supabase-js'

/** Service-role client for Auth Admin API (list users, etc.). Not cookie-based. */
export function createAuthAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Resolve `auth.users.id` for a verified parent email (case-insensitive). */
export async function lookupAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  try {
    const admin = createAuthAdminClient()
    const perPage = 1000
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error('[lookupAuthUserIdByEmail] listUsers:', error)
        return null
      }
      const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === normalized)
      if (hit) return hit.id
      if (data.users.length < perPage) break
    }
  } catch (e) {
    console.error('[lookupAuthUserIdByEmail]', e)
    return null
  }
  return null
}
