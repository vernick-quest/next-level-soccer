'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  removePendingCampRegistration,
  requestRefundForCamp,
  submitAdditionalWeeks,
  type DashboardCamp,
  type DashboardChildView,
  type DashboardIncrementalChild,
} from './actions'
import ChildDashboardPanel from './ChildDashboardPanel'

export default function DashboardClient({
  initialCamps,
  incremental,
  children,
  refundWindowOpen,
}: {
  initialCamps: DashboardCamp[]
  incremental: { children: DashboardIncrementalChild[]; weekRemaining: Record<string, number> } | null
  children: DashboardChildView[]
  refundWindowOpen: boolean
}) {
  const [camps, setCamps] = useState(initialCamps)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [extraWeekSelection, setExtraWeekSelection] = useState<Record<string, Set<string>>>({})
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setCamps(initialCamps)
  }, [initialCamps])

  useEffect(() => {
    setActiveIndex((i) => (children.length === 0 ? 0 : Math.min(i, children.length - 1)))
  }, [children.length])

  const canSubmitIncremental = incremental?.children.some((c) => c.submissionPending) ?? false
  const showPaidFamilyBanner = !(incremental?.children ?? []).some((c) => c.submissionPending)

  const activeChild = children[activeIndex]
  const incrementalChild = activeChild
    ? incremental?.children.find((c) => c.registrationChildId === activeChild.registrationChildId) ?? null
    : null

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
      setCamps((prev) => prev.filter((c) => !(c.registrationId === camp.registrationId)))
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
          c.registrationId === camp.registrationId ? { ...c, displayStatus: 'refund_requested' as const } : c,
        ),
      )
      router.refresh()
    })
  }

  return (
    <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#062744] mb-1">Parent Dashboard</h1>
            <p className="text-slate-600 mb-2 font-medium text-[#213c57]">One place per camper — weeks, payments, and coach feedback</p>
            <p className="text-slate-600 text-sm">
              Switch between your children below. Camp tiles are color-coded; report cards show skill scores by week as coaches submit them.
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

        {children.length === 0 ? (
          <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-slate-600">
            <p className="mb-4">No campers linked to this account yet.</p>
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
          <div className="bg-white border border-[#e8d8ce] rounded-2xl shadow-sm overflow-hidden">
            <div className="border-b border-[#e8d8ce] bg-[#fffaf5] overflow-x-auto">
              <div className="flex min-w-0">
                {children.map((ch, i) => {
                  const label = `${ch.firstName} ${ch.lastName}`.trim() || 'Player'
                  return (
                    <button
                      key={`${ch.registrationChildId ?? 'legacy'}-${label}-${i}`}
                      type="button"
                      role="tab"
                      aria-selected={activeIndex === i}
                      onClick={() => setActiveIndex(i)}
                      className={`shrink-0 px-4 sm:px-6 py-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                        activeIndex === i
                          ? 'border-[#f05a28] text-[#062744] bg-white'
                          : 'border-transparent text-slate-600 hover:text-[#062744] hover:bg-white/60'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-5 sm:p-8" role="tabpanel">
              {activeChild && (
                <ChildDashboardPanel
                  child={activeChild}
                  incrementalChild={incrementalChild}
                  refundWindowOpen={refundWindowOpen}
                  canSubmitIncremental={canSubmitIncremental}
                  showPaidFamilyBanner={showPaidFamilyBanner}
                  extraWeekSelection={
                    activeChild.registrationChildId
                      ? extraWeekSelection[activeChild.registrationChildId] ?? new Set<string>()
                      : new Set<string>()
                  }
                  onToggleExtraWeek={(week, allowed) => {
                    if (activeChild.registrationChildId) {
                      toggleExtraWeek(activeChild.registrationChildId, week, allowed)
                    }
                  }}
                  onSaveAdditionalWeeks={saveAdditionalWeeks}
                  onCancelRegistration={cancelRegistration}
                  onRequestRefund={requestRefund}
                  isPending={isPending}
                  camps={camps}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
