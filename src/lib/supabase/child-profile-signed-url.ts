import { createServiceRoleClient } from '@/lib/supabase/server'

const CHILD_PROFILES_BUCKET = 'child-profiles'

/** How long signed URLs stay valid (coaches/parents refresh by reloading). */
const SIGN_TTL_SEC = 60 * 60 * 24 * 7

/**
 * Extract storage object path from a Supabase public-object URL for this bucket.
 * Works with any project host (including custom domains).
 */
export function parseChildProfileObjectPathFromUrl(url: string): string | null {
  const u = (url.trim().split('?')[0] ?? '').trim()
  const re = new RegExp(`/storage/v1/object/public/${CHILD_PROFILES_BUCKET}/(.+)$`, 'i')
  const m = re.exec(u)
  if (!m?.[1]) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

/**
 * Returns a time-limited signed URL so `<img src>` works when the bucket is not public.
 * Falls back to the original URL if parsing or signing fails (e.g. no service role in env).
 */
export async function signChildProfilePhotoUrlForDisplay(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url?.trim()) return null
  const trimmed = url.trim()
  const objectPath = parseChildProfileObjectPathFromUrl(trimmed)
  if (!objectPath) return trimmed

  try {
    const service = createServiceRoleClient()
    const { data, error } = await service.storage
      .from(CHILD_PROFILES_BUCKET)
      .createSignedUrl(objectPath, SIGN_TTL_SEC)
    if (error || !data?.signedUrl) {
      return trimmed
    }
    return data.signedUrl
  } catch {
    return trimmed
  }
}

/** Deduplicate signing work when many rows share the same stored URL. */
export async function signChildProfilePhotoUrlsUnique(
  urls: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(urls.map((u) => (u ?? '').trim()).filter(Boolean))]
  const map = new Map<string, string>()
  await Promise.all(
    unique.map(async (u) => {
      const signed = await signChildProfilePhotoUrlForDisplay(u)
      map.set(u, signed ?? u)
    }),
  )
  return map
}
