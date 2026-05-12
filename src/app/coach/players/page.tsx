import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStaffAdminUser } from '@/lib/admin'
import ChildAvatar from '@/components/ChildAvatar'
import CoachesSignIn from '@/app/coaches/CoachesSignIn'
import CoachesWrongAccount from '@/app/coaches/CoachesWrongAccount'
import { CoachAreaHeader } from './CoachAreaHeader'
import { listPlayerDirectoryForStaff } from './actions'

export const metadata = {
  title: 'Player directory | Coach Portal | Next Level Soccer SF',
  description: 'Browse all registered players in the system.',
}

export default async function CoachPlayerDirectoryPage() {
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

  const { players, error } = await listPlayerDirectoryForStaff()

  if (error === 'fetch') {
    return (
      <div className="min-h-screen bg-[#f7f2e8] py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <CoachAreaHeader title="Player directory" subtitle="Could not load players from the database." />
          <div className="bg-white border border-[#e8d8ce] rounded-2xl p-8 text-center text-slate-700">
            Confirm Supabase is reachable and the service role key is configured for staff tools.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <CoachAreaHeader
          title="Player directory"
          subtitle="Every player on file from family registrations — open a profile for full scouting notes, contacts, and activity."
        />

        {players.length === 0 ? (
          <div className="bg-white border border-[#e8d8ce] rounded-2xl p-10 text-center text-slate-600">
            No players in <code className="text-xs bg-slate-100 px-1 rounded">registration_children</code> yet.
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((p) => {
              const name = `${p.player_first_name} ${p.player_last_name}`.trim()
              return (
                <li key={p.id}>
                  <Link
                    href={`/coach/players/${p.id}`}
                    className="group flex gap-4 bg-white border border-[#e8d8ce] rounded-2xl p-4 shadow-sm hover:border-[#f05a28] hover:shadow-md transition-all h-full"
                  >
                    <ChildAvatar photoUrl={p.child_photo_url} alt={name} sizeClass="w-16 h-16 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-[#062744] text-lg leading-tight group-hover:text-[#f05a28] transition-colors">
                        {name}
                      </div>
                      {p.soccer_club ? (
                        <div className="text-sm text-slate-600 mt-1 truncate">{p.soccer_club}</div>
                      ) : (
                        <div className="text-sm text-slate-400 mt-1 italic">Club not listed</div>
                      )}
                      <div className="text-xs text-slate-500 mt-2">
                        <span className="font-semibold text-[#213c57]">Primary:</span> {p.primary_position_label || '—'}
                        {p.grade_fall ? (
                          <>
                            {' '}
                            · <span className="font-semibold text-[#213c57]">Grade:</span> {p.grade_fall}
                          </>
                        ) : null}
                      </div>
                      <div className="text-xs font-bold text-[#f05a28] mt-3">Open profile →</div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
