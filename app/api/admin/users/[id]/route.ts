import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type PaymentRow = Database['public']['Tables']['payments']['Row']

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
    console.error('admin/users/[id]: admin check failed', error)
    return false
  }
  return Boolean(data)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, message: 'Missing server Supabase credentials.' },
        { status: 500 }
      )
    }

    const admin = await isAdmin(_request)
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)

    type ContractRowForUser = Database['public']['Tables']['contracts']['Row']

    const { data: tickets } = await adminClient
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const { data: contractsRaw } = await adminClient
      .from('contracts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    const contracts: ContractRowForUser[] = (contractsRaw as ContractRowForUser[]) || []

    const contractIds = contracts
      .map((c) => c.id)
      .filter((id): id is string => Boolean(id))

    let payments: PaymentRow[] = []
    if (contractIds.length > 0) {
      const { data: paymentsData } = await adminClient
        .from('payments')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false })
      payments = (paymentsData as PaymentRow[]) || []
    }

    if (payments.length === 0) {
      const { data: directPayments } = await adminClient
        .from('payments')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
      payments = [...payments, ...((directPayments as PaymentRow[]) || [])]
    }

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      contracts: contracts || [],
      payments,
    })
  } catch (err) {
    console.error('admin/users/[id]: GET error', err)
    return NextResponse.json(
      { success: false, message: 'Unable to load user details.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, message: 'Missing server Supabase credentials.' },
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

    const currentUserId = await getCurrentUserId(request)
    const { id: targetUserId } = await params

    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own admin account.' },
        { status: 400 }
      )
    }

    const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (authError) {
      console.error('admin/users/[id]: DELETE auth error', authError)
      return NextResponse.json(
        { success: false, message: `Failed to delete auth user: ${authError.message}` },
        { status: 500 }
      )
    }

    await Promise.all([
      adminClient.from('user_profiles').delete().eq('user_id', targetUserId),
      adminClient.from('tickets').delete().eq('user_id', targetUserId),
      adminClient.from('admins').delete().eq('user_id', targetUserId),
    ]).catch((e) => console.error('admin/users/[id]: related cleanup error', e))

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully.',
    })
  } catch (err) {
    console.error('admin/users/[id]: DELETE error', err)
    return NextResponse.json(
      { success: false, message: 'Unable to delete user.' },
      { status: 500 }
    )
  }
}
