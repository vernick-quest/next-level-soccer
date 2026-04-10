'use server'

import { Resend } from 'resend'
import { getStaffAdminUser } from '@/lib/admin'
import {
  htmlParentWeeklyReport,
  htmlRefundApproved,
  htmlRefundDeclined,
  htmlRefundMoneySent,
  htmlRegistrationConfirmed,
  htmlRegistrationDeclined,
} from '@/lib/coach-portal-emails'
import { campNameFromWeekLabel } from '@/lib/camp-display'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import {
  COACH_REPORT_METRIC_KEYS,
  type CoachReportMetricKey,
  type ReportMetricKey,
} from '@/lib/player-report-metrics'
import { REPLY_TO_EMAIL, SENDER_EMAIL } from '@/lib/resend-sender'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

const KNOWN_CAMP_WEEKS = new Set<string>(CAMP_SESSIONS)

export type CoachPlayerRow = {
  id: string
  player_first_name: string
  player_last_name: string
  grade_fall: string
  child_photo_url: string | null
  soccer_club: string | null
  registration_submissions: {
    parent_first_name: string
    parent_last_name: string
    parent_email: string
  } | null
}

export type CoachRegistrationRow = {
  id: string
  created_at: string
  camp_session: string
  status: string | null
  decline_reason: string | null
  refund_requested_weeks: string[] | null
  refund_denial_reason: string | null
  camp_completed_at: string | null
  refund_approved_at: string | null
  refund_money_sent_at: string | null
  player_first_name: string | null
  player_last_name: string | null
  parent_first_name: string | null
  parent_last_name: string | null
  parent_email: string | null
  registration_submission_id: string | null
}

export type CoachWeekPlayerRow = {
  registrationChildId: string
  registrationRowId: string
  player_first_name: string
  player_last_name: string
  grade_fall: string
  child_photo_url: string | null
  soccer_club: string | null
  parent_email: string | null
  parent_first_name: string | null
  parent_last_name: string | null
  reportSubmitted: boolean
  parentEmailSent: boolean
}

function trimName(s: string | null | undefined) {
  return (s ?? '').trim()
}

export async function listPlayersForCoach(): Promise<{
  players: CoachPlayerRow[]
  error: 'auth' | 'fetch' | null
}> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) {
    return { players: [], error: 'auth' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('registration_children')
    .select(
      `
      id,
      player_first_name,
      player_last_name,
      grade_fall,
      child_photo_url,
      soccer_club,
      registration_submissions (
        parent_first_name,
        parent_last_name,
        parent_email
      )
    `,
    )
    .order('player_last_name', { ascending: true })
    .order('player_first_name', { ascending: true })

  if (error) {
    console.error('listPlayersForCoach:', error)
    return { players: [], error: 'fetch' }
  }

  const rows = data ?? []
  const players: CoachPlayerRow[] = rows.map((row) => {
    const sub = row.registration_submissions
    const submission =
      sub == null ? null : Array.isArray(sub) ? (sub[0] ?? null) : sub
    return {
      id: row.id,
      player_first_name: row.player_first_name,
      player_last_name: row.player_last_name,
      grade_fall: row.grade_fall,
      child_photo_url: row.child_photo_url,
      soccer_club: row.soccer_club ?? null,
      registration_submissions: submission,
    }
  })

  return { players, error: null }
}

export async function listCoachRegistrations(): Promise<{
  rows: CoachRegistrationRow[]
  error: 'auth' | 'fetch' | null
}> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) return { rows: [], error: 'auth' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('registrations')
    .select(
      `
      id,
      created_at,
      camp_session,
      status,
      decline_reason,
      refund_requested_weeks,
      refund_denial_reason,
      camp_completed_at,
      refund_approved_at,
      refund_money_sent_at,
      player_first_name,
      player_last_name,
      parent_first_name,
      parent_last_name,
      parent_email,
      registration_submission_id
    `,
    )
    .order('created_at', { ascending: true })

  if (error) {
    console.error('listCoachRegistrations:', error)
    return { rows: [], error: 'fetch' }
  }

  const rows: CoachRegistrationRow[] = (data ?? []).map((r) => ({
    id: r.id,
    created_at: r.created_at ?? '',
    camp_session: r.camp_session ?? '',
    status: r.status ?? null,
    decline_reason: r.decline_reason ?? null,
    refund_requested_weeks: (r.refund_requested_weeks as string[] | null) ?? null,
    refund_denial_reason: (r as { refund_denial_reason?: string | null }).refund_denial_reason ?? null,
    camp_completed_at: (r as { camp_completed_at?: string | null }).camp_completed_at ?? null,
    refund_approved_at: (r as { refund_approved_at?: string | null }).refund_approved_at ?? null,
    refund_money_sent_at: (r as { refund_money_sent_at?: string | null }).refund_money_sent_at ?? null,
    player_first_name: r.player_first_name,
    player_last_name: r.player_last_name,
    parent_first_name: r.parent_first_name,
    parent_last_name: r.parent_last_name,
    parent_email: r.parent_email,
    registration_submission_id: r.registration_submission_id,
  }))

  return { rows, error: null }
}

