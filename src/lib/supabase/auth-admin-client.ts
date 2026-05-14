import { createClient } from '@supabase/supabase-js'
import { getSiteOrigin } from '@/lib/site-origin'

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

/**
 * Resolve or create a parent Auth user for staff manual registration.
 * If no user exists, sends Supabase invite email (verify + set password) and returns the new id.
 */
export async function ensureParentAuthUserForManualRegistration(
  email: string,
): Promise<{ ok: true; userId: string; invited: boolean } | { ok: false; message: string }> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return { ok: false, message: 'Parent email is required.' }

  const existing = await lookupAuthUserIdByEmail(normalized)
  if (existing) return { ok: true, userId: existing, invited: false }

  try {
    const admin = createAuthAdminClient()
    const origin = getSiteOrigin()
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`
    const { data, error } = await admin.auth.admin.inviteUserByEmail(normalized, {
      data: { invited_via: 'staff_manual_registration' },
      redirectTo,
    })
    if (error) {
      console.error('[ensureParentAuthUserForManualRegistration] inviteUserByEmail:', error)
      return {
        ok: false,
        message:
          error.message ||
          'Could not invite this email. Check Supabase Auth (signups / SMTP) and try again.',
      }
    }
    const userId = data.user?.id
    if (!userId) {
      return { ok: false, message: 'Invite did not return a user id.' }
    }
    return { ok: true, userId, invited: true }
  } catch (e) {
    console.error('[ensureParentAuthUserForManualRegistration]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, message: msg }
  }
}
