'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isRefundWindowOpenPacific } from '@/lib/refund-deadline'

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
    .from('registrations')
    .select(
      `
      id,
      status,
      camp_session,
      child_photo_url,
      player_first_name,
      player_last_name,
      refund_requested_weeks
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getDashboardCamps:', error)
    return { camps: [], error: 'fetch' }
  }

  const camps: DashboardCamp[] = []
  for (const row of data ?? []) {
    const week = row.camp_session ?? ''
    const refundWeeks = new Set<string>(row.refund_requested_weeks ?? [])
    const st = (row.status ?? 'pending').toLowerCase()

    let displayStatus: DashboardCamp['displayStatus']
    if (st === 'refund_requested' || (week && refundWeeks.has(week))) {
      displayStatus = 'refund_requested'
    } else if (st === 'confirmed') {
      displayStatus = 'confirmed'
    } else {
      displayStatus = 'pending'
    }

    camps.push({
      registrationId: row.id,
      childName: `${row.player_first_name ?? ''} ${row.player_last_name ?? ''}`.trim(),
      childPhotoUrl: row.child_photo_url ?? null,
      week,
      registrationStatus: row.status ?? 'pending',
      displayStatus,
    })
  }

  return { camps, error: null }
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
    .select('id, user_id, status')
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

  try {
    const service = createServiceRoleClient()
    const { error: delErr } = await service.from('registrations').delete().eq('id', input.registrationId)
    if (delErr) {
      console.error('removePendingCampRegistration:', delErr)
      return { success: false, error: 'Could not cancel registration.' }
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
  const notifyTo = process.env.ADMIN_EMAIL ?? process.env.RESEND_REFUND_TO
  const from = process.env.RESEND_FROM_EMAIL ?? 'Next Level Soccer <onboarding@resend.dev>'

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
      from,
      to: notifyTo,
      subject: `Refund request — ${childName} — ${input.week}`,
      html,
    })
    if (sendErr) {
      console.error('requestRefundForCamp email:', sendErr)
    }
  } else {
    console.warn('requestRefundForCamp: missing RESEND_API_KEY or ADMIN_EMAIL/RESEND_REFUND_TO; refund saved but email not sent.')
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
