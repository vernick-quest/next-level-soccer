import { createServiceRoleClient } from '@/lib/supabase/service'

function stripOptionalRegistrationColumns(rows: Record<string, unknown>[]) {
  return rows.map((r) => {
    const {
      registration_submission_id: _sid,
      primary_position: _p1,
      secondary_position: _p2,
      playing_level: _pl,
      soccer_club: _sc,
      ...rest
    } = r
    return rest
  })
}

function looksLikeMissingRegistrationColumnError(err: { message?: string } | null): boolean {
  const m = (err?.message ?? '').toLowerCase()
  return (
    m.includes('schema cache') ||
    m.includes('could not find') ||
    (m.includes('column') && m.includes('registrations')) ||
    (m.includes('column') && m.includes('does not exist'))
  )
}

/**
 * Inserts denormalized `registrations` rows (service role). Column names match `submitFamilyRegistration` / schema.
 */
export async function insertDenormalizedRegistrationRows(
  rows: Record<string, unknown>[],
  logPrefix: string,
): Promise<void> {
  if (rows.length === 0) return
  const client = createServiceRoleClient()

  let { error } = await client.from('registrations').insert(rows)
  if (!error) return

  console.log(`${logPrefix} registrations insert (full columns) — full Supabase error:`, error)

  if (looksLikeMissingRegistrationColumnError(error)) {
    const minimal = stripOptionalRegistrationColumns(rows)
    ;({ error } = await client.from('registrations').insert(minimal))
    if (!error) {
      console.warn(
        `${logPrefix}: inserted without optional columns — run latest supabase-schema.sql on Supabase.`,
      )
      return
    }
    console.log(`${logPrefix} registrations insert (legacy columns) — full Supabase error:`, error)
  }

  throw new Error(`${logPrefix} registrations insert: ${JSON.stringify(error)}`)
}
