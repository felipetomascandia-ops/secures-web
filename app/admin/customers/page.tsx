'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Filter, ArrowUpDown } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import AdminShell from '@/components/admin/AdminShell'

type CustomerRow = {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  created_at: string
  has_policy: boolean
  contract_count: number
  contract_status: string | null
  last_contract_date: string | null
  total_contracted: number
  total_paid: number
  total_pending: number
  next_due_date: string | null
}

type ProfileRow = {
  id: string
  user_id: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

type ContractRow = {
  id: string
  user_id: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  contract_number: string | null
  total_premium: number | null
  created_at: string | null
  status: string | null
  policy_status: string | null
}

type ScheduleRow = {
  id: string
  contract_id: string | null
  amount: number | null
  status: string | null
  due_date: string | null
}

type CertificateRow = {
  id: string
  contract_id: string | null
  coverage_id: string | null
  certificate_type: string | null
  certificate_url: string | null
  created_at: string | null
}

type CoverageRow = {
  id: string
  contract_id: string | null
  insurance_type: string | null
  policy_number: string | null
  effective_date: string | null
  expiration_date: string | null
  created_at: string | null
}

type FilterKey = 'all' | 'with_policy' | 'without_policy' | 'pending_payments' | 'active' | 'inactive'

type AuthUserSummary = {
  email: string | null
  created_at: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'name' | 'total_pending'>('created_at')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)
  const [customerContracts, setCustomerContracts] = useState<ContractRow[]>([])
  const [customerCertificates, setCustomerCertificates] = useState<CertificateRow[]>([])
  const [customerCoverages, setCustomerCoverages] = useState<CoverageRow[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true)

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, user_id, first_name, last_name, full_name, email, phone, created_at')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('profiles error', profilesError)
        setCustomers([])
        setLoading(false)
        return
      }

      const authUsersById = new Map<string, AuthUserSummary>()
      try {
        const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const authUsers = authUsersData?.users || []

        authUsers.forEach((user) => {
          const metadata = (user.user_metadata || {}) as Record<string, unknown>
          authUsersById.set(user.id, {
            email: user.email ?? null,
            created_at: user.created_at ?? null,
            first_name: typeof metadata.first_name === 'string' ? metadata.first_name : null,
            last_name: typeof metadata.last_name === 'string' ? metadata.last_name : null,
            phone: typeof metadata.phone === 'string' ? metadata.phone : null,
          })
        })
      } catch (authError) {
        console.warn('auth user lookup unavailable', authError)
      }

      const { data: contracts, error: contractsError } = await supabaseAdmin
        .from('contracts')
        .select('id, user_id, contract_number, client_name, client_email, client_phone, total_premium, created_at, status, policy_status, first_due_date')

      if (contractsError) {
        console.error('contracts error', contractsError)
      }

      const { data: schedules, error: schedulesError } = await supabaseAdmin
        .from('payment_schedules')
        .select('id, contract_id, amount, status, due_date')

      if (schedulesError) {
        console.error('schedules error', schedulesError)
      }

      const contractMap = new Map<string, ContractRow[]>()
      const contractRows = (contracts || []) as ContractRow[]
      contractRows.forEach((contract) => {
        const keys = [contract.user_id, contract.client_email, contract.client_name?.toLowerCase()].filter(Boolean) as string[]
        keys.forEach((key) => {
          const existing = contractMap.get(key) || []
          existing.push(contract)
          contractMap.set(key, existing)
        })
      })

      const rows: CustomerRow[] = (profiles || []).map((profile: ProfileRow) => {
        const authUser = profile.user_id ? authUsersById.get(profile.user_id) : undefined
        const profileContracts = profile.user_id ? contractMap.get(profile.user_id) || [] : []
        const emailContracts = (profile.email || authUser?.email) ? contractMap.get(profile.email || authUser?.email || '') || [] : []
        const customerContracts = profileContracts.length > 0 ? profileContracts : emailContracts
        const activeContracts = customerContracts.filter((contract) => contract.policy_status === 'active' || contract.status === 'active' || contract.status === 'signed' || contract.status === 'approved')
        const scheduleRows = (schedules || []) as ScheduleRow[]
        const pendingSchedules = scheduleRows.filter((schedule) => {
          const belongs = customerContracts.some((contract) => contract.id === schedule.contract_id)
          return belongs && schedule.status === 'pending'
        })
        const paidSchedules = scheduleRows.filter((schedule) => {
          const belongs = customerContracts.some((contract) => contract.id === schedule.contract_id)
          return belongs && schedule.status === 'paid'
        })
        const lastContract = customerContracts.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]
        const fullName = profile.full_name || [profile.first_name || authUser?.first_name || '', profile.last_name || authUser?.last_name || ''].filter(Boolean).join(' ').trim() || 'Unnamed customer'
        const profileEmail = profile.email || authUser?.email || null

        return {
          id: profile.id,
          user_id: profile.user_id,
          name: fullName,
          email: profileEmail,
          phone: profile.phone || authUser?.phone || null,
          created_at: profile.created_at,
          has_policy: customerContracts.length > 0,
          contract_count: customerContracts.length,
          contract_status: activeContracts.length > 0 ? 'Active' : customerContracts.length > 0 ? 'Pending' : 'No policy',
          last_contract_date: lastContract?.created_at || null,
          total_contracted: customerContracts.reduce((sum: number, contract) => sum + Number(contract.total_premium || 0), 0),
          total_paid: paidSchedules.reduce((sum: number, schedule) => sum + Number((schedule as ScheduleRow).amount || 0), 0),
          total_pending: pendingSchedules.reduce((sum: number, schedule) => sum + Number((schedule as ScheduleRow).amount || 0), 0),
          next_due_date: pendingSchedules.length > 0 ? ((pendingSchedules[0] as ScheduleRow).due_date || null) : null,
        }
      })

      setCustomers(rows)
      setLoading(false)
    }

    loadCustomers()
  }, [])

  const loadCustomerDetails = async (customer: CustomerRow) => {
    setLoadingDetails(true)
    setSelectedCustomer(customer)

    try {
      // Load contracts for this customer
      const { data: contracts } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .or(`user_id.eq.${customer.user_id},client_email.eq.${customer.email}`)
        .order('created_at', { ascending: false }) as { data: ContractRow[] | null }

      setCustomerContracts(contracts || [])

      // Load certificates for this customer
      const contractIds = (contracts || []).map(c => c.id)
      if (contractIds.length > 0) {
        const { data: certificates } = await supabaseAdmin
          .from('certificates')
          .select('*')
          .in('contract_id', contractIds)
          .order('created_at', { ascending: false }) as { data: CertificateRow[] | null }

        setCustomerCertificates(certificates || [])

        // Load coverages for this customer
        const { data: coverages } = await supabaseAdmin
          .from('coverages')
          .select('*')
          .in('contract_id', contractIds)
          .order('created_at', { ascending: false }) as { data: CoverageRow[] | null }

        setCustomerCoverages(coverages || [])
      } else {
        setCustomerCertificates([])
        setCustomerCoverages([])
      }
    } catch (error) {
      console.error('Error loading customer details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    const searchTerm = search.toLowerCase()

    return customers
      .filter((customer) => {
        const matchesSearch = !searchTerm || customer.name.toLowerCase().includes(searchTerm) || (customer.email || '').toLowerCase().includes(searchTerm)
        if (!matchesSearch) return false

        switch (filter) {
          case 'with_policy':
            return customer.has_policy
          case 'without_policy':
            return !customer.has_policy
          case 'pending_payments':
            return customer.total_pending > 0
          case 'active':
            return customer.contract_status === 'Active'
          case 'inactive':
            return customer.contract_status !== 'Active' && customer.has_policy
          default:
            return true
        }
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name)
        }
        if (sortBy === 'total_pending') {
          return b.total_pending - a.total_pending
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [customers, filter, search, sortBy])

  return (
    <AdminShell>
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Customers</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Registered clients and policy activity</h2>
        <p className="mt-3 text-sm text-slate-400">Review clients, their policies, payment status and upcoming renewals from the existing Supabase data.</p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm text-white outline-none ring-0"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
              <Filter className="h-4 w-4" />
              <select value={filter} onChange={(event) => setFilter(event.target.value as FilterKey)} className="bg-transparent outline-none">
                <option value="all">All customers</option>
                <option value="with_policy">With policy</option>
                <option value="without_policy">Without policy</option>
                <option value="pending_payments">With pending payments</option>
                <option value="active">Active policy</option>
                <option value="inactive">Inactive policy</option>
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
              <ArrowUpDown className="h-4 w-4" />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'created_at' | 'name' | 'total_pending')} className="bg-transparent outline-none">
                <option value="created_at">Newest</option>
                <option value="name">Name</option>
                <option value="total_pending">Pending balance</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/70 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Policy</th>
                <th className="px-4 py-3 font-medium">Financials</th>
                <th className="px-4 py-3 font-medium">Next due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No customers match the selected filters.</td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-slate-800/60 cursor-pointer"
                  onClick={() => loadCustomerDetails(customer)}
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold text-white">{customer.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{customer.email || 'No email available'}</div>
                    <div className="mt-1 text-xs text-slate-500">{customer.phone || 'No phone available'}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-600">Registered {new Date(customer.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {customer.has_policy ? 'Has policy' : 'No policy'}
                    </div>
                    <div className="mt-2 text-sm">Contracts: {customer.contract_count}</div>
                    <div className="mt-1 text-sm text-slate-400">Status: {customer.contract_status}</div>
                    <div className="mt-1 text-xs text-slate-500">Last contract: {customer.last_contract_date ? new Date(customer.last_contract_date).toLocaleDateString() : '—'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">Total contracted: <span className="font-semibold text-white">${customer.total_contracted.toFixed(2)}</span></div>
                    <div className="mt-1 text-sm text-emerald-400">Paid: ${customer.total_paid.toFixed(2)}</div>
                    <div className="mt-1 text-sm text-amber-400">Pending: ${customer.total_pending.toFixed(2)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-slate-300">{customer.next_due_date ? new Date(customer.next_due_date).toLocaleDateString() : 'No pending due dates'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">{selectedCustomer.name}</h3>
                <p className="text-sm text-slate-400">{selectedCustomer.email || 'No email'}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div>
                {/* Contracts Section */}
                <h4 className="text-lg font-semibold text-white mb-4">Contracts ({customerContracts.length})</h4>
                {customerContracts.length === 0 ? (
                  <p className="text-slate-500">No contracts found for this customer.</p>
                ) : (
                  <div className="space-y-3">
                    {customerContracts.map((contract) => (
                      <div key={contract.id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-white">Contract #{contract.contract_number || 'N/A'}</p>
                            <p className="text-sm text-slate-400">Client: {contract.client_name || 'N/A'}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                              contract.status === 'active' || contract.policy_status === 'active'
                                ? 'bg-green-500/20 text-green-400'
                                : contract.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {contract.status || contract.policy_status || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">Created:</p>
                            <p className="text-white">{contract.created_at ? new Date(contract.created_at).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Total Premium:</p>
                            <p className="text-white">${contract.total_premium?.toFixed(2) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Email:</p>
                            <p className="text-white">{contract.client_email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Phone:</p>
                            <p className="text-white">{contract.client_phone || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <a
                            href={`/api/contracts/${contract.id}/document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            View Contract Document
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </AdminShell>
  )
}
