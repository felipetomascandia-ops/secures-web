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
    const { contract, userId } = body
    
    if (!contract) {
      return NextResponse.json({ success: false, message: 'Contract data required' }, { status: 400 })
    }

    // If userId is provided, verify user exists (optional for now)
    if (userId) {
      const { data: userData } = await db.from('users').select('*').eq('id', userId).single()
      // Don't fail if user doesn't exist yet - they can register later
    }

    try {
      // Create contract with coverages
      const contractData = {
        ...contract,
        coverages: contract.coverages || [],
        vehicles: []
      }
      
      console.log('Creating contract with data:', JSON.stringify(contractData, null, 2))
      
      const result = await ContractsService.createContractWithSchedule(
        contractData, 
        userId
      )
      
      console.log('Contract created successfully:', result)
      return NextResponse.json({ success: true, created: [result] })
    } catch (err: unknown) {
      console.error('Error creating contract:', err)
      return NextResponse.json({ success: false, message: getErrorMessage(err) || 'Failed to create contract' }, { status: 500 })
    }
  } catch (err: unknown) {
    console.error('Contract creation route error:', err)
    return NextResponse.json({ success: false, message: getErrorMessage(err) || 'Internal error' }, { status: 500 })
  }
}