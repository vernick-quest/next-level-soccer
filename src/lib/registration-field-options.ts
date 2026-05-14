/** Shared dropdown options for parent registration and coach manual registration. */

export const REGISTRATION_PRONOUNS_OPTIONS = [
  { value: 'He/Him', label: 'He/Him' },
  { value: 'She/Her', label: 'She/Her' },
  { value: 'They/Them', label: 'They/Them' },
] as const

export const REGISTRATION_GENDER_OPTIONS = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
] as const

export const REGISTRATION_EXPERIENCE_LEVELS = [
  'SFYS',
  'School Team',
  'Copper',
  'Bronze',
  'Silver',
  'Gold',
  'Premier',
  'NPL',
  'ECNL-RL',
  'ECNL',
  'MLS-Next',
  'other',
] as const

export type RegistrationExperienceLevel = (typeof REGISTRATION_EXPERIENCE_LEVELS)[number]

export const REGISTRATION_GRADE_OPTIONS: { value: string; label: string }[] = [
  { value: 'K', label: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
    return { value: String(n), label: `${n}${suffix} grade` }
  }),
]

export const REGISTRATION_SHIRT_SIZES = ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL'] as const
