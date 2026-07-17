'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface CertificateInfo {
  id: string
  coverage_id: string
  certificate_type: string
  certificate_url: string
}

interface CoverageInfo {
  id: string
  insurance_type: string
  policy_number: string | null
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId')
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [contractId, setContractId] = useState<string | null>(null)
  const [contractNumber, setContractNumber] = useState<string | null>(null)
  const [certificates, setCertificates] = useState<CertificateInfo[]>([])
  const [coverages, setCoverages] = useState<CoverageInfo[]>([])
  const [payments, setPayments] = useState<Array<{
    id: string
    description?: string | null
    amount: number
    status: string
    created_at: string
  }>>([])
  const [error, setError] = useState<string | null>(null)

  const loadAllData = async (contractId: string) => {
    try {
      // Load certificates
      const certRes = await fetch(`/api/contracts/${contractId}/certificates`)
      if (certRes.ok) {
        const certData = await certRes.json()
        if (certData.success) {
          setCertificates(certData.certificates || [])
          setCoverages(certData.coverages || [])
          setContractNumber(certData.contractNumber || null)
        }
      }

      // Load all payments for this contract
      const paymentsRes = await fetch(`/api/contracts/${contractId}/payments`)
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        if (paymentsData.success) {
          setPayments(paymentsData.payments || [])
        }
      }
    } catch (err) {
      console.error('Error loading contract data:', err)
    }
  }

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!paymentId) {
        setLoading(false)
        return
      }

      try {
        // Poll for payment status EVERY 2 seconds
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`/api/admin/payments/success-status?paymentId=${paymentId}`)
            const data = await res.json()

            // The endpoint returns { success, payment: { status, contract_id }, redirectToClient?, clientRedirectUrl? }
            const status = data?.payment?.status || data?.status || null
            const paymentContractId = data?.payment?.contract_id || null

            console.log('Payment status check:', { status, contractId: paymentContractId, redirectToClient: data.redirectToClient, data })

            // If the API says this is a client payment and provides a redirect URL, follow it
            if (data.redirectToClient && data.clientRedirectUrl) {
              console.log('Redirecting to client success page:', data.clientRedirectUrl)
              window.location.href = data.clientRedirectUrl
              return
            }

            if (data.success && (status === 'completed' || status === 'active')) {
              setPaymentStatus('completed')
              clearInterval(interval)
              
              // If we have a contract_id, load ALL data (certificates, payments, etc.)
              if (paymentContractId) {
                setContractId(paymentContractId)
                await loadAllData(paymentContractId)
              }
              
              setLoading(false)
            } else if (status === 'failed' || status === 'canceled' || status === 'cancelled') {
              setPaymentStatus('failed')
              clearInterval(interval)
              setLoading(false)
            }
          } catch (error) {
            console.error('Error checking payment status:', error)
          }
        }, 2000)

        // Timeout after 5 minutes — allow more time for Square to process
        setTimeout(() => {
          clearInterval(interval)
          setLoading(false)
        }, 5 * 60 * 1000)
      } catch (error) {
        console.error('Error:', error)
        setError('Error verifying payment status')
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
              Tu pago ha sido procesado correctamente. Tu cobertura de seguro está ahora activa.
            </p>
            
            {/* Contract Document */}
            {contractId && (
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-4">📄 Contrato</h3>
                <a
                  href={`/api/contracts/${contractId}/document`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  📋 Ver / Descargar Contrato {contractNumber ? `#${contractNumber}` : ''}
                </a>
              </div>
            )}

            {/* Certificates */}
            {certificates.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-4">🎖️ Tus Certificados de Seguro</h3>
                <div className="space-y-3">
                  {certificates.map((cert) => {
                    const coverage = coverages.find(c => c.id === cert.coverage_id)
                    const insuranceLabel = coverage?.insurance_type || cert.certificate_type
                    const typeLabels: Record<string, string> = {
                      'personal-auto': 'Auto Personal',
                      'motorcycle': 'Motocicleta',
                      'pet': 'Mascotas',
                      'mobile-device': 'Dispositivo Móvil',
                      'event': 'Eventos',
                      'bicycle': 'Bicicleta',
                      'general-liability': 'Responsabilidad General',
                      'commercial-auto': 'Auto Comercial',
                      'commercial-property': 'Propiedad Comercial',
                      'workers-comp': 'Compensación Laboral',
                    }
                    const displayName = typeLabels[insuranceLabel] || insuranceLabel || 'Seguro'
                    
                    return (
                      <div key={cert.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🎖️</span>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{displayName}</p>
                            {coverage?.policy_number && (
                              <p className="text-xs text-slate-400">Póliza: {coverage.policy_number}</p>
                            )}
                          </div>
                        </div>
                        <a
                          href={`/api/contracts/${contractId}/certificate/${cert.coverage_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          📥 Descargar
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* All Payments */}
            {payments.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-4">💳 Historial de Pagos</h3>
                <div className="space-y-2">
                  {payments.map((pmt, idx) => (
                    <div key={idx} className="flex justify-between items-center rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                      <div>
                        <p className="text-sm font-medium text-white">{pmt.description || 'Pago'}</p>
                        <p className="text-xs text-slate-400">{new Date(pmt.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">${Number(pmt.amount).toFixed(2)}</p>
                        <p className="text-xs text-emerald-400">{pmt.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold text-white mb-4">Próximos Pasos:</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Recibirás un correo electrónico con tu contrato firmado y certificados de seguro.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Tu póliza de seguro está activa y comienza hoy.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Puedes acceder a todos tus documentos y pagos en &ldquo;Mi Panel&rdquo;.</span>
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-600 border-t-transparent mb-4"></div>
          <p className="text-slate-300 text-lg">Cargando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}