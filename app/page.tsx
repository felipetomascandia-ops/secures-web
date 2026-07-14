'use client'

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSupabase } from "@/providers/SupabaseProvider";
import { TicketWidget } from "@/components/TicketWidget";
import { AuthButton } from "@/components/AuthButton";

// Complete list of US states
const usStates = [
  { id: "AL", name: "Alabama" }, { id: "AK", name: "Alaska" }, { id: "AZ", name: "Arizona" },
  { id: "AR", name: "Arkansas" }, { id: "CA", name: "California" }, { id: "CO", name: "Colorado" },
  { id: "CT", name: "Connecticut" }, { id: "DE", name: "Delaware" }, { id: "FL", name: "Florida" },
  { id: "GA", name: "Georgia" }, { id: "HI", name: "Hawaii" }, { id: "ID", name: "Idaho" },
  { id: "IL", name: "Illinois" }, { id: "IN", name: "Indiana" }, { id: "IA", name: "Iowa" },
  { id: "KS", name: "Kansas" }, { id: "KY", name: "Kentucky" }, { id: "LA", name: "Louisiana" },
  { id: "ME", name: "Maine" }, { id: "MD", name: "Maryland" }, { id: "MA", name: "Massachusetts" },
  { id: "MI", name: "Michigan" }, { id: "MN", name: "Minnesota" }, { id: "MS", name: "Mississippi" },
  { id: "MO", name: "Missouri" }, { id: "MT", name: "Montana" }, { id: "NE", name: "Nebraska" },
  { id: "NV", name: "Nevada" }, { id: "NH", name: "New Hampshire" }, { id: "NJ", name: "New Jersey" },
  { id: "NM", name: "New Mexico" }, { id: "NY", name: "New York" }, { id: "NC", name: "North Carolina" },
  { id: "ND", name: "North Dakota" }, { id: "OH", name: "Ohio" }, { id: "OK", name: "Oklahoma" },
  { id: "OR", name: "Oregon" }, { id: "PA", name: "Pennsylvania" }, { id: "RI", name: "Rhode Island" },
  { id: "SC", name: "South Carolina" }, { id: "SD", name: "South Dakota" }, { id: "TN", name: "Tennessee" },
  { id: "TX", name: "Texas" }, { id: "UT", name: "Utah" }, { id: "VT", name: "Vermont" },
  { id: "VA", name: "Virginia" }, { id: "WA", name: "Washington" }, { id: "WV", name: "West Virginia" },
  { id: "WI", name: "Wisconsin" }, { id: "WY", name: "Wyoming" }
];

const employeeCounts = ["1-5", "6-10", "11-20", "21-50", "51-100", "101-250", "251-500", "501-1000", "1000+"];

