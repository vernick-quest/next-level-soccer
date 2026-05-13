'use client'

import { Fragment, useMemo } from 'react'
import { REPORT_METRIC_GROUPS } from '@/lib/player-report-metrics'
import { REPORT_CARD_CATEGORY_ACCENT } from '@/lib/report-card-ui'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { weekColumnShortLabel } from '@/lib/camp-display'
import type { ReportGridWeekSnapshot } from '@/lib/player-reports-merge'

function normalizeEnrolledWeekKeys(
  enrolledWeekKeys?: ReadonlySet<string> | readonly string[] | null,
): ReadonlySet<string> | null {
  if (enrolledWeekKeys == null) return null
  if (Array.isArray(enrolledWeekKeys)) return new Set(enrolledWeekKeys.filter(Boolean))
  return new Set(enrolledWeekKeys)
}

function isCampWeekEnrolled(
  weekKey: string,
  enrolled: ReadonlySet<string> | null,
): boolean {
  if (weekKey === '__legacy__') return true
  if (enrolled == null) return true
  return enrolled.has(weekKey)
}

export default function ReportSkillsGrid({
  reportsByWeekKey,
  enrolledWeekKeys: enrolledWeekKeysProp,
}: {
  reportsByWeekKey: Record<string, ReportGridWeekSnapshot>
  /** Camp weeks this player has a `registrations` row for; when omitted, all week columns are treated as enrolled. */
  enrolledWeekKeys?: ReadonlySet<string> | readonly string[] | null
}) {
  const enrolledWeekKeys = useMemo(() => normalizeEnrolledWeekKeys(enrolledWeekKeysProp), [enrolledWeekKeysProp])
  const hasLegacy = reportsByWeekKey['__legacy__'] != null
  const columns = [...CAMP_SESSIONS, ...(hasLegacy ? (['__legacy__'] as const) : [])]

  const thBase =
    'border-b border-[#e8d8ce] px-1.5 py-2.5 text-center font-semibold text-[11px] leading-tight min-w-[3.25rem]'
  const thEnrolled = 'bg-[#f7f2e8] text-[#062744]'
  const thNotEnrolled = 'bg-gray-50 text-slate-400 pointer-events-none'

  const tdEnrolledEmpty = 'bg-white border-b border-[#f0e2d9] px-1 py-2 text-center text-xs tabular-nums text-[#213c57]'
  const tdEnrolledHover = 'hover:bg-[#fffaf5]/80'
  const tdNotEnrolled =
    'bg-gray-50 border-b border-[#e8e8e8] px-1 py-2 text-center text-xs tabular-nums text-slate-300 pointer-events-none'

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-[#e8d8ce] bg-white shadow-sm">
        <table className="min-w-[720px] w-full text-sm border-collapse">
          <thead>
            <tr className="text-[#062744]">
              <th className="sticky left-0 z-10 bg-[#f7f2e8] border-b border-r border-[#e8d8ce] px-3 py-2.5 text-left font-bold text-xs uppercase tracking-wide w-[min(14rem,40vw)]">
                Skill
              </th>
              {columns.map((col) => {
                const enrolled = isCampWeekEnrolled(col, enrolledWeekKeys)
                return (
                  <th
                    key={col}
                    scope="col"
                    className={`${thBase} ${enrolled ? thEnrolled : thNotEnrolled}`}
                    title={
                      enrolled
                        ? undefined
                        : 'This player was not enrolled in camp for this week — no report is expected.'
                    }
                  >
                    {col === '__legacy__' ? 'Other' : weekColumnShortLabel(col)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {REPORT_METRIC_GROUPS.map((group) => (
              <Fragment key={group.category}>
                <tr className="bg-[#f0e2d9]/80">
                  <td
                    colSpan={columns.length + 1}
                    className={`sticky left-0 z-[1] px-3 py-2 border-b border-[#e8d8ce] border-l-4 ${
                      REPORT_CARD_CATEGORY_ACCENT[group.category] ?? 'bg-[#f0e2d9]/95'
                    }`}
                  >
                    <span className="text-sm font-bold text-[#062744]">{group.title}</span>
                    <span className="text-[#f05a28] font-bold"> ({group.subtitle})</span>
                  </td>
                </tr>
                {group.metrics.map((m) => (
                  <tr key={m.key}>
                    <td className="sticky left-0 z-[1] bg-white border-b border-r border-[#f0e2d9] px-3 py-2 text-slate-700 text-xs leading-snug hover:bg-[#fffaf5]/80">
                      <span className="font-bold text-[#062744]">{m.label}</span>
                      <span className="text-[#f05a28] font-bold" aria-hidden>
                        {' '}
                        *
                      </span>
                      <div className="text-slate-600 font-normal mt-0.5">{m.description}</div>
                    </td>
                    {columns.map((col) => {
                      const enrolled = isCampWeekEnrolled(col, enrolledWeekKeys)
                      const snap = col === '__legacy__' ? reportsByWeekKey['__legacy__'] : reportsByWeekKey[col]
                      const v = snap?.scores[m.key]
                      const showScore = v != null
                      return (
                        <td
                          key={`${col}-${m.key}`}
                          className={
                            enrolled
                              ? `${tdEnrolledEmpty} ${tdEnrolledHover}`
                              : `${tdNotEnrolled}`
                          }
                          title={
                            enrolled
                              ? undefined
                              : 'Not enrolled for this camp week — no report expected.'
                          }
                        >
                          {showScore ? (
                            v
                          ) : enrolled ? (
                            '—'
                          ) : (
                            <abbr
                              title="Not enrolled for this camp week — no report expected."
                              className="cursor-default text-slate-300 font-normal no-underline"
                            >
                              N/A
                            </abbr>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {enrolledWeekKeys != null ? (
        <p className="text-xs text-slate-600 max-w-2xl" role="note">
          <span className="font-semibold text-[#062744]">Note: </span>
          Grey columns are weeks this player was{' '}
          <span className="font-semibold">not enrolled</span> in camp (no report is expected). White columns with a dash
          mean the player was enrolled and a coach report may still be pending.
        </p>
      ) : null}
    </div>
  )
}
