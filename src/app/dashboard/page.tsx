import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { isRefundWindowOpenPacific } from '@/lib/refund-deadline'
import { getDashboardPageData } from './actions'
import DashboardClient from './DashboardClient'

export const metadata = {
  title: 'Dashboard | Next Level Soccer SF',
  description: 'Parent Portal dashboard for camp registrations.',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="bg-[#f7f2e8] min-h-screen pt-28 pb-16">
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-center">
              <h1 className="text-2xl font-extrabold text-[#062744] mb-3">Parent Dashboard</h1>
              <p className="text-slate-600 mb-6">
                Already registered before? Sign in to your parent account. New to camp this season? Start on registration
                — that flow creates your account.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/login?next=%2Fdashboard"
                  className="inline-block bg-[#062744] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#041f36] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="inline-block bg-[#f05a28] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#d94e21] transition-colors"
                >
                  Register for camp
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const { camps, incremental, children } = await getDashboardPageData()
  const refundWindowOpen = isRefundWindowOpenPacific()

  return (
    <>
      <Navbar />
      <DashboardClient initialCamps={camps} incremental={incremental} children={children} refundWindowOpen={refundWindowOpen} />
      <Footer />
    </>
  )
}
