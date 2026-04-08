'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getOwnerEmail, isOwnerEmail, normalizeEmail, userHasGoogleIdentity } from '@/lib/admin'

async function requireOwnerSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !userHasGoogleIdentity(user)) return null
  if (!isOwnerEmail(user.email)) return null
  return user
}

function assertServiceRole() {
  try {
    return createServiceRoleClient()
  } catch {
    return null
  }
}

const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type StaffAdminEmailRow = { email: string; createdAt: string }

export async function listStaffAdminEmailsAction(): Promise<
  { emails: StaffAdminEmailRow[] } | { error: string }
> {
  const user = await requireOwnerSession()
  if (!user) {
    return { error: 'Only the site owner can manage staff admins.' }
  }
  const service = assertServiceRole()
  if (!service) {
    return { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }
  }
  const { data, error } = await service
    .from('staff_admin_emails')
    .select('email, created_at')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('listStaffAdminEmailsAction:', error)
    return { error: 'Could not load staff list. Run the staff_admin_emails SQL in Supabase if this table is missing.' }
  }
  const emails: StaffAdminEmailRow[] = (data ?? []).map((row) => ({
    email: row.email,
    createdAt: row.created_at,
  }))
  return { emails }
}

export async function addStaffAdminEmailAction(rawEmail: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireOwnerSession()
  if (!user?.email) {
    return { error: 'Only the site owner can add staff admins.' }
  }
  const norm = normalizeEmail(rawEmail)
  if (!norm || !emailOk.test(norm)) {
    return { error: 'Enter a valid email address.' }
  }
  if (norm === getOwnerEmail()) {
    return { error: 'The owner account already has full access.' }
  }
  const service = assertServiceRole()
  if (!service) {
    return { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }
  }
  const { error } = await service.from('staff_admin_emails').insert({
    email: norm,
    created_by_email: normalizeEmail(user.email) ?? user.email,
  })
  if (error) {
    if (error.code === '23505') {
      return { error: 'That email is already on the list.' }
    }
    console.error('addStaffAdminEmailAction:', error)
    return { error: 'Could not add staff admin.' }
  }
  revalidatePath('/admin/staff')
  revalidatePath('/admin')
  return { ok: true }
}

export async function removeStaffAdminEmailAction(rawEmail: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireOwnerSession()
  if (!user) {
    return { error: 'Only the site owner can remove staff admins.' }
  }
  const norm = normalizeEmail(rawEmail)
  if (!norm) {
    return { error: 'Invalid email.' }
  }
  if (norm === getOwnerEmail()) {
    return { error: 'Cannot remove the owner account.' }
  }
  const service = assertServiceRole()
  if (!service) {
    return { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }
  }
  const { error } = await service.from('staff_admin_emails').delete().eq('email', norm)
  if (error) {
    console.error('removeStaffAdminEmailAction:', error)
    return { error: 'Could not remove staff admin.' }
  }
  revalidatePath('/admin/staff')
  revalidatePath('/admin')
  return { ok: true }
}
