/**
 * Coach/parent report metrics: 12 skills aligned with `REPORT_CARD_SKILL_PILLARS_DOC` (report-card-skills page).
 * DB columns `*_4` are legacy; new saves set them to null.
 */

import { REPORT_CARD_SKILL_PILLARS_DOC } from '@/lib/report-card-doc-reference'

export type MetricCategory = 'technical' | 'tactical' | 'physical' | 'psychological'

const PILLAR_CATEGORIES: MetricCategory[] = ['technical', 'tactical', 'physical', 'psychological']

/** Keys coaches and parents see (12), matching the public report card doc. */
export type CoachReportMetricKey =
  | 'technical_1'
  | 'technical_2'
  | 'technical_3'
  | 'tactical_1'
  | 'tactical_2'
  | 'tactical_3'
  | 'physical_1'
  | 'physical_2'
  | 'physical_3'
  | 'psychological_1'
  | 'psychological_2'
  | 'psychological_3'

/** All DB columns including legacy fourth metric per category. */
export type ReportMetricKey =
  | CoachReportMetricKey
  | 'technical_4'
  | 'tactical_4'
  | 'physical_4'
  | 'psychological_4'

export const COACH_REPORT_METRIC_KEYS: CoachReportMetricKey[] = [
  'technical_1',
  'technical_2',
  'technical_3',
  'tactical_1',
  'tactical_2',
  'tactical_3',
  'physical_1',
  'physical_2',
  'physical_3',
  'psychological_1',
  'psychological_2',
  'psychological_3',
]

export const LEGACY_ONLY_METRIC_KEYS: ReportMetricKey[] = [
  'technical_4',
  'tactical_4',
  'physical_4',
  'psychological_4',
]

export const ALL_REPORT_METRIC_KEYS: ReportMetricKey[] = [...COACH_REPORT_METRIC_KEYS, ...LEGACY_ONLY_METRIC_KEYS]

export const REPORT_METRIC_GROUPS: {
  category: MetricCategory
  title: string
  subtitle: string
  metrics: { key: CoachReportMetricKey; label: string; description: string }[]
}[] = PILLAR_CATEGORIES.map((cat, idx) => {
  const pillar = REPORT_CARD_SKILL_PILLARS_DOC[idx]
  return {
    category: cat,
    title: pillar.title,
    subtitle: pillar.subtitle,
    metrics: pillar.skills.map((s, j) => ({
      key: `${cat}_${j + 1}` as CoachReportMetricKey,
      label: s.name,
      description: s.description,
    })),
  }
})
