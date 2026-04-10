import { createClient } from '@/lib/supabase/server'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { getStaffAdminUser } from '@/lib/admin'
import { loadAllResolvedEmailTemplates } from '@/lib/email-templates-resolve'
import { listCoachRegistrations, listCoachWeekReportRows } from './actions'
import CoachesSignIn from './CoachesSignIn'
import CoachesWrongAccount from './CoachesWrongAccount'
import CoachPortal from './CoachPortal'
import type { CoachWeekPlayerRow } from './actions'

export const metadata = {
  title: "Coach's Portal | Next Level Soccer SF",
  description: 'Confirm camp registrations and submit weekly player report cards.',
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

  const [regsRes, emailBundle, ...weekSlices] = await Promise.all([
    listCoachRegistrations(),
    loadAllResolvedEmailTemplates(),
    ...CAMP_SESSIONS.map((w) => listCoachWeekReportRows(w)),
  ])

  if (regsRes.error === 'fetch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f2e8] px-4">
        <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 max-w-md text-center text-slate-700">
          Could not load portal data. Confirm Supabase SQL is applied (including{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">registrations</code> and{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">player_reports</code>) and that you are signed in as staff.
        </div>
      </div>
    )
  }

  const initialWeekPlayers: Record<string, CoachWeekPlayerRow[]> = {}
  CAMP_SESSIONS.forEach((w, i) => {
    const slice = weekSlices[i]
    initialWeekPlayers[w] = slice?.players ?? []
  })

  return (
    <CoachPortal
      initialRegistrations={regsRes.rows}
      initialWeekPlayers={initialWeekPlayers}
      initialEmailTemplateBundle={emailBundle}
    />
  )
}
