import { campNameFromWeekLabel } from '@/lib/camp-display'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'

export const WEEK_PLAYER_CAPACITY = 25

const KNOWN_WEEKS = new Set<string>(CAMP_SESSIONS)

export type WeekSpotUsage = Record<string, { used: number; remaining: number }>

/** Per-week slot count this submission would consume (one per child × week). */
export function aggregateRequestedCampWeekSlots(
  children: { campWeeks: string[] }[],
): { ok: true; counts: Record<string, number> } | { ok: false; error: string } {
  const counts: Record<string, number> = {}
  for (const c of children) {
    for (const w of c.campWeeks) {
      if (!KNOWN_WEEKS.has(w)) {
        return { ok: false, error: 'Invalid camp week selection.' }
      }
      counts[w] = (counts[w] ?? 0) + 1
    }
  }
  return { ok: true, counts }
}

/**
 * Ensures current DB usage + this submission does not exceed WEEK_PLAYER_CAPACITY per week.
 * Not transactional: rare simultaneous submits may slightly oversubscribe; product accepts that.
 */
export async function validateCampWeekCapacityForSubmission(
  children: { campWeeks: string[] }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const agg = aggregateRequestedCampWeekSlots(children)
  if (!agg.ok) return agg

  const usage = await getWeekSpotUsage()
  if (!usage) {
    return {
      ok: false,
      error:
        'We could not verify camp availability. Please try again in a moment or email nextlevelsoccersf@gmail.com.',
    }
  }

  const fullLabels: string[] = []
  for (const [week, need] of Object.entries(agg.counts)) {
    const u = usage[week]
    if (!u) continue
    if (u.used + need > WEEK_PLAYER_CAPACITY) {
      fullLabels.push(campNameFromWeekLabel(week))
    }
  }

  if (fullLabels.length > 0) {
    return {
      ok: false,
      error: `These camp weeks are full (${WEEK_PLAYER_CAPACITY} players each): ${fullLabels.join(', ')}. Choose other weeks or email us to join a waitlist.`,
    }
  }

  return { ok: true }
}

/** Counts each child × week for pending/confirmed submissions. Requires service role (homepage is public). */
export async function getWeekSpotUsage(): Promise<WeekSpotUsage | null> {
  let service
  try {
    service = createServiceRoleClient()
  } catch {
    return null
  }

  const used: Record<string, number> = {}
  for (const w of CAMP_SESSIONS) used[w] = 0

  const { data, error } = await service.from('registration_children').select(`
      camp_weeks,
      registration_submissions ( status )
    `)

  if (error) {
    console.error('getWeekSpotUsage:', error)
    return null
  }

  for (const row of data ?? []) {
    const sub = row.registration_submissions
    const status = Array.isArray(sub) ? sub[0]?.status : (sub as { status?: string } | null)?.status
    if (status !== 'pending' && status !== 'confirmed') continue
    const weeks = row.camp_weeks ?? []
    for (const w of weeks) {
      if (w in used) used[w]++
    }
  }

  const out: WeekSpotUsage = {}
  for (const w of CAMP_SESSIONS) {
    const u = used[w] ?? 0
    out[w] = { used: u, remaining: Math.max(0, WEEK_PLAYER_CAPACITY - u) }
  }
  return out
}
