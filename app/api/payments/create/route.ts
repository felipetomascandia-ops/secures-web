/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPayment } from '@/lib/square'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { nonce, name, email, phone, amount, currency = 'USD', idempotencyKey: clientIdempotencyKey } = body

    // Validaciones básicas
    if (!nonce) {
      return new Response(JSON.stringify({ success: false, message: 'Pago: token de tarjeta ausente (nonce).' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    const amountNumber = Number(amount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      return new Response(JSON.stringify({ success: false, message: 'Pago: monto inválido.' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }

    const amountCents = Math.round(amountNumber * 100)

    // Idempotency key — use client-provided key if available for safe retries
    const idempotencyKey = clientIdempotencyKey || (typeof randomUUID === 'function' ? randomUUID() : `${Date.now()}-${Math.random()}`)
    console.info('Create payment request', { amountCents, currency, idempotencyKey })

    const createReq = {
      idempotencyKey,
      sourceId: nonce,
      amountMoney: {
        amount: amountCents,
        currency,
      },
      note: `Pago desde web — ${name || 'Cliente desconocido'}`,
      buyerEmailAddress: email || undefined,
    } as any

    // Opcional: adjuntar información de facturación
    if (phone) (createReq as any).billingAddress = { addressLine1: `Tel: ${phone}` }

    const response = await createPayment(createReq)

    const respRec = response as Record<string, unknown>
    const result = (respRec['result'] as Record<string, unknown> | undefined) ?? respRec
    const payment = (result['payment'] as Record<string, unknown> | undefined) ?? (respRec['payment'] as Record<string, unknown> | undefined)

    if (payment && ((payment['status'] && payment['status'] === 'COMPLETED') || payment['id'])) {
      const receiptUrl = (payment['receiptUrl'] as string) || (payment['receipt_url'] as string) || null
      const status = (payment['status'] as string) || (payment['payment_status'] as string) || 'UNKNOWN'
      const paymentId = payment['id'] as string
      console.info('Payment created', { paymentId, status })
      return new Response(JSON.stringify({ success: true, paymentId, status, receiptUrl }), { status: 200, headers: { 'content-type': 'application/json' } })
    }

    // Manejo de fallo genérico
    const errors = ((result as Record<string, unknown>)['errors'] as unknown) ?? ((respRec as Record<string, unknown>)['errors'] as unknown) ?? null
    return new Response(JSON.stringify({ success: false, message: 'Pago no completado', errors }), { status: 402, headers: { 'content-type': 'application/json' } })
  } catch (err: unknown) {
    console.error('Create payment error:', err)
    const message = String(err) || 'Error interno al procesar el pago'
    return new Response(JSON.stringify({ success: false, message }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}
