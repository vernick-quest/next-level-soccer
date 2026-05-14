'use server'

import { getStaffAdminUser } from '@/lib/admin'
import { campNameFromWeekLabel } from '@/lib/camp-display'
import { soccerPositionLabel } from '@/lib/soccer-positions'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  signChildProfilePhotoUrlForDisplay,
  signChildProfilePhotoUrlsUnique,
} from '@/lib/supabase/child-profile-signed-url'
import {
  mergePlayerReportsByCampSession,
  type PlayerReportRowForMerge,
  type ReportGridWeekSnapshot,
} from '@/lib/player-reports-merge'

export type CoachDirectoryPlayerRow = {
  id: string
  player_first_name: string
  player_last_name: string
  child_photo_url: string | null
  primary_position_label: string
  soccer_club: string | null
  grade_fall: string | null
}

export type CoachDirectoryParentBlock = {
  parent_first_name: string | null
  parent_last_name: string | null
  parent_email: string | null
  parent_phone: string | null
  second_parent_first_name: string | null
  second_parent_last_name: string | null
  second_parent_email: string | null
  second_parent_phone: string | null
}

export type CoachDirectoryActivityItem = {
  id: string
  kind: 'camp_week' | 'report_card'
  /** ISO timestamp for sorting */
  at: string
  title: string
  detail: string
}

export type CoachDirectoryPlayerProfile = {
  id: string
  player_first_name: string
  player_last_name: string
  player_dob: string | null
  player_pronouns: string | null
  primary_position_label: string
  secondary_position_label: string
  soccer_club: string | null
  playing_level: string | null
  grade_fall: string | null
  school_fall: string | null
  camp_weeks_requested: string[]
  child_photo_url: string | null
  parent: CoachDirectoryParentBlock
  activity: CoachDirectoryActivityItem[]
  /** Same shape as parent dashboard: latest report per camp week. */
  reportsByWeekKey: Record<string, ReportGridWeekSnapshot>
  /** `camp_session` values from `registrations` for this player (name-matched rows). */
  registeredCampSessions: string[]
  /** Per-row registration weeks for staff week management (pending vs confirmed). */
  registeredWeekDetails: { registration_id: string; camp_session: string; status: string }[]
  /** Raw DB fields for staff club / playing level editor */
  staff_edit_soccer_club: string
  staff_edit_experience_level: string
  staff_edit_experience_other: string
}

function trimName(s: string | null | undefined) {
  return (s ?? '').trim()
}

function submissionRow(
  sub: unknown,
): {
  parent_first_name: string | null
  parent_last_name: string | null
  parent_email: string | null
  parent_phone: string | null
  second_parent_first_name: string | null
  second_parent_last_name: string | null
  second_parent_email: string | null
  second_parent_phone: string | null
} | null {
  if (sub == null) return null
  const row = Array.isArray(sub) ? sub[0] : sub
  if (!row || typeof row !== 'object') return null
  const o = row as Record<string, unknown>
  return {
    parent_first_name: (o.parent_first_name as string) ?? null,
    parent_last_name: (o.parent_last_name as string) ?? null,
    parent_email: (o.parent_email as string) ?? null,
    parent_phone: (o.parent_phone as string) ?? null,
    second_parent_first_name: (o.second_parent_first_name as string) ?? null,
    second_parent_last_name: (o.second_parent_last_name as string) ?? null,
    second_parent_email: (o.second_parent_email as string) ?? null,
    second_parent_phone: (o.second_parent_phone as string) ?? null,
  }
}

