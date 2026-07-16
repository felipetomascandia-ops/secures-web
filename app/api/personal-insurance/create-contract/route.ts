/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import ContractsService from '@/lib/services/ContractsService'
import supabaseAdmin from '@/lib/supabaseAdmin'

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

const MESSAGES: Record<string, Record<string, string>> = {
  en: {
    contractRequired: 'Contract data required',
    authRequired: 'Authentication required',
    userNotFound: 'Authenticated user not found',
    failedCreate: 'Failed to create contract',
    internalError: 'Internal error',
  },
  es: {
    contractRequired: 'Se requiere información del contrato',
    authRequired: 'Autenticación requerida',
    userNotFound: 'Usuario autenticado no encontrado',
    failedCreate: 'No se pudo crear el contrato',
    internalError: 'Error interno',
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: MESSAGES.en.authRequired }, { status: 401 })
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (userError || !user?.id) {
      return NextResponse.json({ success: false, message: MESSAGES.en.authRequired }, { status: 401 })
    }

    const userId = user.id

    const body = await req.json()
    const { contract } = body
    
    const lang = (body.lang as string) || 'en'

    if (!contract) {
      return NextResponse.json({ success: false, message: MESSAGES[lang]?.contractRequired || MESSAGES.en.contractRequired }, { status: 400 })
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
      const msg = getErrorMessage(err) || MESSAGES[lang]?.failedCreate || MESSAGES.en.failedCreate
      return NextResponse.json({ success: false, message: msg }, { status: 500 })
    }
  } catch (err: unknown) {
    console.error('Contract creation route error:', err)
    const bodyErrLang = (err && typeof err === 'object' && (err as any).lang) ? (err as any).lang : 'en'
    return NextResponse.json({ success: false, message: getErrorMessage(err) || MESSAGES[bodyErrLang]?.internalError || MESSAGES.en.internalError }, { status: 500 })
  }
}