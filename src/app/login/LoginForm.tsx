'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ParentEmailAuthPanel from '@/components/ParentEmailAuthPanel'

export default function LoginForm() {
  const searchParams = useSearchParams()
  const nextRaw = searchParams.get('next') ?? '/dashboard'
  const next = nextRaw.startsWith('/') ? nextRaw : `/${nextRaw}`
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'auth') {
      setAuthError('Sign-in link expired or was invalid. Request a new magic link or try again.')
      params.delete('error')
      const q = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
    }
  }, [])

  return (
    <div className="max-w-md w-full bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#062744] mb-1">Returning parent sign-in</h1>
      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
        Use the same email you used when you registered. New families should start on{' '}
        <Link href="/register" className="text-[#f05a28] font-semibold hover:underline">
          Register for camp
        </Link>{' '}
        — that flow includes creating your account.
      </p>

      {authError && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-800">{authError}</div>
      )}

      <ParentEmailAuthPanel variant="returning" redirectPath={next} />

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link href="/register" className="text-[#f05a28] font-semibold hover:underline">
          Register for camp (new families)
        </Link>
        <span className="mx-2 text-slate-400">·</span>
        <Link href="/" className="text-[#213c57] font-medium hover:underline">
          Home
        </Link>
      </p>
    </div>
  )
}
