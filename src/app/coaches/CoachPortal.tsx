'use client'

import { useMemo, useState, useTransition } from 'react'
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
import {
  listCoachWeekReportRows,
  savePlayerReport,
  setRegistrationDecision,
  type CoachRegistrationRow,
  type CoachWeekPlayerRow,
} from './actions'

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

export default function CoachPortal({
  initialRegistrations,
  initialWeekPlayers,
}: {
  initialRegistrations: CoachRegistrationRow[]
  initialWeekPlayers: Record<string, CoachWeekPlayerRow[]>
}) {
  const [tab, setTab] = useState<'registrations' | 'reports'>('registrations')
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [weekPlayersMap, setWeekPlayersMap] = useState(initialWeekPlayers)
  const [campSession, setCampSession] = useState<string>(CAMP_SESSIONS[0] ?? '')
  const [expandedChild, setExpandedChild] = useState<string | null>(null)
  const [scoresByChild, setScoresByChild] = useState<Record<string, Record<CoachReportMetricKey, '' | number>>>({})
  const [commentsByChild, setCommentsByChild] = useState<Record<string, string>>({})
  const [declineId, setDeclineId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const playersForWeek = weekPlayersMap[campSession] ?? []

  function scoresFor(childId: string) {
    return scoresByChild[childId] ?? emptyScores()
  }

  function setScore(childId: string, key: CoachReportMetricKey, value: string) {
    setScoresByChild((prev) => {
      const cur = { ...(prev[childId] ?? emptyScores()) }
      if (value === '') cur[key] = ''
      else cur[key] = Number(value)
      return { ...prev, [childId]: cur }
    })
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/coaches'
  }

  async function refreshWeekPlayers(week: string) {
    const { players, error } = await listCoachWeekReportRows(week)
    if (!error) {
      setWeekPlayersMap((m) => ({ ...m, [week]: players }))
    }
  }

  function confirmRegistration(id: string) {
    setMessage(null)
    startTransition(async () => {
      const r = await setRegistrationDecision({ registrationId: id, decision: 'confirmed' })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setRegistrations((rows) =>
        rows.map((x) => (x.id === id ? { ...x, status: 'confirmed', decline_reason: null } : x)),
      )
      setMessage({ type: 'ok', text: 'Confirmed and parent emailed.' })
      await refreshWeekPlayers(campSession)
    })
  }

  function submitDecline(id: string) {
    const reason = declineReason.trim()
    if (!reason) {
      setMessage({ type: 'err', text: 'Enter a decline reason for the parent email.' })
      return
    }
    setMessage(null)
    startTransition(async () => {
      const r = await setRegistrationDecision({
        registrationId: id,
        decision: 'declined',
        declineReason: reason,
      })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setRegistrations((rows) =>
        rows.map((x) => (x.id === id ? { ...x, status: 'declined', decline_reason: reason } : x)),
      )
      setDeclineId(null)
      setDeclineReason('')
      setMessage({ type: 'ok', text: 'Declined and parent emailed.' })
    })
  }

  function submitReport(childId: string) {
    setMessage(null)
    const scores = scoresFromRecord(scoresFor(childId))
    const overview = (commentsByChild[childId] ?? '').trim()
    if (!scores) {
      setMessage({ type: 'err', text: 'Select a score (1–5) for every skill.' })
      return
    }
    if (!overview) {
      setMessage({ type: 'err', text: 'Add a coach overview for the parent email.' })
      return
    }
    const iso = new Date().toISOString()
    startTransition(async () => {
      const r = await savePlayerReport({
        registrationChildId: childId,
        campSession,
        scores,
        coachComments: overview,
        dateGenerated: iso,
      })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setMessage({ type: 'ok', text: 'Report saved and emailed to the parent.' })
      setScoresByChild((prev) => ({ ...prev, [childId]: emptyScores() }))
      setCommentsByChild((prev) => ({ ...prev, [childId]: '' }))
      await refreshWeekPlayers(campSession)
    })
  }

  const pendingCount = useMemo(
    () => registrations.filter((r) => (r.status ?? '').toLowerCase() === 'pending').length,
    [registrations],
  )

  return (
    <div className="min-h-screen bg-[#f7f2e8] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#062744]">Coach&apos;s Portal</h1>
            <p className="text-slate-600 text-sm mt-1">
              Confirm or decline camp registrations, then enter weekly report cards (same skills as the{' '}
              <Link href="/report-card-skills" className="text-[#f05a28] font-semibold hover:underline">
                report card guide
              </Link>
              ).
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="text-sm font-semibold text-[#f05a28] hover:text-[#d94e21] py-2">
              Home
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-sm font-semibold text-slate-600 hover:text-[#062744] py-2"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-white border border-[#e8d8ce] rounded-2xl mb-8 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setTab('registrations')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'registrations' ? 'bg-[#062744] text-white' : 'text-[#213c57] hover:bg-[#f7f2e8]'
            }`}
          >
            Registrations
            {pendingCount > 0 ? (
              <span className="ml-1.5 text-xs opacity-90">({pendingCount} pending)</span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'reports' ? 'bg-[#062744] text-white' : 'text-[#213c57] hover:bg-[#f7f2e8]'
            }`}
          >
            Weekly report cards
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm ${
              message.type === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {tab === 'registrations' && (
          <section className="space-y-4">
            <p className="text-sm text-slate-600">
              Confirm after payment is received. Decline if the week is full or payment was not received — the parent
              gets an email with your reason and can try again later if space opens up.
            </p>
            {registrations.length === 0 ? (
              <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-center text-slate-600">
                No registration rows found.
              </div>
            ) : (
              <div className="space-y-3">
                {registrations.map((row) => {
                  const st = (row.status ?? 'pending').toLowerCase()
                  const rowPending = st === 'pending'
                  return (
                    <div
                      key={row.id}
                      className="bg-white border border-[#e8d8ce] rounded-2xl p-4 sm:p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[#062744]">
                            {row.player_first_name} {row.player_last_name}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">{campNameFromWeekLabel(row.camp_session)}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {row.parent_first_name} {row.parent_last_name} · {row.parent_email}
                          </div>
                          {st === 'declined' && row.decline_reason ? (
                            <div className="mt-2 text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                              <strong>Decline reason:</strong> {row.decline_reason}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                              st === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-900'
                                : st === 'declined'
                                  ? 'bg-rose-100 text-rose-900'
                                  : st === 'refund_requested'
                                    ? 'bg-violet-100 text-violet-900'
                                    : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {st}
                          </span>
                          {rowPending && (
                            <div className="flex flex-wrap gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => confirmRegistration(row.id)}
                                disabled={isPending}
                                className="text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              {declineId === row.id ? (
                                <div className="w-full sm:w-auto flex flex-col gap-2 min-w-[14rem]">
                                  <textarea
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    rows={3}
                                    placeholder="Reason (emailed to parent)…"
                                    className="w-full border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => submitDecline(row.id)}
                                      disabled={isPending}
                                      className="text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-full disabled:opacity-50"
                                    >
                                      Send decline
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeclineId(null)
                                        setDeclineReason('')
                                      }}
                                      className="text-sm font-semibold text-slate-600 px-3"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeclineId(row.id)
                                    setDeclineReason('')
                                  }}
                                  className="text-sm font-bold border-2 border-rose-400 text-rose-800 hover:bg-rose-50 px-4 py-2 rounded-full"
                                >
                                  Decline
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'reports' && (
          <section className="space-y-6">
            <div className="bg-white border border-[#e8d8ce] rounded-2xl p-5 shadow-sm">
              <label className="block">
                <span className="block text-sm font-bold text-[#062744] mb-2">Camp week</span>
                <select
                  value={campSession}
                  onChange={(e) => {
                    const w = e.target.value
                    setCampSession(w)
                    setExpandedChild(null)
                    void refreshWeekPlayers(w)
                  }}
                  className="w-full max-w-md border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800"
                >
                  {CAMP_SESSIONS.map((w) => (
                    <option key={w} value={w}>
                      {campNameFromWeekLabel(w)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-sm text-slate-600 mt-3">
                Only <strong>confirmed</strong> registrations for this week appear here. Scores default blank until you
                submit — parents receive one email with the overview and skill table.
              </p>
            </div>

            <div className="bg-white border border-[#e8d8ce] rounded-2xl p-5 shadow-sm">
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

            {playersForWeek.length === 0 ? (
              <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-center text-slate-600">
                No confirmed players for this week yet.
              </div>
            ) : (
              <ul className="space-y-4">
                {playersForWeek.map((p) => {
                  const open = expandedChild === p.registrationChildId
                  return (
                    <li key={p.registrationChildId} className="bg-white border border-[#e8d8ce] rounded-2xl shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedChild(open ? null : p.registrationChildId)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-[#fffaf5]"
                      >
                        <div>
                          <div className="font-bold text-[#062744]">
                            {p.player_first_name} {p.player_last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Grade {p.grade_fall}
                            {p.reportSubmitted ? (
                              <span className="ml-2 text-emerald-700 font-semibold">
                                · Report on file
                                {p.parentEmailSent ? ' · Emailed to parent' : ''}
                              </span>
                            ) : (
                              <span className="ml-2 text-amber-700 font-semibold">· No report yet</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[#062744] font-bold text-sm shrink-0">{open ? '▲' : '▼'}</span>
                      </button>
                      {open && (
                        <div className="border-t border-[#e8d8ce] px-4 py-5 space-y-6 bg-[#fffaf5]/50">
                          {REPORT_METRIC_GROUPS.map((group) => (
                            <div
                              key={group.category}
                              className={`rounded-2xl border border-[#e8d8ce] overflow-hidden border-l-4 ${
                                REPORT_CARD_CATEGORY_ACCENT[group.category] ?? ''
                              }`}
                            >
                              <div className="bg-white/90 px-4 py-3 border-b border-[#f0e2d9]">
                                <h3 className="text-lg font-bold text-[#062744]">
                                  {group.title}{' '}
                                  <span className="text-[#f05a28]">({group.subtitle})</span>
                                </h3>
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
                                      value={scoresFor(p.registrationChildId)[m.key] === '' ? '' : String(scoresFor(p.registrationChildId)[m.key])}
                                      onChange={(e) => setScore(p.registrationChildId, m.key, e.target.value)}
                                      className="w-full sm:w-36 border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white shrink-0"
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
                          <div>
                            <label className="block text-sm font-bold text-[#062744] mb-2">Coach overview</label>
                            <textarea
                              value={commentsByChild[p.registrationChildId] ?? ''}
                              onChange={(e) =>
                                setCommentsByChild((prev) => ({ ...prev, [p.registrationChildId]: e.target.value }))
                              }
                              rows={5}
                              placeholder="Strengths, growth areas, and encouragement — emailed to the parent with the scores."
                              className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => submitReport(p.registrationChildId)}
                            className="w-full sm:w-auto bg-[#062744] hover:bg-[#041f36] text-white font-bold py-3 px-8 rounded-full text-sm disabled:opacity-50"
                          >
                            {isPending ? 'Saving…' : 'Submit report & email parent'}
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
