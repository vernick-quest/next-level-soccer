import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import RegistrationForm from './RegistrationForm'

export const metadata = {
  title: 'Register | Next Level Soccer SF',
  description: 'Create your parent account and register for Next Level Soccer Development Camps at Beach Chalet.',
}

export default function RegisterPage() {
  return (
    <>
      <Navbar />

      {/* Page header */}
      <div className="bg-gradient-to-br from-[#041f36] to-[#062744] pt-32 pb-16 text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-[#ffb596] text-sm font-medium hover:text-[#ffd7c8] mb-6">
          ← Back to Home
        </Link>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
          Register for Camp
        </h1>
        <p className="text-slate-400 text-lg max-w-lg mx-auto">
          Step 1 includes signing in or creating your account. Competitive middle school club players train Monday–Friday,
          3:30–7:30 PM at Beach Chalet.
        </p>
      </div>

      {/* Form */}
      <main className="bg-[#f7f2e8] py-16 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <RegistrationForm />
        </div>
      </main>

      <Footer />
    </>
  )
}
