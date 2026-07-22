import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'
import { completePaymentAndActivate } from '@/lib/services/PaymentCompletionService'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const paymentId = url.searchParams.get('paymentId')
    const scheduleId = url.searchParams.get('scheduleId')
    const checkoutId =
      url.searchParams.get('checkoutId') ||
      url.searchParams.get('checkout_id') ||
      url.searchParams.get('payment_link_id') ||
      url.searchParams.get('transactionId') ||
      url.searchParams.get('transaction_id') ||
      url.searchParams.get('orderId') ||
      url.searchParams.get('order_id') ||
      null

    if (!paymentId && !checkoutId && !scheduleId) {
      return NextResponse.json({ success: false, message: 'paymentId, scheduleId, or checkoutId is required' }, { status: 400 })
    }

    // Handle scheduleId first if provided
    if (scheduleId) {
      const { data: schedule, error: scheduleError } = await supabaseAdmin
        .from('payment_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single<Record<string, unknown>>()

      if (scheduleError || !schedule) {
        return NextResponse.json({ success: false, message: 'Schedule not found', error: scheduleError }, { status: 404 })
      }

      console.log('Found payment schedule in DB! Schedule status:', schedule.status)

      if (schedule.status === 'pending') {
        console.log('Schedule was pending! Marking as completed and activating...')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin.from('payment_schedules') as any)
          .update({ status: 'completed', paid_at: new Date().toISOString() })
          .eq('id', scheduleId)
      }

      // Always call completePaymentAndActivate for scheduleId (even if already completed)
      const schedulePayment = {
        id: schedule.id as string,
        contract_id: schedule.contract_id as string | null,
        status: 'completed',
      }
      if (schedule.contract_id) {
        await completePaymentAndActivate(schedulePayment)
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.olimpocoveragegroup.com'
      return NextResponse.json({
        success: true,
        payment: {
          id: schedule.id as string,
          square_checkout_id: schedule.checkout_id as string | null,
          square_url: schedule.checkout_url as string | null,
          amount: Number(schedule.amount) || 0,
          currency: 'USD',
          status: 'completed',
          customer: 'Scheduled payment',
          email: '',
          phone: null,
          description: null,
          contract_id: schedule.contract_id as string | null,
          created_by: null,
          expires_at: schedule.due_date as string | null,
          created_at: (schedule.created_at as string) || '',
        },
        redirectToClient: true,
        clientRedirectUrl: `${baseUrl}/personal-insurance/payment-success?scheduleId=${scheduleId}`,
      })
    }

    if (paymentId) {
      const { data, error } = await supabaseAdmin.from('payments').select('*').eq('id', paymentId).single()
      if (error || !data) {
        return NextResponse.json({ success: false, message: 'Payment not found', error }, { status: 404 })
      }

      const payment = data as Record<string, unknown>
      console.log('Found payment in DB! Payment status:', payment.status)

      // If pending OR complete/completed, always execute activation logic!
      // The user arriving at this page means Square redirected them here
      // after a successful payment.
      if (payment.status === 'pending') {
        console.log('Payment was pending! Marking as completed and activating...')
        // Mark payment as completed in our DB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin as any).from('payments').update({ status: 'completed' }).eq('id', paymentId)
        const updatedPayment = { ...payment, status: 'completed' }
        await completePaymentAndActivate(updatedPayment)
        
        // If this is a client payment, tell the frontend to redirect to the client success page
        const isClientPayment = !!(payment.contract_id && !payment.created_by)
        return NextResponse.json({ 
          success: true, 
          payment: { ...payment, status: 'completed' },
          redirectToClient: isClientPayment,
          clientRedirectUrl: isClientPayment ? `/personal-insurance/payment-success?paymentId=${paymentId}` : null,
        })
      }

      // If already complete OR completed but contract not activated yet
      if (payment.status === 'completed' || payment.status === 'complete') {
        console.log('Payment is already', payment.status + '! Activating...')
        // If it's 'complete', update it to 'completed' for consistency
        if (payment.status === 'complete') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseAdmin as any).from('payments').update({ status: 'completed' }).eq('id', paymentId)
          const updatedPayment = { ...payment, status: 'completed' }
          await completePaymentAndActivate(updatedPayment)
        } else {
          await completePaymentAndActivate(payment)
        }
      }

      const isClientPayment = !!(payment.contract_id && !payment.created_by)
      // ONLY redirectToClient if payment is still pending! Otherwise just return payment data!
      if (isClientPayment && (payment.status === 'pending')) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.olimpocoveragegroup.com'
        return NextResponse.json({ 
          success: true, 
          payment: data,
          redirectToClient: true,
          clientRedirectUrl: `${baseUrl}/personal-insurance/payment-success?paymentId=${paymentId}`,
        })
      }
      // If payment is already complete/completed, just return payment data! No redirect!
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
      
      console.log('Found schedule via checkoutId, status:', schedule.status)
      if (schedule.status === 'pending') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin.from('payment_schedules') as any)
          .update({ status: 'completed', paid_at: new Date().toISOString() })
          .eq('id', schedule.id)
      }
      
      if (schedule.contract_id) {
        const schedulePayment = {
          id: schedule.id as string,
          contract_id: schedule.contract_id as string,
          status: 'completed',
        }
        await completePaymentAndActivate(schedulePayment)
      }

      return NextResponse.json({
        success: true,
        payment: {
          id: schedule.id as string,
          square_checkout_id: schedule.checkout_id as string | null,
          square_url: schedule.checkout_url as string | null,
          amount: Number(schedule.amount) || 0,
          currency: 'USD',
          status: 'completed',
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
