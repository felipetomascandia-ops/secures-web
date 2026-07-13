import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'
import type { Database } from '@/types/supabase'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contractId } = await params
    const body = await request.json()
    const { signature, signatureDate } = body

    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ success: false, message: 'Contract not found' }, { status: 404 })
    }

    const updatePayload: Database['public']['Tables']['contracts']['Update'] = {
      client_signature: signature,
      client_signature_date: signatureDate,
      is_signed: true,
    }

    type ContractUpdateBuilder = {
      update: (values: Database['public']['Tables']['contracts']['Update']) => {
        eq: (column: string, value: string) => {
          select: () => {
            single: () => Promise<{ data: unknown; error: { message?: string } | null }>
          }
        }
      }
    }

    const supabaseClient = supabaseAdmin as unknown as {
      from: (table: 'contracts') => ContractUpdateBuilder
    }

    // Update contract
    const { data: updatedContract, error: updateError } = await supabaseClient
      .from('contracts')
      .update(updatePayload)
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ success: false, message: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      contract: updatedContract,
    })
  } catch (error) {
    console.error('sign contract error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
