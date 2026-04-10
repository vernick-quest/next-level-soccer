import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-[#062744] text-[#c6d5e3] py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Image
                src="/next-level-logo.png"
                alt="Next Level Soccer San Francisco"
                width={48}
                height={48}
                className="rounded-full border border-[#1f4363]"
              />
              <span className="font-extrabold text-white text-lg">Next Level Soccer SF</span>
            </div>
            <p className="text-sm leading-relaxed">
              Advancing the game of competitive youth players through specialized curriculum and performance tracking in San Francisco.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-[#f8c5b1] transition-colors">About</a></li>
              <li><a href="#sessions" className="hover:text-[#f8c5b1] transition-colors">Schedule</a></li>
              <li>
                <Link href="/login" className="hover:text-[#f8c5b1] transition-colors" title="Returning parents">
                  Returning parents
                </Link>
              </li>
              <li><Link href="/register" className="hover:text-[#f8c5b1] transition-colors">Register</Link></li>
              <li><Link href="/coaches" className="hover:text-[#f8c5b1] transition-colors">Coach&apos;s View</Link></li>
              <li>
                <Link href="/report-card-skills" className="hover:text-[#f8c5b1] transition-colors">
                  Report Card
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 md:items-end md:text-right">
            <h4 className="text-white font-semibold w-full">Contact</h4>
            <p className="text-sm">📍 Beach Chalet, San Francisco, CA</p>
            <p className="text-sm break-all">
              📧{' '}
              <a
                href="mailto:nextlevelsoccersf@gmail.com"
                className="hover:text-[#f8c5b1] transition-colors"
              >
                nextlevelsoccersf@gmail.com
              </a>
            </p>
            <a
              href="https://www.instagram.com/nextlevelsoccersf/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#1f4363] bg-[#0a3048] text-[#f8c5b1] hover:bg-[#1f4363] hover:text-white transition-colors md:self-end"
              aria-label="Next Level Soccer SF on Instagram"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="border-t border-[#1f4363] mt-10 pt-6 text-center text-xs">
          © {new Date().getFullYear()} Next Level Soccer SF. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
