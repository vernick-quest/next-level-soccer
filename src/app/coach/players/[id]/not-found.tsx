import Link from 'next/link'

export default function CoachPlayerNotFound() {
  return (
    <div className="min-h-screen bg-[#f7f2e8] py-16 px-4 text-center">
      <div className="max-w-md mx-auto bg-white border border-[#e8d8ce] rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold text-[#062744] mb-2">Player not found</h1>
        <p className="text-slate-600 text-sm mb-6">That ID is not in the directory, or it was removed.</p>
        <Link href="/coach/players" className="inline-block font-bold text-[#f05a28] hover:underline">
          ← Back to player directory
        </Link>
      </div>
    </div>
  )
}
