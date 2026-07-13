'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search, ArrowLeft, ExternalLink } from 'lucide-react'

type AdminHeaderProps = {
  title: string
  description: string
}

export default function AdminHeader({ title, description }: AdminHeaderProps) {
  const pathname = usePathname()
  const showBackToAdmin = pathname !== '/admin'

  return (
    <header className="flex flex-col gap-4 border-b border-slate-800 bg-slate-950/60 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showBackToAdmin && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin Panel
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
        >
          <ExternalLink className="h-4 w-4" />
          View Website
        </Link>
        <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-400">
          <Search className="h-4 w-4" />
          <input
            className="w-32 bg-transparent outline-none placeholder:text-slate-500 sm:w-48"
            placeholder="Search"
            aria-label="Search"
          />
        </label>
        <button className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
