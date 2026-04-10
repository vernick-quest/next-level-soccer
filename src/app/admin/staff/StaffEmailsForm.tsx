'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  addStaffAdminEmailAction,
  removeStaffAdminEmailAction,
  type StaffAdminEmailRow,
} from './actions'

export default function StaffEmailsForm({ initialRows }: { initialRows: StaffAdminEmailRow[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function add() {
    setMessage(null)
    setErr(null)
    startTransition(async () => {
      const r = await addStaffAdminEmailAction(email)
      if ('error' in r) {
        setErr(r.error)
        return
      }
      setEmail('')
      setMessage('Added. They must sign in with Google using that address.')
      router.refresh()
    })
  }

  function remove(addr: string) {
    setMessage(null)
    setErr(null)
    startTransition(async () => {
      const r = await removeStaffAdminEmailAction(addr)
      if ('error' in r) {
        setErr(r.error)
        return
      }
      setMessage('Removed.')
      router.refresh()
    })
  }

  return (
    <div className="max-w-lg">
      <p className="text-slate-600 text-sm mb-6">
        Listed emails can open <strong className="text-[#062744]">Admin</strong> and <strong className="text-[#062744]">Coach&apos;s Portal</strong> after signing in with{' '}
        <strong className="text-[#062744]">Google</strong> using the same address.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-8">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="coach@example.com"
          className="flex-1 border border-[#e8d8ce] rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-[#f05a28] focus:border-transparent"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => void add()}
          className="bg-[#062744] hover:bg-[#041f36] disabled:opacity-60 text-white font-bold py-3 px-6 rounded-full text-sm transition-colors shrink-0"
        >
          Add admin
        </button>
      </div>

      {err && <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-800">{err}</div>}
      {message && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-green-50 border border-green-200 text-green-800">{message}</div>
      )}

      <h2 className="text-sm font-semibold text-[#213c57] mb-3">Delegated admins</h2>
      {initialRows.length === 0 ? (
        <p className="text-slate-500 text-sm">No extra admins yet — only the owner account has access.</p>
      ) : (
        <ul className="space-y-2">
          {initialRows.map((row) => (
            <li
              key={row.email}
              className="flex items-center justify-between gap-3 bg-white border border-[#e8d8ce] rounded-xl px-4 py-3 text-sm"
            >
              <span className="text-slate-800 break-all">{row.email}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => void remove(row.email)}
                className="text-red-700 hover:text-red-900 font-semibold shrink-0 text-xs uppercase tracking-wide"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