const whatWeCover = [
  {
    name: "Business Insurance",
    icon: "🏢",
    description: "Comprehensive coverage that protects your business from common risks like property damage, liability claims, and business interruption.",
    protections: ["Property damage from fire, theft, or natural disasters", "Liability claims from third parties", "Business interruption due to covered events", "Legal defense costs associated with covered claims"]
  },
  {
    name: "General Liability Insurance",
    icon: "⚖️",
    description: "Protects your business from claims of bodily injury, property damage, and personal or advertising injury.",
    protections: ["Bodily injury to customers on your property", "Property damage caused by operations", "Personal injury claims like slander", "Advertising injury claims", "Medical payments for minor injuries"]
  },
  {
    name: "Business Owner's Policy (BOP)",
    icon: "📦",
    description: "A convenient package combining general liability and commercial property insurance at a lower cost.",
    protections: ["General liability coverage", "Commercial property coverage", "Business interruption insurance", "Optional endorsements", "Simplified insurance management"]
  },
  {
    name: "Workers' Compensation Insurance",
    icon: "👷",
    description: "Provides benefits to employees who suffer work-related injuries or illnesses.",
    protections: ["Medical expenses for work-related injuries", "Lost wage replacement", "Rehabilitation costs", "Disability benefits", "Death benefits to families"]
  },
  {
    name: "Commercial Property Insurance",
    icon: "🏗️",
    description: "Protects your business property from damage or loss due to fire, theft, vandalism, and natural disasters.",
    protections: ["Building and structure protection", "Business equipment and machinery", "Inventory and stock", "Furniture and supplies", "Loss of income from property damage"]
  },
  {
    name: "Commercial Auto Insurance",
    icon: "🚗",
    description: "Covers vehicles used for business purposes, protecting against accidents, damage, and liability claims.",
    protections: ["Liability for bodily injury and property damage", "Collision coverage", "Comprehensive coverage", "Uninsured/underinsured motorist", "Medical payments for employees"]
  },
  {
    name: "Professional Liability Insurance",
    icon: "📋",
    description: "Also known as errors and omissions insurance for service-based businesses.",
    protections: ["Claims of professional negligence", "Errors and omissions in service delivery", "Failure to meet contractual obligations", "Legal defense costs", "Settlements and judgments"]
  },
  {
    name: "Errors and Omissions (E&O)",
    icon: "📊",
    description: "Specialized coverage protecting against claims of financial harm from professional advice.",
    protections: ["Financial harm from professional advice", "Mistakes in professional services", "Legal costs for defending claims", "Settlements and damages", "Contract dispute claims"]
  },
  {
    name: "Tools & Equipment Insurance",
    icon: "🛠️",
    description: "Covers tools, equipment, and business assets against damage, loss, or theft.",
    protections: ["Tools on job sites", "Equipment in transit", "Theft and accidental loss", "Rented or leased equipment", "Replacement costs"]
  },
  {
    name: "Employment Practices Liability",
    icon: "👥",
    description: "Protects against claims of discrimination, harassment, and wrongful termination.",
    protections: ["Discrimination claims", "Wrongful termination", "Sexual harassment allegations", "Retaliation claims", "Legal defense and settlement"]
  }
];

const whoWeCover = ["Construction", "Contractors", "Consultants", "Cleaning", "Retail", "Food & Beverage", "Sports & Fitness", "Education", "Arts & Entertainment", "Beauty & Personal Care"];

const industries = ["Construction", "Contractors", "Consultants", "Cleaning Services", "Retail & E-commerce", "Food & Beverage", "Sports & Fitness", "Education", "Arts & Entertainment", "Beauty & Personal Care", "Other"];

const incomeRanges = ["Less than $50,000", "$50,000 - $100,000", "$100,000 - $250,000", "$250,000 - $500,000", "$500,000 - $1,000,000", "$1,000,000 - $5,000,000", "More than $5,000,000"];

type CoverageItem = (typeof whatWeCover)[number]

type Language = 'en' | 'es'

