import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { REPORT_CARD_CATEGORY_ACCENT } from '@/lib/report-card-ui'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { getWeekSpotUsage, WEEK_PLAYER_CAPACITY } from '@/lib/home-camp-spots'

/** Refresh schedule spot counts periodically (uses service-role read). */
export const revalidate = 60

const sessions = CAMP_SESSIONS.map((weekKey) => ({
  weekKey,
  name: weekKey.replace(/\s*\(\$350\)\s*$/, ''),
  dates: 'Mon-Fri, 3:30-7:30 PM',
  price: '$350',
}))

const MIN_WEEK_PLAYERS = 10

const aboutCampPillars = [
  {
    title: 'Advanced Technical Work',
    detail:
      'Ball control with both feet, passing weight, and 1v1 mastery under pressure',
  },
  {
    title: 'Tactical Intelligence',
    detail: 'Scanning the field, spatial awareness, and high-speed transition play',
  },
  {
    title: 'Physical Development',
    detail: 'Match endurance, explosive short-burst speed, and agility',
  },
  {
    title: 'The Competitive Mindset',
    detail: 'Coachability, resilience under pressure, and on-field communication',
  },
] as const

const homeDevelopmentPillars = [
  {
    id: 'technical',
    title: 'Technical',
    subtitle: 'The "Ball Master"',
    tagline: 'Master the Ball, Own the Game.',
  },
  {
    id: 'tactical',
    title: 'Tactical',
    subtitle: 'The "Soccer IQ"',
    tagline: 'Play Smarter, Move Faster.',
  },
  {
    id: 'physical',
    title: 'Physical',
    subtitle: 'The "Athlete"',
    tagline: 'Explosive Power, Elite Agility.',
  },
  {
    id: 'psychological',
    title: 'Psychological',
    subtitle: 'The "Competitor"',
    tagline: 'Strong Mind, Winning Spirit.',
  },
] as const

const coaches = [
  {
    name: 'Coach Rami Hammadi',
    title: 'Head Coach',
    bio: "A former professional player with Fiorentina (Italy), Rami Hammadi bridges European tactical rigor with San Francisco's youth talent. After successful tenures at the collegiate and high school levels, Rami pivoted to youth development to have a more profound impact on the player lifecycle. Having coached every tier from Bronze to MLS Next, he specializes in refining competitive players through a high-performance environment designed to build the technical precision and grit required for the next level.",
  },
]

