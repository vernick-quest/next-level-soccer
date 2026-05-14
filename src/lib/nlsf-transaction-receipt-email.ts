import { Resend } from 'resend'
import { campDatesFromWeekLabel, campNameFromWeekLabel } from '@/lib/camp-display'
import { escapeHtml } from '@/lib/html-escape'
import {
  getResendApiKeyOrNull,
  REPLY_TO_EMAIL,
  SENDER_EMAIL,
  TRANSACTION_RECEIPT_EMAIL,
} from '@/lib/resend-sender'

/** Human-readable camp week label + date range for receipt sentences. */
export function nlsfCampWeekDetailPhrase(weekKey: string): string {
  const w = (weekKey ?? '').trim()
  if (!w) return '—'
  return `${campNameFromWeekLabel(w)} (${campDatesFromWeekLabel(w)})`
}

export type NlsfTransactionLine = {
  parentDisplayName: string
  childDisplayName: string
  /** e.g. Registered, Added, Canceled, Moved */
  actionLabel: string
  /** Completes “… for [campWeekTail].” (may include “from … to …” for moves). */
  campWeekTail: string
}

function sanitizeSubjectSegment(s: string): string {
  return (s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 96) || '—'
}

/**
 * Internal admin receipt: `nextlevelsoccersf@gmail.com`, noreply sender, fixed subject prefix.
 * No-ops when `RESEND_API_KEY` is missing (see `getResendApiKeyOrNull` warning).
 */
export async function sendNlsfTransactionReceiptEmail(args: {
  logContext: string
  subjectParentName: string
  subjectActionType: string
  lines: NlsfTransactionLine[]
  htmlAppendix?: string
}): Promise<void> {
  if (!args.lines.length && !(args.htmlAppendix ?? '').trim()) return

  const apiKey = getResendApiKeyOrNull(args.logContext)
  if (!apiKey) return

  const inner = args.lines.length
    ? args.lines
        .map(
          (l) =>
            `<p style="margin:0.5rem 0;">${escapeHtml(l.parentDisplayName)} for their child ${escapeHtml(l.childDisplayName)} did <strong>${escapeHtml(l.actionLabel)}</strong> for ${escapeHtml(l.campWeekTail)}.</p>`,
        )
        .join('')
    : ''

  const appendix = (args.htmlAppendix ?? '').trim()
    ? `<div style="margin-top:1rem;">${args.htmlAppendix}</div>`
    : ''

  const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:640px;line-height:1.55;color:#0f172a;font-size:15px;">
${inner}
${appendix}
<p style="margin-top:1.25rem;font-size:0.8rem;color:#64748b;">Automated internal transaction receipt — Next Level Soccer SF.</p>
</div>`

  const subject = `[NLSF Transaction] ${sanitizeSubjectSegment(args.subjectParentName)} - ${sanitizeSubjectSegment(args.subjectActionType)}`

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: SENDER_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    to: TRANSACTION_RECEIPT_EMAIL,
    subject,
    html,
  })
  if (error) {
    console.error(`[${args.logContext}] NLSF transaction receipt Resend error:`, error)
  }
}
