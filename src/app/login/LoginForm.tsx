'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import GoogleOAuthButton from '@/components/GoogleOAuthButton'
import ParentEmailAuthPanel from '@/components/ParentEmailAuthPanel'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const nextRaw = searchParams.get('next') ?? '/dashboard'
  const next = nextRaw.startsWith('/') ? nextRaw : `/${nextRaw}`
  const verifyEmail = searchParams.get('verifyEmail')
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'auth') {
      setAuthError('Log-in link expired or was invalid. Request a new magic link or try again.')
      params.delete('error')
      const q = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
    }
  }, [])

  const registerStartHref = '/create-account?next=%2Fregister'

  return (
    <div className="max-w-md w-full bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#062744] mb-1">Parent log in</h1>
      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
        Open your dashboard with Google or email. New families:{' '}
        <Link href={registerStartHref} className="text-[#f05a28] font-semibold hover:underline">
          create your account
        </Link>{' '}
        first, then log in here to finish camp registration.
      </p>

      {verifyEmail === '1' && (
        <div
          className="mb-4 rounded-xl px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-950"
          role="alert"
        >
          Please verify your email address before logging in. Check your inbox (and spam) for a confirmation link from
          us, then return here to log in.
        </div>
      )}

      {authError && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-800">{authError}</div>
      )}

      <div className="mb-5">
        <GoogleOAuthButton nextPath={next} />
      </div>
      <ParentEmailAuthPanel variant="returning" redirectPath={next} />

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link href="/create-account" className="text-[#f05a28] font-semibold hover:underline">
          Create account (new families)
        </Link>
        <span className="mx-2 text-slate-400">·</span>
        <Link href="/" className="text-[#213c57] font-medium hover:underline">
          Home
        </Link>
      </p>
    </div>
  )
}
