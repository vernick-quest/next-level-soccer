'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { campNameFromWeekLabel } from '@/lib/camp-display'
import { staffAdjustChildCampWeeks } from './coach-registration-actions'

const KNOWN_WEEKS = new Set<string>(CAMP_SESSIONS)

export type WeekRow = { registration_id: string; camp_session: string; status: string }

const btnBlue =
  'text-sm font-bold bg-[#062744] text-white px-5 py-2.5 rounded-full hover:bg-[#041f36] disabled:opacity-50'
const btnOrange =
  'text-sm font-bold bg-[#f05a28] text-white px-5 py-2.5 rounded-full hover:bg-[#d94f22] disabled:opacity-50'

export default function CoachPlayerCampWeeksPanel({ childId, rows }: { childId: string; rows: WeekRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [addPick, setAddPick] = useState<string>('')
  const [removeIds, setRemoveIds] = useState<string[]>([])
  const [moveToById, setMoveToById] = useState<Record<string, string>>({})

  useEffect(() => {
    setAddPick('')
    setRemoveIds([])
    setMoveToById({})
    setMessage(null)
    setError(null)
  }, [rows])

  const currentSessions = useMemo(() => new Set(rows.map((r) => r.camp_session)), [rows])

  const addableWeeks = useMemo(
    () => CAMP_SESSIONS.filter((w) => !currentSessions.has(w)),
    [currentSessions],
  )

  const dirty = useMemo(() => {
    if (addPick.trim()) return true
    if (removeIds.length > 0) return true
    for (const r of rows) {
      const pick = (moveToById[r.registration_id] ?? '').trim()
      if (pick && pick !== r.camp_session) return true
    }
    return false
  }, [addPick, removeIds, moveToById, rows])

  function toggleRemove(id: string) {
    setRemoveIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submitBatch() {
    setError(null)
    setMessage(null)
    const addWeeks = addPick && !currentSessions.has(addPick) ? [addPick] : []
    const moves = Object.entries(moveToById)
      .map(([registrationId, toWeek]) => {
        const row = rows.find((x) => x.registration_id === registrationId)
        const t = toWeek.trim()
        if (!row || !t || t === row.camp_session) return null
        if (!KNOWN_WEEKS.has(t)) return null
        return { registrationId, toWeek: t }
      })
      .filter((m): m is { registrationId: string; toWeek: string } => m != null)

    if (addWeeks.length === 0 && removeIds.length === 0 && moves.length === 0) {
      setError('Select weeks to add, rows to remove, or a move target.')
      return
    }

    startTransition(async () => {
      const r = await staffAdjustChildCampWeeks({
        childId,
        addWeeks: addWeeks.length ? addWeeks : undefined,
        removeRegistrationIds: removeIds.length ? removeIds : undefined,
        moves: moves.length ? moves : undefined,
      })
      if (!r.success) {
        setError(r.error)
        return
      }
      setMessage('Saved. Parent was emailed if Resend is configured.')
      setAddPick('')
      setRemoveIds([])
      setMoveToById({})
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-[#e8d8ce] bg-white p-6 sm:p-8 shadow-sm">
      <h3 className="text-lg font-extrabold text-[#062744] border-b border-[#f0e2d9] pb-2 mb-2">Camp week management</h3>
      <p className="text-sm text-slate-600 mb-4">
        Staff override: updates <code className="text-xs bg-slate-100 px-1 rounded">registrations</code>, syncs{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">registration_children.camp_weeks</code>, and recomputes{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">registration_submissions.total_amount_cents</code>. Only{' '}
        <strong>pending</strong> rows can be removed; moves apply to pending rows only.
      </p>

      {error ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div> : null}
      {message ? <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</div> : null}

      <div className="overflow-x-auto border border-[#f0e2d9] rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#fffaf5] text-left text-xs font-bold uppercase text-slate-500">
              <th className="px-3 py-2">Week</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Remove</th>
              <th className="px-3 py-2">Move to</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-slate-500 italic">
                  No registration week rows on file for this player.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const pending = (r.status ?? '').toLowerCase() === 'pending'
                return (
                  <tr key={r.registration_id} className="border-t border-[#f0e2d9]">
                    <td className="px-3 py-2 font-semibold text-[#062744]">{campNameFromWeekLabel(r.camp_session)}</td>
                    <td className="px-3 py-2 text-slate-700">{r.status}</td>
                    <td className="px-3 py-2">
                      {pending ? (
                        <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={removeIds.includes(r.registration_id)} onChange={() => toggleRemove(r.registration_id)} />
                          Remove
                        </label>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {pending ? (
                        <select
                          className="border border-[#e8d8ce] rounded-lg px-2 py-1 text-xs max-w-[12rem]"
                          value={moveToById[r.registration_id] ?? ''}
                          onChange={(e) =>
                            setMoveToById((prev) => ({
                              ...prev,
                              [r.registration_id]: e.target.value,
                            }))
                          }
                        >
                          <option value="">—</option>
                          {CAMP_SESSIONS.filter((w) => w !== r.camp_session).map((w) => (
                            <option key={w} value={w}>
                              {campNameFromWeekLabel(w)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-3 items-start sm:items-end">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Add week</label>
          <select
            className="border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white min-w-[12rem]"
            value={addPick}
            onChange={(e) => setAddPick(e.target.value)}
          >
            <option value="">Select week…</option>
            {addableWeeks.map((w) => (
              <option key={w} value={w}>
                {campNameFromWeekLabel(w)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => submitBatch()}
          className={dirty ? btnOrange : btnBlue}
        >
          {pending ? 'Saving…' : 'Apply changes & email parent'}
        </button>
      </div>
    </section>
  )
}