export async function listPlayerDirectoryForStaff(): Promise<{
  players: CoachDirectoryPlayerRow[]
  error: 'auth' | 'fetch' | null
}> {
  const staff = await getStaffAdminUser()
  if (!staff) return { players: [], error: 'auth' }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { players: [], error: 'fetch' }
  }

  const { data, error } = await service
    .from('registration_children')
    .select(
      'id, player_first_name, player_last_name, child_photo_url, primary_position, soccer_club, grade_fall',
    )
    .order('player_last_name', { ascending: true })
    .order('player_first_name', { ascending: true })

  if (error) {
    console.error('listPlayerDirectoryForStaff:', error)
    return { players: [], error: 'fetch' }
  }

  const rows = (data ?? []).map((r) => ({
    id: r.id as string,
    player_first_name: trimName(r.player_first_name as string | null) || '—',
    player_last_name: trimName(r.player_last_name as string | null) || '—',
    child_photo_url: (r.child_photo_url as string | null) ?? null,
    primary_position_label: soccerPositionLabel(r.primary_position as string | null),
    soccer_club: (r.soccer_club as string | null)?.trim() || null,
    grade_fall: (r.grade_fall as string | null)?.trim() || null,
  }))

  const signMap = await signChildProfilePhotoUrlsUnique(rows.map((r) => r.child_photo_url))
  const players = rows.map((r) => ({
    ...r,
    child_photo_url: r.child_photo_url?.trim()
      ? (signMap.get(r.child_photo_url.trim()) ?? r.child_photo_url)
      : null,
  }))

  return { players, error: null }
}

