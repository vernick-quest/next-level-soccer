'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { SOCCER_POSITION_CHOICES } from '@/lib/soccer-positions'
import { staffManualFamilyRegistration } from './coach-registration-actions'
import type { FamilyRegistrationInput, RegistrationChildInput } from '@/lib/family-registration-input-types'

const EXPERIENCE_LEVELS = [
  'SFYS',
  'School Team',
  'Copper',
  'Bronze',
  'Silver',
  'Gold',
  'Premier',
  'NPL',
  'ECNL-RL',
  'ECNL',
  'MLS-Next',
  'other',
] as const

const GRADE_OPTIONS: { value: string; label: string }[] = [
  { value: 'K', label: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
    return { value: String(n), label: `${n}${suffix} grade` }
  }),
]

const SHIRT_SIZES = ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL']

function emptyChild(): RegistrationChildInput {
  return {
    playerFirstName: '',
    playerLastName: '',
    playerPronouns: '',
    playerDob: '',
    playerGender: 'boy',
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

export default function CoachManualRegistrationForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [parentFirstName, setParentFirstName] = useState('')
  const [parentLastName, setParentLastName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')

  const [children, setChildren] = useState<RegistrationChildInput[]>([emptyChild()])

  function updateChild(i: number, patch: Partial<RegistrationChildInput>) {
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

  function submit() {
    setError(null)
    const data: FamilyRegistrationInput = {
      parentFirstName,
      parentLastName,
      parentEmail: parentEmail.trim(),
      parentPhone,
      children,
    }
    startTransition(async () => {
      const r = await staffManualFamilyRegistration(data)
      if (!r.success) {
        setError(r.error)
        return
      }
      router.push(`/coach/players/${r.firstChildId}`)
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 bg-white border border-[#e8d8ce] rounded-2xl p-6 sm:p-8 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase text-[#f05a28] mb-1">Staff tool</p>
        <h2 className="text-2xl font-extrabold text-[#062744]">Manual family registration</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Creates <code className="text-xs bg-slate-100 px-1 rounded">registration_submissions</code>,{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">registration_children</code>, and{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">registrations</code> using the service role. Parent email must
          match an existing Supabase account (same email they use to log in).
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-sm font-extrabold text-[#062744] uppercase tracking-wide border-b border-[#f0e2d9] pb-2">
          Parent / guardian
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">First name</label>
            <input className={inputClass} value={parentFirstName} onChange={(e) => setParentFirstName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Last name</label>
            <input className={inputClass} value={parentLastName} onChange={(e) => setParentLastName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Parent email (login)</label>
            <input
              type="email"
              className={inputClass}
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
            <input className={inputClass} value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
          </div>
        </div>
      </section>

      {children.map((child, ci) => (
        <section key={ci} className="space-y-4 border-t border-[#f0e2d9] pt-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-[#062744] uppercase tracking-wide">Player {ci + 1}</h3>
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
              <label className="block text-xs font-bold text-slate-600 mb-1">First name</label>
              <input className={inputClass} value={child.playerFirstName} onChange={(e) => updateChild(ci, { playerFirstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Last name</label>
              <input className={inputClass} value={child.playerLastName} onChange={(e) => updateChild(ci, { playerLastName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Gender</label>
              <select className={inputClass} value={child.playerGender} onChange={(e) => updateChild(ci, { playerGender: e.target.value as 'boy' | 'girl' })}>
                <option value="boy">Boy</option>
                <option value="girl">Girl</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Pronouns</label>
              <input className={inputClass} value={child.playerPronouns} onChange={(e) => updateChild(ci, { playerPronouns: e.target.value })} placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Date of birth</label>
              <input type="date" className={inputClass} value={child.playerDob} onChange={(e) => updateChild(ci, { playerDob: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Playing level</label>
              <select className={inputClass} value={child.playerExperienceLevel} onChange={(e) => updateChild(ci, { playerExperienceLevel: e.target.value })}>
                <option value="">Select</option>
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'other' ? 'Other' : lvl}
                  </option>
                ))}
              </select>
            </div>
            {child.playerExperienceLevel === 'other' ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Other level description</label>
                <input className={inputClass} value={child.playerExperienceOther} onChange={(e) => updateChild(ci, { playerExperienceOther: e.target.value })} />
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Soccer club this year</label>
              <input className={inputClass} value={child.playerSoccerClub} onChange={(e) => updateChild(ci, { playerSoccerClub: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Primary position</label>
              <select className={inputClass} value={child.primaryPosition} onChange={(e) => updateChild(ci, { primaryPosition: e.target.value })}>
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
              <select className={inputClass} value={child.secondaryPosition} onChange={(e) => updateChild(ci, { secondaryPosition: e.target.value })}>
                <option value="">—</option>
                {SOCCER_POSITION_CHOICES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Grade (fall)</label>
              <select className={inputClass} value={child.gradeFall} onChange={(e) => updateChild(ci, { gradeFall: e.target.value })}>
                <option value="">Select</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">School (fall)</label>
              <input className={inputClass} value={child.schoolFall} onChange={(e) => updateChild(ci, { schoolFall: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Shirt size</label>
              <select className={inputClass} value={child.shirtSize} onChange={(e) => updateChild(ci, { shirtSize: e.target.value })}>
                <option value="">Select</option>
                {SHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Medical notes</label>
              <textarea className={inputClass} rows={2} value={child.medicalNotes} onChange={(e) => updateChild(ci, { medicalNotes: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Emergency contact name</label>
              <input className={inputClass} value={child.emergencyContactName} onChange={(e) => updateChild(ci, { emergencyContactName: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Emergency contact phone</label>
              <input className={inputClass} value={child.emergencyContactPhone} onChange={(e) => updateChild(ci, { emergencyContactPhone: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-2">Camp weeks</label>
              <div className="grid sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-[#f0e2d9] rounded-xl p-3 bg-[#fffaf5]">
                {CAMP_SESSIONS.map((w) => (
                  <label key={w} className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer">
                    <input type="checkbox" checked={child.campWeeks.includes(w)} onChange={() => toggleWeek(ci, w)} className="mt-0.5" />
                    <span>{w}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      <button type="button" onClick={addChild} className="text-sm font-bold text-[#f05a28] hover:underline">
        + Add another player
      </button>

      <div className="flex flex-wrap gap-3 pt-4 border-t border-[#f0e2d9]">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit()}
          className="text-sm font-bold bg-[#062744] text-white px-6 py-3 rounded-full hover:bg-[#041f36] disabled:opacity-50"
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
