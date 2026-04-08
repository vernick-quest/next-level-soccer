'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f7f2e8]/95 backdrop-blur border-b border-[#e8d8ce] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/next-level-logo.png"
              alt="Next Level Soccer San Francisco"
              width={52}
              height={52}
              className="rounded-full border border-[#e8d8ce]"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-[#264765] min-w-0">
            <a href="/#about" className="hover:text-[#f05a28] transition-colors shrink-0">
              About
            </a>
            <a href="/#sessions" className="hover:text-[#f05a28] transition-colors shrink-0">
              Schedule
            </a>
            <a href="/#coaches" className="hover:text-[#f05a28] transition-colors shrink-0">
              Staff
            </a>
            {user ? (
              <div className="flex items-center gap-2 lg:gap-3 ml-auto shrink-0">
                <Link
                  href="/dashboard"
                  className="text-[#264765] font-semibold hover:text-[#f05a28] transition-colors whitespace-nowrap"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="bg-[#062744] text-white px-4 py-2 rounded-full hover:bg-[#041f36] transition-colors font-semibold whitespace-nowrap"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 lg:gap-3 ml-auto shrink-0">
                <Link
                  href="/login"
                  className="text-[#264765] font-semibold hover:text-[#f05a28] transition-colors whitespace-nowrap"
                  title="For parents who already have an account"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="bg-[#f05a28] text-white px-4 lg:px-5 py-2 rounded-full hover:bg-[#d94e21] transition-colors font-semibold whitespace-nowrap"
                >
                  Register Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#264765] hover:bg-[#f1e6dd] shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#f7f2e8] border-t border-[#e8d8ce] px-4 pb-4 space-y-3 text-sm font-medium text-[#264765]">
          <a href="/#about" className="block py-2 hover:text-[#f05a28]" onClick={() => setMenuOpen(false)}>
            About
          </a>
          <a href="/#sessions" className="block py-2 hover:text-[#f05a28]" onClick={() => setMenuOpen(false)}>
            Schedule
          </a>
          <a href="/#coaches" className="block py-2 hover:text-[#f05a28]" onClick={() => setMenuOpen(false)}>
            Staff
          </a>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="block bg-[#062744] text-white text-center py-2.5 rounded-full hover:bg-[#041f36] transition-colors font-semibold"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full bg-[#f05a28] text-white text-center py-2.5 rounded-full hover:bg-[#d94e21] transition-colors font-semibold"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/login"
                className="block text-center py-2 text-[#264765] font-semibold hover:text-[#f05a28]"
                title="For parents who already have an account"
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="block bg-[#f05a28] text-white text-center py-2.5 rounded-full hover:bg-[#d94e21] transition-colors font-semibold"
                onClick={() => setMenuOpen(false)}
              >
                Register Now
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
