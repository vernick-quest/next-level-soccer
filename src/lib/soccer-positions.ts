/** Stored values are short codes; labels are written out for forms and summaries. */
export const SOCCER_POSITION_CHOICES = [
  { value: 'GK', label: 'Goalkeeper' },
  { value: 'LB', label: 'Left back' },
  { value: 'CB', label: 'Center back' },
  { value: 'RB', label: 'Right back' },
  { value: 'CDM', label: 'Central defensive midfielder' },
  { value: 'CM', label: 'Central midfielder' },
  { value: 'CAM', label: 'Attacking midfielder' },
  { value: 'LW', label: 'Left winger' },
  { value: 'RW', label: 'Right winger' },
  { value: 'ST', label: 'Striker' },
  { value: 'CF', label: 'Center forward' },
] as const

const LABEL_BY_VALUE = Object.fromEntries(SOCCER_POSITION_CHOICES.map((o) => [o.value, o.label])) as Record<
  string,
  string
>

/** Display label for a stored position code; falls back to the raw value. */
export function soccerPositionLabel(code: string | null | undefined): string {
  const c = (code ?? '').trim()
  if (!c) return ''
  return LABEL_BY_VALUE[c] ?? c
}
