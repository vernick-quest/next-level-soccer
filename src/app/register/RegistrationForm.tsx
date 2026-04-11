'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import {
  getParentPrefillForAdditionalChild,
  submitFamilyRegistration,
  type RegistrationChildInput,
} from './actions'
import GoogleOAuthButton from '@/components/GoogleOAuthButton'
import ParentEmailAuthPanel from '@/components/ParentEmailAuthPanel'
import { uploadChildPhoto } from '@/lib/supabase/storage-upload'
import ChildAvatar from '@/components/ChildAvatar'
import {
  CHILD_PROFILE_PHOTO_ACCEPT,
  CHILD_PROFILE_PHOTO_ACCEPT_LABEL,
  CHILD_PROFILE_PHOTO_MAX_BYTES,
  isChildProfilePhotoMime,
  processChildPhotoForUpload,
} from '@/lib/child-photo-face-crop'
import { CAMP_SESSIONS } from '@/lib/camp-weeks'
import { SOCCER_CLUB_DATALIST_ID, SOCCER_CLUB_SUGGESTIONS } from '@/lib/soccer-club-suggestions'
import { formatUsPhoneAsYouType, isCompleteUsPhone } from '@/lib/phone-mask'
import { SOCCER_POSITION_CHOICES, soccerPositionLabel } from '@/lib/soccer-positions'

const PRONOUNS_OPTIONS = [
  { value: 'He/Him', label: 'He/Him' },
  { value: 'She/Her', label: 'She/Her' },
  { value: 'They/Them', label: 'They/Them' },
]

const GENDER_OPTIONS = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
]

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
    const suffix =
      n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
    return { value: String(n), label: `${n}${suffix} grade` }
  }),
]
const SHIRT_SIZES = ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL']

const CAMP_PRICE = 350

type ParentInfoState = {
  parentFirstName: string
  parentLastName: string
  parentEmail: string
  parentPhone: string
}

type ChildFormState = Omit<RegistrationChildInput, 'playerGender'> & {
  id: string
  playerGender: '' | 'boy' | 'girl'
  childPhotoFile: File | null
}

type Step = 1 | 2 | 3

function newChildId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const emptyParent: ParentInfoState = {
  parentFirstName: '',
  parentLastName: '',
  parentEmail: '',
  parentPhone: '',
}

function emptyChild(): ChildFormState {
  return {
    id: newChildId(),
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
    childPhotoFile: null,
  }
}

function parentNamesFromUser(user: User | null): Pick<ParentInfoState, 'parentFirstName' | 'parentLastName' | 'parentEmail'> {
  if (!user) {
    return { parentFirstName: '', parentLastName: '', parentEmail: '' }
  }
  const meta = user.user_metadata ?? {}
  let first = String(meta.given_name ?? '').trim()
  let last = String(meta.family_name ?? '').trim()
  const full =
    String(meta.full_name ?? meta.name ?? '').trim()
  if (!first && !last && full) {
    const parts = full.split(/\s+/).filter(Boolean)
    first = parts[0] ?? ''
    last = parts.slice(1).join(' ')
  }
  return {
    parentFirstName: first,
    parentLastName: last,
    parentEmail: user.email ?? '',
  }
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-[#213c57] mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Input({
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  readOnly,
  list,
}: {
  name: string
  type?: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  readOnly?: boolean
  list?: string
}) {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      readOnly={readOnly}
      list={list}
      className={`w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a28] focus:border-transparent transition-all text-sm ${readOnly ? 'bg-slate-100' : ''}`}
    />
  )
}

function Select({
  name,
  value,
  onChange,
  required,
  children,
}: {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f05a28] focus:border-transparent transition-all text-sm bg-white"
    >
      {children}
    </select>
  )
}

function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-[#f05a28] text-white text-sm font-bold flex items-center justify-center shrink-0">
        {step}
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
  )
}

function useChildPhotoPreviewUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

function RegChildPhotoAvatar({
  file,
  storedUrl,
  name,
}: {
  file: File | null
  storedUrl: string
  name: string
}) {
  const blobUrl = useChildPhotoPreviewUrl(file)
  const src = (blobUrl ?? storedUrl.trim()) || null
  return <ChildAvatar photoUrl={src} alt={name || 'Player'} sizeClass="w-10 h-10" />
}

