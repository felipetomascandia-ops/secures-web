/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useState } from 'react'
import PaymentModal from '@/components/PaymentsModal'
import AdminShell from '@/components/admin/AdminShell'

type Payment = any

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

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

  const stats = {
    totalPayments: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    paid: payments.filter(p => p.status === 'paid').length,
    expired: payments.filter(p => p.status === 'expired').length,
    totalRevenue: payments.filter(p => p.status === 'paid').reduce((s:number,p:any)=>s+Number(p.amount||0),0),
  }

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

        {/* Table */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700 p-4">
          {loading ? (
            <div className="text-slate-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead>
                  <tr className="text-left text-sm text-slate-400">
                    <th className="px-4 py-2">Client</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Expiration</th>
                    <th className="px-4 py-2">Payment Link</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {payments.map((p:any) => (
                    <tr key={p.id} className="text-white text-sm">
                      <td className="px-4 py-3">{p.customer}</td>
                      <td className="px-4 py-3">{p.email}</td>
                      <td className="px-4 py-3">${Number(p.amount||0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${p.status==='paid'?'bg-green-500/20 text-green-400':p.status==='pending'?'bg-yellow-500/20 text-yellow-400':p.status==='expired'?'bg-red-500/20 text-red-400':'bg-slate-500/20 text-slate-400'}`}>
                          {p.status}</span>
                      </td>
                      <td className="px-4 py-3">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">{p.square_url ? (<a href={p.square_url} target="_blank" rel="noreferrer" className="underline text-blue-400">Open</a>) : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="px-2 py-1 bg-slate-700 rounded">View</button>
                          <button onClick={()=>navigator.clipboard.writeText(p.square_url||'')} className="px-2 py-1 bg-slate-700 rounded">Copy</button>
                          <a href={`https://wa.me/${p.phone || ''}?text=Hello%20${encodeURIComponent(p.customer||'')}`} target="_blank" rel="noreferrer" className="px-2 py-1 bg-slate-700 rounded">WhatsApp</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && <PaymentModal onClose={()=>{setShowModal(false); fetchPayments()}} />}
      </div>
    </AdminShell>
  )
}
