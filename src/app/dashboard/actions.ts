'use server'

import { createClient } from '@/lib/supabase/server'

export type DashboardCamp = {
  submissionId: string
  childId: string
  childName: string
  childPhotoUrl: string | null
  week: string
  status: string
}

export async function getDashboardCamps(): Promise<{
  camps: DashboardCamp[]
  error: 'auth' | 'fetch' | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { camps: [], error: 'auth' }

  const { data, error } = await supabase
    .from('registration_submissions')
    .select(
      `
      id,
      status,
      registration_children (
        id,
        player_first_name,
        player_last_name,
        camp_weeks,
        child_photo_url
      )
    `,
    )
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getDashboardCamps:', error)
    return { camps: [], error: 'fetch' }
  }

  const camps: DashboardCamp[] = []
  for (const submission of data ?? []) {
    for (const child of submission.registration_children ?? []) {
      for (const week of child.camp_weeks ?? []) {
        camps.push({
          submissionId: submission.id,
          childId: child.id,
          childName: `${child.player_first_name} ${child.player_last_name}`.trim(),
          childPhotoUrl: child.child_photo_url ?? null,
          week,
          status: submission.status,
        })
      }
    }
  }

  return { camps, error: null }
}

export async function removePendingCampRegistration(input: {
  submissionId: string
  childId: string
  week: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in first.' }

  const { data: submission, error: subErr } = await supabase
    .from('registration_submissions')
    .select('id, status, auth_user_id')
    .eq('id', input.submissionId)
    .eq('auth_user_id', user.id)
    .single()

  if (subErr || !submission) {
    return { success: false, error: 'Registration not found.' }
  }
  if (submission.status !== 'pending') {
    return { success: false, error: 'Only pending camps can be removed.' }
  }

  const { data: child, error: childErr } = await supabase
    .from('registration_children')
    .select('id, camp_weeks')
    .eq('id', input.childId)
    .eq('submission_id', input.submissionId)
    .single()

  if (childErr || !child) {
    return { success: false, error: 'Player registration not found.' }
  }

  const nextWeeks = (child.camp_weeks ?? []).filter((w: string) => w !== input.week)
  if (nextWeeks.length === 0) {
    const { error: delChildErr } = await supabase.from('registration_children').delete().eq('id', input.childId)
    if (delChildErr) return { success: false, error: 'Could not remove registration.' }

    const { data: remainingChildren, error: remainErr } = await supabase
      .from('registration_children')
      .select('id')
      .eq('submission_id', input.submissionId)
      .limit(1)
    if (!remainErr && (remainingChildren?.length ?? 0) === 0) {
      await supabase.from('registration_submissions').delete().eq('id', input.submissionId)
    }
  } else {
    const { error: upErr } = await supabase
      .from('registration_children')
      .update({ camp_weeks: nextWeeks })
      .eq('id', input.childId)
    if (upErr) return { success: false, error: 'Could not update registration.' }
  }

  return { success: true }
}
