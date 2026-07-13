import { NextResponse } from 'next/server'
import ContractsService from '@/lib/services/ContractsService'

export async function GET() {
  try {
    const nextPolicyNumber = await ContractsService.getNextPolicyNumber()
    return NextResponse.json({ success: true, policyNumber: nextPolicyNumber })
  } catch (error) {
    console.error('Error getting next policy number:', error)
    return NextResponse.json({ success: false, message: 'Failed to get next policy number' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { policyNumber, clientEmail } = await request.json()
    const isSameClient = await ContractsService.checkPolicyNumberForClient(policyNumber, clientEmail)
    return NextResponse.json({ success: true, isSameClient })
  } catch (error) {
    console.error('Error checking policy number:', error)
    return NextResponse.json({ success: false, message: 'Failed to check policy number' }, { status: 500 })
  }
}
