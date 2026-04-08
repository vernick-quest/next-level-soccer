'use server'

import { createClient } from '@/lib/supabase/server'
import { ALL_REPORT_METRIC_KEYS, type ReportMetricKey } from '@/lib/player-report-metrics'

export type CoachPlayerRow = {
  id: string
  player_first_name: string
  player_last_name: string
  grade_fall: string
  registration_submissions: {
    parent_first_name: string
    parent_last_name: string
    parent_email: string
  } | null
}

export async function listPlayersForCoach(): Promise<{
  players: CoachPlayerRow[]
  error: 'auth' | 'fetch' | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { players: [], error: 'auth' }
  }

  const { data, error } = await supabase
    .from('registration_children')
    .select(
      `
      id,
      player_first_name,
      player_last_name,
      grade_fall,
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
      sub == null
        ? null
        : Array.isArray(sub)
          ? (sub[0] ?? null)
          : sub
    return {
      id: row.id,
      player_first_name: row.player_first_name,
      player_last_name: row.player_last_name,
      grade_fall: row.grade_fall,
      registration_submissions: submission,
    }
  })

  return { players, error: null }
}

export type SaveReportResult = { success: true } | { success: false; error: string }

export async function savePlayerReport(payload: {
  registrationChildId: string
  scores: Record<ReportMetricKey, number>
  coachComments: string
  dateGenerated: string
}): Promise<SaveReportResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to save a report.' }
  }

  if (!payload.registrationChildId) {
    return { success: false, error: 'Select a player.' }
  }

  for (const key of ALL_REPORT_METRIC_KEYS) {
    const v = payload.scores[key]
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) {
      return { success: false, error: `Each metric must be a whole number from 1 to 5.` }
    }
  }

  const row = {
    registration_child_id: payload.registrationChildId,
    technical_1: payload.scores.technical_1,
    technical_2: payload.scores.technical_2,
    technical_3: payload.scores.technical_3,
    technical_4: payload.scores.technical_4,
    tactical_1: payload.scores.tactical_1,
    tactical_2: payload.scores.tactical_2,
    tactical_3: payload.scores.tactical_3,
    tactical_4: payload.scores.tactical_4,
    physical_1: payload.scores.physical_1,
    physical_2: payload.scores.physical_2,
    physical_3: payload.scores.physical_3,
    physical_4: payload.scores.physical_4,
    psychological_1: payload.scores.psychological_1,
    psychological_2: payload.scores.psychological_2,
    psychological_3: payload.scores.psychological_3,
    psychological_4: payload.scores.psychological_4,
    coach_comments: payload.coachComments.trim() || null,
    date_generated: payload.dateGenerated,
    created_by: user.id,
  }

  const { error } = await supabase.from('player_reports').insert(row)

  if (error) {
    console.error('savePlayerReport:', error)
    return { success: false, error: 'Could not save report. Check that the database table exists and you are signed in.' }
  }

  return { success: true }
}
