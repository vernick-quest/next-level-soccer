import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isStaffAdminEmail } from '@/lib/admin'

/** Normalize `next` to an internal path; reject obvious open redirects. */
export function normalizeInternalNext(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== 'string') return ''
  const t = raw.trim()
  if (!t) return ''
  let p = t.startsWith('/') ? t : `/${t}`
  if (p.includes('://') || p.includes('..')) return ''
  return p
}

/**
 * Count `registration_children` rows tied to this user via `registration_submissions.auth_user_id` (= auth.uid()).
 * Used for post-login parent routing (Scenario A vs B).
 */
export async function countRegistrationChildrenForUser(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<number> {
  const { data: subs, error: subErr } = await supabase
    .from('registration_submissions')
    .select('id')
    .eq('auth_user_id', authUserId)

  if (subErr || !subs?.length) return 0

  const ids = subs.map((s) => s.id as string)
  const { count, error: chErr } = await supabase
    .from('registration_children')
    .select('id', { count: 'exact', head: true })
    .in('submission_id', ids)

  if (chErr) return 0
  return count ?? 0
}

async function isStaffOrCoachPortalUser(supabase: SupabaseClient, user: User): Promise<boolean> {
  const role = String(user.app_metadata?.role ?? '').toLowerCase().trim()
  if (role === 'admin' || role === 'staff') return true

  const { data: fromRpc, error: rpcErr } = await supabase.rpc('is_staff_admin')
  if (!rpcErr && fromRpc === true) return true

  const email = user.email ?? null
  if (email && (await isStaffAdminEmail(email, supabase))) return true
  return false
}

/**
 * Where to send the user after a successful session (Google SSO, magic link, or email/password — all use this via
 * `/auth/callback` or `getPostLoginRedirectPath` after password sign-in).
 *
 * **Staff:** `/coaches`, unless `next` is under `/admin` (admin Google sign-in).
 *
 * **Parents (non-staff):**
 * - **Scenario A — Returning parent:** ≥1 `registration_children` for their submissions → `/dashboard`.
 * - **Scenario B — New parent:** zero children → `/register` (onboarding / child registration).
 * - If `next` already starts with `/register` (e.g. `?additionalChild=1`), that path is kept.
 * - Otherwise a safe non-default `next` is honored; default landing is `/dashboard` when they have children.
 */
export async function resolvePostLoginRedirect(
  supabase: SupabaseClient,
  user: User,
  requestedNext: string | null | undefined,
): Promise<string> {
  const norm = normalizeInternalNext(requestedNext ?? '')

  if (await isStaffOrCoachPortalUser(supabase, user)) {
    if (norm.startsWith('/admin')) return norm
    return '/coaches'
  }

  if (norm.startsWith('/register')) return norm

  const childCount = await countRegistrationChildrenForUser(supabase, user.id)
  if (childCount === 0) return '/register'

  if (norm && norm !== '/dashboard' && isSafeParentPostLoginPath(norm)) return norm

  return '/dashboard'
}

function isSafeParentPostLoginPath(path: string): boolean {
  if (!path.startsWith('/')) return false
  if (path.startsWith('/admin') || path.startsWith('/coaches') || path.startsWith('/coach')) return false
  if (path.startsWith('/auth') || path.startsWith('/login')) return false
  return true
}
