import { Resend } from 'resend'

/** Staff-initiated registration / week changes (must be verified in Resend). */
export const COACH_OVERRIDE_FROM = 'Next Level Soccer <noreply@nextlevelsoccersf.com>'
export const COACH_OVERRIDE_REPLY_TO = 'nextlevelsoccersf@gmail.com'

export async function sendCoachOverrideEmail(args: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = typeof process.env.RESEND_API_KEY === 'string' ? process.env.RESEND_API_KEY.trim() : ''
  if (!apiKey) {
    return { ok: false, message: 'RESEND_API_KEY is not set.' }
  }
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: COACH_OVERRIDE_FROM,
    replyTo: COACH_OVERRIDE_REPLY_TO,
    to: args.to,
    subject: args.subject,
    html: args.html,
  })
  if (error) {
    return { ok: false, message: typeof error === 'string' ? error : JSON.stringify(error) }
  }
  return { ok: true }
}
