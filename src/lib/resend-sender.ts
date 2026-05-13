/** Resend "from" — override with `RESEND_FROM_EMAIL` in env when set (must be verified in Resend). */
export const SENDER_EMAIL = (() => {
  const raw = process.env.RESEND_FROM_EMAIL
  if (!raw?.trim()) return 'Next Level Soccer <registration@nextlevelsoccersf.com>'
  return raw.trim().replace(/^["']|["']$/g, '')
})()

/** Parent replies and general contact (Gmail inbox). */
export const REPLY_TO_EMAIL = 'nextlevelsoccersf@gmail.com'

/** Shared ops inbox (internal registration receipts). */
export const OPS_INBOX_EMAIL = REPLY_TO_EMAIL

/** Internal copy of registration receipts. */
export const REGISTRATION_RECEIPT_EMAIL = OPS_INBOX_EMAIL
