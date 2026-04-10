import { CAMP_SESSIONS } from '@/lib/camp-weeks'

/** Mon–Fri camp week date ranges (Summer 2026, Pacific). */
const WEEK_DATE_RANGE: Record<string, string> = {
  'Week of Jun 8 ($350)': 'Mon–Fri · June 8–12, 2026',
  'Week of Jun 15 ($350)': 'Mon–Fri · June 15–19, 2026',
  'Week of Jun 22 ($350)': 'Mon–Fri · June 22–26, 2026',
  'Week of Jun 29 ($350)': 'Mon–Fri · June 29 – July 3, 2026',
  'Week of Jul 6 ($350)': 'Mon–Fri · July 6–10, 2026',
  'Week of Jul 13 ($350)': 'Mon–Fri · July 13–17, 2026',
  'Week of Jul 20 ($350)': 'Mon–Fri · July 20–24, 2026',
  'Week of Jul 27 ($350)': 'Mon–Fri · July 27–31, 2026',
  'Week of Aug 3 ($350)': 'Mon–Fri · Aug 3–7, 2026',
  'Week of Aug 10 ($350)': 'Mon–Fri · Aug 10–14, 2026',
}

/** Short camp title for dashboard (strip price suffix when present). */
export function campNameFromWeekLabel(week: string): string {
  const known = CAMP_SESSIONS.find((w) => w === week)
  if (known) {
    return week.replace(/\s*\(\$[\d,]+\)\s*$/, '').trim()
  }
  return week.replace(/\s*\(\$[\d,]+\)\s*$/, '').trim() || week
}

export function campDatesFromWeekLabel(week: string): string {
  return WEEK_DATE_RANGE[week] ?? 'Mon–Fri · 3:30–7:30 PM · Beach Chalet'
}

/** Compact label for grid column headers (e.g. "Jun 8"). */
export function weekColumnShortLabel(week: string): string {
  const n = campNameFromWeekLabel(week).replace(/^Week of\s+/i, '').trim()
  return n || week
}
