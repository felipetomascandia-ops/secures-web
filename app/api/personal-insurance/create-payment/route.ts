/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

const db = supabaseAdmin as unknown as any

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { contractId, planId, amount, customerName, customerEmail, customerPhone } = body

    if (!contractId || !planId || !amount || !customerEmail) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    // Get contract details
    const { data: contract, error: contractError } = await db
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ success: false, message: 'Contract not found' }, { status: 404 })
    }

    // Create payment record
    const paymentRecord = {
      contract_id: contractId,
      amount: Number(amount),
      currency: 'USD',
      status: 'pending',
      customer: customerName,
      email: customerEmail,
      phone: customerPhone || '',
      description: `Initial payment for ${planId} plan - Contract ${contract.contract_number}`,
      created_by: null,
    }

    const { data: payment, error: paymentError } = await db
      .from('payments')
      .insert(paymentRecord)
      .select()
      .single()

    if (paymentError) {
      console.error('Payment record error:', paymentError)
      return NextResponse.json({ success: false, message: 'Failed to create payment record' }, { status: 500 })
    }

    // Create Square checkout link
    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
    if (!locationId) {
      return NextResponse.json({ success: false, message: 'Payment system not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://olimpocoveragegroup.com'
    // Use the payment-success page for personal insurance, NOT the admin payments page
    const successRedirectUrl = `${baseUrl}/personal-insurance/payment-success?paymentId=${payment.id}`

    // Call Square API to create checkout link
    const { createCheckout } = await import('@/lib/square')
    
    // IMPORTANT: Square uses checkout_options (snake_case) inside order for payment links API
    const checkoutBody = {
      idempotencyKey: `personal-${payment.id}-${Date.now()}`,
      order: {
        locationId,
        lineItems: [
          {
            name: `Pago Inicial - Plan ${planId}`,
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(Math.round(Number(amount) * 100)),
              currency: 'USD',
            },
          },
        ],
        checkout_options: {
          redirect_url: successRedirectUrl,
        },
      },
    }

    let resp: unknown
    try {
      resp = await createCheckout(locationId, checkoutBody)
    } catch (error) {
      console.error('Square checkout error:', error)
      // Clean up payment record
      await db.from('payments').delete().eq('id', payment.id)
      return NextResponse.json({ success: false, message: 'Failed to generate payment link' }, { status: 502 })
    }

    const respRec = resp as Record<string, unknown>
    const result = (respRec['result'] as Record<string, unknown> | undefined) ?? respRec
    const resultRec = result as Record<string, unknown>
    const checkout = (resultRec['paymentLink'] ?? resultRec['checkout'] ?? resultRec['payment_link'] ?? null) as Record<string, unknown> | null

    const checkoutUrl = (checkout && (checkout['url'] ?? checkout['checkoutPageUrl'] ?? checkout['checkout_page_url'] ?? (checkout['payment_link'] && (checkout['payment_link'] as Record<string, unknown>)['url']))) || null
    const squareLinkId = (checkout && (checkout['id'] as string | undefined)) || null

    if (!checkoutUrl) {
      console.error('Square checkout response missing URL', { checkout })
      await supabaseAdmin.from('payments').delete().eq('id', payment.id)
      return NextResponse.json({ success: false, message: 'Failed to generate payment link' }, { status: 502 })
    }

    // Update payment with checkout URL and Square payment link ID
    const { error: updateError } = await db
      .from('payments')
      .update({
        square_url: checkoutUrl,
        square_checkout_id: squareLinkId,
        status: 'pending',
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('Payment update error:', updateError)
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      checkoutUrl,
      amount,
      planId,
    }, { status: 200 })

  } catch (err: unknown) {
    console.error('create-payment error:', err)
    return NextResponse.json({ success: false, message: String(err) || 'Internal error' }, { status: 500 })
  }
}