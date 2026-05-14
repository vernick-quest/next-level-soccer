'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { REGISTRATION_EXPERIENCE_LEVELS } from '@/lib/registration-field-options'
import { SOCCER_CLUB_DATALIST_ID, SOCCER_CLUB_SUGGESTIONS } from '@/lib/soccer-club-suggestions'
import { staffUpdateChildClubAndLevel } from './coach-registration-actions'

const inputClass =
  'w-full border border-[#e8d8ce] rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f05a28] bg-white'

const btnBlue =
  'text-sm font-bold bg-[#062744] text-white px-5 py-2.5 rounded-full hover:bg-[#041f36] disabled:opacity-50'
const btnOrange =
  'text-sm font-bold bg-[#f05a28] text-white px-5 py-2.5 rounded-full hover:bg-[#d94f22] disabled:opacity-50'

export default function CoachPlayerProfileClubLevelPanel({
  childId,
  initialSoccerClub,
  initialExperienceLevel,
  initialExperienceOther,
}: {
  childId: string
  initialSoccerClub: string
  initialExperienceLevel: string
  initialExperienceOther: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [soccerClub, setSoccerClub] = useState(initialSoccerClub)
  const [experienceLevel, setExperienceLevel] = useState(initialExperienceLevel)
  const [experienceOther, setExperienceOther] = useState(initialExperienceOther)

  useEffect(() => {
    setSoccerClub(initialSoccerClub)
    setExperienceLevel(initialExperienceLevel)
    setExperienceOther(initialExperienceOther)
    setOk(null)
    setError(null)
  }, [initialSoccerClub, initialExperienceLevel, initialExperienceOther])

  const dirty = useMemo(() => {
    return (
      soccerClub.trim() !== initialSoccerClub.trim() ||
      experienceLevel !== initialExperienceLevel ||
      experienceOther.trim() !== initialExperienceOther.trim()
    )
  }, [
    soccerClub,
    experienceLevel,
    experienceOther,
    initialSoccerClub,
    initialExperienceLevel,
    initialExperienceOther,
  ])

  function save() {
    setError(null)
    setOk(null)
    startTransition(async () => {
      const r = await staffUpdateChildClubAndLevel({
        childId,
        soccerClub,
        experienceLevel,
        experienceOther,
      })
      if (!r.success) {
        setError(r.error)
        return
      }
      setOk('Saved.')
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-[#e8d8ce] bg-white p-6 sm:p-8 shadow-sm">
      <h3 className="text-lg font-extrabold text-[#062744] border-b border-[#f0e2d9] pb-2 mb-2">Club &amp; playing level</h3>
      <p className="text-sm text-slate-600 mb-4">
        Updates this player on <code className="text-xs bg-slate-100 px-1 rounded">registration_children</code> and
        matching <code className="text-xs bg-slate-100 px-1 rounded">registrations</code> rows (same options as
        registration).
      </p>
      {error ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div> : null}
      {ok ? <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{ok}</div> : null}

      <datalist id={SOCCER_CLUB_DATALIST_ID}>
        {SOCCER_CLUB_SUGGESTIONS.map((club) => (
          <option key={club} value={club} />
        ))}
      </datalist>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1">Soccer club this year *</label>
          <input
            className={inputClass}
            list={SOCCER_CLUB_DATALIST_ID}
            value={soccerClub}
            onChange={(e) => setSoccerClub(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1">Playing level *</label>
          <select className={inputClass} value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
            <option value="">Select</option>
            {REGISTRATION_EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl === 'other' ? 'Other' : lvl}
              </option>
            ))}
          </select>
        </div>
        {experienceLevel === 'other' ? (
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Describe other level *</label>
            <input className={inputClass} value={experienceOther} onChange={(e) => setExperienceOther(e.target.value)} />
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <button type="button" disabled={pending || !dirty} onClick={() => save()} className={dirty ? btnOrange : btnBlue}>
          {pending ? 'Saving…' : 'Save club & level'}
        </button>
      </div>
    </section>
  )
}
