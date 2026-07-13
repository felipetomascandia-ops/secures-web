/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'

type UserProfile = {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string | null
  business_name: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, signOut } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    phone: '',
    address: '',
    email: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user || authLoading) return
    fetchProfile()
  }, [user, authLoading])

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        businessName: profile.business_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        email: user?.email || '',
      })
    }
  }, [profile, user])

  const fetchProfile = async () => {
    try {
      const uid = user?.id
      if (!uid) return

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setProfile(data)
    } catch (error: any) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)

    try {
      const uid = user?.id
      if (!uid) throw new Error('User not available')

      const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(' ').trim() || null
      const { error } = await (supabase as unknown as any)
        .from('user_profiles')
        .upsert([
          {
            user_id: uid,
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: fullName,
            email: formData.email || user?.email || null,
            business_name: formData.businessName || null,
            phone: formData.phone || null,
            address: formData.address || null,
            updated_at: new Date().toISOString(),
          } as any,
        ] as any,
          { onConflict: 'user_id' }
        )

      if (error) throw error
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      fetchProfile()
    } catch (error: unknown) {
      setMessage({ type: 'error', text: String(error) })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value,
    }))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please sign in</h2>
          <p className="text-slate-400 mb-8">You need to be signed in to view your profile</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-8 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
            <p className="text-slate-400">Manage your account information</p>
          </div>
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700">
          {message && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg ${
                message.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-700">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                {(formData.firstName[0] || 'U').toUpperCase()}
                {(formData.lastName[0] || '').toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {formData.firstName || 'User'} {formData.lastName || ''}
                </h2>
                <p className="text-slate-400">{formData.email}</p>
              </div>
            </div>

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

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                Phone <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-2">
                Address <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-8 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="px-6 py-3 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-colors rounded-xl font-semibold"
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
