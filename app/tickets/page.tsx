/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Ticket = {
  id: string
  created_at: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  updated_at: string
}

type UserProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
}

export default function TicketsPage() {
  const { user, isLoading, signInWithGoogle } = useSupabase()
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<{ title: string; description: string; priority: 'low' | 'medium' | 'high' | 'urgent' }>({
    title: '',
    description: '',
    priority: 'medium',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (!user || isLoading) return
    
    const checkProfile = async () => {
      const uid = user.id
      const { data } = await (supabase as unknown as typeof supabase)
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)
        .single()

      const profileData = data as UserProfile | null
      setProfile(profileData)
      setProfileLoading(false)

      if (!profileData || !profileData.first_name || !profileData.last_name) {
        router.push('/profile')
      }
    }

    checkProfile()
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && profile && profile.first_name && profile.last_name) {
      fetchTickets()
    }
  }, [user, profile])

  const fetchTickets = async () => {
    const uid = user?.id
    if (!uid) return

    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
        const { error } = await (supabase as unknown as any).from('tickets').insert({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          user_id: user.id,
          status: 'open',
        } as any)

      if (!error) {
        setFormData({ title: '', description: '', priority: 'medium' })
        setShowForm(false)
        fetchTickets()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      open: 'bg-green-500/20 text-green-400 border-green-500/30',
      in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }
    return badges[status as keyof typeof badges] || badges.open
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: 'bg-blue-500/20 text-blue-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-orange-500/20 text-orange-400',
      urgent: 'bg-red-500/20 text-red-400',
    }
    return badges[priority as keyof typeof badges] || badges.medium
  }

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    }
    return labels[priority as keyof typeof labels] || 'Medium'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      open: 'Open',
      in_progress: 'In Progress',
      closed: 'Closed',
    }
    return labels[status as keyof typeof labels] || 'Open'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎫</span>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Support Tickets</h2>
        <p className="text-slate-400 text-lg mb-8">
          Sign in to view and manage your support tickets
        </p>
        <button
          onClick={signInWithGoogle}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-blue-600/30 flex items-center gap-3 mx-auto"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">My Tickets</h1>
          <p className="text-slate-400">View and manage your support requests</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Ticket
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 mb-10">
          <h2 className="text-2xl font-bold text-white mb-6">Create New Ticket</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Brief description of your issue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                rows={4}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                placeholder="Describe your issue or question in detail..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-6 py-3 rounded-xl font-semibold transition-all hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6">
        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📭</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Tickets Yet</h3>
            <p className="text-slate-400">Create your first support ticket</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 hover:border-blue-500/30 hover:bg-slate-800 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {ticket.title}
                  </h3>
                  <p className="text-slate-400 line-clamp-2 mb-4">{ticket.description}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>
                      Created: {new Date(ticket.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
                    </span>
                    <span>•</span>
                    <span>
                      Updated: {new Date(ticket.updated_at).toLocaleDateString('en-US', { dateStyle: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-blue-400 transition-colors">
                    <span className="text-sm">View Ticket</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
