'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { campNameFromWeekLabel } from '@/lib/camp-display'
import { CAMP_WEEK_PRICE_CENTS } from '@/lib/camp-pricing'
import { REPORT_CARD_RATING_SCALE_DOC } from '@/lib/report-card-doc-reference'
import {
  COACH_REPORT_METRIC_KEYS,
  REPORT_METRIC_GROUPS,
  type CoachReportMetricKey,
} from '@/lib/player-report-metrics'
import { registrationRefundPending } from '@/lib/registration-refund-pending'
import { REPORT_CARD_CATEGORY_ACCENT } from '@/lib/report-card-ui'
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_KEY_ORDER,
  EMAIL_TEMPLATE_SPECS,
  type EmailTemplateKey,
} from '@/lib/email-template-catalog'
import type { EmailTemplateBundle } from '@/lib/email-templates-resolve'
import {
  cancelCampWeekLowEnrollment,
  listCoachRegistrations,
  listCoachWeekReportRows,
  markCampWeekCompleted,
  markRefundMoneySent,
  resolveRefundRequest,
  savePlayerReport,
  setRegistrationDecision,
  type CoachRegistrationRow,
  type CoachWeekPlayerRow,
} from './actions'
import { resetEmailTemplateOverride, saveEmailTemplateOverride } from './email-template-actions'

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

function formatRegistrationDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTemplateUpdatedAt(iso: string | null) {
  if (!iso) return 'Using site defaults only (nothing saved to the database yet).'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return `Last saved: ${iso}`
  return `Last saved: ${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
}

export default function CoachPortal({
  initialRegistrations,
  initialWeekPlayers,
  initialEmailTemplateBundle,
}: {
  initialRegistrations: CoachRegistrationRow[]
  initialWeekPlayers: Record<string, CoachWeekPlayerRow[]>
  initialEmailTemplateBundle: EmailTemplateBundle
}) {
  const [tab, setTab] = useState<'registrations' | 'reports' | 'emails'>('registrations')
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [weekPlayersMap, setWeekPlayersMap] = useState(initialWeekPlayers)
  const [campSession, setCampSession] = useState<string>(CAMP_SESSIONS[0] ?? '')
  const [expandedChild, setExpandedChild] = useState<string | null>(null)
  const [scoresByChild, setScoresByChild] = useState<Record<string, Record<CoachReportMetricKey, '' | number>>>({})
  const [commentsByChild, setCommentsByChild] = useState<Record<string, string>>({})
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({})
  const [discountDollarsById, setDiscountDollarsById] = useState<Record<string, string>>({})
  const [refundDeclineReasons, setRefundDeclineReasons] = useState<Record<string, string>>({})
  const [sortRegistrationsBy, setSortRegistrationsBy] = useState<'date' | 'child'>('date')
  const [cancelWeekSession, setCancelWeekSession] = useState<string>(CAMP_SESSIONS[0] ?? '')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const [emailBundle, setEmailBundle] = useState(initialEmailTemplateBundle)
  const [emailTemplateKey, setEmailTemplateKey] = useState<EmailTemplateKey>(EMAIL_TEMPLATE_KEY_ORDER[0])
  const [emailFieldsDraft, setEmailFieldsDraft] = useState<Record<string, string>>(
    () => ({ ...initialEmailTemplateBundle[EMAIL_TEMPLATE_KEY_ORDER[0]].fields }),
  )

  useEffect(() => {
    setEmailFieldsDraft({ ...emailBundle[emailTemplateKey].fields })
  }, [emailTemplateKey, emailBundle])

  const playersForWeek = weekPlayersMap[campSession] ?? []

  const refreshRegistrations = useCallback(async () => {
    const { rows, error } = await listCoachRegistrations()
    if (!error) setRegistrations(rows)
  }, [])

  const sortedRegistrations = useMemo(() => {
    const list = [...registrations]
    if (sortRegistrationsBy === 'child') {
      list.sort((a, b) => {
        const ln = (a.player_last_name ?? '').localeCompare(b.player_last_name ?? '')
        if (ln !== 0) return ln
        const fn = (a.player_first_name ?? '').localeCompare(b.player_first_name ?? '')
        if (fn !== 0) return fn
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    } else {
      list.sort((a, b) => {
        const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (t !== 0) return t
        const ln = (a.player_last_name ?? '').localeCompare(b.player_last_name ?? '')
        if (ln !== 0) return ln
        return (a.player_first_name ?? '').localeCompare(b.player_first_name ?? '')
      })
    }
    return list
  }, [registrations, sortRegistrationsBy])

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

  function submitEmailTemplateSave() {
    setMessage(null)
    startTransition(async () => {
      const r = await saveEmailTemplateOverride({
        templateKey: emailTemplateKey,
        fields: emailFieldsDraft,
      })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setEmailBundle((b) => ({
        ...b,
        [emailTemplateKey]: { fields: r.fields, updatedAt: r.updatedAt },
      }))
      setMessage({ type: 'ok', text: 'Email copy saved. New sends will use this text.' })
    })
  }

  function submitEmailTemplateReset() {
    if (
      !confirm(
        'Reset this email to the built-in defaults? This removes your saved copy from the database for this template.',
      )
    ) {
      return
    }
    setMessage(null)
    startTransition(async () => {
      const r = await resetEmailTemplateOverride({ templateKey: emailTemplateKey })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      const defaults = { ...EMAIL_TEMPLATE_DEFAULTS[emailTemplateKey] }
      setEmailBundle((b) => ({
        ...b,
        [emailTemplateKey]: { fields: defaults, updatedAt: null },
      }))
      setEmailFieldsDraft(defaults)
      setMessage({ type: 'ok', text: 'Reset to defaults.' })
    })
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
        rows.map((x) =>
          x.id === id ? { ...x, status: 'confirmed', decline_reason: null, coach_discount_cents: 0 } : x,
        ),
      )
      setMessage({ type: 'ok', text: 'Confirmed and parent emailed.' })
      await refreshWeekPlayers(campSession)
      await refreshRegistrations()
    })
  }

  function confirmWithDiscount(id: string) {
    const raw = (discountDollarsById[id] ?? '').trim()
    const dollars = Number.parseFloat(raw)
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setMessage({ type: 'err', text: 'Enter a discount greater than $0 (e.g. 25 for twenty-five dollars off).' })
      return
    }
    const cents = Math.round(dollars * 100)
    if (cents < 1 || cents > CAMP_WEEK_PRICE_CENTS) {
      setMessage({
        type: 'err',
        text: `Discount must be between $0.01 and $${CAMP_WEEK_PRICE_CENTS / 100} for one camp week (cannot exceed the week price).`,
      })
      return
    }
    setMessage(null)
    startTransition(async () => {
      const r = await setRegistrationDecision({
        registrationId: id,
        decision: 'discounted',
        discountCents: cents,
      })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setRegistrations((rows) =>
        rows.map((x) =>
          x.id === id ? { ...x, status: 'confirmed', decline_reason: null, coach_discount_cents: cents } : x,
        ),
      )
      setDiscountDollarsById((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage({ type: 'ok', text: 'Confirmed with discount; parent emailed and family total updated.' })
      await refreshWeekPlayers(campSession)
      await refreshRegistrations()
    })
  }

  function submitDecline(id: string) {
    const reason = (declineReasons[id] ?? '').trim()
    if (!reason) {
      setMessage({ type: 'err', text: 'Enter a decline reason in the text box before declining.' })
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
      setDeclineReasons((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage({ type: 'ok', text: 'Declined and parent emailed.' })
      await refreshRegistrations()
    })
  }

  function approveRefund(id: string) {
    setMessage(null)
    startTransition(async () => {
      const r = await resolveRefundRequest({ registrationId: id, decision: 'approved' })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setRefundDeclineReasons((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage({ type: 'ok', text: 'Refund approved and parent emailed.' })
      await refreshRegistrations()
    })
  }

  function submitRefundDecline(id: string) {
    const reason = (refundDeclineReasons[id] ?? '').trim()
    if (!reason) {
      setMessage({ type: 'err', text: 'Enter a reason before declining this refund request.' })
      return
    }
    setMessage(null)
    startTransition(async () => {
      const r = await resolveRefundRequest({
        registrationId: id,
        decision: 'declined',
        declineReason: reason,
      })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setRefundDeclineReasons((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage({ type: 'ok', text: 'Refund decline sent to parent by email.' })
      await refreshRegistrations()
    })
  }

  function submitMarkCampComplete(id: string) {
    setMessage(null)
    startTransition(async () => {
      const r = await markCampWeekCompleted({ registrationId: id })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setMessage({ type: 'ok', text: 'Camp week marked complete. Parent dashboard updated.' })
      await refreshRegistrations()
    })
  }

  function submitMarkRefundPaid(id: string) {
    setMessage(null)
    startTransition(async () => {
      const r = await markRefundMoneySent({ registrationId: id })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setMessage({ type: 'ok', text: 'Refund marked as sent; parent emailed.' })
      await refreshRegistrations()
    })
  }

  function submitCancelEntireWeek() {
    if (
      !confirm(
        `Cancel the entire week "${campNameFromWeekLabel(cancelWeekSession)}" for low enrollment?\n\n` +
          '• Pending registrations will be declined.\n' +
          '• Paid (confirmed) registrations will be marked cancelled with automatic refund recorded and parents emailed.\n' +
          'This cannot be undone from the portal.',
      )
    ) {
      return
    }
    setMessage(null)
    startTransition(async () => {
      const r = await cancelCampWeekLowEnrollment({ campSession: cancelWeekSession })
      if (!r.success) {
        setMessage({ type: 'err', text: r.error })
        return
      }
      setMessage({
        type: 'ok',
        text: `Week cancelled. Updated ${r.affected} registration(s) and emailed parents.`,
      })
      await refreshRegistrations()
      await refreshWeekPlayers(campSession)
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

  const registrationsNeedingAttention = useMemo(
    () =>
      registrations.filter((r) => {
        const st = (r.status ?? '').toLowerCase()
        const refundP = registrationRefundPending(r)
        const awaitingPayout =
          st === 'confirmed' &&
          !!r.refund_approved_at &&
          !r.refund_money_sent_at &&
          !refundP
        return st === 'pending' || refundP || awaitingPayout
      }).length,
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
            {registrationsNeedingAttention > 0 ? (
              <span className="ml-1.5 text-xs opacity-90">({registrationsNeedingAttention} need action)</span>
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
          <button
            type="button"
            onClick={() => setTab('emails')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              tab === 'emails' ? 'bg-[#062744] text-white' : 'text-[#213c57] hover:bg-[#f7f2e8]'
            }`}
          >
            Email copy
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

        {tab === 'emails' && (
          <section className="space-y-5 bg-white border border-[#e8d8ce] rounded-2xl p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-[#062744]">Parent email templates</h2>
              <p className="text-sm text-slate-600 mt-1">
                Edit structured fields (plain text). Use placeholders like{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{{playerName}}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{{campWeekLabel}}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{{parentFullName}}'}</code>, etc. Staff reasons
                for declines/refunds are still entered per case and are not part of this form. Report card rating tables
                are fixed; only the surrounding wording is editable here.
              </p>
            </div>
            <label className="block text-sm max-w-xl">
              <span className="block font-semibold text-[#213c57] mb-1">Which email</span>
              <select
                value={emailTemplateKey}
                onChange={(e) => setEmailTemplateKey(e.target.value as EmailTemplateKey)}
                className="w-full border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white"
              >
                {EMAIL_TEMPLATE_KEY_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {EMAIL_TEMPLATE_SPECS[k].label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-600">{EMAIL_TEMPLATE_SPECS[emailTemplateKey].description}</p>
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Placeholders: </span>
              {EMAIL_TEMPLATE_SPECS[emailTemplateKey].placeholders}
            </p>
            <p className="text-xs text-slate-600">{formatTemplateUpdatedAt(emailBundle[emailTemplateKey].updatedAt)}</p>
            <div className="space-y-4 border-t border-[#e8d8ce] pt-5">
              {EMAIL_TEMPLATE_SPECS[emailTemplateKey].fields.map((f) => (
                <label key={f.id} className="block text-sm">
                  <span className="block font-semibold text-[#213c57] mb-1">{f.label}</span>
                  {f.multiline ? (
                    <textarea
                      value={emailFieldsDraft[f.id] ?? ''}
                      onChange={(e) => setEmailFieldsDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                      rows={f.id.includes('body') || f.id.includes('Paragraph') ? 5 : 3}
                      className="w-full border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white font-normal min-h-[4rem]"
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <input
                      type="text"
                      value={emailFieldsDraft[f.id] ?? ''}
                      onChange={(e) => setEmailFieldsDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                      className="w-full border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white"
                      placeholder={f.placeholder}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitEmailTemplateSave()}
                className="text-sm font-bold bg-[#f05a28] hover:bg-[#d94e21] text-white px-5 py-2.5 rounded-full disabled:opacity-50"
              >
                Save this template
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitEmailTemplateReset()}
                className="text-sm font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-full disabled:opacity-50"
              >
                Reset to defaults
              </button>
            </div>
          </section>
        )}

        {tab === 'registrations' && (
          <section className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
              <h2 className="text-sm font-bold text-[#062744] mb-2">Cancel entire camp week (low enrollment)</h2>
              <p className="text-xs text-slate-700 mb-3">
                If a week does not meet the minimum player count, cancel it here. Parents see <strong>staff cancelled</strong>{' '}
                (not a refund request they made). Paid families get an automatic refund record and email; pending
                registrations are declined.
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
                <label className="block text-sm">
                  <span className="block font-semibold text-[#213c57] mb-1">Week</span>
                  <select
                    value={cancelWeekSession}
                    onChange={(e) => setCancelWeekSession(e.target.value)}
                    className="w-full sm:w-64 border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {CAMP_SESSIONS.map((w) => (
                      <option key={w} value={w}>
                        {campNameFromWeekLabel(w)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => submitCancelEntireWeek()}
                  className="shrink-0 text-sm font-bold bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-full disabled:opacity-50"
                >
                  Cancel this week for all families
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Confirm after payment is received, or use <strong>Confirm with discount</strong> to reduce this
              week&apos;s price (up to ${CAMP_WEEK_PRICE_CENTS / 100}) and update the family total. Mark confirmed weeks{' '}
              <strong>complete</strong> after camp ends (parents can no longer request refunds). For refunds: approve or
              decline with a reason; after you approve, use <strong>Mark refund sent</strong> when the money has gone out
              — parents see each step on their dashboard.
              Sort by registration date or child name.
            </p>
            {registrations.length === 0 ? (
              <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-center text-slate-600">
                No registration rows found.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="text-xs font-semibold text-slate-600">Sort:</span>
                  <button
                    type="button"
                    onClick={() => setSortRegistrationsBy('date')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                      sortRegistrationsBy === 'date'
                        ? 'bg-[#062744] text-white border-[#062744]'
                        : 'bg-white text-[#213c57] border-[#e8d8ce] hover:bg-[#fffaf5]'
                    }`}
                  >
                    By registration date
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortRegistrationsBy('child')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                      sortRegistrationsBy === 'child'
                        ? 'bg-[#062744] text-white border-[#062744]'
                        : 'bg-white text-[#213c57] border-[#e8d8ce] hover:bg-[#fffaf5]'
                    }`}
                  >
                    By child
                  </button>
                </div>
                <div className="space-y-3">
                  {sortedRegistrations.map((row) => {
                    const st = (row.status ?? 'pending').toLowerCase()
                    const rowPending = st === 'pending'
                    const organizerCancelled = !!row.organizer_cancelled_at
                    const refundPending = registrationRefundPending(row)
                    const refundAwaitingPayout =
                      st === 'confirmed' &&
                      !!row.refund_approved_at &&
                      !row.refund_money_sent_at &&
                      !refundPending
                    const completed = !!row.camp_completed_at
                    const discCents = row.coach_discount_cents ?? 0
                    const statusLabel = organizerCancelled
                      ? 'camp cancelled (staff)'
                      : completed
                        ? 'camp complete'
                        : row.refund_money_sent_at
                          ? 'refund completed'
                          : refundPending
                            ? 'refund requested'
                            : refundAwaitingPayout
                              ? 'refund processing'
                              : row.refund_denial_reason?.trim()
                                ? 'refund denied'
                                : st === 'confirmed' && discCents > 0
                                  ? 'confirmed (discount)'
                                  : st
                    const showMarkComplete =
                      st === 'confirmed' &&
                      !completed &&
                      !organizerCancelled &&
                      !refundPending &&
                      !refundAwaitingPayout
                    return (
                      <div
                        key={row.id}
                        className="bg-white border border-[#e8d8ce] rounded-2xl p-4 sm:p-5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-[#062744]">
                              {row.player_first_name} {row.player_last_name}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">{campNameFromWeekLabel(row.camp_session)}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Registered {formatRegistrationDate(row.created_at)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {row.parent_first_name} {row.parent_last_name} · {row.parent_email}
                            </div>
                            {st === 'declined' && row.decline_reason ? (
                              <div className="mt-2 text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                                <strong>Decline reason:</strong> {row.decline_reason}
                              </div>
                            ) : null}
                            {row.refund_denial_reason?.trim() && !refundPending && !row.refund_money_sent_at ? (
                              <div className="mt-2 text-sm text-rose-900 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                                <strong>Refund request not approved:</strong> {row.refund_denial_reason}
                              </div>
                            ) : null}
                            {completed ? (
                              <p className="mt-2 text-xs text-teal-800 font-medium">
                                Camp completed {formatRegistrationDate(row.camp_completed_at!)} — no online refunds.
                              </p>
                            ) : null}
                            {row.refund_money_sent_at ? (
                              <p className="mt-2 text-xs text-sky-800 font-medium">
                                Refund recorded as sent {formatRegistrationDate(row.refund_money_sent_at)}.
                              </p>
                            ) : null}
                            {st === 'confirmed' && discCents > 0 ? (
                              <p className="mt-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                                <strong>Staff discount on file:</strong>{' '}
                                {(discCents / 100).toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })}{' '}
                                off the standard {CAMP_WEEK_PRICE_CENTS / 100}-dollar week (
                                {(Math.max(0, CAMP_WEEK_PRICE_CENTS - discCents) / 100).toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })}{' '}
                                due for this week).
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                            <span
                              className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                                organizerCancelled
                                  ? 'bg-slate-200 text-slate-900'
                                  : completed
                                    ? 'bg-teal-100 text-teal-900'
                                    : row.refund_money_sent_at
                                      ? 'bg-sky-100 text-sky-900'
                                      : refundPending
                                        ? 'bg-violet-100 text-violet-900'
                                        : refundAwaitingPayout
                                          ? 'bg-amber-100 text-amber-900'
                                          : row.refund_denial_reason?.trim()
                                            ? 'bg-rose-100 text-rose-900'
                                            : st === 'confirmed'
                                              ? discCents > 0
                                                ? 'bg-emerald-100 text-emerald-900 ring-2 ring-amber-300'
                                                : 'bg-emerald-100 text-emerald-900'
                                              : st === 'declined'
                                                ? 'bg-rose-100 text-rose-900'
                                                : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {statusLabel}
                            </span>
                            {organizerCancelled ? (
                              <p className="mt-2 text-xs text-slate-700 w-full text-left sm:text-right max-w-md">
                                Week cancelled by staff (low enrollment). Parent dashboard shows this was{' '}
                                <strong>not</strong> a refund request they submitted.
                                {row.refund_money_sent_at
                                  ? ` Refund recorded ${formatRegistrationDate(row.refund_money_sent_at)}.`
                                  : null}
                              </p>
                            ) : null}
                            {rowPending && (
                              <div className="w-full sm:max-w-md mt-1 flex flex-col items-end gap-3">
                                <div className="flex flex-wrap gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => confirmRegistration(row.id)}
                                    disabled={isPending}
                                    className="shrink-0 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full disabled:opacity-50"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => submitDecline(row.id)}
                                    disabled={isPending || !(declineReasons[row.id] ?? '').trim()}
                                    className="shrink-0 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-full disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                                <label className="block w-full text-left sm:text-right">
                                  <span className="text-xs font-semibold text-slate-600">
                                    Decline reason (required if you decline — emailed to parent)
                                  </span>
                                  <textarea
                                    value={declineReasons[row.id] ?? ''}
                                    onChange={(e) =>
                                      setDeclineReasons((prev) => ({ ...prev, [row.id]: e.target.value }))
                                    }
                                    rows={3}
                                    placeholder="e.g. Week is full, or payment not received…"
                                    className="mt-1 w-full border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm resize-y min-h-[4.5rem]"
                                  />
                                </label>
                                <div className="w-full border-t border-[#e8d8ce] pt-3 text-left sm:text-right">
                                  <p className="text-xs text-slate-600 mb-2">
                                    <strong>Discount:</strong> confirm at a reduced price for this week only{' '}
                                    {`(max $${CAMP_WEEK_PRICE_CENTS / 100})`}. The family&apos;s registration total is
                                    reduced by the same amount; the parent is emailed with the discount and amount due.
                                  </p>
                                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2 sm:justify-end">
                                    <label className="block text-left sm:text-right">
                                      <span className="text-xs font-semibold text-slate-600">Discount ($)</span>
                                      <input
                                        type="number"
                                        min={0.01}
                                        step={0.01}
                                        max={CAMP_WEEK_PRICE_CENTS / 100}
                                        value={discountDollarsById[row.id] ?? ''}
                                        onChange={(e) =>
                                          setDiscountDollarsById((prev) => ({ ...prev, [row.id]: e.target.value }))
                                        }
                                        placeholder="e.g. 50"
                                        className="mt-1 w-full sm:w-32 border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm bg-white"
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => confirmWithDiscount(row.id)}
                                      disabled={isPending}
                                      className="shrink-0 text-sm font-bold bg-[#062744] hover:bg-[#041f36] text-white px-4 py-2 rounded-full disabled:opacity-50"
                                    >
                                      Confirm with discount
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {refundPending && (
                              <div className="w-full sm:max-w-md mt-1 border-t border-[#f0e2d9] pt-3 flex flex-col items-end gap-3">
                                <p className="text-xs text-slate-600 text-left w-full">
                                  Parent requested a refund for this confirmed week. Approve to confirm you will process
                                  it, or decline with a reason (emailed to parent).
                                </p>
                                <div className="flex flex-wrap gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => approveRefund(row.id)}
                                    disabled={isPending}
                                    className="shrink-0 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full disabled:opacity-50"
                                  >
                                    Approve refund
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => submitRefundDecline(row.id)}
                                    disabled={isPending || !(refundDeclineReasons[row.id] ?? '').trim()}
                                    className="shrink-0 text-sm font-bold border-2 border-rose-400 text-rose-800 hover:bg-rose-50 px-4 py-2 rounded-full disabled:opacity-50"
                                  >
                                    Decline refund
                                  </button>
                                </div>
                                <label className="block w-full text-left sm:text-right">
                                  <span className="text-xs font-semibold text-slate-600">
                                    Reason if declining refund (required to decline)
                                  </span>
                                  <textarea
                                    value={refundDeclineReasons[row.id] ?? ''}
                                    onChange={(e) =>
                                      setRefundDeclineReasons((prev) => ({ ...prev, [row.id]: e.target.value }))
                                    }
                                    rows={3}
                                    placeholder="Explain why the refund cannot be approved…"
                                    className="mt-1 w-full border border-[#e8d8ce] rounded-xl px-3 py-2 text-sm resize-y min-h-[4.5rem]"
                                  />
                                </label>
                              </div>
                            )}
                            {refundAwaitingPayout && (
                              <div className="w-full sm:max-w-md mt-1 border-t border-[#f0e2d9] pt-3 flex flex-col items-end gap-2">
                                <p className="text-xs text-slate-600 text-left w-full">
                                  Refund was approved. After you send the money (Zelle/Venmo/check), confirm here so the
                                  parent sees &ldquo;refund completed&rdquo; on their dashboard.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => submitMarkRefundPaid(row.id)}
                                  disabled={isPending}
                                  className="shrink-0 text-sm font-bold bg-[#062744] hover:bg-[#041f36] text-white px-4 py-2 rounded-full disabled:opacity-50"
                                >
                                  Mark refund sent
                                </button>
                              </div>
                            )}
                            {showMarkComplete && (
                              <div className="w-full sm:max-w-md mt-1 border-t border-[#f0e2d9] pt-3 flex flex-col items-end gap-2">
                                <p className="text-xs text-slate-600 text-left w-full">
                                  After this camp week has finished, mark it complete. Parents can no longer request
                                  refunds online for this week.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => submitMarkCampComplete(row.id)}
                                  disabled={isPending}
                                  className="shrink-0 text-sm font-bold border-2 border-teal-600 text-teal-900 hover:bg-teal-50 px-4 py-2 rounded-full disabled:opacity-50"
                                >
                                  Mark camp week complete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
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
