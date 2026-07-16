'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'

type PlanType = 'basic' | 'medium' | 'premium'
type Language = 'en' | 'es'
type Step = 'form' | 'insurance' | 'plan' | 'contract' | 'payment'

interface Plan {
  id: PlanType
  name: { en: string; es: string }
  deductible: number
  monthlyPrice: number
  initialPayment: number
  coverages: { en: string; es: string }[]
  features: { en: string; es: string }[]
}

interface InsuranceType {
  key: string
  name: { en: string; es: string }
  icon: string
  description: { en: string; es: string }
}

const personalInsuranceTypes: InsuranceType[] = [
  { 
    key: 'personal-auto', 
    name: { en: 'Personal Auto', es: 'Auto Personal' }, 
    icon: '🚗',
    description: {
      en: 'Coverage for your personal vehicles against accidents, theft, and liability',
      es: 'Cobertura para tus vehículos personales contra accidentes, robo y responsabilidad'
    }
  },
  { 
    key: 'motorcycle', 
    name: { en: 'Motorcycle', es: 'Motocicleta' }, 
    icon: '🏍️',
    description: {
      en: 'Protect your motorcycle against accidents, theft, and liability',
      es: 'Protege tu motocicleta contra accidentes, robo y responsabilidad'
    }
  },
  { 
    key: 'pet', 
    name: { en: 'Pet Insurance', es: 'Mascotas' }, 
    icon: '🐕',
    description: {
      en: 'Coverage for veterinary expenses, accidents, and illnesses',
      es: 'Cobertura para gastos veterinarios, accidentes y enfermedades'
    }
  },
  { 
    key: 'mobile-device', 
    name: { en: 'Mobile Device', es: 'Dispositivos Móviles' }, 
    icon: '📱',
    description: {
      en: 'Protect your smartphones and tablets against damage, loss, and theft',
      es: 'Protege tus teléfonos y tabletas contra daños, pérdida y robo'
    }
  },
  { 
    key: 'event', 
    name: { en: 'Event Insurance', es: 'Eventos' }, 
    icon: '🎉',
    description: {
      en: 'Coverage for weddings, parties, and special events',
      es: 'Cobertura para bodas, fiestas y eventos especiales'
    }
  },
  { 
    key: 'bicycle', 
    name: { en: 'Bicycle', es: 'Bicicleta' }, 
    icon: '🚲',
    description: {
      en: 'Protect your bicycle against theft, damage, and liability',
      es: 'Protege tu bicicleta contra robo, daños y responsabilidad'
    }
  },
]

