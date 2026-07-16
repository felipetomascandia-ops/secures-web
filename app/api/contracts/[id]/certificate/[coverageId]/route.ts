import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const fmt = (value: unknown): string => {
  if (value == null || value === '') return ''
  const s = String(value).trim().replace(/[^\d.-]/g, '')
  const n = Number(s)
  if (!Number.isFinite(n)) return ''
  return `$${n.toLocaleString('en-US')}`
}

const str = (v: unknown, fallback = ''): string =>
  v != null && String(v).trim() ? String(v).trim() : fallback

/** Shared CSS used by every personal-insurance certificate */
const BASE_CSS = `
  @page { size: letter; margin: 0.4in; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Arial, sans-serif; background:#fff; color:#0f172a; font-size:11pt; }
  .cert { max-width:7.5in; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:flex-start;
            border-bottom:3px solid #1e3a8a; padding-bottom:12px; margin-bottom:18px; }
  .brand { font-size:20pt; font-weight:700; color:#1e3a8a; }
  .brand-sub { font-size:9pt; color:#475569; margin-top:2px; }
  .doc-title { font-size:15pt; font-weight:700; text-transform:uppercase;
               text-align:center; flex-grow:1; margin:0 16px; color:#1e3a8a; }
  .doc-date { text-align:right; font-size:9pt; color:#475569; }
  .badge { display:inline-block; background:#1e3a8a; color:#fff; font-size:9pt;
           font-weight:700; border-radius:20px; padding:3px 14px; margin-bottom:14px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px; }
  .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:12px; }
  .box { border:1px solid #cbd5e1; border-radius:6px; padding:10px 12px; }
  .lbl { font-size:7pt; font-weight:700; text-transform:uppercase; color:#64748b; margin-bottom:3px; }
  .val { font-size:11pt; font-weight:600; color:#0f172a; }
  .val-sm { font-size:9pt; color:#334155; }
  .section-title { font-size:9pt; font-weight:700; text-transform:uppercase;
                   color:#1e3a8a; letter-spacing:.08em; margin:14px 0 8px; border-bottom:1px solid #bfdbfe; padding-bottom:4px; }
  table { width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:12px; }
  th { background:#e0e7ff; color:#1e3a8a; font-weight:700; text-align:left;
       padding:6px 8px; font-size:8pt; text-transform:uppercase; }
  td { padding:6px 8px; border-bottom:1px solid #e2e8f0; }
  .notice { font-size:8pt; color:#475569; line-height:1.5; background:#f8fafc;
            border:1px solid #e2e8f0; border-radius:6px; padding:10px 12px; margin-bottom:12px; }
  .sig-line { border-top:1px solid #0f172a; margin-top:40px; padding-top:4px;
              font-size:8pt; color:#475569; }
  .footer { text-align:center; font-size:8pt; color:#94a3b8; margin-top:16px; }
`

/** Wrap body content in the shared HTML shell */
const shell = (title: string, badge: string, body: string): string => `
<html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
<div class="cert">
  <div class="header">
    <div>
      <div class="brand">OLIMPO COVERAGE GROUP</div>
      <div class="brand-sub">Horsham PA, USA · (445) 325-0112 · contacto@olimpocoveragegroup.com</div>
    </div>
    <div class="doc-title">${title}</div>
    <div class="doc-date">DATE: ${new Date().toLocaleDateString('en-US')}</div>
  </div>
  <div><span class="badge">${badge}</span></div>
  ${body}
  <div class="footer">Olimpo Coverage Group © ${new Date().getFullYear()} · This certificate is issued for informational purposes only.</div>
</div>
</body></html>`

// ---------------------------------------------------------------------------
// Templates per insurance type
// ---------------------------------------------------------------------------

