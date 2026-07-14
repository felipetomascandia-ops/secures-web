/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'
import SignatureGraphic from '@/components/SignatureGraphic'
import AdminShell from '@/components/admin/AdminShell'

// Dynamic import for html2pdf
let html2pdf: any = null
if (typeof window !== 'undefined') {
  import('html2pdf.js').then((module) => {
    html2pdf = module.default
  }).catch(() => {
    html2pdf = null
  })
}

type InsuranceType = {
  key: string
  name: string
  label: string
  certificateType: 'workers-comp' | 'general-liability' | 'commercial-auto' | 'property' | 'personal-auto' | 'motorcycle' | 'pet' | 'mobile-device' | 'event' | 'bicycle' | 'homeowners' | 'renters' | 'mobile-home' | 'condo' | 'business-insurance' | 'professional-liability'
}

const insuranceTypes: InsuranceType[] = [
  // Personal
  { key: 'personal-auto', name: 'Personal Auto Insurance', label: 'Auto', certificateType: 'personal-auto' },
  { key: 'motorcycle', name: 'Motorcycle Insurance', label: 'Motorcycle', certificateType: 'motorcycle' },
  { key: 'pet', name: 'Pet Insurance', label: 'Pet', certificateType: 'pet' },
  { key: 'mobile-device', name: 'Mobile Device Protection', label: 'Mobile Device', certificateType: 'mobile-device' },
  { key: 'event', name: 'Event Insurance', label: 'Event', certificateType: 'event' },
  { key: 'bicycle', name: 'Bicycle Insurance', label: 'Bicycle', certificateType: 'bicycle' },
  // Property
  { key: 'homeowners', name: 'Homeowners Insurance', label: 'Homeowners', certificateType: 'homeowners' },
  { key: 'renters', name: 'Renters Insurance', label: 'Renters', certificateType: 'renters' },
  { key: 'mobile-home', name: 'Mobile Home Insurance', label: 'Mobile Home', certificateType: 'mobile-home' },
  { key: 'condo', name: 'Condo/Co-op Insurance', label: 'Condo/Co-op', certificateType: 'condo' },
  // Business (existing)
  { key: 'workers-comp', name: 'Workers Compensation Insurance', label: 'Workers Comp', certificateType: 'workers-comp' },
  { key: 'general-liability', name: 'General Liability Insurance', label: 'General Liability', certificateType: 'general-liability' },
  { key: 'commercial-auto', name: 'Commercial Auto Insurance', label: 'Commercial Auto', certificateType: 'commercial-auto' },
  { key: 'commercial-property', name: 'Commercial Property Insurance', label: 'Commercial Property', certificateType: 'property' },
  { key: 'business-insurance', name: 'Business Insurance', label: 'Business Insurance', certificateType: 'business-insurance' },
  { key: 'professional-liability', name: 'Professional Liability Insurance', label: 'Professional Liability', certificateType: 'professional-liability' },
]

type Coverage = {
  id: string
  insuranceType: string
  policyNumber: string
  effectiveDate: string
  expirationDate: string
  eachOccurrence: string
  damageToRentedPremises: string
  medExp: string
  personalAdvInjury: string
  productsCompletedOpsAgg: string
  combinedSingleLimit: string
  bodilyInjuryPerPerson: string
  bodilyInjuryPerAccident: string
  propertyDamagePerAccident: string
  elEachAccident: string
  elDiseaseEaEmployee: string
  elDiseasePolicyLimit: string
  generalAggregate: string
  deductible: string
  insuredName: string
  autoAnyAuto: string
  autoOwnedAuto: string
  autoHiredAutosOnly: string
  autoNonOwnedAutosOnly: string
  autoScheduledAutos: string
  propertyBuildingLimit: string
  propertyPersonalPropertyLimit: string
  certificateHolderName: string
  certificateHolderAddress: string
  // Generic/simplified fields for new insurance types
  annualLimit: string
  perIncidentLimit: string
  coverageLimit: string
  itemValue: string
  propertyValue: string
  liabilityLimit: string
  cancellationLimit: string
}

type Vehicle = {
  id: string
  year: string
  make: string
  model: string
  vin: string
}

type Contract = {
  id: string
  contractNumber: string
  contractDate: string
  insuranceType: string
  clientName: string
  clientCompanyName: string
  clientAddress: string
  clientCity: string
  clientState: string
  clientZip: string
  clientPhone: string
  clientEmail: string
  totalPremium: string
  downPayment: string
  unpaidBalance: string
  amountFinanced: string
  financeChargePercent: string
  financeCharge: string
  monthlyPayment: string
  numberOfPayments: string
  firstDueDate: string
  termsAndConditions: string
  coverageIds: string[]
  assignedCustomerId?: string | null
}

type CustomerOption = {
  id: string
  user_id: string | null
  full_name: string | null
  email: string | null
  phone: string | null
}

