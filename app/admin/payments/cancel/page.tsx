"use client"

import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/20 bg-slate-900/80 p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-red-300">Payment Canceled</h1>
        <p className="mt-4 text-slate-400">It looks like the payment was canceled or not completed. If you want to try again, return to the admin payments page.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link href="/admin/payments" className="px-5 py-3 rounded-2xl bg-slate-700 text-white text-center">Back to Payments</Link>
        </div>
      </div>
    </main>
  )
}
