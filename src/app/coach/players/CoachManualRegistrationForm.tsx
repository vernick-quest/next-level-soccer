'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { campNameFromWeekLabel } from '@/lib/camp-display'
import { formatUsPhoneAsYouType, isCompleteUsPhone } from '@/lib/phone-mask'
import {
  REGISTRATION_EXPERIENCE_LEVELS,
  REGISTRATION_GENDER_OPTIONS,
  REGISTRATION_GRADE_OPTIONS,
  REGISTRATION_PRONOUNS_OPTIONS,
  REGISTRATION_SHIRT_SIZES,
} from '@/lib/registration-field-options'
import { SOCCER_CLUB_DATALIST_ID, SOCCER_CLUB_SUGGESTIONS } from '@/lib/soccer-club-suggestions'
import { SOCCER_POSITION_CHOICES } from '@/lib/soccer-positions'
import { staffManualFamilyRegistration } from './coach-registration-actions'
import type { FamilyRegistrationInput, RegistrationChildInput } from '@/lib/family-registration-input-types'

type ChildFormRow = Omit<RegistrationChildInput, 'playerGender'> & {
  playerGender: '' | 'boy' | 'girl'
}

function emptyChild(): ChildFormRow {
  return {
    playerFirstName: '',
    playerLastName: '',
    playerPronouns: '',
    playerDob: '',
    playerGender: '',
    playerExperienceLevel: '',
    playerExperienceOther: '',
    playerSoccerClub: '',
    primaryPosition: '',
    secondaryPosition: '',
    gradeFall: '',
    schoolFall: '',
    childPhotoUrl: '',
    campWeeks: [],
    shirtSize: '',
    medicalNotes: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  }
}

const inputClass =
  'w-full border border-[#e8d8ce] rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f05a28] bg-white'

const btnBlue = 'text-sm font-bold bg-[#062744] text-white px-6 py-3 rounded-full hover:bg-[#041f36] disabled:opacity-50'
const btnOrange =
  'text-sm font-bold bg-[#f05a28] text-white px-6 py-3 rounded-full hover:bg-[#d94f22] disabled:opacity-50 shadow-sm'

