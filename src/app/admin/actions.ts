'use server'

import { Resend } from 'resend'
import { isAdminEmail } from '@/lib/admin'
import { campWeekSortIndex } from '@/lib/camp-weeks'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export type AdminRow = {
  rowKey: string
  submissionId: string
  childId: string
  campWeek: string
  parentFirstName: string
  parentLastName: string
  parentEmail: string
  parentPhone: string
  childFirstName: string
  childLastName: string
  status: string
  totalAmountCents: number | null
  createdAt: string
}

async function requireAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAdminEmail(user.email)) {
    return null
  }
  return user
}

export async function listAdminRows(): Promise<
  { rows: AdminRow[]; error: null } | { rows: []; error: 'auth' | 'fetch' }
> {
  const user = await requireAdminUser()
  if (!user) {
    return { rows: [], error: 'auth' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('registration_submissions')
    .select(
      `
      id,
      created_at,
      status,
      total_amount_cents,
      parent_first_name,
      parent_last_name,
      parent_email,
      parent_phone,
      registration_children (
        id,
        player_first_name,
        player_last_name,
        camp_weeks
      )
    `,
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('listAdminRows:', error)
    return { rows: [], error: 'fetch' }
  }

  const rows: AdminRow[] = []
  for (const sub of data ?? []) {
    const children = sub.registration_children ?? []
    for (const child of children) {
      const weeks = child.camp_weeks ?? []
      for (const week of weeks) {
        rows.push({
          rowKey: `${sub.id}-${child.id}-${week}`,
          submissionId: sub.id,
          childId: child.id,
          campWeek: week,
          parentFirstName: sub.parent_first_name,
          parentLastName: sub.parent_last_name,
          parentEmail: sub.parent_email,
          parentPhone: sub.parent_phone,
          childFirstName: child.player_first_name,
          childLastName: child.player_last_name,
          status: sub.status,
          totalAmountCents: sub.total_amount_cents,
          createdAt: sub.created_at,
        })
      }
    }
  }

  rows.sort((a, b) => {
    const w = campWeekSortIndex(a.campWeek) - campWeekSortIndex(b.campWeek)
    if (w !== 0) return w
    return a.parentLastName.localeCompare(b.parentLastName) || a.childLastName.localeCompare(b.childLastName)
  })

  return { rows, error: null }
}

export type ActionOk = { success: true } | { success: false; error: string }

export async function markSubmissionConfirmed(submissionId: string): Promise<ActionOk> {
  const user = await requireAdminUser()
  if (!user) {
    return { success: false, error: 'Not authorized.' }
  }
  if (!submissionId) {
    return { success: false, error: 'Missing submission.' }
  }

  let service
  try {
    service = createServiceRoleClient()
  } catch {
    return {
      success: false,
      error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to update registration status.',
    }
  }

  const { data: updated, error } = await service
    .from('registration_submissions')
    .update({ status: 'confirmed' })
    .eq('id', submissionId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    console.error('markSubmissionConfirmed:', error)
    return { success: false, error: 'Could not update status.' }
  }
  if (!updated?.length) {
    return { success: false, error: 'This registration is already confirmed or was not found.' }
  }

  return { success: true }
}

export async function sendWelcomeEmail(submissionId: string): Promise<ActionOk> {
  const user = await requireAdminUser()
  if (!user) {
    return { success: false, error: 'Not authorized.' }
  }
  if (!submissionId) {
    return { success: false, error: 'Missing submission.' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not set on the server.' }
  }

  const supabase = await createClient()
  const { data: sub, error: fetchErr } = await supabase
    .from('registration_submissions')
    .select(
      `
      id,
      status,
      parent_first_name,
      parent_last_name,
      parent_email,
      registration_children (
        player_first_name,
        player_last_name,
        camp_weeks
      )
    `,
    )
    .eq('id', submissionId)
    .single()

  if (fetchErr || !sub) {
    return { success: false, error: 'Registration not found.' }
  }

  if (sub.status !== 'confirmed') {
    return { success: false, error: 'Confirm payment (Mark as Paid) before sending the welcome email.' }
  }

  const children = sub.registration_children ?? []
  const childLines = children
    .map((c) => {
      const name = `${c.player_first_name} ${c.player_last_name}`.trim()
      const weeks = (c.camp_weeks ?? []).join(', ')
      return `<li><strong>${escapeHtml(name)}</strong> — ${escapeHtml(weeks)}</li>`
    })
    .join('')

  const parentName = `${sub.parent_first_name} ${sub.parent_last_name}`.trim()
  const from = process.env.RESEND_FROM_EMAIL ?? 'Next Level Soccer <onboarding@resend.dev>'

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
      <h1 style="color: #062744;">Welcome to Camp</h1>
      <p>Hi ${escapeHtml(parentName)},</p>
      <p>Thank you — your payment is confirmed. We’re excited to have your player(s) at Next Level Soccer Development Camps at Beach Chalet.</p>
      <p><strong>Registered players &amp; weeks:</strong></p>
      <ul>${childLines}</ul>
      <p>Training runs Monday–Friday, 3:30–7:30 PM. If you have questions, reply to this email.</p>
      <p style="margin-top: 2rem; color: #64748b; font-size: 14px;">— Next Level Soccer SF</p>
    </div>
  `

  const resend = new Resend(apiKey)
  const { error: sendErr } = await resend.emails.send({
    from,
    to: sub.parent_email,
    subject: 'Welcome to Camp — Next Level Soccer SF',
    html,
  })

  if (sendErr) {
    console.error('sendWelcomeEmail:', sendErr)
    return { success: false, error: sendErr.message || 'Could not send email.' }
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
