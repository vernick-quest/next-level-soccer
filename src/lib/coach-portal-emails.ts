import { REPORT_CARD_RATING_SCALE_DOC, REPORT_CARD_SKILL_PILLARS_DOC } from '@/lib/report-card-doc-reference'
import { REPORT_METRIC_GROUPS, type CoachReportMetricKey } from '@/lib/player-report-metrics'
import { REPORT_CARD_GUIDE_URL } from '@/lib/email-template-catalog'
import { interpolateTemplate } from '@/lib/email-template-interpolate'
import { escapeHtml } from '@/lib/html-escape'

const RATING_BY_VALUE: Map<number, (typeof REPORT_CARD_RATING_SCALE_DOC)[number]> = new Map(
  REPORT_CARD_RATING_SCALE_DOC.map((r) => [r.value, r]),
)

function line(
  fieldId: string,
  fields: Record<string, string>,
  vars: Record<string, string>,
): string {
  return escapeHtml(interpolateTemplate(fields[fieldId] ?? '', vars))
}

function preline(
  fieldId: string,
  fields: Record<string, string>,
  vars: Record<string, string>,
): string {
  const raw = interpolateTemplate(fields[fieldId] ?? '', vars)
  return escapeHtml(raw).replace(/\n/g, '<br/>')
}

export function htmlRegistrationConfirmed(
  params: { parentFirstName: string; playerName: string; campWeekLabel: string },
  fields: Record<string, string>,
) {
  const vars = {
    parentFirstName: params.parentFirstName,
    playerName: params.playerName,
    campWeekLabel: params.campWeekLabel,
  }
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">${line('heading', fields, vars)}</h1>
    <p>Hi ${escapeHtml(params.parentFirstName)},</p>
    <p style="white-space:pre-wrap;">${line('confirmedParagraph', fields, vars)}</p>
    <p>${line('bodyClosing', fields, vars)}</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${line('signOff', fields, vars)}</p>
  </div>`
}

export function htmlRegistrationDeclined(
  params: {
    parentFirstName: string
    playerName: string
    campWeekLabel: string
    reason: string
  },
  fields: Record<string, string>,
) {
  const vars = {
    parentFirstName: params.parentFirstName,
    playerName: params.playerName,
    campWeekLabel: params.campWeekLabel,
  }
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">${line('heading', fields, vars)}</h1>
    <p>Hi ${escapeHtml(params.parentFirstName)},</p>
    <p>${line('unableParagraph', fields, vars)}</p>
    <p style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px 14px;">
      <strong>Reason:</strong><br/>${escapeHtml(params.reason)}
    </p>
    <p>${line('afterReasonParagraph', fields, vars)}</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${line('signOff', fields, vars)}</p>
  </div>`
}

export function htmlOrganizerCampCancelled(
  params: {
    parentFirstName: string
    playerName: string
    campWeekLabel: string
    wasPaidConfirmed: boolean
  },
  fields: Record<string, string>,
) {
  const vars = {
    parentFirstName: params.parentFirstName,
    playerName: params.playerName,
    campWeekLabel: params.campWeekLabel,
  }
  const refundBit = params.wasPaidConfirmed
    ? `<div style="white-space:pre-wrap;line-height:1.55;">${preline('bodyPaidRefund', fields, vars)}</div>`
    : `<div style="white-space:pre-wrap;line-height:1.55;">${preline('bodyUnpaid', fields, vars)}</div>`

  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">${line('heading', fields, vars)}</h1>
    <p>Hi ${escapeHtml(params.parentFirstName)},</p>
    <p>${line('lowEnrollmentParagraph', fields, vars)}</p>
    <p>${line('playerRemovedLine', fields, vars)}</p>
    ${refundBit}
    <p>${line('closingParagraph', fields, vars)}</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${line('signOff', fields, vars)}</p>
  </div>`
}

export function htmlRefundApproved(
  params: { parentFirstName: string; playerName: string; campWeekLabel: string },
  fields: Record<string, string>,
) {
  const vars = {
    parentFirstName: params.parentFirstName,
    playerName: params.playerName,
    campWeekLabel: params.campWeekLabel,
  }
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">${line('heading', fields, vars)}</h1>
    <p>Hi ${escapeHtml(params.parentFirstName)},</p>
    <p>${line('bodyLine1', fields, vars)}</p>
    <p>${line('bodyLine2', fields, vars)}</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${line('signOff', fields, vars)}</p>
  </div>`
}