export async function listCoachWeekReportRows(campSession: string): Promise<{
  players: CoachWeekPlayerRow[]
  error: 'auth' | 'fetch' | 'invalid' | null
}> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) return { players: [], error: 'auth' }
  if (!KNOWN_CAMP_WEEKS.has(campSession)) return { players: [], error: 'invalid' }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { players: [], error: 'fetch' }
  }

  const { data: regs, error: regErr } = await service
    .from('registrations')
    .select(
      'id, camp_session, status, registration_submission_id, player_first_name, player_last_name, parent_email, parent_first_name, parent_last_name',
    )
    .eq('camp_session', campSession)
    .eq('status', 'confirmed')

  if (regErr) {
    console.error('listCoachWeekReportRows registrations:', regErr)
    return { players: [], error: 'fetch' }
  }

  const { data: children, error: chErr } = await service.from('registration_children').select(`
      id,
      submission_id,
      player_first_name,
      player_last_name,
      grade_fall,
      child_photo_url,
      soccer_club
    `)

  if (chErr) {
    console.error('listCoachWeekReportRows children:', chErr)
    return { players: [], error: 'fetch' }
  }

  const { data: reports, error: repErr } = await service
    .from('player_reports')
    .select('registration_child_id, parent_email_sent_at, technical_1')
    .eq('camp_session', campSession)

  if (repErr) {
    console.error('listCoachWeekReportRows reports:', repErr)
    return { players: [], error: 'fetch' }
  }

  const reportByChild = new Map<string, { sent: boolean; hasScores: boolean }>()
  for (const rep of reports ?? []) {
    const cid = rep.registration_child_id as string
    const hasScores = rep.technical_1 != null
    const sent = rep.parent_email_sent_at != null
    reportByChild.set(cid, { sent, hasScores })
  }

  const childList = children ?? []
  const players: CoachWeekPlayerRow[] = []

  for (const reg of regs ?? []) {
    const sid = reg.registration_submission_id
    if (!sid) continue
    const pfn = trimName(reg.player_first_name)
    const pln = trimName(reg.player_last_name)
    const child = childList.find(
      (c) =>
        c.submission_id === sid && trimName(c.player_first_name) === pfn && trimName(c.player_last_name) === pln,
    )
    if (!child) continue

    const repInfo = reportByChild.get(child.id)
    players.push({
      registrationChildId: child.id,
      registrationRowId: reg.id,
      player_first_name: child.player_first_name ?? '',
      player_last_name: child.player_last_name ?? '',
      grade_fall: child.grade_fall ?? '',
      child_photo_url: child.child_photo_url ?? null,
      soccer_club: child.soccer_club ?? null,
      parent_email: reg.parent_email ?? null,
      parent_first_name: reg.parent_first_name ?? null,
      parent_last_name: reg.parent_last_name ?? null,
      reportSubmitted: !!repInfo?.hasScores,
      parentEmailSent: !!repInfo?.sent,
    })
  }

  players.sort((a, b) => {
    const ln = a.player_last_name.localeCompare(b.player_last_name)
    if (ln !== 0) return ln
    return a.player_first_name.localeCompare(b.player_first_name)
  })

  return { players, error: null }
}

