'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Filter, ArrowUpDown, Mail, Phone, Calendar, Shield, CheckCircle, XCircle, Clock, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import AdminShell from '@/components/admin/AdminShell'
import type { Database } from '@/types/supabase'

type ContractRow = Database['public']['Tables']['contracts']['Row']
type TicketRow = Database['public']['Tables']['tickets']['Row']
type PaymentRow = Database['public']['Tables']['payments']['Row']

type AuthUser = {
  id: string
  email: string | null
  phone: string | null
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  phone_confirmed_at: string | null
  role: string | null
  is_admin: boolean
  is_sso_user: boolean
  banned_until: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  business_name: string | null
  address: string | null
  profile_created_at: string | null
  contract_count: number
  ticket_count: number
}

type FilterKey = 'all' | 'confirmed' | 'unconfirmed' | 'admins' | 'active' | 'banned'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'email' | 'last_sign_in_at'>('created_at')
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [userTickets, setUserTickets] = useState<TicketRow[]>([])
  const [userContracts, setUserContracts] = useState<ContractRow[]>([])
  const [userPayments, setUserPayments] = useState<PaymentRow[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [markingPaymentId, setMarkingPaymentId] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const res = await fetch('/api/admin/users', { method: 'GET', cache: 'no-store' })
        const json = await res.json().catch(() => null) as { success?: boolean; users?: AuthUser[]; message?: string } | null

        if (!res.ok || !json || !json.success || !Array.isArray(json.users)) {
          throw new Error(json?.message || `Failed to load users (HTTP ${res.status})`)
        }

        setUsers(json.users)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error loading users'
        console.error('Error loading users:', err)
        setLoadError(msg)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const loadUserDetails = async (user: AuthUser) => {
    setLoadingDetails(true)
    setSelectedUser(user)

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'GET', cache: 'no-store' })
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; tickets?: TicketRow[]; contracts?: ContractRow[]; payments?: PaymentRow[]; message?: string }
        | null

      if (!res.ok || !json || !json.success) {
        throw new Error(json?.message || `Failed to load details (HTTP ${res.status})`)
      }

      setUserTickets(Array.isArray(json.tickets) ? json.tickets : [])
      setUserContracts(Array.isArray(json.contracts) ? json.contracts : [])
      setUserPayments(Array.isArray(json.payments) ? json.payments : [])
    } catch (error) {
      console.error('Error loading user details:', error)
      setUserTickets([])
      setUserContracts([])
      setUserPayments([])
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
        method: 'DELETE',
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; message?: string }
        | null
      if (!res.ok || !json || !json.success) {
        throw new Error(json?.message || `Failed to delete user (HTTP ${res.status})`)
      }
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id))
      setConfirmDeleteOpen(false)
      setSelectedUser(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error deleting user'
      console.error('Error deleting user:', err)
      alert(msg)
    } finally {
      setDeleting(false)
    }
  }

  const markUserPaymentAsPaid = async (paymentId: string) => {
    if (!window.confirm('Mark this payment as PAID? This will activate the contract and send certificate emails if applicable.')) return
    setMarkingPaymentId(paymentId)
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(paymentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ status: 'paid' }),
      })
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; message?: string; payment?: PaymentRow }
        | null
      if (!res.ok || !json?.success) {
        alert(json?.message || `Failed to mark payment as paid (HTTP ${res.status})`)
        return
      }
      setUserPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: 'paid' } : p))
      )
      setUserContracts((prev) =>
        prev.map((c) => {
          const updated = json?.payment
          if (updated && updated.contract_id && c.id === updated.contract_id) {
            return { ...c, status: 'active', policy_status: 'active' } as ContractRow
          }
          return c
        })
      )
    } catch (err) {
      console.error(err)
      alert('Unexpected error marking payment as paid.')
    } finally {
      setMarkingPaymentId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const searchTerm = search.toLowerCase()

    return users
      .filter((user) => {
        const matchesSearch =
          !searchTerm ||
          (user.email || '').toLowerCase().includes(searchTerm) ||
          (user.full_name || '').toLowerCase().includes(searchTerm) ||
          (user.first_name || '').toLowerCase().includes(searchTerm) ||
          (user.last_name || '').toLowerCase().includes(searchTerm) ||
          (user.business_name || '').toLowerCase().includes(searchTerm)

        if (!matchesSearch) return false

        switch (filter) {
          case 'confirmed':
            return !!user.email_confirmed_at
          case 'unconfirmed':
            return !user.email_confirmed_at
          case 'admins':
            return user.is_admin
          case 'active':
            return !!user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
          case 'banned':
            return !!user.banned_until
          default:
            return true
        }
      })
      .sort((a, b) => {
        if (sortBy === 'email') {
          return (a.email || '').localeCompare(b.email || '')
        }
        if (sortBy === 'last_sign_in_at') {
          return new Date(b.last_sign_in_at || 0).getTime() - new Date(a.last_sign_in_at || 0).getTime()
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [users, filter, search, sortBy])

  const totalUsers = users.length
  const confirmedUsers = users.filter((u) => u.email_confirmed_at).length
  const adminUsers = users.filter((u) => u.is_admin).length
  const activeUsers = users.filter(
    (u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
  ).length

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Users</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Website users and authentication data</h2>
          <p className="mt-3 text-sm text-slate-400">
            Review all registered users on the platform, their account status, verification details, and activity.
          </p>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 text-red-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-red-300">Failed to load users</h3>
                <p className="mt-1 text-xs text-red-400/90 whitespace-pre-wrap break-words">{loadError}</p>
                <button
                  onClick={() => {
                    setLoadError(null)
                    setLoading(true)
                    // Force a reload of the effect via refresh
                    window.location.reload()
                  }}
                  className="mt-3 inline-flex items-center rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total users</p>
                <p className="mt-1 text-2xl font-semibold text-white">{totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Verified</p>
                <p className="mt-1 text-2xl font-semibold text-white">{confirmedUsers}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/15 p-2.5 text-violet-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Active (30d)</p>
                <p className="mt-1 text-2xl font-semibold text-white">{activeUsers}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Administrators</p>
                <p className="mt-1 text-2xl font-semibold text-white">{adminUsers}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by email, name, or business..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2.5 pl-9 pr-3 text-sm text-white outline-none ring-0"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                <Filter className="h-4 w-4" />
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as FilterKey)}
                  className="bg-transparent outline-none"
                >
                  <option value="all">All users</option>
                  <option value="confirmed">Email verified</option>
                  <option value="unconfirmed">Unverified email</option>
                  <option value="admins">Administrators</option>
                  <option value="active">Active (last 30 days)</option>
                  <option value="banned">Banned users</option>
                </select>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                <ArrowUpDown className="h-4 w-4" />
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as 'created_at' | 'email' | 'last_sign_in_at')
                  }
                  className="bg-transparent outline-none"
                >
                  <option value="created_at">Newest registered</option>
                  <option value="email">Email (A-Z)</option>
                  <option value="last_sign_in_at">Recent login</option>
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
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium">Stats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No users match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-800/60 cursor-pointer"
                      onClick={() => loadUserDetails(user)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-sm font-semibold text-white">
                            {(
                              (user.full_name || user.first_name || user.email || '?')
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white">
                                {user.full_name || user.first_name + ' ' + (user.last_name || '') || 'Unnamed user'}
                              </span>
                              {user.is_admin && (
                                <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400">
                                  Admin
                                </span>
                              )}
                              {user.banned_until && (
                                <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-red-400">
                                  Banned
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{user.email || 'No email'}</span>
                            </div>
                            {user.phone && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            {user.business_name && (
                              <div className="mt-1 text-xs text-slate-500">
                                🏢 {user.business_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {user.email_confirmed_at ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <CheckCircle className="h-3 w-3" />
                              Email verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/40 bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-slate-400">
                              <XCircle className="h-3 w-3" />
                              Email not verified
                            </span>
                          )}
                          {user.phone_confirmed_at && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              <Phone className="h-3 w-3" />
                              Phone verified
                            </span>
                          )}
                          {user.is_sso_user && (
                            <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400">
                              SSO
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Registered {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {user.role && (
                          <div className="mt-1 text-xs text-slate-500">
                            Auth role: <span className="font-mono text-slate-400">{user.role}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          {user.last_sign_in_at ? (
                            <>
                              <div className="text-slate-300">
                                Last login
                              </div>
                              <div className="mt-0.5 font-medium text-white">
                                {new Date(user.last_sign_in_at).toLocaleDateString()}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {new Date(user.last_sign_in_at).toLocaleTimeString()}
                              </div>
                            </>
                          ) : (
                            <div className="text-slate-500">Never logged in</div>
                          )}
                        </div>
                        {user.banned_until && (
                          <div className="mt-2 text-xs text-red-400">
                            Banned until: {new Date(user.banned_until).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Contracts:</span>
                            <span className="font-semibold text-white">{user.contract_count}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-slate-400">Tickets:</span>
                            <span className="font-semibold text-white">{user.ticket_count}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xl font-semibold text-white">
                    {(
                      (selectedUser.full_name || selectedUser.first_name || selectedUser.email || '?')
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {selectedUser.full_name ||
                        selectedUser.first_name + ' ' + (selectedUser.last_name || '') ||
                        'Unnamed user'}
                    </h3>
                    <p className="text-sm text-slate-400">{selectedUser.email || 'No email'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {selectedUser.is_admin && (
                        <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400">
                          Administrator
                        </span>
                      )}
                      {selectedUser.email_confirmed_at && (
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
                          Email verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedUser.is_admin && (
                    <button
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 inline-flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete user
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
                        Contact information
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-slate-400">Email</p>
                          <p className="text-white">{selectedUser.email || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Phone</p>
                          <p className="text-white">{selectedUser.phone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Business name</p>
                          <p className="text-white">{selectedUser.business_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Address</p>
                          <p className="text-white">{selectedUser.address || '—'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
                        Account details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-slate-400">User ID</p>
                          <p className="font-mono text-xs text-white break-all">{selectedUser.id}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Auth role</p>
                          <p className="text-white">{selectedUser.role || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Registered at</p>
                          <p className="text-white">
                            {new Date(selectedUser.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Last login</p>
                          <p className="text-white">
                            {selectedUser.last_sign_in_at
                              ? new Date(selectedUser.last_sign_in_at).toLocaleString()
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Email verified at</p>
                          <p className="text-white">
                            {selectedUser.email_confirmed_at
                              ? new Date(selectedUser.email_confirmed_at).toLocaleString()
                              : 'Not verified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Contracts ({userContracts.length})
                      </h4>
                      {userContracts.length > 0 && (
                        <div className="flex gap-3 text-xs">
                          <span className="text-slate-500">
                            Total premium: <span className="text-white font-semibold">
                              ${userContracts.reduce((sum, c) => sum + (c.total_premium || 0), 0).toFixed(2)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    {userContracts.length === 0 ? (
                      <p className="text-sm text-slate-500">No contracts for this user.</p>
                    ) : (
                      <div className="space-y-2">
                        {userContracts.map((contract: ContractRow) => {
                          const status = (contract.policy_status || contract.status || 'draft').toLowerCase()
                          const statusStyles: Record<string, string> = {
                            active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                            expired: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
                            cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
                            canceled: 'bg-red-500/15 text-red-400 border-red-500/30',
                            draft: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
                          }
                          const badgeStyle = statusStyles[status] || 'bg-slate-700/60 text-slate-300 border-slate-600/40'
                          return (
                            <div
                              key={contract.id}
                              className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-white">
                                      #{contract.contract_number || contract.id.slice(0, 8)}
                                    </p>
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeStyle}`}>
                                      {status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {contract.insurance_type || 'Insurance'}
                                    {contract.down_payment != null && contract.monthly_payment != null
                                      ? ` • Down $${contract.down_payment.toFixed(2)} / $${contract.monthly_payment.toFixed(2)} x ${contract.number_of_payments || '?'}`
                                      : ''}
                                  </p>
                                </div>
                                <div className="text-right flex-none">
                                  <p className="font-semibold text-white">
                                    ${contract.total_premium?.toFixed(2) || '—'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(contract.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Payments ({userPayments.length})
                      </h4>
                      {userPayments.length > 0 && (
                        <div className="flex gap-4 text-xs">
                          <span className="text-emerald-400">
                            Paid: ${userPayments
                              .filter((p) => (p.status || '').toLowerCase() === 'paid' || (p.status || '').toLowerCase() === 'completed')
                              .reduce((sum, p) => sum + (p.amount || 0), 0)
                              .toFixed(2)}
                          </span>
                          <span className="text-slate-500">
                            Total: ${userPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    {userPayments.length === 0 ? (
                      <p className="text-sm text-slate-500">No payments recorded for this user.</p>
                    ) : (
                      <div className="space-y-2">
                        {userPayments.map((payment: PaymentRow) => {
                          const pStatus = (payment.status || 'unknown').toLowerCase()
                          const payStyles: Record<string, string> = {
                            paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            succeeded: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                            pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                            open: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                            expired: 'bg-slate-700/60 text-slate-300 border-slate-600/40',
                            canceled: 'bg-red-500/15 text-red-400 border-red-500/30',
                            cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
                            failed: 'bg-red-500/15 text-red-400 border-red-500/30',
                            refunded: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
                          }
                          const payBadge = payStyles[pStatus] || 'bg-slate-700/60 text-slate-300 border-slate-600/40'
                          let paymentTitle: string
                          if (typeof payment.label === 'string' && payment.label.length > 0) {
                            paymentTitle = payment.label
                          } else if (typeof payment.description === 'string' && payment.description.length > 0) {
                            paymentTitle = payment.description
                          } else if (payment.sequence != null) {
                            paymentTitle = `Payment #${payment.sequence}`
                          } else {
                            paymentTitle = 'Payment'
                          }
                          return (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-white truncate">
                                    {paymentTitle}
                                  </p>
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${payBadge}`}>
                                    {pStatus}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                  {payment.customer || payment.email || '—'}
                                  {payment.due_date ? ` • Due ${new Date(payment.due_date).toLocaleDateString()}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-none">
                                {!['paid', 'completed', 'succeeded'].includes(pStatus) && (
                                  <button
                                    onClick={() => markUserPaymentAsPaid(payment.id)}
                                    disabled={markingPaymentId === payment.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-600/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {markingPaymentId === payment.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    <span>{markingPaymentId === payment.id ? 'Marking...' : 'Mark Paid'}</span>
                                  </button>
                                )}
                                <div className="text-right">
                                  <p className="font-semibold text-white">
                                    ${(payment.amount || 0).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(payment.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Support Tickets ({userTickets.length})
                      </h4>
                    </div>
                    {userTickets.length === 0 ? (
                      <p className="text-sm text-slate-500">No support tickets for this user.</p>
                    ) : (
                      <div className="space-y-2">
                        {userTickets.map((ticket: TicketRow) => (
                          <div
                            key={ticket.id}
                            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{ticket.title}</p>
                              <p className="text-xs text-slate-500">
                                Priority: <span className="capitalize">{ticket.priority}</span>
                              </p>
                            </div>
                            <div className="text-right flex-none ml-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                  ticket.status === 'closed'
                                    ? 'bg-slate-700/60 text-slate-300'
                                    : ticket.status === 'in_progress'
                                    ? 'bg-sky-500/15 text-sky-400'
                                    : ticket.status === 'open'
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-slate-700/60 text-slate-300'
                                }`}
                              >
                                <span className="capitalize">{ticket.status}</span>
                              </span>
                              <p className="mt-1 text-xs text-slate-500">
                                {new Date(ticket.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {confirmDeleteOpen && selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-red-500/15 p-3 text-red-400 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-white">Delete this user?</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    You are about to permanently delete{' '}
                    <span className="font-semibold text-white">
                      {selectedUser.full_name || selectedUser.email || 'this user'}</span>. This action cannot be undone and will remove their account, profile, and tickets from the auth system.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  disabled={deleting}
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={deleting}
                  onClick={handleDeleteUser}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {deleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  )}
                  {deleting ? 'Deleting...' : 'Yes, delete user'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
