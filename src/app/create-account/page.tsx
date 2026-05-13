import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CreateAccountClient from './CreateAccountClient'

export const metadata = {
  title: 'Create account | Next Level Soccer SF',
  description: 'Create a parent account with Google or email before registering for camp.',
}

function Fallback() {
  return (
    <div className="max-w-md w-full bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm text-center text-slate-600 text-sm">
      Loading…
    </div>
  )
}

type Search = { next?: string }

export default async function CreateAccountPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const next = sp.next?.startsWith('/') ? sp.next : '/register'

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-br from-[#041f36] to-[#062744] pt-28 pb-10 text-center px-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Create account</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          New families start here. You&apos;ll add parent contact details and player information after you log in.
        </p>
      </div>
      <main className="bg-[#f7f2e8] min-h-screen py-12 px-4 flex justify-center">
        <Suspense fallback={<Fallback />}>
          <CreateAccountClient continuePath={next} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
