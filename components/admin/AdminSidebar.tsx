'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Ticket,
  Users,
} from 'lucide-react'

const navigation = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/contracts', label: 'Contracts', icon: FileText },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-72 flex-col border-r border-slate-800 bg-slate-950/80 lg:flex">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
          Admin Panel
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Operations Center</h2>
        <p className="mt-2 text-sm text-slate-400">Manage tickets, contracts, payments, customers and reporting in one place.</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {navigation.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? 'bg-violet-500/15 text-violet-300 shadow-sm ring-1 ring-violet-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 px-6 py-5 text-sm text-slate-500">
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20">
          View Website
        </Link>
        <p className="mt-3 font-medium text-slate-400">Protected area</p>
        <p className="mt-1">Only administrator accounts can access these routes.</p>
      </div>
    </aside>
  )
}
