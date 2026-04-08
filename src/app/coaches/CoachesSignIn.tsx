import StaffGoogleSignIn from '@/components/StaffGoogleSignIn'

export default function CoachesSignIn() {
  return (
    <StaffGoogleSignIn
      nextPath="/coaches"
      title="Coach's View"
      description="Sign in with Google using a staff admin account. The site owner adds authorized emails under Admin → Manage staff admins."
      backHref="/"
    />
  )
}
