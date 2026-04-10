import { REPORT_CARD_RATING_SCALE_DOC, REPORT_CARD_SKILL_PILLARS_DOC } from '@/lib/report-card-doc-reference'
import { REPORT_METRIC_GROUPS, type CoachReportMetricKey } from '@/lib/player-report-metrics'
import { escapeHtml } from '@/lib/html-escape'

const RATING_BY_VALUE: Map<number, (typeof REPORT_CARD_RATING_SCALE_DOC)[number]> = new Map(
  REPORT_CARD_RATING_SCALE_DOC.map((r) => [r.value, r]),
)

export function htmlRegistrationConfirmed(params: {
  parentFirstName: string
  playerName: string
  campWeekLabel: string
}) {
  const { parentFirstName, playerName, campWeekLabel } = params
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">Camp registration confirmed</h1>
    <p>Hi ${escapeHtml(parentFirstName)},</p>
    <p>
      <strong>${escapeHtml(playerName)}</strong> is <strong>confirmed</strong> for
      <strong>${escapeHtml(campWeekLabel)}</strong>.
    </p>
    <p>We look forward to seeing you at Beach Chalet. If you have questions, reply to this email.</p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">— Next Level Soccer SF</p>
  </div>`
}

export function htmlRegistrationDeclined(params: {
  parentFirstName: string
  playerName: string
  campWeekLabel: string
  reason: string
}) {
  const { parentFirstName, playerName, campWeekLabel, reason } = params
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">Camp week not available</h1>
    <p>Hi ${escapeHtml(parentFirstName)},</p>
    <p>
      We are unable to confirm <strong>${escapeHtml(playerName)}</strong> for
      <strong>${escapeHtml(campWeekLabel)}</strong> at this time.
    </p>
    <p style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px 14px;">
      <strong>Reason:</strong><br/>${escapeHtml(reason)}
    </p>
    <p>
      If spots open up or you would like to try another week, you can register again from our website when space is available.
    </p>
    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">— Next Level Soccer SF</p>
  </div>`
}

export function htmlParentWeeklyReport(params: {
  parentFirstName: string
  childName: string
  campWeekLabel: string
  coachOverview: string
  scores: Record<CoachReportMetricKey, number>
}) {
  const { parentFirstName, childName, campWeekLabel, coachOverview, scores } = params

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

  return `
  <div style="font-family: system-ui, sans-serif; max-width: 640px; line-height: 1.55; color: #1e293b;">
    <h1 style="color: #062744; font-size: 22px;">Weekly report card — ${escapeHtml(campWeekLabel)}</h1>
    <p>Hi ${escapeHtml(parentFirstName)},</p>
    <p>Here is ${escapeHtml(childName)}&rsquo;s coach report for <strong>${escapeHtml(campWeekLabel)}</strong>, using the same 1&ndash;5 scale and skills as our <a href="https://nextlevelsoccersf.com/report-card-skills" style="color:#f05a28;">report card guide</a>.</p>

    <h2 style="color:#062744;font-size:16px;margin-top:24px;">Coach overview</h2>
    <div style="background:#faf8f5;border:1px solid #e8d8ce;border-radius:12px;padding:14px 16px;white-space:pre-wrap;">${escapeHtml(coachOverview)}</div>

    <h2 style="color:#062744;font-size:16px;margin-top:24px;">Rating scale (1 to 5)</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <thead><tr style="background:#f7f2e8;"><th style="padding:6px;border:1px solid #e8d8ce;">#</th><th style="padding:6px;border:1px solid #e8d8ce;">Label</th><th style="padding:6px;border:1px solid #e8d8ce;">Meaning</th></tr></thead>
      <tbody>${scaleRows}</tbody>
    </table>

    <h2 style="color:#062744;font-size:16px;">Skills assessed</h2>
    ${skillSections.join('')}

    <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">Questions? Reply to this email.<br/>— Next Level Soccer SF</p>
  </div>`
}
