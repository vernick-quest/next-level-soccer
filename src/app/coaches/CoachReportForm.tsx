'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  REPORT_METRIC_GROUPS,
  ALL_REPORT_METRIC_KEYS,
  type ReportMetricKey,
} from '@/lib/player-report-metrics'
import { savePlayerReport, type CoachPlayerRow } from './actions'

function defaultScores(): Record<ReportMetricKey, number> {
  return Object.fromEntries(ALL_REPORT_METRIC_KEYS.map((k) => [k, 3])) as Record<ReportMetricKey, number>
}

function formatPlayerLabel(p: CoachPlayerRow) {
  const name = `${p.player_first_name} ${p.player_last_name}`.trim()
  const parent = p.registration_submissions
  const parentBit = parent ? ` — ${parent.parent_first_name} ${parent.parent_last_name}` : ''
  return `${name}${parentBit}`
}

export default function CoachReportForm({ players }: { players: CoachPlayerRow[] }) {
  const [childId, setChildId] = useState('')
  const [scores, setScores] = useState(defaultScores)
  const [coachComments, setCoachComments] = useState('')
  const [dateLocal, setDateLocal] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedPlayer = useMemo(() => players.find((p) => p.id === childId), [players, childId])

  function setScore(key: ReportMetricKey, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }))
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/coaches'
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!childId) {
      setMessage({ type: 'err', text: 'Choose a player.' })
      return
    }
    const iso = new Date(dateLocal).toISOString()
    startTransition(async () => {
      const result = await savePlayerReport({
        registrationChildId: childId,
        scores,
        coachComments,
        dateGenerated: iso,
      })
      if (result.success) {
        setMessage({ type: 'ok', text: 'Report saved.' })
        setScores(defaultScores())
        setCoachComments('')
      } else {
        setMessage({ type: 'err', text: result.error })
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#062744]">Coach&apos;s View</h1>
            <p className="text-slate-600 text-sm mt-1">Select a player, score 1–5 on each metric, add comments, then save.</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="text-sm font-semibold text-[#f05a28] hover:text-[#d94e21] py-2">
              Home
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-sm font-semibold text-slate-600 hover:text-[#062744] py-2"
            >
              Sign out
            </button>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-slate-600 text-center">
            No registered players found yet. Submissions will appear here after families register.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white border border-[#e8d8ce] rounded-2xl p-6 shadow-sm space-y-4">
              <label className="block">
                <span className="block text-sm font-semibold text-[#213c57] mb-2">Player</span>
                <select
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 bg-white focus:ring-2 focus:ring-[#f05a28] focus:border-transparent"
                  required
                >
                  <option value="">Select a player…</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatPlayerLabel(p)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPlayer && (
                <p className="text-xs text-slate-500">
                  Grade (fall): {selectedPlayer.grade_fall}
                  {selectedPlayer.registration_submissions?.parent_email
                    ? ` · Parent email: ${selectedPlayer.registration_submissions.parent_email}`
                    : null}
                </p>
              )}

              <label className="block">
                <span className="block text-sm font-semibold text-[#213c57] mb-2">Report date &amp; time</span>
                <input
                  type="datetime-local"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                  className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent"
                  required
                />
              </label>
            </div>

            {REPORT_METRIC_GROUPS.map((group) => (
              <div key={group.category} className="bg-white border border-[#e8d8ce] rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#062744] mb-4 border-b border-[#f0e2d9] pb-2">{group.title}</h2>
                <div className="space-y-4">
                  {group.metrics.map((m) => (
                    <div key={m.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-sm text-slate-700 sm:max-w-[55%]">{m.label}</span>
                      <select
                        value={scores[m.key]}
                        onChange={(e) => setScore(m.key, Number(e.target.value))}
                        className="w-full sm:w-32 border border-[#e8d8ce] rounded-xl px-3 py-2 text-slate-800 bg-white focus:ring-2 focus:ring-[#f05a28]"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-white border border-[#e8d8ce] rounded-2xl p-6 shadow-sm">
              <label className="block">
                <span className="block text-sm font-semibold text-[#213c57] mb-2">Coach comments</span>
                <textarea
                  value={coachComments}
                  onChange={(e) => setCoachComments(e.target.value)}
                  rows={5}
                  placeholder="Strengths, areas to grow, next steps…"
                  className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent resize-none text-sm"
                />
              </label>
            </div>

            {message && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  message.type === 'ok'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !childId}
              className="w-full bg-[#062744] hover:bg-[#041f36] disabled:bg-[#4b6782] text-white font-bold py-4 rounded-full transition-colors disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : 'Save report'}
            </button>

            <p className="text-center text-xs text-slate-500">
              Scale: 1 = needs development · 3 = on track · 5 = standout
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
