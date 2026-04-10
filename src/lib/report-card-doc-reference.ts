/**
 * Parent-facing report card copy for `/report-card-skills`.
 * Coach scoring in the app uses related criteria in `player-report-metrics.ts`.
 */

export type DocRatingRow = {
  value: 1 | 2 | 3 | 4 | 5
  /** Single kid-friendly word for the scale (swatch + headings) */
  label: string
  /** Longer explanation (no “expectations” framing) */
  meaning: string
  /** Tailwind classes for parent-facing color key */
  swatchClassName: string
}

/** Rating scale 1 = lowest, 5 = highest — one-word labels for kids */
export const REPORT_CARD_RATING_SCALE_DOC: DocRatingRow[] = [
  {
    value: 1,
    label: 'Emerging',
    meaning:
      'You’re just starting to learn this skill. It’s okay — keep practicing the basics until it feels more natural.',
    swatchClassName: 'bg-[#fecaca] text-[#7f1d1d] border border-[#f87171]',
  },
  {
    value: 2,
    label: 'Developing',
    meaning:
      'You try the skill but it’s not steady yet. Extra time and space help — keep working on it in drills and games.',
    swatchClassName: 'bg-[#fed7aa] text-[#9a3412] border border-[#fb923c]',
  },
  {
    value: 3,
    label: 'Standard',
    meaning:
      'You can do this skill at a solid level for your team. You get it in normal play; it may get harder when the game speeds up.',
    swatchClassName: 'bg-[#fef9c3] text-[#854d0e] border border-[#eab308]',
  },
  {
    value: 4,
    label: 'Strong',
    meaning:
      'You do this skill well under most pressure and help your team in this area on a regular basis.',
    swatchClassName: 'bg-[#d1fae5] text-[#065f46] border border-[#34d399]',
  },
  {
    value: 5,
    label: 'Elite',
    meaning:
      'You perform this skill at a high level even when it’s fast and tough. You often stand out and make big plays here.',
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
