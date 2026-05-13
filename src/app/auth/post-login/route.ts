import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { resolvePostLoginRedirect } from '@/lib/post-login-redirect'

/**
 * Full-page redirect target after email/password sign-in so the browser sends fresh auth
 * cookies (Server Actions can run before the session cookie is visible to the server).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next')

  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          /* ignore */
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const back = next && next.startsWith('/') ? next : '/dashboard'
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(back)}`)
  }

  const destination = await resolvePostLoginRedirect(supabase, user, next)
  const path = destination.startsWith('/') ? destination : `/${destination}`
  return NextResponse.redirect(`${origin}${path}`)
}
