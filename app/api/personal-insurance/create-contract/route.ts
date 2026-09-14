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
      // Extract vehicle metadata from coverages if vehicles array is empty
      const coverages = contract.coverages || []
      const vehicles: unknown[] = contract.vehicles && Array.isArray(contract.vehicles) && contract.vehicles.length > 0
        ? [...contract.vehicles]
        : []

      if (vehicles.length === 0 && coverages.length > 0) {
        for (const cov of coverages) {
          const v = (cov as Record<string, unknown>).vehicle
          if (v && typeof v === 'object') {
            const veh = v as Record<string, unknown>
            const vehicleRecord: Record<string, unknown> = {
              year: veh.year ?? veh.vehicleYear ?? null,
              make: veh.make ?? veh.vehicleMake ?? null,
              model: veh.model ?? veh.vehicleModel ?? null,
              vin: veh.vin ?? veh.vehicleVin ?? null,
              license_plate: veh.license_plate ?? veh.licensePlate ?? veh.vehicleLicensePlate ?? (cov as Record<string, unknown>).licensePlate ?? null,
              drivers_count: veh.drivers_count ?? veh.driversCount ?? veh.vehicleDriversCount ?? null,
            }
            if (vehicleRecord.year || vehicleRecord.make || vehicleRecord.vin) {
              vehicles.push(vehicleRecord)
            }
          }
        }
      }

      // Ensure coverage_details always includes License Plate when available
      const enrichedCoverages = coverages.map((cov: Record<string, unknown>) => {
        const licensePlate =
          (cov.licensePlate as string | undefined) ||
          ((cov.vehicle as Record<string, unknown> | undefined)?.licensePlate as string | undefined) ||
          ((cov.vehicle as Record<string, unknown> | undefined)?.license_plate as string | undefined) ||
          ((cov.vehicle as Record<string, unknown> | undefined)?.vehicleLicensePlate as string | undefined)

        let coverageDetails = (cov.coverageDetails as string | undefined) || ''

        if (licensePlate && typeof licensePlate === 'string' && licensePlate.trim() !== '') {
          const plateMarker = 'License Plate:'
          const plateMarkerAlt = 'Plate:'
          if (!coverageDetails.includes(plateMarker) && !coverageDetails.includes(plateMarkerAlt)) {
            coverageDetails = `${coverageDetails} | License Plate: ${licensePlate}`
          }
        }

        return {
          ...cov,
          coverageDetails,
        }
      })

      // Create contract with coverages and ensure userId is set
      const contractData = {
        ...contract,
        userId,  // Set the authenticated user's ID so it appears in Mi Panel
        coverages: enrichedCoverages,
        vehicles,
      }
      
      console.log('Creating contract with data:', JSON.stringify(contractData, null, 2))
      
      const result = await ContractsService.createContractWithSchedule(
        contractData, 
        userId,
        true // skip creating the Down Payment checkout link (we'll create it in create-payment)
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