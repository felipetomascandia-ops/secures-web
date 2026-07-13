/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useRef, useState } from 'react'

type TokenizeResult = {
  status: string
  token?: string
  errors?: any[]
}

declare global {
  interface Window {
    Square?: any
  }
}

const getSdkUrl = () => {
  const env = process.env.NEXT_PUBLIC_SQUARE_ENV || 'sandbox'
  return env === 'production' ? 'https://web.squarecdn.com/v1/square.js' : 'https://sandbox.web.squarecdn.com/v1/square.js'
}

export default function PaymentForm() {
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID

  const [loadingSdk, setLoadingSdk] = useState(true)
  const [cardReady, setCardReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('0.00')

  const paymentsRef = useRef<any>(null)
  const cardRef = useRef<any>(null)

  useEffect(() => {
    if (!appId || !locationId) {
      setError('Faltan NEXT_PUBLIC_SQUARE_APP_ID o NEXT_PUBLIC_SQUARE_LOCATION_ID en el entorno.')
      setLoadingSdk(false)
      return
    }

    const src = getSdkUrl()
    if (document.querySelector(`script[src="${src}"]`)) {
      initSquare().catch((e) => setError(String(e)))
      return
    }

    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => initSquare().catch((e) => setError(String(e)))
    s.onerror = () => setError('No se pudo cargar el SDK de Square')
    document.head.appendChild(s)
  }, [])

  const initSquare = async () => {
    setLoadingSdk(true)
    if (!window.Square || !window.Square.payments) {
      throw new Error('Square Web Payments SDK no está disponible en window.Square')
    }

    paymentsRef.current = window.Square.payments(appId, locationId)
    const card = await paymentsRef.current.card()
    await card.attach('#card-container')
    cardRef.current = card
    setCardReady(true)
    setLoadingSdk(false)
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!cardRef.current) return setError('Formulario de tarjeta no inicializado')

    const amountNumber = Number(amount)
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return setError('Ingrese un monto válido mayor que 0')

    setLoading(true)
    try {
      const tokenizeResult: TokenizeResult = await cardRef.current.tokenize()
      if (tokenizeResult.status !== 'OK') {
        const msg = tokenizeResult.errors?.map((x: any) => x?.detail || x?.message).join(' — ') || 'Error al tokenizar la tarjeta'
        throw new Error(msg)
      }

      const nonce = tokenizeResult.token

      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, name, email, phone, amount: amountNumber, currency: 'USD' }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error procesando el pago')
      }

      setSuccess(data)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow">
      <h2 className="text-xl font-semibold mb-4">Pagar con tarjeta</h2>

      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-600">Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Teléfono</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Total a pagar (USD)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-2">Detalle de la tarjeta</label>
          <div id="card-container" className="p-4 border rounded-md min-h-[60px]"></div>
        </div>

        {error && <div className="text-red-600">{error}</div>}
        {success && (
          <div className="text-green-600">
            Pago exitoso — ID: {success.paymentId}
            {success.receiptUrl && (
              <div>
                <a className="underline text-blue-600" href={success.receiptUrl} target="_blank" rel="noreferrer">Ver recibo</a>
              </div>
            )}
          </div>
        )}

        <button disabled={loading || loadingSdk} type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md disabled:opacity-60">
          {loading ? 'Procesando...' : 'Pay Now'}
        </button>
      </form>
    </div>
  )
}
