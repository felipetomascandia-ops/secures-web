import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const formatCurrencyDisplay = (value: number | null) => {
  if (value == null || isNaN(value)) return '$0.00'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const parseCurrencyValue = (input: unknown): number | null => {
  if (input == null || input === '') return null
  const s = String(input).trim()
  if (!s) return null
  const normalized = s.replace(/[^\d.-]/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return n
}

const getInsuranceTypeLabel = (typeKey: string | undefined) => {
  if (!typeKey) return 'Insurance Premium Finance Agreement'
  if (typeKey === 'multiple') return 'Multiple Insurance Coverage Agreement'
  const insuranceTypes = [
    { key: 'workers-comp', name: 'Workers Compensation Insurance' },
    { key: 'general-liability', name: 'General Liability Insurance' },
    { key: 'commercial-auto', name: 'Commercial Auto Insurance' },
    { key: 'commercial-property', name: 'Commercial Property Insurance' },
    { key: 'personal-auto', name: 'Personal Auto Insurance' },
    { key: 'motorcycle', name: 'Motorcycle Insurance' },
    { key: 'pet', name: 'Pet Insurance' },
    { key: 'mobile-device', name: 'Mobile Device Insurance' },
    { key: 'event', name: 'Event Insurance' },
    { key: 'bicycle', name: 'Bicycle Insurance' },
  ]
  return insuranceTypes.find((type) => type.key === typeKey)?.name || 'Personal Insurance Agreement'
}

const generateCoverageDetailsHTML = (coverage: Record<string, unknown>) => {
  const insuranceType = coverage.insurance_type as string | undefined
  
  if (insuranceType === 'general-liability') {
    return `
      <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(insuranceType)} Limits</strong>
        <table style="width:100%; border-collapse: collapse; font-size:12px;">
          <tbody>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; width:55%;">Each Occurrence</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.each_occurrence))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Damage to Rented Premises (Ea occurrence)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.damage_to_rented_premises))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Med Exp (Any one person)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.med_exp))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Personal & Adv Injury</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.personal_adv_injury))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">General Aggregate</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.general_aggregate))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Products - Comp/Op Agg</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.products_completed_ops_agg))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Combined Single Limit</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.combined_single_limit))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per person)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodily_injury_per_person))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodily_injury_per_accident))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Property Damage (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.property_damage_per_accident))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">E.L. Each Accident</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.el_each_accident))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">E.L. Disease - Ea Employee</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.el_disease_ea_employee))}</td></tr>
            <tr><td style="padding:8px;">E.L. Disease - Policy Limit</td><td style="padding:8px;">${formatCurrencyDisplay(parseCurrencyValue(coverage.el_disease_policy_limit))}</td></tr>
          </tbody>
        </table>
      </div>
    `
  }

  if (insuranceType === 'commercial-auto') {
    return `
      <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(insuranceType)} Limits</strong>
        <table style="width:100%; border-collapse: collapse; font-size:12px;">
          <tbody>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; width:55%;">Any Auto</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(coverage.auto_any_auto as string | undefined) || 'N/A'}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Owned Autos</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(coverage.auto_owned_auto as string | undefined) || 'N/A'}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Hired Autos Only</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(coverage.auto_hired_autos_only as string | undefined) || 'N/A'}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Non-Owned Autos Only</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(coverage.auto_non_owned_autos_only as string | undefined) || 'N/A'}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Scheduled Autos</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(coverage.auto_scheduled_autos as string | undefined) || 'N/A'}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per person)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodily_injury_per_person))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodily_injury_per_accident))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Property Damage (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.property_damage_per_accident))}</td></tr>
            <tr><td style="padding:8px;">Combined Single Limit</td><td style="padding:8px;">${formatCurrencyDisplay(parseCurrencyValue(coverage.combined_single_limit))}</td></tr>
          </tbody>
        </table>
      </div>
    `
  }

  if (insuranceType === 'commercial-property') {
    return `
      <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(insuranceType)} Limits</strong>
        <table style="width:100%; border-collapse: collapse; font-size:12px;">
          <tbody>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; width:55%;">Building Limit</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.property_building_limit))}</td></tr>
            <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Business Personal Property</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.property_personal_property_limit))}</td></tr>
            <tr><td style="padding:8px;">Deductible</td><td style="padding:8px;">${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</td></tr>
          </tbody>
        </table>
      </div>
    `
  }

  // Para seguros personales, mostrar detalles de cobertura
  if (coverage.coverage_details) {
    return `
      <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(insuranceType)} Coverage Details</strong>
        <p style="margin:0; font-size:12px; line-height: 1.6;">${coverage.coverage_details}</p>
        ${coverage.deductible ? `<p style="margin:8px 0 0 0; font-size:12px;"><strong>Deductible:</strong> ${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</p>` : ''}
        ${coverage.coverage_limit ? `<p style="margin:4px 0 0 0; font-size:12px;"><strong>Coverage Limit:</strong> ${formatCurrencyDisplay(parseCurrencyValue(coverage.coverage_limit))}</p>` : ''}
      </div>
    `
  }

  return `
    <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
      <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(insuranceType)} Details</strong>
      <p style="margin:0; font-size:12px;">${coverage.deductible ? `Deductible: ${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}` : 'No specific limits entered.'}</p>
    </div>
  `
}

const generateContractPDF = (contract: Record<string, unknown>, coverages: Record<string, unknown>[]) => {
  const coverageRows = coverages.map((coverage) => `
    <tr>
      <td>${getInsuranceTypeLabel(coverage.insurance_type as string)}</td>
      <td>${(coverage.policy_number as string | undefined) || ''}</td>
      <td>${(coverage.effective_date as string | undefined) || ''}</td>
      <td>${(coverage.expiration_date as string | undefined) || 'N/A'}</td>
      <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.each_occurrence))}</td>
      <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.general_aggregate))}</td>
      <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</td>
    </tr>
  `).join('')
  const coverageSections = coverages.map((coverage) => generateCoverageDetailsHTML(coverage)).join('')

  const totalPremium = parseCurrencyValue(contract.total_premium) || 0
  const downPayment = parseCurrencyValue(contract.down_payment) || 0
  const unpaidBalance = parseCurrencyValue(contract.unpaid_balance) || (totalPremium - downPayment)
  const monthlyPayment = parseCurrencyValue(contract.monthly_payment) || 0
  const numberOfPayments = Number(contract.number_of_payments) || 0
  const financeCharge = parseCurrencyValue(contract.finance_charge) || 0
  const amountFinanced = parseCurrencyValue(contract.amount_financed) || (unpaidBalance + financeCharge)
  const totalOfPayments = monthlyPayment * numberOfPayments

  const clientSignature = contract.client_signature as string | null
  const clientSignatureDate = contract.client_signature_date as string | null
  const agentSignature = contract.agent_signature as string | null
  const agentSignatureDate = contract.agent_signature_date as string | null

  return `
      <html>
      <head>
        <style>
          @page { size: letter; margin: 0.5in; }
          body {
            margin: 0;
            font-family: 'Inter', Arial, sans-serif;
            background: #f8fafc;
            color: #1f2937;
          }
          .document {
            max-width: 7.5in;
            margin: 0 auto;
            padding: 24px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
          }
          .top-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .company-title {
            margin: 0;
            font-size: 28px;
            font-weight: 900;
          }
          .contract-title {
            margin: 6px 0 0;
            font-size: 11px;
            color: #334155;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
          }
          .company-contact {
            margin-top: 12px;
            font-size: 11px;
            color: #475569;
            line-height: 1.75;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          .meta strong {
            display: block;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .section {
            margin-bottom: 24px;
          }
          .section-heading {
            margin: 0 0 14px;
            font-size: 11px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #0f172a;
            font-weight: 700;
          }
          .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }
          .panel {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            color: #334155;
          }
          th,
          td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            text-align: left;
          }
          td.value {
            text-align: right;
            font-weight: 700;
          }
          tr.highlight {
            background: #fef3c7;
          }
          .info-note {
            margin-top: 18px;
            padding: 16px;
            border-radius: 16px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            color: #475569;
            line-height: 1.8;
            font-size: 11px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .signature {
            font-size: 12px;
          }
          .signature-line {
            height: 56px;
            border-bottom: 1px solid #0f172a;
            margin-bottom: 8px;
            display:flex;
            align-items:center;
            justify-content:center;
          }
          .signature-line img {
            max-height:100%;
            max-width:100%;
          }
          .signature small {
            color: #64748b;
          }
          .terms {
            font-family: 'Georgia', serif;
            font-size: 11px;
            line-height: 1.85;
            color: #334155;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 24px;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="top-header">
            <div>
              <p class="company-title">Olimpo Coverage Group</p>
              <p class="contract-title">${getInsuranceTypeLabel(contract.insurance_type as string)}</p>
              <p class="company-contact">Horsham PA, USA · Phone: (445) 325-0112 · Email: contacto@olimpocoveragegroup.com</p>
            </div>
            <div class="meta">
              <strong>Agreement #</strong>
              <span>${(contract.contract_number as string | undefined) || ''}</span>
              <strong style="margin-top: 12px;">Policy #</strong>
              <span>${(contract.policy_number as string | undefined) || ''}</span>
              <strong style="margin-top: 12px;">Date</strong>
              <span>${(contract.contract_date as string | undefined) || new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div class="section">
            <p class="section-heading">Parties</p>
            <div class="two-column">
              <div class="panel">
                <strong>Insured</strong>
                <p>${(contract.client_company_name as string | undefined) || (contract.client_name as string | undefined) || ''}</p>
                <p>${(contract.client_address as string | undefined) || ''}</p>
                <p>${(contract.client_city as string | undefined) || ''}${(contract.client_city as string | undefined) ? ', ' : ''}${(contract.client_state as string | undefined) || ''} ${(contract.client_zip as string | undefined) || ''}</p>
                <p>Phone: ${(contract.client_phone as string | undefined) || ''}</p>
                <p>Email: ${(contract.client_email as string | undefined) || ''}</p>
              </div>
              <div class="panel">
                <strong>Agent / Producer</strong>
                <p>Olimpo Coverage Group</p>
                <p>Horsham PA, USA</p>
                <p>Phone: (445) 325-0112</p>
                <p>Email: contacto@olimpocoveragegroup.com</p>
              </div>
            </div>
          </div>

          <div class="section">
            <p class="section-heading">Coverages Provided</p>
            ${coverages.length ? `
            <table>
              <thead>
                <tr>
                  <th>Coverage Type</th>
                  <th>Policy #</th>
                  <th>Effective Date</th>
                  <th>Expiration Date</th>
                  <th>Deductible</th>
                  <th>Coverage Limit</th>
                </tr>
              </thead>
              <tbody>
                ${coverages.map((coverage) => `
                  <tr>
                    <td>${getInsuranceTypeLabel(coverage.insurance_type as string)}</td>
                    <td>${(coverage.policy_number as string | undefined) || ''}</td>
                    <td>${(coverage.effective_date as string | undefined) || ''}</td>
                    <td>${(coverage.expiration_date as string | undefined) || 'N/A'}</td>
                    <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</td>
                    <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.coverage_limit))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : `<p>No coverages listed.</p>`}
          </div>

          ${coverageSections}

          <div class="section">
            <p class="section-heading">Agreement Summary</p>
            <table>
              <thead>
                <tr>
                  <th>Total Premium</th>
                  <th>Down Payment</th>
                  <th>Unpaid Balance</th>
                  <th>Finance Charge %</th>
                  <th>Finance Charge</th>
                  <th>Amount Financed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="value">${formatCurrencyDisplay(totalPremium)}</td>
                  <td class="value">${formatCurrencyDisplay(downPayment)}</td>
                  <td class="value">${formatCurrencyDisplay(unpaidBalance)}</td>
                  <td class="value">${(contract.finance_charge_percent as number | undefined) || '0'}%</td>
                  <td class="value">${formatCurrencyDisplay(financeCharge)}</td>
                  <td class="value">${formatCurrencyDisplay(amountFinanced)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <p class="section-heading">Payment Schedule</p>
            <table>
              <thead>
                <tr>
                  <th>Monthly Payment</th>
                  <th>Number of Payments</th>
                  <th>First Due Date</th>
                  <th>Total of Payments</th>
                </tr>
              </thead>
              <tbody>
                <tr class="highlight">
                  <td class="value">${formatCurrencyDisplay(monthlyPayment)}</td>
                  <td class="value">${numberOfPayments}</td>
                  <td class="value">${(contract.first_due_date as string | undefined) || ''}</td>
                  <td class="value">${formatCurrencyDisplay(totalOfPayments)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="info-note">
            The undersigned agrees that all premiums are due in accordance with the payment schedule above. Failure to pay may result in cancellation of coverage, acceleration of the contract, and applicable collection charges.
          </div>

          <div class="section">
            <p class="section-heading">Terms and Conditions</p>
            <div class="terms">${(contract.terms as string | undefined) || ''}</div>
          </div>

          <div class="signatures">
            <div class="signature">
              <div class="signature-line">
                ${clientSignature ? `<img src="${clientSignature}" alt="Client Signature"/>` : ''}
              </div>
              <strong>Insured Signature</strong>
              <small>Date: ${clientSignatureDate || '________________________'}</small>
            </div>
            <div class="signature">
              <div class="signature-line">
                ${agentSignature ? `<img src="${agentSignature}" alt="Agent Signature"/>` : `
                <svg width="100" height="50" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 15 C30 5 70 5 90 15" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 25 C20 10 40 40 60 20 C80 0 95 35 90 25" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 30 C25 15 45 45 65 25 C85 5 90 40 85 30" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 10 L85 40" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                `}
              </div>
              <strong>Authorized Agent - Olimpo Coverage Group</strong>
              <small>Date: ${agentSignatureDate || new Date().toLocaleDateString()}</small>
            </div>
          </div>

          <div class="footer">Agreement # ${(contract.contract_number as string | undefined) || ''}</div>
        </div>

        <!-- Receipt Page (Down Payment) -->
        <div style="page-break-before: always; max-width:7.5in; margin: 0 auto; padding:24px; background: white; border: 1px solid #e2e8f0; border-radius: 18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div>
              <p style="margin:0; font-size:28px; font-weight:900;">RECEIPT</p>
              <p style="margin:6px 0 0; font-size:12px; color:#475569;">Olimpo Coverage Group</p>
            </div>
            <div style="text-align:right; font-size:12px; color:#475569;">
              <div>Date: ${(contract.contract_date as string | undefined) || new Date().toLocaleDateString()}</div>
              <div>Receipt #: ${(contract.contract_number as string | undefined) || ''}</div>
            </div>
          </div>

          <div style="display:flex; gap:18px; margin-bottom:12px; font-size:13px; color:#334155;">
            <div style="flex:1;">
              <strong>Payor</strong><br/>
              ${(contract.client_company_name as string | undefined) || (contract.client_name as string | undefined) || 'N/A'}<br/>
              ${(contract.client_address as string | undefined) || ''}<br/>
              ${(contract.client_city as string | undefined) || ''}${(contract.client_city as string | undefined) ? ', ' : ''}${(contract.client_state as string | undefined) || ''} ${(contract.client_zip as string | undefined) || ''}
            </div>
            <div style="flex:1;">
              <strong>Payee</strong><br/>
              Olimpo Coverage Group<br/>
              Horsham PA, USA
            </div>
          </div>

          <div style="border:2px solid #0f172a; padding:12px; text-align:right; font-size:18px; font-weight:700; margin-bottom:12px;">
            Total Amount Paid: ${formatCurrencyDisplay(downPayment)}
          </div>

          <div style="font-size:12px; color:#475569;">
            <p style="margin:0 0 8px 0;">Payment Method: Card (number not stored) — Billing address shown above.</p>
            <p style="margin:0;">This receipt acknowledges payment of the Down Payment shown. Retain for your records.</p>
          </div>
        </div>

      </body>
      </html>
    `
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contractQuery: any = await (supabaseAdmin as unknown as any).from('contracts').select('*').eq('id', id).single()
    const contract: Record<string, unknown> | null = contractQuery.data
    const contractError = contractQuery.error

    console.log('Document route: Contract data', { contractId: id, contract, contractError })

    if (contractError || !contract) {
      return NextResponse.json({ success: false, message: 'Contract not found' }, { status: 404 })
    }

    // Obtener coberturas de la tabla 'coverages' asociadas a este contrato
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coveragesQuery: any = await (supabaseAdmin as unknown as any)
      .from('coverages')
      .select('*')
      .eq('contract_id', id)
    const coveragesData = coveragesQuery.data as Record<string, unknown>[] | null
    const coveragesError = coveragesQuery.error
    
    console.log('Document route: Coverages from DB', { coveragesCount: coveragesData?.length || 0, coverages: coveragesData, coveragesError })
    
    const coverages = coveragesData || []

    const html = generateContractPDF(contract, coverages)

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    console.error('contract document route failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load contract document' }, { status: 500 })
  }
}
