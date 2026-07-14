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

// Employee count options
const employeeCounts = [
  "1-5", "6-10", "11-20", "21-50", "51-100", "101-250", "251-500", "501-1000", "1000+"
];

// What We Cover with detailed descriptions
const whatWeCover = [
  {
    name: "Business Insurance",
    icon: "🏢",
    description: "Comprehensive coverage that protects your business from common risks like property damage, liability claims, and business interruption, ensuring your operations continue smoothly.",
    protections: [
      "Property damage from fire, theft, or natural disasters",
      "Liability claims from third parties",
      "Business interruption due to covered events",
      "Legal defense costs associated with covered claims"
    ]
  },
  {
    name: "General Liability Insurance",
    icon: "⚖️",
    description: "Protects your business from claims of bodily injury, property damage, and personal or advertising injury that occur on your business premises or from your operations.",
    protections: [
      "Bodily injury to customers or third parties on your property",
      "Property damage caused by your business operations",
      "Personal injury claims like slander or libel",
      "Advertising injury claims",
      "Medical payments for minor injuries on your premises"
    ]
  },
  {
    name: "Business Owner's Policy (BOP)",
    icon: "📦",
    description: "A convenient package that combines general liability and commercial property insurance, typically at a lower cost than purchasing each policy separately, ideal for small to medium businesses.",
    protections: [
      "General liability coverage for bodily injury and property damage",
      "Commercial property coverage for your building and contents",
      "Business interruption insurance",
      "Optional endorsements to customize your coverage",
      "Simplified insurance management with one policy"
    ]
  },
  {
    name: "Workers' Compensation Insurance",
    icon: "👷",
    description: "Provides benefits to employees who suffer work-related injuries or illnesses, covering medical expenses, lost wages, and rehabilitation costs, while protecting your business from lawsuits.",
    protections: [
      "Medical expenses for work-related injuries and illnesses",
      "Lost wage replacement for employees unable to work",
      "Rehabilitation costs for injured workers",
      "Disability benefits",
      "Death benefits to employee families"
    ]
  },
  {
    name: "Commercial Property Insurance",
    icon: "🏗️",
    description: "Protects your business property, including buildings, equipment, inventory, and furniture, from damage or loss due to fire, theft, vandalism, natural disasters, and other covered perils.",
    protections: [
      "Building and structure protection",
      "Business equipment and machinery",
      "Inventory and stock",
      "Furniture, fixtures, and supplies",
      "Loss of income from covered property damage"
    ]
  },
  {
    name: "Commercial Auto Insurance",
    icon: "🚗",
    description: "Covers vehicles used for business purposes, including company cars, trucks, and vans, protecting against accidents, damage, theft, and liability claims.",
    protections: [
      "Liability coverage for bodily injury and property damage",
      "Collision coverage for your business vehicles",
      "Comprehensive coverage for non-collision damage",
      "Uninsured/underinsured motorist coverage",
      "Medical payments coverage for employees"
    ]
  },
  {
    name: "Professional Liability Insurance",
    icon: "📋",
    description: "Also known as errors and omissions insurance, this protects service-based businesses against claims of negligence, mistakes, or failure to perform professional services.",
    protections: [
      "Claims of professional negligence",
      "Errors, mistakes, or omissions in service delivery",
      "Failure to meet contractual obligations",
      "Legal defense costs regardless of outcome",
      "Settlements and judgments from covered claims"
    ]
  },
  {
    name: "Errors and Omissions (E&O) Insurance",
    icon: "📊",
    description: "Specialized coverage for professionals and service providers, protecting against claims that your advice, services, or work caused financial harm to a client.",
    protections: [
      "Financial harm caused by your professional advice",
      "Mistakes in professional services",
      "Legal costs associated with defending claims",
      "Settlements and damages awarded",
      "Claims related to contract disputes"
    ]
  },
  {
    name: "Tools & Equipment Insurance",
    icon: "🛠️",
    description: "Covers your tools, equipment, and business assets against damage, loss, or theft, whether on the job site, in transit, or at your business location.",
    protections: [
      "Tools and equipment on job sites",
      "Equipment in transit or temporarily off-premises",
      "Theft, damage, and accidental loss",
      "Rented or leased equipment",
      "Replacement costs for lost or damaged items"
    ]
  },
  {
    name: "Employment Practices Liability Insurance",
    icon: "👥",
    description: "Protects your business against claims from employees alleging discrimination, harassment, wrongful termination, or other employment-related violations.",
    protections: [
      "Claims of discrimination (race, age, gender, etc.)",
      "Wrongful termination claims",
      "Sexual harassment allegations",
      "Retaliation claims",
      "Legal defense and settlement costs"
    ]
  }
];

