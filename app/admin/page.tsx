import Link from 'next/link'
import { ArrowUpRight, BarChart3, CreditCard, FileText, Ticket as TicketIcon, Users } from 'lucide-react'
import AdminShell from '@/components/admin/AdminShell'

const quickAccess = [
  { href: '/admin/tickets', title: 'Tickets', description: 'Support requests and conversations', icon: TicketIcon, accent: 'from-violet-500/20 to-violet-500/5' },
  { href: '/admin/contracts', title: 'Contracts', description: 'Create and manage client agreements', icon: FileText, accent: 'from-sky-500/20 to-sky-500/5' },
  { href: '/admin/payments', title: 'Payments', description: 'Review payment links and statuses', icon: CreditCard, accent: 'from-emerald-500/20 to-emerald-500/5' },
  { href: '/admin/customers', title: 'Customers', description: 'Client records and account access', icon: Users, accent: 'from-amber-500/20 to-amber-500/5' },
  { href: '/admin/analytics', title: 'Analytics', description: 'Operational reporting and trends', icon: BarChart3, accent: 'from-fuchsia-500/20 to-fuchsia-500/5' },
]

const stats = [
  { label: 'Total revenue', value: '$24,500', detail: '+12% vs last month' },
  { label: 'Pending payments', value: '18', detail: '3 require attention' },
  { label: 'Active contracts', value: '42', detail: '7 due this week' },
  { label: 'Open tickets', value: '9', detail: '2 high priority' },
]

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
      <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/70 p-8 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-300">Admin Panel</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Centralized operations for your team.</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">
              Use this workspace to manage tickets, contracts, payments and customer activity from one professional interface.
            </p>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
            <p className="font-medium">Current modules</p>
            <p className="mt-1">Tickets, Contracts, Payments</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">{label}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-2xl font-semibold text-white">{value}</p>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-2 text-sm text-slate-500">{detail}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Quick access</h3>
            <p className="text-sm text-slate-400">Jump directly into the existing admin modules.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickAccess.map(({ href, title, description, icon: Icon, accent }) => (
            <Link key={href} href={href} className="group rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg transition hover:-translate-y-1 hover:border-violet-500/30 hover:bg-slate-800/80">
              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${accent} p-3 text-slate-200`}>
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-white">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              <div className="mt-4 inline-flex items-center text-sm font-medium text-violet-300">
                Open section
                <ArrowUpRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </AdminShell>
  )
}
