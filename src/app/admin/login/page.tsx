import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import StaffGoogleSignIn from '@/components/StaffGoogleSignIn'

export const metadata = {
  title: 'Staff sign in | Next Level Soccer SF',
  description: 'Google sign-in for camp staff — approvals and report cards.',
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const sp = await searchParams
  const raw = sp.next ?? '/admin'
  const nextPath = raw.startsWith('/') ? raw : '/admin'

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-br from-[#041f36] to-[#062744] pt-28 pb-6 text-center px-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Staff</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Approvals, registrations, and report cards — Google sign-in only.
        </p>
      </div>
      <main className="min-h-[50vh]">
        <StaffGoogleSignIn
          nextPath={nextPath}
          title="Sign in with Google"
          description="Use the Google account your site owner invited for admin access. Parent logins (email/password or magic link) cannot open this area."
          backHref="/"
        />
      </main>
      <Footer />
    </>
  )
}