const translations: Record<Language, {
  nav: { products: string; support: string; about: string; contact: string; getQuote: string; signIn: string }
  hero: { badge: string; title1: string; titleAccent: string; title2: string; subtitle: string; cta1: string; cta2: string }
  stats: { years: string; clients: string; policies: string; support: string }
  services: { label: string; title: string; subtitle: string }
  about: { label: string; title: string; desc: string; years: string; item1: string; item2: string; item3: string; item4: string }
  coverage: { label: string; title: string; subtitle: string; what: string; who: string }
  contact: { label: string; title: string; subtitle: string; location: string; email: string; phone: string; companyInfo: string; companyName: string; contactPerson: string; industry: string; employees: string; lawsuits: string; income: string; additionalInfo: string; send: string; companyPlaceholder: string; namePlaceholder: string; emailPlaceholder: string; phonePlaceholder: string; infoPlaceholder: string; selectIndustry: string; selectState: string; selectEmployees: string; selectLawsuits: string; selectIncome: string; yes: string; no: string; state: string }
  footer: { home: string; services: string; about: string; contact: string; rights: string }
  coverageModal: { title: string }
}> = {
  en: {
    nav: { products: 'Products', support: 'Support', about: 'About Us', contact: 'Contact', getQuote: 'Get a Quote', signIn: 'Sign In' },
    hero: { badge: 'Trusted by 500+ Businesses', title1: 'Protect Your', titleAccent: 'Business', title2: 'With Confidence', subtitle: 'Comprehensive commercial insurance solutions tailored to safeguard your business assets and operations. Your trusted partner on Horsham PA, USA.', cta1: 'Request Quote', cta2: 'Explore Services' },
    stats: { years: 'Years Experience', clients: 'Happy Clients', policies: 'Policies Issued', support: 'Support Available' },
    services: { label: 'Our Services', title: 'Comprehensive Insurance Solutions', subtitle: 'Complete coverage options to protect every aspect of your business operations' },
    about: { label: 'About Us', title: 'Your Trusted Insurance Partner', desc: 'With over 15 years of experience in the insurance industry, we are your reliable partner on Horsham PA, USA. We specialize in providing personalized insurance solutions for businesses of all sizes.', years: 'Years of Excellence', item1: 'Personalized consultation tailored to your business needs', item2: 'Competitive pricing with comprehensive coverage options', item3: '24/7 dedicated support team', item4: 'Fast and efficient claims processing' },
    coverage: { label: 'Our Coverage', title: 'What We Cover & Who We Cover', subtitle: 'Comprehensive insurance solutions tailored for your specific industry and needs', what: 'What We Cover', who: 'Who We Cover' },
    contact: { label: 'Request Your Quote', title: 'Get a Personalized Quote for Your Business', subtitle: 'Fill out the form and we will send you a quote tailored to your business needs', location: 'Horsham PA, USA', email: 'contacto@olimpocoveragegroup.com', phone: '(445) 325-0112', companyInfo: 'Your Company Information', companyName: 'Company Name', contactPerson: 'Contact Person', industry: 'Industry/Sector', employees: 'Number of Employees', lawsuits: 'Have you been in civil lawsuits before?', income: 'Annual Company Income', additionalInfo: 'Additional Information', send: 'Send Quote via WhatsApp', companyPlaceholder: 'Your company name', namePlaceholder: 'Your full name', emailPlaceholder: 'email@company.com', phonePlaceholder: '(123) 456-7890', infoPlaceholder: 'Tell us more about your needs...', selectIndustry: 'Select an industry', selectState: 'Select a state', selectEmployees: 'Select an option', selectLawsuits: 'Select an option', selectIncome: 'Select a range', yes: 'Yes', no: 'No', state: 'Location (State)' },
    footer: { home: 'Home', services: 'Services', about: 'About', contact: 'Contact', rights: '© 2026 Olimpo Coverage Group. All rights reserved.' },
    coverageModal: { title: 'What this coverage helps protect you from' }
  },
  es: {
    nav: { products: 'Productos', support: 'Soporte', about: 'Sobre Nosotros', contact: 'Contacto', getQuote: 'Solicitar Cotización', signIn: 'Iniciar Sesión' },
    hero: { badge: 'Confiado por 500+ Empresas', title1: 'Protege tu', titleAccent: 'Negocio', title2: 'Con Confianza', subtitle: 'Soluciones integrales de seguros comerciales diseñadas para proteger los activos y operaciones de tu empresa. Tu socio de confianza en Horsham PA, EE.UU.', cta1: 'Solicitar Cotización', cta2: 'Explorar Servicios' },
    stats: { years: 'Años de Experiencia', clients: 'Clientes Satisfechos', policies: 'Pólizas Emitidas', support: 'Soporte Disponible' },
    services: { label: 'Nuestros Servicios', title: 'Soluciones Integrales de Seguros', subtitle: 'Opciones de cobertura completa para proteger cada aspecto de tus operaciones comerciales' },
    about: { label: 'Sobre Nosotros', title: 'Tu Socio de Confianza en Seguros', desc: 'Con más de 15 años de experiencia en la industria de seguros, somos tu socio confiable en Horsham PA, EE.UU. Nos especializamos en brindar soluciones de seguros personalizadas para empresas de todos los tamaños.', years: 'Años de Excelencia', item1: 'Consultoría personalizada según las necesidades de tu negocio', item2: 'Precios competitivos con opciones de cobertura integral', item3: 'Equipo de soporte dedicado 24/7', item4: 'Procesamiento rápido y eficiente de reclamos' },
    coverage: { label: 'Nuestra Cobertura', title: 'Lo Que Cubrimos y a Quién Cubrimos', subtitle: 'Soluciones de seguros integrales adaptadas a tu industria y necesidades específicas', what: 'Lo Que Cubrimos', who: 'A Quién Cubrimos' },
    contact: { label: 'Solicita tu Cotización', title: 'Obtén una Cotización Personalizada', subtitle: 'Completa el formulario y te enviaremos una cotización adaptada a las necesidades de tu negocio', location: 'Horsham PA, EE.UU.', email: 'contacto@olimpocoveragegroup.com', phone: '(445) 325-0112', companyInfo: 'Información de tu Empresa', companyName: 'Nombre de la Empresa', contactPerson: 'Persona de Contacto', industry: 'Industria/Sector', employees: 'Número de Empleados', lawsuits: '¿Ha tenido demandas civiles antes?', income: 'Ingreso Anual de la Empresa', additionalInfo: 'Información Adicional', send: 'Enviar Cotización por WhatsApp', companyPlaceholder: 'Nombre de tu empresa', namePlaceholder: 'Tu nombre completo', emailPlaceholder: 'email@empresa.com', phonePlaceholder: '(123) 456-7890', infoPlaceholder: 'Cuéntanos más sobre tus necesidades...', selectIndustry: 'Selecciona una industria', selectState: 'Selecciona un estado', selectEmployees: 'Selecciona una opción', selectLawsuits: 'Selecciona una opción', selectIncome: 'Selecciona un rango', yes: 'Sí', no: 'No', state: 'Ubicación (Estado)' },
    footer: { home: 'Inicio', services: 'Servicios', about: 'Nosotros', contact: 'Contacto', rights: '© 2026 Olimpo Coverage Group. Todos los derechos reservados.' },
    coverageModal: { title: 'Lo que esta cobertura ayuda a protegerte' }
  }
}

