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

  // Mark contract as active
  await db.from('contracts').update({ status: 'active', policy_status: 'active' }).eq('id', contractId)

  // Mark the down payment schedule as completed (sequence 0 = Down Payment)
  await db
    .from('payment_schedules')
    .update({ status: 'completed', paid_at: new Date().toISOString() })
    .eq('contract_id', contractId)
    .eq('sequence', 0)

  // Load contract + coverages + certificates for the email
  const [{ data: contract }, { data: coverages }, { data: certificates }] = await Promise.all([
    db.from('contracts').select('*').eq('id', contractId).single(),
    db.from('coverages').select('*').eq('contract_id', contractId),
    db.from('certificates').select('*').eq('contract_id', contractId),
  ])

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

  // Build certificate links section
  const certList: string = (certificates || []).map((cert: any) => {
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