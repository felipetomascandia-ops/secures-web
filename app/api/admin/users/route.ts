import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

async function getCurrentUserId(request: Request): Promise<string | null> {
  if (!SUPABASE_URL || !ANON_KEY) return null
  const cookieHeader = request.headers.get('cookie') || ''
  const sb = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { Cookie: cookieHeader } },
  })
  const { data } = await sb.auth.getUser()
  return data.user?.id ?? null
}

async function isAdmin(request: Request): Promise<boolean> {
  const currentUserId = await getCurrentUserId(request)
  if (!currentUserId || !SUPABASE_URL || !SERVICE_ROLE_KEY) return false
  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data, error } = await adminClient
    .from('admins')
    .select('id')
    .eq('user_id', currentUserId)
    .maybeSingle()
  if (error) {
    console.error('admin/users: admin check failed', error)
    return false
  }
  return Boolean(data)
}

export async function GET(request: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, message: 'Missing server Supabase credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 500 }
      )
    }

    const admin = await isAdmin(request)
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: adminsData } = await adminClient.from('admins').select('user_id')
    const adminIds = new Set<string>((adminsData || []).map((r) => (r as unknown as { user_id: string }).user_id))

    const { data: profiles } = await adminClient.from('user_profiles').select('*')
    const profileMap = new Map<string, unknown>()
    for (const p of (profiles || []) as unknown as Record<string, unknown>[]) {
      if (p.user_id) profileMap.set(String(p.user_id), p)
    }

    const { data: contracts } = await adminClient.from('contracts').select('user_id')
    const contractCountMap = new Map<string, number>()
    for (const c of (contracts || []) as unknown as { user_id: string | null }[]) {
      if (c.user_id) {
        contractCountMap.set(c.user_id, (contractCountMap.get(c.user_id) || 0) + 1)
      }
    }

    const { data: tickets } = await adminClient.from('tickets').select('user_id')
    const ticketCountMap = new Map<string, number>()
    for (const t of (tickets || []) as unknown as { user_id: string | null }[]) {
      if (t.user_id) {
        ticketCountMap.set(t.user_id, (ticketCountMap.get(t.user_id) || 0) + 1)
      }
    }

    const allUsers: AuthUser[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const listResult = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
      if (listResult.error) {
        console.error('admin/users: listUsers error', listResult.error)
        hasMore = false
        break
      }
      const pageUsers = listResult.data?.users
      if (!pageUsers || pageUsers.length === 0) {
        hasMore = false
        break
      }
      const list = pageUsers as unknown as SupabaseAuthUser[]
      for (const user of list) {
        const profile = (profileMap.get(user.id) || {}) as Record<string, unknown>
        const metadata = (user.user_metadata || {}) as Record<string, unknown>

        const firstName =
          (typeof metadata.first_name === 'string' ? metadata.first_name : null) ||
          (typeof profile.first_name === 'string' ? profile.first_name : null) ||
          null
        const lastName =
          (typeof metadata.last_name === 'string' ? metadata.last_name : null) ||
          (typeof profile.last_name === 'string' ? profile.last_name : null) ||
          null
        const fullName =
          (typeof metadata.full_name === 'string' ? metadata.full_name : null) ||
          (typeof profile.full_name === 'string' ? profile.full_name : null) ||
          null

        allUsers.push({
          id: user.id,
          email: user.email ?? null,
          phone: user.phone ?? null,
          created_at: user.created_at ?? new Date().toISOString(),
          last_sign_in_at: user.last_sign_in_at ?? null,
          email_confirmed_at: user.email_confirmed_at ?? null,
          phone_confirmed_at: user.phone_confirmed_at ?? null,
          role: user.role ?? null,
          is_admin:
            adminIds.has(user.id) ||
            user.role === 'service_role' ||
            user.role === 'supabase_admin',
          is_sso_user: user.is_sso_user ?? false,
          banned_until: user.banned_until ?? null,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          business_name: typeof profile.business_name === 'string' ? profile.business_name : null,
          address: typeof profile.address === 'string' ? profile.address : null,
          profile_created_at:
            typeof profile.created_at === 'string' ? profile.created_at : null,
          contract_count: contractCountMap.get(user.id) || 0,
          ticket_count: ticketCountMap.get(user.id) || 0,
        })
      }

      if (list.length < 1000) {
        hasMore = false
      } else {
        page++
      }
    }

    return NextResponse.json({ success: true, users: allUsers })
  } catch (err) {
    console.error('admin/users: GET error', err)
    return NextResponse.json(
      { success: false, message: 'Unable to load users.' },
      { status: 500 }
    )
  }
}
