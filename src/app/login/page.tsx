import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import LoginForm from './LoginForm'

export const metadata = {
  title: 'Log in | Next Level Soccer SF',
  description:
    'Log in with Google or email to open your parent dashboard. New families create an account first, then register for camp.',
}

function LoginFallback() {
  return (
    <div className="max-w-md w-full bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm text-center text-slate-600 text-sm">
      Loading…
    </div>
  )
}

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-br from-[#041f36] to-[#062744] pt-28 pb-10 text-center px-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Log in</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Log in here to open your parent dashboard. New to camp? Create your account first, then complete registration
          for your players.
        </p>
      </div>
      <main className="bg-[#f7f2e8] min-h-screen py-12 px-4 flex justify-center">
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
