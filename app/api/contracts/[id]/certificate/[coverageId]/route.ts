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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; coverageId: string }> }) {
  try {
    const { id: contractId, coverageId } = await params

    const [
      { data: contract, error: contractError },
      { data: coverage, error: coverageError },
      { data: vehicles, error: vehiclesError }
    ] = await Promise.all([
      supabaseAdmin.from('contracts').select('*').eq('id', contractId).single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>,
      supabaseAdmin.from('coverages').select('*').eq('id', coverageId).single() as unknown as Promise<{ data: Record<string, unknown> | null; error: unknown }>,
      supabaseAdmin.from('vehicles').select('*').eq('contract_id', contractId).order('created_at', { ascending: true }) as unknown as Promise<{ data: any[] | null; error: unknown }>
    ])

    if (contractError || !contract) {
      return NextResponse.json({ success: false, message: 'Contract not found' }, { status: 404 })
    }

    if (coverageError || !coverage) {
      return NextResponse.json({ success: false, message: 'Coverage not found' }, { status: 404 })
    }

    let html: string
    if ((coverage.insurance_type as string) === 'commercial-auto') {
      const vehiclesList = vehicles && vehicles.length > 0 ? vehicles : [{ year: '', make: '', model: '', vin: '' }]
      const vehiclePages = vehiclesList.map((v: any, index: number) => `
        <div style="page-break-after: ${index < vehiclesList.length - 1 ? 'always' : 'avoid'};">
          <div class="document">
            <div class="header">
              <div>
                <p class="company">Olimpo Coverage Group</p>
                <p class="text-sm text-slate-600 mt-1">Horsham PA, USA · (445) 325-0112</p>
              </div>
              <div class="meta">
                <strong>Agreement #</strong>
                <span>${contract.contract_number as string}</span>
                <strong style="margin-top: 12px;">Date</strong>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <h3 class="text-xs font-bold uppercase text-slate-800 mb-4">Pennsylvania Financial Responsibility Identification Card</h3>
                <p class="text-xs text-slate-700 mb-4">This card must be shown to any Law Enforcement Officer upon request.</p>
                <p class="text-xs font-semibold uppercase text-slate-800 mb-2">Agency / Insurer Name</p>
                <p class="font-semibold text-slate-900">Olimpo Coverage Group</p>
                <p class="text-xs mt-1 text-slate-700">To report a claim call: (445) 325-0112</p>
                <p class="text-xs font-semibold uppercase text-slate-800 mt-3">NOT VALID MORE THAN 1 YEAR FROM EFFECTIVE DATE</p>
                <div class="mt-4">
                  <p class="text-xs font-semibold text-slate-700">Policy #</p>
                  <p class="font-semibold">${coverage.policy_number as string}</p>
                  <p class="text-xs font-semibold text-slate-700 mt-1">Policy Period:</p>
                  <p class="font-semibold">${coverage.effective_date as string} - ${(coverage.expiration_date as string) || 'N/A'}</p>
                </div>
                <div class="mt-6">
                  <p class="text-xs font-semibold text-slate-700 mb-1">Insured:</p>
                  <p class="font-semibold">${contract.client_company_name as string}</p>
                  <p class="text-sm text-slate-700">${contract.client_address as string}</p>
                  <p class="text-sm text-slate-700">${contract.client_city as string}, ${contract.client_state as string} ${contract.client_zip as string}</p>
                </div>
                <div class="mt-6">
                  <p class="text-xs font-semibold text-slate-700 mb-2">Your Agent: Olimpo Coverage Group at (445) 325-0112</p>
                  <p class="text-xs font-semibold uppercase text-slate-800 mb-2">Applicable with respect to the following motor vehicles:</p>
                  <div class="grid grid-cols-4 gap-2 text-xs font-semibold mb-2">
                    <div>Year</div>
                    <div>Make</div>
                    <div>Model</div>
                    <div>Vehicle Identification</div>
                  </div>
                  <div class="grid grid-cols-4 gap-2 text-xs">
                    <div>${v.year || ''}</div>
                    <div>${v.make || ''}</div>
                    <div>${v.model || ''}</div>
                    <div class="font-mono">${v.vin || ''}</div>
                  </div>
                </div>
                <div class="mt-6">
                  <p class="text-xs font-semibold text-slate-800">SEE IMPORTANT MESSAGE ON REVERSE SIDE</p>
                </div>
                <div class="mt-4 w-40 h-12 border-b border-slate-900 flex items-end justify-center">
                  <svg width="100" height="50" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 15 C30 5 70 5 90 15" stroke="black" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 25 C20 10 40 40 60 20 C80 0 95 35 90 25" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 30 C25 15 45 45 65 25 C85 5 90 40 85 30" stroke="black" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M15 10 L85 40" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>

              <div class="border-l border-dashed border-slate-400 pl-4">
                <h3 class="text-sm font-bold text-slate-800 mb-4">THIS CARD MUST BE CARRIED FOR PRODUCTION UPON DEMAND. IT IS SUGGESTED THAT YOU CARRY THIS CARD IN THE INSURED VEHICLE.</h3>
                <div class="mb-6">
                  <p class="text-sm font-bold text-red-700 uppercase mb-1">WARNING:</p>
                  <p class="text-xs text-slate-800">
                    Any owner or registrant of a motor vehicle who drives or permits a motor vehicle to be driven in this State without the required financial responsibility may have his registration suspended or revoked.
                  </p>
                </div>
                <div class="mb-6">
                  <p class="text-xs font-bold uppercase text-slate-800 mb-2">NOTE: THIS CARD IS REQUIRED WHEN:</p>
                  <ul class="text-xs text-slate-800 list-disc pl-4 space-y-1">
                    <li>You are involved in an auto accident.</li>
                    <li>You are convicted of a traffic offense other than a parking offense that requires a court appearance.</li>
                    <li>You are stopped for violating any provision of 75 Pa.C.S. relating to the Vehicle Code and requested to produce it by a police officer.</li>
                  </ul>
                </div>
                <div>
                  <p class="text-xs text-slate-700">
                    You must provide a copy of this card to the Department of Transportation when you request restoration of your operating privilege and/or registration privilege which has been previously suspended or revoked.
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-6">
              <h3 class="text-sm font-bold uppercase text-slate-800 mb-3">Important Notice Regarding Your Financial Responsibility Identification Card</h3>
              <p class="text-sm text-slate-800 mb-3">
                Agency / Insurer Name of MD, Inc. is required by Pennsylvania law to send you an I.D. card. The card shows that an insurance policy has been issued for the vehicle(s) described satisfying the financial responsibility requirements of the law.
              </p>
              <p class="text-sm text-slate-800 mb-3">
                If you lose the card, contact your insurance company or agent for a replacement.
              </p>
              <p class="text-sm text-slate-800 mb-3">
                The I.D. card information may be used for vehicle registration and replacing license plates. If your liability insurance policy is not in effect, the I.D. card is no longer valid.
              </p>
              <p class="text-sm text-slate-800">
                You are required to maintain financial responsibility on your vehicle. It is against Pennsylvania law to use the I.D. card fraudulently such as using the card as proof of financial responsibility after the insurance policy is terminated.
              </p>
            </div>
          </div>
        </div>
      `).join('')

      html = `
      <html>
      <head>
        <style>
          @page { size: letter; margin: 0.5in; }
          body {
            margin: 0;
            font-family: 'Inter', Arial, sans-serif;
            background: white;
            color: #0f172a;
            font-size: 13px;
          }
          .document {
            max-width: 8in;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            border-bottom: 1px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .company {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
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
          .grid {
            display: grid;
          }
          .grid-cols-2 {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .grid-cols-4 {
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
          .border {
            border: 1px solid #d1d5db;
          }
          .border-l {
            border-left: 1px dashed #9ca3af;
            padding-left: 20px;
          }
          .rounded-lg {
            border-radius: 8px;
          }
          .p-4 {
            padding: 16px;
          }
          .p-3 {
            padding: 12px;
          }
          .mb-4 {
            margin-bottom: 16px;
          }
          .mb-2 {
            margin-bottom: 8px;
          }
          .mb-1 {
            margin-bottom: 4px;
          }
          .mt-6 {
            margin-top: 24px;
          }
          .mt-4 {
            margin-top: 16px;
          }
          .text-xs {
            font-size: 11px;
          }
          .text-sm {
            font-size: 12px;
          }
          .uppercase {
            text-transform: uppercase;
          }
          .font-bold {
            font-weight: 700;
          }
          .font-semibold {
            font-weight: 600;
          }
          .font-mono {
            font-family: monospace;
          }
          .text-red-700 {
            color: #b91c1c;
          }
          .flex {
            display: flex;
          }
          .justify-between {
            justify-content: space-between;
          }
          .justify-center {
            justify-content: center;
          }
          .items-end {
            align-items: flex-end;
          }
          .w-40 {
            width: 160px;
          }
          .h-12 {
            height: 48px;
          }
          .border-b {
            border-bottom: 1px solid #0f172a;
          }
          .max-w-sm {
            max-width: 384px;
          }
        </style>
      </head>
      <body>
        ${vehiclePages}
      </body>
      </html>
    `
    } else {
      // For General Liability, Commercial Property, Workers Comp: ACORD 25 style
      const formatCurrency = (val: unknown): string => {
        const num = parseCurrencyValue(val);
        if (num == null) return '';
        return `$${num.toLocaleString('en-US')}`;
      };
      const formatCurrencyOrEmpty = (val: unknown): string => {
        const num = parseCurrencyValue(val);
        if (num == null) return '';
        return `$${num.toLocaleString('en-US')}`;
      };

      html = `
      <html>
      <head>
        <style>
          @page { size: letter; margin: 0.25in; }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            font-family: 'Arial', sans-serif;
            background: white;
            color: #000;
            font-size: 10pt;
            line-height: 1.2;
          }
          .certificate {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.25in;
          }
          .header {
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .company-name {
            font-size: 24pt;
            font-weight: bold;
            color: #000;
          }
          .title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            flex-grow: 1;
            margin: 0 20px;
          }
          .date {
            text-align: right;
            font-size: 9pt;
          }
          .section {
            margin-bottom: 8px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 8px;
          }
          .field {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .field-label {
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #333;
          }
          .field-value {
            font-size: 10pt;
            border: 1px solid #000;
            padding: 4px 6px;
            min-height: 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: left;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
            font-size: 8pt;
            text-transform: uppercase;
          }
          .notice {
            font-size: 8pt;
            line-height: 1.3;
            margin: 8px 0;
          }
          .signature-area {
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            gap: 20px;
          }
          .signature-block {
            flex: 1;
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <div class="company-name">OLIMPO COVERAGE GROUP</div>
            <div class="title">CERTIFICATE OF LIABILITY INSURANCE</div>
            <div class="date">DATE: ${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
          </div>

          <div class="notice">
            THIS CERTIFICATE IS ISSUED AS A MATTER OF INFORMATION ONLY AND CONFERS NO RIGHTS UPON THE CERTIFICATE HOLDER. THIS CERTIFICATE DOES NOT AFFIRMATIVELY OR NEGATIVELY AMEND, EXTEND OR ALTER THE COVERAGE AFFORDED BY THE POLICIES BELOW. THIS CERTIFICATE OF INSURANCE DOES NOT CONSTITUTE A CONTRACT BETWEEN THE ISSUING INSURER(S), AUTHORIZED REPRESENTATIVE OR PRODUCER, AND THE CERTIFICATE HOLDER.
          </div>

          <div class="grid-2 section">
            <div>
              <div class="field">
                <span class="field-label">Producer</span>
                <div class="field-value">Olimpo Coverage Group<br>2600 W Executive Pkwy, Ste 500<br>Lehi, UT 84043</div>
              </div>
            </div>
            <div>
              <div class="grid-2">
                <div class="field">
                  <span class="field-label">Contact Name</span>
                  <div class="field-value">Bennito Gonzalez</div>
                </div>
                <div class="field">
                  <span class="field-label">Phone</span>
                  <div class="field-value">(445) 325-0112</div>
                </div>
              </div>
              <div class="grid-2" style="margin-top: 4px;">
                <div class="field">
                  <span class="field-label">Email Adr</span>
                  <div class="field-value">contacto@olimpocoveragegroup.com</div>
                </div>
                <div class="field">
                  <span class="field-label">Fax</span>
                  <div class="field-value"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid-2 section">
            <div class="field">
              <span class="field-label">Insured</span>
              <div class="field-value">
                ${contract.client_company_name as string}<br>
                ${contract.client_address as string}<br>
                ${contract.client_city as string}, ${contract.client_state as string} ${contract.client_zip as string}
              </div>
            </div>
            <div>
              <div class="field">
                <span class="field-label">Insurer(s) Affording Coverage</span>
                <div class="field-value">
                  <div style="border-bottom:1px solid #ccc; padding-bottom:4px; margin-bottom:4px;"><span style="font-size:8pt; font-weight:bold;">A:</span> Olimpo Coverage Group</div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid-2 section">
            <div class="field">
              <span class="field-label">Certificate Number</span>
              <div class="field-value">${coverage.id as string}</div>
            </div>
            <div class="field">
              <span class="field-label">Revision Number</span>
              <div class="field-value"></div>
            </div>
          </div>

          <table class="section">
            <thead>
              <tr>
                <th style="width: 8%;">INSR LTR</th>
                <th style="width: 20%;">TYPE OF INSURANCE</th>
                <th style="width: 10%;">ADDL INSRD</th>
                <th style="width: 8%;">SUBR WVD</th>
                <th style="width: 15%;">POLICY NUMBER</th>
                <th style="width: 12%;">POLICY EFF</th>
                <th style="width: 12%;">POLICY EXP</th>
                <th style="width: 15%;">LIMITS</th>
              </tr>
            </thead>
            <tbody>
              ${
                (coverage.insurance_type as string) === 'general-liability' ? `
                  <tr>
                    <td>A</td>
                    <td>X  COMMERCIAL GENERAL LIABILITY</td>
                    <td></td>
                    <td></td>
                    <td>${coverage.policy_number as string}</td>
                    <td>${coverage.effective_date as string}</td>
                    <td>${(coverage.expiration_date as string) || 'N/A'}</td>
                    <td>
                      <table style="width:100%; border:none; margin:0; padding:0;">
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">EACH OCCURRENCE</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.each_occurrence)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">DMG TO RENTED PREMISES (Ea occurrence)</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.damage_to_rented_premises)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">MED EXP (Any one person)</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.med_exp)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">PERSONAL & ADV INJURY</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.personal_adv_injury)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">GENERAL AGGREGATE</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.general_aggregate)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">PRODUCTS-COMP/OPS AGG</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.products_completed_ops_agg)}</td></tr>
                      </table>
                    </td>
                  </tr>
                ` : ''
              }
              ${
                (coverage.insurance_type as string) === 'commercial-property' ? `
                  <tr>
                    <td>A</td>
                    <td>X  COMMERCIAL PROPERTY</td>
                    <td></td>
                    <td></td>
                    <td>${coverage.policy_number as string}</td>
                    <td>${coverage.effective_date as string}</td>
                    <td>${(coverage.expiration_date as string) || 'N/A'}</td>
                    <td>
                      <table style="width:100%; border:none; margin:0; padding:0;">
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">BUILDING LIMIT</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.property_building_limit)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">BUSINESS PERSONAL PROPERTY</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.property_personal_property_limit)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">DEDUCTIBLE</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.deductible)}</td></tr>
                      </table>
                    </td>
                  </tr>
                ` : ''
              }
              ${
                (coverage.insurance_type as string) === 'workers-comp' ? `
                  <tr>
                    <td>A</td>
                    <td>X  WORKERS COMPENSATION AND EMPLOYERS LIABILITY</td>
                    <td></td>
                    <td></td>
                    <td>${coverage.policy_number as string}</td>
                    <td>${coverage.effective_date as string}</td>
                    <td>${(coverage.expiration_date as string) || 'N/A'}</td>
                    <td>
                      <table style="width:100%; border:none; margin:0; padding:0;">
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">E.L. EACH ACCIDENT</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.el_each_accident)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">E.L. DISEASE - EA EMPLOYEE</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.el_disease_ea_employee)}</td></tr>
                        <tr style="border:none;"><td style="border:none; padding:2px 0;">E.L. DISEASE - POLICY LIMIT</td><td style="border:none; padding:2px 0; text-align:right;">${formatCurrencyOrEmpty(coverage.el_disease_policy_limit)}</td></tr>
                      </table>
                    </td>
                  </tr>
                ` : ''
              }
            </tbody>
          </table>

          <div class="notice">
            DESCRIPTION OF OPERATIONS / LOCATIONS / VEHICLES (Attach ACORD 101, Additional Remarks Schedule, if more space is required)
          </div>

          <div class="grid-2 section">
            <div class="field">
              <span class="field-label">Certificate Holder</span>
              <div class="field-value">
                ${(coverage.certificate_holder_name as string) || 'N/A'}${(coverage.certificate_holder_address as string) ? `<br>${coverage.certificate_holder_address as string}` : ''}
              </div>
            </div>
            <div class="field">
              <span class="field-label">Cancellation</span>
              <div class="field-value">
                SHOULD ANY OF THE ABOVE DESCRIBED POLICIES BE CANCELLED BEFORE THE EXPIRATION DATE THEREOF, NOTICE WILL BE DELIVERED IN ACCORDANCE WITH THE POLICY PROVISIONS.
              </div>
            </div>
          </div>

          <div class="signature-area">
            <div class="signature-block">
              <div class="field">
                <span class="field-label">Authorized Representative</span>
                <div class="field-value" style="border: none; border-bottom:1px solid #000; height:32px; position:relative; padding-top:12px;">
                  <svg width="100" height="30" viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 10 C30 5 70 5 90 10" stroke="black" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 18 C20 8 40 28 60 15 C80 2 95 22 90 18" stroke="black" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 22 C25 12 45 27 65 18 C85 8 90 25 85 22" stroke="black" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div style="text-align:center; font-size:8pt; margin-top:12px;">
            Olimpo Coverage Group (2026)
          </div>
        </div>
      </body>
      </html>
    `
    }

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    console.error('certificate route failed', error)
    return NextResponse.json({ success: false, message: 'Unable to load certificate' }, { status: 500 })
  }
}
