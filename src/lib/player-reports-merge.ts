import { ALL_REPORT_METRIC_KEYS, type ReportMetricKey } from '@/lib/player-report-metrics'

/** One row from `public.player_reports` (metrics + metadata). */
export type PlayerReportRowForMerge = {
  id: string
  registration_child_id: string
  camp_session: string | null
  coach_comments: string | null
  date_generated: string
} & Record<ReportMetricKey, number | null>

export type ReportGridWeekSnapshot = {
  id: string
  scores: Partial<Record<ReportMetricKey, number>>
  coachComments: string | null
  dateGenerated: string
}

function reportRowToSnapshot(row: PlayerReportRowForMerge): ReportGridWeekSnapshot {
  const scores: Partial<Record<ReportMetricKey, number>> = {}
  for (const k of ALL_REPORT_METRIC_KEYS) {
    const v = row[k]
    if (typeof v === 'number' && v >= 1 && v <= 5) scores[k] = v
  }
  return {
    id: row.id,
    scores,
    coachComments: row.coach_comments,
    dateGenerated: row.date_generated,
  }
}

/** Latest report per `camp_session` (or `__legacy__` when session is missing). */
export function mergePlayerReportsByCampSession(
  rows: PlayerReportRowForMerge[],
): Record<string, ReportGridWeekSnapshot> {
  const best = new Map<string, PlayerReportRowForMerge>()
  for (const r of rows) {
    const key = r.camp_session?.trim() || '__legacy__'
    const prev = best.get(key)
    if (!prev || new Date(r.date_generated) >= new Date(prev.date_generated)) {
      best.set(key, r)
    }
  }
  const out: Record<string, ReportGridWeekSnapshot> = {}
  for (const [k, r] of best) {
    out[k] = reportRowToSnapshot(r)
  }
  return out
}
