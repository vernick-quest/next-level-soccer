/** Shared with registration forms and DB row builders (not a Server Actions file). */
export type RegistrationChildInput = {
  playerFirstName: string
  playerLastName: string
  playerPronouns: string
  playerDob: string
  playerGender: 'boy' | 'girl'
  playerExperienceLevel: string
  playerExperienceOther: string
  /** Club / program they play for this year (free text; suggestions on the form). */
  playerSoccerClub: string
  primaryPosition: string
  secondaryPosition: string
  gradeFall: string
  schoolFall: string
  childPhotoUrl: string
  campWeeks: string[]
  shirtSize: string
  medicalNotes: string
  emergencyContactName: string
  emergencyContactPhone: string
}

export type FamilyRegistrationInput = {
  parentFirstName: string
  parentLastName: string
  parentEmail: string
  parentPhone: string
  children: RegistrationChildInput[]
  /** Honeypot — must be empty (see registration form). */
  hpCompany?: string
}

export type ActionResult = { success: true } | { success: false; error: string }
