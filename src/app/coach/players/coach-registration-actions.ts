'use server'

import { getStaffAdminUser } from '@/lib/admin'
import { buildEmailSubject } from '@/lib/email-template-interpolate'
import { resolveEmailTemplateFields } from '@/lib/email-templates-resolve'
import { insertDenormalizedRegistrationRows } from '@/lib/denormalized-registrations-insert'
import { CAMP_WEEK_PRICE_CENTS as CAMP_PRICE_CENTS } from '@/lib/camp-pricing'
import { CAMP_SESSIONS, campWeekSortIndex } from '@/lib/camp-weeks'
import { sendCoachOverrideEmail } from '@/lib/coach-override-resend'
import { escapeHtml } from '@/lib/html-escape'
import { buildRegistrationOpsReceiptHtml } from '@/lib/registration-ops-receipt-html'
import { nlsfCampWeekDetailPhrase, sendNlsfTransactionReceiptEmail, type NlsfTransactionLine } from '@/lib/nlsf-transaction-receipt-email'
import { buildRegistrationReceivedEmailHtml } from '@/lib/transactional-parent-email-html'
import { ensureParentAuthUserForManualRegistration } from '@/lib/supabase/auth-admin-client'
import { isCompleteUsPhone } from '@/lib/phone-mask'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { buildRegistrationsRows } from '@/lib/family-registration-rows'
import type { FamilyRegistrationInput } from '@/lib/family-registration-input-types'

const KNOWN_WEEKS = new Set<string>(CAMP_SESSIONS)