const getPlansForInsurance = (insuranceType: string): Plan[] => {
  const basePlans: Record<string, Plan[]> = {
    'personal-auto': [
      {
        id: 'basic',
        name: { en: 'Basic Auto', es: 'Auto Básico' },
        deductible: 250,
        monthlyPrice: 89,
        initialPayment: 50,
        coverages: [
          { en: 'Liability: $25,000', es: 'Responsabilidad: $25,000' },
          { en: 'Collision: $10,000', es: 'Colisión: $10,000' },
          { en: 'Comprehensive: $5,000', es: 'Completo: $5,000' },
        ],
        features: [
          { en: 'Basic liability coverage', es: 'Cobertura de responsabilidad básica' },
          { en: '24/7 claims support', es: 'Soporte de reclamos 24/7' },
        ]
      },
      {
        id: 'medium',
        name: { en: 'Standard Auto', es: 'Auto Estándar' },
        deductible: 500,
        monthlyPrice: 149,
        initialPayment: 100,
        coverages: [
          { en: 'Liability: $50,000', es: 'Responsabilidad: $50,000' },
          { en: 'Collision: $25,000', es: 'Colisión: $25,000' },
          { en: 'Comprehensive: $10,000', es: 'Completo: $10,000' },
          { en: 'Uninsured motorist: $25,000', es: 'Motorista no asegurado: $25,000' },
        ],
        features: [
          { en: 'Extended liability coverage', es: 'Cobertura de responsabilidad ampliada' },
          { en: 'Roadside assistance', es: 'Asistencia en carretera' },
          { en: 'Rental car coverage', es: 'Cobertura de auto de alquiler' },
        ]
      },
      {
        id: 'premium',
        name: { en: 'Premium Auto', es: 'Auto Premium' },
        deductible: 1000,
        monthlyPrice: 249,
        initialPayment: 150,
        coverages: [
          { en: 'Liability: $100,000', es: 'Responsabilidad: $100,000' },
          { en: 'Collision: $50,000', es: 'Colisión: $50,000' },
          { en: 'Comprehensive: $25,000', es: 'Completo: $25,000' },
          { en: 'Uninsured motorist: $50,000', es: 'Motorista no asegurado: $50,000' },
          { en: 'Medical payments: $5,000', es: 'Pagos médicos: $5,000' },
        ],
        features: [
          { en: 'Full coverage protection', es: 'Protección de cobertura total' },
          { en: 'Premium roadside assistance', es: 'Asistencia en carretera premium' },
          { en: 'New car replacement', es: 'Reemplazo de auto nuevo' },
          { en: 'Gap coverage', es: 'Cobertura de brecha' },
        ]
      }
    ],
    'motorcycle': [
      {
        id: 'basic',
        name: { en: 'Basic Motorcycle', es: 'Motocicleta Básica' },
        deductible: 250,
        monthlyPrice: 79,
        initialPayment: 40,
        coverages: [
          { en: 'Liability: $15,000', es: 'Responsabilidad: $15,000' },
          { en: 'Collision: $5,000', es: 'Colisión: $5,000' },
        ],
        features: [
          { en: 'Basic liability coverage', es: 'Cobertura de responsabilidad básica' },
        ]
      },
      {
        id: 'medium',
        name: { en: 'Standard Motorcycle', es: 'Motocicleta Estándar' },
        deductible: 500,
        monthlyPrice: 129,
        initialPayment: 80,
        coverages: [
          { en: 'Liability: $30,000', es: 'Responsabilidad: $30,000' },
          { en: 'Collision: $15,000', es: 'Colisión: $15,000' },
          { en: 'Comprehensive: $5,000', es: 'Completo: $5,000' },
        ],
        features: [
          { en: 'Extended coverage', es: 'Cobertura ampliada' },
          { en: 'Roadside assistance', es: 'Asistencia en carretera' },
        ]
      },
      {
        id: 'premium',
        name: { en: 'Premium Motorcycle', es: 'Motocicleta Premium' },
        deductible: 1000,
        monthlyPrice: 199,
        initialPayment: 120,
        coverages: [
          { en: 'Liability: $50,000', es: 'Responsabilidad: $50,000' },
          { en: 'Collision: $25,000', es: 'Colisión: $25,000' },
          { en: 'Comprehensive: $10,000', es: 'Completo: $10,000' },
          { en: 'Parts and accessories: $5,000', es: 'Partes y accesorios: $5,000' },
        ],
        features: [
          { en: 'Full coverage protection', es: 'Protección de cobertura total' },
          { en: 'Premium roadside assistance', es: 'Asistencia en carretera premium' },
          { en: 'Custom parts coverage', es: 'Cobertura de partes personalizadas' },
        ]
      }
    ],
    'pet': [
      {
        id: 'basic',
        name: { en: 'Basic Pet', es: 'Mascota Básica' },
        deductible: 250,
        monthlyPrice: 29,
        initialPayment: 25,
        coverages: [
          { en: 'Accident coverage: $5,000', es: 'Cobertura de accidentes: $5,000' },
          { en: 'Illness coverage: $3,000', es: 'Cobertura de enfermedades: $3,000' },
        ],
        features: [
          { en: 'Accident and illness coverage', es: 'Cobertura de accidentes y enfermedades' },
        ]
      },
      {
        id: 'medium',
        name: { en: 'Standard Pet', es: 'Mascota Estándar' },
        deductible: 500,
        monthlyPrice: 49,
        initialPayment: 50,
        coverages: [
          { en: 'Accident coverage: $10,000', es: 'Cobertura de accidentes: $10,000' },
          { en: 'Illness coverage: $7,500', es: 'Cobertura de enfermedades: $7,500' },
          { en: 'Hereditary conditions', es: 'Condiciones hereditarias' },
        ],
        features: [
          { en: 'Comprehensive coverage', es: 'Cobertura integral' },
          { en: 'Hereditary conditions covered', es: 'Condiciones hereditarias cubiertas' },
          { en: 'Wellness care included', es: 'Cuidado preventivo incluido' },
        ]
      },
      {
        id: 'premium',
        name: { en: 'Premium Pet', es: 'Mascota Premium' },
        deductible: 1000,
        monthlyPrice: 79,
        initialPayment: 75,
        coverages: [
          { en: 'Accident coverage: $25,000', es: 'Cobertura de accidentes: $25,000' },
          { en: 'Illness coverage: $15,000', es: 'Cobertura de enfermedades: $15,000' },
          { en: 'Hereditary conditions', es: 'Condiciones hereditarias' },
          { en: 'Surgery coverage', es: 'Cobertura de cirugía' },
        ],
        features: [
          { en: 'Maximum coverage protection', es: 'Máxima protección de cobertura' },
          { en: 'All hereditary conditions', es: 'Todas las condiciones hereditarias' },
          { en: 'Emergency care 24/7', es: 'Atención de emergencia 24/7' },
          { en: 'Prescription coverage', es: 'Cobertura de recetas' },
        ]
      }
    ],
    'mobile-device': [
      {
        id: 'basic',
        name: { en: 'Basic Device', es: 'Dispositivo Básico' },
        deductible: 250,
        monthlyPrice: 9,
        initialPayment: 10,
        coverages: [
          { en: 'Screen damage: $500', es: 'Daño de pantalla: $500' },
          { en: 'Theft: $500', es: 'Robo: $500' },
        ],
        features: [
          { en: 'Screen damage coverage', es: 'Cobertura de daño de pantalla' },
        ]
      },
      {
        id: 'medium',
        name: { en: 'Standard Device', es: 'Dispositivo Estándar' },
        deductible: 500,
        monthlyPrice: 15,
        initialPayment: 20,
        coverages: [
          { en: 'Screen damage: $1,000', es: 'Daño de pantalla: $1,000' },
          { en: 'Theft: $1,000', es: 'Robo: $1,000' },
          { en: 'Liquid damage: $500', es: 'Daño por líquido: $500' },
        ],
        features: [
          { en: 'Comprehensive device coverage', es: 'Cobertura integral del dispositivo' },
          { en: 'Worldwide coverage', es: 'Cobertura mundial' },
        ]
      },
      {
        id: 'premium',
        name: { en: 'Premium Device', es: 'Dispositivo Premium' },
        deductible: 650,
        monthlyPrice: 25,
        initialPayment: 30,
        coverages: [
          { en: 'Full device value: $2,000', es: 'Valor completo: $2,000' },
          { en: 'All damage types', es: 'Todos los tipos de daño' },
          { en: 'Loss coverage', es: 'Cobertura de pérdida' },
        ],
        features: [
          { en: 'Complete device protection', es: 'Protección completa del dispositivo' },
          { en: 'Same-day replacement', es: 'Reemplazo el mismo día' },
          { en: 'Worldwide coverage', es: 'Cobertura mundial' },
        ]
      }
    ],
    'event': [
      {
        id: 'basic',
        name: { en: 'Basic Event', es: 'Evento Básico' },
        deductible: 250,
        monthlyPrice: 49,
        initialPayment: 30,
        coverages: [
          { en: 'Cancellation: $10,000', es: 'Cancelación: $10,000' },
          { en: 'Liability: $50,000', es: 'Responsabilidad: $50,000' },
        ],
        features: [
          { en: 'Event cancellation coverage', es: 'Cobertura de cancelación de evento' },
        ]
      },
      {
        id: 'medium',
        name: { en: 'Standard Event', es: 'Evento Estándar' },
        deductible: 500,
        monthlyPrice: 99,
        initialPayment: 60,
        coverages: [
          { en: 'Cancellation: $50,000', es: 'Cancelación: $50,000' },
          { en: 'Liability: $100,000', es: 'Responsabilidad: $100,000' },
          { en: 'Property damage: $25,000', es: 'Daño a propiedad: $25,000' },
        ],
        features: [
          { en: 'Extended cancellation coverage', es: 'Cobertura de cancelación ampliada' },
          { en: 'Vendor protection', es: 'Protección de proveedores' },
        ]
      },
      {
        id: 'premium',
        name: { en: 'Premium Event', es: 'Evento Premium' },
        deductible: 1000,
        monthlyPrice: 199,
        initialPayment: 100,
        coverages: [
          { en: 'Cancellation: $100,000', es: 'Cancelación: $100,000' },
          { en: 'Liability: $500,000', es: 'Responsabilidad: $500,000' },
          { en: 'Property damage: $100,000', es: 'Daño a propiedad: $100,000' },
          { en: 'Weather protection', es: 'Protección climática' },
        ],
        features: [
          { en: 'Maximum event protection', es: 'Máxima protección de evento' },
          { en: 'Weather cancellation', es: 'Cancelación por clima' },
          { en: 'Premium vendor coverage', es: 'Cobertura premium de proveedores' },
        ]
      }
    ],
    'bicycle': [
      {
        id: 'basic',
        name: { en: 'Basic Bicycle', es: 'Bicicleta Básica' },
        deductible: 250,
        monthlyPrice: 9,
        initialPayment: 10,
        coverages: [
          { en: 'Theft: $1,000', es: 'Robo: $1,000' },
          { en: 'Damage: $500', es: 'Daño: $500' },
        ],
        features: [
          { en: 'Theft protection', es: 'Protección contra robo' },
        ]
      },
      {
        id: 'medium',
        name: { en: 'Standard Bicycle', es: 'Bicicleta Estándar' },
        deductible: 500,
        monthlyPrice: 15,
        initialPayment: 20,
        coverages: [
          { en: 'Theft: $2,500', es: 'Robo: $2,500' },
          { en: 'Damage: $1,000', es: 'Daño: $1,000' },
          { en: 'Liability: $10,000', es: 'Responsabilidad: $10,000' },
        ],
        features: [
          { en: 'Comprehensive coverage', es: 'Cobertura integral' },
          { en: 'Liability protection', es: 'Protección de responsabilidad' },
        ]
      },
      {
        id: 'premium',
        name: { en: 'Premium Bicycle', es: 'Bicicleta Premium' },
        deductible: 1000,
        monthlyPrice: 25,
        initialPayment: 30,
        coverages: [
          { en: 'Theft: $5,000', es: 'Robo: $5,000' },
          { en: 'Damage: $2,500', es: 'Daño: $2,500' },
          { en: 'Liability: $25,000', es: 'Responsabilidad: $25,000' },
          { en: 'Accessories: $1,000', es: 'Accesorios: $1,000' },
        ],
        features: [
          { en: 'Maximum protection', es: 'Máxima protección' },
          { en: 'Accessories coverage', es: 'Cobertura de accesorios' },
          { en: 'Race event coverage', es: 'Cobertura de eventos de carrera' },
        ]
      }
    ]
  }
  
  return basePlans[insuranceType] || basePlans['personal-auto']
}

