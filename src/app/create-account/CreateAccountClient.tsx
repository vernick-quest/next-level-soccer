'use client'

import Link from 'next/link'
import GoogleOAuthButton from '@/components/GoogleOAuthButton'
import ParentEmailAuthPanel from '@/components/ParentEmailAuthPanel'

export default function CreateAccountClient({ continuePath }: { continuePath: string }) {
  const safeNext = continuePath.startsWith('/') ? continuePath : `/${continuePath}`

  return (
    <div className="max-w-md w-full bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#062744] mb-1">Create your parent account</h1>
      <p className="text-slate-600 text-sm mb-6 leading-relaxed">
        Use Google or email to create an account. After you verify your email (if required) and log in, you&apos;ll
        complete your camper registration on the next page — no player details are collected until you&apos;re signed
        in.
      </p>

      <div className="mb-5">
        <GoogleOAuthButton nextPath={safeNext} label="Continue with Google" />
      </div>

      <ParentEmailAuthPanel variant="createAccount" redirectPath={safeNext} />

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(safeNext)}`}
          className="text-[#f05a28] font-semibold hover:underline"
        >
          Log in
        </Link>
        <span className="mx-2 text-slate-400">·</span>
        <Link href="/" className="text-[#213c57] font-medium hover:underline">
          Home
        </Link>
      </p>
    </div>
  )
}