function escapeHtmlEmail(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function throwDb(context: string, err: unknown): never {
  const msg = err && typeof err === 'object' ? JSON.stringify(err) : String(err)
  throw new Error(`${context}: ${msg}`)
}

async function recomputeSubmissionTotalCents(db: ReturnType<typeof createServiceRoleClient>, submissionId: string) {
  const { count, error } = await db
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('registration_submission_id', submissionId)
  if (error) throwDb('recomputeSubmissionTotalCents count', error)
  const n = count ?? 0
  const { error: upErr } = await db
    .from('registration_submissions')
    .update({ total_amount_cents: n * CAMP_PRICE_CENTS })
    .eq('id', submissionId)
  if (upErr) throwDb('recomputeSubmissionTotalCents update submission', upErr)
}

async function syncChildCampWeeksFromRegistrations(
  db: ReturnType<typeof createServiceRoleClient>,
  submissionId: string,
  playerFirst: string,
  playerLast: string,
  childId: string,
) {
  const fn = playerFirst.trim()
  const ln = playerLast.trim()
  const { data: allRows, error } = await db
    .from('registrations')
    .select('camp_session, player_first_name, player_last_name')
    .eq('registration_submission_id', submissionId)
  if (error) throwDb('syncChildCampWeeksFromRegistrations select', error)
  const rows = (allRows ?? []).filter(
    (r) =>
      ((r.player_first_name as string | null) ?? '').trim() === fn &&
      ((r.player_last_name as string | null) ?? '').trim() === ln,
  )
  const weeks = [...new Set(rows.map((r) => (r.camp_session as string | null)?.trim()).filter(Boolean) as string[])].sort(
    (a, b) => campWeekSortIndex(a) - campWeekSortIndex(b),
  )
  const { error: upErr } = await db.from('registration_children').update({ camp_weeks: weeks }).eq('id', childId)
  if (upErr) throwDb('syncChildCampWeeksFromRegistrations update child', upErr)
}

type SubRow = {
  id: string
  parent_first_name: string | null
  parent_last_name: string | null
  parent_email: string | null
  parent_phone: string | null
}

type RegChildRow = {
  id: string
  submission_id: string
  player_first_name: string | null
  player_last_name: string | null
  child_photo_url: string | null
  camp_weeks: string[] | null
  player_dob: string | null
  player_experience_level: string | null
  player_experience_other: string | null
  grade_fall: string | null
  shirt_size: string | null
  medical_notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  primary_position: string | null
  secondary_position: string | null
  soccer_club: string | null
}

function playerExperienceForChild(c: RegChildRow): string {
  if (c.player_experience_level === 'other') {
    return (c.player_experience_other ?? '').trim() || 'Other'
  }
  return c.player_experience_level ?? ''
}

function sanitizeDobForReg(dob: string | null | undefined): string {
  const t = (dob ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return t
}

function registrationInsertRowFromTemplate(template: Record<string, unknown>, week: string): Record<string, unknown> {
  return {
    registration_submission_id: template.registration_submission_id,
    user_id: template.user_id,
    parent_first_name: template.parent_first_name,
    parent_last_name: template.parent_last_name,
    parent_email: template.parent_email,
    parent_phone: template.parent_phone,
    player_first_name: template.player_first_name,
    player_last_name: template.player_last_name,
    player_dob: template.player_dob,
    player_age_group: template.player_age_group,
    player_experience: template.player_experience,
    camp_session: week,
    shirt_size: template.shirt_size,
    child_photo_url: template.child_photo_url ?? null,
    medical_notes: template.medical_notes ?? null,
    emergency_contact_name: template.emergency_contact_name,
    emergency_contact_phone: template.emergency_contact_phone,
    status: 'pending',
    refund_requested_weeks: [],
    coach_discount_cents: 0,
    primary_position: template.primary_position,
    secondary_position: template.secondary_position,
    playing_level: template.playing_level ?? null,
    soccer_club: template.soccer_club ?? null,
  }
}

function registrationInsertRowFromChild(child: RegChildRow, sub: SubRow, userId: string, week: string): Record<string, unknown> {
  const exp = playerExperienceForChild(child)
  const level = child.player_experience_level === 'other' ? null : child.player_experience_level
  return {
    registration_submission_id: sub.id,
    user_id: userId,
    parent_first_name: sub.parent_first_name,
    parent_last_name: sub.parent_last_name,
    parent_email: sub.parent_email,
    parent_phone: sub.parent_phone,
    player_first_name: child.player_first_name,
    player_last_name: child.player_last_name,
    player_dob: sanitizeDobForReg(child.player_dob),
    player_age_group: child.grade_fall,
    player_experience: exp,
    camp_session: week,
    shirt_size: child.shirt_size,
    child_photo_url: child.child_photo_url ?? null,
    medical_notes: child.medical_notes ?? null,
    emergency_contact_name: child.emergency_contact_name,
    emergency_contact_phone: child.emergency_contact_phone,
    status: 'pending',
    refund_requested_weeks: [],
    coach_discount_cents: 0,
    primary_position: child.primary_position,
    secondary_position: child.secondary_position,
    playing_level: level,
    soccer_club: (child.soccer_club ?? '').trim() || null,
  }
}

async function sendStaffRegistrationEmails(args: {
  parentEmail: string
  parentName: string
  children: FamilyRegistrationInput['children']
  newListItems: string
  amountDollars: string
  newWeekCount: number
  submissionId: string
  authUserId: string
}) {
  const tpl = await resolveEmailTemplateFields('registration_received')
  const html = buildRegistrationReceivedEmailHtml(
    {
      parentFullName: args.parentName,
      newWeeksListHtml: args.newListItems,
      amountDollars: args.amountDollars,
    },
    tpl,
  )
  const subject = buildEmailSubject(tpl.subjectTemplate, {
    parentFullName: args.parentName,
    amountDollars: args.amountDollars,
  })
  const intro = `<p style="color:#0f172a;font-size:14px;margin-bottom:1rem;">Our office registered this on your behalf. If anything looks wrong, reply to this email.</p>`
  const parentResult = await sendCoachOverrideEmail({
    to: args.parentEmail,
    subject,
    html: intro + html,
  })
  if (!parentResult.ok) {
    console.error('[staffManualFamilyRegistration] parent email:', parentResult.message)
  }

  const receiptHtml = buildRegistrationOpsReceiptHtml({
    kind: 'new_registration',
    submissionId: args.submissionId,
    authUserId: args.authUserId,
    parentFullName: args.parentName,
    parentEmail: args.parentEmail,
    parentPhone: '',
    newWeekListItemHtml: args.newListItems,
    amountDollars: args.amountDollars,
    weekCount: args.newWeekCount,
  })
  const txLines = args.children.flatMap((c) => {
    const childName = `${c.playerFirstName} ${c.playerLastName}`.trim()
    return c.campWeeks.map((w) => ({
      parentDisplayName: args.parentName || 'Parent',
      childDisplayName: childName || 'Child',
      actionLabel: 'Registered',
      campWeekTail: nlsfCampWeekDetailPhrase(w),
    }))
  })
  await sendNlsfTransactionReceiptEmail({
    logContext: 'staffManualFamilyRegistration',
    subjectParentName: args.parentName || 'Parent',
    subjectActionType: 'MANUAL_REGISTERED',
    lines: txLines,
    htmlAppendix: `<p style="font-size:0.875rem;color:#64748b;margin-bottom:0.75rem;">Staff manual registration (on behalf of parent).</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:1rem 0;" />${receiptHtml}`,
  })
}

export type StaffManualRegistrationResult =
  | { success: true; submissionId: string; firstChildId: string; parentInvited: boolean }
  | { success: false; error: string }

export async function staffManualFamilyRegistration(
  data: FamilyRegistrationInput,
): Promise<StaffManualRegistrationResult> {
  const staff = await getStaffAdminUser()
  if (!staff) {
    return { success: false, error: 'You must be signed in with Google as staff to use manual registration.' }
  }

  if (data.hpCompany?.trim()) {
    return { success: false, error: 'Registration could not be completed.' }
  }
  if (!data.children.length) {
    return { success: false, error: 'Please add at least one child.' }
  }
  if (!isCompleteUsPhone(data.parentPhone)) {
    return { success: false, error: 'Parent phone must be a complete 10-digit US number.' }
  }
  for (const child of data.children) {
    if (!child.campWeeks.length) {
      return { success: false, error: 'Each child must have at least one camp week selected.' }
    }
    if (child.playerExperienceLevel === 'other' && !child.playerExperienceOther.trim()) {
      return { success: false, error: 'Describe the experience level when you select Other.' }
    }
    if (!child.primaryPosition.trim()) {
      return { success: false, error: 'Each player must have a primary position.' }
    }
    if (!child.playerSoccerClub.trim()) {
      return { success: false, error: 'Each player needs a club or program.' }
    }
    if (!child.gradeFall.trim()) {
      return { success: false, error: 'Each player must have a grade for fall.' }
    }
    if (!child.schoolFall.trim()) {
      return { success: false, error: 'Each player must have a school for fall.' }
    }
    if (!child.shirtSize.trim()) {
      return { success: false, error: 'Each player must have a shirt size.' }
    }
    if (!child.emergencyContactName.trim() || !child.emergencyContactPhone.trim()) {
      return { success: false, error: 'Each player needs emergency contact name and phone.' }
    }
    if (!isCompleteUsPhone(child.emergencyContactPhone)) {
      return { success: false, error: 'Emergency contact phone must be a complete 10-digit US number for each player.' }
    }
    for (const w of child.campWeeks) {
      if (!KNOWN_WEEKS.has(w)) {
        return { success: false, error: `Invalid camp week: ${w}` }
      }
    }
  }

  let db: ReturnType<typeof createServiceRoleClient>
  try {
    db = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }
  }

  const auth = await ensureParentAuthUserForManualRegistration(data.parentEmail)
  if (!auth.ok) {
    return { success: false, error: auth.message }
  }
  const authUserId = auth.userId
  const parentInvited = auth.invited

  const totalWeeks = data.children.reduce((n, c) => n + c.campWeeks.length, 0)
  const totalAmountCents = totalWeeks * CAMP_PRICE_CENTS

  const parentRow = {
    auth_user_id: authUserId,
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

  const { data: submission, error: subErr } = await db.from('registration_submissions').insert(parentRow).select('id').single()
  if (subErr || !submission) {
    console.error('[staffManualFamilyRegistration] submission insert', subErr)
    return { success: false, error: 'Could not create registration submission. Check logs.' }
  }

  const submissionId = submission.id as string

  const childRows = data.children.map((child, index) => ({
    submission_id: submissionId,
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

  const { data: insertedChildren, error: childrenErr } = await db
    .from('registration_children')
    .insert(childRows)
    .select('id')
  if (childrenErr || !insertedChildren?.length) {
    await db.from('registration_submissions').delete().eq('id', submissionId)
    console.error('[staffManualFamilyRegistration] children insert', childrenErr)
    return { success: false, error: 'Could not save player records.' }
  }

  const firstChildId = insertedChildren[0].id as string

  const registrationRows = buildRegistrationsRows(data, authUserId, submissionId)
  try {
    await insertDenormalizedRegistrationRows(registrationRows, '[staffManualFamilyRegistration]')
  } catch (e) {
    await db.from('registrations').delete().eq('registration_submission_id', submissionId)
    await db.from('registration_children').delete().eq('submission_id', submissionId)
    await db.from('registration_submissions').delete().eq('id', submissionId)
    console.error('[staffManualFamilyRegistration] registrations insert', e)
    return { success: false, error: 'Could not create camp week rows.' }
  }

  const parentName = `${data.parentFirstName} ${data.parentLastName}`.trim()
  const newWeekCount = totalWeeks
  const newListItems = data.children
    .map((c) => {
      const name = `${c.playerFirstName} ${c.playerLastName}`.trim()
      const weeks = c.campWeeks.join(', ')
      return `<li><strong>${escapeHtmlEmail(name)}</strong> — ${escapeHtmlEmail(weeks)}</li>`
    })
    .join('')
  const amountDollars = `$${(totalAmountCents / 100).toLocaleString('en-US')}`

  await sendStaffRegistrationEmails({
    parentEmail: data.parentEmail.trim(),
    parentName,
    children: data.children,
    newListItems,
    amountDollars,
    newWeekCount,
    submissionId,
    authUserId,
  })

  return { success: true, submissionId, firstChildId, parentInvited }
}

export type StaffCampWeekAdjustmentInput = {
  childId: string
  /** Canonical `CAMP_SESSIONS` labels to add (pending rows). */
  addWeeks?: string[]
  /** `registrations.id` for this player — only **pending** rows can be removed. */
  removeRegistrationIds?: string[]
  /** Move a pending week to another canonical week (updates `camp_session`). */
  moves?: { registrationId: string; toWeek: string }[]
}

export async function staffAdjustChildCampWeeks(
  input: StaffCampWeekAdjustmentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const staff = await getStaffAdminUser()
  if (!staff) {
    return { success: false, error: 'You must be signed in with Google as staff.' }
  }

  const childId = (input.childId ?? '').trim()
  if (!childId) return { success: false, error: 'Missing player id.' }

  const addWeeks = input.addWeeks?.filter((w) => KNOWN_WEEKS.has(w)) ?? []
  const removeIds = input.removeRegistrationIds?.filter(Boolean) ?? []
  const moves = input.moves?.filter((m) => m.registrationId && m.toWeek && KNOWN_WEEKS.has(m.toWeek)) ?? []

  if (addWeeks.length === 0 && removeIds.length === 0 && moves.length === 0) {
    return { success: false, error: 'Nothing to change.' }
  }

  let db: ReturnType<typeof createServiceRoleClient>
  try {
    db = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }
  }

  const { data: child, error: chErr } = await db
    .from('registration_children')
    .select(
      `
      id,
      submission_id,
      player_first_name,
      player_last_name,
      child_photo_url,
      camp_weeks,
      player_dob,
      player_experience_level,
      player_experience_other,
      grade_fall,
      shirt_size,
      medical_notes,
      emergency_contact_name,
      emergency_contact_phone,
      primary_position,
      secondary_position,
      soccer_club
    `,
    )
    .eq('id', childId)
    .maybeSingle()

  if (chErr || !child) {
    return { success: false, error: 'Player not found.' }
  }

  const { data: sub, error: sErr } = await db
    .from('registration_submissions')
    .select('id, parent_first_name, parent_last_name, parent_email, parent_phone, auth_user_id')
    .eq('id', child.submission_id as string)
    .single()

  if (sErr || !sub) {
    return { success: false, error: 'Registration submission not found.' }
  }

  const userId = sub.auth_user_id as string | null
  if (!userId) {
    return {
      success: false,
      error: 'This family submission is not linked to a parent account (auth_user_id is empty). Fix in database first.',
    }
  }

  const rc = child as RegChildRow
  const subRow: SubRow = {
    id: sub.id as string,
    parent_first_name: sub.parent_first_name as string | null,
    parent_last_name: sub.parent_last_name as string | null,
    parent_email: sub.parent_email as string | null,
    parent_phone: sub.parent_phone as string | null,
  }
  const fn = (rc.player_first_name ?? '').trim()
  const ln = (rc.player_last_name ?? '').trim()
  const submissionId = rc.submission_id as string
  const parentNameForReceipt =
    `${sub.parent_first_name ?? ''} ${sub.parent_last_name ?? ''}`.trim() || 'Parent'
  const childDisplayForReceipt = `${fn} ${ln}`.trim() || 'Child'

  try {
    const transactionReceiptLines: NlsfTransactionLine[] = []
    async function loadRegsForPlayer() {
      const { data, error } = await db
        .from('registrations')
        .select('id, camp_session, status, player_first_name, player_last_name')
        .eq('registration_submission_id', submissionId)
      if (error) throwDb('loadRegsForPlayer', error)
      return (data ?? []).filter(
        (r) =>
          ((r.player_first_name as string | null) ?? '').trim() === fn &&
          ((r.player_last_name as string | null) ?? '').trim() === ln,
      )
    }

    let existingRegs = await loadRegsForPlayer()
  let existingSessions = new Set(
    existingRegs.map((r) => ((r.camp_session as string | null) ?? '').trim()).filter(Boolean),
  )

  for (const rid of removeIds) {
    const row = existingRegs.find((r) => r.id === rid)
    if (!row) {
      return { success: false, error: `Remove: registration row ${rid} not found for this player.` }
    }
    const st = String(row.status ?? 'pending').toLowerCase()
    if (st !== 'pending') {
      return {
        success: false,
        error: `Cannot remove week "${row.camp_session}" — status is ${row.status}. Only pending rows can be removed here.`,
      }
    }
    const { error: delErr } = await db.from('registrations').delete().eq('id', rid)
    if (delErr) {
      console.error('[staffAdjustChildCampWeeks] delete', delErr)
      return { success: false, error: 'Could not remove a camp week row.' }
    }
    transactionReceiptLines.push({
      parentDisplayName: parentNameForReceipt,
      childDisplayName: childDisplayForReceipt,
      actionLabel: 'Canceled',
      campWeekTail: nlsfCampWeekDetailPhrase(((row.camp_session as string) ?? '').trim()),
    })
  }

  existingRegs = await loadRegsForPlayer()
  existingSessions = new Set(
    existingRegs.map((r) => ((r.camp_session as string | null) ?? '').trim()).filter(Boolean),
  )

  for (const mv of moves) {
    const row = existingRegs.find((r) => r.id === mv.registrationId)
    if (!row) {
      return { success: false, error: `Move: registration ${mv.registrationId} not found.` }
    }
    const st = String(row.status ?? 'pending').toLowerCase()
    if (st !== 'pending') {
      return { success: false, error: 'Only pending weeks can be moved here.' }
    }
    const fromW = ((row.camp_session as string) ?? '').trim()
    if (fromW === mv.toWeek) continue
    if (existingSessions.has(mv.toWeek) && fromW !== mv.toWeek) {
      return { success: false, error: `Target week already on file: ${mv.toWeek}` }
    }
    const { error: upErr } = await db.from('registrations').update({ camp_session: mv.toWeek }).eq('id', mv.registrationId)
    if (upErr) {
      console.error('[staffAdjustChildCampWeeks] move', upErr)
      return { success: false, error: 'Could not move a camp week.' }
    }
    transactionReceiptLines.push({
      parentDisplayName: parentNameForReceipt,
      childDisplayName: childDisplayForReceipt,
      actionLabel: 'Moved',
      campWeekTail: `from ${nlsfCampWeekDetailPhrase(fromW)} to ${nlsfCampWeekDetailPhrase(mv.toWeek)}`,
    })
    existingSessions.delete(fromW)
    existingSessions.add(mv.toWeek)
  }

  existingRegs = await loadRegsForPlayer()
  existingSessions = new Set(
    existingRegs.map((r) => ((r.camp_session as string | null) ?? '').trim()).filter(Boolean),
  )

  const { data: allForTemplate, error: templateListErr } = await db
    .from('registrations')
    .select('*')
    .eq('registration_submission_id', submissionId)
  if (templateListErr) {
    console.error('[staffAdjustChildCampWeeks] template list', templateListErr)
    return { success: false, error: 'Could not load registrations for this family.' }
  }
  const templateRow = (allForTemplate ?? []).find(
    (r) =>
      ((r.player_first_name as string | null) ?? '').trim() === fn &&
      ((r.player_last_name as string | null) ?? '').trim() === ln,
  )

  const insertRows: Record<string, unknown>[] = []
  const weeksActuallyAdded: string[] = []
  for (const week of addWeeks) {
    if (existingSessions.has(week)) continue
    const row = templateRow
      ? registrationInsertRowFromTemplate(templateRow as Record<string, unknown>, week)
      : registrationInsertRowFromChild(rc, subRow, userId, week)
    insertRows.push(row)
    weeksActuallyAdded.push(week)
    existingSessions.add(week)
  }

  if (insertRows.length) {
    try {
      await insertDenormalizedRegistrationRows(insertRows, '[staffAdjustChildCampWeeks]')
    } catch (e) {
      console.error('[staffAdjustChildCampWeeks] insert', e)
      return { success: false, error: 'Could not add camp week rows.' }
    }
    for (const week of weeksActuallyAdded) {
      transactionReceiptLines.push({
        parentDisplayName: parentNameForReceipt,
        childDisplayName: childDisplayForReceipt,
        actionLabel: 'Added',
        campWeekTail: nlsfCampWeekDetailPhrase(week),
      })
    }
  }

  await syncChildCampWeeksFromRegistrations(db, submissionId, fn, ln, childId)
  await recomputeSubmissionTotalCents(db, submissionId)

  if (transactionReceiptLines.length) {
    await sendNlsfTransactionReceiptEmail({
      logContext: 'staffAdjustChildCampWeeks',
      subjectParentName: parentNameForReceipt,
      subjectActionType: 'STAFF_CAMP_WEEK_UPDATE',
      lines: transactionReceiptLines,
    })
  }

  const parentEmail = (sub.parent_email ?? '').trim()
  const parentName = `${sub.parent_first_name ?? ''} ${sub.parent_last_name ?? ''}`.trim()
    if (parentEmail) {
      const lines: string[] = []
      if (removeIds.length) lines.push(`<li>Removed ${removeIds.length} pending week row(s).</li>`)
      if (moves.length) {
        for (const m of moves) {
          lines.push(`<li>Moved a registration to <strong>${escapeHtml(m.toWeek)}</strong>.</li>`)
        }
      }
      if (weeksActuallyAdded.length) {
        lines.push(
          `<li>Added ${weeksActuallyAdded.length} week(s): ${weeksActuallyAdded.map((w) => escapeHtml(w)).join(', ')}</li>`,
        )
      }
      const summaryHtml = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#0f172a;">
        <h1 style="color:#062744;">Camp weeks updated</h1>
        <p>Hi ${escapeHtml(parentName || 'there')},</p>
        <p>Our office updated camp weeks for <strong>${escapeHtml(`${fn} ${ln}`)}</strong>:</p>
        <ul>${lines.join('')}</ul>
        <p style="margin-top:1rem;color:#64748b;font-size:14px;">If this was unexpected, reply to this email.</p>
      </div>`
      const r = await sendCoachOverrideEmail({
        to: parentEmail,
        subject: `[Next Level Soccer] Camp weeks updated for ${fn} ${ln}`,
        html: summaryHtml,
      })
      if (!r.ok) console.error('[staffAdjustChildCampWeeks] email', r.message)
    }

    return { success: true }
  } catch (e) {
    console.error('[staffAdjustChildCampWeeks]', e)
    const msg = e instanceof Error ? e.message : 'Unexpected error while updating camp weeks.'
    return { success: false, error: msg }
  }
}

export async function staffUpdateChildClubAndLevel(input: {
  childId: string
  soccerClub: string
  experienceLevel: string
  experienceOther: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const staff = await getStaffAdminUser()
  if (!staff) {
    return { success: false, error: 'You must be signed in with Google as staff.' }
  }

  const childId = (input.childId ?? '').trim()
  const club = (input.soccerClub ?? '').trim()
  const level = (input.experienceLevel ?? '').trim()
  const other = (input.experienceOther ?? '').trim()
  if (!childId) return { success: false, error: 'Missing player.' }
  if (!club) return { success: false, error: 'Club is required.' }
  if (!level) return { success: false, error: 'Playing level is required.' }
  if (level === 'other' && !other) {
    return { success: false, error: 'Describe the playing level when you select Other.' }
  }

  let db: ReturnType<typeof createServiceRoleClient>
  try {
    db = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }
  }

  const { data: child, error: chErr } = await db
    .from('registration_children')
    .select('id, submission_id, player_first_name, player_last_name')
    .eq('id', childId)
    .maybeSingle()

  if (chErr || !child) {
    return { success: false, error: 'Player not found.' }
  }

  const fn = (child.player_first_name ?? '').trim()
  const ln = (child.player_last_name ?? '').trim()
  const submissionId = child.submission_id as string

  const { error: upChildErr } = await db
    .from('registration_children')
    .update({
      soccer_club: club,
      player_experience_level: level,
      player_experience_other: level === 'other' ? other : null,
    })
    .eq('id', childId)

  if (upChildErr) {
    console.error('[staffUpdateChildClubAndLevel] child update', upChildErr)
    return { success: false, error: 'Could not update player record.' }
  }

  const playingLevelForRegs = level === 'other' ? null : level

  const { data: regsAll, error: regErr } = await db
    .from('registrations')
    .select('id, player_first_name, player_last_name')
    .eq('registration_submission_id', submissionId)

  if (regErr) {
    console.error('[staffUpdateChildClubAndLevel] regs list', regErr)
    return { success: true }
  }

  const matchingIds = (regsAll ?? [])
    .filter(
      (r) =>
        ((r.player_first_name as string | null) ?? '').trim() === fn &&
        ((r.player_last_name as string | null) ?? '').trim() === ln,
    )
    .map((r) => r.id as string)

  if (matchingIds.length) {
    const { error: upRegErr } = await db
      .from('registrations')
      .update({ soccer_club: club, playing_level: playingLevelForRegs })
      .in('id', matchingIds)
    if (upRegErr) {
      console.error('[staffUpdateChildClubAndLevel] regs update', upRegErr)
    }
  }

  return { success: true }
}