const translations: Record<Language, {
  pageTitle: string
  pageSubtitle: string
  step1: string
  step2: string
  step3: string
  step4: string
  step5: string
  personalInfo: string
  insuranceType: string
  selectPlan: string
  coverageDetails: string
  summary: string
  insuranceTypeLabel: string
  planLabel: string
  deductibleLabel: string
  initialPaymentLabel: string
  monthlyPaymentLabel: string
  generateContract: string
  generating: string
  reviewContract: string
  contractGenerated: string
  contractNumber: string
  viewContract: string
  signContract: string
  continueToPayment: string
  payment: string
  completePayment: string
  paymentSummary: string
  payNow: string
  myPanel: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  ssn: string
  address: string
  city: string
  state: string
  zip: string
  needAccount: string
  register: string
  login: string
  drawSignature: string
  clearSignature: string
  saveSignature: string
  signatureSaved: string
  backToHome: string
}> = {
  en: {
    pageTitle: 'Personal Insurance',
    pageSubtitle: 'Protect what matters most with our customized plans',
    step1: '1. Your Data',
    step2: '2. Insurance Type',
    step3: '3. Select Plan',
    step4: '4. Sign Contract',
    step5: '5. Payment',
    personalInfo: 'Personal Information',
    insuranceType: 'Select Insurance Type',
    selectPlan: 'Choose Your Plan',
    coverageDetails: 'Coverage Details',
    summary: 'Summary',
    insuranceTypeLabel: 'Insurance Type:',
    planLabel: 'Plan:',
    deductibleLabel: 'Deductible:',
    initialPaymentLabel: 'Initial Payment:',
    monthlyPaymentLabel: 'Monthly Payment:',
    generateContract: 'Generate Contract',
    generating: 'Generating Contract...',
    reviewContract: 'Review Your Contract',
    contractGenerated: '✓ Your contract has been generated. Please review and sign below.',
    contractNumber: 'Contract Number:',
    viewContract: 'View Full Contract',
    signContract: 'Sign Contract',
    continueToPayment: 'Continue to Payment',
    payment: 'Make Payment',
    completePayment: 'Complete your initial payment to activate your insurance coverage.',
    paymentSummary: 'Payment Summary',
    payNow: 'Pay Now',
    myPanel: 'My Panel',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    phone: 'Phone',
    dateOfBirth: 'Date of Birth',
    ssn: 'Social Security (last 4 digits)',
    address: 'Address',
    city: 'City',
    state: 'State',
    zip: 'ZIP Code',
    needAccount: 'You need an account to continue. Please register or sign in.',
    optional: 'Optional',
    fillRequired: 'Please fill all required fields before continuing.',
    register: 'Register',
    login: 'Sign In',
    drawSignature: 'Draw your signature below',
    clearSignature: 'Clear Signature',
    saveSignature: 'Save and Sign',
    signatureSaved: '✓ Signature saved successfully!',
    backToHome: 'Back to Home',
  },
  es: {
    pageTitle: 'Seguro Personal',
    pageSubtitle: 'Protege lo que más importa con nuestros planes personalizados',
    step1: '1. Tus Datos',
    step2: '2. Tipo de Seguro',
    step3: '3. Seleccionar Plan',
    step4: '4. Firmar Contrato',
    step5: '5. Pago',
    personalInfo: 'Información Personal',
    insuranceType: 'Selecciona el Tipo de Seguro',
    selectPlan: 'Elige tu Plan',
    coverageDetails: 'Detalles de Cobertura',
    summary: 'Resumen',
    insuranceTypeLabel: 'Tipo de Seguro:',
    planLabel: 'Plan:',
    deductibleLabel: 'Deducible:',
    initialPaymentLabel: 'Pago Inicial:',
    monthlyPaymentLabel: 'Prima Mensual:',
    generateContract: 'Generar Contrato',
    generating: 'Generando Contrato...',
    reviewContract: 'Revisa tu Contrato',
    contractGenerated: '✓ Tu contrato ha sido generado. Por favor revisa y firma abajo.',
    contractNumber: 'Número de Contrato:',
    viewContract: 'Ver Contrato Completo',
    signContract: 'Firmar Contrato',
    continueToPayment: 'Continuar al Pago',
    payment: 'Realizar Pago',
    completePayment: 'Completa tu pago inicial para activar tu cobertura de seguro.',
    paymentSummary: 'Resumen de Pago',
    payNow: 'Pagar Ahora',
    myPanel: 'Mi Panel',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    dateOfBirth: 'Fecha de Nacimiento',
    ssn: 'Número de Seguro Social (últimos 4 dígitos)',
    address: 'Dirección',
    city: 'Ciudad',
    state: 'Estado',
    zip: 'Código Postal',
    needAccount: 'Necesitas una cuenta para continuar. Por favor regístrate o inicia sesión.',
    optional: 'Opcional',
    fillRequired: 'Por favor completa todos los campos obligatorios antes de continuar.',
    register: 'Registrarse',
    login: 'Iniciar Sesión',
    drawSignature: 'Dibuja tu firma abajo',
    clearSignature: 'Limpiar Firma',
    saveSignature: 'Guardar y Firmar',
    signatureSaved: '✓ ¡Firma guardada exitosamente!',
    backToHome: 'Volver al Inicio',
  }
}

