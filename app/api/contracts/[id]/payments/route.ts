import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true })

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError)
      return NextResponse.json({ success: false, message: 'Failed to fetch payments' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      payments: payments || [],
    })
  } catch (error) {
    console.error('payments route failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load payments' }, { status: 500 })
  }
}