export function htmlRefundMoneySent(
  params: { parentFirstName: string; playerName: string; campWeekLabel: string },
  fields: Record<string, string>,
) {
  const vars = {
    parentFirstName: params.parentFirstName,
    playerName: params.playerName,
    campWeekLabel: params.campWeekLabel,
  }
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">${line('heading', fields, vars)}</h1>
    <p>Hi ${escapeHtml(params.parentFirstName)},</p>
    <p>${line('bodyLine1', fields, vars)}</p>
    <p>${line('bodyLine2', fields, vars)}</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${line('signOff', fields, vars)}</p>
  </div>`
}

export function htmlRefundDeclined(
  params: {
    parentFirstName: string
    playerName: string
    campWeekLabel: string
    reason: string
  },
  fields: Record<string, string>,
) {
  const vars = {
    parentFirstName: params.parentFirstName,
    playerName: params.playerName,
    campWeekLabel: params.campWeekLabel,
  }
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">${line('heading', fields, vars)}</h1>
    <p>Hi ${escapeHtml(params.parentFirstName)},</p>
    <p>${line('bodyLine1', fields, vars)}</p>
    <p style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px 14px;">
      <strong>Reason:</strong><br/>${escapeHtml(params.reason)}
    </p>
    <p>${line('afterReasonParagraph', fields, vars)}</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${line('signOff', fields, vars)}</p>
  </div>`
}

export function htmlParentWeeklyReport(
  params: {
    parentFirstName: string
    childName: string
    campWeekLabel: string
    coachOverview: string
    scores: Record<CoachReportMetricKey, number>
  },
  fields: Record<string, string>,
) {
  const { parentFirstName, childName, campWeekLabel, coachOverview, scores } = params
  const vars = { parentFirstName, childName, campWeekLabel }

  const scaleRows = REPORT_CARD_RATING_SCALE_DOC.map(
    (r) =>
      `<tr><td style="padding:6px 10px;border:1px solid #e8d8ce;font-weight:bold;">${r.value}</td><td style="padding:6px 10px;border:1px solid #e8d8ce;">${escapeHtml(r.label)}</td><td style="padding:6px 10px;border:1px solid #e8d8ce;font-size:13px;color:#475569;">${escapeHtml(r.meaning)}</td></tr>`,
  ).join('')

  const skillSections: string[] = []
  for (let i = 0; i < REPORT_METRIC_GROUPS.length; i++) {
    const g = REPORT_METRIC_GROUPS[i]
    const pillar = REPORT_CARD_SKILL_PILLARS_DOC[i]
    const rows = g.metrics
      .map((m) => {
        const score = scores[m.key]
        const label = RATING_BY_VALUE.get(score)?.label ?? String(score)
        return `<tr>
          <td style="padding:8px 10px;border:1px solid #e8d8ce;vertical-align:top;"><strong>${escapeHtml(m.label)}</strong><br/><span style="font-size:12px;color:#64748b;">${escapeHtml(m.description)}</span></td>
          <td style="padding:8px 10px;border:1px solid #e8d8ce;text-align:center;font-weight:bold;">${score}</td>
          <td style="padding:8px 10px;border:1px solid #e8d8ce;">${escapeHtml(label)}</td>
        </tr>`
      })
      .join('')
    skillSections.push(`
      <h3 style="color:#062744;margin:20px 0 8px;font-size:17px;">${escapeHtml(g.title)} <span style="color:#f05a28;">(${escapeHtml(pillar.subtitle)})</span></h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;">${rows}</table>
    `)
  }

  const heading = line('headingTemplate', fields, vars)
  const linkText = line('linkLabel', fields, vars)

  return `
  <div style="font-family: system-ui, sans-serif; max-width: 640px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">${heading}</h1>
    <p>Hi ${escapeHtml(parentFirstName)},</p>
    <p>${line('introBeforeLink', fields, vars)}<a href="${REPORT_CARD_GUIDE_URL}" style="color:#f05a28;">${linkText}</a>${line('introAfterLink', fields, vars)}</p>

    <h2 style="color:#062744;font-size:16px;margin-top:24px;">${line('overviewTitle', fields, vars)}</h2>
    <div style="background:#faf8f5;border:1px solid #e8d8ce;border-radius:12px;padding:14px 16px;white-space:pre-wrap;">${escapeHtml(coachOverview)}</div>

    <h2 style="color:#062744;font-size:16px;margin-top:24px;">${line('ratingScaleTitle', fields, vars)}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <thead><tr style="background:#f7f2e8;"><th style="padding:6px;border:1px solid #e8d8ce;">#</th><th style="padding:6px;border:1px solid #e8d8ce;">Label</th><th style="padding:6px;border:1px solid #e8d8ce;">Meaning</th></tr></thead>
      <tbody>${scaleRows}</tbody>
    </table>

    <h2 style="color:#062744;font-size:16px;">${line('skillsTitle', fields, vars)}</h2>
    ${skillSections.join('')}

    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">${line('footerLine', fields, vars)}<br/>${line('signOff', fields, vars)}</p>
  </div>`
}
