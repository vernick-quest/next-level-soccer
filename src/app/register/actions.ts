'use server'

import { validateCampWeekCapacityForSubmission } from '@/lib/home-camp-spots'
import { createClient } from '@/lib/supabase/server'

export type RegistrationChildInput = {
  playerFirstName: string
  playerLastName: string
  playerPronouns: string
  playerDob: string
  playerGender: 'boy' | 'girl'
  playerExperienceLevel: string
  playerExperienceOther: string
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
  secondParentFirstName: string
  secondParentLastName: string
  secondParentEmail: string
  secondParentPhone: string
  children: RegistrationChildInput[]
  /** Honeypot — must be empty (see registration form). */
  hpCompany?: string
}

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

const CAMP_PRICE_CENTS = 35_000

function playerExperienceForRegistrations(child: RegistrationChildInput): string {
  if (child.playerExperienceLevel === 'other') {
    return child.playerExperienceOther.trim() || 'Other'
  }
  return child.playerExperienceLevel
}

/** One `registrations` row per camp week (dashboard + spot counter use this table). */
function buildRegistrationsRows(
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
        player_dob: child.playerDob,
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
        secondary_position: child.secondaryPosition.trim(),
        playing_level: child.playerExperienceLevel === 'other' ? null : child.playerExperienceLevel,
      })
    }
  }
  return rows
}

export async function submitFamilyRegistration(data: FamilyRegistrationInput): Promise<ActionResult> {
  if (data.hpCompany?.trim()) {
    return { success: false, error: 'Registration could not be completed. Please try again.' }
  }

  if (!data.children.length) {
    return { success: false, error: 'Please add at least one child.' }
  }

  for (const child of data.children) {
    if (!child.campWeeks.length) {
      return { success: false, error: 'Each child must have at least one camp week selected.' }
    }
    if (child.playerExperienceLevel === 'other' && !child.playerExperienceOther.trim()) {
      return { success: false, error: 'Please describe the experience level when you select Other.' }
    }
    if (!child.primaryPosition.trim() || !child.secondaryPosition.trim()) {
      return { success: false, error: 'Each player must have primary and secondary positions selected.' }
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Please sign in before submitting registration.' }
  }

  const capacity = await validateCampWeekCapacityForSubmission(data.children)
  if (!capacity.ok) {
    return { success: false, error: capacity.error }
  }

  const second =
    data.secondParentFirstName ||
    data.secondParentLastName ||
    data.secondParentEmail ||
    data.secondParentPhone
      ? {
          second_parent_first_name: data.secondParentFirstName || null,
          second_parent_last_name: data.secondParentLastName || null,
          second_parent_email: data.secondParentEmail || null,
          second_parent_phone: data.secondParentPhone || null,
        }
      : {
          second_parent_first_name: null,
          second_parent_last_name: null,
          second_parent_email: null,
          second_parent_phone: null,
        }

  const totalWeeks = data.children.reduce((n, c) => n + c.campWeeks.length, 0)
  const totalAmountCents = totalWeeks * CAMP_PRICE_CENTS

  const parentRow = {
    auth_user_id: user.id,
    parent_first_name: data.parentFirstName,
    parent_last_name: data.parentLastName,
    parent_email: data.parentEmail,
    parent_phone: data.parentPhone,
    ...second,
    total_amount_cents: totalAmountCents,
    status: 'pending',
  }

  const { data: submission, error: subErr } = await supabase
    .from('registration_submissions')
    .insert(parentRow)
    .select('id')
    .single()

  if (subErr || !submission) {
    console.error('Supabase submission insert:', subErr)
    return { success: false, error: 'Registration failed. Please try again.' }
  }

  const childRows = data.children.map((child, index) => ({
    submission_id: submission.id,
    sort_order: index,
    player_first_name: child.playerFirstName,
    player_last_name: child.playerLastName,
    player_pronouns: child.playerPronouns,
    player_dob: child.playerDob,
    player_gender: child.playerGender,
    player_experience_level: child.playerExperienceLevel,
    player_experience_other:
      child.playerExperienceLevel === 'other' ? child.playerExperienceOther.trim() || null : null,
    primary_position: child.primaryPosition.trim(),
    secondary_position: child.secondaryPosition.trim(),
    grade_fall: child.gradeFall,
    school_fall: child.schoolFall.trim(),
    child_photo_url: child.childPhotoUrl.trim() || null,
    camp_weeks: child.campWeeks,
    shirt_size: child.shirtSize,
    medical_notes: child.medicalNotes.trim() || null,
    emergency_contact_name: child.emergencyContactName,
    emergency_contact_phone: child.emergencyContactPhone,
  }))

  const { error: childrenErr } = await supabase.from('registration_children').insert(childRows)

  if (childrenErr) {
    console.error('Supabase children insert:', childrenErr)
    await supabase.from('registration_submissions').delete().eq('id', submission.id)
    return { success: false, error: 'Registration failed. Please try again.' }
  }

  const registrationRows = buildRegistrationsRows(data, user.id, submission.id)
  const { error: regErr } = await supabase.from('registrations').insert(registrationRows)

  if (regErr) {
    console.error('Supabase registrations insert:', regErr)
    await supabase.from('registration_submissions').delete().eq('id', submission.id)
    return { success: false, error: 'Registration failed. Please try again.' }
  }

  return { success: true }
}
