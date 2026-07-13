/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  user_id: string
  updated_at: string
}

type TicketMessage = {
  id: string
  created_at: string
  ticket_id: string
  user_id: string
  message: string
  is_admin: boolean
}

export function TicketWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'home' | 'create' | 'tickets' | 'chat'>('home')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<{ name: string; email: string; title: string; priority: 'low' | 'medium' | 'high' | 'urgent'; message: string }>({
    name: '',
    email: '',
    title: '',
    priority: 'medium',
    message: '',
  })
  const [success, setSuccess] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, signInWithGoogle } = useSupabase()

  // Scroll to bottom of chat
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, view])

  // Fetch user tickets if logged in
  useEffect(() => {
    if (user && (view === 'tickets' || view === 'chat')) {
      fetchTickets()
    }
  }, [user, view])

  // Subscribe to real-time messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }

    fetchMessages()

    const subscription = supabase
      .channel(`widget-ticket-messages:${selectedTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as TicketMessage])
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [selectedTicket])

  const fetchTickets = async () => {
    setIsLoading(true)
    const uid = user?.id
    if (!uid) return setIsLoading(false)

    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (data) setTickets(data)
    setIsLoading(false)
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setIsSending(true)

    try {
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User'
      const description = `Name: ${userName}\nEmail: ${user.email}\n\n${formData.message}`
      
      await (supabase as unknown as any).from('tickets').insert({
        title: formData.title,
        description: description,
        priority: formData.priority,
        user_id: user.id,
        status: 'open',
      } as any)
      

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setFormData({ name: '', email: '', title: '', priority: 'medium', message: '' })
        fetchTickets()
        setView('tickets')
      }, 2000)
    } catch (error) {
      console.error('Error creating ticket:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedTicket) return

    setIsSending(true)
    try {
      await (supabase as unknown as any).from('ticket_messages').insert({
        ticket_id: selectedTicket.id,
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        message: newMessage.trim(),
        is_admin: false,
      } as any)
      setNewMessage('')
    } finally {
      setIsSending(false)
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

  const getStatusLabel = (status: string) => {
    const labels = {
      open: 'Open',
      in_progress: 'In Progress',
      closed: 'Closed',
    }
    return labels[status as keyof typeof labels] || 'Open'
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

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-4 rounded-full font-semibold shadow-2xl shadow-blue-600/40 transition-all hover:scale-110 animate-bounce"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span className="hidden md:block">Support</span>
      </button>

      {/* Modal Panel */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setIsOpen(false)
              setView('home')
              setSelectedTicket(null)
              setMessages([])
            }}
          />

          {/* Panel Content */}
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md md:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {view === 'home' && 'Customer Support'}
                  {view === 'create' && 'Create Support Ticket'}
                  {view === 'tickets' && 'My Support Tickets'}
                  {view === 'chat' && selectedTicket?.title}
                </h2>
                {view === 'chat' && selectedTicket && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(selectedTicket.status)}`}>
                      {getStatusLabel(selectedTicket.status)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setView('home')
                  setSelectedTicket(null)
                  setMessages([])
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Home View */}
              {view === 'home' && (
                <div className="p-6 space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">🎫</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">How can we help you today?</h3>
                    <p className="text-slate-400">Choose an option below to get started with our support team.</p>
                  </div>

                  <div className="space-y-3">
                    {user ? (
                      <>
                        <button
                          onClick={() => setView('tickets')}
                          className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-blue-500/50"
                        >
                          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">View My Tickets</p>
                            <p className="text-sm text-slate-400">See all your existing support tickets</p>
                          </div>
                        </button>
                        <button
                          onClick={() => setView('create')}
                          className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-blue-500/50"
                        >
                          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">Create New Ticket</p>
                            <p className="text-sm text-slate-400">Open a new support request</p>
                          </div>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={signInWithGoogle}
                          className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-purple-500/50"
                        >
                          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-40" viewBox="0 0 24 24">
                              <path
                                fill="currentColor"
                                d="M22.564 12.256c0-.78-.07-1.53-.2-2.256H12v4.284h5.916a5.04 5.04 0 01-2.208 3.312v2.76h3.576c2.09-1.924 3.28-4.752 3.28-8.1z"
                              />
                              <path
                                fill="currentColor"
                                d="M12 23c2.976 0 5.46-.984 7.284-2.664l-3.576-2.76c-.984.66-2.232 1.06-3.708 1.06-2.868 0-5.292-1.932-6.168-4.536H2.184v2.844C3.996 20.532 7.704 23 12 23z"
                              />
                              <path
                                fill="currentColor"
                                d="M5.832 14.1c-.396-1.188-.624-2.472-.624-3.804s.228-2.616.624-3.804V3.648H2.184C.78 6.432 0 9.132 0 12s.78 5.568 2.184 8.352l3.648-2.844z"
                              />
                              <path
                                fill="currentColor"
                                d="M12 4.752c1.632 0 3.096.564 4.236 1.668l3.168-3.168C17.448 1.392 14.976 0 12 0 7.704 0 3.996 2.472 2.184 6.348l3.648 2.844c.876-2.604 3.3-4.44 6.168-4.44z"
                              />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">Sign in with Google</p>
                            <p className="text-sm text-slate-400">Sign in to create support tickets</p>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Create Ticket View */}
              {view === 'create' && (
                <div className="p-6">
                  {!user ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-blue-40" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.564 12.256c0-.78-.07-1.53-.2-2.256H12v4.284h5.916a5.04 5.04 0 01-2.208 3.312v2.76h3.576c2.09-1.924 3.28-4.752 3.28-8.1z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.976 0 5.46-.984 7.284-2.664l-3.576-2.76c-.984.66-2.232 1.06-3.708 1.06-2.868 0-5.292-1.932-6.168-4.536H2.184v2.844C3.996 20.532 7.704 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.832 14.1c-.396-1.188-.624-2.472-.624-3.804s.228-2.616.624-3.804V3.648H2.184C.78 6.432 0 9.132 0 12s.78 5.568 2.184 8.352l3.648-2.844z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 4.752c1.632 0 3.096.564 4.236 1.668l3.168-3.168C17.448 1.392 14.976 0 12 0 7.704 0 3.996 2.472 2.184 6.348l3.648 2.844c.876-2.604 3.3-4.44 6.168-4.44z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Sign in Required</h3>
                      <p className="text-slate-400 mb-6">Please sign in to create a support ticket.</p>
                      <button
                        onClick={signInWithGoogle}
                        className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-600/20"
                      >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.564 12.256c0-.78-.07-1.53-.2-2.256H12v4.284h5.916a5.04 5.04 0 01-2.208 3.312v2.76h3.576c2.09-1.924 3.28-4.752 3.28-8.1z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.976 0 5.46-.984 7.284-2.664l-3.576-2.76c-.984.66-2.232 1.06-3.708 1.06-2.868 0-5.292-1.932-6.168-4.536H2.184v2.844C3.996 20.532 7.704 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.832 14.1c-.396-1.188-.624-2.472-.624-3.804s.228-2.616.624-3.804V3.648H2.184C.78 6.432 0 9.132 0 12s.78 5.568 2.184 8.352l3.648-2.844z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 4.752c1.632 0 3.096.564 4.236 1.668l3.168-3.168C17.448 1.392 14.976 0 12 0 7.704 0 3.996 2.472 2.184 6.348l3.648 2.844c.876-2.604 3.3-4.44 6.168-4.44z"
                          />
                        </svg>
                        Sign in with Google
                      </button>
                    </div>
                  ) : success ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Ticket Created!</h3>
                      <p className="text-slate-400">We&apos;ll get back to you as soon as possible.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                          placeholder="How can we help you?"
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
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                        <textarea
                          rows={4}
                          required
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                          placeholder="Describe your issue or question in detail..."
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setView('home')}
                          className="flex-1 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white px-6 py-3 rounded-xl font-semibold transition-all hover:bg-slate-700"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isSending}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                          {isSending ? 'Sending...' : 'Send Ticket'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Tickets List View */}
              {view === 'tickets' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Your Tickets</h3>
                    <button
                      onClick={() => setView('create')}
                      className="text-blue-400 hover:text-blue-300 font-semibold text-sm"
                    >
                      + New Ticket
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📭</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">No Tickets Yet</h3>
                      <p className="text-slate-400 text-sm mb-4">Create your first support ticket to get started.</p>
                      <button
                        onClick={() => setView('create')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                      >
                        Create Ticket
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => {
                            setSelectedTicket(ticket)
                            setView('chat')
                          }}
                          className="w-full text-left p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-blue-500/50"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white truncate">{ticket.title}</p>
                              <p className="text-sm text-slate-400 line-clamp-2 mt-1">{ticket.description}</p>
                              <p className="text-xs text-slate-500 mt-2">
                                {new Date(ticket.created_at).toLocaleDateString('en-US', { dateStyle: 'short' })}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                              {getStatusLabel(ticket.status)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat View */}
              {view === 'chat' && selectedTicket && (
                <div className="flex flex-col h-96">
                  <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <button
                      onClick={() => {
                        setView('tickets')
                        setSelectedTicket(null)
                        setMessages([])
                      }}
                      className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to tickets
                    </button>
                    <p className="text-slate-400 text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <span className="text-3xl">💬</span>
                        </div>
                        <p className="text-slate-400">No messages yet. Send the first one!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${message.user_id === user?.id ? 'justify-end flex-row-reverse' : 'justify-start'}`}
                        >
                          {/* Avatar */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            message.user_id === user?.id 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                              : message.is_admin 
                              ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                              : 'bg-gradient-to-br from-slate-500 to-slate-600'
                          }`}>
                            {message.user_id === user?.id 
                              ? 'You' 
                              : message.is_admin 
                              ? 'Admin' 
                              : 'Guest'}
                          </div>
                          
                          {/* Message Bubble */}
                          <div
                            className={`max-w-[75%] ${
                              message.user_id === user?.id
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md'
                                : message.is_admin
                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl rounded-tl-md border-2 border-purple-400/30'
                                : 'bg-slate-700 text-slate-200 rounded-2xl rounded-tl-md'
                            } p-4 shadow-lg`}
                          >
                            {/* Label */}
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                              message.is_admin ? 'text-purple-200' : 'text-blue-200'
                            }`}>
                              {message.user_id === user?.id 
                                ? 'You' 
                                : message.is_admin 
                                ? 'Support Team' 
                                : 'Guest'}
                            </p>
                            
                            {/* Message Text */}
                            <p className="mb-2">{message.message}</p>
                            
                            {/* Time */}
                            <p className={`text-xs ${
                              message.user_id === user?.id ? 'text-blue-200' : 'text-slate-300'
                            }`}>
                              {new Date(message.created_at).toLocaleDateString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                    {selectedTicket.status === 'closed' ? (
                      <p className="text-center text-slate-500 text-sm">
                        This ticket is closed. If you need further help, please open a new ticket.
                      </p>
                    ) : (
                      <form onSubmit={handleSendMessage} className="flex gap-3">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          disabled={isSending}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || isSending}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSending ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                          Send
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
