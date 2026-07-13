'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AuthButton } from '@/components/AuthButton'

export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="fixed top-0 w-full z-50">
        <div className="max-w-[120rem] mx-auto px-6">
          <div className="relative mt-6">
            {/* Premium Navbar Container */}
            <div className="relative bg-gradient-to-r from-slate-900/98 via-slate-900/95 to-slate-900/98 backdrop-blur-xl border border-amber-500/30 rounded-lg shadow-2xl">
              {/* Premium Top Border */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"></div>
              
              <div className="flex items-center h-20">
                {/* Logo Section */}
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
                
                <div className="flex-1"></div>
                
                {/* Right Section */}
                <div className="flex items-center gap-6 border-l border-amber-500/20 pl-8 pr-8 h-full">
                  <Link href="/" className="text-slate-300 font-semibold uppercase text-[11px] tracking-[0.2em] hover:text-amber-400 transition-colors">
                    ← BACK TO HOME
                  </Link>
                  <AuthButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="pt-44 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[120rem] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
