import { createClient } from '@/lib/supabase/server'
import { getStaffAdminUser } from '@/lib/admin'
import { listPlayersForCoach } from './actions'
import CoachesSignIn from './CoachesSignIn'
import CoachesWrongAccount from './CoachesWrongAccount'
import CoachReportForm from './CoachReportForm'

export const metadata = {
  title: "Coach's View | Next Level Soccer SF",
  description: 'Save player evaluation reports for registered players.',
}

export default async function CoachesPage() {
  const staffUser = await getStaffAdminUser()
  if (!staffUser?.email) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      return <CoachesWrongAccount />
    }
    return <CoachesSignIn />
  }

  const { players, error } = await listPlayersForCoach()

  if (error === 'fetch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f2e8] px-4">
        <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 max-w-md text-center text-slate-700">
          Could not load players. Confirm you ran the <code className="text-xs bg-slate-100 px-1 rounded">player_reports</code>{' '}
          SQL in Supabase and that you are signed in.
        </div>
      </div>
    )
  }

  return <CoachReportForm players={players} />
}
