/** Canonical camp week labels (order = schedule order). */
export const CAMP_SESSIONS = [
  'Week of Jun 8 ($350)',
  'Week of Jun 15 ($350)',
  'Week of Jun 22 ($350)',
  'Week of Jun 29 ($350)',
  'Week of Jul 6 ($350)',
  'Week of Jul 13 ($350)',
  'Week of Jul 20 ($350)',
  'Week of Jul 27 ($350)',
  'Week of Aug 3 ($350)',
  'Week of Aug 10 ($350)',
] as const

const ORDER = new Map<string, number>(CAMP_SESSIONS.map((w, i) => [w, i]))

/** Sort key for comparing two camp week strings (unknown weeks sort last). */
export function campWeekSortIndex(week: string): number {
  return ORDER.get(week) ?? 999
}
