import { Resend } from 'resend'
import { getResendApiKeyOrNull, REPLY_TO_EMAIL, SENDER_EMAIL } from '@/lib/resend-sender'

export async function sendCoachOverrideEmail(args: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = getResendApiKeyOrNull('sendCoachOverrideEmail')
  if (!apiKey) {
    return { ok: false, message: 'RESEND_API_KEY is not set.' }
  }
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: SENDER_EMAIL,
    replyTo: REPLY_TO_EMAIL,
    to: args.to,
    subject: args.subject,
    html: args.html,
  })
  if (error) {
    return { ok: false, message: typeof error === 'string' ? error : JSON.stringify(error) }
  }
  return { ok: true }
}