export type RegistrationDecisionResult = { success: true } | { success: false; error: string }

export async function setRegistrationDecision(input: {
  registrationId: string
  decision: 'confirmed' | 'declined'
  declineReason?: string
}): Promise<RegistrationDecisionResult> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) {
    return { success: false, error: 'You must be signed in as staff.' }
  }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const reason = (input.declineReason ?? '').trim()
  if (input.decision === 'declined' && !reason) {
    return { success: false, error: 'Please enter a reason for declining this registration.' }
  }

  const { data: row, error: fetchErr } = await service
    .from('registrations')
    .select(
      'id, parent_email, parent_first_name, player_first_name, player_last_name, camp_session, status',
    )
    .eq('id', input.registrationId)
    .single()

  if (fetchErr || !row) {
    return { success: false, error: 'Registration not found.' }
  }

  const st = (row.status ?? '').toLowerCase()
  if (st === 'declined' || st === 'confirmed') {
    return { success: false, error: 'This registration has already been finalized.' }
  }

  const nextStatus = input.decision === 'confirmed' ? 'confirmed' : 'declined'
  const { error: upErr } = await service
    .from('registrations')
    .update({
      status: nextStatus,
      decline_reason: input.decision === 'declined' ? reason : null,
    })
    .eq('id', input.registrationId)

  if (upErr) {
    console.error('setRegistrationDecision:', upErr)
    return { success: false, error: 'Could not update registration.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const parentEmail = (row.parent_email ?? '').trim()
  const parentFirst = (row.parent_first_name ?? '').trim() || 'there'
  const playerName = `${row.player_first_name ?? ''} ${row.player_last_name ?? ''}`.trim()
  const weekLabel = campNameFromWeekLabel(row.camp_session ?? '')

  if (apiKey && parentEmail) {
    const resend = new Resend(apiKey)
    if (input.decision === 'confirmed') {
      const html = htmlRegistrationConfirmed({
        parentFirstName: parentFirst,
        playerName,
        campWeekLabel: weekLabel,
      })
      const { error: sendErr } = await resend.emails.send({
        from: SENDER_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: parentEmail,
        subject: `Confirmed: ${playerName} — ${weekLabel} — Next Level Soccer SF`,
        html,
      })
      if (sendErr) console.error('setRegistrationDecision confirm email:', sendErr)
    } else {
      const html = htmlRegistrationDeclined({
        parentFirstName: parentFirst,
        playerName,
        campWeekLabel: weekLabel,
        reason,
      })
      const { error: sendErr } = await resend.emails.send({
        from: SENDER_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: parentEmail,
        subject: `Update: ${playerName} — ${weekLabel} — Next Level Soccer SF`,
        html,
      })
      if (sendErr) console.error('setRegistrationDecision decline email:', sendErr)
    }
  } else {
    console.warn('setRegistrationDecision: missing RESEND_API_KEY or parent email; skip notification.')
  }

  return { success: true }
}

export type ResolveRefundResult = { success: true } | { success: false; error: string }

export async function resolveRefundRequest(input: {
  registrationId: string
  decision: 'approved' | 'declined'
  declineReason?: string
}): Promise<ResolveRefundResult> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) {
    return { success: false, error: 'You must be signed in as staff.' }
  }

  const reason = (input.declineReason ?? '').trim()
  if (input.decision === 'declined' && !reason) {
    return { success: false, error: 'Please enter a reason when declining a refund request.' }
  }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const { data: row, error: fetchErr } = await service
    .from('registrations')
    .select(
      'id, parent_email, parent_first_name, player_first_name, player_last_name, camp_session, status, refund_requested_weeks',
    )
    .eq('id', input.registrationId)
    .single()

  if (fetchErr || !row) {
    return { success: false, error: 'Registration not found.' }
  }

  if ((row.status ?? '').toLowerCase() !== 'confirmed') {
    return { success: false, error: 'Refund actions only apply to confirmed registrations.' }
  }

  const campSession = trimName(row.camp_session)
  const refunds = (row.refund_requested_weeks as string[] | null) ?? []
  if (!campSession || !refunds.some((w) => trimName(w) === campSession)) {
    return { success: false, error: 'No refund request is pending for this camp week.' }
  }

  const nextRefundWeeks = refunds.filter((w) => trimName(w) !== campSession)
  const { error: upErr } = await service
    .from('registrations')
    .update(
      input.decision === 'approved'
        ? {
            refund_requested_weeks: nextRefundWeeks,
            refund_denial_reason: null,
            refund_approved_at: new Date().toISOString(),
            refund_money_sent_at: null,
          }
        : {
            refund_requested_weeks: nextRefundWeeks,
            refund_denial_reason: reason,
            refund_approved_at: null,
            refund_money_sent_at: null,
          },
    )
    .eq('id', input.registrationId)

  if (upErr) {
    console.error('resolveRefundRequest:', upErr)
    return { success: false, error: 'Could not update registration.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const parentEmail = (row.parent_email ?? '').trim()
  const parentFirst = (row.parent_first_name ?? '').trim() || 'there'
  const playerName = `${row.player_first_name ?? ''} ${row.player_last_name ?? ''}`.trim()
  const weekLabel = campNameFromWeekLabel(campSession)

  if (apiKey && parentEmail) {
    const resend = new Resend(apiKey)
    if (input.decision === 'approved') {
      const html = htmlRefundApproved({
        parentFirstName: parentFirst,
        playerName,
        campWeekLabel: weekLabel,
      })
      const { error: sendErr } = await resend.emails.send({
        from: SENDER_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: parentEmail,
        subject: `Refund approved: ${playerName} — ${weekLabel} — Next Level Soccer SF`,
        html,
      })
      if (sendErr) console.error('resolveRefundRequest approve email:', sendErr)
    } else {
      const html = htmlRefundDeclined({
        parentFirstName: parentFirst,
        playerName,
        campWeekLabel: weekLabel,
        reason,
      })
      const { error: sendErr } = await resend.emails.send({
        from: SENDER_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        to: parentEmail,
        subject: `Refund request update: ${playerName} — ${weekLabel} — Next Level Soccer SF`,
        html,
      })
      if (sendErr) console.error('resolveRefundRequest decline email:', sendErr)
    }
  } else {
    console.warn('resolveRefundRequest: missing RESEND_API_KEY or parent email; skip notification.')
  }

  return { success: true }
}

export type MarkCampCompleteResult = { success: true } | { success: false; error: string }

export async function markCampWeekCompleted(input: { registrationId: string }): Promise<MarkCampCompleteResult> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) return { success: false, error: 'You must be signed in as staff.' }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const { data: row, error: fetchErr } = await service
    .from('registrations')
    .select(
      'id, status, camp_session, refund_requested_weeks, camp_completed_at, refund_approved_at, refund_money_sent_at',
    )
    .eq('id', input.registrationId)
    .single()

  if (fetchErr || !row) return { success: false, error: 'Registration not found.' }
  if ((row.status ?? '').toLowerCase() !== 'confirmed') {
    return { success: false, error: 'Only confirmed registrations can be marked complete.' }
  }
  if ((row as { camp_completed_at?: string | null }).camp_completed_at) {
    return { success: false, error: 'This week is already marked complete.' }
  }

  const cs = trimName(row.camp_session)
  const refunds = ((row as { refund_requested_weeks?: string[] | null }).refund_requested_weeks ?? []) as string[]
  if (cs && refunds.some((w) => trimName(w) === cs)) {
    return {
      success: false,
      error: 'Resolve the open refund request (approve, decline, or mark refund paid) before marking this week complete.',
    }
  }
  const approvedAt = (row as { refund_approved_at?: string | null }).refund_approved_at
  const moneyAt = (row as { refund_money_sent_at?: string | null }).refund_money_sent_at
  if (approvedAt && !moneyAt) {
    return {
      success: false,
      error: 'Mark the refund as paid (or wait until it is) before marking this camp week complete.',
    }
  }

  const { error: upErr } = await service
    .from('registrations')
    .update({ camp_completed_at: new Date().toISOString() })
    .eq('id', input.registrationId)

  if (upErr) {
    console.error('markCampWeekCompleted:', upErr)
    return { success: false, error: 'Could not update registration.' }
  }

  return { success: true }
}

