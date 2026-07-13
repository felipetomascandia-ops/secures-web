'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import AdminShell from '@/components/admin/AdminShell'

type AnalyticsSummary = {
  totalCustomers: number
  activePolicyCustomers: number
  totalContracts: number
  totalRevenue: number
  monthlyRevenue: number
  pendingPayments: number
  upcomingDueDates: number
}

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalCustomers: 0,
    activePolicyCustomers: 0,
    totalContracts: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    upcomingDueDates: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)

      const [{ data: profiles }, { data: contracts }, { data: schedules }] = await Promise.all([
        supabaseAdmin.from('user_profiles').select('id, user_id, created_at'),
        supabaseAdmin.from('contracts').select('id, user_id, total_premium, status, policy_status, created_at'),
        supabaseAdmin.from('payment_schedules').select('id, contract_id, amount, status, due_date')
      ])

      const profileRows = (profiles || []) as Array<{ id: string; user_id: string | null; created_at: string }>
      const contractRows = (contracts || []) as Array<{ id: string; user_id: string | null; total_premium: number | null; status: string | null; policy_status: string | null; created_at: string | null }>
      const scheduleRows = (schedules || []) as Array<{ id: string; contract_id: string | null; amount: number | null; status: string | null; due_date: string | null }>

      const activePolicyCustomers = contractRows.filter((contract) => contract.policy_status === 'active' || contract.status === 'active' || contract.status === 'approved' || contract.status === 'signed').length
      const totalRevenue = contractRows.reduce((sum: number, contract) => sum + Number(contract.total_premium || 0), 0)
      const monthlyRevenue = contractRows.filter((contract) => {
        const createdAt = contract.created_at ? new Date(contract.created_at) : null
        if (!createdAt) return false
        const now = new Date()
        return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
      }).reduce((sum: number, contract) => sum + Number(contract.total_premium || 0), 0)
      const pendingPayments = scheduleRows.filter((schedule) => schedule.status === 'pending').reduce((sum: number, schedule) => sum + Number(schedule.amount || 0), 0)
      const upcomingDueDates = scheduleRows.filter((schedule) => schedule.status === 'pending' && schedule.due_date).length

      setSummary({
        totalCustomers: profileRows.length,
        activePolicyCustomers,
        totalContracts: contractRows.length,
        totalRevenue,
        monthlyRevenue,
        pendingPayments,
        upcomingDueDates,
      })
      setLoading(false)
    }

    loadAnalytics()
  }, [])

  const cards = useMemo(() => [
    { label: 'Total customers', value: summary.totalCustomers },
    { label: 'Customers with active policies', value: summary.activePolicyCustomers },
    { label: 'Total contracts', value: summary.totalContracts },
    { label: 'Total revenue', value: `$${summary.totalRevenue.toFixed(2)}` },
    { label: 'Monthly revenue', value: `$${summary.monthlyRevenue.toFixed(2)}` },
    { label: 'Pending payments', value: `$${summary.pendingPayments.toFixed(2)}` },
    { label: 'Upcoming due dates', value: summary.upcomingDueDates },
  ], [summary])

  return (
    <AdminShell>
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Analytics</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Real insurance operations metrics</h2>
        <p className="mt-3 text-sm text-slate-400">These KPIs are derived from the current Supabase data for customers, contracts and payment schedules.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{loading ? '—' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white">Data source</h3>
        <p className="mt-2 text-sm text-slate-400">The admin analytics view is using the existing tables: user_profiles, contracts and payment_schedules.</p>
      </div>
    </div>
    </AdminShell>
  )
}
