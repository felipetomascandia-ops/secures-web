'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId')
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentId) {
        setLoading(false)
        return
      }

      try {
        // Poll for payment status
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`/api/payments/success-status?paymentId=${paymentId}`)
            const data = await res.json()
            
            if (data.success && data.status === 'completed') {
              setPaymentStatus('completed')
              clearInterval(interval)
              setLoading(false)
            } else if (data.status === 'failed') {
              setPaymentStatus('failed')
              clearInterval(interval)
              setLoading(false)
            }
          } catch (error) {
            console.error('Error checking payment status:', error)
          }
        }, 2000)

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(interval)
          setLoading(false)
        }, 5 * 60 * 1000)
      } catch (error) {
        console.error('Error:', error)
        setLoading(false)
      }
    }

    checkPaymentStatus()
  }, [paymentId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-600 border-t-transparent mb-4"></div>
          <p className="text-slate-300 text-lg">Verificando tu pago...</p>
          <p className="text-slate-500 text-sm mt-2">Por favor no cierres esta ventana</p>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'completed') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full">
          <div className="rounded-3xl border border-emerald-700 bg-slate-900/70 p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-white mb-4">¡Pago Exitoso!</h1>
            <p className="text-slate-300 mb-6">
              Tu pago inicial ha sido procesado correctamente. Tu cobertura de seguro está ahora activa.
            </p>
            
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold text-white mb-4">Próximos Pasos:</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Recibirás un correo electrónico con tu contrato firmado y documentos oficiales.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Tu póliza de seguro está activa y comienza hoy.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Puedes acceder a todos tus documentos en "Mi Panel".</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Tu primer pago mensual será cobrado en 30 días.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/my-panel"
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500 text-center"
              >
                Ir a Mi Panel
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 text-center"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full">
          <div className="rounded-3xl border border-red-700 bg-slate-900/70 p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-white mb-4">Pago No Completado</h1>
            <p className="text-slate-300 mb-6">
              Hubo un problema con tu pago. Por favor intenta de nuevo o contacta a nuestro equipo de soporte.
            </p>
            
            <div className="flex flex-col gap-3">
              <Link
                href="/my-panel"
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500 text-center"
              >
                Intentar de Nuevo
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 text-center"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Timeout or unknown status
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <div className="rounded-3xl border border-amber-700 bg-slate-900/70 p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-3xl font-bold text-white mb-4">Verificando Pago</h1>
          <p className="text-slate-300 mb-6">
            Tu pago está siendo procesado. Esto puede tomar unos minutos. Por favor revisa tu correo electrónico para confirmación.
          </p>
          
          <div className="flex flex-col gap-3">
            <Link
              href="/my-panel"
              className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500 text-center"
            >
              Ir a Mi Panel
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 text-center"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}