export type MarkRefundPaidResult = { success: true } | { success: false; error: string }

export async function markRefundMoneySent(input: { registrationId: string }): Promise<MarkRefundPaidResult> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) return { success: false, error: 'You must be signed in as staff.' }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const { data: row, error: fetchErr } = await service
    .from('registrations')
    .select(
      'id, parent_email, parent_first_name, player_first_name, player_last_name, camp_session, status, refund_approved_at, refund_money_sent_at',
    )
    .eq('id', input.registrationId)
    .single()

  if (fetchErr || !row) return { success: false, error: 'Registration not found.' }
  if ((row.status ?? '').toLowerCase() !== 'confirmed') {
    return { success: false, error: 'Invalid registration status.' }
  }
  const approvedAt = (row as { refund_approved_at?: string | null }).refund_approved_at
  const moneyAt = (row as { refund_money_sent_at?: string | null }).refund_money_sent_at
  if (!approvedAt || moneyAt) {
    return { success: false, error: 'This row is not waiting for a refund payout confirmation.' }
  }

  const campSession = trimName(row.camp_session)
  const { error: upErr } = await service
    .from('registrations')
    .update({ refund_money_sent_at: new Date().toISOString() })
    .eq('id', input.registrationId)

  if (upErr) {
    console.error('markRefundMoneySent:', upErr)
    return { success: false, error: 'Could not update registration.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const parentEmail = (row.parent_email ?? '').trim()
  const parentFirst = (row.parent_first_name ?? '').trim() || 'there'
  const playerName = `${row.player_first_name ?? ''} ${row.player_last_name ?? ''}`.trim()
  const weekLabel = campNameFromWeekLabel(campSession)

  if (apiKey && parentEmail) {
    const html = htmlRefundMoneySent({
      parentFirstName: parentFirst,
      playerName,
      campWeekLabel: weekLabel,
    })
    const resend = new Resend(apiKey)
    const { error: sendErr } = await resend.emails.send({
      from: SENDER_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: parentEmail,
      subject: `Refund sent: ${playerName} — ${weekLabel} — Next Level Soccer SF`,
      html,
    })
    if (sendErr) console.error('markRefundMoneySent email:', sendErr)
  } else {
    console.warn('markRefundMoneySent: missing RESEND_API_KEY or parent email; skip notification.')
  }

  return { success: true }
}

export type SaveReportResult = { success: true } | { success: false; error: string }

export async function savePlayerReport(payload: {
  registrationChildId: string
  campSession: string
  scores: Record<CoachReportMetricKey, number>
  coachComments: string
  dateGenerated: string
}): Promise<SaveReportResult> {
  const staffUser = await getStaffAdminUser()
  if (!staffUser) {
    return { success: false, error: 'You must be signed in as staff to save a report.' }
  }

  if (!payload.registrationChildId) {
    return { success: false, error: 'Select a player.' }
  }
  if (!payload.campSession?.trim() || !KNOWN_CAMP_WEEKS.has(payload.campSession.trim())) {
    return { success: false, error: 'Select a valid camp week.' }
  }

  for (const key of COACH_REPORT_METRIC_KEYS) {
    const v = payload.scores[key]
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
      return { success: false, error: 'Each skill must be scored from 1 to 5 before submitting.' }
    }
  }

  const overview = payload.coachComments.trim()
  if (!overview) {
    return { success: false, error: 'Please add a coach overview for the parent email.' }
  }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const { data: regChild, error: chErr } = await service
    .from('registration_children')
    .select('id, submission_id, player_first_name, player_last_name')
    .eq('id', payload.registrationChildId)
    .single()

  if (chErr || !regChild) {
    return { success: false, error: 'Player not found.' }
  }

  const { data: regRow, error: regErr } = await service
    .from('registrations')
    .select('id, parent_email, parent_first_name, camp_session, status')
    .eq('registration_submission_id', regChild.submission_id)
    .eq('camp_session', payload.campSession.trim())
    .eq('player_first_name', trimName(regChild.player_first_name))
    .eq('player_last_name', trimName(regChild.player_last_name))
    .maybeSingle()

  if (regErr || !regRow) {
    return { success: false, error: 'No confirmed camp registration found for this player and week.' }
  }
  if ((regRow.status ?? '').toLowerCase() !== 'confirmed') {
    return { success: false, error: 'Reports can only be submitted for confirmed camp weeks.' }
  }

  const scoresFull = {} as Record<ReportMetricKey, number | null>
  for (const k of COACH_REPORT_METRIC_KEYS) {
    scoresFull[k] = payload.scores[k]
  }
  scoresFull.technical_4 = null
  scoresFull.tactical_4 = null
  scoresFull.physical_4 = null
  scoresFull.psychological_4 = null

  const row = {
    registration_child_id: payload.registrationChildId,
    camp_session: payload.campSession.trim(),
    technical_1: scoresFull.technical_1,
    technical_2: scoresFull.technical_2,
    technical_3: scoresFull.technical_3,
    technical_4: scoresFull.technical_4,
    tactical_1: scoresFull.tactical_1,
    tactical_2: scoresFull.tactical_2,
    tactical_3: scoresFull.tactical_3,
    tactical_4: scoresFull.tactical_4,
    physical_1: scoresFull.physical_1,
    physical_2: scoresFull.physical_2,
    physical_3: scoresFull.physical_3,
    physical_4: scoresFull.physical_4,
    psychological_1: scoresFull.psychological_1,
    psychological_2: scoresFull.psychological_2,
    psychological_3: scoresFull.psychological_3,
    psychological_4: scoresFull.psychological_4,
    coach_comments: overview,
    date_generated: payload.dateGenerated,
    created_by: staffUser.id,
    parent_email_sent_at: null as string | null,
  }

  await service
    .from('player_reports')
    .delete()
    .eq('registration_child_id', payload.registrationChildId)
    .eq('camp_session', payload.campSession.trim())

  const { error: insErr } = await service.from('player_reports').insert(row)

  if (insErr) {
    console.error('savePlayerReport insert:', insErr)
    return { success: false, error: 'Could not save report. Try again.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  const parentEmail = (regRow.parent_email ?? '').trim()
  const parentFirst = (regRow.parent_first_name ?? '').trim() || 'there'
  const childName = `${regChild.player_first_name ?? ''} ${regChild.player_last_name ?? ''}`.trim()
  const weekLabel = campNameFromWeekLabel(payload.campSession.trim())

  let sentAt: string | null = null
  if (apiKey && parentEmail) {
    const html = htmlParentWeeklyReport({
      parentFirstName: parentFirst,
      childName,
      campWeekLabel: weekLabel,
      coachOverview: overview,
      scores: payload.scores,
    })
    const resend = new Resend(apiKey)
    const { error: sendErr } = await resend.emails.send({
      from: SENDER_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: parentEmail,
      subject: `Report card: ${childName} — ${weekLabel} — Next Level Soccer SF`,
      html,
    })
    if (sendErr) {
      console.error('savePlayerReport email:', sendErr)
    } else {
      sentAt = new Date().toISOString()
    }
  } else {
    console.warn('savePlayerReport: missing RESEND_API_KEY or parent email.')
  }

  if (sentAt) {
    const { error: upErr } = await service
      .from('player_reports')
      .update({ parent_email_sent_at: sentAt })
      .eq('registration_child_id', payload.registrationChildId)
      .eq('camp_session', payload.campSession.trim())
    if (upErr) console.error('savePlayerReport parent_email_sent_at:', upErr)
  }

  return { success: true }
}
