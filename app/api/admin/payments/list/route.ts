/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('payments').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ success: false, message: 'DB error', error }, { status: 500 })
    return NextResponse.json({ success: true, payments: data })
  } catch (err: any) {
    console.error('payments list error', err)
    return NextResponse.json({ success: false, message: err?.message || 'Internal error' }, { status: 500 })
  }
}
