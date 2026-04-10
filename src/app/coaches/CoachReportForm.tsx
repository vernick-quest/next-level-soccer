'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { campNameFromWeekLabel } from '@/lib/camp-display'
import { REPORT_CARD_RATING_SCALE_DOC } from '@/lib/report-card-doc-reference'
import {
  COACH_REPORT_METRIC_KEYS,
  REPORT_METRIC_GROUPS,
  type CoachReportMetricKey,
} from '@/lib/player-report-metrics'
import { REPORT_CARD_CATEGORY_ACCENT } from '@/lib/report-card-ui'
import { savePlayerReport, type CoachPlayerRow } from './actions'

function emptyScores(): Record<CoachReportMetricKey, '' | number> {
  return Object.fromEntries(COACH_REPORT_METRIC_KEYS.map((k) => [k, '' as const])) as Record<
    CoachReportMetricKey,
    '' | number
  >
}

function scoresFromRecord(r: Record<CoachReportMetricKey, '' | number>): Record<CoachReportMetricKey, number> | null {
  const out = {} as Record<CoachReportMetricKey, number>
  for (const k of COACH_REPORT_METRIC_KEYS) {
    const v = r[k]
    if (v === '' || typeof v !== 'number') return null
    out[k] = v
  }
  return out
}

function formatPlayerLabel(p: CoachPlayerRow) {
  const name = `${p.player_first_name} ${p.player_last_name}`.trim()
  const club = p.soccer_club?.trim() ? ` · ${p.soccer_club.trim()}` : ''
  const parent = p.registration_submissions
  const parentBit = parent ? ` — ${parent.parent_first_name} ${parent.parent_last_name}` : ''
  return `${name}${club}${parentBit}`
}

