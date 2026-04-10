'use client'

import { campNameFromWeekLabel, campDatesFromWeekLabel } from '@/lib/camp-display'
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

function weekStatusLabel(status: DashboardWeekStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Paid / confirmed'
    case 'pending':
      return 'Registered (payment pending)'
    case 'refund_requested':
      return 'Refund requested'
    case 'declined':
      return 'Not confirmed'
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
    case 'pending':
      return `${base} border-amber-400 bg-amber-50 text-amber-950`
    case 'refund_requested':
      return `${base} border-violet-400 bg-violet-50 text-violet-950`
    case 'declined':
      return `${base} border-rose-400 bg-rose-50 text-rose-950`
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
    const canRequestRefund = refundWindowOpen && camp.displayStatus === 'confirmed'
    if (!canCancel && camp.displayStatus !== 'confirmed') return null
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
        {camp.displayStatus === 'confirmed' && (
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
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-300 border border-rose-500" aria-hidden />
            Not confirmed
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
                  {weekStatusLabel(tile.status)}
                </div>
              )}
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
