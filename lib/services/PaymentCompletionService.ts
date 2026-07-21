/* eslint-disable @typescript-eslint/no-explicit-any */
import supabaseAdmin from '@/lib/supabaseAdmin'
import EmailService from '@/lib/services/EmailService'

const db = supabaseAdmin as unknown as any

/**
 * After a payment completes (via webhook or status poll), this function:
 * 1. Marks the contract as active
 * 2. Marks the down payment schedule as completed so it doesn't appear as pending
 * 3. Sends an email with certificate download links
 */
export async function completePaymentAndActivate(payment: Record<string, unknown>) {
  const contractId = payment.contract_id as string | null
  if (!contractId) {
    console.warn('PaymentCompletion: No contract_id on payment', payment.id)
    return
  }

  console.info('PaymentCompletion: Activating contract', { contractId, paymentId: payment.id })

  // First check if contract is already active
  const { data: existingContract, error: checkError } = await db.from('contracts').select('*').eq('id', contractId).single()
  if (checkError) {
    console.error('PaymentCompletion: Error checking contract status:', checkError)
  }

  if (existingContract && (existingContract.status === 'active' || existingContract.policy_status === 'active')) {
    console.info('PaymentCompletion: Contract is already active, skipping activation and email!', { contractId })
    return
  }

  // Mark contract as active
  await db.from('contracts').update({ status: 'active', policy_status: 'active' }).eq('id', contractId)

  // Mark the down payment schedule as completed (sequence 0 = Down Payment)
  await db
    .from('payment_schedules')
    .update({ status: 'completed', paid_at: new Date().toISOString() })
    .eq('contract_id', contractId)
    .eq('sequence', 0)

  // Load contract + coverages + certificates for the email
  console.log('PaymentCompletion: Fetching contract, coverages, certificates for contractId:', contractId)
  const [contractResult, coveragesResult, certificatesResult] = await Promise.all([
    db.from('contracts').select('*').eq('id', contractId).single(),
    db.from('coverages').select('*').eq('contract_id', contractId),
    db.from('certificates').select('*').eq('contract_id', contractId),
  ])
  const { data: contract, error: contractError } = contractResult
  const { data: coverages, error: coveragesError } = coveragesResult
  const { data: certificates, error: certificatesError } = certificatesResult

  if (contractError) console.error('PaymentCompletion: Error fetching contract:', contractError)
  if (coveragesError) console.error('PaymentCompletion: Error fetching coverages:', coveragesError)
  if (certificatesError) console.error('PaymentCompletion: Error fetching certificates:', certificatesError)
  console.log('PaymentCompletion: Fetched data:', { contract, coverages, certificates })

  if (!contract) {
    console.warn('PaymentCompletion: Contract not found', contractId)
    return
  }

  const clientEmail = (contract.client_email as string) || ''
  const clientName = (contract.client_company_name as string) || (contract.client_name as string) || 'there'
  const contractNumber = (contract.contract_number as string) || contractId
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://olimpocoveragegroup.com'

  console.info('PaymentCompletion: Preparing certificate email', {
    contractId,
    clientEmail,
    certificatesCount: certificates?.length || 0,
    coveragesCount: coverages?.length || 0,
  })

  // FALLBACK: If no certificates exist but we have coverages, create them now
  let finalCertificates = certificates || []
  console.info('PaymentCompletion: Checking certificates', {
    existingCertificatesCount: finalCertificates.length,
    existingCoveragesCount: coverages?.length || 0,
    coverages
  })
  if (finalCertificates.length === 0 && coverages && coverages.length > 0) {
    console.info('PaymentCompletion: No certificates found, creating fallback certificates from coverages', {
      coveragesCount: coverages.length
    })
    
    const newCerts: any[] = []
    for (const cov of coverages) {
      console.info('PaymentCompletion: Creating certificate for coverage', { coverageId: cov.id, contractId })
      const certificateUrl = `${baseUrl}/api/contracts/${contractId}/certificate/${cov.id}`
      const certificateData = {
        contract_id: contractId,
        coverage_id: cov.id,
        certificate_type: cov.insurance_type || 'Insurance',
        certificate_url: certificateUrl,
      }
      console.info('PaymentCompletion: Certificate data to insert', certificateData)
      const { data: newCert, error: insertError } = await db.from('certificates').insert(certificateData).select().single()
      
      if (insertError) {
        console.error('PaymentCompletion: Error creating fallback certificate', JSON.stringify(insertError, null, 2))
      } else if (newCert) {
        console.info('PaymentCompletion: Created fallback certificate successfully', { certificateId: newCert.id, newCert })
        newCerts.push(newCert)
      } else {
        console.warn('PaymentCompletion: No data returned from certificate insert', { coverageId: cov.id })
      }
    }
    finalCertificates = newCerts
    console.info('PaymentCompletion: Final certificates after creation', finalCertificates)
  } else {
    console.info('PaymentCompletion: Skipping fallback certificate creation', {
      hasCertificates: finalCertificates.length > 0,
      hasCoverages: coverages && coverages.length > 0
    })
  }

  // Build certificate links section
  const certList: string = finalCertificates.map((cert: any) => {
    const cov = (coverages || []).find((c: any) => c.id === cert.coverage_id)
    const label = cert.certificate_type || (cov?.insurance_type as string) || 'Insurance'
    const url = `${baseUrl}/api/contracts/${contractId}/certificate/${cert.coverage_id}`
    return `
      <div style="margin:8px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
        <strong>${label}</strong><br/>
        <a href="${url}" style="color:#2563eb;">Download Certificate</a>
      </div>`
  }).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;padding:24px;">
      <h2 style="color:#111827;">¡Hola ${clientName}!</h2>
      <p style="font-size:16px;">Tu pago para el contrato <strong>${contractNumber}</strong> ha sido confirmado. Tu cobertura está ahora activa.</p>

      <div style="margin:16px 0;">
        <h3>Contrato:</h3>
        <a href="${baseUrl}/api/contracts/${contractId}/document" style="color:#2563eb;">Ver / Descargar Contrato</a>
      </div>

      ${certList ? `<h3>Tus certificados de seguro:</h3>${certList}` : '<p style="color:#64748b;">No hay certificados disponibles para este contrato.</p>'}

      <div style="margin:24px 0;">
        <h3>Accede a tu panel:</h3>
        <a href="${baseUrl}/my-panel" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">Abrir Mi Panel</a>
      </div>
      <p style="color:#64748b;font-size:12px;">Si tienes alguna duda contáctanos en contacto@olimpocoveragegroup.com</p>
    </div>`

  if (clientEmail) {
    try {
      console.info('PaymentCompletion: Sending certificate email', { to: clientEmail, subject: `Pago confirmado – Contrato ${contractNumber}` })
      const result = await EmailService.sendEmail(
        clientEmail,
        `Pago confirmado – Contrato ${contractNumber} – Olimpo Coverage Group`,
        html
      )
      console.info('PaymentCompletion: confirmation email result', result)
    } catch (err) {
      console.error('PaymentCompletion: failed to send email', err)
    }
  } else {
    console.warn('PaymentCompletion: No client email, skipping email', contractId)
  }
}