/** Refund requests allowed through May 31, 2026 (Pacific). Closed starting June 1, 2026. */

export function isRefundWindowOpenPacific(): boolean {
  const now = new Date()
  const la = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return la < '2026-06-01'
}

export const REFUND_DEADLINE_LABEL = 'June 1st'
