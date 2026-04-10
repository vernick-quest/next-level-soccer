'use client'

import { Fragment } from 'react'
import { REPORT_METRIC_GROUPS } from '@/lib/player-report-metrics'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { weekColumnShortLabel } from '@/lib/camp-display'
import type { DashboardReportSnapshot } from './actions'

export default function ReportSkillsGrid({
  reportsByWeekKey,
}: {
  reportsByWeekKey: Record<string, DashboardReportSnapshot>
}) {
  const hasLegacy = reportsByWeekKey['__legacy__'] != null
  const columns = [...CAMP_SESSIONS, ...(hasLegacy ? (['__legacy__'] as const) : [])]

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e8d8ce] bg-white shadow-sm">
      <table className="min-w-[720px] w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#f7f2e8] text-[#062744]">
            <th className="sticky left-0 z-10 bg-[#f7f2e8] border-b border-r border-[#e8d8ce] px-3 py-2.5 text-left font-bold text-xs uppercase tracking-wide w-[min(14rem,40vw)]">
              Skill
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="border-b border-[#e8d8ce] px-1.5 py-2.5 text-center font-semibold text-[11px] leading-tight min-w-[3.25rem]"
              >
                {col === '__legacy__' ? 'Other' : weekColumnShortLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REPORT_METRIC_GROUPS.map((group) => (
            <Fragment key={group.category}>
              <tr className="bg-[#f0e2d9]/80">
                <td
                  colSpan={columns.length + 1}
                  className="sticky left-0 z-[1] bg-[#f0e2d9]/95 px-3 py-1.5 text-xs font-bold text-[#062744] border-b border-[#e8d8ce]"
                >
                  {group.title}
                </td>
              </tr>
              {group.metrics.map((m) => (
                <tr key={m.key} className="hover:bg-[#fffaf5]/80">
                  <td className="sticky left-0 z-[1] bg-white border-b border-r border-[#f0e2d9] px-3 py-2 text-slate-700 text-xs leading-snug">
                    {m.label}
                  </td>
                  {columns.map((col) => {
                    const snap = col === '__legacy__' ? reportsByWeekKey['__legacy__'] : reportsByWeekKey[col]
                    const v = snap?.scores[m.key]
                    return (
                      <td
                        key={`${col}-${m.key}`}
                        className="border-b border-[#f0e2d9] px-1 py-2 text-center text-xs tabular-nums text-[#213c57]"
                      >
                        {v != null ? v : '—'}
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
  )
}
