import Link from 'next/link'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getStaffAdminUser, isOwnerEmail } from '@/lib/admin'
import { listStaffAdminEmailsAction } from './actions'
import StaffEmailsForm from './StaffEmailsForm'

export const metadata = {
  title: 'Staff admins | Next Level Soccer SF',
  description: 'Invite Google accounts for camp approvals and report cards.',
}

export default async function AdminStaffPage() {
  const user = await getStaffAdminUser()
  if (!user?.email) {
    redirect('/admin/login?next=%2Fadmin%2Fstaff')
  }
  if (!isOwnerEmail(user.email)) {
    redirect('/admin')
  }

  const result = await listStaffAdminEmailsAction()
  if ('error' in result) {
    return (
      <>
        <Navbar />
        <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16 px-4">
          <div className="max-w-lg mx-auto bg-white border border-[#e8d8ce] rounded-2xl p-8 text-slate-700 text-sm">
            {result.error}
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/admin"
            className="inline-block text-sm text-[#f05a28] font-semibold hover:underline mb-6"
          >
            ← Back to registrations
          </Link>
          <h1 className="text-3xl font-extrabold text-[#062744] mb-2">Staff admins</h1>
          <p className="text-slate-600 text-sm mb-8">
            You are signed in as the site owner. Add or remove people who can mark payments, send welcome emails, and edit
            weekly report cards. Everyone must use <strong className="text-[#062744]">Google sign-in</strong> with the email
            you list here.
          </p>
          <StaffEmailsForm initialRows={result.emails} />
        </div>
      </main>
      <Footer />
    </>
  )
}
