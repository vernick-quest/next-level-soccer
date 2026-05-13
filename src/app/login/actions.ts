'use server'

import { createClient } from '@/lib/supabase/server'
import { resolvePostLoginRedirect } from '@/lib/post-login-redirect'

/** Used after browser password login so redirect matches OAuth/magic-link rules. */
export async function getPostLoginRedirectPath(requestedNext: string | null): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return '/login'
  return resolvePostLoginRedirect(supabase, user, requestedNext)
}
