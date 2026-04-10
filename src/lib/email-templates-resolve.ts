import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_KEY_ORDER,
  type EmailTemplateKey,
  sanitizeTemplateFields,
} from '@/lib/email-template-catalog'

const KEY_SET = new Set<string>(EMAIL_TEMPLATE_KEY_ORDER)

function isTemplateKey(s: string): s is EmailTemplateKey {
  return KEY_SET.has(s)
}
import { createServiceRoleClient } from '@/lib/supabase/service'

export type ResolvedEmailTemplateRow = {
  fields: Record<string, string>
  updatedAt: string | null
}

export type EmailTemplateBundle = Record<EmailTemplateKey, ResolvedEmailTemplateRow>

function mergeStoredFields(key: EmailTemplateKey, raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return { ...EMAIL_TEMPLATE_DEFAULTS[key] }
  return sanitizeTemplateFields(key, raw as Record<string, unknown>)
}

/** One query: merged fields per template for staff UI and sends. */
export async function loadAllResolvedEmailTemplates(): Promise<EmailTemplateBundle> {
  const bundle = {} as EmailTemplateBundle
  for (const key of EMAIL_TEMPLATE_KEY_ORDER) {
    bundle[key] = { fields: { ...EMAIL_TEMPLATE_DEFAULTS[key] }, updatedAt: null }
  }

  try {
    const service = createServiceRoleClient()
    const { data, error } = await service
      .from('email_template_overrides')
      .select('template_key, fields, updated_at')

    if (error || !data) return bundle

    for (const row of data as {
      template_key: string
      fields: unknown
      updated_at: string | null
    }[]) {
      if (!isTemplateKey(row.template_key)) continue
      const k = row.template_key
      bundle[k] = {
        fields: mergeStoredFields(k, row.fields),
        updatedAt: row.updated_at,
      }
    }
  } catch {
    // Missing service role or table — defaults only
  }

  return bundle
}

/** Single template merge (e.g. hot path if bundle not cached). */
export async function resolveEmailTemplateFields(key: EmailTemplateKey): Promise<Record<string, string>> {
  const row = (await loadAllResolvedEmailTemplates())[key]
  return row.fields
}