function tplPersonalAuto(c: Record<string,unknown>, cov: Record<string,unknown>): string {
  return shell('PERSONAL AUTO INSURANCE CERTIFICATE', '🚗 Personal Auto', `
  <div class="notice">
    This certificate confirms that the named insured holds an active personal auto insurance policy
    with Olimpo Coverage Group. Present this document when required by law enforcement or third parties.
  </div>
  <div class="grid2">
    <div class="box"><div class="lbl">Named Insured</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}</div>
      <div class="val-sm">${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
    <div class="box"><div class="lbl">Policy Number</div><div class="val">${str(cov.policy_number)}</div>
      <div class="lbl" style="margin-top:8px">Policy Period</div>
      <div class="val-sm">${str(cov.effective_date)} – ${str(cov.expiration_date,'N/A')}</div></div>
  </div>
  <div class="grid3">
    <div class="box"><div class="lbl">Coverage Limit</div><div class="val">${fmt(cov.coverage_limit)||str(cov.coverage_details)}</div></div>
    <div class="box"><div class="lbl">Deductible</div><div class="val">${fmt(cov.deductible)}</div></div>
    <div class="box"><div class="lbl">Contract #</div><div class="val">${str(c.contract_number)}</div></div>
  </div>
  <div class="section-title">Coverage Details</div>
  <div class="notice">${str(cov.coverage_details,'Liability, collision and comprehensive coverage as per policy terms.')}</div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

function tplMotorcycle(c: Record<string,unknown>, cov: Record<string,unknown>): string {
  return shell('MOTORCYCLE INSURANCE CERTIFICATE', '🏍️ Motorcycle', `
  <div class="notice">
    This certificate confirms active motorcycle insurance coverage issued by Olimpo Coverage Group
    for the named insured. Keep this document with you while operating the insured vehicle.
  </div>
  <div class="grid2">
    <div class="box"><div class="lbl">Named Insured</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}, ${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
    <div class="box"><div class="lbl">Policy Number</div><div class="val">${str(cov.policy_number)}</div>
      <div class="lbl" style="margin-top:8px">Policy Period</div>
      <div class="val-sm">${str(cov.effective_date)} – ${str(cov.expiration_date,'N/A')}</div></div>
  </div>
  <div class="grid3">
    <div class="box"><div class="lbl">Coverage Limit</div><div class="val">${fmt(cov.coverage_limit)||str(cov.coverage_details,'—')}</div></div>
    <div class="box"><div class="lbl">Deductible</div><div class="val">${fmt(cov.deductible)}</div></div>
    <div class="box"><div class="lbl">Contract #</div><div class="val">${str(c.contract_number)}</div></div>
  </div>
  <div class="section-title">Coverage Details</div>
  <div class="notice">${str(cov.coverage_details,'Liability, collision and comprehensive coverage for the insured motorcycle.')}</div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

function tplPet(c: Record<string,unknown>, cov: Record<string,unknown>): string {
  return shell('PET INSURANCE CERTIFICATE', '🐕 Pet Insurance', `
  <div class="notice">
    This certificate confirms active pet insurance coverage issued by Olimpo Coverage Group.
    Present this document to your veterinarian or when filing a claim.
  </div>
  <div class="grid2">
    <div class="box"><div class="lbl">Policy Holder</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}, ${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
    <div class="box"><div class="lbl">Policy Number</div><div class="val">${str(cov.policy_number)}</div>
      <div class="lbl" style="margin-top:8px">Policy Period</div>
      <div class="val-sm">${str(cov.effective_date)} – ${str(cov.expiration_date,'N/A')}</div></div>
  </div>
  <div class="grid3">
    <div class="box"><div class="lbl">Annual Limit</div><div class="val">${fmt(cov.coverage_limit)||str(cov.coverage_details,'—')}</div></div>
    <div class="box"><div class="lbl">Deductible</div><div class="val">${fmt(cov.deductible)}</div></div>
    <div class="box"><div class="lbl">Contract #</div><div class="val">${str(c.contract_number)}</div></div>
  </div>
  <div class="section-title">What's Covered</div>
  <table>
    <thead><tr><th>Coverage Area</th><th>Included</th></tr></thead>
    <tbody>
      <tr><td>Accidents &amp; Injuries</td><td>✓ Yes</td></tr>
      <tr><td>Illnesses &amp; Disease</td><td>✓ Yes</td></tr>
      <tr><td>Emergency Veterinary Care</td><td>✓ Yes</td></tr>
      <tr><td>Surgeries &amp; Hospitalization</td><td>✓ Yes</td></tr>
      <tr><td>Prescription Medications</td><td>✓ Yes</td></tr>
    </tbody>
  </table>
  <div class="notice">${str(cov.coverage_details,'Coverage subject to policy terms, conditions, and applicable deductibles.')}</div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

function tplMobileDevice(c: Record<string,unknown>, cov: Record<string,unknown>): string {
  return shell('MOBILE DEVICE INSURANCE CERTIFICATE', '📱 Mobile Device', `
  <div class="notice">
    This certificate confirms active mobile device insurance issued by Olimpo Coverage Group.
    Keep this certificate as proof of coverage for your insured device(s).
  </div>
  <div class="grid2">
    <div class="box"><div class="lbl">Policy Holder</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}, ${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
    <div class="box"><div class="lbl">Policy Number</div><div class="val">${str(cov.policy_number)}</div>
      <div class="lbl" style="margin-top:8px">Policy Period</div>
      <div class="val-sm">${str(cov.effective_date)} – ${str(cov.expiration_date,'N/A')}</div></div>
  </div>
  <div class="grid3">
    <div class="box"><div class="lbl">Device Value Limit</div><div class="val">${fmt(cov.coverage_limit)||str(cov.coverage_details,'—')}</div></div>
    <div class="box"><div class="lbl">Deductible</div><div class="val">${fmt(cov.deductible)}</div></div>
    <div class="box"><div class="lbl">Contract #</div><div class="val">${str(c.contract_number)}</div></div>
  </div>
  <div class="section-title">What's Covered</div>
  <table>
    <thead><tr><th>Coverage Area</th><th>Included</th></tr></thead>
    <tbody>
      <tr><td>Accidental Damage (cracks, drops)</td><td>✓ Yes</td></tr>
      <tr><td>Theft &amp; Loss</td><td>✓ Yes</td></tr>
      <tr><td>Water Damage</td><td>✓ Yes</td></tr>
      <tr><td>Mechanical Breakdown</td><td>✓ Yes</td></tr>
    </tbody>
  </table>
  <div class="notice">${str(cov.coverage_details,'Coverage subject to policy terms, conditions, and applicable deductibles.')}</div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

function tplEvent(c: Record<string,unknown>, cov: Record<string,unknown>): string {
  return shell('EVENT INSURANCE CERTIFICATE', '🎉 Event Insurance', `
  <div class="notice">
    This certificate confirms active event insurance coverage issued by Olimpo Coverage Group
    for the named insured. Present this document to venue operators or event coordinators as required.
  </div>
  <div class="grid2">
    <div class="box"><div class="lbl">Named Insured</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}, ${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
    <div class="box"><div class="lbl">Policy Number</div><div class="val">${str(cov.policy_number)}</div>
      <div class="lbl" style="margin-top:8px">Coverage Period</div>
      <div class="val-sm">${str(cov.effective_date)} – ${str(cov.expiration_date,'N/A')}</div></div>
  </div>
  <div class="grid3">
    <div class="box"><div class="lbl">Liability Limit</div><div class="val">${fmt(cov.coverage_limit)||str(cov.coverage_details,'—')}</div></div>
    <div class="box"><div class="lbl">Deductible</div><div class="val">${fmt(cov.deductible)}</div></div>
    <div class="box"><div class="lbl">Contract #</div><div class="val">${str(c.contract_number)}</div></div>
  </div>
  <div class="section-title">What's Covered</div>
  <table>
    <thead><tr><th>Coverage Area</th><th>Included</th></tr></thead>
    <tbody>
      <tr><td>Event Cancellation / Postponement</td><td>✓ Yes</td></tr>
      <tr><td>General Liability (bodily injury / property damage)</td><td>✓ Yes</td></tr>
      <tr><td>Vendor No-Show / Failure to Appear</td><td>✓ Yes</td></tr>
      <tr><td>Weather-Related Cancellation</td><td>✓ Yes</td></tr>
    </tbody>
  </table>
  <div class="notice">${str(cov.coverage_details,'Coverage subject to policy terms, conditions, and applicable deductibles.')}</div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

function tplBicycle(c: Record<string,unknown>, cov: Record<string,unknown>): string {
  return shell('BICYCLE INSURANCE CERTIFICATE', '🚲 Bicycle Insurance', `
  <div class="notice">
    This certificate confirms active bicycle insurance coverage issued by Olimpo Coverage Group.
    Keep this document as proof of coverage for your insured bicycle.
  </div>
  <div class="grid2">
    <div class="box"><div class="lbl">Policy Holder</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}, ${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
    <div class="box"><div class="lbl">Policy Number</div><div class="val">${str(cov.policy_number)}</div>
      <div class="lbl" style="margin-top:8px">Policy Period</div>
      <div class="val-sm">${str(cov.effective_date)} – ${str(cov.expiration_date,'N/A')}</div></div>
  </div>
  <div class="grid3">
    <div class="box"><div class="lbl">Coverage Limit</div><div class="val">${fmt(cov.coverage_limit)||str(cov.coverage_details,'—')}</div></div>
    <div class="box"><div class="lbl">Deductible</div><div class="val">${fmt(cov.deductible)}</div></div>
    <div class="box"><div class="lbl">Contract #</div><div class="val">${str(c.contract_number)}</div></div>
  </div>
  <div class="section-title">What's Covered</div>
  <table>
    <thead><tr><th>Coverage Area</th><th>Included</th></tr></thead>
    <tbody>
      <tr><td>Theft</td><td>✓ Yes</td></tr>
      <tr><td>Accidental Damage</td><td>✓ Yes</td></tr>
      <tr><td>Third-Party Liability</td><td>✓ Yes</td></tr>
      <tr><td>Accessories &amp; Parts</td><td>✓ Yes</td></tr>
    </tbody>
  </table>
  <div class="notice">${str(cov.coverage_details,'Coverage subject to policy terms, conditions, and applicable deductibles.')}</div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

function tplCommercialAuto(c: Record<string,unknown>, cov: Record<string,unknown>, vehicles: Record<string,unknown>[]): string {
  const vList = vehicles.length > 0 ? vehicles : [{ year:'', make:'', model:'', vin:'' }]
  const rows = vList.map((v) => `<tr><td>${str(v.year)}</td><td>${str(v.make)}</td><td>${str(v.model)}</td><td style="font-family:monospace">${str(v.vin)}</td></tr>`).join('')
  return shell('COMMERCIAL AUTO – FINANCIAL RESPONSIBILITY CARD', '🚛 Commercial Auto', `
  <div class="notice">Pennsylvania Financial Responsibility Identification Card — This card must be shown to any Law Enforcement Officer upon request. NOT VALID MORE THAN 1 YEAR FROM EFFECTIVE DATE.</div>
  <div class="grid2">
    <div class="box"><div class="lbl">Named Insured</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}, ${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
    <div class="box"><div class="lbl">Policy Number</div><div class="val">${str(cov.policy_number)}</div>
      <div class="lbl" style="margin-top:8px">Policy Period</div>
      <div class="val-sm">${str(cov.effective_date)} – ${str(cov.expiration_date,'N/A')}</div></div>
  </div>
  <div class="section-title">Covered Vehicles</div>
  <table><thead><tr><th>Year</th><th>Make</th><th>Model</th><th>VIN</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="grid3">
    <div class="box"><div class="lbl">Combined Single Limit</div><div class="val">${fmt(cov.combined_single_limit)}</div></div>
    <div class="box"><div class="lbl">Bodily Injury / Person</div><div class="val">${fmt(cov.bodily_injury_per_person)}</div></div>
    <div class="box"><div class="lbl">Property Damage</div><div class="val">${fmt(cov.property_damage_per_accident)}</div></div>
  </div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

function tplBusiness(c: Record<string,unknown>, cov: Record<string,unknown>): string {
  const insuranceLabels: Record<string,string> = {
    'general-liability': 'General Liability',
    'commercial-property': 'Commercial Property',
    'workers-comp': 'Workers Compensation',
    'professional-liability': 'Professional Liability',
    'business-insurance': 'Business Insurance',
  }
  const typeLabel = insuranceLabels[str(cov.insurance_type)] || str(cov.insurance_type,'Insurance')
  return shell(`${typeLabel.toUpperCase()} CERTIFICATE`, `🏢 ${typeLabel}`, `
  <div class="notice">
    THIS CERTIFICATE IS ISSUED AS A MATTER OF INFORMATION ONLY AND CONFERS NO RIGHTS UPON THE CERTIFICATE HOLDER.
    THIS CERTIFICATE DOES NOT AMEND, EXTEND OR ALTER THE COVERAGE AFFORDED BY THE POLICIES BELOW.
  </div>
  <div class="grid2">
    <div class="box"><div class="lbl">Producer</div><div class="val-sm">Olimpo Coverage Group<br>Horsham PA, USA<br>(445) 325-0112</div></div>
    <div class="box"><div class="lbl">Named Insured</div><div class="val">${str(c.client_company_name||c.client_name)}</div>
      <div class="val-sm">${str(c.client_address)}, ${str(c.client_city)}, ${str(c.client_state)} ${str(c.client_zip)}</div></div>
  </div>
  <div class="section-title">Coverage Information</div>
  <table>
    <thead><tr><th>Type of Insurance</th><th>Policy Number</th><th>Eff. Date</th><th>Exp. Date</th><th>Limits</th></tr></thead>
    <tbody>
      <tr>
        <td>${typeLabel}</td>
        <td>${str(cov.policy_number)}</td>
        <td>${str(cov.effective_date)}</td>
        <td>${str(cov.expiration_date,'N/A')}</td>
        <td>
          ${str(cov.insurance_type)==='general-liability' ? `Each Occ: ${fmt(cov.each_occurrence)}<br>General Agg: ${fmt(cov.general_aggregate)}` : ''}
          ${str(cov.insurance_type)==='commercial-property' ? `Building: ${fmt(cov.property_building_limit)}<br>BPP: ${fmt(cov.property_personal_property_limit)}` : ''}
          ${str(cov.insurance_type)==='workers-comp' ? `E.L. Each Acc: ${fmt(cov.el_each_accident)}<br>Policy Limit: ${fmt(cov.el_disease_policy_limit)}` : ''}
          ${!['general-liability','commercial-property','workers-comp'].includes(str(cov.insurance_type)) ? `${fmt(cov.coverage_limit)||str(cov.coverage_details,'—')}` : ''}
        </td>
      </tr>
    </tbody>
  </table>
  <div class="grid2">
    <div class="box"><div class="lbl">Certificate Holder</div>
      <div class="val-sm">${str(cov.certificate_holder_name,'N/A')}${str(cov.certificate_holder_address) ? '<br>'+str(cov.certificate_holder_address) : ''}</div></div>
    <div class="box"><div class="lbl">Cancellation</div>
      <div class="val-sm">Should any policy be cancelled, notice will be delivered per policy provisions.</div></div>
  </div>
  <div class="sig-line">Authorized Representative – Olimpo Coverage Group</div>`)
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; coverageId: string }> }
) {
  try {
    const { id: contractId, coverageId } = await params

    const [
      { data: contract, error: contractError },
      { data: coverage, error: coverageError },
      { data: vehicles },
    ] = await Promise.all([
      supabaseAdmin.from('contracts').select('*').eq('id', contractId).single() as unknown as Promise<{ data: Record<string,unknown>|null; error: unknown }>,
      supabaseAdmin.from('coverages').select('*').eq('id', coverageId).single() as unknown as Promise<{ data: Record<string,unknown>|null; error: unknown }>,
      supabaseAdmin.from('vehicles').select('*').eq('contract_id', contractId).order('created_at', { ascending: true }) as unknown as Promise<{ data: Record<string,unknown>[]|null; error: unknown }>,
    ])

    if (contractError || !contract) {
      return NextResponse.json({ success: false, message: 'Contract not found' }, { status: 404 })
    }
    if (coverageError || !coverage) {
      return NextResponse.json({ success: false, message: 'Coverage not found' }, { status: 404 })
    }

    const vList = vehicles || []
    const insType = str(coverage.insurance_type)

    let html: string

    switch (insType) {
      case 'personal-auto':
        html = tplPersonalAuto(contract, coverage)
        break
      case 'motorcycle':
        html = tplMotorcycle(contract, coverage)
        break
      case 'pet':
        html = tplPet(contract, coverage)
        break
      case 'mobile-device':
        html = tplMobileDevice(contract, coverage)
        break
      case 'event':
        html = tplEvent(contract, coverage)
        break
      case 'bicycle':
        html = tplBicycle(contract, coverage)
        break
      case 'commercial-auto':
        html = tplCommercialAuto(contract, coverage, vList)
        break
      default:
        // All business types (general-liability, commercial-property, workers-comp, etc.)
        html = tplBusiness(contract, coverage)
        break
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
