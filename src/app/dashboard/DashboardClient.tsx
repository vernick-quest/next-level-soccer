'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removePendingCampRegistration, type DashboardCamp } from './actions'

export default function DashboardClient({ initialCamps }: { initialCamps: DashboardCamp[] }) {
  const [camps, setCamps] = useState(initialCamps)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function removeCamp(camp: DashboardCamp) {
    setMessage(null)
    startTransition(async () => {
      const result = await removePendingCampRegistration({
        submissionId: camp.submissionId,
        childId: camp.childId,
        week: camp.week,
      })
      if (!result.success) {
        setMessage(result.error)
        return
      }
      setCamps((prev) =>
        prev.filter(
          (c) =>
            !(
              c.submissionId === camp.submissionId &&
              c.childId === camp.childId &&
              c.week === camp.week
            ),
        ),
      )
      router.refresh()
    })
  }

  return (
    <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-extrabold text-[#062744] mb-2">Parent Dashboard</h1>
        <p className="text-slate-600 mb-8">View your player registrations and current camp status.</p>

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
            {camps.map((camp) => (
              <div
                key={`${camp.submissionId}-${camp.childId}-${camp.week}`}
                className="bg-white border border-[#e8d8ce] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  {camp.childPhotoUrl ? (
                    <img
                      src={camp.childPhotoUrl}
                      alt={camp.childName}
                      className="w-12 h-12 rounded-full object-cover border border-[#e8d8ce]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-[#e8d8ce] flex items-center justify-center text-xs text-slate-500">
                      No photo
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-900">{camp.childName}</div>
                    <div className="text-sm text-slate-600">{camp.week}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      camp.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {camp.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </span>
                  {camp.status === 'pending' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeCamp(camp)}
                      className="text-sm font-semibold text-[#c24a22] hover:text-[#9b3e1f] underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
