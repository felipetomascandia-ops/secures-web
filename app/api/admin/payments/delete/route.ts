import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const paymentId = body?.paymentId as string | undefined

    if (!paymentId) {
      return NextResponse.json({ success: false, message: 'paymentId is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('payments').delete().eq('id', paymentId)
    if (error) {
      return NextResponse.json({ success: false, message: error.message, error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('delete payment error', err)
    return NextResponse.json({ success: false, message: err?.message || 'Internal error' }, { status: 500 })
  }
}