export default function CoachManualRegistrationForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  const [children, setChildren] = useState<ChildFormRow[]>([emptyChild()])

  function updateChild(i: number, patch: Partial<ChildFormRow>) {
    setChildren((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  }

  function addChild() {
    setChildren((prev) => [...prev, emptyChild()])
  }

  function removeChild(i: number) {
    setChildren((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  }

  function toggleWeek(ci: number, week: string) {
    const c = children[ci]
    const has = c.campWeeks.includes(week)
    const next = has ? c.campWeeks.filter((w) => w !== week) : [...c.campWeeks, week]
    updateChild(ci, { campWeeks: next })
  }

  const canSubmit = useMemo(() => {
    if (!parentFirstName.trim() || !parentLastName.trim() || !parentEmail.trim()) return false
    if (!isCompleteUsPhone(parentPhone)) return false
    for (const c of children) {
      if (!c.playerFirstName.trim() || !c.playerLastName.trim()) return false
      if (!c.playerDob) return false
      if (!c.playerGender) return false
      if (!c.playerExperienceLevel) return false
      if (c.playerExperienceLevel === 'other' && !c.playerExperienceOther.trim()) return false
      if (!c.playerSoccerClub.trim()) return false
      if (!c.primaryPosition.trim()) return false
      if (!c.gradeFall.trim()) return false
      if (!c.schoolFall.trim()) return false
      if (!c.shirtSize.trim()) return false
      if (!c.emergencyContactName.trim() || !c.emergencyContactPhone.trim()) return false
      if (!isCompleteUsPhone(c.emergencyContactPhone)) return false
      if (!c.campWeeks.length) return false
    }
    return true
  }, [parentFirstName, parentLastName, parentEmail, parentPhone, children])

  function submit() {
    setError(null)
    if (!canSubmit) {
      setError('Complete all required fields and select at least one camp week per player.')
      return
    }

    const payloadChildren: RegistrationChildInput[] = children.map((c) => ({
      playerFirstName: c.playerFirstName.trim(),
      playerLastName: c.playerLastName.trim(),
      playerPronouns: (c.playerPronouns ?? '').trim(),
      playerDob: c.playerDob,
      playerGender: c.playerGender as 'boy' | 'girl',
      playerExperienceLevel: c.playerExperienceLevel,
      playerExperienceOther: c.playerExperienceOther,
      playerSoccerClub: c.playerSoccerClub.trim(),
      primaryPosition: c.primaryPosition.trim(),
      secondaryPosition: (c.secondaryPosition ?? '').trim(),
      gradeFall: c.gradeFall,
      schoolFall: c.schoolFall.trim(),
      childPhotoUrl: (c.childPhotoUrl ?? '').trim(),
      campWeeks: c.campWeeks,
      shirtSize: c.shirtSize,
      medicalNotes: (c.medicalNotes ?? '').trim(),
      emergencyContactName: c.emergencyContactName.trim(),
      emergencyContactPhone: c.emergencyContactPhone,
    }))

    const data: FamilyRegistrationInput = {
      parentFirstName: parentFirstName.trim(),
      parentLastName: parentLastName.trim(),
      parentEmail: parentEmail.trim(),
      parentPhone,
      children: payloadChildren,
    }

    startTransition(async () => {
      const r = await staffManualFamilyRegistration(data)
      if (!r.success) {
        setError(r.error)
        return
      }
      const q = r.parentInvited ? '?invited=1' : ''
      router.push(`/coach/players/${r.firstChildId}${q}`)
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 bg-white border border-[#e8d8ce] rounded-2xl p-6 sm:p-8 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase text-[#f05a28] mb-1">Staff tool</p>
        <h2 className="text-2xl font-extrabold text-[#062744]">Manual family registration</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Same information as the public registration form. If the parent does not have an account yet, we send a
          Supabase invite so they can verify email and create a password, then see this registration on their dashboard.
        </p>
      </div>

      <datalist id={SOCCER_CLUB_DATALIST_ID}>
        {SOCCER_CLUB_SUGGESTIONS.map((club) => (
          <option key={club} value={club} />
        ))}
      </datalist>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-[#062744] uppercase tracking-wide border-b border-[#f0e2d9] pb-2">
          Parent / guardian
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              value={parentFirstName}
              onChange={(e) => setParentFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Last name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              value={parentLastName}
              onChange={(e) => setParentLastName(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Parent email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={inputClass}
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Parent phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(415) 555-0100"
              className={inputClass}
              value={parentPhone}
              onChange={(e) => setParentPhone(formatUsPhoneAsYouType(e.target.value))}
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">10-digit US number required.</p>
          </div>
        </div>
      </section>

      {children.map((child, ci) => (
        <section key={ci} className="space-y-4 border-t border-[#f0e2d9] pt-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-[#062744] uppercase tracking-wide">
              Player {ci + 1} <span className="text-red-500">*</span>
            </h3>
            {children.length > 1 ? (
              <button
                type="button"
                onClick={() => removeChild(ci)}
                className="text-xs font-semibold text-red-700 hover:underline"
              >
                Remove player
              </button>
            ) : null}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">First name *</label>
              <input
                className={inputClass}
                value={child.playerFirstName}
                onChange={(e) => updateChild(ci, { playerFirstName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Last name *</label>
              <input
                className={inputClass}
                value={child.playerLastName}
                onChange={(e) => updateChild(ci, { playerLastName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Gender *</label>
              <select
                className={inputClass}
                value={child.playerGender}
                onChange={(e) =>
                  updateChild(ci, { playerGender: e.target.value as ChildFormRow['playerGender'] })
                }
                required
              >
                <option value="">Select</option>
                {REGISTRATION_GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Pronouns</label>
              <select
                className={inputClass}
                value={child.playerPronouns}
                onChange={(e) => updateChild(ci, { playerPronouns: e.target.value })}
              >
                <option value="">Prefer not to say / skip</option>
                {REGISTRATION_PRONOUNS_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Date of birth *</label>
              <input
                type="date"
                className={inputClass}
                value={child.playerDob}
                onChange={(e) => updateChild(ci, { playerDob: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Playing level *</label>
              <select
                className={inputClass}
                value={child.playerExperienceLevel}
                onChange={(e) => updateChild(ci, { playerExperienceLevel: e.target.value })}
                required
              >
                <option value="">Select playing level</option>
                {REGISTRATION_EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'other' ? 'Other' : lvl}
                  </option>
                ))}
              </select>
            </div>
            {child.playerExperienceLevel === 'other' ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Describe other level *</label>
                <input
                  className={inputClass}
                  value={child.playerExperienceOther}
                  onChange={(e) => updateChild(ci, { playerExperienceOther: e.target.value })}
                  required
                />
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Soccer club this year *</label>
              <p className="text-[11px] text-slate-500 mb-1">
                Choose a suggestion or type any club (same list as parent registration).
              </p>
              <input
                className={inputClass}
                list={SOCCER_CLUB_DATALIST_ID}
                value={child.playerSoccerClub}
                onChange={(e) => updateChild(ci, { playerSoccerClub: e.target.value })}
                placeholder="Type or select"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Primary position *</label>
              <select
                className={inputClass}
                value={child.primaryPosition}
                onChange={(e) => updateChild(ci, { primaryPosition: e.target.value })}
                required
              >
                <option value="">Select</option>
                {SOCCER_POSITION_CHOICES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Secondary position</label>
              <select
                className={inputClass}
                value={child.secondaryPosition}
                onChange={(e) => updateChild(ci, { secondaryPosition: e.target.value })}
              >
                <option value="">None</option>
                {SOCCER_POSITION_CHOICES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Grade (fall) *</label>
              <select
                className={inputClass}
                value={child.gradeFall}
                onChange={(e) => updateChild(ci, { gradeFall: e.target.value })}
                required
              >
                <option value="">Select grade</option>
                {REGISTRATION_GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">School (fall) *</label>
              <input
                className={inputClass}
                value={child.schoolFall}
                onChange={(e) => updateChild(ci, { schoolFall: e.target.value })}
                placeholder="School name"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Camp weeks *</label>
              <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-[#f0e2d9] rounded-xl p-3 bg-[#fffaf5]">
                {CAMP_SESSIONS.map((w) => (
                  <label key={w} className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={child.campWeeks.includes(w)}
                      onChange={() => toggleWeek(ci, w)}
                      className="mt-0.5 accent-[#f05a28]"
                    />
                    <span>{campNameFromWeekLabel(w)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Shirt size *</label>
              <select
                className={inputClass}
                value={child.shirtSize}
                onChange={(e) => updateChild(ci, { shirtSize: e.target.value })}
                required
              >
                <option value="">Select</option>
                {REGISTRATION_SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Medical notes</label>
              <textarea
                className={inputClass}
                rows={2}
                value={child.medicalNotes}
                onChange={(e) => updateChild(ci, { medicalNotes: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Emergency contact name *</label>
              <input
                className={inputClass}
                value={child.emergencyContactName}
                onChange={(e) => updateChild(ci, { emergencyContactName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Emergency contact phone *</label>
              <input
                type="tel"
                inputMode="numeric"
                className={inputClass}
                placeholder="(415) 555-0199"
                value={child.emergencyContactPhone}
                onChange={(e) =>
                  updateChild(ci, { emergencyContactPhone: formatUsPhoneAsYouType(e.target.value) })
                }
                required
              />
            </div>
          </div>
        </section>
      ))}

      <button type="button" onClick={addChild} className="text-sm font-bold text-[#062744] hover:underline">
        + Add another player
      </button>

      <div className="flex flex-wrap gap-3 pt-4 border-t border-[#f0e2d9]">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit()}
          className={canSubmit ? btnOrange : btnBlue}
        >
          {pending ? 'Saving…' : 'Create registration & email parent'}
        </button>
        <Link href="/coach/players" className="text-sm font-semibold text-slate-600 px-4 py-3 hover:text-[#062744]">
          Cancel
        </Link>
      </div>
    </div>
  )
}
