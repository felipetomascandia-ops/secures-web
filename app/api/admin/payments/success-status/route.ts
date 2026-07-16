import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

// Check Square directly for the order status linked to a payment link
async function checkSquareOrderStatus(squareUrl: string): Promise<string | null> {
  try {
    // Extract the payment link ID from the URL (last path segment)
    const match = squareUrl.match(/\/pay\/([a-zA-Z0-9_-]+)/)
    if (!match) return null
    const paymentLinkId = match[1]

    const squareEnv = process.env.SQUARE_ENVIRONMENT || 'production'
    const squareToken = process.env.SQUARE_ACCESS_TOKEN
    if (!squareToken) return null

    const baseUrl = squareEnv === 'sandbox'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com'

    const res = await fetch(`${baseUrl}/v2/online-checkout/payment-links/${paymentLinkId}`, {
      headers: {
        Authorization: `Bearer ${squareToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    const json = await res.json() as Record<string, unknown>
    const link = (json['payment_link'] as Record<string, unknown> | undefined)
    const orderId = link?.['order_id'] as string | undefined
    if (!orderId) return null

    // Get the order to check its state
    const orderRes = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${squareToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (!orderRes.ok) return null
    const orderJson = await orderRes.json() as Record<string, unknown>
    const order = orderJson['order'] as Record<string, unknown> | undefined
    const state = order?.['state'] as string | undefined
    if (!state) return null

    // COMPLETED = paid, OPEN = not yet paid, CANCELED = canceled
    if (state === 'COMPLETED') return 'completed'
    if (state === 'CANCELED') return 'failed'
    return null
  } catch {
    return null
  }
}

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

      const payment = data as Record<string, unknown>

      // If still pending, try confirming directly with Square
      if (payment.status === 'pending' && payment.square_url) {
        const squareStatus = await checkSquareOrderStatus(payment.square_url as string)
        if (squareStatus) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin as any).from('payments').update({ status: squareStatus }).eq('id', paymentId)
          return NextResponse.json({ success: true, payment: { ...payment, status: squareStatus } })
        }
      }

      return NextResponse.json({ success: true, payment: data })
    }

    const search = checkoutId as string
    const paymentQuery = await supabaseAdmin
      .from('payments')
      .select('*')
      .or(`id.eq.${search},square_checkout_id.eq.${search}`)
      .single<Record<string, unknown>>()

    if (!paymentQuery.error && paymentQuery.data) {
      return NextResponse.json({ success: true, payment: paymentQuery.data })
    }

    if (paymentQuery.error) {
      console.warn('payments lookup error', { search, error: paymentQuery.error })
    }

    const scheduleQuery = await supabaseAdmin
      .from('payment_schedules')
      .select('*')
      .or(`id.eq.${search},checkout_id.eq.${search}`)
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
      .or(`square_checkout_id.eq.${search},square_payment_id.eq.${search},id.eq.${search}`)
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
