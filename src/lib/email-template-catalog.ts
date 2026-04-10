/** Keys for parent-facing emails editable from the coach portal (structured fields). */
export const EMAIL_TEMPLATE_KEY_ORDER = [
  'registration_received',
  'welcome_to_camp',
  'additional_weeks_payment_due',
  'registration_confirmed',
  'registration_declined',
  'organizer_camp_cancelled',
  'refund_approved',
  'refund_money_sent',
  'refund_declined',
  'weekly_report',
] as const

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEY_ORDER)[number]

export type EmailTemplateFieldSpec = {
  id: string
  label: string
  multiline?: boolean
  placeholder?: string
}

export type EmailTemplateSpec = {
  label: string
  description: string
  placeholders: string
  fields: EmailTemplateFieldSpec[]
}

export const EMAIL_TEMPLATE_SPECS: Record<EmailTemplateKey, EmailTemplateSpec> = {
  registration_received: {
    label: 'Registration received (after signup)',
    description: 'Sent when a family submits the registration form.',
    placeholders:
      '{{parentFullName}} (greeting), {{amountDollars}} — week list HTML is inserted between the “new weeks” heading and amount line.',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'greetingLine', label: 'Greeting (include {{parentFullName}})' },
      { id: 'thanksLine', label: 'Opening line (after greeting)' },
      { id: 'paidSectionTitle', label: '“Paid / confirmed” section title' },
      {
        id: 'paidSectionEmptyHint',
        label: 'Text when no weeks are paid yet',
        multiline: true,
      },
      { id: 'newSectionTitle', label: '“New — payment required” section title' },
      { id: 'amountLine', label: 'Amount line (include {{amountDollars}})', multiline: true },
      { id: 'paymentInstructions', label: 'Payment instructions', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  welcome_to_camp: {
    label: 'Welcome to Camp (after payment confirmed)',
    description: 'Sent from Admin when marking a submission as paid.',
    placeholders: '{{parentFullName}} — player/week list is inserted automatically.',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'greetingLine', label: 'Greeting (include {{parentFullName}})' },
      { id: 'thankYouLine', label: 'Thank-you paragraph', multiline: true },
      { id: 'registeredListTitle', label: 'Title above the player/week list' },
      { id: 'trainingLine', label: 'Training time / logistics line', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  additional_weeks_payment_due: {
    label: 'Additional camp weeks — payment due',
    description: 'Sent when a parent adds more weeks from the dashboard.',
    placeholders: '{{parentFullName}}, {{amountDollars}} — lists are built automatically.',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'greetingLine', label: 'Greeting (include {{parentFullName}})' },
      { id: 'paidSectionTitle', label: '“Paid / confirmed” section title' },
      { id: 'newSectionTitle', label: '“New — payment required” section title' },
      { id: 'amountLine', label: 'Amount line (include {{amountDollars}})', multiline: true },
      { id: 'paymentInstructions', label: 'Payment instructions', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  registration_confirmed: {
    label: 'Registration confirmed (coach)',
    description: 'When staff confirms a pending registration after payment.',
    placeholders: '{{parentFirstName}}, {{playerName}}, {{campWeekLabel}}',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'confirmedParagraph', label: 'Confirmation paragraph', multiline: true },
      { id: 'bodyClosing', label: 'Closing paragraph', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  registration_declined: {
    label: 'Registration declined (coach)',
    description: 'When staff declines a pending registration. Staff reason appears in its own box.',
    placeholders: '{{parentFirstName}}, {{playerName}}, {{campWeekLabel}}',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'unableParagraph', label: 'Unable to confirm paragraph', multiline: true },
      { id: 'afterReasonParagraph', label: 'Paragraph after the reason box', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  organizer_camp_cancelled: {
    label: 'Camp week cancelled — low enrollment',
    description: 'When staff cancels an entire week. Different bodies for paid vs unpaid rows.',
    placeholders: '{{parentFirstName}}, {{playerName}}, {{campWeekLabel}}',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'lowEnrollmentParagraph', label: 'Low enrollment / week not running', multiline: true },
      { id: 'playerRemovedLine', label: 'Player no longer scheduled (one line)', multiline: true },
      {
        id: 'bodyPaidRefund',
        label: 'Body when parent had already paid (refund)',
        multiline: true,
        placeholder: 'Explains automatic refund and that this was staff-initiated.',
      },
      {
        id: 'bodyUnpaid',
        label: 'Body when no payment was finalized yet',
        multiline: true,
      },
      { id: 'closingParagraph', label: 'Apology / register again / questions', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  refund_approved: {
    label: 'Refund approved',
    placeholders: '{{parentFirstName}}, {{playerName}}, {{campWeekLabel}}',
    description: 'After staff approves a parent’s refund request.',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'bodyLine1', label: 'Main paragraph', multiline: true },
      { id: 'bodyLine2', label: 'Second paragraph', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  refund_money_sent: {
    label: 'Refund sent',
    description: 'When staff marks the refund as paid out.',
    placeholders: '{{parentFirstName}}, {{playerName}}, {{campWeekLabel}}',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'bodyLine1', label: 'Main paragraph', multiline: true },
      { id: 'bodyLine2', label: 'Follow-up paragraph', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  refund_declined: {
    label: 'Refund request not approved',
    description: 'When staff declines a refund. Staff reason appears in its own box.',
    placeholders: '{{parentFirstName}}, {{playerName}}, {{campWeekLabel}}',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'heading', label: 'Main heading' },
      { id: 'bodyLine1', label: 'Unable to approve paragraph', multiline: true },
      { id: 'afterReasonParagraph', label: 'Paragraph after the reason box', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
  weekly_report: {
    label: 'Weekly report card',
    description: 'Sent when a coach saves a report. Rating tables are fixed; only surrounding text is editable.',
    placeholders:
      '{{parentFirstName}}, {{childName}}, {{campWeekLabel}} — link text uses fields below.',
    fields: [
      { id: 'subjectTemplate', label: 'Subject line' },
      { id: 'headingTemplate', label: 'Main heading (use {{campWeekLabel}})' },
      {
        id: 'introBeforeLink',
        label: 'Intro — text before “report card guide” link',
        multiline: true,
      },
      {
        id: 'introAfterLink',
        label: 'Intro — text after the link (e.g. closing punctuation)',
        multiline: true,
      },
      { id: 'linkLabel', label: 'Text for the report card guide link' },
      { id: 'overviewTitle', label: '“Coach overview” section title' },
      { id: 'ratingScaleTitle', label: '“Rating scale” section title' },
      { id: 'skillsTitle', label: '“Skills assessed” section title' },
      { id: 'footerLine', label: 'Footer (before sign-off)', multiline: true },
      { id: 'signOff', label: 'Sign-off line' },
    ],
  },
}

const ORG = 'Next Level Soccer SF'
const GUIDE_URL = 'https://nextlevelsoccersf.com/report-card-skills'

/** Default copy (matches previous hardcoded emails). */
export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplateKey, Record<string, string>> = {
  registration_received: {
    subjectTemplate: `Registration received — ${ORG}`,
    heading: 'We received your registration',
    greetingLine: 'Hi {{parentFullName}},',
    thanksLine: 'Thanks for signing up.',
    paidSectionTitle: 'Paid / confirmed',
    paidSectionEmptyHint: 'None yet — spots are confirmed after we receive payment.',
    newSectionTitle: 'New — payment required',
    amountLine: 'Amount due for these camp weeks: {{amountDollars}}',
    paymentInstructions:
      'Pay via Zelle or Venmo to confirm your spots. If you have questions, reply to this email.',
    signOff: `— ${ORG}`,
  },
  welcome_to_camp: {
    subjectTemplate: `Welcome to Camp — ${ORG}`,
    heading: 'Welcome to Camp',
    greetingLine: 'Hi {{parentFullName}},',
    thankYouLine:
      'Thank you — your payment is confirmed. We’re excited to have your player(s) at Next Level Soccer Development Camps at Beach Chalet.',
    registeredListTitle: 'Registered players & weeks:',
    trainingLine: 'Training runs Monday–Friday, 3:30–7:30 PM. If you have questions, reply to this email.',
    signOff: `— ${ORG}`,
  },
  additional_weeks_payment_due: {
    subjectTemplate: `Additional camp weeks — payment due — ${ORG}`,
    heading: 'Camp weeks updated',
    greetingLine: 'Hi {{parentFullName}},',
    paidSectionTitle: 'Paid / confirmed',
    newSectionTitle: 'New — payment required',
    amountLine: 'Amount due for these additional camp weeks: {{amountDollars}}',
    paymentInstructions: 'Pay via Zelle or Venmo to reserve these spots. Questions? Reply to this email.',
    signOff: `— ${ORG}`,
  },
  registration_confirmed: {
    subjectTemplate: `Confirmed: {{playerName}} — {{campWeekLabel}} — ${ORG}`,
    heading: 'Camp registration confirmed',
    confirmedParagraph:
      '{{playerName}} is confirmed for {{campWeekLabel}}.',
    bodyClosing: 'We look forward to seeing you at Beach Chalet. If you have questions, reply to this email.',
    signOff: `— ${ORG}`,
  },
  registration_declined: {
    subjectTemplate: `Update: {{playerName}} — {{campWeekLabel}} — ${ORG}`,
    heading: 'Camp week not available',
    unableParagraph:
      'We are unable to confirm {{playerName}} for {{campWeekLabel}} at this time.',
    afterReasonParagraph:
      'If spots open up or you would like to try another week, you can register again from our website when space is available.',
    signOff: `— ${ORG}`,
  },
  organizer_camp_cancelled: {
    subjectTemplate: `Camp week cancelled — {{campWeekLabel}} — ${ORG}`,
    heading: 'Camp week cancelled',
    lowEnrollmentParagraph:
      'Unfortunately, {{campWeekLabel}} will not run — we did not reach the minimum number of registered players for that week.',
    playerRemovedLine: '{{playerName}} is no longer scheduled for this week.',
    bodyPaidRefund:
      'Because you had already paid for this week, we are processing your refund automatically. You do not need to submit a refund request in the parent dashboard — this cancellation was initiated by our staff due to low enrollment, not by you.\n\nYou will see this week marked as cancelled with the refund noted there once processing completes.',
    bodyUnpaid:
      'No payment was required for this week yet, so there is nothing to refund. This cancellation was initiated by our staff (low enrollment), not from your account.',
    closingParagraph:
      'We’re sorry for the inconvenience. You can register for another week on our website when it works for your family. Questions? Reply to this email.',
    signOff: `— ${ORG}`,
  },
  refund_approved: {
    subjectTemplate: `Refund approved: {{playerName}} — {{campWeekLabel}} — ${ORG}`,
    heading: 'Refund request approved',
    bodyLine1:
      'We have approved your refund request for {{playerName}} for {{campWeekLabel}}. Our team will process it and follow up if we need anything else.',
    bodyLine2: 'If you have questions, reply to this email.',
    signOff: `— ${ORG}`,
  },
  refund_money_sent: {
    subjectTemplate: `Refund sent: {{playerName}} — {{campWeekLabel}} — ${ORG}`,
    heading: 'Refund processed',
    bodyLine1:
      'This confirms that the refund for {{playerName}} for {{campWeekLabel}} has been sent (or initiated with your payment provider).',
    bodyLine2:
      "If you don't see it within a few business days, reply to this email and we'll help track it down.",
    signOff: `— ${ORG}`,
  },
  refund_declined: {
    subjectTemplate: `Refund request update: {{playerName}} — {{campWeekLabel}} — ${ORG}`,
    heading: 'Update on your refund request',
    bodyLine1:
      'We are unable to approve the refund request for {{playerName}} for {{campWeekLabel}} at this time.',
    afterReasonParagraph:
      'Your registration for this week remains active unless we have contacted you separately. Reply to this email with questions.',
    signOff: `— ${ORG}`,
  },
  weekly_report: {
    subjectTemplate: `Report card: {{childName}} — {{campWeekLabel}} — ${ORG}`,
    headingTemplate: 'Weekly report card — {{campWeekLabel}}',
    introBeforeLink:
      "Here is {{childName}}'s coach report for {{campWeekLabel}}, using the same 1–5 scale and skills as our ",
    introAfterLink: '.',
    linkLabel: 'report card guide',
    overviewTitle: 'Coach overview',
    ratingScaleTitle: 'Rating scale (1 to 5)',
    skillsTitle: 'Skills assessed',
    footerLine: 'Questions? Reply to this email.',
    signOff: `— ${ORG}`,
  },
}

export const REPORT_CARD_GUIDE_URL = GUIDE_URL

export function fieldIdsForTemplate(key: EmailTemplateKey): string[] {
  return EMAIL_TEMPLATE_SPECS[key].fields.map((f) => f.id)
}

export function sanitizeTemplateFields(
  key: EmailTemplateKey,
  input: Record<string, unknown>,
): Record<string, string> {
  const allowed = new Set(fieldIdsForTemplate(key))
  const defaults = EMAIL_TEMPLATE_DEFAULTS[key]
  const out: Record<string, string> = { ...defaults }
  const maxLen = 12000
  for (const id of allowed) {
    const v = input[id]
    if (typeof v !== 'string') continue
    const t = v.slice(0, maxLen)
    out[id] = t
  }
  return out
}