export default function PersonalInsurancePage() {
  const { user, isLoading: authLoading } = useSupabase()
  const [lang, setLang] = useState<Language>('en')
  const [step, setStep] = useState<Step>('form')
  const [selectedInsurance, setSelectedInsurance] = useState<string>('')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [contractId, setContractId] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signatureSaved, setSignatureSaved] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const t = translations[lang]

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    dateOfBirth: '',
    ssn: '',
  })

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
      }))
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value,
    }))
  }

  const availablePlans = selectedInsurance ? getPlansForInsurance(selectedInsurance) : []

  const handleInsuranceSelect = (insuranceKey: string) => {
    setSelectedInsurance(insuranceKey)
    setSelectedPlan(null)
    setStep('plan')
  }

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan)
  }

  const handleGenerateContract = async () => {
    if (!selectedPlan || !selectedInsurance) return
    if (!user) {
      alert(lang === 'es' ? 'Debes iniciar sesión para crear un contrato.' : 'You must be logged in to create a contract.')
      return
    }

    setLoading(true)
    try {
      // Validate required form fields (SSN optional)
      const requiredFields = ['firstName','lastName','email','phone','address','city','state','zip','dateOfBirth']
      const missing = requiredFields.filter(f => !formData[f as keyof typeof formData] || String(formData[f as keyof typeof formData]).trim() === '')
      if (missing.length > 0) {
        alert(t.fillRequired)
        setLoading(false)
        return
      }
      const plan = selectedPlan
      const insuranceType = personalInsuranceTypes.find(i => i.key === selectedInsurance)!

      // Preparar las coberturas del plan seleccionado
      const selectedCoverages = plan.coverages.map(coverage => ({
        insuranceType: selectedInsurance,
        policyNumber: `PA-P-${Date.now()}`,
        effectiveDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        deductible: plan.deductible.toString(),
        coverageLimit: getCoverageLimit(selectedInsurance, plan),
        insuredName: `${formData.firstName} ${formData.lastName}`,
        coverageDetails: coverage.en // Agregar detalles de la cobertura
      }))

      console.log('Creating contract with coverages:', selectedCoverages)

      const response = await fetch('/api/personal-insurance/create-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: {
            contractNumber: `PERS-${Date.now()}`,
            policyNumber: `PA-P-${Date.now()}`,
            contractDate: new Date().toISOString().split('T')[0],
            insuranceType: selectedInsurance,
            clientName: `${formData.firstName} ${formData.lastName}`,
            clientCompanyName: `${formData.firstName} ${formData.lastName}`,
            clientAddress: formData.address,
            clientCity: formData.city,
            clientState: formData.state,
            clientZip: formData.zip,
            clientPhone: formData.phone,
            clientEmail: formData.email,
            totalPremium: (plan.monthlyPrice * 12).toFixed(2),
            downPayment: plan.initialPayment.toFixed(2),
            monthlyPayment: plan.monthlyPrice.toFixed(2),
            numberOfPayments: '12',
            firstDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            terms: getContractTerms(selectedInsurance, plan),
            status: 'pending',
            policyStatus: 'active',
            coverages: selectedCoverages,
          },
            userId: user?.id,
            lang,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        alert(data?.message || (lang === 'es' ? 'No se pudo crear el contrato' : 'Failed to create contract'))
        setLoading(false)
        return
      }

      const createdContract = data.created?.[0]?.contract
      if (createdContract?.id) {
        setContractId(createdContract.id)
        setStep('contract')
      }
    } catch (error) {
      console.error('Error creating contract:', error)
      let errMsg = lang === 'es' ? 'Error al crear el contrato. Por favor intenta de nuevo.' : 'Error creating contract. Please try again.'
      if (error && typeof error === 'object') {
        const maybeMessage = (error as { message?: unknown }).message
        if (typeof maybeMessage === 'string') errMsg = maybeMessage
      }
      alert(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const getCoverageLimit = (insuranceType: string, plan: Plan): string => {
    const limits: Record<string, Record<PlanType, string>> = {
      'personal-auto': { basic: '50000', medium: '100000', premium: '250000' },
      'motorcycle': { basic: '25000', medium: '50000', premium: '100000' },
      'pet': { basic: '5000', medium: '10000', premium: '25000' },
      'mobile-device': { basic: '1000', medium: '2000', premium: '5000' },
      'event': { basic: '100000', medium: '500000', premium: '1000000' },
      'bicycle': { basic: '2000', medium: '5000', premium: '10000' },
    }
    return limits[insuranceType]?.[plan.id] || '50000'
  }

  const getContractTerms = (insuranceType: string, plan: Plan): string => {
    const insuranceName = personalInsuranceTypes.find(i => i.key === insuranceType)?.name[lang] || insuranceType
    
    if (lang === 'es') {
      return `CONTRATO DE SEGURO PERSONAL - ${insuranceName.toUpperCase()}

PLAN: ${plan.name.es}
DEDUCIBLE: $${plan.deductible}
PRIMA MENSUAL: $${plan.monthlyPrice}
PAGO INICIAL: $${plan.initialPayment}

COBERTURAS INCLUIDAS:
${plan.coverages.map(c => `• ${c.es}`).join('\n')}

TÉRMINOS Y CONDICIONES

1. COBERTURA
Este contrato proporciona cobertura de seguro personal para ${insuranceName.toLowerCase()} de acuerdo con los términos del plan ${plan.name.es} seleccionado.

2. DEDUCIBLE
El deducible aplicable a este contrato es de $${plan.deductible}. Este monto deberá ser pagado por el asegurado en caso de cualquier reclamo antes de que la compañía de seguros cubra el resto de los gastos.

3. PRIMA Y PAGOS
- Prima mensual: $${plan.monthlyPrice}
- Pago inicial: $${plan.initialPayment}
- Frecuencia de pago: Mensual
- Día de pago: El mismo día de cada mes

4. VIGENCIA
Este contrato tiene una vigencia de 12 meses a partir de la fecha de inicio, con opción de renovación automática.

5. OBLIGACIONES DEL ASEGURADO
- Pagar las primas en las fechas acordadas
- Reportar cualquier siniestro dentro de las 24 horas siguientes
- Proporcionar información veraz y completa
- Cumplir con las medidas de seguridad recomendadas

6. EXCLUSIONES
No están cubiertos:
- Daños intencionales causados por el asegurado
- Uso del bien asegurado para actividades ilegales
- Desgaste normal por uso
- Daños por guerra o terrorismo

7. CANCELACIÓN
Cualquier parte puede cancelar este contrato con 30 días de aviso previo por escrito.

8. RESOLUCIÓN DE CONTROVERSIAS
Cualquier disputa derivada de este contrato será resuelta mediante arbitraje de acuerdo con las leyes del Estado de Pennsylvania.

9. MODIFICACIONES
Este contrato solo puede ser modificado por escrito y firmado por ambas partes.

10. DECLARACIONES
El asegurado declara que toda la información proporcionada es verdadera y completa.

Al firmar este contrato, el asegurado acepta todos los términos y condiciones aquí establecidos.

Fecha: ${new Date().toLocaleDateString()}
Firma del Asegurado: _______________________
Firma del Agente: _______________________`
    }
    
    return `PERSONAL INSURANCE CONTRACT - ${insuranceName.toUpperCase()}

PLAN: ${plan.name.en}
DEDUCTIBLE: $${plan.deductible}
MONTHLY PREMIUM: $${plan.monthlyPrice}
INITIAL PAYMENT: $${plan.initialPayment}

COVERAGES INCLUDED:
${plan.coverages.map(c => `• ${c.en}`).join('\n')}

TERMS AND CONDITIONS

1. COVERAGE
This contract provides personal insurance coverage for ${insuranceName.toLowerCase()} in accordance with the terms of the selected ${plan.name.en} plan.

2. DEDUCTIBLE
The deductible applicable to this contract is $${plan.deductible}. This amount must be paid by the insured in the event of any claim before the insurance company covers the remaining expenses.

3. PREMIUM AND PAYMENTS
- Monthly premium: $${plan.monthlyPrice}
- Initial payment: $${plan.initialPayment}
- Payment frequency: Monthly
- Payment date: The same day each month

4. TERM
This contract is valid for 12 months from the start date, with automatic renewal option.

5. INSURED OBLIGATIONS
- Pay premiums on the agreed dates
- Report any claim within 24 hours
- Provide truthful and complete information
- Comply with recommended security measures

6. EXCLUSIONS
The following are not covered:
- Intentional damage caused by the insured
- Use of the insured property for illegal activities
- Normal wear and tear
- War or terrorism damage

7. CANCELLATION
Either party may cancel this contract with 30 days prior written notice.

8. DISPUTE RESOLUTION
Any dispute arising from this contract will be resolved by arbitration in accordance with the laws of the State of Pennsylvania.

9. MODIFICATIONS
This contract may only be modified in writing and signed by both parties.

10. STATEMENTS
The insured declares that all information provided is true and complete.

By signing this contract, the insured accepts all the terms and conditions established herein.

Date: ${new Date().toLocaleDateString()}
Insured Signature: _______________________
Agent Signature: _______________________`
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const pos = 'touches' in e 
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: e.clientX - rect.left, y: e.clientY - rect.top }

    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const pos = 'touches' in e 
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: e.clientX - rect.left, y: e.clientY - rect.top }

    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'))
    }
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureData(null)
  }

  const handleSaveSignature = async () => {
    if (!signatureData || !contractId) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) return

      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          signature: signatureData,
          signatureDate: new Date().toISOString().slice(0,10),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save signature')

      setSignatureSaved(true)
      setTimeout(() => {
        setStep('payment')
      }, 1500)
    } catch (err) {
      console.error('save signature error:', err)
      alert(lang === 'es' ? 'Error al guardar la firma. Por favor intenta de nuevo.' : 'Failed to save signature. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToPayment = async () => {
    if (!contractId || !selectedPlan) return

    setLoading(true)
    try {
      const response = await fetch('/api/personal-insurance/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          planId: selectedPlan.id,
          amount: selectedPlan.initialPayment,
          customerName: `${formData.firstName} ${formData.lastName}`,
          customerEmail: formData.email,
          customerPhone: formData.phone,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create payment')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      alert(lang === 'es' ? 'Error al procesar el pago. Por favor intenta de nuevo.' : 'Error processing payment. Please try again.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-200">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <Link href="/" className="flex items-center justify-center mb-4">
            <Image src="/images/logo.png" alt="Olimpo Coverage Group" width={60} height={60} className="rounded-xl" />
            <div className="ml-3">
              <span className="text-2xl font-bold text-gray-900">OLIMPO</span>
              <span className="text-blue-600 block text-sm">Coverage Group</span>
            </div>
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-900">{t.pageTitle}</h1>
            <p className="mt-2 text-sm text-gray-600">{t.pageSubtitle}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setLang('en')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>English</button>
            <button onClick={() => setLang('es')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${lang === 'es' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Español</button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {[
            { key: 'form', label: t.step1, icon: '📋' },
            { key: 'insurance', label: t.step2, icon: '🛡️' },
            { key: 'plan', label: t.step3, icon: '📊' },
            { key: 'contract', label: t.step4, icon: '✍️' },
            { key: 'payment', label: t.step5, icon: '💳' },
          ].map((s, idx) => {
            const currentIdx = ['form', 'insurance', 'plan', 'contract', 'payment'].indexOf(step)
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  step === s.key ? 'bg-blue-600 text-white' : currentIdx > idx ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {s.icon} {s.label}
                </div>
                {idx < 4 && <div className="h-px w-8 bg-gray-300" />}
              </div>
            )
          })}
        </div>

        {/* Step 1: Form */}
        {step === 'form' && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t.personalInfo}</h2>
            <p className="text-sm text-gray-600 mb-4">{lang === 'es' ? 'Todos los campos son obligatorios excepto los últimos 4 dígitos de SSN.' : 'All fields are required except the last 4 digits of SSN.'}</p>
            
            {!user && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">{t.needAccount}</p>
                <div className="mt-3 flex gap-3">
                  <Link href="/register" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{t.register}</Link>
                  <Link href="/login" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">{t.login}</Link>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">{t.firstName} *</label>
                  <input id="firstName" type="text" value={formData.firstName} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">{t.lastName} *</label>
                  <input id="lastName" type="text" value={formData.lastName} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">{t.email} *</label>
                <input id="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">{t.phone} *</label>
                <input id="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">{t.dateOfBirth} *</label>
                <input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
              </div>

              <div>
                <label htmlFor="ssn" className="block text-sm font-medium text-gray-700 mb-2">{t.ssn} <span className="text-sm text-gray-500">({t.optional})</span></label>
                <input id="ssn" type="text" maxLength={4} value={formData.ssn} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">{t.address} *</label>
                <input id="address" type="text" value={formData.address} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">{t.city} *</label>
                  <input id="city" type="text" value={formData.city} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">{t.state} *</label>
                  <input id="state" type="text" value={formData.state} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">{t.zip} *</label>
                  <input id="zip" type="text" value={formData.zip} onChange={handleInputChange} className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500" required />
                </div>
              </div>

              <button onClick={() => {
                if (!user) {
                  alert(lang === 'es' ? 'Necesitas una cuenta para continuar. Por favor inicia sesión.' : 'You need an account to continue. Please sign in.')
                  return
                }
                setStep('insurance')
              }} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-4 font-semibold text-white hover:from-blue-700 hover:to-purple-700">
                {lang === 'es' ? 'Continuar' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Insurance Type Selection */}
        {step === 'insurance' && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t.insuranceType}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {personalInsuranceTypes.map((insurance) => (
                <button
                  key={insurance.key}
                  onClick={() => handleInsuranceSelect(insurance.key)}
                  className={`rounded-xl border-2 p-6 text-left transition ${
                    selectedInsurance === insurance.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-4xl mb-3">{insurance.icon}</div>
                  <div className="text-base font-semibold text-gray-900 mb-2">{insurance.name[lang]}</div>
                  <div className="text-xs text-gray-600">{insurance.description[lang]}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('form')} className="mt-6 rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50">
              {lang === 'es' ? 'Atrás' : 'Back'}
            </button>
          </div>
        )}

        {/* Step 3: Plan Selection */}
        {step === 'plan' && selectedInsurance && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t.selectPlan}</h2>
              <p className="text-gray-600 mb-6">{personalInsuranceTypes.find(i => i.key === selectedInsurance)?.name[lang]}</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {availablePlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className={`rounded-xl border-2 p-6 text-left transition ${
                      selectedPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name[lang]}</h3>
                    <p className="text-3xl font-bold text-blue-600 mb-4">${plan.monthlyPrice}<span className="text-sm text-gray-500">/mes</span></p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t.deductibleLabel}</span>
                        <span className="font-semibold text-gray-900">${plan.deductible}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t.initialPaymentLabel}</span>
                        <span className="text-gray-900 font-semibold">${plan.initialPayment}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">{t.coverageDetails}:</p>
                      <ul className="space-y-1">
                        {plan.coverages.map((coverage, idx) => (
                          <li key={idx} className="text-xs text-gray-600 flex items-start">
                            <span className="text-emerald-600 mr-2">✓</span>
                            {coverage[lang]}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <ul className="space-y-1">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex items-start">
                            <span className="text-emerald-600 mr-2">✓</span>
                            {feature[lang]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                ))}
              </div>

              {selectedPlan && (
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setStep('insurance')} className="flex-1 rounded-xl border border-gray-300 py-3 px-4 font-semibold text-gray-700 hover:bg-gray-50">
                    {lang === 'es' ? 'Atrás' : 'Back'}
                  </button>
                  <button onClick={handleGenerateContract} disabled={loading} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-4 font-semibold text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? t.generating : t.generateContract}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Contract Review and Signature */}
        {step === 'contract' && contractId && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t.reviewContract}</h2>
            
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">{t.contractGenerated}</p>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.summary}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{t.contractNumber}</span>
                  <span className="font-mono text-gray-900">{contractId}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t.insuranceTypeLabel}</span>
                  <span className="font-semibold text-gray-900">{personalInsuranceTypes.find(i => i.key === selectedInsurance)?.name[lang]}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t.planLabel}</span>
                  <span className="font-semibold text-gray-900">{selectedPlan?.name[lang]}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t.deductibleLabel}</span>
                  <span className="font-semibold text-gray-900">${selectedPlan?.deductible}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t.initialPaymentLabel}</span>
                  <span className="font-semibold text-gray-900">${selectedPlan?.initialPayment}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t.monthlyPaymentLabel}</span>
                  <span className="font-semibold text-gray-900">${selectedPlan?.monthlyPrice}/mes</span>
                </div>
              </div>
            </div>

            {!signatureSaved ? (
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.drawSignature}</h3>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full border-2 border-gray-300 rounded-xl bg-white cursor-crosshair mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={clearSignature} className="flex-1 rounded-xl border border-gray-300 py-2 px-4 font-semibold text-gray-700 hover:bg-gray-50">
                    {t.clearSignature}
                  </button>
                  <button onClick={handleSaveSignature} disabled={!signatureData || loading} className="flex-1 rounded-xl bg-emerald-600 py-2 px-4 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? (lang === 'es' ? 'Guardando...' : 'Saving...') : t.saveSignature}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">{t.signatureSaved}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <a href={`/api/contracts/${contractId}/document`} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-6 py-3 text-center font-semibold text-white hover:bg-blue-700">
                {t.viewContract}
              </a>
              
              <button onClick={() => setStep('payment')} disabled={!signatureSaved} className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {t.continueToPayment}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 'payment' && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t.payment}</h2>
            
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">⚠️ {t.completePayment}</p>
            </div>

            {selectedPlan && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.paymentSummary}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{t.initialPaymentLabel}</span>
                    <span className="font-semibold text-gray-900">${selectedPlan.initialPayment}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t.monthlyPaymentLabel}</span>
                    <span className="font-semibold text-gray-900">${selectedPlan.monthlyPrice}/mes</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t.deductibleLabel}</span>
                    <span className="font-semibold text-gray-900">${selectedPlan.deductible}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button onClick={handleProceedToPayment} disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 px-6 font-semibold text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (lang === 'es' ? 'Procesando...' : 'Processing...') : t.payNow}
              </button>

              <Link href="/my-panel" className="rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50">
                {t.myPanel}
              </Link>

              <Link href="/" className="rounded-xl border border-gray-300 px-6 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50">
                {t.backToHome}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}