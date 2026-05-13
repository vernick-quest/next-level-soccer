/** Verified sender in Resend (must match a verified domain/sender). */
export const SENDER_EMAIL = 'Next Level Soccer <noreply@nextlevelsoccersf.com>'

/** Parent replies and general contact (Gmail inbox). */
export const REPLY_TO_EMAIL = 'nextlevelsoccersf@gmail.com'

/** Shared ops inbox (internal registration receipts). */
export const OPS_INBOX_EMAIL = REPLY_TO_EMAIL

/** Internal copy of registration receipts. */
export const REGISTRATION_RECEIPT_EMAIL = OPS_INBOX_EMAIL

/**
 * Returns trimmed `RESEND_API_KEY`, or `null` if unset/blank.
 * Logs a single warning when missing so callers can skip `Resend` without throwing.
 */
export function getResendApiKeyOrNull(context?: string): string | null {
  const raw = process.env.RESEND_API_KEY
  if (typeof raw !== 'string' || !raw.trim()) {
    const suffix = context ? ` (${context})` : ''
    console.warn(`[resend] RESEND_API_KEY is missing or blank${suffix}; outbound email skipped.`)
    return null
  }
  return raw.trim()
}
