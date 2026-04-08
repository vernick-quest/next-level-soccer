import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { getStaffAdminUser, isOwnerEmail } from '@/lib/admin'
import { listAdminRows } from './actions'
import AdminTable from './AdminTable'

export const metadata = {
  title: 'Admin | Next Level Soccer SF',
  description: 'Registration master list and payment tools.',
}

export default async function AdminPage() {
  const staffUser = await getStaffAdminUser()
  if (!staffUser?.email) {
    redirect('/admin/login?next=%2Fadmin')
  }
  const showStaffLink = isOwnerEmail(staffUser.email)

  const result = await listAdminRows()
  if (result.error === 'fetch') {
    return (
      <>
        <Navbar />
        <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16 px-4">
          <div className="max-w-2xl mx-auto bg-white border border-[#e8d8ce] rounded-2xl p-8 text-center text-slate-700">
            Could not load registrations. Check your Supabase connection and try again.
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <h1 className="text-3xl font-extrabold text-[#062744] mb-2">Admin — Registrations</h1>
          <p className="text-slate-600 mb-8 max-w-3xl">
            All camp weeks across every family submission. Sort by column headers. Mark a family as paid to confirm their
            registration, then send the welcome email. Edit report cards opens the same evaluation form as Coach&apos;s View.
          </p>
          <AdminTable initialRows={result.rows} showStaffLink={showStaffLink} />
        </div>
      </main>
      <Footer />
    </>
  )
}
