import Link from 'next/link'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import RegistrationForm from './RegistrationForm'

export const metadata = {
  title: 'Register | Next Level Soccer SF',
  description: 'Complete camp registration after signing in to your parent account.',
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ additionalChild?: string }>
}) {
  const sp = await searchParams
  const additionalChildMode = sp.additionalChild === '1'
  const registerPath = '/register' + (additionalChildMode ? '?additionalChild=1' : '')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(registerPath)}`)
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
            ? 'Parent details load from your account — add the new player’s information below.'
            : 'You&apos;re signed in. Add parent contact details (if needed) and each player&apos;s information to reserve camp weeks.'}
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
