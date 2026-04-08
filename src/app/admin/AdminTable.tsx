'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { campWeekSortIndex } from '@/lib/camp-weeks'
import { markSubmissionConfirmed, sendWelcomeEmail, type AdminRow } from './actions'

type SortKey = 'week' | 'parent' | 'child' | 'status' | 'created'

function compareRows(a: AdminRow, b: AdminRow, key: SortKey, asc: boolean): number {
  const dir = asc ? 1 : -1
  switch (key) {
    case 'week': {
      const w = campWeekSortIndex(a.campWeek) - campWeekSortIndex(b.campWeek)
      return w * dir
    }
    case 'parent': {
      const s =
        `${a.parentLastName} ${a.parentFirstName}`.localeCompare(`${b.parentLastName} ${b.parentFirstName}`)
      return s * dir
    }
    case 'child': {
      const s =
        `${a.childLastName} ${a.childFirstName}`.localeCompare(`${b.childLastName} ${b.childFirstName}`)
      return s * dir
    }
    case 'status': {
      return a.status.localeCompare(b.status) * dir
    }
    case 'created': {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
    }
    default:
      return 0
  }
}

function SortButton({
  label,
  active,
  asc,
  onClick,
}: {
  label: string
  active: boolean
  asc: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-semibold text-left hover:text-[#f05a28] ${
        active ? 'text-[#062744]' : 'text-[#213c57]'
      }`}
    >
      {label}
      {active && <span className="text-xs text-slate-500">{asc ? '↑' : '↓'}</span>}
    </button>
  )
}

export default function AdminTable({
  initialRows,
  showStaffLink,
}: {
  initialRows: AdminRow[]
  showStaffLink?: boolean
}) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('week')
  const [asc, setAsc] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sorted = useMemo(() => {
    const copy = [...initialRows]
    copy.sort((a, b) => compareRows(a, b, sortKey, asc))
    return copy
  }, [initialRows, sortKey, asc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setAsc((v) => !v)
    } else {
      setSortKey(key)
      setAsc(true)
    }
  }

  function runPaid(submissionId: string) {
    setMessage(null)
    startTransition(async () => {
      const r = await markSubmissionConfirmed(submissionId)
      if (!r.success) {
        setMessage(r.error)
        return
      }
      router.refresh()
    })
  }

  function runEmail(submissionId: string) {
    setMessage(null)
    startTransition(async () => {
      const r = await sendWelcomeEmail(submissionId)
      if (!r.success) {
        setMessage(r.error)
        return
      }
      setMessage('Welcome email sent.')
    })
  }

  const totalDollars = (cents: number | null) =>
    cents == null ? '—' : `$${(cents / 100).toFixed(2)}`

  return (
    <div className="space-y-4">
      {showStaffLink && (
        <div className="flex justify-end">
          <Link
            href="/admin/staff"
            className="text-sm font-semibold text-[#f05a28] hover:text-[#d94e21] hover:underline"
          >
            Manage staff admins
          </Link>
        </div>
      )}
      {message && (
        <div className="rounded-xl px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-900">{message}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#e8d8ce] bg-white shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[#f7f2e8] text-[#213c57] border-b border-[#e8d8ce]">
            <tr>
              <th className="px-3 py-3 whitespace-nowrap">
                <SortButton
                  label="Camp week"
                  active={sortKey === 'week'}
                  asc={asc}
                  onClick={() => toggleSort('week')}
                />
              </th>
              <th className="px-3 py-3 whitespace-nowrap">
                <SortButton
                  label="Parent"
                  active={sortKey === 'parent'}
                  asc={asc}
                  onClick={() => toggleSort('parent')}
                />
              </th>
              <th className="px-3 py-3 whitespace-nowrap">Parent email</th>
              <th className="px-3 py-3 whitespace-nowrap">
                <SortButton
                  label="Player"
                  active={sortKey === 'child'}
                  asc={asc}
                  onClick={() => toggleSort('child')}
                />
              </th>
              <th className="px-3 py-3 whitespace-nowrap">
                <SortButton
                  label="Status"
                  active={sortKey === 'status'}
                  asc={asc}
                  onClick={() => toggleSort('status')}
                />
              </th>
              <th className="px-3 py-3 whitespace-nowrap">Total</th>
              <th className="px-3 py-3 whitespace-nowrap">
                <SortButton
                  label="Submitted"
                  active={sortKey === 'created'}
                  asc={asc}
                  onClick={() => toggleSort('created')}
                />
              </th>
              <th className="px-3 py-3 whitespace-nowrap">Mark paid</th>
              <th className="px-3 py-3 whitespace-nowrap">Welcome email</th>
              <th className="px-3 py-3 whitespace-nowrap">Report</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  No registration rows yet.
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const parentName = `${row.parentFirstName} ${row.parentLastName}`.trim()
                const childName = `${row.childFirstName} ${row.childLastName}`.trim()
                const pending = row.status === 'pending'
                const confirmed = row.status === 'confirmed'
                return (
                  <tr key={row.rowKey} className="border-b border-[#f0e2d9] last:border-0 hover:bg-[#fffdfb]">
                    <td className="px-3 py-3 text-slate-800 whitespace-nowrap">{row.campWeek}</td>
                    <td className="px-3 py-3 text-slate-800">{parentName}</td>
                    <td className="px-3 py-3 text-slate-600 break-all max-w-[200px]">{row.parentEmail}</td>
                    <td className="px-3 py-3 text-slate-800">
                      <span className="font-medium">{childName}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          confirmed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{totalDollars(row.totalAmountCents)}</td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={!pending || isPending}
                        onClick={() => runPaid(row.submissionId)}
                        className="text-xs font-semibold text-white bg-[#062744] hover:bg-[#041f36] disabled:bg-slate-300 disabled:cursor-not-allowed px-2 py-1.5 rounded-lg whitespace-nowrap"
                      >
                        Mark as paid
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={!confirmed || isPending}
                        onClick={() => runEmail(row.submissionId)}
                        className="text-xs font-semibold text-white bg-[#f05a28] hover:bg-[#d94e21] disabled:bg-slate-300 disabled:cursor-not-allowed px-2 py-1.5 rounded-lg whitespace-nowrap"
                      >
                        Send confirmation
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/report/${row.childId}`}
                        className="text-xs font-semibold text-[#213c57] hover:text-[#f05a28] underline whitespace-nowrap"
                      >
                        Edit report card
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
