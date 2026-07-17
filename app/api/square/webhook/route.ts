/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'
import { completePaymentAndActivate } from '@/lib/services/PaymentCompletionService'
import { WebhooksHelper } from 'square'

export const runtime = 'nodejs'

const db = supabaseAdmin as unknown as any

const NOTIFICATION_URL = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.olimpocoveragegroup.com'}/api/square/webhook`

/** Find the internal payment record that matches this Square event. */
async function findPaymentBySquareId(squareLinkId: string): Promise<Record<string, unknown> | null> {
  const { data: byId } = await db
    .from('payments')
    .select('*')
    .eq('square_checkout_id', squareLinkId)
    .maybeSingle()
  if (byId) return byId

  const { data: byUrl } = await db
    .from('payments')
    .select('*')
    .ilike('square_url', `%${squareLinkId}%`)
    .maybeSingle()
  if (byUrl) return byUrl

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
    const paymentRecord = await findPaymentBySquareId(squareLinkId)

    if (!paymentRecord) {
      console.warn('Webhook: no payment found for squareLinkId', squareLinkId)
      // Still acknowledge to Square
      return NextResponse.json({ success: true, notFound: true })
    }

    // Update payment status
    const { error: updateError } = await db
      .from('payments')
      .update({
        status: newStatus,
        square_checkout_id: squareLinkId, // ensure it's stored for future lookups
      })
      .eq('id', paymentRecord.id)

    if (updateError) {
      console.error('Webhook: DB update error', updateError)
    } else {
      console.info('Webhook: payment status updated', {
        paymentId: paymentRecord.id,
        newStatus,
        squareLinkId,
      })
    }

    // Post-payment actions when completed
    if (newStatus === 'completed') {
      await completePaymentAndActivate(paymentRecord)
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
