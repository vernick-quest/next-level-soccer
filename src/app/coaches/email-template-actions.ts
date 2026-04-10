'use server'

import { getStaffAdminUser } from '@/lib/admin'
import {
  EMAIL_TEMPLATE_KEY_ORDER,
  type EmailTemplateKey,
  sanitizeTemplateFields,
} from '@/lib/email-template-catalog'
import { createServiceRoleClient } from '@/lib/supabase/service'

export async function saveEmailTemplateOverride(input: {
  templateKey: EmailTemplateKey
  fields: Record<string, unknown>
}): Promise<
  | { success: true; fields: Record<string, string>; updatedAt: string }
  | { success: false; error: string }
> {
  const staff = await getStaffAdminUser()
  if (!staff) return { success: false, error: 'Sign in as staff.' }

  if (!EMAIL_TEMPLATE_KEY_ORDER.includes(input.templateKey)) {
    return { success: false, error: 'Unknown template.' }
  }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const fields = sanitizeTemplateFields(input.templateKey, input.fields)
  const updatedAt = new Date().toISOString()
  const { error } = await service.from('email_template_overrides').upsert(
    { template_key: input.templateKey, fields, updated_at: updatedAt },
    { onConflict: 'template_key' },
  )

  if (error) {
    console.error('saveEmailTemplateOverride:', error)
    return {
      success: false,
      error:
        'Could not save. Apply the email_template_overrides table in Supabase (see supabase-schema.sql).',
    }
  }

  return {
    success: true,
    fields,
    updatedAt,
  }
}

export async function resetEmailTemplateOverride(input: {
  templateKey: EmailTemplateKey
}): Promise<{ success: true } | { success: false; error: string }> {
  const staff = await getStaffAdminUser()
  if (!staff) return { success: false, error: 'Sign in as staff.' }

  let service: ReturnType<typeof createServiceRoleClient>
  try {
    service = createServiceRoleClient()
  } catch {
    return { success: false, error: 'Server configuration is incomplete.' }
  }

  const { error } = await service.from('email_template_overrides').delete().eq('template_key', input.templateKey)

  if (error) {
    console.error('resetEmailTemplateOverride:', error)
    return { success: false, error: 'Could not reset template.' }
  }

  return { success: true }
}