export default function Home() {
  const { user } = useSupabase()
  const [lang, setLang] = useState<Language>('en')
  const [activeSection, setActiveSection] = useState("home")
  const [showProducts, setShowProducts] = useState(false)
  const productsRef = useRef<HTMLDivElement>(null)
  const t = translations[lang]

  const [selectedCoverage, setSelectedCoverage] = useState<CoverageItem | null>(null)
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false)

  const openCoverageModal = (coverage: CoverageItem) => {
    setSelectedCoverage(coverage)
    setIsCoverageModalOpen(true)
    setShowProducts(false)
  }

  const closeCoverageModal = () => {
    setIsCoverageModalOpen(false)
    setSelectedCoverage(null)
  }

  const [quoteForm, setQuoteForm] = useState({
    companyName: "", contactName: "", email: "", phone: "", industry: "", state: "", employees: "", hasLawsuits: "", annualIncome: "", additionalInfo: ""
  });

  const handleQuoteInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuoteForm(prev => ({ ...prev, [name]: value }));
  };

  const handleQuoteSubmit = () => {
    const { companyName, contactName, email, phone, industry, state, employees, hasLawsuits, annualIncome, additionalInfo } = quoteForm;
    const message = encodeURIComponent(
      `*NEW QUOTE REQUEST*\n\n` +
      `*Company Information:*\n` +
      `Company Name: ${companyName}\n` +
      `Contact Person: ${contactName}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone}\n\n` +
      `*Quote Details:*\n` +
      `Industry/Sector: ${industry}\n` +
      `Location (State): ${usStates.find(s => s.id === state)?.name || state}\n` +
      `Number of Employees: ${employees}\n` +
      `Have you been in civil lawsuits before?: ${hasLawsuits}\n` +
      `Annual Income: ${annualIncome}\n\n` +
      `*Additional Information:*\n${additionalInfo || "N/A"}`
    );
    window.open(`https://wa.me/14453250112?text=${message}`, "_blank");
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "services", "about", "contact"]
      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 250 && rect.bottom >= 250) {
            setActiveSection(section)
            break
          }
        }
      }
    }
    window.addEventListener("scroll", handleScroll)
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkoutId = params.get('checkoutId') || params.get('checkout_id') || params.get('payment_link_id') || params.get('paymentLinkId') || params.get('transactionId') || params.get('orderId') || null
    if (checkoutId) {
      window.location.replace(`/admin/payments/success?checkoutId=${encodeURIComponent(checkoutId)}`)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productsRef.current && !productsRef.current.contains(e.target as Node)) {
        setShowProducts(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <Image src="/images/logo.png" alt="Olimpo Coverage Group" width={50} height={50} className="rounded-lg" />
              <div className="flex flex-col">
                <span className="text-2xl font-serif font-bold text-gray-900 tracking-wide">OLIMPO</span>
                <span className="text-blue-600 text-[10px] uppercase tracking-[0.3em] font-semibold">Coverage Group</span>
              </div>
            </Link>

            {/* Center Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {/* Products Dropdown */}
              <div className="relative" ref={productsRef}>
                <button
                  onClick={() => setShowProducts(!showProducts)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    showProducts ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {t.nav.products}
                  <svg className={`w-4 h-4 transition-transform ${showProducts ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showProducts && (
                  <div className="absolute top-full left-0 mt-2 w-[600px] bg-white border border-gray-200 rounded-xl shadow-2xl p-4 grid grid-cols-2 gap-2">
                    {whatWeCover.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => openCoverageModal(item)}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-all text-left"
                      >
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                        </div>
                      </button>
                    ))}
                    <div className="col-span-2 mt-2 pt-3 border-t border-gray-100">
                      <Link
                        href="#contact"
                        onClick={() => setShowProducts(false)}
                        className="block w-full text-center py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                      >
                        {t.nav.getQuote}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <Link href="#about" className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeSection === 'about' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'}`}>{t.nav.about}</Link>
              <Link href="#services" className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeSection === 'services' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'}`}>{t.nav.support}</Link>
              <Link href="#contact" className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeSection === 'contact' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'}`}>{t.nav.contact}</Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Language Switcher */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-2 text-xs font-semibold transition-all ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('es')}
                  className={`px-3 py-2 text-xs font-semibold transition-all ${lang === 'es' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  ES
                </button>
              </div>

              {/* Get a Quote Button */}
              <Link
                href="#contact"
                className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md shadow-blue-600/20"
              >
                {t.nav.getQuote}
              </Link>

              <AuthButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/fondo1.png"
            alt="Background"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/60" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-blue-700 font-medium">{t.hero.badge}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-gray-900">
              {t.hero.title1}{' '}
              <span className="text-blue-600">{t.hero.titleAccent}</span>
              {' '}{t.hero.title2}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#contact" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-blue-600/30">
                {t.hero.cta1}
              </Link>
              <Link href="#services" className="border-2 border-gray-300 hover:border-blue-500 text-gray-700 px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:bg-white">
                {t.hero.cta2}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "15+", label: t.stats.years },
              { number: "500+", label: t.stats.clients },
              { number: "10K+", label: t.stats.policies },
              { number: "24/7", label: t.stats.support },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <p className="text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t.services.label}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4 text-gray-900">{t.services.title}</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">{t.services.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "⚖️", title: "General Liability", desc: "Protect your business against claims of property damage, bodily injury, and personal injury." },
              { icon: "🏢", title: "Commercial Property", desc: "Coverage for your building, equipment, inventory, and other physical assets." },
              { icon: "🚗", title: "Commercial Auto", desc: "Protect your business vehicles and drivers from accidents, damage, and liability." },
              { icon: "👷", title: "Workers' Comp", desc: "Medical benefits and wage replacement to employees injured during work." },
              { icon: "📊", title: "Business Interruption", desc: "Coverage for lost income when business operations are temporarily halted." },
              { icon: "🛠️", title: "Tools & Equipment", desc: "Coverage for tools, equipment, and assets on and off the job site." },
            ].map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl">{service.icon}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{service.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t.about.label}</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-gray-900">{t.about.title}</h2>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">{t.about.desc}</p>
              <div className="space-y-4">
                {[t.about.item1, t.about.item2, t.about.item3, t.about.item4].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-1 rounded-3xl shadow-xl">
                <div className="bg-white p-12 rounded-3xl">
                  <div className="text-center">
                    <div className="text-7xl font-bold text-blue-600 mb-4">15+</div>
                    <p className="text-gray-600 text-lg">{t.about.years}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Cover & Who We Cover */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t.coverage.label}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4 text-gray-900">{t.coverage.title}</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">{t.coverage.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* What We Cover */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">{t.coverage.what}</h3>
              <ul className="space-y-3">
                {whatWeCover.map((item, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => openCoverageModal(item)}
                      className="w-full flex items-center gap-3 text-left p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-800 font-semibold">{item.name}</span>
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Who We Cover */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-6">{t.coverage.who}</h3>
              <ul className="space-y-3">
                {whoWeCover.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-lg">✓</span>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Request Section */}
      <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t.contact.label}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4 text-gray-900">{t.contact.title}</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">{t.contact.subtitle}</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {[
                { icon: "📍", title: t.contact.location, content: "Horsham PA, USA" },
                { icon: "📧", title: t.contact.email, content: "contacto@olimpocoveragegroup.com" },
                { icon: "📞", title: t.contact.phone, content: "(445) 325-0112" },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-0.5">{item.title}</h4>
                    <p className="text-gray-600 text-sm">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-3">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{t.contact.companyInfo}</h3>

                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.companyName}</label>
                      <input type="text" name="companyName" value={quoteForm.companyName} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" placeholder={t.contact.companyPlaceholder} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.contactPerson}</label>
                      <input type="text" name="contactName" value={quoteForm.contactName} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" placeholder={t.contact.namePlaceholder} required />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input type="email" name="email" value={quoteForm.email} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" placeholder={t.contact.emailPlaceholder} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.phone}</label>
                      <input type="tel" name="phone" value={quoteForm.phone} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" placeholder={t.contact.phonePlaceholder} required />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.industry}</label>
                      <select name="industry" value={quoteForm.industry} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" required>
                        <option value="">{t.contact.selectIndustry}</option>
                        {industries.map((ind) => (<option key={ind} value={ind}>{ind}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.state}</label>
                      <select name="state" value={quoteForm.state} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" required>
                        <option value="">{t.contact.selectState}</option>
                        {usStates.map((state) => (<option key={state.id} value={state.id}>{state.name}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.employees}</label>
                      <select name="employees" value={quoteForm.employees} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" required>
                        <option value="">{t.contact.selectEmployees}</option>
                        {employeeCounts.map((count) => (<option key={count} value={count}>{count}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.lawsuits}</label>
                      <select name="hasLawsuits" value={quoteForm.hasLawsuits} onChange={handleQuoteInputChange}
                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" required>
                        <option value="">{t.contact.selectLawsuits}</option>
                        <option value="Yes">{t.contact.yes}</option>
                        <option value="No">{t.contact.no}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.income}</label>
                    <select name="annualIncome" value={quoteForm.annualIncome} onChange={handleQuoteInputChange}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors" required>
                      <option value="">{t.contact.selectIncome}</option>
                      {incomeRanges.map((range) => (<option key={range} value={range}>{range}</option>))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.contact.additionalInfo}</label>
                    <textarea name="additionalInfo" rows={3} value={quoteForm.additionalInfo} onChange={handleQuoteInputChange}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 transition-colors resize-none" placeholder={t.contact.infoPlaceholder} />
                  </div>

                  <button type="button" onClick={handleQuoteSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3">
                    <span className="text-xl">💬</span>
                    {t.contact.send}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <Image src="/images/logo.png" alt="Olimpo Coverage Group" width={50} height={50} className="rounded-lg" />
              <div>
                <span className="text-2xl font-serif font-bold text-gray-900 tracking-wide">OLIMPO</span>
                <span className="text-blue-600 text-[10px] uppercase tracking-[0.3em] font-semibold block">Coverage Group</span>
              </div>
            </div>
            <div className="flex gap-6">
              <Link href="#home" className="text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium">{t.footer.home}</Link>
              <Link href="#services" className="text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium">{t.footer.services}</Link>
              <Link href="#about" className="text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium">{t.footer.about}</Link>
              <Link href="#contact" className="text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium">{t.footer.contact}</Link>
            </div>
            <p className="text-gray-400 text-sm">{t.footer.rights}</p>
          </div>
        </div>
      </footer>

      {/* Coverage Modal */}
      {isCoverageModalOpen && selectedCoverage && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeCoverageModal}>
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{selectedCoverage.icon}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-gray-900">{selectedCoverage.name}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{selectedCoverage.description}</p>
                </div>
              </div>
              <button type="button" onClick={closeCoverageModal}
                className="flex-shrink-0 w-8 h-8 rounded-lg border border-gray-200 hover:border-gray-400 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center"
                aria-label="Close">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <h4 className="text-base font-semibold text-gray-800 mb-4">{t.coverageModal.title}</h4>
              <ul className="space-y-2.5">
                {selectedCoverage.protections.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs">✓</span>
                    </div>
                    <span className="text-gray-600 text-sm">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <TicketWidget />
    </div>
  )
}