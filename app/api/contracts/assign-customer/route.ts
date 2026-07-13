/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { contractId, customerUserId, createdBy } = body

    if (!contractId || !customerUserId) {
      return NextResponse.json({ success: false, message: 'contractId and customerUserId are required' }, { status: 400 })
    }

    if (!createdBy) {
      return NextResponse.json({ success: false, message: 'createdBy required' }, { status: 401 })
    }

    const { data: adminData } = await supabaseAdmin.from('admins').select('*').eq('user_id', createdBy).single()
    if (!adminData) {
      return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })
    }

    const { data: contract, error: contractError } = await (supabaseAdmin as any)
      .from('contracts')
      .update({ user_id: customerUserId })
      .eq('id', contractId)
      .select('id')
      .single()

    if (contractError) throw contractError

    return NextResponse.json({ success: true, contract })
  } catch (error: unknown) {
    console.error('assign customer error', error)
    return NextResponse.json({ success: false, message: String(error) || 'Unable to assign contract' }, { status: 500 })
  }
}
