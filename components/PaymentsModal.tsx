/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState } from 'react'

type Props = { onClose: ()=>void }

export default function PaymentModal({ onClose }: Props) {
  const [customer, setCustomer] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [description, setDescription] = useState('')
  const [contractId, setContractId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [message, setMessage] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendWhatsapp, setSendWhatsapp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, email, phone, amount, currency, description, contractId, expiresAt, sendEmail, sendWhatsapp }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Error')
      // Optionally trigger sending email/whatsapp here
      onClose()
    } catch (err:any) {
      setError(err?.message || String(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Create Payment</h3>
          <button onClick={onClose} className="text-slate-400">Close</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400">Client Name</label>
              <input value={customer} onChange={e=>setCustomer(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Phone</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Amount</label>
              <input value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Currency</label>
              <select value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white">
                <option>USD</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400">Contract # (optional)</label>
              <input value={contractId} onChange={e=>setContractId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400">Expiration Date</label>
              <input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Message</label>
              <input value={message} onChange={e=>setMessage(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-slate-800 text-white" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={()=>setSendEmail(v=>!v)} /> Email</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendWhatsapp} onChange={()=>setSendWhatsapp(v=>!v)} /> WhatsApp</label>
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-slate-700">Cancel</button>
            <button disabled={loading} type="submit" className="px-4 py-2 rounded bg-purple-600 text-white">Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}
