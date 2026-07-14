"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Payment {
  id: string
  square_checkout_id: string | null
  square_url: string | null
  amount: number
  currency: string
  status: string
  customer: string
  email: string
  phone: string | null
  description: string | null
  contract_id: string | null
  created_by: string | null
  expires_at: string | null
  created_at: string
}

export default function PaymentSuccessPage() {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('Checking payment status...')

  useEffect(() => {
    const search = window.location.search
    const params = new URLSearchParams(search)
    const paymentId = params.get('paymentId')
    const checkoutId =
      params.get('checkoutId') ||
      params.get('checkout_id') ||
      params.get('payment_link_id') ||
      params.get('paymentLinkId') ||
      params.get('transactionId') ||
      params.get('transaction_id') ||
      params.get('orderId') ||
      params.get('order_id') ||
      null

    const query = paymentId
      ? `paymentId=${encodeURIComponent(paymentId)}`
      : checkoutId
      ? `checkoutId=${encodeURIComponent(checkoutId)}`
      : null

    if (!query) {
      setStatus('ready')
      setMessage('Your payment was completed successfully. If you want to check status, return to the payments list.')
      return
    }

    fetch(`/api/admin/payments/success-status?${query}`)
      .then(res => res.json())
      .then(json => {
        if (!json.success) {
          setStatus('error')
          setMessage(json.message || 'No payment record found.')
          return
        }
        setPayment(json.payment)
        setStatus('ready')
      })
      .catch(err => {
        setStatus('error')
        setMessage(err?.message || 'Request failed.')
      })
  }, [])

  const renderStatus = () => {
    if (status === 'loading') return <p className="text-slate-300">{message}</p>
    if (status === 'error') return <p className="text-red-400">{message}</p>
    if (!payment) return <p className="text-red-400">Payment not found.</p>

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-green-500/30 bg-slate-950/70 p-6">
          <h1 className="text-3xl font-bold text-white">Payment Successful</h1>
          <p className="mt-2 text-slate-400">Thank you, {payment.customer}. Your payment status is <strong className="text-green-300">{payment.status}</strong>.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm text-slate-300">
            <div className="rounded-2xl bg-slate-900 p-4">
              <div className="text-slate-500">Amount</div>
              <div className="text-white text-xl">${payment.amount.toFixed(2)} {payment.currency}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4">
              <div className="text-slate-500">Payment link</div>
              <div className="text-white"><a href={payment.square_url || '#'} target="_blank" rel="noreferrer" className="underline">Open link</a></div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-300">
          <p><strong>Checkout ID:</strong> {payment.square_checkout_id || 'N/A'}</p>
          <p><strong>Customer email:</strong> {payment.email}</p>
          <p><strong>Phone:</strong> {payment.phone || 'N/A'}</p>
          <p><strong>Contract:</strong> {payment.contract_id || 'N/A'}</p>
          <p><strong>Expires at:</strong> {payment.expires_at ? new Date(payment.expires_at).toLocaleString() : 'N/A'}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/admin/payments" className="px-5 py-3 rounded-2xl bg-slate-700 text-white text-center">Back to Payments</Link>
          {payment.square_url ? (
            <a href={payment.square_url} target="_blank" rel="noreferrer" className="px-5 py-3 rounded-2xl bg-green-600 text-white text-center">Open payment link</a>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">{renderStatus()}</div>
    </main>
  )
}
