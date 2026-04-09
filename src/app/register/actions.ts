'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { validateCampWeekCapacityForSubmission } from '@/lib/home-camp-spots'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

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

/** Postgres `date` — HTML date input is usually YYYY-MM-DD; normalize edge cases. */
function sanitizePlayerDobForDb(dob: string): string {
  const t = dob.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return t
}

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
        secondary_position: child.secondaryPosition.trim(),
        playing_level: child.playerExperienceLevel === 'other' ? null : child.playerExperienceLevel,
        soccer_club: child.playerSoccerClub.trim(),
      })
    }
  }
  return rows
}

function stripOptionalRegistrationColumns(rows: Record<string, unknown>[]) {
  return rows.map((r) => {
    const {
      registration_submission_id: _sid,
      primary_position: _p1,
      secondary_position: _p2,
      playing_level: _pl,
      soccer_club: _sc,
      ...rest
    } = r
    return rest
  })
}

function looksLikeMissingRegistrationColumnError(err: { message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase()
  return (
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('column') && m.includes('registrations') ||
    (m.includes('column') && m.includes('does not exist'))
  )
}

/**
 * Prefer service role so RLS never blocks denormalized rows. Falls back to the user client if the key is missing (local dev).
 * Retries without optional columns if the DB has not been migrated yet.
 */
async function insertRegistrationsRows(
  userSupabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<{ error: { message: string; code?: string } | null }> {
  let client: SupabaseClient = userSupabase
  try {
    client = createServiceRoleClient()
  } catch {
    /* SUPABASE_SERVICE_ROLE_KEY missing — use session client (RLS must allow insert). */
  }

  let { error } = await client.from('registrations').insert(rows)
  if (!error) return { error: null }

  console.error('registrations insert (full columns):', error)

  if (looksLikeMissingRegistrationColumnError(error)) {
    const minimal = stripOptionalRegistrationColumns(rows)
    ;({ error } = await client.from('registrations').insert(minimal))
    if (!error) {
      console.warn(
        'registrations: inserted without registration_submission_id / position columns — run latest supabase-schema.sql on Supabase.',
      )
      return { error: null }
    }
    console.error('registrations insert (legacy columns):', error)
  }

  return { error }
}

async function deleteRegistrationsForSubmission(submissionId: string) {
  try {
    const s = createServiceRoleClient()
    const { error } = await s.from('registrations').delete().eq('registration_submission_id', submissionId)
    if (error) console.error('deleteRegistrationsForSubmission:', error)
  } catch {
    /* no service key — cannot reliably clean denormalized rows */
  }
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
    if (!child.playerSoccerClub.trim()) {
      return { success: false, error: 'Please enter the soccer club or program each player is with this year.' }
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
    soccer_club: child.playerSoccerClub.trim(),
  }))

  const { error: childrenErr } = await supabase.from('registration_children').insert(childRows)

  if (childrenErr) {
    console.error('Supabase children insert:', childrenErr)
    await supabase.from('registration_submissions').delete().eq('id', submission.id)
    return { success: false, error: 'Registration failed. Please try again.' }
  }

  const registrationRows = buildRegistrationsRows(data, user.id, submission.id)
  const { error: regErr } = await insertRegistrationsRows(supabase, registrationRows)

  if (regErr) {
    console.error('Supabase registrations insert:', regErr)
    await deleteRegistrationsForSubmission(submission.id)
    await supabase.from('registration_submissions').delete().eq('id', submission.id)
    return { success: false, error: 'Registration failed. Please try again.' }
  }

  return { success: true }
}
