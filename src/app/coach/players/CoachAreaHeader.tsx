import Link from 'next/link'

export function CoachAreaHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#f05a28] uppercase tracking-widest mb-1">
          <Link href="/coaches" className="hover:underline">
            Coach portal
          </Link>
          <span className="text-slate-400">/</span>
          <span>Player directory</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#062744]">{title}</h1>
        {subtitle ? <p className="text-slate-600 text-sm mt-1 max-w-2xl">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <Link
          href="/coaches"
          className="text-sm font-bold bg-[#062744] text-white px-4 py-2.5 rounded-full hover:bg-[#041f36] transition-colors"
        >
          Operations hub
        </Link>
      </div>
    </div>
  )
}
