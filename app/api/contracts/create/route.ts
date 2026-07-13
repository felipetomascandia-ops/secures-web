/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import ContractsService from '@/lib/services/ContractsService'
import supabaseAdmin from '@/lib/supabaseAdmin'

const db = supabaseAdmin as unknown as typeof supabaseAdmin

const getErrorMessage = (value: unknown) => {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  if (value && typeof value === 'object') {
    const maybeMessage = (value as { message?: unknown }).message
    if (typeof maybeMessage === 'string') return maybeMessage
    const maybeDetails = (value as { details?: unknown }).details
    if (typeof maybeDetails === 'string') return maybeDetails
    try {
      return JSON.stringify(value)
    } catch {
      return 'Unknown error'
    }
  }
  return 'Unknown error'
}

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { contracts, createdBy, allCoverages = [], allVehicles = [] } = body // allCoverages and allVehicles
    if (!contracts || !Array.isArray(contracts)) return NextResponse.json({ success: false, message: 'contracts array required' }, { status: 400 })

    // Verify createdBy is admin
    if (!createdBy) return NextResponse.json({ success: false, message: 'createdBy required' }, { status: 401 })
    const { data: adminData } = await db.from('admins').select('*').eq('user_id', createdBy).single()
    if (!adminData) return NextResponse.json({ success: false, message: 'Not authorized' }, { status: 403 })

    const results: unknown[] = []
    const createdContractIds: string[] = []
    try {
      for (const c of contracts) {
        // Pass ALL coverages to the contract, not just filtered
        const res = await ContractsService.createContractWithSchedule({ ...c, coverages: allCoverages, vehicles: allVehicles }, createdBy)
        results.push(res)
        createdContractIds.push((res as any).contract.id)
      }
      return NextResponse.json({ success: true, created: results })
    } catch (err: unknown) {
      console.error('error creating contracts, rolling back', err)
      // rollback created contracts
      if (createdContractIds.length > 0) {
        await supabaseAdmin.from('certificates').delete().in('contract_id', createdContractIds)
        await supabaseAdmin.from('coverages').delete().in('contract_id', createdContractIds)
        await supabaseAdmin.from('payment_schedules').delete().in('contract_id', createdContractIds)
        await supabaseAdmin.from('contracts').delete().in('id', createdContractIds)
      }
      return NextResponse.json({ success: false, message: getErrorMessage(err) || 'Failed to create contracts' }, { status: 500 })
    }
  } catch (err: unknown) {
    console.error('contracts create route error', err)
    return NextResponse.json({ success: false, message: getErrorMessage(err) || 'Internal error' }, { status: 500 })
  }
}
