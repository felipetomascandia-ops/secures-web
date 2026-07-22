/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'
import { completePaymentAndActivate } from '@/lib/services/PaymentCompletionService'
import { WebhooksHelper } from 'square'

export const runtime = 'nodejs'

const db = supabaseAdmin as unknown as any

const NOTIFICATION_URL = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.olimpocoveragegroup.com'}/api/square/webhook`

/** Find the internal payment record that matches this Square event. */
async function findPaymentBySquareId(squareLinkId: string): Promise<{ type: 'payment' | 'square_payment', data: Record<string, unknown> } | null> {
  console.log('findPaymentBySquareId: Searching for squareLinkId:', squareLinkId)
  
  // First check payments table for all payments!
  const { data: byId } = await db
    .from('payments')
    .select('*')
    .eq('square_checkout_id', squareLinkId)
    .maybeSingle()
  console.log('findPaymentBySquareId: Checked payments table byId:', byId)
  if (byId) return { type: 'payment', data: byId }

  const { data: byUrl } = await db
    .from('payments')
    .select('*')
    .ilike('square_url', `%${squareLinkId}%`)
    .maybeSingle()
  console.log('findPaymentBySquareId: Checked payments table byUrl:', byUrl)
  if (byUrl) return { type: 'payment', data: byUrl }

  // Check square_payments table, then get the associated payment
  const { data: squarePayment } = await db
    .from('square_payments')
    .select('*')
    .eq('square_checkout_id', squareLinkId)
    .maybeSingle()
  console.log('findPaymentBySquareId: Checked square_payments table:', squarePayment)
  
  if (squarePayment) {
    // Now get the payment from square_payments.payment_id
    const { data: associatedPayment } = await db
      .from('payments')
      .select('*')
      .eq('id', squarePayment.payment_id)
      .maybeSingle()
    console.log('findPaymentBySquareId: Found associated payment:', associatedPayment)
    
    // Attach the payment to the squarePayment object
    const squarePaymentWithPayment = { ...squarePayment, payments: associatedPayment }
    return { type: 'square_payment', data: squarePaymentWithPayment }
  }

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
      'checkout.completed',
    ])
    console.log('Webhook: Checking allowed event type:', eventType)
    if (!eventType || !allowed.has(eventType)) {
      console.log('Webhook: Ignoring event type (not allowed):', eventType)
      return NextResponse.json({ success: true, ignored: true })
    }

    // Extract the relevant fields from various Square event shapes
    const data = payload['data'] as Record<string, unknown> | null
    const object = data?.['object'] as Record<string, unknown> | null

    const paymentObj =
      (object?.['payment'] as Record<string, unknown> | undefined) ??
      (object?.['order'] as Record<string, unknown> | undefined) ??
      (object?.['checkout'] as Record<string, unknown> | undefined) ??
      null

    console.log('Webhook: Extracted paymentObj/checkoutObj:', paymentObj)

    const rawStatus =
      (paymentObj?.['status'] as string) ??
      (object?.['status'] as string) ??
      null

    // Extract squareLinkId from all possible places
    const squareLinkId =
      (paymentObj?.['payment_link_id'] as string | undefined) ??
      (paymentObj?.['checkout_id'] as string | undefined) ??
      (paymentObj?.['checkoutId'] as string | undefined) ??
      (object?.['checkout_id'] as string | undefined) ??
      (object?.['id'] as string | undefined) ?? // For checkout.completed events
      null

    console.log('Webhook: Extracted squareLinkId:', squareLinkId)

    const squarePaymentId =
      (paymentObj?.['id'] as string | undefined) ??
      (object?.['payment_id'] as string | undefined) ??
      null

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
      // Update payment status to 'completed' and add paid_at!
      const { error: updateError } = await db
        .from('payments')
        .update({
          status: newStatus,
          square_checkout_id: squareLinkId, // ensure it's stored for future lookups
          paid_at: new Date().toISOString(),
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
    } else if (paymentResult.type === 'square_payment') {
      // Handle square_payments linked to payments table
      const squarePayment = paymentResult.data
      const payment = squarePayment.payments as Record<string, unknown> | null
      
      console.log('Webhook: Processing square_payment:', { squarePayment, payment })
      
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
      } else {
        console.info('Webhook: square_payments status updated')
      }

      // Update associated payment if we have one
      if (payment) {
        const { error: paymentUpdateError } = await db
          .from('payments')
          .update({
            status: newStatus,
            paid_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
        
        if (paymentUpdateError) {
          console.error('Webhook: DB update error (payments from square_payment)', paymentUpdateError)
        } else {
          console.info('Webhook: payment status updated (from square_payment)', { paymentId: payment.id })
        }

        // Activate if it's the down payment (sequence 0) and status is completed
        if ((newStatus === 'completed') && (payment.sequence === 0) && payment.contract_id) {
          paymentToActivate = {
            id: payment.id as string,
            contract_id: payment.contract_id as string,
            status: newStatus,
          }
        }
      }
    }

    if (paymentToActivate) {
      await completePaymentAndActivate(paymentToActivate)
    }

    let paymentId: string | null = null
    if (paymentResult.type === 'payment') {
      paymentId = paymentResult.data.id as string
    } else if (paymentResult.type === 'square_payment') {
      paymentId = paymentResult.data.id as string
    }

    return NextResponse.json({
      success: true,
      processed: true,
      eventType,
      newStatus,
      paymentId,
    })
  } catch (err: unknown) {
    console.error('square webhook error', err)
    return NextResponse.json({ success: false, message: String(err) || 'internal' }, { status: 500 })
  }
}
