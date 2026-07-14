import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const paymentId = url.searchParams.get('paymentId')
    const checkoutId =
      url.searchParams.get('checkoutId') ||
      url.searchParams.get('checkout_id') ||
      url.searchParams.get('payment_link_id') ||
      url.searchParams.get('transactionId') ||
      url.searchParams.get('transaction_id') ||
      url.searchParams.get('orderId') ||
      url.searchParams.get('order_id') ||
      null

    if (!paymentId && !checkoutId) {
      return NextResponse.json({ success: false, message: 'paymentId or checkoutId is required' }, { status: 400 })
    }

    if (paymentId) {
      const { data, error } = await supabaseAdmin.from('payments').select('*').eq('id', paymentId).single()
      if (error || !data) {
        return NextResponse.json({ success: false, message: 'Payment not found', error }, { status: 404 })
      }
      return NextResponse.json({ success: true, payment: data })
    }

    const search = checkoutId as string
    const paymentQuery = await supabaseAdmin
      .from('payments')
      .select('*')
      .or(`square_checkout_id.eq.${search},checkout_id.eq.${search}`)
      .single<Record<string, unknown>>()

    if (!paymentQuery.error && paymentQuery.data) {
      return NextResponse.json({ success: true, payment: paymentQuery.data })
    }

    const scheduleQuery = await supabaseAdmin
      .from('payment_schedules')
      .select('*')
      .eq('checkout_id', search)
      .single<Record<string, unknown>>()

    if (!scheduleQuery.error && scheduleQuery.data) {
      const schedule = scheduleQuery.data as Record<string, unknown>
      return NextResponse.json({
        success: true,
        payment: {
          id: schedule.id as string,
          square_checkout_id: schedule.checkout_id as string | null,
          square_url: schedule.checkout_url as string | null,
          amount: Number(schedule.amount) || 0,
          currency: 'USD',
          status: (schedule.status as string) || 'pending',
          customer: 'Scheduled payment',
          email: '',
          phone: null,
          description: null,
          contract_id: schedule.contract_id as string | null,
          created_by: null,
          expires_at: schedule.due_date as string | null,
          created_at: (schedule.created_at as string) || '',
        },
      })
    }

    const squarePaymentQuery = await supabaseAdmin
      .from('square_payments')
      .select('*')
      .or(`square_checkout_id.eq.${search},square_payment_id.eq.${search}`)
      .single<Record<string, unknown>>()

    if (!squarePaymentQuery.error && squarePaymentQuery.data) {
      const squarePayment = squarePaymentQuery.data
      return NextResponse.json({
        success: true,
        payment: {
          id: squarePayment.id as string,
          square_checkout_id: squarePayment.square_checkout_id as string | null,
          square_url: null,
          amount: Number(squarePayment.amount) || 0,
          currency: (squarePayment.currency as string) || 'USD',
          status: (squarePayment.status as string) || 'unknown',
          customer: 'Square payment',
          email: '',
          phone: null,
          description: null,
          contract_id: null,
          created_by: null,
          expires_at: null,
          created_at: (squarePayment.created_at as string) || '',
        },
      })
    }

    return NextResponse.json({ success: false, message: 'Payment not found' }, { status: 404 })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, message: String(err) || 'Internal error' }, { status: 500 })
  }
}
