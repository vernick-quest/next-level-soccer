/** Resend "from" — set `RESEND_FROM_EMAIL` in env to a verified Resend sender; else production default. */
export const SENDER_EMAIL = (() => {
  const raw = process.env.RESEND_FROM_EMAIL
  if (!raw?.trim()) return 'Next Level Soccer <info@nextlevelsoccersf.com>'
  return raw.trim().replace(/^["']|["']$/g, '')
})()

/** Reply-To header (Gmail inbox for replies). */
export const REPLY_TO_EMAIL = 'nextlevelsoccersf@gmail.com'