export default function RegistrationForm({ additionalChildMode = false }: { additionalChildMode?: boolean }) {
  const [step, setStep] = useState<Step>(1)
  const [parent, setParent] = useState<ParentInfoState>(emptyParent)
  const [childrenList, setChildrenList] = useState<ChildFormState[]>(() => [emptyChild()])
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoChildIdBusy, setPhotoChildIdBusy] = useState<string | null>(null)
  /** Honeypot — must stay empty; bots often fill hidden fields. */
  const [hpCompany, setHpCompany] = useState('')

  const hydrateParentFromLastRegistration = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('registration_submissions')
      .select('parent_first_name, parent_last_name, parent_email, parent_phone')
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data) return
    setParent((prev) => ({
      ...prev,
      parentFirstName: data.parent_first_name || prev.parentFirstName,
      parentLastName: data.parent_last_name || prev.parentLastName,
      parentEmail: data.parent_email || prev.parentEmail,
      parentPhone: data.parent_phone ? formatUsPhoneAsYouType(data.parent_phone) : prev.parentPhone,
    }))
  }, [])

  const applyUserToParent = useCallback((user: User | null) => {
    if (!user) return
    const names = parentNamesFromUser(user)
    setParent((prev) => ({
      ...prev,
      // Do not overwrite hydrated DB values with empty strings (email/password users often lack name metadata).
      parentFirstName: names.parentFirstName || prev.parentFirstName,
      parentLastName: names.parentLastName || prev.parentLastName,
      parentEmail: names.parentEmail || prev.parentEmail,
    }))
  }, [])

  useEffect(() => {
    const supabase = createClient()

    function loadSession() {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user ?? null
        setAuthUser(u)
        applyUserToParent(u)
        if (u?.id) {
          if (additionalChildMode) {
            void (async () => {
              const p = await getParentPrefillForAdditionalChild()
              if (!p) return
              setParent((prev) => ({
                ...prev,
                parentFirstName: p.parentFirstName || prev.parentFirstName,
                parentLastName: p.parentLastName || prev.parentLastName,
                parentEmail: p.parentEmail || prev.parentEmail,
                parentPhone: p.parentPhone ? formatUsPhoneAsYouType(p.parentPhone) : prev.parentPhone,
              }))
            })()
          } else {
            void hydrateParentFromLastRegistration(u.id)
          }
        }
        setAuthReady(true)
      })
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setAuthUser(u)
      applyUserToParent(u)
      if (u?.id) {
        if (additionalChildMode) {
          void (async () => {
            const p = await getParentPrefillForAdditionalChild()
            if (!p) return
            setParent((prev) => ({
              ...prev,
              parentFirstName: p.parentFirstName || prev.parentFirstName,
              parentLastName: p.parentLastName || prev.parentLastName,
              parentEmail: p.parentEmail || prev.parentEmail,
              parentPhone: p.parentPhone ? formatUsPhoneAsYouType(p.parentPhone) : prev.parentPhone,
            }))
          })()
        } else {
          void hydrateParentFromLastRegistration(u.id)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [additionalChildMode, applyUserToParent, hydrateParentFromLastRegistration])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'auth') {
      setError('Sign-in did not complete. Please try again.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  function handleParentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    if (name === 'parentPhone') {
      setParent((prev) => ({ ...prev, [name]: formatUsPhoneAsYouType(value) }))
      return
    }
    setParent((prev) => ({ ...prev, [name]: value }))
  }

  function updateChild(id: string, patch: Partial<ChildFormState>) {
    setChildrenList((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function handleChildInput(id: string, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    if (name === 'emergencyContactPhone') {
      updateChild(id, { emergencyContactPhone: formatUsPhoneAsYouType(value) })
      return
    }
    updateChild(id, { [name]: value } as Partial<ChildFormState>)
  }

  async function handlePhotoFileChosen(childId: string, file: File | null) {
    if (!file) {
      updateChild(childId, { childPhotoFile: null })
      return
    }
    if (!isChildProfilePhotoMime(file.type)) {
      setError(`Photo must be one of: ${CHILD_PROFILE_PHOTO_ACCEPT_LABEL}.`)
      return
    }
    if (file.size > CHILD_PROFILE_PHOTO_MAX_BYTES) {
      setError('Photo must be 5 MB or smaller.')
      return
    }
    setError(null)
    setPhotoChildIdBusy(childId)
    try {
      const processed = await processChildPhotoForUpload(file)
      updateChild(childId, { childPhotoFile: processed })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not process photo.')
    } finally {
      setPhotoChildIdBusy(null)
    }
  }

  function handleExperienceLevelChange(id: string, value: string) {
    setChildrenList((list) =>
      list.map((c) =>
        c.id === id
          ? {
              ...c,
              playerExperienceLevel: value,
              playerExperienceOther: value === 'other' ? c.playerExperienceOther : '',
            }
          : c,
      ),
    )
  }

  function toggleChildWeek(childId: string, week: string) {
    setChildrenList((list) =>
      list.map((c) => {
        if (c.id !== childId) return c
        const weeks = c.campWeeks.includes(week)
          ? c.campWeeks.filter((w) => w !== week)
          : [...c.campWeeks, week]
        return { ...c, campWeeks: weeks }
      }),
    )
  }

  function addAnotherChild() {
    setChildrenList((list) => {
      const last = list[list.length - 1]
      const copy: ChildFormState = {
        ...last,
        id: newChildId(),
        playerFirstName: last.playerFirstName,
        playerLastName: last.playerLastName,
        playerPronouns: last.playerPronouns,
        playerDob: last.playerDob,
        playerGender: last.playerGender,
        playerExperienceLevel: last.playerExperienceLevel,
        playerExperienceOther: last.playerExperienceOther,
        playerSoccerClub: last.playerSoccerClub,
        primaryPosition: last.primaryPosition,
        secondaryPosition: last.secondaryPosition,
        gradeFall: last.gradeFall,
        schoolFall: last.schoolFall,
        childPhotoUrl: last.childPhotoUrl,
        campWeeks: [...last.campWeeks],
        shirtSize: last.shirtSize,
        medicalNotes: last.medicalNotes,
        emergencyContactName: last.emergencyContactName,
        emergencyContactPhone: last.emergencyContactPhone,
        childPhotoFile: null,
      }
      return [...list, copy]
    })
  }

  function removeChild(id: string) {
    setChildrenList((list) => (list.length <= 1 ? list : list.filter((c) => c.id !== id)))
  }

  function validateChildren(): string | null {
    for (let i = 0; i < childrenList.length; i++) {
      const c = childrenList[i]
      if (!c.playerFirstName.trim() || !c.playerLastName.trim()) {
        return `Please complete player ${i + 1} name.`
      }
      if (!c.playerDob) return `Please enter date of birth for player ${i + 1}.`
      if (!c.playerGender) return `Please select gender for player ${i + 1}.`
      if (!c.playerExperienceLevel) return `Please select playing level for player ${i + 1}.`
      if (c.playerExperienceLevel === 'other' && !c.playerExperienceOther.trim()) {
        return `Please describe playing level for player ${i + 1} (Other).`
      }
      if (!c.playerSoccerClub.trim()) {
        return `Please enter the soccer club or program for player ${i + 1}.`
      }
      if (!c.primaryPosition) return `Please select primary position for player ${i + 1}.`
      if (!c.gradeFall) return `Please select grade for player ${i + 1}.`
      if (!c.schoolFall.trim()) return `Please enter school for player ${i + 1}.`
      if (!c.campWeeks.length) return `Select at least one week for ${c.playerFirstName || `player ${i + 1}`}.`
      if (!c.shirtSize) return `Select shirt size for player ${i + 1}.`
      if (!c.emergencyContactName.trim() || !c.emergencyContactPhone.trim()) {
        return `Please add emergency contact for player ${i + 1}.`
      }
      if (!isCompleteUsPhone(c.emergencyContactPhone)) {
        return `Please enter a complete 10-digit emergency contact phone for player ${i + 1}.`
      }
    }
    return null
  }

  function calculateTotal() {
    return childrenList.reduce((sum, c) => sum + c.campWeeks.length * CAMP_PRICE, 0)
  }

  function formatChildName(c: ChildFormState) {
    return `${c.playerFirstName} ${c.playerLastName}`.trim()
  }

  function gradeLabel(value: string) {
    return GRADE_OPTIONS.find((g) => g.value === value)?.label ?? value
  }

  async function submitAll() {
    const err = validateChildren()
    if (err) {
      setError(err)
      return
    }
    setError(null)

    if (hpCompany.trim() !== '') {
      setError('Registration could not be completed. Please try again.')
      return
    }

    if (childrenList.some((c) => c.childPhotoFile) && !authUser) {
      setError('Please sign in before uploading child photos.')
      return
    }

    setIsUploadingPhotos(true)
    const childrenWithPhotos: ChildFormState[] = []
    for (const child of childrenList) {
      if (child.childPhotoFile) {
        const { publicUrl, error: uploadError } = await uploadChildPhoto(child.childPhotoFile, child.id)
        if (uploadError || !publicUrl) {
          setIsUploadingPhotos(false)
          setError(uploadError || `Could not upload photo for ${formatChildName(child) || 'player'}.`)
          return
        }
        childrenWithPhotos.push({ ...child, childPhotoUrl: publicUrl })
      } else {
        childrenWithPhotos.push(child)
      }
    }
    setIsUploadingPhotos(false)
    setChildrenList(childrenWithPhotos)

    const payloadChildren: RegistrationChildInput[] = childrenWithPhotos.map((c) => ({
      playerFirstName: c.playerFirstName,
      playerLastName: c.playerLastName,
      playerPronouns: c.playerPronouns,
      playerDob: c.playerDob,
      playerGender: c.playerGender as 'boy' | 'girl',
      playerExperienceLevel: c.playerExperienceLevel,
      playerExperienceOther: c.playerExperienceOther,
      playerSoccerClub: c.playerSoccerClub,
      primaryPosition: c.primaryPosition,
      secondaryPosition: c.secondaryPosition.trim(),
      gradeFall: c.gradeFall,
      schoolFall: c.schoolFall,
      childPhotoUrl: c.childPhotoUrl,
      campWeeks: c.campWeeks,
      shirtSize: c.shirtSize,
      medicalNotes: c.medicalNotes,
      emergencyContactName: c.emergencyContactName,
      emergencyContactPhone: c.emergencyContactPhone,
    }))

    startTransition(async () => {
      try {
        const result = await submitFamilyRegistration({
          parentFirstName: parent.parentFirstName,
          parentLastName: parent.parentLastName,
          parentEmail: parent.parentEmail,
          parentPhone: parent.parentPhone,
          children: payloadChildren,
          hpCompany,
        })
        if (result.success) {
          setSubmitted(true)
        } else {
          setError(result.error)
        }
      } catch (e) {
        console.error('submitFamilyRegistration threw:', e)
        setError('Registration failed on the server. Please try again or contact support.')
      }
    })
  }

  if (!authReady) {
    return (
      <div className="text-center py-12 text-slate-600 text-sm">Loading…</div>
    )
  }

  if (submitted) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Weeks Reserved!</h2>
        <p className="text-slate-600 max-w-2xl mx-auto mb-8">
          Thanks, <strong>{parent.parentFirstName}</strong>. Your requested weeks have been reserved for each player below.
          A registration email will be sent to <strong>{parent.parentEmail}</strong>. Pay the total via Zelle or Venmo to confirm spots.
        </p>
        <div className="max-w-2xl mx-auto text-left bg-[#fff3ec] border border-[#f6d6c8] text-[#9b3e1f] px-5 py-4 rounded-xl text-sm">
          {childrenList.map((item) => (
            <div key={item.id} className="mb-2 last:mb-0">
              <strong>{formatChildName(item) || 'Player'}:</strong> {item.campWeeks.join(', ')}
              {item.childPhotoUrl ? (
                <div className="mt-2">
                  <ChildAvatar
                    photoUrl={item.childPhotoUrl}
                    alt={`${formatChildName(item) || 'Player'} profile`}
                    sizeClass="w-12 h-12"
                  />
                </div>
              ) : null}
            </div>
          ))}
          <div className="mt-3 font-bold">Total due: ${calculateTotal()}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {step === 1 && (
        <form
          className="relative bg-white rounded-2xl border border-[#e8d8ce] p-6 sm:p-8 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (!authUser) {
              setError('Please sign in or create an account above before continuing (Google, email, or magic link).')
              return
            }
            if (!parent.parentPhone.trim()) {
              setError('Please enter your phone number.')
              return
            }
            if (!isCompleteUsPhone(parent.parentPhone)) {
              setError('Please enter a complete 10-digit parent phone number.')
              return
            }
            setError(null)
            setStep(2)
          }}
        >
          <SectionHeader step={1} title="Your account & parent information" />

          {authUser ? (
            <p className="text-sm text-slate-600 mb-4">
              Signed in as <strong>{parent.parentEmail}</strong>. Add your phone number if you have not already.
            </p>
          ) : (
            <div className="mb-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Sign in or create an account as part of registration (required before you submit). Already registered? Use{' '}
                <a href="/login?next=%2Fdashboard" className="text-[#f05a28] font-semibold hover:underline">
                  Login
                </a>{' '}
                for your dashboard — new camp sign-ups stay on this page.
              </p>
              <GoogleOAuthButton nextPath="/register" />
              <ParentEmailAuthPanel variant="register" />
              <p className="text-xs text-slate-500">
                After you sign in, your email is locked to this account. You can still edit other parent fields below.
              </p>
            </div>
          )}

          <div className="border-t border-[#e8d8ce] pt-6 mt-2">
            <p className="text-xs font-semibold text-[#213c57] uppercase tracking-wide mb-4">Parent / guardian details</p>
          </div>

          {/* Honeypot: hidden from users; bots often fill this. */}
          <div className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
            <label htmlFor="hp-company">Company</label>
            <input
              id="hp-company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={hpCompany}
              onChange={(e) => setHpCompany(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <Label required>Parent First Name</Label>
              <Input name="parentFirstName" placeholder="Jane" value={parent.parentFirstName} onChange={handleParentChange} required />
            </div>
            <div>
              <Label required>Parent Last Name</Label>
              <Input name="parentLastName" placeholder="Smith" value={parent.parentLastName} onChange={handleParentChange} required />
            </div>
            <div className="sm:col-span-2">
              <Label required>Parent Email Address</Label>
              <Input
                name="parentEmail"
                type="email"
                placeholder="jane@example.com"
                value={parent.parentEmail}
                onChange={handleParentChange}
                required
                readOnly={!!authUser}
              />
            </div>
            <div className="sm:col-span-2">
              <Label required>Parent Phone Number</Label>
              <Input name="parentPhone" type="tel" placeholder="(415) 555-0100" value={parent.parentPhone} onChange={handleParentChange} required />
            </div>
          </div>

          <button type="submit" className="mt-8 w-full bg-[#062744] hover:bg-[#041f36] text-white font-bold py-4 rounded-full text-lg transition-colors shadow-md">
            Continue to Players
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <datalist id={SOCCER_CLUB_DATALIST_ID}>
            {SOCCER_CLUB_SUGGESTIONS.map((club) => (
              <option key={club} value={club} />
            ))}
          </datalist>
          {childrenList.map((child, index) => (
            <div key={child.id} className="bg-white rounded-2xl border border-[#e8d8ce] p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#f05a28] text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Player {index + 1}</h2>
                </div>
                {childrenList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(child.id)}
                    className="text-xs font-semibold text-[#c24a22] hover:text-[#9b3e1f] underline shrink-0"
                  >
                    Remove player
                  </button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label required>First Name</Label>
                  <Input name="playerFirstName" placeholder="Alex" value={child.playerFirstName} onChange={(e) => handleChildInput(child.id, e)} required />
                </div>
                <div>
                  <Label required>Last Name</Label>
                  <Input name="playerLastName" placeholder="Smith" value={child.playerLastName} onChange={(e) => handleChildInput(child.id, e)} required />
                </div>
                <div>
                  <Label required>Gender</Label>
                  <Select name="playerGender" value={child.playerGender} onChange={(e) => handleChildInput(child.id, e)} required>
                    <option value="">Select</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Pronouns (optional)</Label>
                  <Select name="playerPronouns" value={child.playerPronouns} onChange={(e) => handleChildInput(child.id, e)}>
                    <option value="">Prefer not to say / skip</option>
                    {PRONOUNS_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label required>Date of Birth</Label>
                  <Input name="playerDob" type="date" value={child.playerDob} onChange={(e) => handleChildInput(child.id, e)} required />
                </div>
                <div className="sm:col-span-2">
                  <Label required>Playing level</Label>
                  <select
                    name="playerExperienceLevel"
                    value={child.playerExperienceLevel}
                    onChange={(e) => handleExperienceLevelChange(child.id, e.target.value)}
                    required
                    className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#f05a28] focus:border-transparent transition-all text-sm bg-white"
                  >
                    <option value="">Select playing level</option>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl === 'other' ? 'Other' : lvl}
                      </option>
                    ))}
                  </select>
                </div>
                {child.playerExperienceLevel === 'other' && (
                  <div className="sm:col-span-2">
                    <Label required>Describe other level</Label>
                    <Input
                      name="playerExperienceOther"
                      placeholder="e.g. league or program name"
                      value={child.playerExperienceOther}
                      onChange={(e) => handleChildInput(child.id, e)}
                      required
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label required>Soccer club this year</Label>
                  <p className="text-xs text-slate-500 mt-0.5 mb-1.5 leading-snug">
                    Choose a suggestion or type any club. Includes Seals, Glens, Elite, Dynamo, Vikings, United, Mission IFC,
                    Aftershocks, Girls Unite, School Team, SFYS, and others.
                  </p>
                  <Input
                    name="playerSoccerClub"
                    list={SOCCER_CLUB_DATALIST_ID}
                    placeholder="Type or select — e.g. Dynamo, Glens, School Team"
                    value={child.playerSoccerClub}
                    onChange={(e) => handleChildInput(child.id, e)}
                    required
                  />
                </div>
                <div>
                  <Label required>Primary position</Label>
                  <Select
                    name="primaryPosition"
                    value={child.primaryPosition}
                    onChange={(e) => handleChildInput(child.id, e)}
                    required
                  >
                    <option value="">Select primary position</option>
                    {SOCCER_POSITION_CHOICES.map((pos) => (
                      <option key={pos.value} value={pos.value}>{pos.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Secondary position (optional)</Label>
                  <Select
                    name="secondaryPosition"
                    value={child.secondaryPosition}
                    onChange={(e) => handleChildInput(child.id, e)}
                  >
                    <option value="">None</option>
                    {SOCCER_POSITION_CHOICES.map((pos) => (
                      <option key={pos.value} value={pos.value}>{pos.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label required>Grade attending (fall)</Label>
                  <Select name="gradeFall" value={child.gradeFall} onChange={(e) => handleChildInput(child.id, e)} required>
                    <option value="">Select grade</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label required>School attending (fall)</Label>
                  <Input name="schoolFall" placeholder="School name" value={child.schoolFall} onChange={(e) => handleChildInput(child.id, e)} required />
                </div>
                <div className="sm:col-span-2">
                  <Label>Photo Upload</Label>
                  <p className="text-xs text-slate-500 mb-2">
                    {CHILD_PROFILE_PHOTO_ACCEPT_LABEL}. Max 5 MB. We detect the face (when possible), crop to a square,
                    and size it for your round profile picture.
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label
                      className={`inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#fff3ec] text-[#9b3e1f] font-semibold text-sm cursor-pointer hover:bg-[#fde6da] transition-colors ${
                        photoChildIdBusy === child.id ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {photoChildIdBusy === child.id ? 'Preparing photo…' : 'Upload Photo'}
                      <input
                        type="file"
                        accept={CHILD_PROFILE_PHOTO_ACCEPT}
                        disabled={photoChildIdBusy === child.id}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null
                          e.target.value = ''
                          void handlePhotoFileChosen(child.id, f)
                        }}
                      />
                    </label>
                    <span className="text-xs text-slate-500">
                      {child.childPhotoFile?.name || (child.childPhotoUrl ? 'Photo ready' : 'No file selected')}
                    </span>
                    <RegChildPhotoAvatar
                      file={child.childPhotoFile}
                      storedUrl={child.childPhotoUrl}
                      name={formatChildName(child) || 'Player'}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label required>Weeks Available</Label>
                  <div className="grid sm:grid-cols-2 gap-3 mt-1">
                    {CAMP_SESSIONS.map((week) => (
                      <label
                        key={week}
                        className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all text-sm font-medium ${
                          child.campWeeks.includes(week)
                            ? 'border-[#f05a28] bg-[#fff3ec] text-[#9b3e1f]'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={child.campWeeks.includes(week)}
                          onChange={() => toggleChildWeek(child.id, week)}
                          className="accent-[#f05a28]"
                        />
                        {week}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label required>T-Shirt Size</Label>
                  <Select name="shirtSize" value={child.shirtSize} onChange={(e) => handleChildInput(child.id, e)} required>
                    <option value="">Select size</option>
                    {SHIRT_SIZES.map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label required>Emergency Contact Name</Label>
                  <Input name="emergencyContactName" placeholder="John Smith" value={child.emergencyContactName} onChange={(e) => handleChildInput(child.id, e)} required />
                </div>
                <div>
                  <Label required>Emergency Contact Phone</Label>
                  <Input name="emergencyContactPhone" type="tel" placeholder="(415) 555-0199" value={child.emergencyContactPhone} onChange={(e) => handleChildInput(child.id, e)} required />
                </div>
                <div className="sm:col-span-2">
                  <Label>Medical Notes / Allergies</Label>
                  <textarea
                    name="medicalNotes"
                    value={child.medicalNotes}
                    onChange={(e) => handleChildInput(child.id, e)}
                    rows={3}
                    placeholder="Optional: conditions, allergies, medications, or notes for coaches"
                    className="w-full border border-[#e8d8ce] rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f05a28] focus:border-transparent transition-all text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addAnotherChild}
            className="w-full border-2 border-dashed border-[#f05a28] text-[#c24a22] font-semibold py-3 rounded-full hover:bg-[#fff3ec] transition-colors"
          >
            Add another child (copies fields from player above)
          </button>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="w-1/3 bg-[#fff3ec] hover:bg-[#fde6da] text-[#9b3e1f] font-semibold py-3 rounded-full transition-colors">
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                const err = validateChildren()
                if (err) {
                  setError(err)
                  return
                }
                setError(null)
                setStep(3)
              }}
              className="w-2/3 bg-[#062744] hover:bg-[#041f36] text-white font-bold py-3 rounded-full transition-colors shadow-md"
            >
              Continue to review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[#e8d8ce] p-6 sm:p-8 shadow-sm">
          <SectionHeader step={3} title="Review & Reserve" />
          <p className="text-slate-700 mb-4">
            The following weeks will be reserved for each player. You will receive a registration email after submission. Spots stay pending until we receive payment.
          </p>
          <div className="space-y-3 mb-6">
            {childrenList.map((item) => (
              <div key={item.id} className="bg-[#fffaf5] border border-[#f0e2d9] rounded-xl p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{formatChildName(item)}</div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {item.playerPronouns ? `${item.playerPronouns} · ` : ''}
                      {item.playerGender === 'boy' ? 'Boy' : item.playerGender === 'girl' ? 'Girl' : ''} ·{' '}
                      {gradeLabel(item.gradeFall)} · {item.schoolFall}
                      {item.playerExperienceLevel && (
                        <>
                          {' '}
                          ·{' '}
                          {item.playerExperienceLevel === 'other'
                            ? `Other: ${item.playerExperienceOther}`
                            : item.playerExperienceLevel}
                        </>
                      )}
                      {item.playerSoccerClub.trim() && (
                        <>
                          {' '}
                          · Club: {item.playerSoccerClub.trim()}
                        </>
                      )}
                      {(item.primaryPosition || item.secondaryPosition) && (
                        <>
                          {' '}
                          · Positions: {soccerPositionLabel(item.primaryPosition)}
                          {item.secondaryPosition.trim()
                            ? ` / ${soccerPositionLabel(item.secondaryPosition)}`
                            : ''}
                        </>
                      )}
                    </div>
                    <div className="text-slate-600 mt-1">{item.campWeeks.join(', ')}</div>
                    <div className="text-[#9b3e1f] font-semibold mt-2">{item.campWeeks.length} week(s) × ${CAMP_PRICE}</div>
                  </div>
                  <button type="button" onClick={() => setStep(2)} className="text-xs font-semibold text-[#062744] underline shrink-0">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#fff3ec] border border-[#f6d6c8] rounded-xl p-4 mb-6">
            <p className="text-sm text-[#9b3e1f]">
              Pay <strong>${calculateTotal()}</strong> via Zelle or Venmo to confirm these spots.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 accent-[#f05a28] w-4 h-4 shrink-0"
            />
            <span className="text-sm text-slate-600 leading-relaxed">
              I understand weeks are reserved pending payment; spots are confirmed only after payment is received.
            </span>
          </label>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="w-1/3 bg-[#fff3ec] hover:bg-[#fde6da] text-[#9b3e1f] font-semibold py-3 rounded-full transition-colors">
              Back
            </button>
            <button
              type="button"
              onClick={() => void submitAll()}
              disabled={isPending || isUploadingPhotos || !termsAccepted}
              className="w-2/3 bg-[#062744] hover:bg-[#041f36] disabled:bg-[#4b6782] text-white font-bold py-3 rounded-full transition-colors shadow-md disabled:cursor-not-allowed"
            >
              {isUploadingPhotos ? 'Uploading photos…' : isPending ? 'Submitting…' : 'Submit registration'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
