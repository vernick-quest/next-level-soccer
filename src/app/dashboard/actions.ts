'use server'

import { Resend } from 'resend'
import { insertDenormalizedRegistrationRows } from '@/lib/denormalized-registrations-insert'
import { REPLY_TO_EMAIL, SENDER_EMAIL } from '@/lib/resend-sender'
import { CAMP_SESSIONS, campWeekSortIndex } from '@/lib/camp-weeks'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getOwnerEmail } from '@/lib/admin'
import { getWeekSpotUsage, validateCampWeekCapacityForSubmission } from '@/lib/home-camp-spots'
import { isRefundWindowOpenPacific } from '@/lib/refund-deadline'

const CAMP_PRICE_CENTS = 35_000
const KNOWN_WEEKS = new Set<string>(CAMP_SESSIONS)

/** One row in `public.registrations` (camp week + player). */
export type DashboardCamp = {
  registrationId: string
  childName: string
  childPhotoUrl: string | null
  /** Same as `camp_session` in the database. */
  week: string
  registrationStatus: string
  displayStatus: 'pending' | 'confirmed' | 'refund_requested'
}

export type DashboardIncrementalChild = {
  registrationChildId: string
  submissionId: string
  submissionPending: boolean
  firstName: string
  lastName: string
  photoUrl: string | null
  existingWeeks: {
    week: string
    registrationId: string
    displayStatus: 'pending' | 'confirmed' | 'refund_requested'
  }[]
}

function displayStatusForRegistrationRow(
  status: string | null | undefined,
  week: string,
  refundWeeks: string[] | null | undefined,
): DashboardIncrementalChild['existingWeeks'][0]['displayStatus'] {
  const refundSet = new Set(refundWeeks ?? [])
  const st = (status ?? 'pending').toLowerCase()
  if (st === 'refund_requested' || (week && refundSet.has(week))) {
    return 'refund_requested'
  }
  if (st === 'confirmed') return 'confirmed'
  return 'pending'
}

function rowsToCamps(
  data: {
    id: string
    status: string | null
    camp_session: string | null
    child_photo_url: string | null
    player_first_name: string | null
    player_last_name: string | null
    refund_requested_weeks: string[] | null
  }[],
): DashboardCamp[] {
  const camps: DashboardCamp[] = []
  for (const row of data) {
    const week = row.camp_session ?? ''
    const displayStatus = displayStatusForRegistrationRow(row.status, week, row.refund_requested_weeks)
    camps.push({
      registrationId: row.id,
      childName: `${row.player_first_name ?? ''} ${row.player_last_name ?? ''}`.trim(),
      childPhotoUrl: row.child_photo_url ?? null,
      week,
      registrationStatus: row.status ?? 'pending',
      displayStatus,
    })
  }
  return camps
}

