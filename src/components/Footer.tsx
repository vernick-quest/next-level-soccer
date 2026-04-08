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
              Next Level Soccer Development Camps at Beach Chalet for competitive middle school club players ready for the next level.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-[#f8c5b1] transition-colors">About</a></li>
              <li><a href="#sessions" className="hover:text-[#f8c5b1] transition-colors">Schedule</a></li>
              <li><Link href="/login" className="hover:text-[#f8c5b1] transition-colors">Log in</Link></li>
              <li><Link href="/register" className="hover:text-[#f8c5b1] transition-colors">Register</Link></li>
              <li><Link href="/coaches" className="hover:text-[#f8c5b1] transition-colors">Coach&apos;s View</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>📍 Beach Chalet, San Francisco, CA</li>
              <li>📧 <a href="mailto:info@nextlevelsoccersf.com" className="hover:text-[#f8c5b1] transition-colors">info@nextlevelsoccersf.com</a></li>
              <li>📞 <a href="tel:+14155550100" className="hover:text-[#f8c5b1] transition-colors">(415) 555-0100</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1f4363] mt-10 pt-6 text-center text-xs">
          © {new Date().getFullYear()} Next Level Soccer SF. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
