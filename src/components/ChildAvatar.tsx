'use client'

import { useEffect, useState } from 'react'

/**
 * Profile image for a child, or a simple meeple-style placeholder when no photo.
 */
export default function ChildAvatar({
  photoUrl,
  alt,
  sizeClass = 'w-10 h-10',
  className = '',
}: {
  photoUrl: string | null | undefined
  alt: string
  sizeClass?: string
  className?: string
}) {
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
  }, [photoUrl])

  if (photoUrl && !loadFailed) {
    return (
      <img
        src={photoUrl}
        alt={alt}
        onError={() => setLoadFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-[#e8d8ce] shrink-0 ${className}`}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <span
      className={`${sizeClass} shrink-0 rounded-full border border-[#c9b8a8] bg-[#e8dfd4] inline-flex items-center justify-center overflow-hidden ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 32 40"
        className="w-[70%] h-[70%] text-[#7a6a5c]"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="16" cy="9" r="6.5" />
        <path d="M8 17h16l-2 14H10L8 17z" />
        <ellipse cx="11" cy="34" rx="3.5" ry="3" />
        <ellipse cx="21" cy="34" rx="3.5" ry="3" />
      </svg>
    </span>
  )
}
