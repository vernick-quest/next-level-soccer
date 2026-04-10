import { campNameFromWeekLabel } from '@/lib/camp-display'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'

export const WEEK_PLAYER_CAPACITY = 25

const KNOWN_WEEKS = new Set<string>(CAMP_SESSIONS)

export type WeekSpotUsage = Record<string, { used: number; remaining: number }>

/** Map a DB week string to the canonical `CAMP_SESSIONS` label (e.g. `Week of Jun 8 ($350)`). */
export function canonicalCampWeekKey(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t) return null
  if (KNOWN_WEEKS.has(t)) return t
  const noPrice = t.replace(/\s*\(\$[\d,]+\)\s*$/, '').trim()
  for (const w of CAMP_SESSIONS) {
    if (w === t) return w
    const short = campNameFromWeekLabel(w)
    if (short === noPrice || short === t) return w
  }
  return null
}

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

type RegistrationSpotRow = {
  camp_session: string | null
  camp_weeks?: string[] | null
  status: string | null
  refund_requested_weeks: string[] | null
  organizer_cancelled_at?: string | null
}

/**
 * Counts spots from `public.registrations`: each pending/confirmed row consumes one slot per week
 * (`camp_weeks` when non-empty, otherwise `camp_session`). Rows with that week in `refund_requested_weeks` are excluded.
 */
export async function getWeekSpotUsage(): Promise<WeekSpotUsage | null> {
  let service
  try {
    service = createServiceRoleClient()
  } catch {
    return null
  }

  const used: Record<string, number> = {}
  for (const w of CAMP_SESSIONS) used[w] = 0

  let data: RegistrationSpotRow[] | null = null
  let res = await service
    .from('registrations')
    .select('camp_session, camp_weeks, status, refund_requested_weeks, organizer_cancelled_at')

  if (res.error) {
    const retry = await service.from('registrations').select('camp_session, status, refund_requested_weeks')
    if (retry.error) {
      console.error('getWeekSpotUsage:', retry.error)
      return null
    }
    data = retry.data as RegistrationSpotRow[]
  } else {
    data = res.data as RegistrationSpotRow[]
  }

  for (const row of data ?? []) {
    const st = (row.status ?? 'pending').toLowerCase()
    if (st !== 'pending' && st !== 'confirmed') continue
    if (row.organizer_cancelled_at) continue

    const refundSet = new Set(row.refund_requested_weeks ?? [])
    const multi = row.camp_weeks
    const weekSlots: string[] =
      Array.isArray(multi) && multi.length > 0 ? multi : row.camp_session ? [row.camp_session] : []

    for (const raw of weekSlots) {
      const key = canonicalCampWeekKey(raw)
      if (!key || !(key in used)) continue
      if (refundSet.has(raw) || refundSet.has(key)) continue
      used[key]++
    }
  }

  const out: WeekSpotUsage = {}
  for (const w of CAMP_SESSIONS) {
    const u = used[w] ?? 0
    out[w] = { used: u, remaining: Math.max(0, WEEK_PLAYER_CAPACITY - u) }
  }
  return out
}
