'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { CreditCard } from 'lucide-react'

export function AuthButton() {
  const { user, signInWithGoogle, signOut } = useSupabase()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setIsCheckingAdmin(false)
      return
    }

    const checkAdmin = async () => {
      console.log('Checking admin status for user:', user.id)
      
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('Admin check result:', { data, error })
      
      setIsAdmin(!!data)
      setIsCheckingAdmin(false)
    }

    checkAdmin()
  }, [user])

  if (user) {
    const userName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
    const userInitial = userName.charAt(0).toUpperCase()

    return (
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-3 bg-slate-800 border border-slate-700 hover:border-slate-600 px-4 py-2.5 rounded-xl transition-all"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
            isAdmin 
              ? 'bg-gradient-to-br from-purple-600 to-purple-700' 
              : 'bg-gradient-to-br from-blue-600 to-purple-600'
          }`}>
            {userInitial}
          </div>
          <span className="text-white font-medium hidden sm:block">{userName}</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">{userName}</p>
                  {isAdmin && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full border border-purple-500/30">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
                <Link
                  href="/tickets"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  My Tickets
                </Link>
                <Link
                  href="/my-panel"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-6 4h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  My Panel
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-purple-400 hover:text-purple-300 hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21V9h6v12" />
                    </svg>
                    Admin Panel
                  </Link>
                )}
              </div>
              <div className="border-t border-slate-700 py-1">
                <button
                  onClick={() => {
                    signOut()
                    setIsMenuOpen(false)
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl font-semibold transition-all hover:bg-slate-800"
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20"
      >
        Sign Up
      </Link>
    </div>
  )
}