const formatCurrencyDisplay = (value: number | null) => {
  if (value == null || isNaN(value)) return '$0.00'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const parseCurrencyValue = (input: string | number | null | undefined): number | null => {
  if (input == null || input === '') return null
  const s = String(input).trim()
  if (!s) return null
  const normalized = s.replace(/[^\d.-]/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return n
}

const getInsuranceTypeLabel = (typeKey: string) => {
  if (!typeKey) return 'Insurance Premium Finance Agreement'
  if (typeKey === 'multiple') return 'Multiple Insurance Coverage Agreement'
  return insuranceTypes.find((type) => type.key === typeKey)?.name || 'Insurance Premium Finance Agreement'
}

const getDisplayMessage = (value: unknown) => {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  if (value && typeof value === 'object') {
    const maybeMessage = (value as { message?: unknown }).message
    if (typeof maybeMessage === 'string') return maybeMessage
    if (typeof maybeMessage === 'object' && maybeMessage) {
      try {
        return JSON.stringify(maybeMessage)
      } catch {
        return 'Unexpected response'
      }
    }
    try {
      return JSON.stringify(value)
    } catch {
      return 'Unexpected response'
    }
  }
  return 'Unexpected response'
}

export default function AdminContractsPage() {
  const { user, isLoading: authLoading } = useSupabase()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  const [contractNumber, setContractNumber] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [contractDate, setContractDate] = useState('')
  const [clientCompanyName, setClientCompanyName] = useState('')
  const [clientAddress1, setClientAddress1] = useState('')
  const [clientAddress2, setClientAddress2] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [clientState, setClientState] = useState('')
  const [clientZip, setClientZip] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  const [totalPremium, setTotalPremium] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [financeChargePercent, setFinanceChargePercent] = useState('')
  const [numberOfPayments, setNumberOfPayments] = useState('')
  const [firstDueDate, setFirstDueDate] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')

  const [coverages, setCoverages] = useState<Coverage[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [certificateHolderName, setCertificateHolderName] = useState('')
  const [certificateHolderAddress, setCertificateHolderAddress] = useState('')

  const [activePreview, setActivePreview] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'contracts'>('form')

  // Contract states
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractToEdit, setContractToEdit] = useState<Contract | null>(null)
  const [isCreatingContracts, setIsCreatingContracts] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [customerSelectionMap, setCustomerSelectionMap] = useState<Record<string, string>>({})
  const [assigningContractId, setAssigningContractId] = useState<string | null>(null)
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null)
  const [showSendContractPanel, setShowSendContractPanel] = useState(false)
  const [selectedCustomerForSend, setSelectedCustomerForSend] = useState('')
  const [isSendingContract, setIsSendingContract] = useState(false)
  const [sendContractMessage, setSendContractMessage] = useState<string | null>(null)
  const [contractPayeeContact, setContractPayeeContact] = useState('Olimpo Coverage Group')
  const [contractPayeeAddress, setContractPayeeAddress] = useState('Horsham PA, USA')
  const [contractPayeePhone, setContractPayeePhone] = useState('(445) 325-0112')
  const [contractPayeeEmail, setContractPayeeEmail] = useState('contacto@olimpocoveragegroup.com')

  const defaultContractTerms = `TERMS AND CONDITIONS - INSURANCE PREMIUM FINANCE AGREEMENT

1. COVERAGE AND SCOPE
This is an agreement between the undersigned, jointly ("Insured") and Olimpo Coverage Group ("Finance Company") concerning the financing of one or more insurance policies. The terms of this agreement are stated below and on pages two (2) and three (3) of this document. The undersigned, jointly and severally, hereby appoint the Finance Company as its attorney-in-fact and grant the Finance Company full authority and power in its sole discretion to service, handle and control all matters relative to the policy(ies) herein listed and the premium for those policies.

2. SECURITY INTEREST
The insured assigns as security for the total amount payable hereunder any and all unearned premiums and dividends which may become payable under the policy(ies) listed on page 1.

3. FINANCE COMPANY AS ATTORNEY-IN-FACT
The insured irrevocably appoints the Finance Company as its attorney-in-fact with respect to the policy(ies) listed on page 1 and grants the Finance Company full authority to service, handle and control all matters relative to the policy(ies). The Finance Company may, on behalf of the Insured and without further notice, service the policy(ies) and all matters incidental to the policy(ies).

4. CANCELLATION NOTICE PROCEDURES
Should any of the above described policies be cancelled before the expiration date thereof, notice of cancellation will be delivered in accordance with the policy provisions. The Insured shall notify the Finance Company in writing of any cancellation of the policy(ies). The Finance Company shall have the right to tender payment for any premium due upon request of the Insured, subject to the payment obligations hereunder.

5. ADDITIONAL INSURED
The certificate holder is not automatically added as an additional insured under the policy(ies) unless specifically noted. Additional insured endorsements must be requested and approved in writing.

6. WAIVER OF SUBROGATION
The Finance Company will not waive rights of subrogation unless specifically requested and documented in the applicable policy endorsement.

7. DUTY TO NOTIFY
The insured must notify Olimpo Coverage Group of any changes in operations, locations, or other material information that may affect coverage.

8. COMPLIANCE WITH POLICY TERMS
The insured agrees to comply with all applicable laws, regulations, and the terms of the insurance policies. Failure to comply may result in denial of claims or cancellation of coverage.

9. CLAIM PROCEDURES
All claims must be reported to Olimpo Coverage Group within the timeframe specified in the policy. The insured must cooperate fully in the investigation and defense of claims.

10. PREMIUM PAYMENT OBLIGATIONS
All premiums must be paid in full according to the payment schedule outlined on page 1. Failure to pay may result in cancellation of coverage and acceleration of the contract.

11. DEFAULT AND REMEDIES
In the event that any installment hereunder shall be in default for a period of ten (10) days after the due date thereof, a default charge of five dollars ($5.00) shall be imposed. If such default continues for a period of fifteen (15) days after the due date, the entire unpaid balance shall become immediately due and payable.

12. REFINANCING
Should the insured request that the Finance Company refinance any unpaid balance, such request must be submitted in writing and approved by the Finance Company.

13. MISREPRESENTATION
If any insurance information provided by the insured is misrepresented or if the actual premiums are other than as indicated, this agreement may be amended to reflect the actual premiums and amount financed.

14. ASSIGNMENT
This contract may be assigned and the holder or assignee has the same rights as the Finance Company. Please take notice that the Finance Company may assign this contract to a third party.

15. RELEASES AND DISCHARGES
The insured hereby releases and discharges and agrees to hold harmless the Finance Company and each holder thereof from any liability or cause of action by reason of any cancellation. The Finance Company shall not be subject to any liability except for Finance Company's willful acts or omissions.

16. GOVERNING LAW
This certificate and the underlying policies shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.

17. ENTIRE AGREEMENT
This agreement constitutes the entire agreement between the parties and supersedes all prior negotiations and agreements. No modification shall be effective unless made in writing and signed by an authorized representative of the Finance Company.

18. FEDERAL COMPLIANCE
The Federal Equal Credit Opportunity Act prohibits creditors from discriminating against credit applicants on the basis of race, color, religion, national origin, sex, marital status, age, or because all or part of the applicant's income derives from any public assistance program. The Federal Trade Commission enforces this law. You should also consult state laws in your state, as some state laws may prohibit discrimination based on additional factors.`

  useEffect(() => {
    if (!termsAndConditions) {
      setTermsAndConditions(defaultContractTerms)
    }
  }, [])

  useEffect(() => {
    const fetchNextPolicyNumber = async () => {
      try {
        const res = await fetch('/api/contracts/policy-number')
        const json = await res.json()
        if (json.success && json.policyNumber) {
          setPolicyNumber(String(json.policyNumber))
        }
      } catch (error) {
        console.error('Error fetching next policy number:', error)
      }
    }

    fetchNextPolicyNumber()
  }, [])

  useEffect(() => {
    if (!contractNumber) {
      const year = new Date().getFullYear()
      const randomNum = Math.floor(1000 + Math.random() * 9000)
      setContractNumber(`OCG-${year}-${randomNum}`)
    }
  }, [contractNumber])

  useEffect(() => {
    // Update all coverages to use the same policy number
    setCoverages((prev) => prev.map((coverage) => ({ ...coverage, policyNumber })))
  }, [policyNumber])

  useEffect(() => {
    if (!contractDate) {
      setContractDate(new Date().toISOString().split('T')[0])
    }
  }, [contractDate])

  useEffect(() => {
    if (!contractNumber) return
    setCoverages((prev) => prev.map((coverage) => (coverage.policyNumber ? coverage : { ...coverage, policyNumber: contractNumber })))
  }, [contractNumber])

  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading || !user) {
        console.log('Auth loading or no user:', { authLoading, userId: user?.id })
        return
      }

      try {
        console.log('Checking admin status for user:', user.id)
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        console.log('Admin check result:', { data, error })
        setIsAdmin(!!data)
      } catch (error) {
        console.log('Admin check failed:', error)
        setIsAdmin(false)
      } finally {
        setIsCheckingAdmin(false)
      }
    }

    checkAdmin()
  }, [])

  useEffect(() => {
    const loadCustomers = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCustomers(data as CustomerOption[])
      }
    }

    loadCustomers()
  }, [])

  const getFormContractValues = () => {
    const parsedTotalPremium = parseCurrencyValue(totalPremium) || 0
    const parsedDownPayment = parseCurrencyValue(downPayment) || 0
    const parsedMonthlyPayment = parseCurrencyValue(monthlyPayment) || 0
    const parsedNumberOfPayments = parseInt(numberOfPayments, 10) || 0
    const parsedFinancePercent = parseCurrencyValue(financeChargePercent) || 0
    const unpaidBalance = parsedTotalPremium - parsedDownPayment
    const financeCharge = parsedFinancePercent > 0
      ? unpaidBalance * (parsedFinancePercent / 100)
      : (parsedMonthlyPayment * parsedNumberOfPayments) - unpaidBalance
    const computedMonthlyPayment = parsedFinancePercent > 0 && parsedNumberOfPayments > 0
      ? (unpaidBalance + financeCharge) / parsedNumberOfPayments
      : parsedMonthlyPayment
    const amountFinanced = unpaidBalance + financeCharge

    return {
      totalPremium: parsedTotalPremium,
      downPayment: parsedDownPayment,
      monthlyPayment: computedMonthlyPayment,
      numberOfPayments: parsedNumberOfPayments,
      financeChargePercent: parsedFinancePercent,
      financeCharge,
      unpaidBalance,
      amountFinanced,
    }
  }

  const createContracts = async (contractsToCreate: any[]) => {
    if (!user) return alert('You must be signed in to create contracts')
    setIsCreatingContracts(true)
    try {
      const res = await fetch('/api/contracts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts: contractsToCreate, allCoverages: coverages, createdBy: user.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        const message = getDisplayMessage(json.message || 'Failed to create contracts')
        throw new Error(message)
      }
      const created = (json.created || []).map((c: any) => c.contract)
      setContracts([...contracts, ...created])
      setContractToEdit(created[0] || null)
    } catch (err: any) {
      console.error('createContracts error', err)
      alert('Error creating contracts: ' + (err?.message || String(err)))
    } finally {
      setIsCreatingContracts(false)
    }
  }

  const assignContractToCustomer = async (contractId: string) => {
    const customerUserId = customerSelectionMap[contractId]
    if (!customerUserId) {
      setAssignmentMessage('Please select a customer first.')
      return
    }

    setAssigningContractId(contractId)
    setAssignmentMessage(null)

    try {
      const res = await fetch('/api/contracts/assign-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, customerUserId, createdBy: user?.id }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to assign contract')

      setContracts((prev) => prev.map((item) => item.id === contractId ? { ...item, assignedCustomerId: customerUserId } : item))
      setAssignmentMessage('Contract assigned to customer successfully.')
    } catch (error: any) {
      console.error('assignContractToCustomer error', error)
      setAssignmentMessage(error?.message || 'Unable to assign contract to customer.')
    } finally {
      setAssigningContractId(null)
    }
  }

  const sendContractToCustomer = async (customerUserId: string) => {
    if (!user || !customerUserId) return

    setIsSendingContract(true)
    setSendContractMessage(null)

    try {
      const values = getFormContractValues()
      // Create just ONE contract, not per insurance type!
      const contractsToCreate = [{
        contractNumber,
        policyNumber,
        contractDate,
        insuranceType: coverages.length > 0 ? coverages[0].insuranceType : undefined,
        clientName: clientCompanyName,
        clientCompanyName,
        clientAddress: clientAddress1,
        clientCity,
        clientState,
        clientZip,
        clientPhone,
        clientEmail,
        totalPremium: values.totalPremium.toFixed(2),
        downPayment: values.downPayment.toFixed(2),
        monthlyPayment: values.monthlyPayment.toFixed(2),
        numberOfPayments: String(values.numberOfPayments),
        firstDueDate,
        terms: termsAndConditions || defaultContractTerms,
        userId: customerUserId,
        status: 'pending',
        policyStatus: 'active',
        sendToClient: true,
        financeChargePercent: financeChargePercent,
      }]

      const res = await fetch('/api/contracts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts: contractsToCreate, allCoverages: coverages, allVehicles: vehicles, createdBy: user.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        const message = getDisplayMessage(json.message || 'Failed to send contract')
        throw new Error(message)
      }

      const createdContracts = (json.created || []).map((item: any) => item.contract)
      setContracts((prev) => [...prev, ...createdContracts])
      setSendContractMessage(`Contract sent to the selected customer with the policy number ${policyNumber}.`)
      setSelectedCustomerForSend('')
    } catch (error: unknown) {
      console.error('sendContractToCustomer error', error)
      setSendContractMessage(getDisplayMessage(error) || 'Unable to send the contract to the customer.')
    } finally {
      setIsSendingContract(false)
    }
  }

  const addCoverage = () => {
    setCoverages([
      ...coverages,
      {
        id: Date.now().toString(),
        insuranceType: 'general-liability',
        policyNumber: policyNumber,
        effectiveDate: new Date().toISOString().split('T')[0],
        expirationDate: '',
        eachOccurrence: '1000000',
        damageToRentedPremises: '50000',
        medExp: '5000',
        personalAdvInjury: '1000000',
        productsCompletedOpsAgg: '1000000',
        combinedSingleLimit: '',
        bodilyInjuryPerPerson: '',
        bodilyInjuryPerAccident: '',
        propertyDamagePerAccident: '',
        elEachAccident: '',
        elDiseaseEaEmployee: '',
        elDiseasePolicyLimit: '',
        generalAggregate: '2000000',
        deductible: '1000',
        insuredName: clientCompanyName,
        autoAnyAuto: '',
        autoOwnedAuto: '',
        autoHiredAutosOnly: '',
        autoNonOwnedAutosOnly: '',
        autoScheduledAutos: '',
        propertyBuildingLimit: '',
        propertyPersonalPropertyLimit: '',
        certificateHolderName: '',
        certificateHolderAddress: '',
        annualLimit: '',
        perIncidentLimit: '',
        coverageLimit: '',
        itemValue: '',
        propertyValue: '',
        liabilityLimit: '',
        cancellationLimit: '',
      },
    ])
  }

  const removeCoverage = (id: string) => {
    setCoverages(coverages.filter(c => c.id !== id))
  }

  const updateCoverage = (id: string, field: keyof Coverage, value: string) => {
    setCoverages(
      coverages.map(c => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const downloadPDF = async (coverageIndex: number) => {
    const element = document.getElementById(`certificate-${coverageIndex}`)
    if (!element) {
      alert('No document to download')
      return
    }

    if (html2pdf) {
      try {
        const coverage = coverages[coverageIndex]
        const options = {
          margin: 10,
          filename: `certificate-${coverage.policyNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        }
        await html2pdf().set(options).from(element).save()
        return
      } catch (error) {
        console.log('Fallback to print')
      }
    }
    window.print()
  }

  const downloadDraftContractPDF = async () => {
    const contractElement = document.createElement('div')
    contractElement.innerHTML = generateContractPDF(draftContract)

    if (html2pdf) {
      try {
        const options = {
          margin: 10,
          filename: `${draftContract.contractNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
        }
        await html2pdf().set(options).from(contractElement).save()
        return
      } catch (error) {
        console.log('Draft contract PDF error, using print')
      }
    }
    window.print()
  }

  const draftTotalPremium = parseCurrencyValue(totalPremium) || 0
  const draftDownPayment = parseCurrencyValue(downPayment) || 0
  const draftUnpaidBalance = draftTotalPremium - draftDownPayment
  const draftFinanceChargePercent = parseCurrencyValue(financeChargePercent) || 0
  const draftNumberOfPayments = parseInt(numberOfPayments) || 0
  const draftFinanceCharge = draftFinanceChargePercent > 0
    ? draftUnpaidBalance * (draftFinanceChargePercent / 100)
    : (parseCurrencyValue(monthlyPayment) || 0) * draftNumberOfPayments - draftUnpaidBalance
  const draftMonthlyPayment = draftFinanceChargePercent > 0 && draftNumberOfPayments > 0
    ? (draftUnpaidBalance + draftFinanceCharge) / draftNumberOfPayments
    : parseCurrencyValue(monthlyPayment) || 0
  const draftAmountFinanced = draftUnpaidBalance + draftFinanceCharge

  const draftContract: Contract = {
    id: 'draft',
    contractNumber: contractNumber || `OCG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    contractDate: contractDate,
    insuranceType: coverages.length === 1 ? coverages[0].insuranceType : 'multiple',
    clientName: clientCompanyName,
    clientCompanyName: clientCompanyName,
    clientAddress: [clientAddress1, clientAddress2].filter(Boolean).join(', '),
    clientCity: clientCity,
    clientState: clientState,
    clientZip: clientZip,
    clientPhone: clientPhone,
    clientEmail: clientEmail,
    totalPremium: totalPremium,
    downPayment: downPayment,
    unpaidBalance: draftUnpaidBalance.toFixed(2),
    amountFinanced: draftAmountFinanced.toFixed(2),
    financeChargePercent: financeChargePercent,
    financeCharge: draftFinanceCharge.toFixed(2),
    monthlyPayment: draftFinanceChargePercent > 0 && draftNumberOfPayments > 0 ? draftMonthlyPayment.toFixed(2) : (parseCurrencyValue(monthlyPayment) || 0).toFixed(2),
    numberOfPayments: numberOfPayments,
    firstDueDate: firstDueDate,
    termsAndConditions: termsAndConditions || defaultContractTerms,
    coverageIds: coverages.map((c) => c.id),
  }

  const getContractCoverages = (contract: Contract) => {
    return coverages.filter((coverage) => contract.coverageIds.includes(coverage.id))
  }

  const generateCoverageDetailsHTML = (coverage: Coverage) => {
    if (coverage.insuranceType === 'general-liability') {
      return `
        <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
          <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(coverage.insuranceType)} Limits</strong>
          <table style="width:100%; border-collapse: collapse; font-size:12px;">
            <tbody>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; width:55%;">Each Occurrence</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.eachOccurrence))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Damage to Rented Premises (Ea occurrence)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.damageToRentedPremises))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Med Exp (Any one person)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.medExp))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Personal & Adv Injury</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.personalAdvInjury))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">General Aggregate</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.generalAggregate))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Products - Comp/Op Agg</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.productsCompletedOpsAgg))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Combined Single Limit</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.combinedSingleLimit))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per person)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerPerson))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerAccident))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Property Damage (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.propertyDamagePerAccident))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">E.L. Each Accident</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.elEachAccident))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">E.L. Disease - Ea Employee</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.elDiseaseEaEmployee))}</td></tr>
              <tr><td style="padding:8px;">E.L. Disease - Policy Limit</td><td style="padding:8px;">${formatCurrencyDisplay(parseCurrencyValue(coverage.elDiseasePolicyLimit))}</td></tr>
            </tbody>
          </table>
        </div>
      `
    }

    if (coverage.insuranceType === 'commercial-auto') {
      return `
        <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
          <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(coverage.insuranceType)} Limits</strong>
          <table style="width:100%; border-collapse: collapse; font-size:12px;">
            <tbody>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; width:55%;">Any Auto</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${coverage.autoAnyAuto || 'N/A'}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Owned Autos</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${coverage.autoOwnedAuto || 'N/A'}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Hired Autos Only</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${coverage.autoHiredAutosOnly || 'N/A'}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Non-Owned Autos Only</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${coverage.autoNonOwnedAutosOnly || 'N/A'}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Scheduled Autos</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${coverage.autoScheduledAutos || 'N/A'}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per person)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerPerson))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Bodily Injury (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerAccident))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Property Damage (Per accident)</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.propertyDamagePerAccident))}</td></tr>
              <tr><td style="padding:8px;">Combined Single Limit</td><td style="padding:8px;">${formatCurrencyDisplay(parseCurrencyValue(coverage.combinedSingleLimit))}</td></tr>
            </tbody>
          </table>
        </div>
      `
    }

    if (coverage.insuranceType === 'commercial-property') {
      return `
        <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
          <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(coverage.insuranceType)} Limits</strong>
          <table style="width:100%; border-collapse: collapse; font-size:12px;">
            <tbody>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; width:55%;">Building Limit</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.propertyBuildingLimit))}</td></tr>
              <tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">Business Personal Property</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${formatCurrencyDisplay(parseCurrencyValue(coverage.propertyPersonalPropertyLimit))}</td></tr>
              <tr><td style="padding:8px;">Deductible</td><td style="padding:8px;">${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</td></tr>
            </tbody>
          </table>
        </div>
      `
    }

    return `
      <div style="margin-bottom: 18px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 14px;">
        <strong style="display:block; margin-bottom:10px; font-size:14px;">${getInsuranceTypeLabel(coverage.insuranceType)} Details</strong>
        <p style="margin:0; font-size:12px;">${coverage.deductible ? `Deductible: ${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}` : 'No specific limits entered.'}</p>
      </div>
    `
  }

  const generateContractPDF = (contract: Contract) => {
    const contractCoverages = getContractCoverages(contract)
    const coverageRows = contractCoverages.map((coverage) => `
      <tr>
        <td>${getInsuranceTypeLabel(coverage.insuranceType)}</td>
        <td>${coverage.policyNumber}</td>
        <td>${coverage.effectiveDate}</td>
        <td>${coverage.expirationDate || 'N/A'}</td>
        <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.eachOccurrence))}</td>
        <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.generalAggregate))}</td>
        <td>${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</td>
      </tr>
    `).join('')
    const coverageSections = contractCoverages.map((coverage) => generateCoverageDetailsHTML(coverage)).join('')

    const totalPremium = parseCurrencyValue(contract.totalPremium) || 0
    const downPayment = parseCurrencyValue(contract.downPayment) || 0
    const unpaidBalance = totalPremium - downPayment
    const monthlyPayment = parseCurrencyValue(contract.monthlyPayment) || 0
    const numberOfPayments = parseInt(contract.numberOfPayments) || 0
    const financeCharge = parseFloat(contract.financeCharge) || 0
    const amountFinanced = parseFloat(contract.amountFinanced) || unpaidBalance + financeCharge
    const totalOfPayments = monthlyPayment * numberOfPayments

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
            font-size: 30px;
            font-weight: 900;
          }
          .contract-title {
            margin: 8px 0 0;
            font-size: 12px;
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
            padding: 18px;
          }
          .panel strong {
            display: block;
            margin-bottom: 10px;
            font-size: 11px;
            color: #475569;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .panel p {
            margin: 4px 0;
            font-size: 12px;
            line-height: 1.8;
            color: #334155;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            color: #334155;
          }
          th,
          td {
            padding: 14px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #e2e8f0;
            color: #0f172a;
            font-weight: 700;
            text-align: left;
          }
          td.value {
            text-align: right;
            font-weight: 700;
          }
          .highlight {
            background: #fef3c7;
          }
          .info-note {
            margin-top: 18px;
            padding: 18px;
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
            font-size: 11px;
          }
          .signature-line {
            height: 56px;
            border-bottom: 1px solid #0f172a;
            margin-bottom: 8px;
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
              <p class="contract-title">${getInsuranceTypeLabel(contract.insuranceType)}</p>
              <p class="company-contact">Horsham PA, USA · Phone: (445) 325-0112 · Email: contacto@olimpocoveragegroup.com</p>
            </div>
            <div class="meta">
              <strong>Agreement #</strong>
              <span>${contract.contractNumber}</span>
              <strong style="margin-top: 12px;">Date</strong>
              <span>${contract.contractDate || new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div class="section">
            <p class="section-heading">Parties</p>
            <div class="two-column">
              <div class="panel">
                <strong>Insured</strong>
                <p>${contract.clientCompanyName}</p>
                <p>${contract.clientAddress}</p>
                <p>${contract.clientCity}, ${contract.clientState} ${contract.clientZip}</p>
                <p>Phone: ${contract.clientPhone}</p>
                <p>Email: ${contract.clientEmail}</p>
              </div>
              <div class="panel">
                <strong>Agent / Producer</strong>
                <p>${contractPayeeContact}</p>
                <p>${contractPayeeAddress}</p>
                <p>Phone: ${contractPayeePhone}</p>
                <p>Email: ${contractPayeeEmail}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <p class="section-heading">Coverages Provided</p>
            ${contractCoverages.length ? `
            <table>
              <thead>
                <tr>
                  <th>Coverage Type</th>
                  <th>Policy #</th>
                  <th>Effective</th>
                  <th>Expires</th>
                  <th>Each Occurrence</th>
                  <th>General Aggregate</th>
                  <th>Deductible</th>
                </tr>
              </thead>
              <tbody>
                ${coverageRows}
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
                  <td class="value">${contract.financeChargePercent || '0'}%</td>
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
                  <td class="value">${contract.firstDueDate}</td>
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
            <div class="terms">${contract.termsAndConditions}</div>
          </div>

          <div class="signatures">
            <div class="signature">
              <div class="signature-line" style="display:flex; align-items:center; justify-content:center;"></div>
              <strong>Insured Signature</strong>
              <small>Date: ________________________</small>
            </div>
            <div class="signature">
              <div class="signature-line" style="display:flex; align-items:center; justify-content:center;">
                <svg width="100" height="50" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 15 C30 5 70 5 90 15" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 25 C20 10 40 40 60 20 C80 0 95 35 90 25" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 30 C25 15 45 45 65 25 C85 5 90 40 85 30" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 10 L85 40" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <strong>Authorized Agent - Olimpo Coverage Group</strong>
              <small>Date: ${new Date().toLocaleDateString()}</small>
            </div>
          </div>

          <div class="footer">Agreement # ${contract.contractNumber}</div>
        </div>

        <!-- Receipt Page (Down Payment) -->
        <div style="page-break-before: always; max-width:7.5in; margin: 0 auto; padding:24px; background: white; border: 1px solid #e2e8f0; border-radius: 18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div>
              <p style="margin:0; font-size:28px; font-weight:900;">RECEIPT</p>
              <p style="margin:6px 0 0; font-size:12px; color:#475569;">Olimpo Coverage Group</p>
            </div>
            <div style="text-align:right; font-size:12px; color:#475569;">
              <div>Date: ${contract.contractDate || new Date().toLocaleDateString()}</div>
              <div>Receipt #: ${contract.contractNumber}</div>
            </div>
          </div>

          <div style="display:flex; gap:18px; margin-bottom:12px; font-size:13px; color:#334155;">
            <div style="flex:1;">
              <strong>Payor</strong><br/>
              ${contract.clientCompanyName || 'N/A'}<br/>
              ${contract.clientAddress || ''}<br/>
              ${contract.clientCity || ''}${contract.clientCity ? ', ' : ''}${contract.clientState || ''} ${contract.clientZip || ''}
            </div>
            <div style="flex:1;">
              <strong>Payee</strong><br/>
              ${contractPayeeContact || 'Olimpo Coverage Group'}<br/>
              ${contractPayeeAddress || ''}
            </div>
          </div>

          <div style="border:2px solid #0f172a; padding:12px; text-align:right; font-size:18px; font-weight:700; margin-bottom:12px;">
            Total Amount Paid: ${formatCurrencyDisplay(parseCurrencyValue(contract.downPayment))}
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

  const renderCoverageLimitsPreview = (coverage: Coverage) => {
    if (coverage.insuranceType === 'general-liability') {
      return (
        <div key={coverage.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900 mb-4">{getInsuranceTypeLabel(coverage.insuranceType)} Limits</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Each Occurrence</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.eachOccurrence))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">General Aggregate</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.generalAggregate))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Damage to Rented Premises</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.damageToRentedPremises))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Med Exp (Any one person)</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.medExp))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Personal & Adv Injury</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.personalAdvInjury))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Products - Comp/Op Agg</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.productsCompletedOpsAgg))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Combined Single Limit</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.combinedSingleLimit))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Bodily Injury (Per person)</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerPerson))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Bodily Injury (Per accident)</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerAccident))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Property Damage (Per accident)</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.propertyDamagePerAccident))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">E.L. Each Accident</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.elEachAccident))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">E.L. Disease - Ea Employee</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.elDiseaseEaEmployee))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">E.L. Disease - Policy Limit</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.elDiseasePolicyLimit))}</div>
            </div>
          </div>
        </div>
      )
    }

    if (coverage.insuranceType === 'commercial-auto') {
      return (
        <div key={coverage.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900 mb-4">{getInsuranceTypeLabel(coverage.insuranceType)} Limits</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Any Auto</div>
              <div>{coverage.autoAnyAuto || 'N/A'}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Owned Autos</div>
              <div>{coverage.autoOwnedAuto || 'N/A'}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Hired Autos Only</div>
              <div>{coverage.autoHiredAutosOnly || 'N/A'}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Non-Owned Autos Only</div>
              <div>{coverage.autoNonOwnedAutosOnly || 'N/A'}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Scheduled Autos</div>
              <div>{coverage.autoScheduledAutos || 'N/A'}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Bodily Injury (Per person)</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerPerson))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Bodily Injury (Per accident)</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerAccident))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Property Damage (Per accident)</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.propertyDamagePerAccident))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Combined Single Limit</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.combinedSingleLimit))}</div>
            </div>
          </div>
        </div>
      )
    }

    if (coverage.insuranceType === 'commercial-property') {
      return (
        <div key={coverage.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900 mb-4">{getInsuranceTypeLabel(coverage.insuranceType)} Limits</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Building Limit</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.propertyBuildingLimit))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Business Personal Property</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.propertyPersonalPropertyLimit))}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Deductible</div>
              <div>{formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={coverage.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="text-sm font-semibold text-slate-900 mb-4">{getInsuranceTypeLabel(coverage.insuranceType)} Limits</div>
        <p className="text-sm text-slate-700">{coverage.deductible ? `Deductible: ${formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}` : 'No specific limits entered.'}</p>
      </div>
    )
  }

  const renderContractPreview = (contract: Contract) => {
    const coverageIds = Array.isArray(contract.coverageIds) ? contract.coverageIds : []
    const contractCoverages = coverages.filter((coverage) => coverageIds.includes(coverage.id))
    const totalPremium = parseCurrencyValue(contract.totalPremium) || 0
    const downPayment = parseCurrencyValue(contract.downPayment) || 0
    const unpaidBalance = totalPremium - downPayment
    const monthlyPayment = parseCurrencyValue(contract.monthlyPayment) || 0
    const numberOfPayments = parseInt(contract.numberOfPayments) || 0
    const financeCharge = (monthlyPayment * numberOfPayments) - unpaidBalance
    const totalOfPayments = monthlyPayment * numberOfPayments

    return (
      <div className="w-full bg-slate-100 py-12">
        <div className="mx-auto max-w-6xl rounded-[24px] bg-white border border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-10">
          <div className="flex flex-col gap-6 border-b-2 border-slate-900 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-4xl font-black text-slate-900">Olimpo Coverage Group</div>
              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-600">{getInsuranceTypeLabel(contract.insuranceType)}</div>
              <div className="mt-4 text-sm text-slate-500">Horsham PA, USA · Phone: (445) 325-0112 · Email: contacto@olimpocoveragegroup.com</div>
            </div>
            <div className="text-right text-sm text-slate-500">
              <div className="font-semibold text-slate-900">Agreement #{contract.contractNumber}</div>
              <div className="mt-3">Date: {contract.contractDate || contractDate || new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Insured</div>
              <div className="mt-4 text-base font-semibold text-slate-900">{contract.clientCompanyName}</div>
              <div className="mt-2 text-sm text-slate-600">{contract.clientAddress}</div>
              <div className="text-sm text-slate-600">{contract.clientCity}, {contract.clientState} {contract.clientZip}</div>
              <div className="mt-4 text-sm text-slate-700"><span className="font-semibold">Phone:</span> {contract.clientPhone}</div>
              <div className="text-sm text-slate-700"><span className="font-semibold">Email:</span> {contract.clientEmail}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Agent / Producer</div>
              <div className="mt-4 text-base font-semibold text-slate-900">{contractPayeeContact}</div>
              <div className="mt-2 text-sm text-slate-600">{contractPayeeAddress}</div>
              <div className="mt-4 text-sm text-slate-700"><span className="font-semibold">Phone:</span> {contractPayeePhone}</div>
              <div className="text-sm text-slate-700"><span className="font-semibold">Email:</span> {contractPayeeEmail}</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-4">Coverages Provided</div>
            {contractCoverages.length > 0 ? (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50">
                <table className="min-w-full text-left text-sm text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-100 text-slate-900">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Policy #</th>
                      <th className="px-4 py-3">Effective</th>
                      <th className="px-4 py-3">Expires</th>
                      <th className="px-4 py-3">Each Occurrence</th>
                      <th className="px-4 py-3">General Agg.</th>
                      <th className="px-4 py-3">Deductible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractCoverages.map((coverage) => (
                      <tr key={coverage.id} className="border-b border-slate-200 last:border-b-0">
                        <td className="px-4 py-3 text-slate-900">{getInsuranceTypeLabel(coverage.insuranceType)}</td>
                        <td className="px-4 py-3">{coverage.policyNumber}</td>
                        <td className="px-4 py-3">{coverage.effectiveDate}</td>
                        <td className="px-4 py-3">{coverage.expirationDate || 'N/A'}</td>
                        <td className="px-4 py-3">{formatCurrencyDisplay(parseCurrencyValue(coverage.eachOccurrence))}</td>
                        <td className="px-4 py-3">{formatCurrencyDisplay(parseCurrencyValue(coverage.generalAggregate))}</td>
                        <td className="px-4 py-3">{formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">No coverages listed.</div>
            )}
          </div>

          {contractCoverages.map(renderCoverageLimitsPreview)}

          <div className="mt-10 space-y-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-4">Agreement Summary</div>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Total Premium</div>
                  <div className="mt-2 text-lg font-bold">{formatCurrencyDisplay(totalPremium)}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Down Payment</div>
                  <div className="mt-2 text-lg font-bold">{formatCurrencyDisplay(downPayment)}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Unpaid Balance</div>
                  <div className="mt-2 text-lg font-bold">{formatCurrencyDisplay(unpaidBalance)}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Finance Charge %</div>
                  <div className="mt-2 text-lg font-bold">{contract.financeChargePercent || financeChargePercent || '0'}%</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Finance Charge</div>
                  <div className="mt-2 text-lg font-bold">{formatCurrencyDisplay(financeCharge)}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Amount Financed</div>
                  <div className="mt-2 text-lg font-bold">{formatCurrencyDisplay(draftAmountFinanced)}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-4">Payment Schedule</div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Monthly Payment</div>
                  <div className="mt-2 text-lg font-bold">{formatCurrencyDisplay(monthlyPayment)}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Payments</div>
                  <div className="mt-2 text-lg font-bold">{numberOfPayments}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">First Due</div>
                  <div className="mt-2 text-lg font-bold">{contract.firstDueDate}</div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Total Payments</div>
                  <div className="mt-2 text-lg font-bold">{formatCurrencyDisplay(totalOfPayments)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-700">
              This agreement confirms that all premiums are due in accordance with the payment schedule shown above. Failure to pay may result in cancellation of coverage, acceleration of the contract, and applicable collection charges.
            </div>

            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-4">Terms and Conditions</div>
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700 font-serif">{contract.termsAndConditions}</div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 border-t border-slate-200 pt-8">
              <div>
                <div className="h-14 border-b border-slate-900"></div>
                <div className="mt-3 text-sm font-semibold text-slate-900">Insured Signature</div>
                <div className="mt-2 text-sm text-slate-400">(Client signature)</div>
                <div className="text-xs text-slate-500">Date: ________________________</div>
              </div>
              <div>
                <div className="h-14 border-b border-slate-900"></div>
                <div className="mt-3 text-sm font-semibold text-slate-900">Authorized Agent - Olimpo Coverage Group</div>
                <div className="mt-2"><SignatureGraphic /></div>
                <div className="mt-2 text-sm font-semibold text-slate-900">Benito Gonzales</div>
                <div className="text-xs text-slate-500">Date: ________________________</div>
              </div>
            </div>

            <div className="mt-8 text-xs text-slate-400">Agreement # {contract.contractNumber}</div>

            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
              <div className="text-lg font-bold mb-2 text-slate-900">Receipt</div>
              <div className="text-sm text-slate-700">Date: {contract.contractDate || new Date().toLocaleDateString()}</div>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold text-slate-900">Payor (Pagador)</div>
                  <div className="text-slate-800">{contract.clientCompanyName}</div>
                  <div className="text-slate-800">{contract.clientAddress}</div>
                  <div className="text-slate-800">{contract.clientCity}, {contract.clientState} {contract.clientZip}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Payee (Receptor)</div>
                  <div className="text-slate-800">{contractPayeeContact}</div>
                  <div className="text-slate-800">{contractPayeeAddress}</div>
                  <div className="text-xs text-slate-500 mt-1">Authorized to receive payments</div>
                </div>
              </div>
              <div className="mt-4 text-right text-xl font-bold text-slate-900">{formatCurrencyDisplay(parseCurrencyValue(contract.downPayment))}</div>
              <div className="mt-2 text-xs text-slate-500">Payment method: Card (number not stored). This is a receipt for the Down Payment only.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const CertificateWorkerComp = ({ coverage, index }: { coverage: Coverage; index: number }) => (
    <div id={`certificate-${index}`} className="bg-white text-slate-900 p-8 rounded-xl">
      <div className="border-4 border-red-600 p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-bold">OLIMPO COVERAGE GROUP</p>
            <p className="text-xs">Workers Compensation Insurance</p>
            <p className="text-xs">Horsham PA, USA | (445) 325-0112</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">CERTIFICATE</p>
            <p className="text-xs text-slate-600">of Coverage</p>
          </div>
        </div>

        <div className="border-t-2 border-red-600 pt-4">
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-xs font-semibold text-slate-700">INSURED:</p>
              <p className="font-semibold">{coverage.insuredName}</p>
              <p className="text-sm">{clientAddress1}</p>
              {clientAddress2 && <p className="text-sm">{clientAddress2}</p>}
              <p className="text-sm">{clientCity}, {clientState} {clientZip}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">POLICY DETAILS:</p>
              <p className="text-sm"><span className="font-semibold">Policy #:</span> {coverage.policyNumber}</p>
              <p className="text-sm"><span className="font-semibold">Effective:</span> {coverage.effectiveDate}</p>
              <p className="text-sm"><span className="font-semibold">Expires:</span> {coverage.expirationDate || 'Not Set'}</p>
            </div>
          </div>

          <div className="border border-slate-300 rounded p-4 mb-4">
            <p className="text-xs font-semibold text-slate-700 mb-3">COVERAGE & LIMITS:</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="border-r border-slate-300">
                <p className="text-xs text-slate-600">Each Occurrence</p>
                <p className="font-bold text-lg">{formatCurrencyDisplay(parseCurrencyValue(coverage.eachOccurrence))}</p>
              </div>
              <div className="border-r border-slate-300">
                <p className="text-xs text-slate-600">Aggregate Limit</p>
                <p className="font-bold text-lg">{formatCurrencyDisplay(parseCurrencyValue(coverage.generalAggregate))}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Deductible</p>
                <p className="font-bold text-lg">{formatCurrencyDisplay(parseCurrencyValue(coverage.deductible))}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded p-3 mb-4 text-xs">
            <p className="font-semibold mb-2">IMPORTANT NOTICE:</p>
            <p>This Certificate of Coverage is issued as a matter of information only. This certificate confers no rights upon the certificate holder and does not affirmatively or negatively amend, extend or alter the coverage afforded by the policies below.</p>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-semibold text-slate-700">CANCELLATION:</p>
              <p className="text-xs mt-1">Notice of cancellation will be delivered in accordance with policy provisions.</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-900 w-40 h-12 flex items-end justify-center mb-1">
                <SignatureGraphic />
              </div>
              <p className="text-xs font-semibold">Authorized Representative</p>
              <p className="text-xs">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const CertificateGeneralLiability = ({ coverage, index }: { coverage: Coverage; index: number }) => (
    <div id={`certificate-${index}`} className="bg-white text-slate-900 p-8 rounded-xl">
      <div className="border border-slate-900 p-8">
        <div className="flex justify-between items-start mb-6 border-b-2 border-slate-900 pb-4">
          <div>
            <p className="text-2xl font-bold">CERTIFICATE OF LIABILITY INSURANCE</p>
            <p className="text-xs mt-2 italic">THIS CERTIFICATE IS ISSUED AS A MATTER OF INFORMATION ONLY AND CONFERS NO RIGHTS UPON THE CERTIFICATE HOLDER.</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">Policy #</p>
            <p className="text-lg font-bold">{coverage.policyNumber}</p>
            <p className="text-xs font-semibold mt-2">DATE</p>
            <p className="text-sm">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-slate-300 p-3">
            <p className="text-xs font-semibold">PRODUCER</p>
            <p className="text-sm mt-2">Olimpo Coverage Group</p>
            <p className="text-sm">Horsham PA, USA</p>
            <p className="text-sm">(445) 325-0112</p>
            <p className="text-sm">contacto@olimpocoveragegroup.com</p>
          </div>
          <div className="border border-slate-300 p-3">
            <p className="text-xs font-semibold">INSURER(S)</p>
            <p className="text-sm mt-2">Olimpo Coverage Group - Commercial</p>
          </div>
        </div>

        <div className="border border-slate-300 p-3 mb-4">
          <p className="text-xs font-semibold">INSURED</p>
          <p className="text-sm mt-2">{coverage.insuredName}</p>
          <p className="text-sm">{clientAddress1}</p>
          {clientAddress2 && <p className="text-sm">{clientAddress2}</p>}
          <p className="text-sm">{clientCity}, {clientState} {clientZip}</p>
        </div>

        <table className="w-full border-collapse border border-slate-300 mb-4 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left font-semibold">TYPE OF INSURANCE</th>
              <th className="border border-slate-300 p-2 text-left font-semibold">COVERAGE</th>
              <th className="border border-slate-300 p-2 text-left font-semibold">LIMIT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2">General Liability</td>
              <td className="border border-slate-300 p-2">Each Occurrence</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.eachOccurrence))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Damage to Rented Premises (Ea occurrence)</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.damageToRentedPremises))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Med Exp (Any one person)</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.medExp))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Personal & Adv Injury</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.personalAdvInjury))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">General Aggregate</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.generalAggregate))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Products - Comp/Op Agg</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.productsCompletedOpsAgg))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Combined Single Limit (Ea accident)</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.combinedSingleLimit))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Bodily Injury (Per person)</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerPerson))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Bodily Injury (Per accident)</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.bodilyInjuryPerAccident))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">Property Damage (Per accident)</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.propertyDamagePerAccident))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">E.L. Each Accident</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.elEachAccident))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">E.L. Disease - Ea Employee</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.elDiseaseEaEmployee))}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2"></td>
              <td className="border border-slate-300 p-2">E.L. Disease - Policy Limit</td>
              <td className="border border-slate-300 p-2 font-semibold">{formatCurrencyDisplay(parseCurrencyValue(coverage.elDiseasePolicyLimit))}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-end mt-6">
          <div>
            <p className="text-xs font-semibold">CANCELLATION:</p>
            <p className="text-xs mt-1 max-w-sm">Should any of the above described policies be cancelled before the expiration date thereof, notice will be delivered in accordance with the policy provisions.</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-900 w-40 h-12 flex items-end justify-center mb-1">
              <SignatureGraphic />
            </div>
            <p className="text-xs font-semibold">AUTHORIZED REPRESENTATIVE</p>
          </div>
        </div>
      </div>
    </div>
  )

  const CertificateCommercialAuto = ({ coverage, index }: { coverage: Coverage; index: number }) => {
    const vehiclesList = vehicles && vehicles.length > 0 ? vehicles : [{ year: '', make: '', model: '', vin: '' }]
    
    return (
      <div id={`certificate-${index}`} className="bg-white text-slate-900 p-8 rounded-xl">
        {vehiclesList.map((v, vehicleIndex) => (
          <div 
            key={vehicleIndex} 
            className="mb-8 max-w-4xl mx-auto" 
            style={{ pageBreakAfter: vehicleIndex < vehiclesList.length - 1 ? 'always' : 'avoid' }}
          >
            {/* Header Section */}
            <div className="flex justify-between items-start gap-4 border-b border-slate-800 pb-6 mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold uppercase tracking-wide text-slate-800">Olimpo Coverage Group</h2>
                <p className="text-sm mt-1 text-slate-700">Horsham PA, USA · (445) 325-0112 · contacto@olimpocoveragegroup.com</p>
              </div>
              <div className="text-right text-sm">
                <strong className="block text-slate-800">Agreement #</strong>
                <span className="font-semibold">{contractNumber || 'OCG-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000)}</span>
                <br />
                <strong className="block text-slate-800 mt-2">Date</strong>
                <span>{contractDate || new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Main Card */}
            <div className="flex gap-4 border-b border-dashed border-slate-400 pb-6 mb-6">
              {/* Left Side */}
              <div className="flex-1">
                <h3 className="text-sm font-bold uppercase text-slate-800 mb-4">Pennsylvania Financial Responsibility Identification Card</h3>
                <p className="text-xs text-slate-700 mb-4">This card must be shown to any Law Enforcement Officer upon request.</p>
                <p className="text-xs font-semibold uppercase text-slate-800 mb-2">Agency / Insurer Name</p>
                <p className="font-semibold text-slate-900">Olimpo Coverage Group</p>
                <p className="text-xs mt-1 text-slate-700">To report a claim call: (445) 325-0112</p>
                <p className="text-xs font-semibold uppercase text-slate-800 mt-3">NOT VALID MORE THAN 1 YEAR FROM EFFECTIVE DATE</p>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Policy #:</p>
                  <p className="font-semibold">{coverage.policyNumber}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-1">Policy Period:</p>
                  <p className="font-semibold">{coverage.effectiveDate} - {coverage.expirationDate || 'N/A'}</p>
                </div>
                <div className="mt-6">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Insured:</p>
                  <p className="font-semibold">{coverage.insuredName || clientCompanyName}</p>
                  <p className="text-sm text-slate-700">{clientAddress1}</p>
                  {clientAddress2 && <p className="text-sm text-slate-700">{clientAddress2}</p>}
                  <p className="text-sm text-slate-700">{clientCity}, {clientState} {clientZip}</p>
                </div>
                <div className="mt-6">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Your Agent: Olimpo Coverage Group at (445) 325-0112</p>
                  <p className="text-xs font-semibold uppercase text-slate-800 mb-2">Applicable with respect to the following motor vehicles:</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700">Year</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Make</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Model</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Vehicle Identification</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs mt-1">
                    <div>{v.year || ''}</div>
                    <div>{v.make || ''}</div>
                    <div>{v.model || ''}</div>
                    <div className="font-mono">{v.vin || ''}</div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-xs font-semibold text-slate-800">SEE IMPORTANT MESSAGE ON REVERSE SIDE</p>
                </div>
                <div className="mt-4">
                  <svg width="100" height="50" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 15 C30 5 70 5 90 15" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 25 C20 10 40 40 60 20 C80 0 95 35 90 25" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 30 C25 15 45 45 65 25 C85 5 90 40 85 30" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 10 L85 40" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Right Side */}
              <div className="w-1/2 border-l border-dashed border-slate-400 pl-4">
                <h3 className="text-sm font-bold text-slate-800 mb-4">THIS CARD MUST BE CARRIED FOR PRODUCTION UPON DEMAND. IT IS SUGGESTED THAT YOU CARRY THIS CARD IN THE INSURED VEHICLE.</h3>
                <div className="mb-6">
                  <p className="text-sm font-semibold text-red-700 uppercase">WARNING:</p>
                  <p className="text-xs text-slate-800 mt-1">
                    Any owner or registrant of a motor vehicle who drives or permits a motor vehicle to be driven in this State without the required financial responsibility may have his registration suspended or revoked.
                  </p>
                </div>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase text-slate-800 mb-2">NOTE: THIS CARD IS REQUIRED WHEN:</p>
                  <ul className="text-xs text-slate-800 list-disc pl-4 space-y-1">
                    <li>You are involved in an auto accident.</li>
                    <li>You are convicted of a traffic offense other than a parking offense that requires a court appearance.</li>
                    <li>You are stopped for violating any provision of 75 Pa.C.S. relating to the Vehicle Code and requested to produce it by a police officer.</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-slate-700">
                    You must provide a copy of this card to the Department of Transportation when you request restoration of your operating privilege and/or registration privilege which has been previously suspended or revoked.
                  </p>
                </div>
              </div>
            </div>

            {/* Important Notice (Reverse Side) */}
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase text-slate-800 mb-3">Important Notice Regarding Your Financial Responsibility Identification Card</h3>
              <p className="text-sm text-slate-800 mb-3">
                Agency / Insurer Name of MD, Inc. is required by Pennsylvania law to send you an I.D. card. The card shows that an insurance policy has been issued for the vehicle(s) described satisfying the financial responsibility requirements of the law.
              </p>
              <p className="text-sm text-slate-800 mb-3">
                If you lose the card, contact your insurance company or agent for a replacement.
              </p>
              <p className="text-sm text-slate-800 mb-3">
                The I.D. card information may be used for vehicle registration and replacing license plates. If your liability insurance policy is not in effect, the I.D. card is no longer valid.
              </p>
              <p className="text-sm text-slate-800">
                You are required to maintain financial responsibility on your vehicle. It is against Pennsylvania law to use the I.D. card fraudulently such as using the card as proof of financial responsibility after the insurance policy is terminated.
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const Acord25Certificate = ({ coverage, index }: { coverage: Coverage; index: number }) => {
    const formatCurrencyOrEmpty = (val: string | number | null | undefined): string => {
      const num = parseCurrencyValue(val);
      if (num == null) return '';
      return `$${num.toLocaleString('en-US')}`;
    };

    let typeText = '';
    let limitsRows: string[][] = [];

    if (coverage.insuranceType === 'general-liability') {
      typeText = 'X  COMMERCIAL GENERAL LIABILITY';
      limitsRows = [
        ['EACH OCCURRENCE', formatCurrencyOrEmpty(coverage.eachOccurrence)],
        ['DMG TO RENTED PREMISES (Ea occurrence)', formatCurrencyOrEmpty(coverage.damageToRentedPremises)],
        ['MED EXP (Any one person)', formatCurrencyOrEmpty(coverage.medExp)],
        ['PERSONAL & ADV INJURY', formatCurrencyOrEmpty(coverage.personalAdvInjury)],
        ['GENERAL AGGREGATE', formatCurrencyOrEmpty(coverage.generalAggregate)],
        ['PRODUCTS-COMP/OPS AGG', formatCurrencyOrEmpty(coverage.productsCompletedOpsAgg)],
      ].filter(([, val]) => val);
    } else if (coverage.insuranceType === 'commercial-property') {
      typeText = 'X  COMMERCIAL PROPERTY';
      limitsRows = [
        ['BUILDING LIMIT', formatCurrencyOrEmpty(coverage.propertyBuildingLimit)],
        ['BUSINESS PERSONAL PROPERTY', formatCurrencyOrEmpty(coverage.propertyPersonalPropertyLimit)],
        ['DEDUCTIBLE', formatCurrencyOrEmpty(coverage.deductible)],
      ].filter(([, val]) => val);
    } else if (coverage.insuranceType === 'workers-comp') {
      typeText = 'X  WORKERS COMPENSATION AND EMPLOYERS LIABILITY';
      limitsRows = [
        ['E.L. EACH ACCIDENT', formatCurrencyOrEmpty(coverage.elEachAccident)],
        ['E.L. DISEASE - EA EMPLOYEE', formatCurrencyOrEmpty(coverage.elDiseaseEaEmployee)],
        ['E.L. DISEASE - POLICY LIMIT', formatCurrencyOrEmpty(coverage.elDiseasePolicyLimit)],
      ].filter(([, val]) => val);
    }

    return (
      <div id={`certificate-${index}`} className="bg-white text-slate-900 p-8 rounded-xl">
        <div className="max-w-4xl mx-auto">
          <div className="border-b-2 border-black pb-2 mb-3 flex justify-between items-start">
            <div className="text-2xl font-bold">OLIMPO COVERAGE GROUP</div>
            <div className="text-xl font-bold uppercase text-center flex-1 mx-8">CERTIFICATE OF LIABILITY INSURANCE</div>
            <div className="text-right text-sm">DATE: {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
          </div>
          <p className="text-xs mb-3">
            THIS CERTIFICATE IS ISSUED AS A MATTER OF INFORMATION ONLY AND CONFERS NO RIGHTS UPON THE CERTIFICATE HOLDER. THIS CERTIFICATE DOES NOT AFFIRMATIVELY OR NEGATIVELY AMEND, EXTEND OR ALTER THE COVERAGE AFFORDED BY THE POLICIES BELOW. THIS CERTIFICATE OF INSURANCE DOES NOT CONSTITUTE A CONTRACT BETWEEN THE ISSUING INSURER(S), AUTHORIZED REPRESENTATIVE OR PRODUCER, AND THE CERTIFICATE HOLDER.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs font-bold uppercase">Producer</p>
              <div className="border border-black p-2 text-xs">
                Olimpo Coverage Group<br/>
                2600 W Executive Pkwy, Ste 500<br/>
                Lehi, UT 84043
              </div>
            </div>
            <div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-xs font-bold uppercase">Contact Name</p>
                  <div className="border border-black p-1 text-xs">Bennito Gonzalez</div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase">Phone</p>
                  <div className="border border-black p-1 text-xs">(445) 325-0112</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-bold uppercase">Email Adr</p>
                  <div className="border border-black p-1 text-xs">contacto@olimpocoveragegroup.com</div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase">Fax</p>
                  <div className="border border-black p-1 text-xs"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs font-bold uppercase">Insured</p>
              <div className="border border-black p-2 text-xs">
                {coverage.insuredName || clientCompanyName}<br/>
                {clientAddress1}<br/>
                {clientCity}, {clientState} {clientZip}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase">Insurer(s) Affording Coverage</p>
              <div className="border border-black p-2 text-xs">
                <div className="border-b border-gray-300 pb-1 mb-1">
                  <span className="text-xs font-bold">A:</span> Olimpo Coverage Group
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs font-bold uppercase">Certificate Number</p>
              <div className="border border-black p-2 text-xs">{coverage.id}</div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase">Revision Number</p>
              <div className="border border-black p-2 text-xs"></div>
            </div>
          </div>

          <table className="w-full mb-3 border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '8%'}}>INSR LTR</th>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '20%'}}>TYPE OF INSURANCE</th>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '10%'}}>ADDL INSRD</th>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '8%'}}>SUBR WVD</th>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '15%'}}>POLICY NUMBER</th>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '12%'}}>POLICY EFF</th>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '12%'}}>POLICY EXP</th>
                <th className="border border-black p-1 bg-gray-100 font-bold uppercase" style={{width: '15%'}}>LIMITS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">A</td>
                <td className="border border-black p-1">{typeText}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1">{coverage.policyNumber}</td>
                <td className="border border-black p-1">{coverage.effectiveDate}</td>
                <td className="border border-black p-1">{coverage.expirationDate || 'N/A'}</td>
                <td className="border border-black p-1">
                  <table style={{ width: '100%', border: 'none', margin: 0, padding: 0 }}>
                    <tbody>
                      {limitsRows.map(([label, value], i) => (
                        <tr key={i} style={{ border: 'none' }}>
                          <td style={{ border: 'none', padding: '2px 0', fontSize: '9px' }}>{label}</td>
                          <td style={{ border: 'none', padding: '2px 0', textAlign: 'right', fontSize: '9px' }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs mb-3">
            DESCRIPTION OF OPERATIONS / LOCATIONS / VEHICLES (Attach ACORD 101, Additional Remarks Schedule, if more space is required)
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs font-bold uppercase">Certificate Holder</p>
              <div className="border border-black p-2 text-xs">
                {coverage.certificateHolderName || 'N/A'}
                {coverage.certificateHolderAddress && <><br/>{coverage.certificateHolderAddress}</>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase">Cancellation</p>
              <div className="border border-black p-2 text-xs">
                SHOULD ANY OF THE ABOVE DESCRIBED POLICIES BE CANCELLED BEFORE THE EXPIRATION DATE THEREOF, NOTICE WILL BE DELIVERED IN ACCORDANCE WITH THE POLICY PROVISIONS.
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end mt-6">
            <div></div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase">Authorized Representative</p>
              <div className="border-b border-black w-40 h-12 flex items-end justify-center mb-1">
                <SignatureGraphic />
              </div>
            </div>
          </div>

          <p className="text-center text-xs mt-3">Olimpo Coverage Group (2026)</p>
        </div>
      </div>
    );
  }

  const renderCertificate = (coverage: Coverage, index: number) => {
    if (coverage.insuranceType === 'commercial-auto') {
      return <CertificateCommercialAuto coverage={coverage} index={index} />
    } else {
      return <Acord25Certificate coverage={coverage} index={index} />
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-400">Please log in to access the admin panel</p>
        </div>
      </div>
    )
  }

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isCheckingAdmin && !isAdmin && user) {
    // User is authenticated but not in admins table
    // For development, allow access anyway
    console.warn('User not in admins table, but allowing access for development')
  }

  if (!isCheckingAdmin && !isAdmin && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-400">Please log in to access the admin panel</p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <AdminShell>
      <div className="min-h-screen rounded-3xl border border-slate-800 bg-slate-900/80 py-8 px-4 sm:px-6 lg:px-8">
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            [id^="certificate-"] {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>

        <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-2 inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Insurance Contracts</h1>
          <p className="text-slate-400">Professional Certificate Management System</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-6 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'form' ? 'bg-blue-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Create Contract
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'preview' ? 'bg-blue-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Preview Certificates ({coverages.length})
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-6 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'contracts' ? 'bg-blue-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Payment Agreements ({contracts.length})
          </button>
        </div>

        {activeTab === 'form' && (
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 space-y-8">
            {/* Contract Header */}
            <div className="border-b border-slate-700 pb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Contract Information</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contract Number</label>
                  <input
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="OCG-2026-0001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Policy Number</label>
                  <input
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="PA-A-1001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contract Date</label>
                  <input
                    type="date"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="border-b border-slate-700 pb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Client Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                  <input
                    value={clientCompanyName}
                    onChange={(e) => setClientCompanyName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Client Company LLC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Address Line 1</label>
                  <input
                    value={clientAddress1}
                    onChange={(e) => setClientAddress1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Address Line 2</label>
                  <input
                    value={clientAddress2}
                    onChange={(e) => setClientAddress2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                  <input
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                  <input
                    value={clientState}
                    onChange={(e) => setClientState(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">ZIP</label>
                  <input
                    value={clientZip}
                    onChange={(e) => setClientZip(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-b border-slate-700 pb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Payment Details</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Total Premium</label>
                  <input
                    value={totalPremium}
                    onChange={(e) => setTotalPremium(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Down Payment</label>
                  <input
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Finance Charge %</label>
                  <input
                    value={financeChargePercent}
                    onChange={(e) => setFinanceChargePercent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Payment</label>
                  <input
                    value={draftFinanceChargePercent > 0 && draftNumberOfPayments > 0 ? draftMonthlyPayment.toFixed(2) : monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    readOnly={draftFinanceChargePercent > 0 && draftNumberOfPayments > 0}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="1000"
                  />
                  {draftFinanceChargePercent > 0 && draftNumberOfPayments > 0 && (
                    <p className="mt-2 text-xs text-slate-400">Monthly payment auto-calculated from finance charge percent and number of payments.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Number of Payments</label>
                  <input
                    value={numberOfPayments}
                    onChange={(e) => setNumberOfPayments(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">First Due Date</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Terms and Conditions</label>
                  <textarea
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Insurance Coverages */}
            <div className="border-b border-slate-700 pb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Insurance Coverages</h2>
                <button
                  onClick={addCoverage}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-semibold transition-all"
                >
                  + Add Coverage
                </button>
              </div>

              <div className="space-y-6">
                {coverages.map((coverage, idx) => (
                  <div key={coverage.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">Coverage #{idx + 1}</h3>
                      <button
                        onClick={() => removeCoverage(coverage.id)}
                        className="text-red-500 hover:text-red-700 font-semibold"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Insurance Type</label>
                        <select
                          value={coverage.insuranceType}
                          onChange={(e) => updateCoverage(coverage.id, 'insuranceType', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        >
                          {insuranceTypes.map(type => (
                            <option key={type.key} value={type.key}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Policy Number</label>
                        <input
                          value={coverage.policyNumber}
                          onChange={(e) => updateCoverage(coverage.id, 'policyNumber', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Insured Name</label>
                        <input
                          value={coverage.insuredName}
                          onChange={(e) => updateCoverage(coverage.id, 'insuredName', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          placeholder={clientCompanyName}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Effective Date</label>
                        <input
                          type="date"
                          value={coverage.effectiveDate}
                          onChange={(e) => updateCoverage(coverage.id, 'effectiveDate', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Expiration Date</label>
                        <input
                          type="date"
                          value={coverage.expirationDate}
                          onChange={(e) => updateCoverage(coverage.id, 'expirationDate', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Each Occurrence</label>
                        <input
                          value={coverage.eachOccurrence}
                          onChange={(e) => updateCoverage(coverage.id, 'eachOccurrence', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          placeholder="1000000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">General Aggregate</label>
                        <input
                          value={coverage.generalAggregate}
                          onChange={(e) => updateCoverage(coverage.id, 'generalAggregate', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          placeholder="2000000"
                        />
                      </div>
                    </div>

                    {coverage.insuranceType === 'general-liability' && (
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Damage to Rented Premises</label>
                          <input
                            value={coverage.damageToRentedPremises}
                            onChange={(e) => updateCoverage(coverage.id, 'damageToRentedPremises', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="50000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Med Exp (Any one person)</label>
                          <input
                            value={coverage.medExp}
                            onChange={(e) => updateCoverage(coverage.id, 'medExp', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Personal & Adv Injury</label>
                          <input
                            value={coverage.personalAdvInjury}
                            onChange={(e) => updateCoverage(coverage.id, 'personalAdvInjury', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="1000000"
                          />
                        </div>
                      </div>
                    )}

                    {coverage.insuranceType === 'commercial-auto' && (
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Any Auto</label>
                          <input
                            value={coverage.autoAnyAuto}
                            onChange={(e) => updateCoverage(coverage.id, 'autoAnyAuto', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Any Auto limit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Owned Autos</label>
                          <input
                            value={coverage.autoOwnedAuto}
                            onChange={(e) => updateCoverage(coverage.id, 'autoOwnedAuto', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Owned autos limit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Hired Autos Only</label>
                          <input
                            value={coverage.autoHiredAutosOnly}
                            onChange={(e) => updateCoverage(coverage.id, 'autoHiredAutosOnly', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Hired autos limit"
                          />
                        </div>
                      </div>
                    )}

                    {coverage.insuranceType === 'commercial-auto' && (
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Non-Owned Autos Only</label>
                          <input
                            value={coverage.autoNonOwnedAutosOnly}
                            onChange={(e) => updateCoverage(coverage.id, 'autoNonOwnedAutosOnly', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Non-owned autos limit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Scheduled Autos</label>
                          <input
                            value={coverage.autoScheduledAutos}
                            onChange={(e) => updateCoverage(coverage.id, 'autoScheduledAutos', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Scheduled autos limit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Combined Single Limit</label>
                          <input
                            value={coverage.combinedSingleLimit}
                            onChange={(e) => updateCoverage(coverage.id, 'combinedSingleLimit', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {coverage.insuranceType === 'commercial-property' && (
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Building Limit</label>
                          <input
                            value={coverage.propertyBuildingLimit}
                            onChange={(e) => updateCoverage(coverage.id, 'propertyBuildingLimit', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Building limit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Business Personal Property</label>
                          <input
                            value={coverage.propertyPersonalPropertyLimit}
                            onChange={(e) => updateCoverage(coverage.id, 'propertyPersonalPropertyLimit', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Personal property limit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Deductible</label>
                          <input
                            value={coverage.deductible}
                            onChange={(e) => updateCoverage(coverage.id, 'deductible', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="1000"
                          />
                        </div>
                      </div>
                    )}

                    {coverage.insuranceType === 'general-liability' && (
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Products - Comp/Op Agg</label>
                          <input
                            value={coverage.productsCompletedOpsAgg}
                            onChange={(e) => updateCoverage(coverage.id, 'productsCompletedOpsAgg', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="1000000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Combined Single Limit</label>
                          <input
                            value={coverage.combinedSingleLimit}
                            onChange={(e) => updateCoverage(coverage.id, 'combinedSingleLimit', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Bodily Injury Per Person</label>
                          <input
                            value={coverage.bodilyInjuryPerPerson}
                            onChange={(e) => updateCoverage(coverage.id, 'bodilyInjuryPerPerson', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {coverage.insuranceType === 'general-liability' && (
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Bodily Injury Per Accident</label>
                          <input
                            value={coverage.bodilyInjuryPerAccident}
                            onChange={(e) => updateCoverage(coverage.id, 'bodilyInjuryPerAccident', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Property Damage Per Accident</label>
                          <input
                            value={coverage.propertyDamagePerAccident}
                            onChange={(e) => updateCoverage(coverage.id, 'propertyDamagePerAccident', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">E.L. Each Accident</label>
                          <input
                            value={coverage.elEachAccident}
                            onChange={(e) => updateCoverage(coverage.id, 'elEachAccident', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Certificate Holder Name (Optional)</label>
                        <input
                          value={coverage.certificateHolderName}
                          onChange={(e) => updateCoverage(coverage.id, 'certificateHolderName', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          placeholder="Leave blank to use insured name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Certificate Holder Address (Optional)</label>
                        <input
                          value={coverage.certificateHolderAddress}
                          onChange={(e) => updateCoverage(coverage.id, 'certificateHolderAddress', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          placeholder="Leave blank if not needed"
                        />
                      </div>
                    </div>

                    {coverage.insuranceType === 'general-liability' && (
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">E.L. Disease - Ea Employee</label>
                          <input
                            value={coverage.elDiseaseEaEmployee}
                            onChange={(e) => updateCoverage(coverage.id, 'elDiseaseEaEmployee', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">E.L. Disease - Policy Limit</label>
                          <input
                            value={coverage.elDiseasePolicyLimit}
                            onChange={(e) => updateCoverage(coverage.id, 'elDiseasePolicyLimit', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div />
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Deductible</label>
                      <input
                        value={coverage.deductible}
                        onChange={(e) => updateCoverage(coverage.id, 'deductible', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        placeholder="1000"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicles (for Commercial Auto) */}
            <div className="border-t border-slate-700 pt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Vehicles</h2>
                <button
                  onClick={() => setVehicles([...vehicles, { id: Date.now().toString(), year: '', make: '', model: '', vin: '' }])}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-semibold transition-all"
                >
                  + Add Vehicle
                </button>
              </div>

              <div className="space-y-4">
                {vehicles.map((vehicle, idx) => (
                  <div key={vehicle.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-md font-semibold text-white">Vehicle #{idx + 1}</h3>
                      <button
                        onClick={() => setVehicles(vehicles.filter(v => v.id !== vehicle.id))}
                        className="text-red-500 hover:text-red-700 text-sm font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <input
                        value={vehicle.year}
                        onChange={(e) => {
                          const newVehicles = [...vehicles]
                          newVehicles[idx].year = e.target.value
                          setVehicles(newVehicles)
                        }}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Year"
                      />
                      <input
                        value={vehicle.make}
                        onChange={(e) => {
                          const newVehicles = [...vehicles]
                          newVehicles[idx].make = e.target.value
                          setVehicles(newVehicles)
                        }}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Make"
                      />
                      <input
                        value={vehicle.model}
                        onChange={(e) => {
                          const newVehicles = [...vehicles]
                          newVehicles[idx].model = e.target.value
                          setVehicles(newVehicles)
                        }}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="Model"
                      />
                      <input
                        value={vehicle.vin}
                        onChange={(e) => {
                          const newVehicles = [...vehicles]
                          newVehicles[idx].vin = e.target.value
                          setVehicles(newVehicles)
                        }}
                        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="VIN"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Live Contract Preview</h2>
                  <p className="text-slate-400 text-sm">The draft contract updates automatically from the current form fields.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadDraftContractPDF}
                    className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
                  >
                    Download Draft Contract
                  </button>
                  <button
                    onClick={() => {
                      setShowSendContractPanel((prev) => !prev)
                      setSendContractMessage(null)
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
                  >
                    Send Contract
                  </button>
                </div>
              </div>
              {showSendContractPanel && (
                <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Send contract to a customer</h3>
                      <p className="text-sm text-slate-400">Choose a customer and the contract will be created with the current policy number and sent to their panel.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <select
                      value={selectedCustomerForSend}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setSelectedCustomerForSend(nextValue)
                        if (nextValue) {
                          sendContractToCustomer(nextValue)
                        }
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none"
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.user_id || customer.id} value={customer.user_id || customer.id}>
                          {customer.full_name || customer.email || 'Customer'}
                        </option>
                      ))}
                    </select>
                    {isSendingContract && <span className="text-sm text-slate-400">Sending...</span>}
                  </div>
                  {sendContractMessage && <p className="mt-3 text-sm text-emerald-400">{sendContractMessage}</p>}
                </div>
              )}
              <div className="bg-slate-100 rounded-[24px] p-6">
                {renderContractPreview(draftContract)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            {coverages.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-12 text-center">
                <p className="text-slate-300 text-lg">No coverages added yet. Create a coverage first.</p>
              </div>
            ) : (
              coverages.map((coverage, idx) => (
                <div key={coverage.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{insuranceTypes.find(t => t.key === coverage.insuranceType)?.name}</h3>
                    <button
                      onClick={() => downloadPDF(idx)}
                      className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-slate-900 px-6 py-3 rounded-xl font-bold transition-all"
                    >
                      Download PDF
                    </button>
                  </div>
                  <div className="bg-white rounded-xl overflow-hidden">
                    {renderCertificate(coverage, idx)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-6">
            {contracts.length === 0 ? (
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-12 text-center">
                <p className="text-slate-300 text-lg">No payment agreements created yet. Click &quot;Create New Agreement&quot; to get started.</p>
                <button
                  onClick={async () => {
                    const contractNumberValue = contractNumber || `AGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
                    const uniqueTypes = Array.from(new Set(coverages.map((c) => c.insuranceType)))
                    const contractsToCreate = uniqueTypes.map((insuranceType) => ({
                      contractNumber: contractNumberValue,
                      contractDate: contractDate,
                      insuranceType,
                      clientName: clientCompanyName,
                      clientCompanyName: clientCompanyName,
                      clientAddress: clientAddress1,
                      clientCity: clientCity,
                      clientState: clientState,
                      clientZip: clientZip,
                      clientPhone: clientPhone,
                      clientEmail: clientEmail,
                      totalPremium: totalPremium,
                      downPayment: downPayment,
                      monthlyPayment: monthlyPayment,
                      numberOfPayments: numberOfPayments,
                      firstDueDate: firstDueDate,
                      terms: termsAndConditions || defaultContractTerms,
                      coverageIds: coverages.filter((c) => c.insuranceType === insuranceType).map((c) => c.id),
                      sendToClient: true,
                    }))
                    await createContracts(contractsToCreate)
                  }}
                  className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                >
                  + Create New Agreement
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => {
                      const contractNumberValue = contractNumber || `AGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
                      const uniqueTypes = Array.from(new Set(coverages.map((c) => c.insuranceType)))
                      const contractsToCreate = uniqueTypes.map((insuranceType) => ({
                        id: `${Date.now().toString()}-${insuranceType}`,
                        contractNumber: contractNumberValue,
                        contractDate: contractDate,
                        insuranceType,
                        clientName: clientCompanyName,
                        clientCompanyName: clientCompanyName,
                        clientAddress: clientAddress1,
                        clientCity: clientCity,
                        clientState: clientState,
                        clientZip: clientZip,
                        clientPhone: clientPhone,
                        clientEmail: clientEmail,
                        totalPremium: totalPremium,
                        downPayment: downPayment,
                        unpaidBalance: draftUnpaidBalance.toFixed(2),
                        amountFinanced: draftAmountFinanced.toFixed(2),
                        financeChargePercent: financeChargePercent,
                        financeCharge: draftFinanceCharge.toFixed(2),
                        monthlyPayment: draftFinanceChargePercent > 0 && draftNumberOfPayments > 0 ? draftMonthlyPayment.toFixed(2) : (parseCurrencyValue(monthlyPayment) || 0).toFixed(2),
                        numberOfPayments: numberOfPayments,
                        firstDueDate: firstDueDate,
                        termsAndConditions: termsAndConditions || defaultContractTerms,
                        coverageIds: coverages.filter((c) => c.insuranceType === insuranceType).map((c) => c.id),
                      }))
                      setContracts([...contracts, ...contractsToCreate])
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                  >
                    + Create New Agreement
                  </button>
                </div>
                {contracts.map((contract) => (
                  <div key={contract.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white">{contract.clientCompanyName}</h3>
                        <p className="text-slate-400 text-sm">Agreement #{contract.contractNumber}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            const contractElement = document.createElement('div')
                            contractElement.innerHTML = generateContractPDF(contract)
                            if (html2pdf) {
                              try {
                                const options = {
                                  margin: 10,
                                  filename: `${contract.contractNumber}.pdf`,
                                  image: { type: 'jpeg', quality: 0.98 },
                                  html2canvas: { scale: 2 },
                                  jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
                                }
                                html2pdf().set(options).from(contractElement).save()
                              } catch (error) {
                                console.log('PDF error, using print')
                                window.print()
                              }
                            } else {
                              window.print()
                            }
                          }}
                          className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-slate-900 px-6 py-2 rounded-xl font-bold transition-all"
                        >
                          Download PDF
                        </button>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                          <select
                            value={customerSelectionMap[contract.id] || ''}
                            onChange={(event) => setCustomerSelectionMap((prev) => ({ ...prev, [contract.id]: event.target.value }))}
                            className="bg-transparent text-sm text-slate-200 outline-none"
                          >
                            <option value="">Select customer</option>
                            {customers.map((customer) => (
                              <option key={customer.user_id || customer.id} value={customer.user_id || customer.id}>
                                {customer.full_name || customer.email || 'Customer'}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => assignContractToCustomer(contract.id)}
                            disabled={assigningContractId === contract.id}
                            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                          >
                            {assigningContractId === contract.id ? 'Assigning...' : 'Add to customer'}
                          </button>
                        </div>
                        <button
                          onClick={() => setContracts(contracts.filter(c => c.id !== contract.id))}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-bold transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {assignmentMessage && (
                      <p className="mt-3 text-sm text-emerald-400">{assignmentMessage}</p>
                    )}
                    <div className="mt-4 text-sm text-slate-400">
                      {contract.assignedCustomerId ? 'Linked to customer profile.' : 'Not linked to a customer yet.'}
                    </div>
                    <div className="bg-slate-100 rounded-xl p-0 text-slate-900" style={{ background: '#f8fafc' }}>
                      {renderContractPreview(contract)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </AdminShell>
  )
}
