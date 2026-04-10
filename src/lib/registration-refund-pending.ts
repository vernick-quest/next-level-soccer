/** Whether this registration row has a parent-requested refund pending for its camp week. */
export function registrationRefundPending(row: {
  camp_session: string
  refund_requested_weeks: string[] | null
  status: string | null
}): boolean {
  if ((row.status ?? '').toLowerCase() !== 'confirmed') return false
  const cs = (row.camp_session ?? '').trim()
  if (!cs) return false
  const refunds = row.refund_requested_weeks ?? []
  return refunds.some((w) => (w ?? '').trim() === cs)
}
