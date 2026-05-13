import { escapeHtml } from '@/lib/html-escape'

export type RegistrationOpsReceiptKind = 'new_registration' | 'additional_weeks'

/** Staff-facing receipt: parent contact, submission id, week lines, amount. */
export function buildRegistrationOpsReceiptHtml(p: {
  kind: RegistrationOpsReceiptKind
  submissionId: string
  authUserId: string
  parentFullName: string
  parentEmail: string
  parentPhone: string
  /** Pre-built <li>…</li> rows; wrapped in <ul> here. */
  newWeekListItemHtml: string
  amountDollars: string
  weekCount: number
}): string {
  const kindLabel =
    p.kind === 'new_registration' ? 'New family registration' : 'Additional camp weeks (dashboard)'
  const list = p.newWeekListItemHtml.trim()
    ? `<ul style="margin:0;padding-left:1.25rem;">${p.newWeekListItemHtml}</ul>`
    : '<p style="color:#64748b;">No week rows (unexpected).</p>'

  return `
  <div style="font-family:system-ui,sans-serif;max-width:640px;line-height:1.5;color:#0f172a;">
    <h1 style="color:#062744;font-size:1.25rem;margin:0 0 0.75rem;">Registration receipt</h1>
    <p style="margin:0.35rem 0;"><strong>Type:</strong> ${escapeHtml(kindLabel)}</p>
    <p style="margin:0.35rem 0;"><strong>Submission ID:</strong> ${escapeHtml(p.submissionId)}</p>
    <p style="margin:0.35rem 0;"><strong>Auth user ID:</strong> ${escapeHtml(p.authUserId)}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0;" />
    <p style="margin:0.35rem 0;"><strong>Parent / guardian:</strong> ${escapeHtml(p.parentFullName)}</p>
    <p style="margin:0.35rem 0;"><strong>Email:</strong> ${escapeHtml(p.parentEmail)}</p>
    <p style="margin:0.35rem 0;"><strong>Phone:</strong> ${escapeHtml(p.parentPhone || '—')}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0;" />
    <p style="margin:0 0 0.5rem;"><strong>Weeks in this transaction (${p.weekCount}):</strong></p>
    ${list}
    <p style="margin:1rem 0 0;"><strong>Amount for these week(s):</strong> ${escapeHtml(p.amountDollars)}</p>
    <p style="margin-top:1.25rem;font-size:0.875rem;color:#64748b;">Automated message from the camp registration system.</p>
  </div>`
}
