/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useMemo, useState } from 'react'
import PaymentModal from '@/components/PaymentsModal'
import AdminShell from '@/components/admin/AdminShell'

type Payment = {
  id: string
  customer: string
  email?: string
  phone?: string
  amount?: number | string
  status?: string
  created_at?: string
  expires_at?: string | null
  square_url?: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/payments/list')
      const json = await res.json()
      if (json.success) setPayments(json.payments || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const deletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return
    setDeletingPaymentId(paymentId)
    try {
      const res = await fetch('/api/admin/payments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchPayments()
        if (expandedCustomer) setExpandedCustomer(expandedCustomer)
      } else {
        console.error('Delete payment failed', json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingPaymentId(null)
    }
  }

  const stats = {
    totalPayments: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    paid: payments.filter(p => p.status === 'paid').length,
    expired: payments.filter(p => p.status === 'expired').length,
    totalRevenue: payments.filter(p => p.status === 'paid').reduce((s:number,p)=>s+Number(p.amount||0),0),
  }

  const paymentsByCustomer = useMemo(() => {
    return payments.reduce((groups: Record<string, Payment[]>, payment) => {
      const customer = payment.customer || 'Unnamed Client'
      if (!groups[customer]) groups[customer] = []
      groups[customer].push(payment)
      return groups
    }, {})
  }, [payments])

  const customers = Object.keys(paymentsByCustomer)

  return (
    <AdminShell>
      <div className="min-h-screen rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Payments</h1>
            <p className="text-slate-400">Create and manage Square payment links</p>
          </div>
          <div>
            <button onClick={()=>setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3v7h6v-7c0-1.657-1.343-3-3-3z"/></svg>
              Create Payment
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
            <div className="text-slate-400 text-sm">Total Payments</div>
            <div className="text-white text-2xl font-bold">{stats.totalPayments}</div>
          </div>
          <div className="p-4 bg-yellow-900/10 rounded-2xl border border-yellow-700/20">
            <div className="text-slate-400 text-sm">Pending</div>
            <div className="text-white text-2xl font-bold">{stats.pending}</div>
          </div>
          <div className="p-4 bg-green-900/10 rounded-2xl border border-green-700/20">
            <div className="text-slate-400 text-sm">Paid</div>
            <div className="text-white text-2xl font-bold">{stats.paid}</div>
          </div>
          <div className="p-4 bg-red-900/10 rounded-2xl border border-red-700/20">
            <div className="text-slate-400 text-sm">Expired</div>
            <div className="text-white text-2xl font-bold">{stats.expired}</div>
          </div>
          <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
            <div className="text-slate-400 text-sm">Total Revenue</div>
            <div className="text-white text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </div>
        </div>

        {/* Customers accordion */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="text-slate-400">No payments found.</div>
          ) : (
            customers.map((customer) => {
              const customerPayments = paymentsByCustomer[customer] || []
              const isExpanded = expandedCustomer === customer
              const pendingCount = customerPayments.filter((p) => p.status === 'pending').length
              return (
                <div key={customer} className="rounded-3xl border border-slate-700 bg-slate-800/70">
                  <button
                    type="button"
                    onClick={() => setExpandedCustomer(isExpanded ? null : customer)}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left"
                  >
                    <div>
                      <div className="text-lg font-semibold text-white">{customer}</div>
                      <div className="text-slate-400 text-sm">
                        {customerPayments.length} payment{customerPayments.length === 1 ? '' : 's'} · {pendingCount} pending
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="rounded-full bg-slate-900/80 px-3 py-1">{isExpanded ? 'Hide' : 'Show'}</span>
                      <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-slate-700/60 p-4">
                      {customerPayments.map((payment) => (
                        <div key={payment.id} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                                <span>Email: {payment.email || '-'}</span>
                                <span>Phone: {payment.phone || '-'}</span>
                              </div>
                              <div className="flex flex-wrap gap-3 items-center text-white">
                                <span className="text-lg font-semibold">${Number(payment.amount || 0).toFixed(2)}</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${payment.status === 'paid' ? 'bg-green-500/20 text-green-400' : payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : payment.status === 'expired' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                  {payment.status || 'unknown'}
                                </span>
                              </div>
                              <div className="text-slate-400 text-sm">
                                Created: {payment.created_at ? new Date(payment.created_at).toLocaleString() : '-'}
                                {' · '}Expires: {payment.expires_at ? new Date(payment.expires_at).toLocaleDateString() : '-'}
                              </div>
                              <div className="text-sm">
                                Link: {payment.square_url ? (<a href={payment.square_url} target="_blank" rel="noreferrer" className="font-medium text-blue-400 underline">Open</a>) : '-'}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => deletePayment(payment.id)}
                                disabled={deletingPaymentId === payment.id}
                                className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/10 px-3 py-2 text-red-200 transition hover:bg-red-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                                <span>{deletingPaymentId === payment.id ? 'Deleting...' : 'Delete payment'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {showModal && <PaymentModal onClose={() => { setShowModal(false); fetchPayments() }} />}
      </div>
    </AdminShell>
  )
}
