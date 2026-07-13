/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
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

export default function TicketDetailPage() {
  const { user, isLoading: authLoading } = useSupabase()
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!user || authLoading) return

    const fetchTicket = async () => {
      const id = params.id as string | undefined
      if (!id) return router.push('/tickets')

      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        setTicket(data)
      } else {
        router.push('/tickets')
      }
    }

    const fetchMessages = async () => {
      const id2 = params.id as string | undefined
      if (!id2) return

      const { data } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id2)
        .order('created_at', { ascending: true })
      
      if (data) setMessages(data)
    }

    fetchTicket()
    fetchMessages()

    const messagesSubscription = supabase
      .channel(`ticket_messages:${params.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${params.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as TicketMessage])
      })
      .subscribe()

    return () => {
      messagesSubscription.unsubscribe()
    }
  }, [params.id, user, authLoading, router, supabase])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim()) return

    setIsSending(true)
    try {
        await (supabase as unknown as any).from('ticket_messages').insert({
          ticket_id: params.id as string,
          user_id: user.id,
          message: newMessage.trim(),
          is_admin: false, // Default to false; you can set admin status in Supabase
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/tickets')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tickets
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{ticket.title}</h1>
            <p className="text-slate-400 whitespace-pre-wrap">{ticket.description}</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <span className={`px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusBadge(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
            <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${getPriorityBadge(ticket.priority)}`}>
              {getPriorityLabel(ticket.priority)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-800/30 rounded-2xl border border-slate-700 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">💬</span>
              </div>
              <p className="text-slate-400">No messages yet. Send the first one!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.user_id === user.id ? 'justify-end flex-row-reverse' : 'justify-start'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  message.user_id === user.id 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                    : message.is_admin 
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                    : 'bg-gradient-to-br from-slate-500 to-slate-600'
                }`}>
                  {message.user_id === user.id 
                    ? 'You' 
                    : message.is_admin 
                    ? 'Admin' 
                    : 'Guest'}
                </div>
                
                {/* Message Bubble */}
                <div
                  className={`max-w-[75%] ${
                    message.user_id === user.id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md'
                      : message.is_admin
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl rounded-tl-md border-2 border-purple-400/30'
                      : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-md'
                  } p-4 shadow-lg`}
                >
                  {/* Label */}
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                    message.is_admin ? 'text-purple-200' : 'text-blue-200'
                  }`}>
                    {message.user_id === user.id 
                      ? 'You' 
                      : message.is_admin 
                      ? 'Support Team' 
                      : 'Guest'}
                  </p>
                  
                  {/* Message Text */}
                  <p className="mb-2">{message.message}</p>
                  
                  {/* Time */}
                  <p className={`text-xs ${
                    message.user_id === user.id ? 'text-blue-200' : 'text-slate-300'
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

        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={ticket.status === 'closed' || isSending}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || ticket.status === 'closed' || isSending}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          {ticket.status === 'closed' && (
            <p className="text-center text-slate-500 mt-3 text-sm">
              This ticket is closed. If you need further assistance, please open a new ticket.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
