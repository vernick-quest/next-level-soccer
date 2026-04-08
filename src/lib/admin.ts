/** Admin access: set ADMIN_EMAIL in the server environment (defaults to placeholder for local dev). */
export function isAdminEmail(email: string | undefined | null): boolean {
  const configured = (process.env.ADMIN_EMAIL ?? 'your-email@gmail.com').trim().toLowerCase()
  if (!email) return false
  return email.trim().toLowerCase() === configured
}
