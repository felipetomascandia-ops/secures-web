/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'
import AdminShell from '@/components/admin/AdminShell'
import type { Database } from '@/types/supabase'

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

export default function AdminTicketsPage() {
  const { user, isLoading: authLoading } = useSupabase()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!user || authLoading) return

    // Check if user is admin
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      setIsAdmin(!!data)
      setIsCheckingAdmin(false)
    }

    checkAdmin()
    fetchTickets()
  }, [user, authLoading])

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setTickets(data)
    }
    setLoading(false)
  }

  const updateStatus = async (id: string, status: Ticket['status']) => {
    const updateObj: Partial<Database['public']['Tables']['tickets']['Update']> = {
      status,
      updated_at: new Date().toISOString(),
    }

    await (supabase as unknown as any)
      .from('tickets')
      .update(updateObj as any)
      .eq('id', id)
    
    fetchTickets()
  }

  const fetchTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket)
    
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
    
    // Subscribe to realtime messages
    const subscription = supabase
      .channel(`admin-ticket-messages:${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticket.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as TicketMessage])
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedTicket || !newMessage.trim()) return

    setIsSending(true)
    try {
        await (supabase as unknown as any).from('ticket_messages').insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newMessage.trim(),
          is_admin: true, // Admin messages are always marked as admin
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

  const deleteTicket = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket and its messages?')) return
    setDeletingTicketId(ticketId)

    try {
      await (supabase as unknown as any).from('ticket_messages').delete().eq('ticket_id', ticketId)
      await (supabase as unknown as any).from('tickets').delete().eq('id', ticketId)
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null)
      }
      fetchTickets()
    } finally {
      setDeletingTicketId(null)
    }
  }

  if (authLoading || isCheckingAdmin) {
    return (
      <AdminShell>
        <div className="flex min-h-screen items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/80">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500"></div>
        </div>
      </AdminShell>
    )
  }

  if (!user) {
    return (
      <AdminShell>
        <div className="flex min-h-screen items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/80">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-white">Access Denied</h2>
            <p className="text-slate-400">Please log in to access the admin panel</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <div className="flex min-h-screen items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/80">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-white">Access Denied</h2>
            <p className="text-slate-400">You are not authorized to access the admin panel</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="min-h-screen rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-2 inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white mb-1">Admin Panel</h1>
          <p className="text-slate-400 text-sm">Manage all support tickets</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Tickets
            </span>
            <Link
              href="/admin/contracts"
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              Contracts
            </Link>
            <Link
              href="/admin/payments"
              className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:text-white hover:bg-purple-600/30 transition-all"
            >
              Payments
            </Link>
          </div>
        </div>

        {selectedTicket ? (
          <div className="flex flex-col h-[calc(100vh-10rem)]">
            <div className="mb-4">
              <button
                onClick={() => setSelectedTicket(null)}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Tickets
              </button>
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-700">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-1">{selectedTicket.title}</h2>
                  <p className="text-slate-400 whitespace-pre-wrap text-sm">{selectedTicket.description}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusBadge(selectedTicket.status)}`}>
                    {getStatusLabel(selectedTicket.status)}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getPriorityBadge(selectedTicket.priority)}`}>
                    {getPriorityLabel(selectedTicket.priority)}
                  </span>
                  <button
                    onClick={() => deleteTicket(selectedTicket.id)}
                    disabled={deletingTicketId === selectedTicket.id}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingTicketId === selectedTicket.id ? 'Deleting...' : 'Delete Ticket'}
                  </button>
                </div>
              </div>

              {/* Status Update Buttons */}
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                {selectedTicket.status !== 'open' && (
                  <button
                    onClick={() => updateStatus(selectedTicket.id, 'open')}
                    className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-semibold"
                  >
                    Mark as Open
                  </button>
                )}
                {selectedTicket.status !== 'in_progress' && (
                  <button
                    onClick={() => updateStatus(selectedTicket.id, 'in_progress')}
                    className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors text-sm font-semibold"
                  >
                    Mark as In Progress
                  </button>
                )}
                {selectedTicket.status !== 'closed' && (
                  <button
                    onClick={() => updateStatus(selectedTicket.id, 'closed')}
                    className="px-4 py-2 rounded-lg bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition-colors text-sm font-semibold"
                  >
                    Mark as Closed
                  </button>
                )}
              </div>
            </div>

            {/* Chat Section */}
            <div className="flex-1 bg-slate-800/30 rounded-2xl border border-slate-700 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-24">
                    <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-8">
                      <span className="text-5xl">💬</span>
                    </div>
                    <p className="text-slate-400 text-lg">No messages yet. Send the first one!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.is_admin ? 'justify-end flex-row-reverse' : 'justify-start'}`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base ${
                        message.is_admin 
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        {message.is_admin ? 'Admin' : 'User'}
                      </div>
                      
                      {/* Message Bubble */}
                      <div
                        className={`max-w-[80%] ${
                          message.is_admin
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl rounded-tr-md border-2 border-purple-400/30'
                            : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-md'
                        } p-6 shadow-lg`}
                      >
                        {/* Label */}
                        <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
                          message.is_admin ? 'text-purple-200' : 'text-blue-200'
                        }`}>
                          {message.is_admin ? 'Support Team' : 'User'}
                        </p>
                        
                        {/* Message Text */}
                        <p className="mb-3 text-base leading-relaxed">{message.message}</p>
                        
                        {/* Time */}
                        <p className={`text-sm ${
                          message.is_admin ? 'text-purple-200' : 'text-slate-300'
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

              <div className="p-8 border-t border-slate-700 bg-slate-800/50">
                {selectedTicket.status === 'closed' ? (
                  <p className="text-center text-slate-500 text-sm">
                    This ticket is closed. If you need further assistance, please open a new ticket.
                  </p>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={isSending}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-6 py-5 text-lg text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || isSending}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-10 py-5 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                      Send as Admin
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {tickets.length === 0 ? (
              <div className="text-center py-24 bg-slate-800/30 rounded-2xl border border-slate-700">
                <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-8">
                  <span className="text-5xl">📭</span>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">No tickets yet</h3>
                <p className="text-slate-400 text-lg">Awaiting first support ticket</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">{ticket.title}</h4>
                      <p className="text-slate-400 text-sm">{ticket.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getPriorityBadge(ticket.priority)}`}>
                        {getPriorityLabel(ticket.priority)}
                      </span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => fetchTicketDetail(ticket)} className="text-blue-400 hover:text-blue-300">Open</button>
                      <button
                        onClick={() => deleteTicket(ticket.id)}
                        disabled={deletingTicketId === ticket.id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingTicketId === ticket.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  </AdminShell>
)
}
