/** DB columns: technical_1–4, tactical_1–4, physical_1–4, psychological_1–4 (values 1–5). */

export type MetricCategory = 'technical' | 'tactical' | 'physical' | 'psychological'

export type ReportMetricKey =
  | 'technical_1'
  | 'technical_2'
  | 'technical_3'
  | 'technical_4'
  | 'tactical_1'
  | 'tactical_2'
  | 'tactical_3'
  | 'tactical_4'
  | 'physical_1'
  | 'physical_2'
  | 'physical_3'
  | 'physical_4'
  | 'psychological_1'
  | 'psychological_2'
  | 'psychological_3'
  | 'psychological_4'

export const REPORT_METRIC_GROUPS: {
  category: MetricCategory
  title: string
  metrics: { key: ReportMetricKey; label: string }[]
}[] = [
  {
    category: 'technical',
    title: 'Technical',
    metrics: [
      { key: 'technical_1', label: 'First touch quality' },
      { key: 'technical_2', label: 'Ball control under pressure' },
      { key: 'technical_3', label: 'Dribbling / 1v1' },
      { key: 'technical_4', label: 'Passing range & weight' },
    ],
  },
  {
    category: 'tactical',
    title: 'Tactical',
    metrics: [
      { key: 'tactical_1', label: 'Positional awareness' },
      { key: 'tactical_2', label: 'Decision speed' },
      { key: 'tactical_3', label: 'Defensive shape / pressing' },
      { key: 'tactical_4', label: 'Game reading / anticipation' },
    ],
  },
  {
    category: 'physical',
    title: 'Physical',
    metrics: [
      { key: 'physical_1', label: 'Speed / acceleration' },
      { key: 'physical_2', label: 'Endurance / work rate' },
      { key: 'physical_3', label: 'Strength / balance' },
      { key: 'physical_4', label: 'Agility / change of direction' },
    ],
  },
  {
    category: 'psychological',
    title: 'Psychological',
    metrics: [
      { key: 'psychological_1', label: 'Confidence under pressure' },
      { key: 'psychological_2', label: 'Communication' },
      { key: 'psychological_3', label: 'Focus / discipline' },
      { key: 'psychological_4', label: 'Coachability / attitude' },
    ],
  },
]

export const ALL_REPORT_METRIC_KEYS: ReportMetricKey[] = REPORT_METRIC_GROUPS.flatMap((g) =>
  g.metrics.map((m) => m.key),
)
