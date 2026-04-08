'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CoachesWrongAccount() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOutAndRetry() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login?next=/coaches')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f7f2e8]">
      <div className="max-w-md w-full bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm text-center">
        <h1 className="text-xl font-extrabold text-[#062744] mb-2">Staff access only</h1>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Coach&apos;s View is for camp staff. You&apos;re signed in with an account that isn&apos;t on the staff list, or you
          didn&apos;t use Google. Sign out and sign in with Google as an authorized admin.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void signOutAndRetry()}
          className="w-full bg-[#062744] hover:bg-[#041f36] disabled:opacity-60 text-white font-bold py-3 rounded-full text-sm transition-colors"
        >
          {loading ? 'Signing out…' : 'Sign out & staff sign-in'}
        </button>
        <Link href="/" className="inline-block mt-6 text-sm text-[#f05a28] font-medium hover:underline">
          ← Back to site
        </Link>
      </div>
    </div>
  )
}
