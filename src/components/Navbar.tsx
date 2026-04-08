'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f7f2e8]/95 backdrop-blur border-b border-[#e8d8ce] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
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
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#264765]">
            <a href="#about" className="hover:text-[#f05a28] transition-colors">About</a>
            <a href="#sessions" className="hover:text-[#f05a28] transition-colors">Schedule</a>
            <a href="#coaches" className="hover:text-[#f05a28] transition-colors">Staff</a>
            <Link
              href="/register"
              className="bg-[#f05a28] text-white px-5 py-2 rounded-full hover:bg-[#d94e21] transition-colors font-semibold"
            >
              Register Now
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-[#264765] hover:bg-[#f1e6dd]"
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
          <a href="#about" className="block py-2 hover:text-[#f05a28]" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#sessions" className="block py-2 hover:text-[#f05a28]" onClick={() => setMenuOpen(false)}>Schedule</a>
          <a href="#coaches" className="block py-2 hover:text-[#f05a28]" onClick={() => setMenuOpen(false)}>Staff</a>
          <Link
            href="/register"
            className="block bg-[#f05a28] text-white text-center py-2 rounded-full hover:bg-[#d94e21] transition-colors font-semibold"
            onClick={() => setMenuOpen(false)}
          >
            Register Now
          </Link>
        </div>
      )}
    </nav>
  )
}
