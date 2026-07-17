import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params

    // Fetch the contract
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contractQuery: any = await (supabaseAdmin as unknown as any)
      .from('contracts')
      .select('contract_number')
      .eq('id', contractId)
      .single()
    const contract: Record<string, unknown> | null = contractQuery.data
    const contractError = contractQuery.error

    if (contractError || !contract) {
      return NextResponse.json({ success: false, message: 'Contract not found' }, { status: 404 })
    }

    // Fetch certificates for this contract
    const { data: certificates, error: certsError } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('contract_id', contractId)

    if (certsError) {
      console.error('Error fetching certificates:', certsError)
      return NextResponse.json({ success: false, message: 'Failed to fetch certificates' }, { status: 500 })
    }

    // Fetch all coverages for this contract
    const { data: coverages, error: covsError } = await supabaseAdmin
      .from('coverages')
      .select('id, insurance_type, policy_number')
      .eq('contract_id', contractId)

    if (covsError) {
      console.error('Error fetching coverages:', covsError)
    }

    return NextResponse.json({
      success: true,
      contractId,
      contractNumber: (contract.contract_number as string) || null,
      certificates: certificates || [],
      coverages: coverages || [],
    })
  } catch (error) {
    console.error('certificates list route failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load certificates' }, { status: 500 })
  }
}