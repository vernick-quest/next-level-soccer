import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const sessions = [
  { name: 'Week of Jun 8', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Jun 15', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Jun 22', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Jun 29', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Jul 6', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Jul 13', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Jul 20', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Jul 27', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Aug 3', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
  { name: 'Week of Aug 10', dates: 'Mon-Fri, 3:30-7:30 PM', spots: 10, price: '$350' },
]

const coaches = [
  {
    name: 'Coach Rami Hammadi',
    title: 'Head Coach',
    bio: "A former professional player with Fiorentina (Italy), Rami Hammadi bridges European tactical rigor with San Francisco's youth talent. After successful tenures at the collegiate and high school levels, Rami pivoted to youth development to have a more profound impact on the player lifecycle. Having coached every tier from Bronze to MLS Next, he specializes in refining competitive players through a high-performance environment designed to build the technical precision and grit required for the next level.",
    initials: 'RH',
  },
]

const stats = [
  { value: '+100%', label: 'Juggling record vs. your day-one baseline' },
  { value: '~20%', label: '50m sprint — explosive speed block' },
  { value: 'Sharper', label: 'Shot accuracy & finishing on frame' },
  { value: 'Tighter', label: 'Ball control — first touch under pressure' },
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-[#041f36] via-[#062744] to-[#041f36] overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #f05a28 0, #f05a28 1px, transparent 0, transparent 50%)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/next-level-logo.png"
              alt="Next Level Soccer San Francisco"
              width={128}
              height={128}
              className="rounded-full border-4 border-white/80 shadow-2xl shadow-black/30"
              priority
            />
          </div>
          <span className="inline-block bg-[#f05a28]/15 text-[#ffd7c8] border border-[#f05a28]/40 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            San Francisco Youth Soccer Camp
          </span>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
            Reach Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f05a28] to-[#ff8c61]">
              Next Level
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Next Level Soccer Development Camps at Beach Chalet for competitive middle school club players. Monday through Friday, 3:30-7:30 PM.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-[#f05a28] hover:bg-[#d94e21] text-white font-bold px-8 py-4 rounded-full text-lg transition-all shadow-lg shadow-[#3a1a0f]/40 hover:-translate-y-0.5"
            >
              Register for Summer 2026
            </Link>
            <a
              href="#sessions"
              className="border border-slate-400 text-slate-200 hover:bg-white/10 font-semibold px-8 py-4 rounded-full text-lg transition-all"
            >
              View Schedule
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 animate-bounce text-2xl">↓</div>
      </section>

      {/* Outcomes bar */}
      <section className="bg-[#f05a28] py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-orange-50 text-sm font-medium max-w-2xl mx-auto mb-8 leading-relaxed">
            We track progress from each player&apos;s baseline. Here&apos;s what serious athletes work toward over a week of camp.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 text-center text-white">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl sm:text-4xl font-extrabold leading-tight">{s.value}</div>
                <div className="text-orange-100 text-xs sm:text-sm mt-2 leading-snug px-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 bg-[#f7f2e8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#f05a28] font-semibold text-sm uppercase tracking-widest">About the Camp</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2 mb-6 leading-tight">High-Intensity Training for Serious Players</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
              Designed for competitive middle school players, our week-long camps run in a high-tempo environment built for athletes already playing club soccer.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
              Every session is designed to challenge committed players, elevate game performance, and prepare athletes for the next level of competition.
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-start gap-3">
                  <span className="text-[#f05a28] text-xl mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold text-slate-900">Advanced Technical Work</div>
                    <div className="text-slate-500 text-sm">Ball control with both feet under pressure</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#f05a28] text-xl mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold text-slate-900">Physical Development</div>
                    <div className="text-slate-500 text-sm">Match endurance, explosive speed, and agility</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-[#fff7f2] to-[#fde6da] rounded-3xl p-10 text-center shadow-inner border border-[#f6d6c8]">
                <div className="text-8xl mb-4">⚽</div>
                <div className="text-2xl font-bold text-slate-800 mb-2">Summer 2026</div>
                <div className="text-slate-600 mb-6">Beach Chalet · Mon-Fri · 3:30-7:30 PM</div>
                <Link
                  href="/register"
                  className="inline-block bg-[#062744] text-white font-bold px-6 py-3 rounded-full hover:bg-[#041f36] transition-colors"
                >
                  Secure Your Spot
                </Link>
              </div>
              <div className="absolute -top-4 -right-4 bg-[#f05a28] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md rotate-12">
                Limited Spots!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sessions & Pricing */}
      <section id="sessions" className="py-24 bg-[#f7f2e8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#f05a28] font-semibold text-sm uppercase tracking-widest">Sessions &amp; Pricing</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2">Summer 2026 Weekly Schedule</h2>
            <p className="text-slate-500 mt-3">Monday-Friday, 3:30-7:30 PM at Beach Chalet</p>
            <p className="text-slate-500 text-sm mt-2">$350 per week for all camp weeks, including 4th of July week.</p>
            <p className="text-[#c24a22] text-sm mt-2 font-medium">Each week requires a minimum of 10 registered players to run. If a week does not reach 10, that week may be canceled.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((s) => (
              <div
                key={s.name}
                className="border border-[#e8d8ce] rounded-2xl p-6 text-center hover:border-[#f05a28] hover:shadow-md transition-all group bg-white"
              >
                <div className="text-[#f05a28] font-bold text-sm uppercase tracking-wide mb-2">{s.name}</div>
                <div className="text-slate-800 font-semibold mb-4">{s.dates}</div>
                <div className="text-3xl font-extrabold text-slate-900 mb-1">{s.price}</div>
                <div className="text-slate-400 text-xs mb-5">per player</div>
                <div className="text-[#c24a22] text-xs font-semibold mb-4">
                  {`Minimum ${s.spots} players required`}
                </div>
                <Link
                  href="/register"
                  className="block w-full bg-[#062744] text-white font-semibold py-2.5 rounded-full hover:bg-[#041f36] transition-colors text-sm"
                >
                  Register
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coaches */}
      <section id="coaches" className="py-24 bg-[#fffaf5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#f05a28] font-semibold text-sm uppercase tracking-widest">Our Coaches</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2">Led by Coach Rami Hammadi</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {coaches.map((c) => (
              <div key={c.name} className="bg-white rounded-2xl p-8 shadow-sm border border-[#f0e2d9] text-center md:col-start-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f05a28] to-[#d14a1f] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-5">
                  {c.initials}
                </div>
                <div className="text-xl font-bold text-slate-900 mb-1">{c.name}</div>
                <div className="text-[#f05a28] text-sm font-semibold mb-4">{c.title}</div>
                <p className="text-slate-500 leading-relaxed text-sm">{c.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-[#062744] to-[#041f36] text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-5xl mb-6">🏆</div>
          <h2 className="text-4xl font-extrabold mb-4">Ready to Level Up?</h2>
          <p className="text-[#e4edf5] text-lg mb-10 leading-relaxed">
            Spots are limited and fill fast. Register today and give your player a summer they&apos;ll never forget.
          </p>
          <Link
            href="/register"
            className="inline-block bg-[#f05a28] text-white font-bold px-10 py-4 rounded-full text-lg hover:bg-[#d94e21] transition-colors shadow-xl"
          >
            Register Now — Summer 2026
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}
