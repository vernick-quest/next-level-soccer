import { createClient } from '@/lib/supabase/server'
import { getStaffAdminUser } from '@/lib/admin'
import CoachesSignIn from '@/app/coaches/CoachesSignIn'
import CoachesWrongAccount from '@/app/coaches/CoachesWrongAccount'
import { CoachAreaHeader } from '../CoachAreaHeader'
import CoachManualRegistrationForm from '../CoachManualRegistrationForm'

export const metadata = {
  title: 'Manual registration | Coach Portal | Next Level Soccer SF',
  description: 'Staff-only: create a family registration on behalf of a parent.',
}

export default async function CoachManualRegistrationPage() {
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

  return (
    <div className="min-h-screen bg-[#f7f2e8] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <CoachAreaHeader
          title="Manual registration"
          subtitle="Use when a parent hits technical issues. Requires their existing account email and SUPABASE_SERVICE_ROLE_KEY on the server."
        />
        <CoachManualRegistrationForm />
      </div>
    </div>
  )
}
