'use server'

import { Resend } from 'resend'
import { CAMP_WEEK_PRICE_CENTS as CAMP_PRICE_CENTS } from '@/lib/camp-pricing'
import { insertDenormalizedRegistrationRows } from '@/lib/denormalized-registrations-insert'
import { validateCampWeekCapacityForSubmission } from '@/lib/home-camp-spots'
import { buildEmailSubject } from '@/lib/email-template-interpolate'
import { resolveEmailTemplateFields } from '@/lib/email-templates-resolve'
import { REPLY_TO_EMAIL, REGISTRATION_RECEIPT_EMAIL, SENDER_EMAIL } from '@/lib/resend-sender'
import { buildRegistrationReceivedEmailHtml } from '@/lib/transactional-parent-email-html'
import { buildRegistrationOpsReceiptHtml } from '@/lib/registration-ops-receipt-html'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildRegistrationsRows } from '@/lib/family-registration-rows'

import type { ActionResult, FamilyRegistrationInput } from '@/lib/family-registration-input-types'

export type { RegistrationChildInput, FamilyRegistrationInput, ActionResult } from '@/lib/family-registration-input-types'

function throwSupabaseError(context: string, error: unknown): never {
  console.log(`[submitFamilyRegistration] ${context} — full Supabase error:`, error)
  const payload =
    error && typeof error === 'object'
      ? JSON.stringify(error)
      : JSON.stringify({ message: String(error) })
  throw new Error(`${context}: ${payload}`)
}

async function insertRegistrationsRows(rows: Record<string, unknown>[]): Promise<void> {
  try {
    await insertDenormalizedRegistrationRows(rows, '[submitFamilyRegistration]')
  } catch (e) {
    throwSupabaseError('registrations insert', e)
  }
}

