import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'
import { completePaymentAndActivate } from '@/lib/services/PaymentCompletionService'

export const runtime = 'nodejs'

/**
 * Check Square directly for payments completed via a payment link.
 * 
 * For Payment Links created via checkout.paymentLinks, Square assigns
 * completed payments that reference the payment_link_id. This function
 * searches Square's payments API for payments matching our link ID.
 */
async function checkSquarePaymentStatus(payment: Record<string, unknown>): Promise<string | null> {
  try {
    const squareToken = process.env.SQUARE_TOKEN || process.env.SQUARE_ACCESS_TOKEN
    if (!squareToken) return null

    const squareEnv = process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENV || 'production'
    const baseUrl = squareEnv === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    let paymentLinkId = payment.square_checkout_id as string | null | undefined

    // Fallback: extract from URL
    if (!paymentLinkId && payment.square_url) {
      const match = (payment.square_url as string).match(/\/pay\/([a-zA-Z0-9_-]+)/)
      if (match) paymentLinkId = match[1]
    }

    if (!paymentLinkId) {
      console.warn('checkSquarePaymentStatus: no paymentLinkId found')
      return null
    }

    // Search Square payments by source type "card" to find payments
    // associated with this payment link. We use the listPayments endpoint.
    const searchRes = await fetch(`${baseUrl}/v2/payments`, {
      method: 'GET',
      headers: { 
        Authorization: `Bearer ${squareToken}`,
        'Content-Type': 'application/json'
      },
    })
    if (!searchRes.ok) {
      console.warn('Square payments list fetch failed', searchRes.status)
      return null
    }
    const searchJson = await searchRes.json() as Record<string, unknown>
    const paymentsList = searchJson['payments'] as Record<string, unknown>[] | undefined

    if (!paymentsList || paymentsList.length === 0) {
      console.warn('checkSquarePaymentStatus: no payments found in Square')
      return null
    }

    // Find the payment that matches our payment_link_id
    const matchingPayment = paymentsList.find((p: Record<string, unknown>) => {
      const linkIds: string[] = []
      // Check various places Square puts the link ID
      const refs = p['reference_id'] as string | undefined
      const linkId = p['payment_link_id'] as string | undefined
      const note = p['note'] as string | undefined
      
      if (linkId) linkIds.push(linkId)
      if (refs) linkIds.push(refs)
      // Also check if note contains our link ID (for some Square configurations)
      if (note && note.includes(paymentLinkId)) return true
      
      return linkIds.some(id => id === paymentLinkId)
    })

    if (!matchingPayment) {
      // Try searching via the checkout reference stored in our DB
      // Sometimes Square stores it in the note or reference
      console.warn('checkSquarePaymentStatus: no matching Square payment found for', paymentLinkId)
      return null
    }

    const sqStatus = matchingPayment['status'] as string | undefined
    console.log('Square payment status check', { 
      paymentLinkId, 
      squarePaymentId: matchingPayment['id'],
      status: sqStatus 
    })

    if (sqStatus === 'COMPLETED') return 'completed'
    if (sqStatus === 'FAILED' || sqStatus === 'CANCELED' || sqStatus === 'CANCELLED') return 'failed'
    
    // Still pending/processing
    return null
  } catch (err) {
    console.error('checkSquarePaymentStatus error', err)
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
      if (payment.status === 'pending') {
        const squareStatus = await checkSquarePaymentStatus(payment)
        if (squareStatus) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin as any).from('payments').update({ status: squareStatus }).eq('id', paymentId)
          
          // If completed, activate contract and send certificates
          if (squareStatus === 'completed') {
            const updatedPayment = { ...payment, status: 'completed' }
            await completePaymentAndActivate(updatedPayment)
          }
          
          return NextResponse.json({ success: true, payment: { ...payment, status: squareStatus } })
        }
      }

      // If already completed in DB but contract not activated yet, activate it now
      if (payment.status === 'completed') {
        await completePaymentAndActivate(payment)
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
