'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Filter, ArrowUpDown, Mail, Phone, Calendar, Shield, CheckCircle, XCircle, Clock } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import AdminShell from '@/components/admin/AdminShell'
import type { Database } from '@/types/supabase'

type AdminRow = Database['public']['Tables']['admins']['Row']
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
type ContractRow = Database['public']['Tables']['contracts']['Row']
type TicketRow = Database['public']['Tables']['tickets']['Row']

type SupabaseAuthUser = {
  id: string
  email?: string | null
  phone?: string | null
  created_at?: string
  last_sign_in_at?: string | null
  email_confirmed_at?: string | null
  phone_confirmed_at?: string | null
  role?: string | null
  is_sso_user?: boolean
  banned_until?: string | null
  user_metadata?: Record<string, unknown>
}

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
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'email' | 'last_sign_in_at'>('created_at')
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null)
  const [userTickets, setUserTickets] = useState<TicketRow[]>([])
  const [userContracts, setUserContracts] = useState<ContractRow[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)

      try {
        const adminIds = new Set<string>()
        const { data: adminsData, error: adminsError } = await supabaseAdmin
          .from('admins')
          .select('user_id')

        if (!adminsError && adminsData) {
          adminsData.forEach((a: AdminRow) => adminIds.add(a.user_id))
        }

        const profileMap = new Map<string, UserProfileRow>()
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')

        if (!profilesError && profiles) {
          profiles.forEach((p: UserProfileRow) => {
            if (p.user_id) profileMap.set(p.user_id, p)
          })
        }

        const contractCountMap = new Map<string, number>()
        const { data: contracts, error: contractsError } = await supabaseAdmin
          .from('contracts')
          .select('user_id')

        if (!contractsError && contracts) {
          contracts.forEach((c: Pick<ContractRow, 'user_id'>) => {
            if (c.user_id) {
              contractCountMap.set(c.user_id, (contractCountMap.get(c.user_id) || 0) + 1)
            }
          })
        }

        const ticketCountMap = new Map<string, number>()
        const { data: tickets, error: ticketsError } = await supabaseAdmin
          .from('tickets')
          .select('user_id')

        if (!ticketsError && tickets) {
          tickets.forEach((t: Pick<TicketRow, 'user_id'>) => {
            if (t.user_id) {
              ticketCountMap.set(t.user_id, (ticketCountMap.get(t.user_id) || 0) + 1)
            }
          })
        }

        const allUsers: AuthUser[] = []
        let page = 1
        let hasMore = true

        while (hasMore) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 1000,
          })

          if (error || !data) {
            hasMore = false
            break
          }

          const authUsers = data.users || []

          authUsers.forEach((user: SupabaseAuthUser) => {
            const profile = profileMap.get(user.id)
            const metadata = (user.user_metadata || {}) as Record<string, unknown>

            allUsers.push({
              id: user.id,
              email: user.email ?? null,
              phone: user.phone ?? null,
              created_at: user.created_at ?? new Date().toISOString(),
              last_sign_in_at: user.last_sign_in_at ?? null,
              email_confirmed_at: user.email_confirmed_at ?? null,
              phone_confirmed_at: user.phone_confirmed_at ?? null,
              role: user.role ?? null,
              is_admin: adminIds.has(user.id) || user.role === 'service_role' || user.role === 'supabase_admin',
              is_sso_user: user.is_sso_user ?? false,
              banned_until: user.banned_until ?? null,
              first_name:
                (typeof metadata.first_name === 'string' ? metadata.first_name : null) ||
                profile?.first_name ||
                null,
              last_name:
                (typeof metadata.last_name === 'string' ? metadata.last_name : null) ||
                profile?.last_name ||
                null,
              full_name:
                (typeof metadata.full_name === 'string' ? metadata.full_name : null) ||
                profile?.full_name ||
                null,
              business_name: profile?.business_name || null,
              address: profile?.address || null,
              profile_created_at: profile?.created_at || null,
              contract_count: contractCountMap.get(user.id) || 0,
              ticket_count: ticketCountMap.get(user.id) || 0,
            })
          })

          if (authUsers.length < 1000) {
            hasMore = false
          } else {
            page++
          }
        }

        setUsers(allUsers)
      } catch (err) {
        console.error('Error loading users:', err)
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
      const { data: tickets } = await supabaseAdmin
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setUserTickets(tickets || [])

      const { data: contracts } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setUserContracts(contracts || [])
    } catch (error) {
      console.error('Error loading user details:', error)
    } finally {
      setLoadingDetails(false)
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
                <button
                  onClick={() => setSelectedUser(null)}
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
                    </div>
                    {userContracts.length === 0 ? (
                      <p className="text-sm text-slate-500">No contracts for this user.</p>
                    ) : (
                      <div className="space-y-2">
                        {userContracts.map((contract: ContractRow) => (
                          <div
                            key={contract.id}
                            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3"
                          >
                            <div>
                              <p className="font-medium text-white">
                                #{contract.contract_number || contract.id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-slate-400">
                                {contract.insurance_type || 'Insurance'} •{' '}
                                {contract.status || contract.policy_status || 'No status'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-white">
                                ${contract.total_premium?.toFixed(2) || '—'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(contract.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
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
      </div>
    </AdminShell>
  )
}
