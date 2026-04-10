/**
 * Parent-facing report card copy — synced from Google Doc “Next Level Soccer Report Card”
 * (https://docs.google.com/document/d/1HK5gSus2teh3mf7gASerjsuz8RGe4UutVZtDgDkT9h0/edit)
 * Update this file when the doc changes. Coach scoring in the app uses related criteria in `player-report-metrics.ts`.
 */

export const REPORT_CARD_DOC_URL =
  'https://docs.google.com/document/d/1HK5gSus2teh3mf7gASerjsuz8RGe4UutVZtDgDkT9h0/edit?usp=sharing'

export type DocRatingRow = {
  value: 1 | 2 | 3 | 4 | 5
  /** Short label from doc (Rating column) */
  label: string
  /** Definition row from doc */
  definition: string
  /** “Meaning for Competitive Player” from doc */
  meaning: string
  /** Tailwind classes for parent-facing color key */
  swatchClassName: string
}

/** Competitive Soccer Rating Scale (1 to 5) — order 1 = lowest, 5 = highest */
export const REPORT_CARD_RATING_SCALE_DOC: DocRatingRow[] = [
  {
    value: 1,
    label: 'Emerging',
    definition: 'Needs Significant Development',
    meaning:
      'The player shows only a foundational or emerging understanding of the skill. They rarely execute it successfully and need dedicated, fundamental training to develop competence.',
    swatchClassName: 'bg-[#fecaca] text-[#7f1d1d] border border-[#f87171]',
  },
  {
    value: 2,
    label: 'Developing',
    definition: 'Below Expectations',
    meaning:
      'The player attempts the skill but is inconsistent in its execution, often requiring extra time or space to perform it successfully. This area requires focused practice and development.',
    swatchClassName: 'bg-[#fed7aa] text-[#9a3412] border border-[#fb923c]',
  },
  {
    value: 3,
    label: 'Standard',
    definition: 'Meeting Expectations',
    meaning:
      'The player consistently performs the skill at an acceptable level for competitive middle school soccer. They understand the concept and can execute it in typical game situations, but may lose consistency under high pressure.',
    swatchClassName: 'bg-[#fef9c3] text-[#854d0e] border border-[#eab308]',
  },
  {
    value: 4,
    label: 'Strong',
    definition: 'Above Expectations',
    meaning:
      'The player reliably and effectively executes the skill under normal to moderate pressure. They are a consistent positive contributor to the team’s performance in this area.',
    swatchClassName: 'bg-[#d1fae5] text-[#065f46] border border-[#34d399]',
  },
  {
    value: 5,
    label: 'Elite',
    definition: 'Exceeds Expectations',
    meaning:
      'The player consistently and effectively executes the skill at a high speed, under intense pressure, and demonstrates clear superiority in this area relative to their peers. They often make game-changing plays using this skill.',
    swatchClassName: 'bg-[#a7f3d0] text-[#064e3b] border border-[#059669]',
  },
]

export type DocSkillPillar = {
  id: string
  title: string
  subtitle: string
  skills: { name: string; description: string }[]
}

/** Skills Assessed (1 to 5) — exact structure from the doc */
export const REPORT_CARD_SKILL_PILLARS_DOC: DocSkillPillar[] = [
  {
    id: 'technical',
    title: 'Technical',
    subtitle: 'The “Ball Master”',
    skills: [
      {
        name: 'First Touch',
        description: 'Ability to bring the ball under control instantly and prepare for the next move.',
      },
      {
        name: 'Passing Accuracy',
        description: 'Quality and weight of short and long-range passes under pressure.',
      },
      {
        name: '1v1 Dribbling',
        description: 'Ability to beat an opponent using feints, speed, or ball control.',
      },
    ],
  },
  {
    id: 'tactical',
    title: 'Tactical',
    subtitle: 'The “Soccer IQ”',
    skills: [
      {
        name: 'Scanning',
        description: 'Frequency of looking over the shoulder to check surroundings before receiving the ball.',
      },
      {
        name: 'Positioning',
        description: 'Understanding of where to be on the field, both offensively and defensively.',
      },
      {
        name: 'Transition Speed',
        description:
          'How quickly the player reacts when possession changes (attacking to defending and vice-versa).',
      },
    ],
  },
  {
    id: 'physical',
    title: 'Physical',
    subtitle: 'The “Athlete”',
    skills: [
      {
        name: 'Agility',
        description: 'Ability to change direction quickly and maintain balance while moving with the ball.',
      },
      {
        name: 'Explosiveness',
        description: 'Short-burst speed and acceleration from a standing or slow-moving start.',
      },
      {
        name: 'Work Rate',
        description: 'Sustained effort and stamina throughout the duration of the camp session.',
      },
    ],
  },
  {
    id: 'psychological',
    title: 'Psychological',
    subtitle: 'The “Competitor”',
    skills: [
      {
        name: 'Coachability',
        description: 'Receptiveness to feedback and the ability to apply instructions immediately.',
      },
      {
        name: 'Resilience',
        description: 'How the player reacts to mistakes, losing the ball, or a tough drill.',
      },
      {
        name: 'Communication',
        description: 'Verbal and non-verbal interaction with teammates (calling for the ball, directing play).',
      },
    ],
  },
]
