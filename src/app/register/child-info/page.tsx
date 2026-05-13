import { redirect } from 'next/navigation'

/** Onboarding entry used after OAuth when the parent account has no children on file yet. */
export default function RegisterChildInfoEntryPage() {
  redirect('/register')
}
