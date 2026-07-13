import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Missing bearer token' }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (userError || !user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    console.log('My Panel - User:', { id: user.id, email: user.email })

    // Build the contracts query with proper OR filter
    let contractsQuery = supabaseAdmin.from('contracts').select('*')
    
    if (user.email) {
      // Use proper Supabase OR syntax for multiple conditions
      contractsQuery = contractsQuery.or(`user_id.eq.${user.id},client_email.eq.${user.email}`)
    } else {
      contractsQuery = contractsQuery.eq('user_id', user.id)
    }
    
    contractsQuery = contractsQuery.order('created_at', { ascending: false })

    const [
      { data: contractData, error: contractError }, 
      { data: allSchedules, error: scheduleError }, 
      { data: allCoverages, error: coverageError }, 
      { data: allCertificates, error: certificateError },
      { data: allContracts, error: allContractsError }
    ] = await Promise.all([
      contractsQuery,
      supabaseAdmin.from('payment_schedules').select('*').order('due_date', { ascending: true }),
      supabaseAdmin.from('coverages').select('*'),
      supabaseAdmin.from('certificates').select('*'),
      supabaseAdmin.from('contracts').select('*').order('created_at', { ascending: false })
    ])

    console.log('My Panel - All Contracts in DB:', allContracts)
    console.log('My Panel - Results:', { 
      contractsCount: (contractData || []).length, 
      schedulesCount: (allSchedules || []).length,
      coveragesCount: (allCoverages || []).length,
      certificatesCount: (allCertificates || []).length,
      contractError,
      allContractsError,
      user: { id: user.id, email: user.email }
    })

    if (contractError) {
      console.error('My Panel - Contract error:', contractError)
    }
    if (scheduleError) {
      console.error('My Panel - Schedule error:', scheduleError)
    }
    if (coverageError) {
      console.error('My Panel - Coverage error:', coverageError)
    }
    if (certificateError) {
      console.error('My Panel - Certificate error:', certificateError)
    }

    // Filter related data by contract IDs
    const contractIds = (contractData || []).map((c: any) => c.id)
    const filteredSchedules = (allSchedules || []).filter((s: any) => contractIds.includes(s.contract_id))
    const filteredCoverages = (allCoverages || []).filter((cov: any) => contractIds.includes(cov.contract_id))
    const filteredCertificates = (allCertificates || []).filter((cert: any) => contractIds.includes(cert.contract_id))

    return NextResponse.json({ 
      success: true, 
      contracts: contractData || [], 
      schedules: filteredSchedules, 
      coverages: filteredCoverages, 
      certificates: filteredCertificates,
      debug: { userId: user.id, userEmail: user.email, contractIds }
    })
  } catch (error) {
    console.error('my-panel route failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load your panel data' }, { status: 500 })
  }
}
