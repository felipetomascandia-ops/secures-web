/* eslint-disable @typescript-eslint/no-explicit-any */
import supabaseAdmin from '@/lib/supabaseAdmin'
import PaymentsService from './PaymentsService'
import EmailService from './EmailService'

const db = supabaseAdmin as unknown as typeof supabaseAdmin

const buildContractPayload = (contractData: any, createdBy?: string) => {
  const {
    contractNumber,
    policyNumber,
    contractDate,
    clientName,
    clientCompanyName,
    clientAddress,
    clientCity,
    clientState,
    clientZip,
    clientEmail,
    clientPhone,
    totalPremium,
    downPayment,
    monthlyPayment,
    numberOfPayments,
    firstDueDate,
    terms,
    insuranceType,
    userId,
    status,
    policyStatus,
    expirationDate,
    financeChargePercent = 0,
  } = contractData

  const today = new Date().toISOString().slice(0, 10)
  const normalizedContractDate = contractDate && String(contractDate).trim() ? String(contractDate).trim() : new Date().toISOString()
  const normalizedFirstDueDate = firstDueDate && String(firstDueDate).trim() ? String(firstDueDate).trim() : today
  const base = new Date(normalizedFirstDueDate)
  base.setMonth(base.getMonth() + 1)
  const effectiveExpirationDate = expirationDate && String(expirationDate).trim() ? String(expirationDate).trim() : base.toISOString().slice(0, 10)

  const parseNumber = (value: unknown) => {
    if (value === null || value === undefined || value === '') return 0
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  const totalPremiumNum = parseNumber(totalPremium)
  const downPaymentNum = parseNumber(downPayment)
  const unpaidBalance = totalPremiumNum - downPaymentNum
  const financeCharge = unpaidBalance * (parseNumber(financeChargePercent) / 100)
  const amountFinanced = unpaidBalance + financeCharge

  return {
    contract_number: contractNumber,
    policy_number: policyNumber,
    contract_date: normalizedContractDate,
    client_name: clientName,
    client_company_name: clientCompanyName,
    client_address: clientAddress || null,
    client_city: clientCity || null,
    client_state: clientState || null,
    client_zip: clientZip || null,
    client_email: clientEmail,
    client_phone: clientPhone,
    total_premium: totalPremiumNum,
    down_payment: downPaymentNum,
    monthly_payment: parseNumber(monthlyPayment),
    number_of_payments: parseNumber(numberOfPayments),
    first_due_date: normalizedFirstDueDate,
    terms,
    created_by: createdBy || null,
    user_id: userId || null,
    insurance_type: insuranceType || null,
    status: status || 'pending',
    policy_status: policyStatus || 'active',
    expiration_date: effectiveExpirationDate,
    unpaid_balance: unpaidBalance,
    finance_charge: financeCharge,
    amount_financed: amountFinanced,
    finance_charge_percent: parseNumber(financeChargePercent),
  }
}

const getNextPolicyNumber = async (currentPolicyNumber?: string): Promise<string> => {
  // If current policy number is provided, parse and increment it
  if (currentPolicyNumber) {
    const match = currentPolicyNumber.match(/PA-A-(\d+)/)
    if (match && match[1]) {
      const currentNum = parseInt(match[1], 10)
      if (!isNaN(currentNum)) {
        return `PA-A-${currentNum + 1}`
      }
    }
  }
  
  // Otherwise get the highest existing policy number
  const { data: contracts } = await (db as unknown as any)
    .from('contracts')
    .select('policy_number')
    .not('policy_number', 'is', null)
    .order('policy_number', { ascending: false })
    .limit(1)

  if (contracts && contracts.length > 0) {
    const lastPolicyStr = contracts[0].policy_number || ''
    const lastPolicyNum = parseInt(lastPolicyStr.replace('PA-A-', ''), 10)
    if (!isNaN(lastPolicyNum)) {
      return `PA-A-${lastPolicyNum + 1}`
    }
  }

  // If no contracts exist yet, start at PA-A-1001
  return 'PA-A-1001'
}

const checkPolicyNumberForClient = async (policyNumber: string, clientEmail: string): Promise<boolean> => {
  const { data: existingContract } = await (db as unknown as any)
    .from('contracts')
    .select('client_email')
    .eq('policy_number', policyNumber)
    .single()

  if (!existingContract) return false
  return existingContract.client_email === clientEmail
}

const buildCoveragePayload = (coverage: any, contractId: string) => {
  const parseNumber = (value: unknown) => {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }

  return {
    contract_id: contractId,
    insurance_type: coverage.insuranceType,
    policy_number: coverage.policyNumber,
    effective_date: coverage.effectiveDate,
    expiration_date: coverage.expirationDate,
    coverage_details: coverage.coverageDetails || null,
    coverage_limit: parseNumber(coverage.coverageLimit),
    each_occurrence: parseNumber(coverage.eachOccurrence),
    damage_to_rented_premises: parseNumber(coverage.damageToRentedPremises),
    med_exp: parseNumber(coverage.medExp),
    personal_adv_injury: parseNumber(coverage.personalAdvInjury),
    products_completed_ops_agg: parseNumber(coverage.productsCompletedOpsAgg),
    combined_single_limit: parseNumber(coverage.combinedSingleLimit),
    bodily_injury_per_person: parseNumber(coverage.bodilyInjuryPerPerson),
    bodily_injury_per_accident: parseNumber(coverage.bodilyInjuryPerAccident),
    property_damage_per_accident: parseNumber(coverage.propertyDamagePerAccident),
    el_each_accident: parseNumber(coverage.elEachAccident),
    el_disease_ea_employee: parseNumber(coverage.elDiseaseEaEmployee),
    el_disease_policy_limit: parseNumber(coverage.elDiseasePolicyLimit),
    general_aggregate: parseNumber(coverage.generalAggregate),
    deductible: parseNumber(coverage.deductible),
    insured_name: coverage.insuredName,
    auto_any_auto: coverage.autoAnyAuto,
    auto_owned_auto: coverage.autoOwnedAuto,
    auto_hired_autos_only: coverage.autoHiredAutosOnly,
    auto_non_owned_autos_only: coverage.autoNonOwnedAutosOnly,
    auto_scheduled_autos: coverage.autoScheduledAutos,
    property_building_limit: parseNumber(coverage.propertyBuildingLimit),
    property_personal_property_limit: parseNumber(coverage.propertyPersonalPropertyLimit),
    certificate_holder_name: coverage.certificateHolderName || null,
    certificate_holder_address: coverage.certificateHolderAddress || null,
  }
}

const getAgentSignatureDataURL = () => {
  const svg = `
<svg width="100" height="50" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 15 C30 5 70 5 90 15" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M5 25 C20 10 40 40 60 20 C80 0 95 35 90 25" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M10 30 C25 15 45 45 65 25 C85 5 90 40 85 30" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M15 10 L85 40" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
  `.trim()
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

export class ContractsService {
  static async getNextPolicyNumber() {
    return await getNextPolicyNumber()
  }

  static async checkPolicyNumberForClient(policyNumber: string, clientEmail: string) {
    return await checkPolicyNumberForClient(policyNumber, clientEmail)
  }

  static async createContractWithSchedule(contractData: any, createdBy?: string) {
    console.log('ContractsService: Creating contract with data', contractData)
    console.log('ContractsService: Coverages received', { coverages: contractData.coverages, coveragesCount: contractData.coverages?.length })
    const { contractNumber, policyNumber, clientName, clientCompanyName, clientEmail, clientPhone, totalPremium, downPayment, monthlyPayment, numberOfPayments, firstDueDate, terms, sendToClient, coverages = [], vehicles = [] } = contractData
    
    // Generate policy number if not provided
    let finalPolicyNumber = policyNumber
    if (!finalPolicyNumber) {
      finalPolicyNumber = await getNextPolicyNumber()
    }

    let contract: any = null
    let contractError: any = null
    let attempts = 0
    const MAX_ATTEMPTS = 100

    while (attempts < MAX_ATTEMPTS) {
      attempts++
      const payload = {
        ...buildContractPayload({ ...contractData, policyNumber: finalPolicyNumber }, createdBy),
        agent_signature: getAgentSignatureDataURL(),
        agent_signature_date: new Date().toISOString()
      }
      console.log('ContractsService: Built payload', payload)

      contract = null
      contractError = null

      try {
        const response = await (db as unknown as any).from('contracts').insert(payload as any).select().single()
        contract = response.data
        contractError = response.error
        console.log('ContractsService: Contract insert response', { data: contract, error: contractError })
      } catch (error) {
        contractError = error
        console.error('ContractsService: Error inserting contract', error)
      }

      if (!contractError) break

      // If we got a unique constraint violation (policy number already exists)
      if (contractError && contractError.code === '23505') {
        // Check if existing policy is for this client
        const isSameClient = await checkPolicyNumberForClient(finalPolicyNumber, clientEmail)
        if (isSameClient) {
          // If same client, throw an error (don't allow duplicate policy numbers even for same client?)
          // Or maybe we should handle this differently, but for now let's just throw
          throw new Error(`Policy number ${finalPolicyNumber} already exists for this client.`)
        } else {
          // Not the same client, try next policy number
          finalPolicyNumber = await getNextPolicyNumber(finalPolicyNumber)
          console.log('ContractsService: Policy number collision, trying next', finalPolicyNumber)
          continue
        }
      }

      // If it's not a unique constraint error, try fallback insert
      console.error('ContractsService: Initial contract insert failed, error:', contractError)
      console.log('ContractsService: Trying fallback insert')
      
      // Don't remove user_id from fallback! Keep all fields that might work
      const fallbackPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => !['insurance_type', 'expiration_date', 'coverages'].includes(key))
      )
      console.log('ContractsService: Fallback payload:', fallbackPayload)
      
      const response = await (db as unknown as any).from('contracts').insert(fallbackPayload as any).select().single()
      contract = response.data
      contractError = response.error
      console.log('ContractsService: Fallback insert response:', { data: contract, error: contractError })
      
      if (!contractError) break
      
      // If fallback also failed and it's not unique constraint, throw
      if (contractError.code !== '23505') break
    }

    if (contractError) throw contractError

    const contractRec = contract as Record<string, unknown>
    const contractId = contractRec['id'] as string
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.olimpocoveragegroup.com'
    const documentUrl = `${baseUrl}/api/contracts/${contractId}/document`
    console.log('ContractsService: Updating contract with signed document URL', { contractId, documentUrl })
    const updateResult = await (db as unknown as any).from('contracts').update({
      signed_document_url: documentUrl,
    }).eq('id', contractId).select()
    console.log('ContractsService: Update result', updateResult)

    // Insert coverages
    const createdCoverages: any[] = []
    console.log('ContractsService: Inserting coverages', { coveragesCount: coverages.length, coverages })
    
    if (coverages.length === 0) {
      console.warn('ContractsService: WARNING - No coverages to insert!')
    }
    
    for (let i = 0; i < coverages.length; i++) {
      const coverage = coverages[i]
      try {
        console.log(`ContractsService: Coverage ${i + 1}/${coverages.length} raw coverage`, coverage)
        const coveragePayload = buildCoveragePayload({ ...coverage, policyNumber: finalPolicyNumber }, contractId)
        console.log(`ContractsService: Coverage ${i + 1}/${coverages.length} payload`, coveragePayload)
        
        const { data: covData, error: covError } = await (db as unknown as any).from('coverages').insert(coveragePayload).select().single()
        
        console.log(`ContractsService: Coverage ${i + 1}/${coverages.length} insert result`, { data: covData, error: covError })
        
        if (covError) {
          console.error(`ContractsService: Error inserting coverage ${i + 1}:`, JSON.stringify(covError, null, 2))
          continue
        }
        
        if (!covData) {
          console.warn(`ContractsService: No data returned for coverage ${i + 1}`)
          continue
        }
        
        createdCoverages.push(covData)
        console.log(`ContractsService: Coverage ${i + 1} created successfully with ID:`, covData.id)
        
        // Create certificate entry for each coverage
        const certificateUrl = `${baseUrl}/api/contracts/${contractId}/certificate/${covData.id}`
        const certificateData = {
          contract_id: contractId,
          coverage_id: covData.id,
          certificate_type: coverage.insuranceType || coverage.insurance_type || 'insurance',
          certificate_url: certificateUrl,
        }
        console.log(`ContractsService: Inserting certificate ${i + 1}/${coverages.length}`, certificateData)
        const { data: certData, error: certError } = await (db as unknown as any).from('certificates').insert(certificateData).select().single()
        
        if (certError) {
          console.error(`ContractsService: Error creating certificate for coverage ${i + 1}:`, JSON.stringify(certError, null, 2))
        } else {
          console.log(`ContractsService: Certificate created for coverage ${i + 1}`, certData)
        }
      } catch (err) {
        console.error(`ContractsService: Exception inserting coverage ${i + 1}:`, err)
      }
    }
    
    console.log('ContractsService: Total created coverages', createdCoverages.length)

    // Update contract with certificate_url (if we have at least one certificate)
    if (createdCoverages.length > 0) {
      const firstCertUrl = `${baseUrl}/api/contracts/${contractId}/certificate/${createdCoverages[0].id}`
      await (db as unknown as any).from('contracts').update({
        certificate_url: firstCertUrl,
      }).eq('id', contractId)
    }

    // Insert vehicles
    const createdVehicles: any[] = []
    for (const vehicle of vehicles) {
      const vehiclePayload = {
        contract_id: contractId,
        year: vehicle.year || null,
        make: vehicle.make || null,
        model: vehicle.model || null,
        vin: vehicle.vin || null,
      }
      const { data: vehData, error: vehError } = await (db as unknown as any).from('vehicles').insert(vehiclePayload).select().single()
      if (!vehError && vehData) {
        createdVehicles.push(vehData)
      }
    }

    const createdSchedules: any[] = []
    if (downPayment && Number(downPayment) > 0) {
      const down = await PaymentsService.createScheduleItem(contractId, 0, 'Down Payment', Number(downPayment), firstDueDate)
      createdSchedules.push(down)

      const downRec = down as Record<string, unknown>
      // Pass redirectUrl to ensure customer goes to success page, not admin
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://olimpocoveragegroup.com'
      const redirectUrl = `${baseUrl}/personal-insurance/payment-success`
      await PaymentsService.createDownPaymentCheckout(downRec['id'] as string, Number(downPayment), 'USD', `Down Payment for ${contractNumber}`, clientEmail, clientPhone, redirectUrl)
    }

    const startDate = new Date(firstDueDate || new Date())
    for (let i = 1; i <= Number(numberOfPayments || 0); i++) {
      const due = new Date(startDate)
      due.setMonth(due.getMonth() + (i - 1))
      const sched = await PaymentsService.createScheduleItem(contractId, i, `Month ${i}`, Number(monthlyPayment), due.toISOString().slice(0, 10))
      createdSchedules.push(sched)

      const scheduleRec = sched as Record<string, unknown>
      await PaymentsService.createScheduleCheckout(scheduleRec['id'] as string, Number(monthlyPayment), 'USD', `Monthly payment ${i} for ${contractNumber}`, clientEmail, clientPhone)
    }

    // Refresh schedules to get checkout URLs
    const { data: schedulesWithCheckouts } = await (db as unknown as any).from('payment_schedules').select('*').eq('contract_id', contractId).order('sequence', { ascending: true })

    if (sendToClient && clientEmail) {
      const formatCurrency = (value: number) => `$${value.toFixed(2)}`
      
      // Build payment links section
      const paymentLinksHtml = (schedulesWithCheckouts || []).map((sched: any) => `
        <div style="margin:8px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
          <strong>${sched.label}</strong> - ${formatCurrency(Number(sched.amount))}
          ${sched.checkout_url ? `<br/><a href="${sched.checkout_url}" style="color:#2563eb;">Pay now</a>` : ''}
        </div>
      `).join('')

      // Build certificates links section
      const certificatesHtml = createdCoverages.length > 0 ? `
        <h3>Certificates:</h3>
        ${createdCoverages.map((cov: any) => `
          <div style="margin:8px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
            <strong>${cov.insurance_type}</strong><br/>
            <a href="${baseUrl}/api/contracts/${contractId}/certificate/${cov.id}" style="color:#2563eb;">Download Certificate</a>
          </div>
        `).join('')}
      ` : ''

      const html = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; padding:24px;">
          <h2 style="color:#111827;">Hi ${clientName || clientCompanyName || 'there'},</h2>
          <p style="font-size:16px;">Your insurance contract <strong style="color:#111827;">${contractNumber}</strong> has been created.</p>
          
          <div style="margin:16px 0; padding:16px; background:#f8fafc; border-radius:8px;">
            <h3 style="margin-top:0;">Agreement Summary</h3>
            <p><strong>Total Premium:</strong> ${formatCurrency(Number(totalPremium || 0))}</p>
            <p><strong>Down Payment:</strong> ${formatCurrency(Number(downPayment || 0))}</p>
            <p><strong>Monthly Payments:</strong> ${formatCurrency(Number(monthlyPayment || 0))} for ${numberOfPayments || 0} payments</p>
          </div>

          <div style="margin:16px 0;">
            <h3>Contract Document:</h3>
            <a href="${baseUrl}/api/contracts/${contractId}/document" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">View / Download Contract</a>
          </div>

          ${certificatesHtml}

          <div style="margin:16px 0;">
            <h3>Payment Schedule & Links:</h3>
            ${paymentLinksHtml}
          </div>

          <div style="margin:24px 0;">
            <h3>Access Your Portal:</h3>
            <p>View all your contracts, payments, and certificates in one place:</p>
            <a href="${baseUrl}/my-panel" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">Open My Panel</a>
          </div>
        </div>
      `
      try {
        await EmailService.sendEmail(clientEmail, `Contract ${contractNumber} - Olimpo Coverage Group`, html)
      } catch (error) {
        console.error('email send failed', error)
      }
    }

    return { contract, schedules: schedulesWithCheckouts, coverages: createdCoverages }
  }
}

export default ContractsService