export async function getPlayerDirectoryProfileForStaff(
  childId: string,
): Promise<{ profile: CoachDirectoryPlayerProfile | null; error: 'auth' | 'fetch' | 'not_found' | null }> {
  const staff = await getStaffAdminUser()
  if (!staff) return { profile: null, error: 'auth' }

  const id = trimName(childId)
  if (!id) return { profile: null, error: 'not_found' }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { profile: null, error: 'fetch' }
  }

  const { data: child, error: chErr } = await service
    .from('registration_children')
    .select(
      `
      id,
      submission_id,
      player_first_name,
      player_last_name,
      player_dob,
      player_pronouns,
      primary_position,
      secondary_position,
      soccer_club,
      child_photo_url,
      grade_fall,
      school_fall,
      camp_weeks,
      player_experience_level,
      player_experience_other,
      registration_submissions (
        parent_first_name,
        parent_last_name,
        parent_email,
        parent_phone,
        second_parent_first_name,
        second_parent_last_name,
        second_parent_email,
        second_parent_phone
      )
    `,
    )
    .eq('id', id)
    .maybeSingle()

  if (chErr || !child) {
    if (chErr) console.error('getPlayerDirectoryProfileForStaff child:', chErr)
    return { profile: null, error: chErr ? 'fetch' : 'not_found' }
  }

  const submissionId = child.submission_id as string
  const fn = trimName(child.player_first_name as string | null)
  const ln = trimName(child.player_last_name as string | null)

  const { data: regsRaw, error: regErr } = await service
    .from('registrations')
    .select(
      'id, camp_session, status, created_at, camp_completed_at, organizer_cancelled_at, player_first_name, player_last_name, playing_level',
    )
    .eq('registration_submission_id', submissionId)
    .order('created_at', { ascending: false })

  const regs = (regsRaw ?? []).filter(
    (r) =>
      trimName(r.player_first_name as string | null) === fn &&
      trimName(r.player_last_name as string | null) === ln,
  )

  if (regErr) console.error('getPlayerDirectoryProfileForStaff registrations:', regErr)

  const { data: reps, error: repErr } = await service
    .from('player_reports')
    .select('*')
    .eq('registration_child_id', id)
    .order('date_generated', { ascending: false })

  if (repErr) console.error('getPlayerDirectoryProfileForStaff reports:', repErr)

  const reportsByWeekKey = mergePlayerReportsByCampSession((reps ?? []) as PlayerReportRowForMerge[])

  const registeredCampSessions = [
    ...new Set(
      (regs ?? [])
        .map((r) => ((r.camp_session as string | null) ?? '').trim())
        .filter((w) => w.length > 0),
    ),
  ]

  const registeredWeekDetails = (regs ?? []).map((r) => ({
    registration_id: r.id as string,
    camp_session: trimName(r.camp_session as string | null) || '',
    status: (trimName(r.status as string | null) || 'pending').toLowerCase(),
  }))

  const activity: CoachDirectoryActivityItem[] = []

  for (const r of regs ?? []) {
    const cs = (r.camp_session as string | null) ?? null
    const st = (r.status as string | null) ?? null
    const created = (r.created_at as string | null) ?? null
    const completed = (r.camp_completed_at as string | null) ?? null
    const cancelled = (r.organizer_cancelled_at as string | null) ?? null
    const at = (created as string) || new Date().toISOString()
    const weekLabel = cs ? campNameFromWeekLabel(cs) : 'Camp week'
    let detail = `Status: ${st ?? 'unknown'}`
    if (cancelled) detail += ' · Staff-cancelled week'
    if (completed) detail += ' · Camp marked complete'
    activity.push({
      id: `reg-${r.id as string}`,
      kind: 'camp_week',
      at,
      title: weekLabel,
      detail,
    })
  }

  for (const r of reps ?? []) {
    const cs = (r.camp_session as string | null) ?? null
    const at = (r.date_generated as string) ?? new Date().toISOString()
    const emailed = !!(r.parent_email_sent_at as string | null)
    const cc = trimName(r.coach_comments as string | null)
    const excerpt = cc.length > 160 ? `${cc.slice(0, 157)}…` : cc || null
    activity.push({
      id: `rep-${r.id as string}`,
      kind: 'report_card',
      at,
      title: cs ? `Report card · ${campNameFromWeekLabel(cs)}` : 'Report card',
      detail:
        (emailed ? 'Emailed to parent' : 'On file (not emailed yet)') + (excerpt ? ` · ${excerpt}` : ''),
    })
  }

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const rawPhoto = (child.child_photo_url as string | null) ?? null
  const signedPhoto = rawPhoto?.trim()
    ? await signChildProfilePhotoUrlForDisplay(rawPhoto.trim())
    : null

  const sub = submissionRow(child.registration_submissions)
  const parent: CoachDirectoryParentBlock = {
    parent_first_name: sub?.parent_first_name ?? null,
    parent_last_name: sub?.parent_last_name ?? null,
    parent_email: sub?.parent_email ?? null,
    parent_phone: sub?.parent_phone ?? null,
    second_parent_first_name: sub?.second_parent_first_name ?? null,
    second_parent_last_name: sub?.second_parent_last_name ?? null,
    second_parent_email: sub?.second_parent_email ?? null,
    second_parent_phone: sub?.second_parent_phone ?? null,
  }

  const campWeeks = (child.camp_weeks as string[] | null) ?? []

  const expLevel = trimName(child.player_experience_level as string | null)
  const expOther = trimName(child.player_experience_other as string | null)
  let playingLevel: string | null = null
  if (expLevel) {
    playingLevel = expLevel === 'other' ? expOther || 'Other' : expLevel
  }
  if (!playingLevel) {
    for (const r of regs) {
      const pl = trimName(r.playing_level as string | null)
      if (pl) {
        playingLevel = pl
        break
      }
    }
  }

  const profile: CoachDirectoryPlayerProfile = {
    id: child.id as string,
    player_first_name: fn || '—',
    player_last_name: ln || '—',
    player_dob: (child.player_dob as string | null) ?? null,
    player_pronouns: trimName(child.player_pronouns as string | null) || null,
    primary_position_label: soccerPositionLabel(child.primary_position as string | null),
    secondary_position_label: soccerPositionLabel(child.secondary_position as string | null),
    soccer_club: trimName(child.soccer_club as string | null) || null,
    playing_level: playingLevel,
    grade_fall: trimName(child.grade_fall as string | null) || null,
    school_fall: trimName(child.school_fall as string | null) || null,
    camp_weeks_requested: Array.isArray(campWeeks) ? campWeeks : [],
    child_photo_url: signedPhoto,
    parent,
    activity,
    reportsByWeekKey,
    registeredCampSessions,
    registeredWeekDetails,
    staff_edit_soccer_club: trimName(child.soccer_club as string | null) ?? '',
    staff_edit_experience_level: expLevel,
    staff_edit_experience_other: expOther,
  }

  return { profile, error: null }
}
