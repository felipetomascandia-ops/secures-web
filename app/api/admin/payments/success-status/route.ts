import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const paymentId = url.searchParams.get('paymentId')
    const checkoutId = url.searchParams.get('checkoutId') || url.searchParams.get('checkout_id') || url.searchParams.get('payment_link_id')

    if (!paymentId && !checkoutId) {
      return NextResponse.json({ success: false, message: 'paymentId or checkoutId is required' }, { status: 400 })
    }

    let query
    if (paymentId) {
      query = supabaseAdmin.from('payments').select('*').eq('id', paymentId).single()
    } else {
      query = supabaseAdmin.from('payments').select('*').eq('square_checkout_id', checkoutId as string).single()
    }

    const { data, error } = await query

    if (error || !data) {
      return NextResponse.json({ success: false, message: 'Payment not found', error }, { status: 404 })
    }

    return NextResponse.json({ success: true, payment: data })
  } catch (err: unknown) {
    return NextResponse.json({ success: false, message: String(err) || 'Internal error' }, { status: 500 })
  }
}
