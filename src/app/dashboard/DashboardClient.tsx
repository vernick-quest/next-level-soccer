'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { campNameFromWeekLabel, campDatesFromWeekLabel } from '@/lib/camp-display'
import { REFUND_DEADLINE_LABEL } from '@/lib/refund-deadline'
import {
  removePendingCampRegistration,
  requestRefundForCamp,
  type DashboardCamp,
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

export default function DashboardClient({
  initialCamps,
  refundWindowOpen,
}: {
  initialCamps: DashboardCamp[]
  refundWindowOpen: boolean
}) {
  const [camps, setCamps] = useState(initialCamps)
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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
        <h1 className="text-3xl font-extrabold text-[#062744] mb-1">Parent Dashboard</h1>
        <p className="text-slate-600 mb-2 font-medium text-[#213c57]">Manage registrations</p>
        <p className="text-slate-600 text-sm mb-8">
          Registrations are tied to your account. Each row is one camp week for one player.
        </p>

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

        {camps.length === 0 ? (
          <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-slate-600">
            No registrations yet. Go to registration to add your first player.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop table header */}
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
