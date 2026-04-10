import { interpolateTemplate } from '@/lib/email-template-interpolate'
import { escapeHtml } from '@/lib/html-escape'

function t(
  fieldId: string,
  fields: Record<string, string>,
  vars: Record<string, string>,
): string {
  return escapeHtml(interpolateTemplate(fields[fieldId] ?? '', vars))
}

/** Initial registration confirmation (dynamic list + amount injected). */
export function buildRegistrationReceivedEmailHtml(
  args: {
    parentFullName: string
    newWeeksListHtml: string
    amountDollars: string
  },
  fields: Record<string, string>,
): string {
  const vars = { parentFullName: args.parentFullName, amountDollars: args.amountDollars }
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
    <h1 style="color: #062744;">${t('heading', fields, vars)}</h1>
    <p>${t('greetingLine', fields, vars)}</p>
    <p>${t('thanksLine', fields, vars)}</p>
    <p><strong>${t('paidSectionTitle', fields, vars)}</strong></p>
    <p style="color:#64748b;font-size:14px;">${t('paidSectionEmptyHint', fields, vars)}</p>
    <p><strong>${t('newSectionTitle', fields, vars)}</strong></p>
    <ul>${args.newWeeksListHtml}</ul>
    <p><strong>${t('amountLine', fields, vars)}</strong></p>
    <p>${t('paymentInstructions', fields, vars)}</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${t('signOff', fields, vars)}</p>
  </div>`
}

export function buildWelcomeToCampEmailHtml(
  args: { parentFullName: string; childListHtml: string },
  fields: Record<string, string>,
): string {
  const vars = { parentFullName: args.parentFullName }
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
      <h1 style="color: #062744;">${t('heading', fields, vars)}</h1>
      <p>${t('greetingLine', fields, vars)}</p>
      <p>${t('thankYouLine', fields, vars)}</p>
      <p><strong>${t('registeredListTitle', fields, vars)}</strong></p>
      <ul>${args.childListHtml}</ul>
      <p>${t('trainingLine', fields, vars)}</p>
      <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${t('signOff', fields, vars)}</p>
    </div>
  `
}

export function buildAdditionalWeeksEmailHtml(
  args: {
    parentFullName: string
    confirmedBlockHtml: string
    newWeeksListHtml: string
    amountDollars: string
  },
  fields: Record<string, string>,
): string {
  const vars = { parentFullName: args.parentFullName, amountDollars: args.amountDollars }
  return `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
        <h1 style="color: #062744;">${t('heading', fields, vars)}</h1>
        <p>${t('greetingLine', fields, vars)}</p>
        <p><strong>${t('paidSectionTitle', fields, vars)}</strong></p>
        ${args.confirmedBlockHtml}
        <p><strong>${t('newSectionTitle', fields, vars)}</strong></p>
        <ul>${args.newWeeksListHtml}</ul>
        <p><strong>${t('amountLine', fields, vars)}</strong></p>
        <p>${t('paymentInstructions', fields, vars)}</p>
        <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${t('signOff', fields, vars)}</p>
      </div>
    `
}
