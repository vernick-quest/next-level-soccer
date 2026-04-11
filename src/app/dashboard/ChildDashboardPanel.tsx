'use client'

import { campNameFromWeekLabel, campDatesFromWeekLabel } from '@/lib/camp-display'
import { CAMP_WEEK_PRICE_CENTS } from '@/lib/camp-pricing'
import { REFUND_DEADLINE_LABEL } from '@/lib/refund-deadline'
import ChildAvatar from '@/components/ChildAvatar'
import ChildPhotoUploader from '@/components/ChildPhotoUploader'
import ReportSkillsGrid from './ReportSkillsGrid'
import type {
  DashboardCamp,
  DashboardChildView,
  DashboardIncrementalChild,
  DashboardWeekStatus,
  DashboardWeekTile,
} from './actions'

function formatDashboardTimestamp(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatUsdFromCents(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function weekStatusLabel(status: DashboardWeekStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Paid / confirmed'
    case 'confirmed_with_discount':
      return 'Paid / confirmed (staff discount)'
    case 'pending':
      return 'Registered (payment pending)'
    case 'refund_requested':
      return 'Refund requested'
    case 'declined':
      return 'Declined'
    case 'completed':
      return 'Camp complete'
    case 'refund_processing':
      return 'Refund processing'
    case 'refund_completed':
      return 'Refund completed'
    case 'refund_denied':
      return 'Refund not approved'
    case 'organizer_cancelled':
      return 'Camp cancelled (low enrollment)'
    case 'addable':
      return 'Available to add'
    case 'full':
      return 'Full'
    case 'unavailable':
      return 'Not available online'
    default:
      return status
  }
}

function weekTileClasses(status: DashboardWeekStatus): string {
  const base = 'rounded-xl border-2 px-3 py-2.5 text-left transition-colors'
  switch (status) {
    case 'confirmed':
      return `${base} border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm`
    case 'confirmed_with_discount':
      return `${base} border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-amber-400/70 ring-offset-1`
    case 'pending':
      return `${base} border-amber-400 bg-amber-50 text-amber-950`
    case 'refund_requested':
      return `${base} border-violet-400 bg-violet-50 text-violet-950`
    case 'declined':
      return `${base} border-rose-400 bg-rose-50 text-rose-950`
    case 'completed':
      return `${base} border-teal-500 bg-teal-50 text-teal-950 shadow-sm`
    case 'refund_processing':
      return `${base} border-amber-500 bg-amber-50 text-amber-950`
    case 'refund_completed':
      return `${base} border-sky-500 bg-sky-50 text-sky-950`
    case 'refund_denied':
      return `${base} border-rose-300 bg-rose-50/90 text-rose-900`
    case 'organizer_cancelled':
      return `${base} border-slate-500 bg-slate-100 text-slate-900`
    case 'addable':
      return `${base} border-[#f05a28] bg-white text-[#062744] hover:bg-[#fff8f3] shadow-sm`
    case 'full':
      return `${base} border-slate-200 bg-slate-100 text-slate-600`
    case 'unavailable':
    default:
      return `${base} border-slate-200/90 bg-slate-50/90 text-slate-500`
  }
}

function findCamp(camps: DashboardCamp[], registrationId: string | null): DashboardCamp | undefined {
  if (!registrationId) return undefined
  return camps.find((c) => c.registrationId === registrationId)
}

/** Shorter tile title: “Unavailable” when copy matches low-enrollment / week-cancel style reasons. */
function declinedShortTitle(declineReason: string | null | undefined): 'Declined' | 'Unavailable' {
  const r = (declineReason ?? '').trim().toLowerCase()
  if (
    r.includes('minimum enrollment') ||
    r.includes('low enrollment') ||
    r.includes('camp week cancelled') ||
    r.includes('not met')
  ) {
    return 'Unavailable'
  }
  return 'Declined'
}

function weekStatusTitle(tile: DashboardWeekTile, camps: DashboardCamp[]): string {
  if (tile.status !== 'declined') return weekStatusLabel(tile.status)
  const camp = findCamp(camps, tile.registrationId)
  return declinedShortTitle(camp?.declineReason)
}

function weekStatusFootnote(tile: DashboardWeekTile, camps: DashboardCamp[]) {
  const camp = tile.registrationId ? findCamp(camps, tile.registrationId) : undefined
  if (!camp) return null
  if (tile.status === 'completed' && camp.campCompletedAt) {
    return (
      <p className="text-[10px] text-teal-900 mt-1.5 leading-snug">
        No further online refunds for this week. Completed {formatDashboardTimestamp(camp.campCompletedAt)}.
      </p>
    )
  }
  if (tile.status === 'refund_completed' && camp.refundMoneySentAt) {
    return (
      <p className="text-[10px] text-sky-900 mt-1.5 font-medium leading-snug">
        We&apos;ve recorded that your refund was sent ({formatDashboardTimestamp(camp.refundMoneySentAt)}).
      </p>
    )
  }
  if (tile.status === 'refund_processing') {
    return (
      <p className="text-[10px] text-amber-900 mt-1.5 leading-snug">
        Staff approved your refund; you&apos;ll see another update here once the payment has gone out.
      </p>
    )
  }
  if (tile.status === 'refund_denied' && camp.refundDenialReason?.trim()) {
    return (
      <p className="text-[10px] text-rose-900 mt-1.5 leading-snug">
        <span className="font-semibold">Reason: </span>
        {camp.refundDenialReason}
      </p>
    )
  }
  if (tile.status === 'declined') {
    const reason = camp.declineReason?.trim()
    if (reason) {
      return (
        <p className="text-[10px] text-rose-900 mt-1.5 leading-snug">
          <span className="font-semibold">Reason from staff: </span>
          <span className="whitespace-pre-wrap">{reason}</span>
        </p>
      )
    }
    return (
      <p className="text-[10px] text-rose-800 mt-1.5 leading-snug">
        Staff declined this registration. No reason was saved — email us if you need details.
      </p>
    )
  }
  if (tile.status === 'confirmed_with_discount' && camp.coachDiscountCents > 0) {
    const due = Math.max(0, CAMP_WEEK_PRICE_CENTS - camp.coachDiscountCents)
    return (
      <p className="text-[10px] text-emerald-900 mt-1.5 leading-snug">
        <span className="font-semibold">Staff discount applied: </span>
        {formatUsdFromCents(camp.coachDiscountCents)} off the standard week price of {formatUsdFromCents(CAMP_WEEK_PRICE_CENTS)}. Amount due for this week:{' '}
        <span className="font-semibold">{formatUsdFromCents(due)}</span> (your registration total was updated).
      </p>
    )
  }
  if (tile.status === 'organizer_cancelled' && camp.organizerCancelledAt) {
    if (camp.refundMoneySentAt) {
      return (
        <p className="text-[10px] text-slate-800 mt-1.5 leading-snug">
          <span className="font-semibold">Staff cancelled this week</span> (not a parent refund request). Minimum
          enrollment was not met. Your payment refund is recorded as sent{' '}
          {formatDashboardTimestamp(camp.refundMoneySentAt)}.
        </p>
      )
    }
    return (
      <p className="text-[10px] text-slate-800 mt-1.5 leading-snug">
        <span className="font-semibold">Staff cancelled this week</span> (not a parent refund request). Minimum
        enrollment was not met. No payment had been finalized for this week.
      </p>
    )
  }
  return null
}

export default function ChildDashboardPanel({
  child,
  incrementalChild,
  refundWindowOpen,
  canSubmitIncremental,
  showPaidFamilyBanner,
  extraWeekSelection,
  onToggleExtraWeek,
  onSaveAdditionalWeeks,
  onCancelRegistration,
  onRequestRefund,
  isPending,
  camps,
}: {
  child: DashboardChildView
  incrementalChild: DashboardIncrementalChild | null
  refundWindowOpen: boolean
  canSubmitIncremental: boolean
  /** True when no child on the account still has a pending-payment submission (additional weeks closed online). */
  showPaidFamilyBanner: boolean
  extraWeekSelection: Set<string>
  onToggleExtraWeek: (week: string, allowed: boolean) => void
  onSaveAdditionalWeeks: () => void
  onCancelRegistration: (camp: DashboardCamp) => void
  onRequestRefund: (camp: DashboardCamp) => void
  isPending: boolean
  camps: DashboardCamp[]
}) {
  const name = `${child.firstName} ${child.lastName}`.trim()
  const showIncremental = !!incrementalChild && !!child.registrationChildId

  function weekActions(tile: DashboardWeekTile) {
    const camp = tile.registrationId ? findCamp(camps, tile.registrationId) : undefined
    if (!camp) return null
    const canCancel = camp.displayStatus === 'pending'
    const isPaidConfirmed =
      camp.displayStatus === 'confirmed' || camp.displayStatus === 'confirmed_with_discount'
    const canRequestRefund = refundWindowOpen && isPaidConfirmed
    if (!canCancel && !isPaidConfirmed) return null
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {canCancel && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onCancelRegistration(camp)}
            className="text-xs font-semibold text-[#c24a22] hover:text-[#9b3e1f] border border-[#f0c4b8] rounded-full px-3 py-1 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        {isPaidConfirmed && (
          <>
            <button
              type="button"
              disabled={isPending || !canRequestRefund}
              onClick={() => canRequestRefund && onRequestRefund(camp)}
              className="text-xs font-semibold rounded-full px-3 py-1 border border-[#e8d8ce] text-[#213c57] disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-[#f7f2e8]"
            >
              Request refund
            </button>
            {!refundWindowOpen && (
              <span className="text-[10px] text-slate-500 w-full">Refund deadline passed ({REFUND_DEADLINE_LABEL})</span>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
        {child.registrationChildId ? (
          <ChildPhotoUploader
            registrationChildId={child.registrationChildId}
            initialPhotoUrl={child.photoUrl}
            label={name}
            sizeClass="w-16 h-16"
          />
        ) : (
          <div className="flex items-center gap-3">
            <ChildAvatar photoUrl={child.photoUrl} alt={name} sizeClass="w-16 h-16" />
            <p className="text-sm text-slate-600">Add a photo from your registration when you enroll a player in a full season.</p>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-[#062744]">{name}</h2>
          <p className="text-sm text-slate-600 mt-1">
            Each week shows camp status, then coach report cards (1–5) when staff have submitted them.
          </p>
        </div>
      </div>

      <section>
        <h3 className="text-base font-bold text-[#062744] mb-2">Camp weeks</h3>
        <div className="flex flex-wrap gap-3 text-xs mb-4 text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-600" aria-hidden />
            Paid / confirmed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-600 ring-2 ring-amber-400/80 ring-offset-0"
              aria-hidden
            />
            Paid / confirmed (staff discount)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-400 border border-amber-500" aria-hidden />
            Registered (payment pending)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-white border-2 border-[#f05a28]" aria-hidden />
            Available — use checkbox to add (pending payment)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-200 border border-slate-300" aria-hidden />
            Full / unavailable
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-violet-400 border border-violet-500" aria-hidden />
            Refund requested
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-500 border border-amber-600" aria-hidden />
            Refund processing
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-sky-400 border border-sky-600" aria-hidden />
            Refund completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-200 border border-rose-400" aria-hidden />
            Refund not approved
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-slate-500 border border-slate-700" aria-hidden />
            Camp cancelled (staff / low enrollment)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-teal-500 border border-teal-600" aria-hidden />
            Camp complete
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-300 border border-rose-500" aria-hidden />
            Declined / Unavailable (staff reason below)
          </span>
        </div>
        {showIncremental && incrementalChild?.submissionPending && (
          <p className="text-sm text-slate-600 mb-4 max-w-2xl">
            While payment is still pending, use the checkboxes on open weeks to add them to this registration, then save.
          </p>
        )}
        {showIncremental && incrementalChild && showPaidFamilyBanner && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Additional weeks can only be added online before your family registration is marked paid. For more weeks
            after payment, email nextlevelsoccersf@gmail.com.
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          {child.weeks.map((tile) => (
            <div key={tile.week} className={weekTileClasses(tile.status)}>
              <div className="font-bold text-[#062744] text-sm leading-tight">{campNameFromWeekLabel(tile.week)}</div>
              <div className="text-xs text-slate-600 mt-0.5">{campDatesFromWeekLabel(tile.week)}</div>
              {tile.status === 'addable' && incrementalChild ? (
                <label className="inline-flex items-center mt-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-2 border-[#e8d8ce] accent-[#f05a28] shrink-0"
                    checked={extraWeekSelection.has(tile.week)}
                    disabled={isPending || !incrementalChild.submissionPending}
                    onChange={() => onToggleExtraWeek(tile.week, incrementalChild.submissionPending)}
                    aria-label={`Add ${campNameFromWeekLabel(tile.week)} to pending registration`}
                  />
                </label>
              ) : (
                <div className="text-[11px] font-semibold mt-1.5 uppercase tracking-wide">
                  {weekStatusTitle(tile, camps)}
                </div>
              )}
              {weekStatusFootnote(tile, camps)}
              {weekActions(tile)}
            </div>
          ))}
        </div>
        {canSubmitIncremental && incrementalChild && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onSaveAdditionalWeeks()}
            className="mt-5 w-full sm:w-auto bg-[#062744] hover:bg-[#041f36] disabled:opacity-50 text-white font-bold py-3 px-8 rounded-full text-sm transition-colors"
          >
            {isPending ? 'Saving…' : 'Save additional weeks'}
          </button>
        )}
      </section>

      <section>
        <h3 className="text-base font-bold text-[#062744] mb-2">Coach report cards</h3>
        <p className="text-sm text-slate-600 mb-3">
          Scores are 1–5 on each skill. Empty cells mean no report has been submitted for that week yet.
        </p>
        {!child.registrationChildId && (
          <p className="text-sm text-slate-600 bg-white border border-[#e8d8ce] rounded-xl px-4 py-3">
            Report cards are linked to your full registration profile. Once your player is on file with a season
            enrollment, weekly progress will appear here.
          </p>
        )}
        {child.registrationChildId && (
          <ReportSkillsGrid reportsByWeekKey={child.reportsByWeekKey} />
        )}
      </section>

    </div>
  )
}
