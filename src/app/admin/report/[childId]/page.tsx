import { notFound, redirect } from 'next/navigation'
import { getStaffAdminUser } from '@/lib/admin'
import { listPlayersForCoach } from '@/app/coaches/actions'
import CoachReportForm from '@/app/coaches/CoachReportForm'

export const metadata = {
  title: 'Edit report card | Admin',
  description: 'Player evaluation report (1–5 metrics).',
}

export default async function AdminReportPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params

  const staffUser = await getStaffAdminUser()
  if (!staffUser?.email) {
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/report/${childId}`)}`)
  }

  const { players, error } = await listPlayersForCoach()
  if (error === 'fetch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f2e8] px-4">
        <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 max-w-md text-center text-slate-700">
          Could not load players. Confirm you are signed in and the database is available.
        </div>
      </div>
    )
  }

  if (!players.some((p) => p.id === childId)) {
    notFound()
  }

  return (
    <CoachReportForm
      players={players}
      initialChildId={childId}
      pageTitle="Edit report card"
      backHref="/admin"
      signOutRedirect="/admin"
    />
  )
}
