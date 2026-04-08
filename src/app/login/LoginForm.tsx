'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Tab = 'password' | 'magic' | 'signup'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextRaw = searchParams.get('next') ?? '/register'
  const next = nextRaw.startsWith('/') ? nextRaw : `/${nextRaw}`

  const [tab, setTab] = useState<Tab>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'auth') {
      setError('Sign-in link expired or was invalid. Request a new magic link or try again.')
      params.delete('error')
      const q = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
    }
  }, [])

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
    router.push(next)
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
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setInfo('Check your email for the sign-in link. You can close this page.')
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
    const { error: err } = await supabase.auth.signUp({
      email: trimmed,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setInfo(
      'Account created. If email confirmation is required, check your inbox; otherwise you can sign in below.',
    )
  }

  return (
    <div className="max-w-md w-full bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#062744] mb-1">Log in</h1>
      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
        Use your email and password, request a magic link, or create a new account. Returning parents get the same autofill on registration as with Google.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            ['password', 'Email & password'],
            ['magic', 'Magic link'],
            ['signup', 'Create account'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setError(null)
              setInfo(null)
            }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              tab === id
                ? 'bg-[#062744] text-white'
                : 'bg-[#f7f2e8] text-[#213c57] hover:bg-[#f0e2d9]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="block text-sm font-semibold text-[#213c57] mb-1">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent text-sm"
            placeholder="you@example.com"
          />
        </label>

        {(tab === 'password' || tab === 'signup') && (
          <label className="block">
            <span className="block text-sm font-semibold text-[#213c57] mb-1">Password</span>
            <input
              type="password"
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent text-sm"
              placeholder="••••••••"
            />
          </label>
        )}

        {tab === 'signup' && (
          <label className="block">
            <span className="block text-sm font-semibold text-[#213c57] mb-1">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent text-sm"
              placeholder="••••••••"
            />
          </label>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-800">{error}</div>
        )}
        {info && (
          <div className="rounded-xl px-4 py-3 text-sm bg-green-50 border border-green-200 text-green-800">{info}</div>
        )}

        {tab === 'password' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void signInWithPassword()}
            className="w-full bg-[#062744] hover:bg-[#041f36] disabled:bg-[#4b6782] text-white font-bold py-3 rounded-full transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        )}

        {tab === 'magic' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void sendMagicLink()}
            className="w-full bg-[#f05a28] hover:bg-[#d94e21] disabled:opacity-60 text-white font-bold py-3 rounded-full transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Sending…' : 'Email me a magic link'}
          </button>
        )}

        {tab === 'signup' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void signUpWithPassword()}
            className="w-full bg-[#062744] hover:bg-[#041f36] disabled:bg-[#4b6782] text-white font-bold py-3 rounded-full transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        )}
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link href="/register" className="text-[#f05a28] font-semibold hover:underline">
          Register for camp
        </Link>
        <span className="mx-2 text-slate-400">·</span>
        <Link href="/" className="text-[#213c57] font-medium hover:underline">
          Home
        </Link>
      </p>
    </div>
  )
}
