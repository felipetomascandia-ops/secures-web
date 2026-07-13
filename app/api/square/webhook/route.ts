import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const signatureHeader = req.headers.get('x-square-hmacsha256-signature') || req.headers.get('X-Square-HMACSHA256-Signature')
    const raw = await req.text()

    const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    if (!secret) {
      console.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not configured — rejecting webhook')
      return NextResponse.json({ success: false, message: 'webhook not configured' }, { status: 500 })
    }

    if (!signatureHeader) {
      console.warn('Webhook missing signature header')
      return NextResponse.json({ success: false, message: 'missing signature' }, { status: 401 })
    }

    // Compute HMAC-SHA256 and compare (Square sends base64-encoded HMAC)
    const computed = createHmac('sha256', secret).update(raw).digest('base64')
    const signatureBuf = Buffer.from(signatureHeader)
    const computedBuf = Buffer.from(computed)
    if (signatureBuf.length !== computedBuf.length || !timingSafeEqual(signatureBuf, computedBuf)) {
      console.warn('Webhook signature mismatch')
      return NextResponse.json({ success: false, message: 'invalid signature' }, { status: 401 })
    }

    // Parse JSON now that signature is validated
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(raw) as Record<string, unknown>
    } catch (e) {
      console.warn('Webhook: invalid JSON payload')
      return NextResponse.json({ success: false, message: 'invalid payload' }, { status: 400 })
    }

    // Basic event routing — only process allowed events
    const eventType = (payload['type'] as string) || (payload['event_type'] as string) || ((payload['data'] as Record<string, unknown>)?.['type'] as string) || null
    console.log('Square webhook received:', { eventType })

    const allowed = new Set(['payment.created', 'payment.updated', 'order.created', 'order.updated'])
    if (!eventType || !allowed.has(eventType)) {
      // Ignore other events but acknowledge
      return NextResponse.json({ success: true, ignored: true })
    }

    const data = payload['data'] as Record<string, unknown> | null
    const object = data?.['object'] as Record<string, unknown> | null
    const payment = (object?.['payment'] as Record<string, unknown> | undefined) ?? (object?.['order'] as Record<string, unknown> | undefined) ?? null
    const status = (payment?.['status'] as string) ?? (object?.['status'] as string) ?? null
    const paymentId = payment?.['id'] as string | undefined
    const checkoutId = (payment?.['payment_link_id'] as string | undefined) ?? (payment?.['checkout_id'] as string | undefined) ?? (payment?.['checkoutId'] as string | undefined) ?? null

    console.info('Square webhook received', { eventType, paymentId, status, checkoutId })

    let updated = false
    if (checkoutId && status) {
      const normalizedStatus = status.toUpperCase()
      let newStatus: string | null = null
      if (normalizedStatus === 'COMPLETED') newStatus = 'completed'
      else if (normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED' || normalizedStatus === 'FAILED') newStatus = 'failed'
      else if (normalizedStatus === 'PENDING') newStatus = null

      if (newStatus) {
        const db = supabaseAdmin as unknown as { from: (table: string) => { update: (values: Record<string, unknown>) => { eq: (field: string, value: string) => { select: () => Promise<{ data: unknown; error: unknown }> } } } }
        const { data: updateData, error: updateError } = await db
          .from('payments')
          .update({ status: newStatus })
          .eq('square_checkout_id', checkoutId)
          .select()

        if (updateError) {
          console.error('Webhook DB update error', updateError)
        } else {
          updated = Array.isArray(updateData) ? updateData.length > 0 : !!updateData
          console.info('Webhook payment status updated', { checkoutId, newStatus, matched: updated })
        }
      }
    }

    return NextResponse.json({ success: true, processed: true, eventType, paymentId, status, updated })
  } catch (err: unknown) {
    console.error('square webhook error', err)
    return NextResponse.json({ success: false, message: String(err) || 'internal' }, { status: 500 })
  }
}
