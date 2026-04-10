'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadChildPhoto } from '@/lib/supabase/storage-upload'
import { updateChildProfilePhoto } from '@/app/dashboard/actions'
import ChildAvatar from './ChildAvatar'

const MAX_BYTES = 5 * 1024 * 1024

export default function ChildPhotoUploader({
  registrationChildId,
  initialPhotoUrl,
  label,
  sizeClass = 'w-14 h-14',
}: {
  registrationChildId: string
  initialPhotoUrl: string | null
  label: string
  sizeClass?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setPhotoUrl(initialPhotoUrl)
  }, [initialPhotoUrl])

  function pickFile() {
    setError(null)
    inputRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller.')
      return
    }

    setError(null)
    startTransition(async () => {
      const { publicUrl, error: upErr } = await uploadChildPhoto(file, registrationChildId)
      if (upErr || !publicUrl) {
        setError(upErr ?? 'Upload failed.')
        return
      }
      const result = await updateChildProfilePhoto({
        registrationChildId,
        childPhotoUrl: publicUrl,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setPhotoUrl(publicUrl)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ChildAvatar photoUrl={photoUrl} alt="" sizeClass={sizeClass} />
      <div className="min-w-0 flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={pickFile}
          disabled={isPending}
          className="text-left text-sm font-semibold text-[#062744] hover:text-[#f05a28] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : photoUrl ? 'Change photo' : 'Add photo'}
        </button>
        {label ? <span className="text-xs text-slate-600 truncate max-w-[14rem]">{label}</span> : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  )
}
