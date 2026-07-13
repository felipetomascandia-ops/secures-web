/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const { signInWithGoogle, user } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    // Auto-fill from Google if user is already logged in
    if (user?.email) {
      const email = user.email || ''
      const firstName = user.user_metadata?.first_name || user.user_metadata?.given_name || ''
      const lastName = user.user_metadata?.last_name || user.user_metadata?.family_name || ''
      setFormData(prev => ({
        ...prev,
        email,
        firstName,
        lastName,
      }))
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      if (user) {
        // User is already logged in with Google, just update profile
        const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim() || null
        const { error: profileError } = await (supabase as unknown as any).from('user_profiles').upsert([
          {
            user_id: user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: fullName,
            email: user.email || formData.email || null,
            business_name: formData.businessName || null,
          } as any,
        ] as any )

        if (profileError) throw profileError
        setSuccess('Profile updated successfully!')
      } else {
        // Register new user with email/password
        const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.olimpocoveragegroup.com'}/profile`

        const { error: signUpError, data } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            },
            emailRedirectTo: redirectUrl,
          },
        })

        if (signUpError) throw signUpError

        // Create profile
        if (data.user) {
          const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim() || null
          const { error: profileError } = await (supabase as unknown as any).from('user_profiles').upsert([
            {
              user_id: data.user.id,
              first_name: formData.firstName,
              last_name: formData.lastName,
              full_name: fullName,
              email: formData.email || null,
              business_name: formData.businessName || null,
            } as any,
          ] as any )

          if (profileError) throw profileError
        }

        setSuccess('Registration successful! Please check your email to verify your account and log in.')
      }
    } catch (error: unknown) {
      setError(String(error))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-white">OLIMPO</span>
            <span className="text-slate-400 block text-sm">Coverage Group</span>
          </div>
        </Link>

        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-2">
            {user ? 'Complete Your Profile' : 'Create Account'}
          </h2>
          <p className="text-slate-400 mb-8">
            {user ? 'Fill in the missing information' : 'Sign up to get started'}
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-slate-300 mb-2">
                Business Name <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                id="businessName"
                type="text"
                value={formData.businessName}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Your Business"
              />
            </div>

            {!user && (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : user ? 'Complete Profile' : 'Create Account'}
            </button>
          </form>

          {!user && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-800/50 text-slate-400">or continue with</span>
                </div>
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-3 px-4 rounded-xl font-semibold transition-all shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.564 12.256c0-.78-.07-1.53-.2-2.256H12v4.284h5.916a5.04 5.04 0 01-2.208 3.312v2.76h3.576c2.09-1.924 3.28-4.752 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.976 0 5.46-.984 7.284-2.664l-3.576-2.76c-.984.66-2.232 1.06-3.708 1.06-2.868 0-5.292-1.932-6.168-4.536H2.184v2.844C3.996 20.532 7.704 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.832 14.1c-.396-1.188-.624-2.472-.624-3.804s.228-2.616.624-3.804V3.648H2.184C.78 6.432 0 9.132 0 12s.78 5.568 2.184 8.352l3.648-2.844z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.752c1.632 0 3.096.564 4.236 1.668l3.168-3.168C17.448 1.392 14.976 0 12 0 7.704 0 3.996 2.472 2.184 6.348l3.648 2.844c.876-2.604 3.3-4.44 6.168-4.44z"
                  />
                </svg>
                Sign up with Google
              </button>
            </>
          )}

          {!user && (
            <p className="text-center text-slate-400 mt-8">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
