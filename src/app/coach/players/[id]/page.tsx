import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStaffAdminUser } from '@/lib/admin'
import ChildAvatar from '@/components/ChildAvatar'
import CoachesSignIn from '@/app/coaches/CoachesSignIn'
import CoachesWrongAccount from '@/app/coaches/CoachesWrongAccount'
import { campNameFromWeekLabel } from '@/lib/camp-display'
import { CoachAreaHeader } from '../CoachAreaHeader'
import { getPlayerDirectoryProfileForStaff } from '../actions'
import ReportSkillsGrid from '@/app/dashboard/ReportSkillsGrid'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { profile } = await getPlayerDirectoryProfileForStaff(id)
  if (!profile) {
    return { title: 'Player | Coach Portal' }
  }
  const name = `${profile.player_first_name} ${profile.player_last_name}`.trim()
  return {
    title: `${name} | Player directory | Next Level Soccer SF`,
    description: `Coach scouting profile for ${name}.`,
  }
}

function formatDob(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function formatActivityWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function CoachPlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const staffUser = await getStaffAdminUser()
  if (!staffUser?.email) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      return <CoachesWrongAccount />
    }
    return <CoachesSignIn />
  }

  const { profile, error } = await getPlayerDirectoryProfileForStaff(id)
  if (error === 'not_found' || !profile) {
    notFound()
  }
  if (error === 'fetch') {
    return (
      <div className="min-h-screen bg-[#f7f2e8] py-10 px-4">
        <div className="max-w-3xl mx-auto text-center text-slate-700">
          Could not load this profile. Try again or return to the directory.
        </div>
      </div>
    )
  }

  const fullName = `${profile.player_first_name} ${profile.player_last_name}`.trim()
  const p = profile.parent
  const hasSecondParent =
    !!(p.second_parent_first_name || p.second_parent_last_name || p.second_parent_email || p.second_parent_phone)

  return (
    <div className="min-h-screen bg-[#f7f2e8] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <CoachAreaHeader title="Scouting profile" subtitle="Internal coach view — roster, contacts, and history." />

        <div className="relative overflow-hidden rounded-2xl border border-[#e8d8ce] bg-white shadow-md">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#062744] via-[#f05a28] to-[#062744]" aria-hidden />
          <div className="p-6 sm:p-8 pt-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
              <ChildAvatar photoUrl={profile.child_photo_url} alt={fullName} sizeClass="w-28 h-28 sm:w-32 sm:h-32" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-[#f05a28] mb-1">Player file</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#062744] leading-tight">{fullName}</h2>
                <dl className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Date of birth</dt>
                    <dd className="text-[#062744] font-semibold">{formatDob(profile.player_dob)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Current club</dt>
                    <dd className="text-[#062744] font-semibold">{profile.soccer_club || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Pronouns</dt>
                    <dd className="text-[#062744] font-semibold">{profile.player_pronouns?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Playing level</dt>
                    <dd className="text-[#062744] font-semibold">{profile.playing_level?.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">School (fall)</dt>
                    <dd className="text-[#062744] font-semibold">{profile.school_fall || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Primary position</dt>
                    <dd className="text-[#062744] font-semibold">{profile.primary_position_label || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Grade (fall)</dt>
                    <dd className="text-[#062744] font-semibold">{profile.grade_fall || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500">Secondary position</dt>
                    <dd className="text-[#062744] font-semibold">{profile.secondary_position_label || '—'}</dd>
                  </div>
                </dl>
                {profile.camp_weeks_requested.length > 0 ? (
                  <div className="mt-5 rounded-xl border border-[#f0e2d9] bg-[#fffaf5] px-4 py-3 text-xs text-slate-700">
                    <span className="font-bold text-[#062744]">Weeks on registration: </span>
                    {profile.camp_weeks_requested.map((w) => campNameFromWeekLabel(w)).join(' · ')}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-[#e8d8ce] bg-white p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-extrabold text-[#062744] border-b border-[#f0e2d9] pb-2 mb-4">
            Family &amp; contacts
          </h3>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs font-bold uppercase text-[#f05a28] mb-2">Primary parent / guardian</p>
              <p className="font-bold text-[#062744]">
                {trimDisplay(p.parent_first_name)} {trimDisplay(p.parent_last_name)}
              </p>
              <p className="mt-1">
                <a href={`mailto:${p.parent_email ?? ''}`} className="text-[#f05a28] font-semibold hover:underline">
                  {p.parent_email || '—'}
                </a>
              </p>
              <p className="mt-1 text-slate-700">
                <a href={`tel:${digitsOnly(p.parent_phone)}`} className="hover:text-[#f05a28]">
                  {p.parent_phone || '—'}
                </a>
              </p>
            </div>
            {hasSecondParent ? (
              <div>
                <p className="text-xs font-bold uppercase text-[#f05a28] mb-2">Second parent / guardian</p>
                <p className="font-bold text-[#062744]">
                  {trimDisplay(p.second_parent_first_name)} {trimDisplay(p.second_parent_last_name)}
                </p>
                <p className="mt-1">
                  {p.second_parent_email ? (
                    <a href={`mailto:${p.second_parent_email}`} className="text-[#f05a28] font-semibold hover:underline">
                      {p.second_parent_email}
                    </a>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </p>
                <p className="mt-1 text-slate-700">
                  {p.second_parent_phone ? (
                    <a href={`tel:${digitsOnly(p.second_parent_phone)}`} className="hover:text-[#f05a28]">
                      {p.second_parent_phone}
                    </a>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </p>
              </div>
            ) : (
              <div className="text-slate-500 text-sm italic sm:flex sm:items-end">No second parent on file.</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8d8ce] bg-white p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-extrabold text-[#062744] border-b border-[#f0e2d9] pb-2 mb-2">Coach report cards</h3>
          <p className="text-sm text-slate-600 mb-4">
            Read-only view of submitted scores by camp week (same grid families see on the parent dashboard). A dash in
            a white column means the player was enrolled that week but no report is on file yet. Grey columns are weeks
            they were not enrolled in camp.
          </p>
          <ReportSkillsGrid
            reportsByWeekKey={profile.reportsByWeekKey}
            enrolledWeekKeys={profile.registeredCampSessions}
          />
        </section>

        <section className="rounded-2xl border border-[#e8d8ce] bg-white p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-extrabold text-[#062744] border-b border-[#f0e2d9] pb-2 mb-4">Recent activity</h3>
          {profile.activity.length === 0 ? (
            <p className="text-slate-600 text-sm">No camp week rows or report cards yet for this player.</p>
          ) : (
            <ol className="space-y-0 border-l-2 border-[#f05a28]/40 ml-2">
              {profile.activity.map((item) => (
                <li key={item.id} className="relative pl-6 pb-6 last:pb-0">
                  <span
                    className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#f05a28] ring-4 ring-white"
                    aria-hidden
                  />
                  <div className="text-xs font-bold text-slate-500">{formatActivityWhen(item.at)}</div>
                  <div className="font-bold text-[#062744] mt-0.5">{item.title}</div>
                  <div className="text-sm text-slate-600 mt-1">{item.detail}</div>
                  <div className="mt-1">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.kind === 'report_card'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {item.kind === 'report_card' ? 'Report card' : 'Camp week'}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/coach/players"
            className="inline-flex items-center font-bold text-[#062744] hover:text-[#f05a28] text-sm"
          >
            ← Back to directory
          </Link>
        </div>
      </div>
    </div>
  )
}

function trimDisplay(s: string | null) {
  return (s ?? '').trim()
}

function digitsOnly(phone: string | null) {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}
