/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'
import { completePaymentAndActivate } from '@/lib/services/PaymentCompletionService'
import { WebhooksHelper } from 'square'

export const runtime = 'nodejs'

const db = supabaseAdmin as unknown as any

const NOTIFICATION_URL = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.olimpocoveragegroup.com'}/api/square/webhook`

/** Find the internal payment record that matches this Square event. */
async function findPaymentBySquareId(squareLinkId: string): Promise<{ type: 'payment' | 'schedule' | 'square_payment', data: Record<string, unknown> } | null> {
  // First check payments table (for personal insurance payments)
  const { data: byId } = await db
    .from('payments')
    .select('*')
    .eq('square_checkout_id', squareLinkId)
    .maybeSingle()
  if (byId) return { type: 'payment', data: byId }

  const { data: byUrl } = await db
    .from('payments')
    .select('*')
    .ilike('square_url', `%${squareLinkId}%`)
    .maybeSingle()
  if (byUrl) return { type: 'payment', data: byUrl }

  // Check payment_schedules table (for admin-created contracts down payments/monthly)
  const { data: schedule } = await db
    .from('payment_schedules')
    .select('*')
    .eq('checkout_id', squareLinkId)
    .maybeSingle()
  if (schedule) return { type: 'schedule', data: schedule }

  // Check square_payments table (just in case)
  const { data: squarePayment } = await db
    .from('square_payments')
    .select('*, payment_schedules!inner(*)')
    .eq('square_checkout_id', squareLinkId)
    .maybeSingle()
  if (squarePayment) return { type: 'square_payment', data: squarePayment }

  return null
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const signatureHeader =
      req.headers.get('x-square-hmacsha256-signature') ||
      req.headers.get('X-Square-HMACSHA256-Signature')
    const raw = await req.text()

    const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY

    // Verify signature using Square's official WebhooksHelper
    // IMPORTANT: Square's signature includes the notificationUrl in the hash,
    // so we MUST use the SDK's verifySignature method.
    if (secret) {
      if (!signatureHeader) {
        console.warn('Webhook missing signature header')
        return NextResponse.json({ success: false, message: 'missing signature' }, { status: 401 })
      }

      try {
        const isValid = await WebhooksHelper.verifySignature({
          requestBody: raw,
          signatureHeader: signatureHeader,
          signatureKey: secret,
          notificationUrl: NOTIFICATION_URL,
        })
        if (!isValid) {
          console.warn('Webhook: Square signature verification FAILED', { notificationUrl: NOTIFICATION_URL })
          return NextResponse.json({ success: false, message: 'invalid signature' }, { status: 403 })
        }
        console.info('Webhook: Square signature verified OK')
      } catch (verifyErr) {
        console.error('Webhook: Square signature verification threw error', verifyErr)
        return NextResponse.json({ success: false, message: 'signature verification error' }, { status: 403 })
      }
    } else {
      console.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not set — processing webhook without signature validation')
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(raw) as Record<string, unknown>
    } catch {
      console.warn('Webhook: invalid JSON payload')
      return NextResponse.json({ success: false, message: 'invalid payload' }, { status: 400 })
    }

    const eventType =
      (payload['type'] as string) ||
      (payload['event_type'] as string) ||
      ((payload['data'] as Record<string, unknown>)?.['type'] as string) ||
      null

    console.log('Square webhook received:', { eventType, payload: JSON.stringify(payload).slice(0, 500) })

    const allowed = new Set([
      'payment.created',
      'payment.updated',
      'order.created',
      'order.updated',
    ])
    if (!eventType || !allowed.has(eventType)) {
      return NextResponse.json({ success: true, ignored: true })
    }

    // Extract the relevant fields from various Square event shapes
    const data = payload['data'] as Record<string, unknown> | null
    const object = data?.['object'] as Record<string, unknown> | null

    const paymentObj =
      (object?.['payment'] as Record<string, unknown> | undefined) ??
      (object?.['order'] as Record<string, unknown> | undefined) ??
      null

    const rawStatus =
      (paymentObj?.['status'] as string) ??
      (object?.['status'] as string) ??
      null

    // payment_link_id is set on payment objects created through a payment link
    const squareLinkId =
      (paymentObj?.['payment_link_id'] as string | undefined) ??
      (paymentObj?.['checkout_id'] as string | undefined) ??
      (paymentObj?.['checkoutId'] as string | undefined) ??
      null

    const squarePaymentId = paymentObj?.['id'] as string | undefined

    console.info('Square webhook parsed', { eventType, squareLinkId, squarePaymentId, rawStatus })

    if (!squareLinkId || !rawStatus) {
      return NextResponse.json({ success: true, skipped: true, reason: 'no linkId or status' })
    }

    const normalizedStatus = rawStatus.toUpperCase()
    let newStatus: string | null = null
    if (normalizedStatus === 'COMPLETED') newStatus = 'completed'
    else if (['CANCELED', 'CANCELLED', 'FAILED'].includes(normalizedStatus)) newStatus = 'failed'

    if (!newStatus) {
      return NextResponse.json({ success: true, skipped: true, reason: 'status not actionable' })
    }

    // Find the internal payment record
    const paymentResult = await findPaymentBySquareId(squareLinkId)

    if (!paymentResult) {
      console.warn('Webhook: no payment found for squareLinkId', squareLinkId)
      // Still acknowledge to Square
      return NextResponse.json({ success: true, notFound: true })
    }

    let paymentToActivate: Record<string, unknown> | null = null

    if (paymentResult.type === 'payment') {
      // Handle regular payments table
      const paymentRecord = paymentResult.data
      // Update payment status to 'completed' (for consistency) even if it was 'complete'
      const { error: updateError } = await db
        .from('payments')
        .update({
          status: newStatus,
          square_checkout_id: squareLinkId, // ensure it's stored for future lookups
        })
        .eq('id', paymentRecord.id)

      if (updateError) {
        console.error('Webhook: DB update error (payments table)', updateError)
      } else {
        console.info('Webhook: payment status updated', {
          paymentId: paymentRecord.id,
          newStatus,
          squareLinkId,
        })
      }

      // Post-payment actions when completed or complete
      if (newStatus === 'completed' || paymentRecord.status === 'complete') {
        paymentToActivate = newStatus === 'completed' ? { ...paymentRecord, status: newStatus } : paymentRecord
      }
    } else if (paymentResult.type === 'schedule') {
      // Handle payment_schedules
      const schedule = paymentResult.data
      // Update schedule status
      const { error: updateError } = await db
        .from('payment_schedules')
        .update({
          status: newStatus === 'completed' ? 'completed' : schedule.status,
          paid_at: new Date().toISOString(),
        })
        .eq('id', schedule.id)

      if (updateError) {
        console.error('Webhook: DB update error (payment_schedules table)', updateError)
      } else {
        console.info('Webhook: payment schedule status updated', {
          scheduleId: schedule.id,
          newStatus,
          squareLinkId,
        })
      }

      // Activate if it's the down payment (sequence 0) and status is completed
      if ((newStatus === 'completed') && (schedule.sequence === 0) && schedule.contract_id) {
        // Create a fake payment object for completePaymentAndActivate
        paymentToActivate = {
          id: schedule.id as string,
          contract_id: schedule.contract_id as string,
          status: newStatus,
        }
      }
    } else if (paymentResult.type === 'square_payment') {
      // Handle square_payments
      const squarePayment = paymentResult.data
      // Update square_payments status
      const { error: updateError } = await db
        .from('square_payments')
        .update({
          status: newStatus === 'completed' ? 'payment_completed' : squarePayment.status,
          square_payment_id: squarePaymentId,
        })
        .eq('id', squarePayment.id)

      if (updateError) {
        console.error('Webhook: DB update error (square_payments table)', updateError)
      }

      // Get associated payment schedule
      const { data: schedule } = await db.from('payment_schedules').select('*').eq('id', squarePayment.schedule_id).maybeSingle()
      if (schedule && (newStatus === 'completed') && (schedule.sequence === 0) && schedule.contract_id) {
        // Update payment_schedule too
        await db.from('payment_schedules').update({
          status: 'completed',
          paid_at: new Date().toISOString(),
        }).eq('id', schedule.id)
        
        paymentToActivate = {
          id: squarePayment.id as string,
          contract_id: schedule.contract_id as string,
          status: newStatus,
        }
      }
    }

    if (paymentToActivate) {
      await completePaymentAndActivate(paymentToActivate)
    }

    return NextResponse.json({
      success: true,
      processed: true,
      eventType,
      newStatus,
      paymentId: paymentRecord.id,
    })
  } catch (err: unknown) {
    console.error('square webhook error', err)
    return NextResponse.json({ success: false, message: String(err) || 'internal' }, { status: 500 })
  }
}