// Who We Cover
const whoWeCover = [
  "Construction",
  "Contractors",
  "Consultants",
  "Cleaning",
  "Retail",
  "Food & Beverage",
  "Sports & Fitness",
  "Education",
  "Arts & Entertainment",
  "Beauty & Personal Care"
];

// Industry/Sector options (matches Who We Cover)
const industries = [
  "Construction", "Contractors", "Consultants", "Cleaning Services", "Retail & E-commerce", "Food & Beverage",
  "Sports & Fitness", "Education", "Arts & Entertainment", "Beauty & Personal Care", "Other"
];

// Annual income options
const incomeRanges = [
  "Less than $50,000", "$50,000 - $100,000", "$100,000 - $250,000",
  "$250,000 - $500,000", "$500,000 - $1,000,000", "$1,000,000 - $5,000,000",
  "More than $5,000,000"
];

type CoverageItem = (typeof whatWeCover)[number]

export default function Home() {
  const { user } = useSupabase()
  const [activeSection, setActiveSection] = useState("home")
  const [glowPosition, setGlowPosition] = useState({ left: 0, width: 0 })
  const navRefs = {
    home: useRef<HTMLAnchorElement>(null),
    services: useRef<HTMLAnchorElement>(null),
    about: useRef<HTMLAnchorElement>(null),
    contact: useRef<HTMLAnchorElement>(null),
  }

  const [selectedCoverage, setSelectedCoverage] = useState<CoverageItem | null>(null)
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false)

  const openCoverageModal = (coverage: CoverageItem) => {
    setSelectedCoverage(coverage)
    setIsCoverageModalOpen(true)
  }

  const closeCoverageModal = () => {
    setIsCoverageModalOpen(false)
    setSelectedCoverage(null)
  }

  // Quote form state
  const [quoteForm, setQuoteForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    industry: "",
    state: "",
    employees: "",
    hasLawsuits: "",
    annualIncome: "",
    additionalInfo: ""
  });

  // Handle quote form input change
  const handleQuoteInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuoteForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle quote form submission (WhatsApp)
  const handleQuoteSubmit = () => {
    const { companyName, contactName, email, phone, industry, state, employees, hasLawsuits, annualIncome, additionalInfo } = quoteForm;
    
    // Create pre-formatted message
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
    
    // Open WhatsApp with the pre-filled message
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
    const checkoutId =
      params.get('checkoutId') ||
      params.get('checkout_id') ||
      params.get('payment_link_id') ||
      params.get('paymentLinkId') ||
      params.get('transactionId') ||
      params.get('orderId') ||
      null

    if (checkoutId) {
      window.location.replace(`/admin/payments/success?checkoutId=${encodeURIComponent(checkoutId)}`)
    }
  }, [])

  useEffect(() => {
    const targetRef = navRefs[activeSection as keyof typeof navRefs]
    const updatePosition = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect()
        const parentRect = targetRef.current.parentElement?.getBoundingClientRect()
        if (parentRect) {
          setGlowPosition({
            left: rect.left - parentRect.left - 16,
            width: rect.width + 32
          })
        }
      }
    }
    
    updatePosition()
    window.addEventListener("resize", updatePosition)
    
    return () => window.removeEventListener("resize", updatePosition)
  }, [activeSection])

  const NavItem = ({ href, label, ref }: { href: string; label: string; ref: React.Ref<HTMLAnchorElement> }) => {
    const sectionKey = href.replace("#", "")
    const isActive = activeSection === sectionKey
    
    return (
      <Link 
        href={href} 
        ref={ref}
        className="relative px-6 py-8"
      >
        {!isActive && (
          <div className="absolute inset-0 hover:bg-gradient-to-r from-slate-800/50 to-transparent transition-all"></div>
        )}
        <span className={`relative font-semibold uppercase text-[10px] tracking-[0.2em] transition-colors ${
          isActive ? "text-amber-400" : "text-slate-300 hover:text-amber-400"
        }`}>
          {label}
        </span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50">
        <div className="max-w-[120rem] mx-auto px-6">
          <div className="relative mt-6">
            <div className="relative bg-gradient-to-r from-slate-900/98 via-slate-900/95 to-slate-900/98 backdrop-blur-xl border border-amber-500/30 rounded-lg shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"></div>
              
              <div className="flex items-center h-20">
                <Link href="/" className="flex items-center px-8 border-r border-amber-500/20 h-full">
                  <Image 
                    src="/images/logo.png" 
                    alt="Olimpo Coverage Group Logo" 
                    width={60} 
                    height={60} 
                    className="mr-4"
                  />
                  <div className="flex flex-col">
                    <span className="text-3xl font-serif font-bold text-white tracking-wide">OLIMPO</span>
                    <span className="text-amber-400 text-[10px] uppercase tracking-[0.3em] font-semibold">Coverage Group</span>
                  </div>
                </Link>
                
                <div className="flex-1 flex items-center justify-center gap-1 px-4 relative">
                  <div 
                    className="absolute bg-gradient-to-r from-amber-500/25 via-amber-500/10 to-transparent rounded-full blur-lg pointer-events-none transition-all duration-500 ease-out"
                    style={{
                      left: `${glowPosition.left}px`,
                      width: `${glowPosition.width}px`,
                      height: '100%',
                      top: 0,
                    }}
                  />
                  <NavItem href="#home" label="HOME" ref={navRefs.home} />
                  <NavItem href="#services" label="SERVICES" ref={navRefs.services} />
                  <NavItem href="#about" label="ABOUT US" ref={navRefs.about} />
                  <NavItem href="#contact" label="CONTACT" ref={navRefs.contact} />
                </div>
                
                <div className="flex items-center gap-6 border-l border-amber-500/20 pl-8 pr-8 h-full">
                  <div className="flex flex-col items-end">
                    <span className="text-amber-400 text-[9px] uppercase tracking-[0.2em] font-semibold">Toll Free</span>
                    <span className="text-white font-semibold tracking-wide text-lg whitespace-nowrap">(445) 325-0112</span>
                  </div>
                  
                  <Link href="#contact" className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-800 rounded-md blur opacity-60"></div>
                    <div className="relative bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-slate-900 px-8 py-3 rounded-md font-bold uppercase text-[11px] tracking-[0.2em] border border-amber-400/40 shadow-xl hover:shadow-amber-500/50 transition-all">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.617 1.718 10.308a1 1 0 01-.686 1.062 16.03 16.03 0 01-7.898 0 1 1 0 01-.686-1.062l1.718-10.31L3.945 6.5a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        GET A QUOTE
                      </span>
                    </div>
                  </Link>
                  
                  <AuthButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-52 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/fondo1.png"
            alt="Background"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-slate-300">Trusted by 500+ Businesses</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              Protect Your <span className="bg-gradient-to-r from-blue-500 to-amber-500 bg-clip-text text-transparent">Business</span> With Confidence
            </h1>
            <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Comprehensive commercial insurance solutions tailored to safeguard your business assets and operations. Your trusted partner on Horsham PA, USA.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Link href="#contact" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-blue-600/30">
                Request Quote
              </Link>
              <Link href="#services" className="border-2 border-slate-700 hover:border-amber-500 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:bg-slate-800">
                Explore Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800/30 border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "15+", label: "Years Experience" },
              { number: "500+", label: "Happy Clients" },
              { number: "10K+", label: "Policies Issued" },
              { number: "24/7", label: "Support Available" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-amber-500 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <p className="text-slate-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-blue-500 font-semibold tracking-wide uppercase text-sm">Our Services</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">Comprehensive Insurance Solutions</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Complete coverage options to protect every aspect of your business operations</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "⚖️", title: "General Liability", desc: "Protect your business against claims of property damage, bodily injury, and personal injury." },
              { icon: "🏢", title: "Commercial Property", desc: "Coverage for your building, equipment, inventory, and other physical assets." },
              { icon: "🚗", title: "Commercial Auto", desc: "Protect your business vehicles and drivers from accidents, damage, and liability claims." },
              { icon: "👷", title: "Workers' Comp", desc: "Provide medical benefits and wage replacement to employees injured during work." },
              { icon: "📊", title: "Business Interruption", desc: "Coverage for lost income when your business operations are temporarily halted." },
              { icon: "🛠️", title: "Tools & Equipment", desc: "Coverage for your tools, equipment, and business assets on and off the job site." },
            ].map((service, index) => (
              <div key={index} className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all group">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600/20 to-amber-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">{service.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{service.title}</h3>
                <p className="text-slate-400 leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* About Section */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <span className="text-blue-500 font-semibold tracking-wide uppercase text-sm">About Us</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-8">Your Trusted Insurance Partner</h2>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                With over 15 years of experience in the insurance industry, we are your reliable partner on Horsham PA, USA. We specialize in providing personalized insurance solutions for businesses of all sizes.
              </p>
              <div className="space-y-5">
                {[
                  "Personalized consultation tailored to your business needs",
                  "Competitive pricing with comprehensive coverage options",
                  "24/7 dedicated support team",
                  "Fast and efficient claims processing",
                ].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-amber-500 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                    <span className="text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="bg-gradient-to-br from-blue-600 to-amber-500 p-1 rounded-3xl">
                <div className="bg-slate-900 p-12 rounded-3xl">
                  <div className="text-center">
                    <div className="text-7xl font-bold text-white mb-4">15+</div>
                    <p className="text-slate-300 text-lg">Years of Excellence</p>
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
          <div className="text-center mb-20">
            <span className="text-amber-500 font-semibold tracking-wide uppercase text-sm">Our Coverage</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">What We Cover & Who We Cover</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Comprehensive insurance solutions tailored for your specific industry and needs</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* What We Cover */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-8">What We Cover</h3>
              <ul className="space-y-4">
                {whatWeCover.map((item, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => openCoverageModal(item)}
                      className="w-full flex items-center gap-4 text-left p-3 rounded-2xl border border-transparent hover:border-amber-500/40 hover:bg-slate-900/30 transition-all"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-600/20 to-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">{item.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-200 text-lg font-semibold">{item.name}</span>
                        <p className="text-slate-400 text-sm mt-1 line-clamp-1">{item.description}</p>
                      </div>
                      <div className="flex-shrink-0 text-slate-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Who We Cover */}
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700">
              <h3 className="text-2xl font-bold text-white mb-8">Who We Cover</h3>
              <ul className="space-y-4">
                {whoWeCover.map((item, index) => (
                  <li key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600/20 to-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-500 text-lg">✓</span>
                    </div>
                    <span className="text-slate-300 text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Request Section */}
      <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-amber-500 font-semibold tracking-wide uppercase text-sm">Request Your Quote</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-white">Get a Personalized Quote for Your Business</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Fill out the form and we will send you a quote tailored to your business needs</p>
          </div>
          
          <div className="grid lg:grid-cols-5 gap-12">
            <div className="lg:col-span-2 space-y-8">
              {[
                { icon: "📍", title: "Location", content: "Horsham PA, USA" },
                { icon: "📧", title: "Email", content: "contacto@olimpocoveragegroup.com" },
                { icon: "📞", title: "Phone", content: "(445) 325-0112" },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600/20 to-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-slate-400">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="lg:col-span-3">
              <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-700 space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Your Company Information</h3>
                
                {/* Company & Contact Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={quoteForm.companyName}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="Your company name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Contact Person</label>
                    <input
                      type="text"
                      name="contactName"
                      value={quoteForm.contactName}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={quoteForm.email}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="email@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={quoteForm.phone}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="(123) 456-7890"
                      required
                    />
                  </div>
                </div>
                
                {/* Industry & Location */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Industry/Sector</label>
                    <select
                      name="industry"
                      value={quoteForm.industry}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    >
                      <option value="">Select an industry</option>
                      {industries.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Location (State)</label>
                    <select
                      name="state"
                      value={quoteForm.state}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    >
                      <option value="">Select a state</option>
                      {usStates.map((state) => (
                        <option key={state.id} value={state.id}>{state.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Employees & Lawsuits */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Number of Employees</label>
                    <select
                      name="employees"
                      value={quoteForm.employees}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    >
                      <option value="">Select an option</option>
                      {employeeCounts.map((count) => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Have you been in civil lawsuits before?</label>
                    <select
                      name="hasLawsuits"
                      value={quoteForm.hasLawsuits}
                      onChange={handleQuoteInputChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    >
                      <option value="">Select an option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
                
                {/* Annual Income */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Annual Company Income</label>
                  <select
                    name="annualIncome"
                    value={quoteForm.annualIncome}
                    onChange={handleQuoteInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  >
                    <option value="">Select a range</option>
                    {incomeRanges.map((range) => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>
                
                {/* Additional Info */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Additional Information</label>
                  <textarea
                    name="additionalInfo"
                    rows={4}
                    value={quoteForm.additionalInfo}
                    onChange={handleQuoteInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                    placeholder="Tell us more about your company's needs..."
                  />
                </div>
                
                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleQuoteSubmit}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-slate-900 px-8 py-5 rounded-xl font-bold text-lg transition-all shadow-xl shadow-amber-600/30 flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">💬</span>
                    Send Quote via WhatsApp
                  </button>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center">
              <Image src="/images/logo.png" alt="Olimpo Coverage Group Logo" width={70} height={70} className="mr-6" />
              <div>
                <span className="text-4xl font-serif font-bold text-white tracking-wide">OLIMPO</span>
                <span className="text-amber-400 text-[11px] uppercase tracking-[0.3em] font-semibold block">Coverage Group</span>
              </div>
            </div>
            <div className="flex gap-8">
              <Link href="#home" className="text-slate-400 hover:text-white transition-colors">Home</Link>
              <Link href="#services" className="text-slate-400 hover:text-white transition-colors">Services</Link>
              <Link href="#about" className="text-slate-400 hover:text-white transition-colors">About</Link>
              <Link href="#contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 Olimpo Coverage Group. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {isCoverageModalOpen && selectedCoverage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeCoverageModal}
        >
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-6">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-600/20 to-amber-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">{selectedCoverage.icon}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl font-bold text-white">{selectedCoverage.name}</h3>
                  <p className="text-slate-400 mt-1">{selectedCoverage.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCoverageModal}
                className="flex-shrink-0 w-10 h-10 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <h4 className="text-lg font-semibold text-white mb-4">What this coverage helps protect you from</h4>
              <ul className="space-y-3">
                {selectedCoverage.protections.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-500/15 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-amber-400 text-sm">✓</span>
                    </div>
                    <span className="text-slate-300">{p}</span>
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
