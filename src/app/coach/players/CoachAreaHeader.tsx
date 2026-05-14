import Link from 'next/link'

export type CoachAreaNav = 'directory' | 'manual' | 'profile'

const navLinkBase =
  'text-sm font-bold px-4 py-2.5 rounded-full transition-colors border-2 text-center inline-flex items-center justify-center'
const navInactive = `${navLinkBase} border-[#062744] text-[#062744] hover:bg-[#062744] hover:text-white`
const navActive = `${navLinkBase} border-[#062744] bg-[#062744] text-white hover:bg-[#041f36]`

export function CoachAreaHeader({
  title,
  subtitle,
  nav,
  profileCrumbLabel,
}: {
  title: string
  subtitle?: string
  nav: CoachAreaNav
  /** Last breadcrumb when `nav` is `profile` (player name). */
  profileCrumbLabel?: string
}) {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#f05a28] uppercase tracking-widest">
        <Link href="/coaches" className="hover:underline">
          Coach portal
        </Link>
        {nav === 'directory' ? (
          <>
            <span className="text-slate-400">/</span>
            <span className="text-slate-700">Player directory</span>
          </>
        ) : null}
        {nav === 'manual' ? (
          <>
            <span className="text-slate-400">/</span>
            <span className="text-slate-700">Manual registration</span>
          </>
        ) : null}
        {nav === 'profile' ? (
          <>
            <span className="text-slate-400">/</span>
            <Link href="/coach/players" className="text-slate-600 hover:underline normal-case tracking-normal">
              Player directory
            </Link>
            {profileCrumbLabel ? (
              <>
                <span className="text-slate-400">/</span>
                <span className="text-slate-700 normal-case tracking-normal font-bold">{profileCrumbLabel}</span>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#062744]">{title}</h1>
          {subtitle ? <p className="text-slate-600 text-sm mt-1 max-w-2xl">{subtitle}</p> : null}
        </div>
        <nav className="flex flex-wrap gap-2 shrink-0" aria-label="Coach player tools">
          <Link href="/coach/players" className={nav === 'directory' ? navActive : navInactive}>
            Player directory
          </Link>
          <Link href="/coach/players/new" className={nav === 'manual' ? navActive : navInactive}>
            Manual registration
          </Link>
        </nav>
      </div>
    </div>
  )
}