function escapeHtmlEmail(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
    if (!child.primaryPosition.trim()) {
      return { success: false, error: 'Each player must have a primary position selected.' }
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
    return { success: false, error: 'Please log in before submitting registration.' }
  }

  const db = createServiceRoleClient()

  const capacity = await validateCampWeekCapacityForSubmission(data.children)
  if (!capacity.ok) {
    return { success: false, error: capacity.error }
  }

  const totalWeeks = data.children.reduce((n, c) => n + c.campWeeks.length, 0)
  const totalAmountCents = totalWeeks * CAMP_PRICE_CENTS

  const parentRow = {
    auth_user_id: user.id,
    parent_first_name: data.parentFirstName,
    parent_last_name: data.parentLastName,
    parent_email: data.parentEmail,
    parent_phone: data.parentPhone,
    second_parent_first_name: null,
    second_parent_last_name: null,
    second_parent_email: null,
    second_parent_phone: null,
    total_amount_cents: totalAmountCents,
    status: 'pending',
  }

  const { data: submission, error: subErr } = await db
    .from('registration_submissions')
    .insert(parentRow)
    .select('id')
    .single()

  if (subErr) {
    throwSupabaseError('registration_submissions insert', subErr)
  }
  if (!submission) {
    throw new Error('registration_submissions insert: no row returned')
  }

  const childRows = data.children.map((child, index) => ({
    submission_id: submission.id,
    sort_order: index,
    player_first_name: child.playerFirstName,
    player_last_name: child.playerLastName,
    player_pronouns: (child.playerPronouns ?? '').trim(),
    player_dob: child.playerDob,
    player_gender: child.playerGender,
    player_experience_level: child.playerExperienceLevel,
    player_experience_other:
      child.playerExperienceLevel === 'other' ? child.playerExperienceOther.trim() || null : null,
    primary_position: child.primaryPosition.trim(),
    secondary_position: (child.secondaryPosition ?? '').trim(),
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

  const { error: childrenErr } = await db.from('registration_children').insert(childRows)

  if (childrenErr) {
    const { error: rollbackErr } = await db.from('registration_submissions').delete().eq('id', submission.id)
    if (rollbackErr) {
      console.log(
        '[submitFamilyRegistration] registration_children insert — full Supabase error:',
        childrenErr,
      )
      console.log(
        '[submitFamilyRegistration] rollback registration_submissions after children failure — full Supabase error:',
        rollbackErr,
      )
      throw new Error(
        JSON.stringify({ childrenInsert: childrenErr, rollbackSubmission: rollbackErr }),
      )
    }
    throwSupabaseError('registration_children insert', childrenErr)
  }

  const registrationRows = buildRegistrationsRows(data, user.id, submission.id)
  try {
    await insertRegistrationsRows(registrationRows)
  } catch (registrationsErr) {
    const { error: delRegErr } = await db
      .from('registrations')
      .delete()
      .eq('registration_submission_id', submission.id)
    if (delRegErr) {
      console.log(
        '[submitFamilyRegistration] rollback registrations after insert failure — full Supabase error:',
        delRegErr,
      )
    }
    const { error: rollbackSubErr } = await db.from('registration_submissions').delete().eq('id', submission.id)
    if (rollbackSubErr) {
      console.log(
        '[submitFamilyRegistration] rollback registration_submissions after registrations failure — full Supabase error:',
        rollbackSubErr,
      )
    }
    throw registrationsErr instanceof Error ? registrationsErr : new Error(JSON.stringify(registrationsErr))
  }

  const apiKey =
    typeof process.env.RESEND_API_KEY === 'string' ? process.env.RESEND_API_KEY.trim() : ''
  /** Only gate that skips email: missing/blank `RESEND_API_KEY` on this server (e.g. prod without env, or dev server not restarted after editing `.env.local`). */
  if (apiKey) {
    const parentName = `${data.parentFirstName} ${data.parentLastName}`.trim()
    const newWeekCount = data.children.reduce((n, c) => n + c.campWeeks.length, 0)
    const newAmountCents = newWeekCount * CAMP_PRICE_CENTS
    const newListItems = data.children
      .map((c) => {
        const name = `${c.playerFirstName} ${c.playerLastName}`.trim()
        const weeks = c.campWeeks.join(', ')
        return `<li><strong>${escapeHtmlEmail(name)}</strong> — ${escapeHtmlEmail(weeks)}</li>`
      })
      .join('')
    const amountDollars = `$${(newAmountCents / 100).toLocaleString('en-US')}`
    const tpl = await resolveEmailTemplateFields('registration_received')
    const html = buildRegistrationReceivedEmailHtml(
      { parentFullName: parentName, newWeeksListHtml: newListItems, amountDollars },
      tpl,
    )
    console.log('Email payload generated', { type: 'initial_registration', newAmountCents })
    const resend = new Resend(apiKey)

    const receiptHtml = buildRegistrationOpsReceiptHtml({
      kind: 'new_registration',
      submissionId: submission.id as string,
      authUserId: user.id,
      parentFullName: parentName,
      parentEmail: data.parentEmail,
      parentPhone: data.parentPhone,
      newWeekListItemHtml: newListItems,
      amountDollars,
      weekCount: newWeekCount,
    })
    const receiptSubject = `[NLSF receipt] ${parentName} · ${newWeekCount} week(s) · ${amountDollars}`
    const { error: receiptErr } = await resend.emails.send({
      from: SENDER_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: REGISTRATION_RECEIPT_EMAIL,
      subject: receiptSubject,
      html: receiptHtml,
    })
    if (receiptErr) {
      console.error('[submitFamilyRegistration] Ops receipt Resend error:', receiptErr)
    }

    const { error: sendErr } = await resend.emails.send({
      from: SENDER_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.parentEmail,
      subject: buildEmailSubject(tpl.subjectTemplate, { parentFullName: parentName, amountDollars }),
      html,
    })
    if (sendErr) {
      console.error('[submitFamilyRegistration] Resend send error:', sendErr)
    }
  } else {
    console.warn(
      '[submitFamilyRegistration] RESEND_API_KEY is missing or blank after trim; parent confirmation and ops receipt skipped.',
    )
  }

  return { success: true }
}

export type ParentPrefill = {
  parentFirstName: string
  parentLastName: string
  parentEmail: string
  parentPhone: string
}

/** Latest submission on file — for “Add another child” from the dashboard. */
export async function getParentPrefillForAdditionalChild(): Promise<ParentPrefill | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: sub, error } = await supabase
    .from('registration_submissions')
    .select('parent_first_name, parent_last_name, parent_email, parent_phone')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !sub) return null
  return {
    parentFirstName: sub.parent_first_name ?? '',
    parentLastName: sub.parent_last_name ?? '',
    parentEmail: sub.parent_email ?? '',
    parentPhone: sub.parent_phone ?? '',
  }
}
