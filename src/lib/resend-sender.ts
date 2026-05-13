/** Resend "from" — set `RESEND_FROM_EMAIL` in env to a verified Resend sender; else production default. */
export const SENDER_EMAIL = (() => {
  const raw = process.env.RESEND_FROM_EMAIL
  if (!raw?.trim()) return 'Next Level Soccer <info@nextlevelsoccersf.com>'
  return raw.trim().replace(/^["']|["']$/g, '')
})()

/** Shared ops inbox (replies, internal registration receipts). */
export const OPS_INBOX_EMAIL = 'nextlevelsoccersf@gmail.com'

/** Reply-To header (Gmail inbox for replies). */
export const REPLY_TO_EMAIL = OPS_INBOX_EMAIL

/** Internal copy of registration receipts (same inbox as reply-to). */
export const REGISTRATION_RECEIPT_EMAIL = OPS_INBOX_EMAIL
