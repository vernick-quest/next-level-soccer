'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { campNameFromWeekLabel, campDatesFromWeekLabel } from '@/lib/camp-display'
import { REFUND_DEADLINE_LABEL } from '@/lib/refund-deadline'
import {
  removePendingCampRegistration,
  requestRefundForCamp,
  submitAdditionalWeeks,
  type DashboardCamp,
  type DashboardIncrementalChild,
} from './actions'

function statusBadge(displayStatus: DashboardCamp['displayStatus']) {
  if (displayStatus === 'confirmed') {
    return { label: 'Confirmed', className: 'bg-green-100 text-green-800' }
  }
  if (displayStatus === 'refund_requested') {
    return { label: 'Refund requested', className: 'bg-violet-100 text-violet-800' }
  }
  return { label: 'Pending', className: 'bg-amber-100 text-amber-800' }
}

function weekKeySet(child: DashboardIncrementalChild): Set<string> {
  return new Set(child.existingWeeks.map((e) => e.week))
}

export default function DashboardClient({
  initialCamps,
  incremental,
  refundWindowOpen,
}: {
  initialCamps: DashboardCamp[]
  incremental: { children: DashboardIncrementalChild[]; weekRemaining: Record<string, number> } | null
  refundWindowOpen: boolean
}) {
  const [camps, setCamps] = useState(initialCamps)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [extraWeekSelection, setExtraWeekSelection] = useState<Record<string, Set<string>>>({})

  const showIncrementalSection = incremental && incremental.children.length > 0
  const canSubmitIncremental = incremental?.children.some((c) => c.submissionPending) ?? false

  function toggleExtraWeek(childId: string, week: string, allowed: boolean) {
    if (!allowed) return
    setExtraWeekSelection((prev) => {
      const cur = new Set(prev[childId] ?? [])
      if (cur.has(week)) cur.delete(week)
      else cur.add(week)
      return { ...prev, [childId]: cur }
    })
  }

  function saveAdditionalWeeks() {
    const items = Object.entries(extraWeekSelection)
      .map(([registrationChildId, set]) => ({
        registrationChildId,
        requestedWeeks: [...set],
      }))
      .filter((x) => x.requestedWeeks.length > 0)
    if (items.length === 0) {
      setMessage('Select at least one new camp week to add.')
      setSuccess(null)
      return
    }
    setMessage(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await submitAdditionalWeeks({ items })
      if (!result.success) {
        setMessage(result.error)
        return
      }
      setSuccess('Additional weeks saved. Check your email for the amount due.')
      setExtraWeekSelection({})
      router.refresh()
    })
  }

  function cancelRegistration(camp: DashboardCamp) {
    if (
      !confirm(
        'Cancel this registration? This removes this camp week from your account and cannot be undone.',
      )
    ) {
      return
    }
    setMessage(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await removePendingCampRegistration({
        registrationId: camp.registrationId,
      })
      if (!result.success) {
        setMessage(result.error)
        return
      }
      setSuccess('Registration cancelled.')
      setCamps((prev) =>
        prev.filter((c) => !(c.registrationId === camp.registrationId)),
      )
      router.refresh()
    })
  }

  function requestRefund(camp: DashboardCamp) {
    if (
      !confirm(
        'Request a refund for this confirmed camp week? Our team will follow up using your registration email.',
      )
    ) {
      return
    }
    setMessage(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await requestRefundForCamp({
        registrationId: camp.registrationId,
        week: camp.week,
      })
      if (!result.success) {
        setMessage(result.error)
        return
      }
      setSuccess('Refund request submitted. We will contact you soon.')
      setCamps((prev) =>
        prev.map((c) =>
          c.registrationId === camp.registrationId
            ? { ...c, displayStatus: 'refund_requested' as const }
            : c,
        ),
      )
      router.refresh()
    })
  }

  return (
    <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#062744] mb-1">Parent Dashboard</h1>
            <p className="text-slate-600 mb-2 font-medium text-[#213c57]">Manage registrations</p>
            <p className="text-slate-600 text-sm">
              Registrations are tied to your account. Each row is one camp week for one player.
            </p>
          </div>
          <Link
            href="/register?additionalChild=1"
            className="shrink-0 inline-flex items-center justify-center bg-[#f05a28] hover:bg-[#d94e21] text-white font-semibold px-5 py-3 rounded-full text-sm transition-colors shadow-sm"
          >
            Add another child
          </Link>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
            {success}
          </div>
        )}
        {message && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {showIncrementalSection && (
          <section className="mb-10 bg-white border border-[#e8d8ce] rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#062744] mb-1">Add more camp weeks</h2>
            <p className="text-sm text-slate-600 mb-4">
              Weeks you already hold are checked and locked. While your family registration is still pending payment,
              you can select additional weeks that have openings.
            </p>
            {!incremental.children.some((c) => c.submissionPending) && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                Additional weeks can only be added online before your family registration is marked paid. For more weeks
                after payment, email nextlevelsoccersf@gmail.com.
              </p>
            )}
            <div className="space-y-6">
              {incremental.children.map((child) => {
                const held = weekKeySet(child)
                const selected = extraWeekSelection[child.registrationChildId] ?? new Set<string>()
                return (
                  <div
                    key={child.registrationChildId}
                    className="border border-[#f0e2d9] rounded-xl p-4 bg-[#fffaf5]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {child.photoUrl ? (
                        <img
                          src={child.photoUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-[#e8d8ce]"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-[#e8d8ce]" />
                      )}
                      <div className="font-bold text-slate-900">
                        {child.firstName} {child.lastName}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm">
                      {CAMP_SESSIONS.map((week) => {
                        const existing = child.existingWeeks.find((e) => e.week === week)
                        const isHeld = held.has(week)
                        const remaining = incremental.weekRemaining[week] ?? 0
                        const canAdd =
                          child.submissionPending && !isHeld && remaining > 0
                        const isSelected = selected.has(week)
                        return (
                          <label
                            key={week}
                            className={`flex items-start gap-2 rounded-lg px-2 py-2 border ${
                              isHeld
                                ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                                : canAdd
                                  ? 'border-[#e8d8ce] bg-white cursor-pointer hover:bg-[#fff8f3]'
                                  : 'border-slate-100 bg-slate-50/80 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 accent-[#f05a28] shrink-0"
                              checked={isHeld || isSelected}
                              disabled={isHeld || !canAdd}
                              onChange={() =>
                                toggleExtraWeek(child.registrationChildId, week, !!canAdd)
                              }
                            />
                            <span>
                              <span className="font-medium block">{campNameFromWeekLabel(week)}</span>
                              <span className="text-xs text-slate-500">{campDatesFromWeekLabel(week)}</span>
                              {isHeld && existing && (
                                <span className="text-xs block mt-0.5 text-slate-500">
                                  Already reserved ({existing.displayStatus === 'confirmed' ? 'paid/confirmed' : existing.displayStatus === 'refund_requested' ? 'refund requested' : 'pending'})
                                </span>
                              )}
                              {!isHeld && !canAdd && child.submissionPending && (
                                <span className="text-xs block mt-0.5">Full or unavailable</span>
                              )}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {canSubmitIncremental && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => saveAdditionalWeeks()}
                className="mt-5 w-full sm:w-auto bg-[#062744] hover:bg-[#041f36] disabled:opacity-50 text-white font-bold py-3 px-8 rounded-full text-sm transition-colors"
              >
                {isPending ? 'Saving…' : 'Save additional weeks'}
              </button>
            )}
          </section>
        )}

        {camps.length === 0 ? (
          <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-slate-600">
            <p className="mb-4">No camp weeks on file yet.</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-block bg-[#062744] text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#041f36]"
              >
                Register for camp
              </Link>
              <Link
                href="/register?additionalChild=1"
                className="inline-block border border-[#062744] text-[#062744] font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#f7f2e8]"
              >
                Add another child
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 text-xs font-bold text-[#213c57] uppercase tracking-wide">
              <div className="sm:col-span-3">Camp</div>
              <div className="sm:col-span-3">Schedule</div>
              <div className="sm:col-span-2">Player</div>
              <div className="sm:col-span-2">Status</div>
              <div className="sm:col-span-2 text-right">Actions</div>
            </div>

            {camps.map((camp) => {
              const badge = statusBadge(camp.displayStatus)
              const canCancel = camp.displayStatus === 'pending'
              const canRequestRefund = refundWindowOpen && camp.displayStatus === 'confirmed'

              return (
                <div
                  key={camp.registrationId}
                  className="bg-white border border-[#e8d8ce] rounded-2xl p-4 sm:p-5"
                >
                  <div className="sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center">
                    <div className="flex items-start gap-3 sm:col-span-3 mb-3 sm:mb-0">
                      {camp.childPhotoUrl ? (
                        <img
                          src={camp.childPhotoUrl}
                          alt=""
                          className="w-11 h-11 rounded-full object-cover border border-[#e8d8ce] shrink-0 sm:hidden"
                        />
                      ) : null}
                      <div>
                        <div className="text-xs font-semibold text-slate-500 sm:hidden">Camp</div>
                        <div className="font-bold text-slate-900 leading-tight">{campNameFromWeekLabel(camp.week)}</div>
                      </div>
                    </div>

                    <div className="sm:col-span-3 mb-2 sm:mb-0">
                      <div className="text-xs font-semibold text-slate-500 sm:hidden">Schedule</div>
                      <div className="text-sm text-slate-700">{campDatesFromWeekLabel(camp.week)}</div>
                    </div>

                    <div className="sm:col-span-2 mb-2 sm:mb-0 flex items-center gap-3">
                      {camp.childPhotoUrl ? (
                        <img
                          src={camp.childPhotoUrl}
                          alt={camp.childName}
                          className="hidden sm:block w-10 h-10 rounded-full object-cover border border-[#e8d8ce] shrink-0"
                        />
                      ) : (
                        <div className="hidden sm:flex w-10 h-10 rounded-full bg-slate-100 border border-[#e8d8ce] items-center justify-center text-[10px] text-slate-500 shrink-0">
                          No photo
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-slate-500 sm:hidden">Player</div>
                        <div className="font-semibold text-slate-800 text-sm">{camp.childName}</div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 mb-3 sm:mb-0">
                      <div className="text-xs font-semibold text-slate-500 sm:hidden">Status</div>
                      <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="sm:col-span-2 flex flex-col sm:items-end gap-2">
                      {canCancel && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => cancelRegistration(camp)}
                          className="w-full sm:w-auto text-sm font-semibold text-[#c24a22] hover:text-[#9b3e1f] border border-[#f0c4b8] hover:bg-[#fff5f2] rounded-full px-4 py-2 disabled:opacity-50"
                        >
                          Cancel registration
                        </button>
                      )}
                      {camp.displayStatus === 'confirmed' && (
                        <div className="w-full sm:flex sm:flex-col sm:items-end gap-1">
                          <button
                            type="button"
                            disabled={isPending || !canRequestRefund}
                            onClick={() => canRequestRefund && requestRefund(camp)}
                            className="w-full sm:w-auto text-sm font-semibold rounded-full px-4 py-2 border border-[#e8d8ce] disabled:opacity-45 disabled:cursor-not-allowed text-[#213c57] enabled:hover:text-[#062744] enabled:hover:bg-[#f7f2e8]"
                          >
                            Request refund
                          </button>
                          {!refundWindowOpen && (
                            <p className="text-xs text-slate-500 text-left sm:text-right max-w-[17rem] sm:ml-auto">
                              Refund window closed (Deadline: {REFUND_DEADLINE_LABEL})
                            </p>
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
      </div>
    </main>
  )
}
