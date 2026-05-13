import type { FamilyRegistrationInput, RegistrationChildInput } from '@/lib/family-registration-input-types'

/** Postgres `date` — HTML date input is usually YYYY-MM-DD; normalize edge cases. */
export function sanitizePlayerDobForDb(dob: string): string {
  const t = dob.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return t
}

export function playerExperienceForRegistrations(child: RegistrationChildInput): string {
  if (child.playerExperienceLevel === 'other') {
    return child.playerExperienceOther.trim() || 'Other'
  }
  return child.playerExperienceLevel
}

/** One `registrations` row per camp week (dashboard + spot counter use this table). */
export function buildRegistrationsRows(
  data: FamilyRegistrationInput,
  userId: string,
  submissionId: string,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const child of data.children) {
    for (const week of child.campWeeks) {
      rows.push({
        registration_submission_id: submissionId,
        user_id: userId,
        parent_first_name: data.parentFirstName,
        parent_last_name: data.parentLastName,
        parent_email: data.parentEmail,
        parent_phone: data.parentPhone,
        player_first_name: child.playerFirstName,
        player_last_name: child.playerLastName,
        player_dob: sanitizePlayerDobForDb(child.playerDob),
        player_age_group: child.gradeFall,
        player_experience: playerExperienceForRegistrations(child),
        camp_session: week,
        shirt_size: child.shirtSize,
        child_photo_url: child.childPhotoUrl.trim() || null,
        medical_notes: child.medicalNotes.trim() || null,
        emergency_contact_name: child.emergencyContactName,
        emergency_contact_phone: child.emergencyContactPhone,
        status: 'pending',
        refund_requested_weeks: [],
        primary_position: child.primaryPosition.trim(),
        secondary_position: (child.secondaryPosition ?? '').trim(),
        playing_level: child.playerExperienceLevel === 'other' ? null : child.playerExperienceLevel,
        soccer_club: child.playerSoccerClub.trim(),
      })
    }
  }
  return rows
}
