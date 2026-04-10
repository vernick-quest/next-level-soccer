import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import RegistrationForm from './RegistrationForm'

export const metadata = {
  title: 'Register | Next Level Soccer SF',
  description: 'Create your parent account and register for Next Level Soccer Development Camps at Beach Chalet.',
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ additionalChild?: string }>
}) {
  const sp = await searchParams
  const additionalChildMode = sp.additionalChild === '1'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && !additionalChildMode) {
    return (
      <>
        <Navbar />
        <div className="bg-gradient-to-br from-[#041f36] to-[#062744] pt-32 pb-12 text-center px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-[#ffb596] text-sm font-medium hover:text-[#ffd7c8] mb-6">
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">You&apos;re signed in</h1>
          <p className="text-slate-400 text-base max-w-lg mx-auto">
            Registration for new families is only available before you sign in. Use your dashboard to manage camp weeks, or add
            another player to your family below.
          </p>
        </div>
        <main className="bg-[#f7f2e8] py-16 min-h-screen px-4">
          <div className="max-w-lg mx-auto bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm text-center space-y-4">
            <p className="text-slate-700 text-sm leading-relaxed">
              To register a <strong>new</strong> family account, sign out first, then open Register again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/dashboard"
                className="inline-flex justify-center bg-[#062744] text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-[#041f36] transition-colors"
              >
                Go to dashboard
              </Link>
              <Link
                href="/register?additionalChild=1"
                className="inline-flex justify-center border-2 border-[#f05a28] text-[#f05a28] font-semibold px-6 py-3 rounded-full text-sm hover:bg-[#fff8f3] transition-colors"
              >
                Add another player
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      {/* Page header */}
      <div className="bg-gradient-to-br from-[#041f36] to-[#062744] pt-32 pb-16 text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-[#ffb596] text-sm font-medium hover:text-[#ffd7c8] mb-6">
          ← Back to Home
        </Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
          {additionalChildMode ? 'Add another player' : 'Register for Camp'}
        </h1>
        <p className="text-slate-400 text-lg max-w-lg mx-auto">
          {additionalChildMode
            ? 'Parent details load from your account when you sign in — add the new player’s information below.'
            : 'Step 1 includes signing in or creating your account. Competitive middle school club players train Monday–Friday, 3:30–7:30 PM at Beach Chalet.'}
        </p>
      </div>

      {/* Form */}
      <main className="bg-[#f7f2e8] py-16 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <RegistrationForm additionalChildMode={additionalChildMode} />
        </div>
      </main>

      <Footer />
    </>
  )
}