export default function CoachReportForm({
  players,
  initialChildId,
  pageTitle = "Coach's Portal",
  backHref = '/',
  signOutRedirect = '/coaches',
}: {
  players: CoachPlayerRow[]
  initialChildId?: string
  pageTitle?: string
  backHref?: string
  signOutRedirect?: string
}) {
  const [childId, setChildId] = useState(() =>
    initialChildId && players.some((p) => p.id === initialChildId) ? initialChildId : '',
  )
  const [scores, setScores] = useState(emptyScores)
  const [coachComments, setCoachComments] = useState('')
  const [campSession, setCampSession] = useState<string>(() => CAMP_SESSIONS[0] ?? '')
  const [dateLocal, setDateLocal] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  })
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (initialChildId && players.some((p) => p.id === initialChildId)) {
      setChildId(initialChildId)
    }
  }, [initialChildId, players])

  const selectedPlayer = useMemo(() => players.find((p) => p.id === childId), [players, childId])

  function setScore(key: CoachReportMetricKey, value: string) {
    setScores((prev) => {
      const next = { ...prev }
      if (value === '') next[key] = ''
      else next[key] = Number(value)
      return next
    })
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = signOutRedirect
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!childId) {
      setMessage({ type: 'err', text: 'Choose a player.' })
      return
    }
    const filled = scoresFromRecord(scores)
    if (!filled) {
      setMessage({ type: 'err', text: 'Each skill must be scored from 1 to 5 before submitting.' })
      return
    }
    if (!coachComments.trim()) {
      setMessage({ type: 'err', text: 'Please add a coach overview for the parent email.' })
      return
    }
    const iso = new Date(dateLocal).toISOString()
    startTransition(async () => {
      const result = await savePlayerReport({
        registrationChildId: childId,
        campSession,
        scores: filled,
        coachComments,
        dateGenerated: iso,
      })
      if (result.success) {
        setMessage({ type: 'ok', text: 'Report saved and parent emailed (when email is configured).' })
        setScores(emptyScores())
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
            <h1 className="text-3xl font-extrabold text-[#062744]">{pageTitle}</h1>
            <p className="text-slate-600 text-sm mt-1">
              Score each skill 1–5 (same rubric as the public report card), add an overview, then save. Skills start
              blank until you choose scores.
            </p>
          </div>
          <div className="flex gap-2">
            <a href={backHref} className="text-sm font-semibold text-[#f05a28] hover:text-[#d94e21] py-2">
              Back
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
                <div className="flex items-center gap-3">
                  {selectedPlayer.child_photo_url ? (
                    <img
                      src={selectedPlayer.child_photo_url}
                      alt={`${selectedPlayer.player_first_name} ${selectedPlayer.player_last_name}`}
                      className="w-12 h-12 rounded-full object-cover border border-[#e8d8ce]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-[#e8d8ce] flex items-center justify-center text-xs text-slate-500">
                      No photo
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Grade (fall): {selectedPlayer.grade_fall}
                    {selectedPlayer.soccer_club?.trim() ? ` · Club: ${selectedPlayer.soccer_club.trim()}` : ''}
                    {selectedPlayer.registration_submissions?.parent_email
                      ? ` · Parent email: ${selectedPlayer.registration_submissions.parent_email}`
                      : null}
                  </p>
                </div>
              )}

              <label className="block">
                <span className="block text-sm font-semibold text-[#213c57] mb-2">Camp week</span>
                <select
                  value={campSession}
                  onChange={(e) => setCampSession(e.target.value)}
                  className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 bg-white focus:ring-2 focus:ring-[#f05a28] focus:border-transparent"
                  required
                >
                  {CAMP_SESSIONS.map((w) => (
                    <option key={w} value={w}>
                      {campNameFromWeekLabel(w)}
                    </option>
                  ))}
                </select>
              </label>

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

            <div className="bg-white border border-[#e8d8ce] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-[#062744] mb-3">Rating scale (1 to 5)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                {REPORT_CARD_RATING_SCALE_DOC.map((r) => (
                  <div key={r.value} className={`rounded-xl px-2 py-2 text-center text-xs ${r.swatchClassName}`}>
                    <div className="text-lg font-extrabold tabular-nums">{r.value}</div>
                    <div className="font-bold leading-tight">{r.label}</div>
                  </div>
                ))}
              </div>
              <Link href="/report-card-skills" className="text-sm text-[#f05a28] font-semibold hover:underline">
                Full skill descriptions (public report card page)
              </Link>
            </div>

            {REPORT_METRIC_GROUPS.map((group) => (
              <div
                key={group.category}
                className={`rounded-2xl border border-[#e8d8ce] overflow-hidden border-l-4 shadow-sm ${
                  REPORT_CARD_CATEGORY_ACCENT[group.category] ?? ''
                }`}
              >
                <div className="bg-white/90 px-4 py-3 border-b border-[#f0e2d9]">
                  <h2 className="text-lg font-bold text-[#062744]">
                    {group.title} <span className="text-[#f05a28]">({group.subtitle})</span>
                  </h2>
                </div>
                <div className="bg-white px-4 py-4 space-y-4">
                  {group.metrics.map((m) => (
                    <div key={m.key} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      <div className="sm:flex-1 text-sm">
                        <span className="font-bold text-[#062744]">{m.label}</span>
                        <span className="text-[#f05a28] font-bold"> *</span>
                        <p className="text-slate-600 text-xs mt-1 leading-relaxed">{m.description}</p>
                      </div>
                      <select
                        value={scores[m.key] === '' ? '' : String(scores[m.key])}
                        onChange={(e) => setScore(m.key, e.target.value)}
                        className="w-full sm:w-36 border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white shrink-0 focus:ring-2 focus:ring-[#f05a28]"
                      >
                        <option value="">—</option>
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
                <span className="block text-sm font-semibold text-[#213c57] mb-2">Coach overview</span>
                <textarea
                  value={coachComments}
                  onChange={(e) => setCoachComments(e.target.value)}
                  rows={5}
                  placeholder="Strengths, growth areas, and encouragement — emailed to the parent with the scores."
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
              disabled={isPending || !childId || !campSession}
              className="w-full bg-[#062744] hover:bg-[#041f36] disabled:bg-[#4b6782] text-white font-bold py-4 rounded-full transition-colors disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : 'Save report & email parent'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
