/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'
import { createCheckout } from '@/lib/square'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      customer,
      email,
      phone,
      amount,
      currency = 'USD',
      description,
      contractId,
      expiresAt,
      sendEmail,
      sendWhatsapp,
      createdBy,
      idempotencyKey: clientIdempotencyKey,
    } = body

    const isValidUuid = (value: unknown) =>
      typeof value === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)
    const isValidTimestamp = (value: unknown) => {
      if (typeof value !== 'string') return false
      const parsed = Date.parse(value)
      return !Number.isNaN(parsed)
    }

    // Validaciones
    if (!customer || !email || !amount) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }
    const amountNumber = Number(amount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 })
    }
    if (contractId && !isValidUuid(contractId)) {
      return NextResponse.json({ success: false, message: 'Invalid contractId format' }, { status: 400 })
    }
    if (createdBy && !isValidUuid(createdBy)) {
      return NextResponse.json({ success: false, message: 'Invalid createdBy format' }, { status: 400 })
    }
    if (expiresAt && !isValidTimestamp(expiresAt)) {
      return NextResponse.json({ success: false, message: 'Invalid expiresAt format' }, { status: 400 })
    }

    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
    if (!locationId) return NextResponse.json({ success: false, message: 'Location ID not configured' }, { status: 500 })

    const idempotencyKey = clientIdempotencyKey || (typeof randomUUID === 'function' ? randomUUID() : `${Date.now()}-${Math.random()}`)
    console.info('Create checkout link request', { customer, amount, currency, idempotencyKey })

    const paymentId = typeof randomUUID === 'function' ? randomUUID() : `${Date.now()}-${Math.random()}`
    const baseUrl = getBaseUrl(req)
    const successRedirectUrl = `${baseUrl}/admin/payments/success?paymentId=${encodeURIComponent(paymentId)}`

    const initialRecord = {
      id: paymentId,
      square_checkout_id: null,
      square_url: null,
      amount: Number(amount),
      currency,
      status: 'pending',
      customer,
      email,
      phone,
      description,
      contract_id: contractId || null,
      created_by: createdBy || null,
      expires_at: expiresAt || null,
    }

    const { data: initialData, error: initialError } = await (supabaseAdmin as unknown as any)
      .from('payments')
      .insert(initialRecord as any)
      .select()
      .single()

    if (initialError) {
      console.error('DB insert initial payment error', initialError)
      return NextResponse.json({ success: false, message: 'DB error', error: initialError }, { status: 500 })
    }

    const checkoutBody = {
      idempotencyKey,
      order: {
        locationId,
        lineItems: [
          {
            name: description || 'Payment',
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(Math.round(Number(amount) * 100)),
              currency,
            },
          },
        ],
      },
      checkoutOptions: {
        redirectUrl: successRedirectUrl,
      },
      checkout_options: {
        redirect_url: successRedirectUrl,
      },
    }

    let resp: unknown
    try {
      resp = await createCheckout(locationId, checkoutBody)
    } catch (error) {
      console.error('Square checkout create error', error)
      await (supabaseAdmin as unknown as any).from('payments').delete().eq('id', paymentId)
      return NextResponse.json({ success: false, message: 'Failed to generate checkout link', error }, { status: 502 })
    }

    const respRec = resp as Record<string, unknown>
    const result = (respRec['result'] as Record<string, unknown> | undefined) ?? respRec
    const resultRec = result as Record<string, unknown>
    const checkout = (resultRec['paymentLink'] ?? resultRec['checkout'] ?? resultRec['payment_link'] ?? null) as Record<string, unknown> | null

    const checkoutId = (checkout && (checkout['id'] ?? checkout['payment_link_id'])) || null
    const checkoutUrl = (checkout && (checkout['url'] ?? checkout['checkoutPageUrl'] ?? checkout['checkout_page_url'] ?? (checkout['payment_link'] && (checkout['payment_link'] as Record<string, unknown>)['url']))) || null

    if (!checkoutUrl) {
      console.error('Square checkout response missing checkout URL', { checkoutId, checkout })
      await (supabaseAdmin as unknown as any).from('payments').delete().eq('id', paymentId)
      return NextResponse.json({ success: false, message: 'Failed to generate checkout link' }, { status: 502 })
    }

    const { data, error } = await (supabaseAdmin as unknown as any)
      .from('payments')
      .update({ square_checkout_id: checkoutId as string | null, square_url: checkoutUrl as string | null, status: 'pending' })
      .eq('id', paymentId)
      .select()
      .single()

    if (error) {
      console.error('DB insert error', error)
      return NextResponse.json({ success: false, message: 'DB error', error }, { status: 500 })
    }

    console.info('Checkout link created', { checkoutId, checkoutUrl, paymentRecordId: data?.id })
    return NextResponse.json({ success: true, checkoutId, checkoutUrl, data }, { status: 200 })
  } catch (err: unknown) {
    console.error('create-link error', err)
    return NextResponse.json({ success: false, message: String(err) || 'Internal error' }, { status: 500 })
  }
}

function getBaseUrl(req: Request) {
  const host = req.headers.get('host') || ''
  if (host.includes('localhost')) {
    return `http://${host}`.replace(/\/$/, '')
  }
  return 'https://olimpocoveragegroup.com'
}