export async function getDashboardPageData(): Promise<{
  camps: DashboardCamp[]
  incremental: { children: DashboardIncrementalChild[]; weekRemaining: Record<string, number> } | null
  error: 'auth' | 'fetch' | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { camps: [], incremental: null, error: 'auth' }

  const { data, error } = await supabase
    .from('registrations')
    .select(
      `
      id,
      status,
      camp_session,
      child_photo_url,
      player_first_name,
      player_last_name,
      refund_requested_weeks,
      registration_submission_id,
      created_at
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getDashboardPageData registrations:', error)
    return { camps: [], incremental: null, error: 'fetch' }
  }

  const camps = rowsToCamps(data ?? [])

  const { data: submissions, error: subErr } = await supabase
    .from('registration_submissions')
    .select('id, status, parent_email, parent_first_name, parent_last_name')
    .eq('auth_user_id', user.id)

  if (subErr) {
    console.error('getDashboardPageData submissions:', subErr)
    return { camps, incremental: null, error: 'fetch' }
  }

  const submissionIds = (submissions ?? []).map((s) => s.id)
  if (submissionIds.length === 0) {
    const usage = await getWeekSpotUsage()
    const weekRemaining: Record<string, number> = {}
    for (const w of CAMP_SESSIONS) {
      weekRemaining[w] = usage?.[w]?.remaining ?? 0
    }
    return { camps, incremental: { children: [], weekRemaining }, error: null }
  }

  const { data: regChildren, error: chErr } = await supabase
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
      soccer_club,
      player_gender
    `,
    )
    .in('submission_id', submissionIds)

  if (chErr) {
    console.error('getDashboardPageData registration_children:', chErr)
    return { camps, incremental: null, error: 'fetch' }
  }

  const usage = await getWeekSpotUsage()
  const weekRemaining: Record<string, number> = {}
  for (const w of CAMP_SESSIONS) {
    weekRemaining[w] = usage?.[w]?.remaining ?? 0
  }

  const regRows = data ?? []
  const incrementalChildren: DashboardIncrementalChild[] = []

  for (const child of regChildren ?? []) {
    const sub = (submissions ?? []).find((s) => s.id === child.submission_id)
    if (!sub) continue

    const fn = (child.player_first_name ?? '').trim()
    const ln = (child.player_last_name ?? '').trim()
    const matching = regRows.filter(
      (r) =>
        r.registration_submission_id === child.submission_id &&
        (r.player_first_name ?? '').trim() === fn &&
        (r.player_last_name ?? '').trim() === ln,
    )

    const weekMap = new Map<
      string,
      { registrationId: string; displayStatus: DashboardIncrementalChild['existingWeeks'][0]['displayStatus'] }
    >()

    for (const r of matching) {
      const w = r.camp_session ?? ''
      if (!w) continue
      weekMap.set(w, {
        registrationId: r.id,
        displayStatus: displayStatusForRegistrationRow(r.status, w, r.refund_requested_weeks),
      })
    }

    for (const w of child.camp_weeks ?? []) {
      if (!KNOWN_WEEKS.has(w)) continue
      if (!weekMap.has(w)) {
        weekMap.set(w, { registrationId: '', displayStatus: 'pending' })
      }
    }

    const existingWeeks = [...weekMap.entries()]
      .map(([week, v]) => ({
        week,
        registrationId: v.registrationId,
        displayStatus: v.displayStatus,
      }))
      .sort((a, b) => campWeekSortIndex(a.week) - campWeekSortIndex(b.week))

    incrementalChildren.push({
      registrationChildId: child.id,
      submissionId: child.submission_id,
      submissionPending: (sub.status ?? 'pending').toLowerCase() === 'pending',
      firstName: child.player_first_name ?? '',
      lastName: child.player_last_name ?? '',
      photoUrl: child.child_photo_url ?? null,
      existingWeeks,
    })
  }

  incrementalChildren.sort((a, b) => {
    const n = a.lastName.localeCompare(b.lastName)
    if (n !== 0) return n
    return a.firstName.localeCompare(b.firstName)
  })

  return {
    camps,
    incremental: { children: incrementalChildren, weekRemaining },
    error: null,
  }
}

/** @deprecated Prefer getDashboardPageData */
export async function getDashboardCamps(): Promise<{
  camps: DashboardCamp[]
  error: 'auth' | 'fetch' | null
}> {
  const { camps, error } = await getDashboardPageData()
  return { camps, error }
}