function HeroChevrons() {
  const size = 'w-10 h-10 sm:w-[3.25rem] sm:h-[3.25rem]'
  const strokeWidth = '3'

  const chev = (opacity: string) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${size} drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]`}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={opacity}
      />
    </svg>
  )

  return (
    <div className="flex flex-col items-center justify-end -space-y-2 sm:-space-y-2.5">
      {chev('opacity-30')}
      {chev('opacity-55')}
      {chev('opacity-100')}
    </div>
  )
}

export default async function HomePage() {
  const spotUsage = await getWeekSpotUsage()

  return (
    <>
      <Navbar />

      {/* Hero: flex column so scroll chevrons sit above orange section without overlapping CTAs */}
      <section className="relative min-h-screen flex flex-col bg-gradient-to-br from-[#041f36] via-[#062744] to-[#041f36] overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #f05a28 0, #f05a28 1px, transparent 0, transparent 50%)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-[1] flex-1 flex flex-col justify-center min-h-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center w-full">
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
            <span className="inline-block bg-[#f05a28]/15 text-[#ffd7c8] border border-[#f05a28]/40 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase max-w-[95vw]">
              San Francisco Youth Soccer Training
            </span>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
              Reach Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f05a28] to-[#ff8c61]">
                Next Level
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed px-1">
              Next Level Soccer Development Camps at Beach Chalet for competitive middle school club players. Monday
              through Friday, 3:30-7:30 PM.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pb-2 sm:pb-4">
              <Link
                href="/register"
                className="bg-[#f05a28] hover:bg-[#d94e21] text-white font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-base sm:text-lg transition-all shadow-lg shadow-[#3a1a0f]/40 hover:-translate-y-0.5 text-center leading-snug max-w-[min(100%,22rem)] sm:max-w-none mx-auto sm:mx-0"
              >
                Register for Summer Camps 2026
              </Link>
              <a
                href="#sessions"
                className="border border-slate-400 text-slate-200 hover:bg-white/10 font-semibold px-8 py-4 rounded-full text-lg transition-all mx-auto sm:mx-0 w-full max-w-[min(100%,22rem)] sm:w-auto text-center sm:max-w-none"
              >
                View Schedule
              </a>
            </div>
          </div>
        </div>

        <div className="relative z-[1] shrink-0 flex justify-center px-4 pb-2 sm:pb-3 pt-1">
          <a
            href="#player-development"
            className="text-white hero-arrow-pulse rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#041f36]"
            aria-label="Scroll to player development and report cards"
          >
            <HeroChevrons />
          </a>
        </div>
      </section>

      {/* Player development — pillar headlines; full rubric on /report-card-skills */}
      <section id="player-development" className="bg-[#f05a28] py-8 sm:py-10 lg:py-12 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-white font-bold text-base sm:text-lg lg:text-xl max-w-3xl mx-auto mb-2 leading-relaxed px-1">
            Every week of camp comes with a report card to track the performance improvements vital to the development
            of the individual player. These can be viewed on the website to track long-term progress.
          </p>
          <p className="text-center text-sm text-white/90 max-w-2xl mx-auto mb-8 sm:mb-10">
            <Link href="/report-card-skills" className="font-semibold underline decoration-white/50 underline-offset-2 hover:decoration-white">
              Full report card guide
            </Link>{' '}
            — rating scale and the twelve skills we assess.
          </p>
          <ul className="grid sm:grid-cols-2 gap-4 sm:gap-5 max-w-5xl mx-auto list-none p-0 m-0">
            {homeDevelopmentPillars.map((pillar) => (
              <li key={pillar.id}>
                <div
                  className={`rounded-2xl border border-[#e8d8ce] shadow-sm overflow-hidden border-l-4 h-full flex flex-col ${REPORT_CARD_CATEGORY_ACCENT[pillar.id] ?? 'border-l-[#062744]'}`}
                >
                  <div className="bg-white/90 px-4 sm:px-5 py-4 sm:py-5 border-b border-[#f0e2d9] text-left">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#062744] leading-snug">
                      <span className="text-[#062744]">{pillar.title}:</span>{' '}
                      <span className="text-[#f05a28]">{pillar.subtitle}</span>
                    </h3>
                  </div>
                  <p className="px-4 sm:px-5 py-4 sm:py-5 text-base sm:text-lg font-semibold text-[#062744] bg-white leading-snug m-0 flex-1 ms-4 sm:ms-6 pl-3 sm:pl-4 border-l-2 border-[#f05a28]/40 italic pillar-tagline-pulse">
                    {pillar.tagline}
                  </p>
                </div>
              </li>
            ))}
          </ul>
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
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 list-none p-0 m-0">
                {aboutCampPillars.map((pillar) => (
                  <li key={pillar.title} className="flex items-start gap-3">
                    <span className="text-[#f05a28] text-xl mt-0.5 shrink-0" aria-hidden>
                      ✓
                    </span>
                    <p className="text-sm sm:text-base leading-relaxed m-0 font-bold">
                      <span className="text-[#f05a28]">{pillar.title}:</span>{' '}
                      <span className="text-[#062744] font-semibold">({pillar.detail})</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-[#fff7f2] to-[#fde6da] rounded-3xl p-10 text-center shadow-inner border border-[#f6d6c8]">
                <div className="text-8xl mb-4">⚽</div>
                <div className="text-2xl font-bold text-slate-800 mb-2">Summer 2026</div>
                <div className="text-slate-600 mb-6">Beach Chalet · Mon-Fri · 3:30-7:30 PM</div>
                <Link
                  href="/register"
                  className="inline-block bg-[#f05a28] text-white font-bold px-6 py-3 rounded-full hover:bg-[#d94e21] transition-colors shadow-md"
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
            <p className="text-slate-600 text-sm mt-2">
              Each week is capped at <strong className="text-[#062744]">{WEEK_PLAYER_CAPACITY} players</strong>. Counts include
              pending and paid registrations.
            </p>
            <p className="text-[#c24a22] text-sm mt-2 font-medium">
              Each week requires a minimum of {MIN_WEEK_PLAYERS} registered players to run. If a week does not reach{' '}
              {MIN_WEEK_PLAYERS}, that week may be canceled.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((s) => {
              const usage = spotUsage?.[s.weekKey]
              const remaining = usage?.remaining ?? WEEK_PLAYER_CAPACITY
              const soldOut = remaining <= 0
              return (
              <div
                key={s.weekKey}
                className="border border-[#e8d8ce] rounded-2xl p-6 text-center hover:border-[#f05a28] hover:shadow-md transition-all group bg-white"
              >
                <div className="text-[#f05a28] font-bold text-sm uppercase tracking-wide mb-2">{s.name}</div>
                <div className="text-slate-800 font-semibold mb-4">{s.dates}</div>
                <div className="text-3xl font-extrabold text-slate-900 mb-1">{s.price}</div>
                <div className="text-slate-400 text-xs mb-4">per player</div>
                <div
                  className={`text-sm font-bold mb-1 ${soldOut ? 'text-[#c24a22]' : 'text-[#062744]'}`}
                >
                  {soldOut
                    ? 'Sold out'
                    : `${remaining} spot${remaining === 1 ? '' : 's'} remaining`}
                </div>
                <div className="text-slate-500 text-xs mb-4">of {WEEK_PLAYER_CAPACITY} per week</div>
                <div className="text-[#c24a22] text-xs font-semibold mb-4">
                  Minimum {MIN_WEEK_PLAYERS} players required for week to run
                </div>
                {soldOut ? (
                  <a
                    href="mailto:nextlevelsoccersf@gmail.com?subject=Waitlist%20%E2%80%94%20Summer%20camp%20week"
                    className="block w-full bg-[#062744] text-white font-semibold py-2.5 rounded-full hover:bg-[#041f36] transition-colors text-sm text-center"
                  >
                    Email to join waitlist
                  </a>
                ) : (
                  <Link
                    href="/register"
                    className="block w-full bg-[#062744] text-white font-semibold py-2.5 rounded-full hover:bg-[#041f36] transition-colors text-sm"
                  >
                    Register
                  </Link>
                )}
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Coaches */}
      <section id="coaches" className="py-24 bg-[#fffaf5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-[#f05a28] font-semibold text-sm uppercase tracking-widest">Our Coaches</span>
            <h2 className="text-4xl font-extrabold text-slate-900 mt-2">Led by Coach Rami Hammadi</h2>
          </div>

          {coaches.map((c) => (
            <div
              key={c.name}
              className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-[#f0e2d9] max-w-5xl mx-auto"
            >
              <div className="grid md:grid-cols-12 gap-8 lg:gap-10 items-start">
                <div className="md:col-span-5 lg:col-span-4">
                  <div className="relative w-full max-w-sm mx-auto md:mx-0 aspect-[3/4] max-h-[min(520px,70vh)] rounded-2xl overflow-hidden border border-[#e8d8ce] shadow-md bg-slate-100">
                    <Image
                      src="/coach-rami.png"
                      alt="Coach Rami Hammadi on the field"
                      fill
                      className="object-cover object-[center_18%]"
                      sizes="(max-width: 768px) 100vw, 320px"
                      priority
                    />
                  </div>
                </div>
                <div className="md:col-span-7 lg:col-span-8 text-left">
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">{c.name}</h3>
                  <p className="text-[#f05a28] font-semibold mb-4">{c.title}</p>
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{c.bio}</p>
                </div>
              </div>
            </div>
          ))}
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
