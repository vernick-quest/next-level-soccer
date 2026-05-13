'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'password' | 'magic' | 'signup'

type Props = {
  /** `returning`: log in on parent login page. `createAccount`: sign-up + magic only (no password log-in on this screen). */
  variant: 'returning' | 'createAccount'
  /** After OAuth / magic link (e.g. `/dashboard` or `/register`). */
  redirectPath?: string
  className?: string
}

export default function ParentEmailAuthPanel({
  variant,
  redirectPath = '/dashboard',
  className = '',
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>(variant === 'createAccount' ? 'signup' : 'password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const safeNext = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`

  async function signInWithPassword() {
    setError(null)
    setInfo(null)
    const trimmed = email.trim()
    if (!trimmed || !password) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push(safeNext)
    router.refresh()
  }

  async function sendMagicLink() {
    setError(null)
    setInfo(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email address.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const origin = window.location.origin
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        shouldCreateUser: variant === 'createAccount',
      },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setInfo('Check your email for the link. You can close this page.')
  }

  async function signUpWithPassword() {
    setError(null)
    setInfo(null)
    const trimmed = email.trim()
    if (!trimmed || !password) {
      setError('Enter your email and password.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const origin = window.location.origin
    const { data, error: err } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    if (data.session) {
      await supabase.auth.signOut()
    }
    router.push('/login?verifyEmail=1')
  }

  const tabs: [Tab, string][] =
    variant === 'createAccount'
      ? [
          ['signup', 'Create account'],
          ['magic', 'Magic link'],
        ]
      : [
          ['password', 'Log in'],
          ['magic', 'Magic link'],
        ]

  return (
    <div className={`rounded-xl border border-[#e8d8ce] bg-[#faf8f5] p-4 sm:p-5 ${className}`}>
      <p className="text-xs font-semibold text-[#213c57] uppercase tracking-wide mb-3">Or use email</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setError(null)
              setInfo(null)
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              tab === id ? 'bg-[#062744] text-white' : 'bg-white text-[#213c57] border border-[#e8d8ce] hover:bg-[#f0e2d9]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs font-semibold text-[#213c57] mb-1">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#e8d8ce] rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent text-sm bg-white"
            placeholder="you@example.com"
          />
        </label>

        {(tab === 'password' || tab === 'signup') && (
          <label className="block">
            <span className="block text-xs font-semibold text-[#213c57] mb-1">Password</span>
            <input
              type="password"
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#e8d8ce] rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent text-sm bg-white"
              placeholder="••••••••"
            />
          </label>
        )}

        {tab === 'signup' && (
          <label className="block">
            <span className="block text-xs font-semibold text-[#213c57] mb-1">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[#e8d8ce] rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent text-sm bg-white"
              placeholder="••••••••"
            />
          </label>
        )}

        {error && (
          <div className="rounded-xl px-3 py-2.5 text-xs bg-red-50 border border-red-200 text-red-800">{error}</div>
        )}
        {info && (
          <div className="rounded-xl px-3 py-2.5 text-xs bg-green-50 border border-green-200 text-green-800">{info}</div>
        )}

        {tab === 'password' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void signInWithPassword()}
            className="w-full bg-[#062744] hover:bg-[#041f36] disabled:bg-[#4b6782] text-white font-bold py-2.5 rounded-full text-sm transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        )}

        {tab === 'magic' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void sendMagicLink()}
            className="w-full bg-[#f05a28] hover:bg-[#d94e21] disabled:opacity-60 text-white font-bold py-2.5 rounded-full text-sm transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Sending…' : 'Email me a magic link'}
          </button>
        )}

        {tab === 'signup' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void signUpWithPassword()}
            className="w-full bg-[#062744] hover:bg-[#041f36] disabled:bg-[#4b6782] text-white font-bold py-2.5 rounded-full text-sm transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        )}
      </div>
    </div>
  )
}
