import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { completePaymentAndActivate } from '@/lib/services/PaymentCompletionService'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

type PaymentRow = Database['public']['Tables']['payments']['Row']
type PaymentUpdate = Database['public']['Tables']['payments']['Update']

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
    console.error('admin/payments/[id]: admin check failed', error)
    return false
  }
  return Boolean(data)
}

export async function PATCH(
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

    const { id: paymentId } = await params
    const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY)

    type PatchBody = {
      status?: string
      amount?: number
      label?: string
    }

    const body = (await request.json().catch(() => null)) as PatchBody | null
    const newStatus = typeof body?.status === 'string' ? body.status.toLowerCase() : 'paid'

    const validStatuses = ['paid', 'pending', 'expired', 'canceled', 'cancelled', 'completed', 'failed', 'refunded', 'open']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: existingPayment, error: fetchError } = await adminClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle()

    if (fetchError || !existingPayment) {
      return NextResponse.json(
        { success: false, message: 'Payment not found.' },
        { status: 404 }
      )
    }

    const paymentRow = existingPayment as PaymentRow
    const wasPaid = ['paid', 'completed', 'succeeded'].includes((paymentRow.status || '').toLowerCase())
    const nowPaid = ['paid', 'completed', 'succeeded'].includes(newStatus)

    type UpdatePayload = PaymentUpdate
    const updatePayload: UpdatePayload = { status: newStatus }

    if (body && typeof body.amount === 'number') {
      updatePayload.amount = body.amount
    }
    if (body && typeof body.label === 'string') {
      updatePayload.label = body.label
    }

    const { data: updated, error: updateError } = await (adminClient as unknown as {
      from: (table: 'payments') => {
        update: (payload: PaymentUpdate) => {
          eq: (column: string, value: unknown) => {
            select: () => {
              maybeSingle: () => Promise<{ data: PaymentRow | null; error: unknown }>
            }
          }
        }
      }
    }).from('payments').update(updatePayload).eq('id', paymentId).select().maybeSingle()

    if (updateError) {
      console.error('admin/payments/[id]: update error', updateError)
      const errMsg =
        typeof updateError === 'object' &&
        updateError !== null &&
        'message' in updateError &&
        typeof (updateError as { message?: unknown }).message === 'string'
          ? (updateError as { message: string }).message
          : 'Unknown database error'
      return NextResponse.json(
        { success: false, message: `Failed to update payment: ${errMsg}` },
        { status: 500 }
      )
    }

    if (nowPaid && !wasPaid && paymentRow.contract_id) {
      const finalPayment = (updated as PaymentRow | null) || paymentRow
      await completePaymentAndActivate({
        id: finalPayment.id,
        contract_id: finalPayment.contract_id,
        status: newStatus,
      }).catch((e) => console.error('admin/payments/[id]: completePaymentAndActivate error', e))
    }

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully.',
      payment: updated || existingPayment,
    })
  } catch (err) {
    console.error('admin/payments/[id]: PATCH error', err)
    return NextResponse.json(
      { success: false, message: 'Unable to update payment.' },
      { status: 500 }
    )
  }
}
