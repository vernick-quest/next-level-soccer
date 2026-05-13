import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isStaffAdminEmail } from '@/lib/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** Normalize `next` to an internal path; reject obvious open redirects and the site root. */
export function normalizeInternalNext(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== 'string') return ''
  const t = raw.trim()
  if (!t) return ''
  let p = t.startsWith('/') ? t : `/${t}`
  if (p.includes('://') || p.includes('..')) return ''
  if (p === '/') return ''
  return p
}

async function countRegistrationChildrenWithClient(
  client: SupabaseClient,
  authUserId: string,
): Promise<number | null> {
  const { data: subs, error: subErr } = await client
    .from('registration_submissions')
    .select('id')
    .eq('auth_user_id', authUserId)

  if (subErr) return null
  if (!subs?.length) return 0

  const ids = subs.map((s) => s.id as string)
  const { count, error: chErr } = await client
    .from('registration_children')
    .select('id', { count: 'exact', head: true })
    .in('submission_id', ids)

  if (chErr) return null
  return count ?? 0
}

/**
 * Count `registration_children` for this auth user (via `registration_submissions.auth_user_id`).
 * Prefer service role so counts are correct even if RLS on nested reads misbehaves for the user session.
 */
export async function countRegistrationChildrenForUser(
  supabaseUserSession: SupabaseClient,
  authUserId: string,
): Promise<number | null> {
  try {
    const sr = createServiceRoleClient()
    const n = await countRegistrationChildrenWithClient(sr, authUserId)
    if (n !== null) return n
  } catch {
    /* fall through to session-scoped client */
  }
  return countRegistrationChildrenWithClient(supabaseUserSession, authUserId)
}

async function hasStaffAdminRoleInProfilesTable(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error || data == null) return false
  const r = String((data as { role?: string }).role ?? '')
    .toLowerCase()
    .trim()
  return r === 'staff' || r === 'admin'
}

async function isStaffOrCoachPortalUser(supabase: SupabaseClient, user: User): Promise<boolean> {
  const role = String(user.app_metadata?.role ?? '').toLowerCase().trim()
  if (role === 'admin' || role === 'staff') return true

  if (await hasStaffAdminRoleInProfilesTable(supabase, user.id)) return true

  const { data: fromRpc, error: rpcErr } = await supabase.rpc('is_staff_admin')
  if (!rpcErr && fromRpc === true) return true

  const email = user.email ?? null
  if (email && (await isStaffAdminEmail(email, supabase))) return true
  return false
}

/**
 * Where to send the user after a successful session (Google SSO / magic link → `/auth/callback`,
 * email/password → `/auth/post-login` full navigation, or any code path that calls this).
 *
 * **Staff:** `/coaches`, unless `next` is under `/admin`.
 *
 * **Parents:** `next` starting with `/register` is kept. Otherwise count children via `registration_submissions` →
 * `registration_children`: 0 → `/register/child-info`, else `/dashboard` (or another safe explicit `next`).
 *
 * On any unexpected error while resolving, returns `/dashboard`.
 */
export async function resolvePostLoginRedirect(
  supabase: SupabaseClient,
  user: User,
  requestedNext: string | null | undefined,
): Promise<string> {
  try {
    const norm = normalizeInternalNext(requestedNext ?? '')

    if (await isStaffOrCoachPortalUser(supabase, user)) {
      if (norm.startsWith('/admin')) return norm
      return '/coaches'
    }

    if (norm.startsWith('/register')) return norm

    const childCount = await countRegistrationChildrenForUser(supabase, user.id)
    if (childCount === null) return '/dashboard'
    if (childCount === 0) return '/register/child-info'

    if (norm && norm !== '/dashboard' && isSafeParentPostLoginPath(norm)) return norm

    return '/dashboard'
  } catch {
    return '/dashboard'
  }
}

function isSafeParentPostLoginPath(path: string): boolean {
  if (!path || path === '/' || !path.startsWith('/')) return false
  if (path.startsWith('/admin') || path.startsWith('/coaches') || path.startsWith('/coach')) return false
  if (path.startsWith('/auth') || path.startsWith('/login')) return false
  return true
}
