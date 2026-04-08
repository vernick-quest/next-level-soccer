import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/** Site owner (Google). Override with OWNER_EMAIL in the server environment. */
export function getOwnerEmail(): string {
  return (process.env.OWNER_EMAIL ?? 'vernick@gmail.com').trim().toLowerCase()
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null
  const t = email.trim().toLowerCase()
  return t.length ? t : null
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  const n = normalizeEmail(email)
  return n !== null && n === getOwnerEmail()
}

/** Staff dashboard, approvals, and coach reports require a Google-linked session. */
export function userHasGoogleIdentity(user: User): boolean {
  return (user.identities ?? []).some((i) => i.provider === 'google')
}

/**
 * Owner, optional legacy ADMIN_EMAIL, or an email listed in staff_admin_emails (see /admin/staff).
 */
export async function isStaffAdminEmail(
  email: string | null | undefined,
  supabase: SupabaseClient,
): Promise<boolean> {
  const norm = normalizeEmail(email)
  if (!norm) return false
  if (isOwnerEmail(norm)) return true
  const legacy = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (legacy && norm === legacy) return true
  const { data } = await supabase.from('staff_admin_emails').select('email').eq('email', norm).maybeSingle()
  return data != null
}

/** Google sign-in + owner, legacy admin env, or delegated staff row. */
export async function getStaffAdminUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null
  if (!userHasGoogleIdentity(user)) return null
  if (!(await isStaffAdminEmail(user.email, supabase))) return null
  return user
}
