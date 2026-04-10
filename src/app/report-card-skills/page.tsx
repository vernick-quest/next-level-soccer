import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import {
  REPORT_CARD_DOC_URL,
  REPORT_CARD_RATING_SCALE_DOC,
  REPORT_CARD_SKILL_PILLARS_DOC,
} from '@/lib/report-card-doc-reference'

export const metadata = {
  title: 'Weekly report card skills | Next Level Soccer SF',
  description:
    'Competitive soccer rating scale (1–5) and skills assessed: Technical, Tactical, Physical, and Psychological.',
}

const CATEGORY_ACCENT: Record<string, string> = {
  technical: 'border-l-[#1d4ed8] bg-[#eff6ff]',
  tactical: 'border-l-[#0d9488] bg-[#f0fdfa]',
  physical: 'border-l-[#f05a28] bg-[#fff7ed]',
  psychological: 'border-l-[#7c3aed] bg-[#f5f3ff]',
}

export default function ReportCardSkillsPage() {
  return (
    <>
      <Navbar />

      <main className="bg-[#f7f2e8] min-h-screen pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <p className="text-sm text-slate-500 mb-2">
            <Link href="/" className="text-[#f05a28] font-semibold hover:underline">
              ← Home
            </Link>
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#062744] mb-3">Next Level Soccer report card</h1>
          <p className="text-slate-600 max-w-2xl mb-2">
            This page mirrors our published{' '}
            <a
              href={REPORT_CARD_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f05a28] font-semibold hover:underline"
            >
              report card reference (Google Doc)
            </a>
            : the competitive rating scale and the skills we assess each week.
          </p>
          <p className="text-sm text-slate-500 max-w-2xl mb-8">
            Coaches also record scores in our camp system using detailed metrics that align with these four pillars.
          </p>

          <section className="mb-10" aria-labelledby="rating-scale">
            <h2 id="rating-scale" className="text-lg font-bold text-[#062744] mb-1">
              Competitive Soccer Rating Scale (1 to 5)
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Each skill is scored from 1 (emerging) to 5 (elite). Colors below are a quick visual key for parents.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {REPORT_CARD_RATING_SCALE_DOC.map((r) => (
                <div
                  key={r.value}
                  className={`rounded-xl px-2 sm:px-3 py-3 text-center ${r.swatchClassName}`}
                >
                  <div className="text-2xl font-extrabold tabular-nums">{r.value}</div>
                  <div className="text-[10px] sm:text-xs font-bold leading-tight mt-1">{r.label}</div>
                  <div className="text-[9px] sm:text-[10px] font-semibold opacity-90 mt-0.5 leading-snug">
                    {r.definition}
                  </div>
                </div>
              ))}
            </div>
            <ul className="mt-6 space-y-4 text-sm text-slate-700">
              {REPORT_CARD_RATING_SCALE_DOC.map((r) => (
                <li key={r.value} className="border-b border-[#e8d8ce] pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <span className="font-extrabold text-[#062744] tabular-nums text-lg">{r.value}</span>
                    <span className="font-bold text-slate-900">
                      {r.label}
                      <span className="font-normal text-slate-500"> — {r.definition}</span>
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-0 sm:pl-8">{r.meaning}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-6" aria-labelledby="skills-assessed">
            <h2 id="skills-assessed" className="text-lg font-bold text-[#062744]">
              Skills assessed (1 to 5)
            </h2>
            <p className="text-sm text-slate-600 -mt-4">
              Twelve skills across four areas — each scored using the scale above.
            </p>

            {REPORT_CARD_SKILL_PILLARS_DOC.map((pillar) => (
              <div
                key={pillar.id}
                className={`rounded-2xl border border-[#e8d8ce] shadow-sm overflow-hidden border-l-4 ${CATEGORY_ACCENT[pillar.id] ?? 'border-l-[#062744]'}`}
              >
                <div className="bg-white/90 px-5 py-4 border-b border-[#f0e2d9]">
                  <h3 className="text-xl font-bold text-[#062744]">
                    {pillar.title}{' '}
                    <span className="text-[#f05a28] font-bold">({pillar.subtitle})</span>
                  </h3>
                </div>
                <ul className="px-5 py-4 space-y-4 text-slate-800 bg-white list-none m-0">
                  {pillar.skills.map((s) => (
                    <li key={s.name} className="flex gap-3">
                      <span className="text-[#f05a28] font-bold mt-0.5 shrink-0" aria-hidden>
                        *
                      </span>
                      <div>
                        <span className="font-bold text-[#062744]">{s.name}:</span>{' '}
                        <span className="text-slate-700">{s.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <p className="mt-10 text-sm text-slate-500">
            Questions? Email{' '}
            <a href="mailto:nextlevelsoccersf@gmail.com" className="text-[#f05a28] font-semibold hover:underline">
              nextlevelsoccersf@gmail.com
            </a>
            .
          </p>
        </div>
      </main>

      <Footer />
    </>
  )
}