export async function removePendingCampRegistration(input: {
  registrationId: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in first.' }

  const { data: row, error: fetchErr } = await supabase
    .from('registrations')
    .select(
      'id, user_id, status, camp_session, registration_submission_id, player_first_name, player_last_name',
    )
    .eq('id', input.registrationId)
    .single()

  if (fetchErr || !row) {
    return { success: false, error: 'Registration not found.' }
  }
  if (row.user_id !== user.id) {
    return { success: false, error: 'Registration not found.' }
  }
  if ((row.status ?? 'pending').toLowerCase() !== 'pending') {
    return { success: false, error: 'Only pending registrations can be cancelled.' }
  }

  const sid = row.registration_submission_id
  const weekRemoved = row.camp_session ?? ''
  const pfn = (row.player_first_name ?? '').trim()
  const pln = (row.player_last_name ?? '').trim()

  try {
    const service = createServiceRoleClient()
    const { error: delErr } = await service.from('registrations').delete().eq('id', input.registrationId)
    if (delErr) {
      console.error('removePendingCampRegistration:', delErr)
      return { success: false, error: 'Could not cancel registration.' }
    }
    if (sid && weekRemoved) {
      const { data: rc } = await service
        .from('registration_children')
        .select('id, camp_weeks')
        .eq('submission_id', sid)
        .eq('player_first_name', pfn)
        .eq('player_last_name', pln)
        .maybeSingle()
      if (rc?.id) {
        const nextWeeks = (rc.camp_weeks ?? []).filter((w: string) => w !== weekRemoved)
        const { error: upCh } = await service
          .from('registration_children')
          .update({ camp_weeks: nextWeeks })
          .eq('id', rc.id)
        if (upCh) console.error('removePendingCampRegistration sync child camp_weeks:', upCh)
      }
      const { data: sub } = await service
        .from('registration_submissions')
        .select('total_amount_cents')
        .eq('id', sid)
        .maybeSingle()
      if (sub && typeof sub.total_amount_cents === 'number') {
        const nextTotal = Math.max(0, sub.total_amount_cents - CAMP_PRICE_CENTS)
        const { error: upSub } = await service
          .from('registration_submissions')
          .update({ total_amount_cents: nextTotal })
          .eq('id', sid)
        if (upSub) console.error('removePendingCampRegistration sync submission total:', upSub)
      }
    }
    return { success: true }
  } catch {
    const { error: delErr, data: deleted } = await supabase
      .from('registrations')
      .delete()
      .eq('id', input.registrationId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select('id')
    if (delErr || !deleted?.length) {
      return {
        success: false,
        error:
          'Could not cancel registration. Add SUPABASE_SERVICE_ROLE_KEY or enable DELETE on registrations for parents in RLS.',
      }
    }
    return { success: true }
  }
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

type SubRow = {
  id: string
  status: string | null
  parent_first_name: string | null
  parent_last_name: string | null
  parent_email: string | null
  parent_phone: string | null
  total_amount_cents: number | null
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

function registrationInsertRowFromTemplate(
  template: Record<string, unknown>,
  week: string,
): Record<string, unknown> {
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
    primary_position: template.primary_position,
    secondary_position: template.secondary_position,
    playing_level: template.playing_level ?? null,
    soccer_club: template.soccer_club ?? null,
  }
}

function registrationInsertRowFromChild(
  child: RegChildRow,
  sub: SubRow,
  userId: string,
  week: string,
): Record<string, unknown> {
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
    primary_position: child.primary_position,
    secondary_position: child.secondary_position,
    playing_level: level,
    soccer_club: (child.soccer_club ?? '').trim() || null,
  }
}

export async function submitAdditionalWeeks(input: {
  items: { registrationChildId: string; requestedWeeks: string[] }[]
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in first.' }

  if (!input.items?.length) {
    return { success: false, error: 'No selections to save.' }
  }

  let db: ReturnType<typeof createServiceRoleClient>
  try {
    db = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const mergedByChild = new Map<string, string[]>()
  for (const it of input.items) {
    const cur = mergedByChild.get(it.registrationChildId) ?? []
    mergedByChild.set(it.registrationChildId, [...cur, ...it.requestedWeeks])
  }

  type Resolved = {
    child: RegChildRow
    sub: SubRow
    newWeeks: string[]
    existing: Set<string>
  }
  const resolved: Resolved[] = []

  for (const [registrationChildId, requested] of mergedByChild) {
    const { data: child, error: chErr } = await supabase
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
      .eq('id', registrationChildId)
      .single()

    if (chErr || !child) {
      return { success: false, error: 'Player not found.' }
    }

    const { data: sub, error: sErr } = await supabase
      .from('registration_submissions')
      .select(
        'id, status, auth_user_id, parent_first_name, parent_last_name, parent_email, parent_phone, total_amount_cents',
      )
      .eq('id', child.submission_id)
      .single()

    if (sErr || !sub) {
      return { success: false, error: 'Registration not found.' }
    }
    if (sub.auth_user_id !== user.id) {
      return { success: false, error: 'Not authorized.' }
    }
    if ((sub.status ?? 'pending').toLowerCase() !== 'pending') {
      return {
        success: false,
        error: 'Additional weeks can only be added while your registration is still pending payment. Email us for help.',
      }
    }

    const rc = child as RegChildRow
    const subRow = sub as SubRow

    const fn = (rc.player_first_name ?? '').trim()
    const ln = (rc.player_last_name ?? '').trim()
    const { data: regList } = await supabase
      .from('registrations')
      .select('camp_session')
      .eq('user_id', user.id)
      .eq('registration_submission_id', rc.submission_id)
      .eq('player_first_name', fn)
      .eq('player_last_name', ln)

    const existing = new Set<string>()
    for (const w of rc.camp_weeks ?? []) {
      if (KNOWN_WEEKS.has(w)) existing.add(w)
    }
    for (const r of regList ?? []) {
      const w = r.camp_session ?? ''
      if (w) existing.add(w)
    }

    const newWeeks: string[] = []
    const seen = new Set<string>()
    for (const w of requested) {
      if (!KNOWN_WEEKS.has(w)) continue
      if (existing.has(w)) {
        console.log('Existing weeks skipped', { registrationChildId, week: w })
        continue
      }
      if (seen.has(w)) continue
      seen.add(w)
      newWeeks.push(w)
    }

    if (newWeeks.length) {
      console.log('New weeks detected', { registrationChildId, weeks: newWeeks })
    }

    resolved.push({ child: rc, sub: subRow, newWeeks, existing })
  }

  const capacityChildren = resolved.filter((r) => r.newWeeks.length > 0).map((r) => ({ campWeeks: r.newWeeks }))
  if (capacityChildren.length === 0) {
    return { success: false, error: 'No new weeks to add (all selected weeks are already on file).' }
  }

  const cap = await validateCampWeekCapacityForSubmission(capacityChildren)
  if (!cap.ok) {
    return { success: false, error: cap.error }
  }

  const allInsertRows: Record<string, unknown>[] = []
  let addedWeekCount = 0

  for (const { child, sub, newWeeks } of resolved) {
    if (newWeeks.length === 0) continue

    const fn = (child.player_first_name ?? '').trim()
    const ln = (child.player_last_name ?? '').trim()

    const { data: template } = await db
      .from('registrations')
      .select('*')
      .eq('registration_submission_id', child.submission_id)
      .eq('player_first_name', fn)
      .eq('player_last_name', ln)
      .limit(1)
      .maybeSingle()

    for (const week of newWeeks) {
      const row = template
        ? registrationInsertRowFromTemplate(template as Record<string, unknown>, week)
        : registrationInsertRowFromChild(child, sub, user.id, week)
      allInsertRows.push(row)
    }
    addedWeekCount += newWeeks.length
  }

  try {
    await insertDenormalizedRegistrationRows(allInsertRows, '[submitAdditionalWeeks]')
  } catch (e) {
    console.error('submitAdditionalWeeks insert registrations:', e)
    return { success: false, error: 'Could not add camp weeks. Please try again.' }
  }

  const submissionAddCents = new Map<string, number>()
  for (const { sub, newWeeks } of resolved) {
    if (newWeeks.length === 0) continue
    submissionAddCents.set(sub.id, (submissionAddCents.get(sub.id) ?? 0) + newWeeks.length * CAMP_PRICE_CENTS)
  }

  for (const { child, newWeeks } of resolved) {
    if (newWeeks.length === 0) continue
    const mergedCampWeeks = [...new Set([...(child.camp_weeks ?? []), ...newWeeks])].sort(
      (a, b) => campWeekSortIndex(a) - campWeekSortIndex(b),
    )
    const { error: upChErr } = await db
      .from('registration_children')
      .update({ camp_weeks: mergedCampWeeks })
      .eq('id', child.id)
    if (upChErr) {
      console.error('submitAdditionalWeeks update registration_children:', upChErr)
      return { success: false, error: 'Could not save camp weeks. Please try again.' }
    }
  }

  for (const [submissionId, addCents] of submissionAddCents) {
    const { data: curSub, error: fetchSubErr } = await db
      .from('registration_submissions')
      .select('total_amount_cents')
      .eq('id', submissionId)
      .single()
    if (fetchSubErr || !curSub) {
      console.error('submitAdditionalWeeks fetch submission for total:', fetchSubErr)
      return { success: false, error: 'Could not update payment total. Please try again.' }
    }
    const { error: upSubErr } = await db
      .from('registration_submissions')
      .update({ total_amount_cents: (curSub.total_amount_cents ?? 0) + addCents })
      .eq('id', submissionId)
    if (upSubErr) {
      console.error('submitAdditionalWeeks update registration_submissions:', upSubErr)
      return { success: false, error: 'Could not update payment total. Please try again.' }
    }
  }

  const parentEmail = resolved[0]?.sub.parent_email ?? ''
  const parentName =
    `${resolved[0]?.sub.parent_first_name ?? ''} ${resolved[0]?.sub.parent_last_name ?? ''}`.trim()

  const { data: confirmedRows } = await db
    .from('registrations')
    .select('player_first_name, player_last_name, camp_session, refund_requested_weeks, status')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')

  const confirmedLines: string[] = []
  for (const r of confirmedRows ?? []) {
    const w = r.camp_session ?? ''
    const refunds = new Set(r.refund_requested_weeks ?? [])
    const name = `${r.player_first_name ?? ''} ${r.player_last_name ?? ''}`.trim()
    if (refunds.has(w)) {
      confirmedLines.push(
        `<li><strong>${escapeHtml(name)}</strong> — ${escapeHtml(w)} (refund requested)</li>`,
      )
    } else {
      confirmedLines.push(`<li><strong>${escapeHtml(name)}</strong> — ${escapeHtml(w)}</li>`)
    }
  }

  const newLines: string[] = []
  for (const r of resolved) {
    for (const w of r.newWeeks) {
      const name = `${r.child.player_first_name ?? ''} ${r.child.player_last_name ?? ''}`.trim()
      newLines.push(`<li><strong>${escapeHtml(name)}</strong> — ${escapeHtml(w)}</li>`)
    }
  }

  const newAmountCents = addedWeekCount * CAMP_PRICE_CENTS

  const apiKey = process.env.RESEND_API_KEY
  if (apiKey && parentEmail) {
    const confirmedBlock =
      confirmedLines.length > 0
        ? `<ul>${confirmedLines.join('')}</ul>`
        : '<p style="color:#64748b;font-size:14px;">None yet.</p>'
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
        <h1 style="color: #062744;">Camp weeks updated</h1>
        <p>Hi ${escapeHtml(parentName)},</p>
        <p><strong>Paid / confirmed</strong></p>
        ${confirmedBlock}
        <p><strong>New — payment required</strong></p>
        <ul>${newLines.join('')}</ul>
        <p><strong>Amount due for these additional camp weeks:</strong> $${(newAmountCents / 100).toLocaleString('en-US')}</p>
        <p>Pay via Zelle or Venmo to reserve these spots. Questions? Reply to this email.</p>
        <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">— Next Level Soccer SF</p>
      </div>
    `
    console.log('Email payload generated', {
      type: 'incremental_weeks',
      newAmountCents,
      addedWeekCount,
    })
    const resend = new Resend(apiKey)
    const { error: sendErr } = await resend.emails.send({
      from: SENDER_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: parentEmail,
      subject: 'Additional camp weeks — payment due — Next Level Soccer SF',
      html,
    })
    if (sendErr) {
      console.error('submitAdditionalWeeks Resend:', sendErr)
    }
  } else {
    console.warn('submitAdditionalWeeks: RESEND_API_KEY or parent email missing; skip confirmation email.')
  }

  return { success: true }
}

export async function requestRefundForCamp(input: {
  registrationId: string
  week: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in first.' }

  if (!isRefundWindowOpenPacific()) {
    return { success: false, error: 'The refund request window has closed.' }
  }

  const { data: row, error: fetchErr } = await supabase
    .from('registrations')
    .select(
      'id, user_id, status, camp_session, player_first_name, player_last_name, parent_first_name, parent_last_name, parent_email, refund_requested_weeks',
    )
    .eq('id', input.registrationId)
    .single()

  if (fetchErr || !row) {
    return { success: false, error: 'Registration not found.' }
  }
  if (row.user_id !== user.id) {
    return { success: false, error: 'Registration not found.' }
  }
  if ((row.status ?? '').toLowerCase() !== 'confirmed') {
    return { success: false, error: 'Refunds can only be requested for confirmed registrations.' }
  }

  const campSession = row.camp_session ?? ''
  if (!campSession || campSession !== input.week) {
    return { success: false, error: 'Camp week does not match this registration.' }
  }

  const existing = row.refund_requested_weeks ?? []
  if (existing.includes(input.week)) {
    return { success: false, error: 'A refund has already been requested for this week.' }
  }

  let service
  try {
    service = createServiceRoleClient()
  } catch {
    return {
      success: false,
      error: 'Refund request could not be saved. Server configuration is incomplete.',
    }
  }

  const nextRefundWeeks = [...existing, input.week]
  const { error: upErr } = await service
    .from('registrations')
    .update({ refund_requested_weeks: nextRefundWeeks })
    .eq('id', input.registrationId)

  if (upErr) {
    console.error('requestRefundForCamp:', upErr)
    return { success: false, error: 'Could not save refund request. Please try again.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const notifyTo =
    process.env.RESEND_REFUND_TO ??
    process.env.OWNER_EMAIL ??
    process.env.ADMIN_EMAIL ??
    getOwnerEmail()
  if (apiKey && notifyTo) {
    const childName = `${row.player_first_name} ${row.player_last_name}`.trim()
    const parentName = `${row.parent_first_name} ${row.parent_last_name}`.trim()
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 560px;">
        <h2 style="color:#062744;">Refund requested</h2>
        <p><strong>Parent:</strong> ${escapeHtml(parentName)} (${escapeHtml(row.parent_email)})</p>
        <p><strong>Player:</strong> ${escapeHtml(childName)}</p>
        <p><strong>Camp week:</strong> ${escapeHtml(input.week)}</p>
        <p style="color:#64748b;font-size:14px;">Submitted via Parent Dashboard.</p>
      </div>
    `
    const resend = new Resend(apiKey)
    const { error: sendErr } = await resend.emails.send({
      from: SENDER_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: notifyTo,
      subject: `Refund request — ${childName} — ${input.week}`,
      html,
    })
    if (sendErr) {
      console.error('requestRefundForCamp email:', sendErr)
    }
  } else {
    console.warn(
      'requestRefundForCamp: missing RESEND_API_KEY or RESEND_REFUND_TO/OWNER_EMAIL; refund saved but email not sent.',
    )
  }

  return { success: true }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
