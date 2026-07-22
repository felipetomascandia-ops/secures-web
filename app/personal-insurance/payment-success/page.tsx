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
  const scheduleId = searchParams.get('scheduleId')
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
      if (!paymentId && !scheduleId) {
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (paymentId) params.set('paymentId', paymentId)
      if (scheduleId) params.set('scheduleId', scheduleId)

      try {
        // Poll for payment status EVERY 2 seconds
        const interval = setInterval(async () => {
          try {
            const res = await fetch(`/api/admin/payments/success-status?${params.toString()}`)
            const data = await res.json()

            // The endpoint returns { success, payment: { status, contract_id }, redirectToClient?, clientRedirectUrl? }
            const status = data?.payment?.status || data?.status || null
            const paymentContractId = data?.payment?.contract_id || null

            console.log('Payment/Schedule status check:', { status, contractId: paymentContractId, redirectToClient: data.redirectToClient, data })

            // If the API says this is a client payment and provides a redirect URL, follow it
            if (data.redirectToClient && data.clientRedirectUrl) {
              console.log('Redirecting to client success page:', data.clientRedirectUrl)
              window.location.href = data.clientRedirectUrl
              return
            }

            if (data.success && (status === 'complete' || status === 'completed' || status === 'active')) {
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
            console.error('Error checking payment/schedule status:', error)
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
  }, [paymentId, scheduleId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-600 border-t-transparent mb-4"></div>
          <p className="text-slate-300 text-lg">Verifying your payment...</p>
          <p className="text-slate-500 text-sm mt-2">Please do not close this window</p>
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
            <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
            <p className="text-slate-300 mb-6">
              Your payment has been processed successfully. Your insurance coverage is now active.
            </p>
            
            {/* Contract Document */}
            {contractId && (
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-4">📄 Contract</h3>
                <a
                  href={`/api/contracts/${contractId}/document`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  📋 View / Download Contract {contractNumber ? `#${contractNumber}` : ''}
                </a>
              </div>
            )}

            {/* Certificates */}
            {certificates.length > 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-4">🎖️ Your Insurance Certificates</h3>
                <div className="space-y-3">
                  {certificates.map((cert) => {
                    const coverage = coverages.find(c => c.id === cert.coverage_id)
                    const insuranceLabel = coverage?.insurance_type || cert.certificate_type
                    const typeLabels: Record<string, string> = {
                      'personal-auto': 'Personal Auto',
                      'motorcycle': 'Motorcycle',
                      'pet': 'Pet',
                      'mobile-device': 'Mobile Device',
                      'event': 'Event',
                      'bicycle': 'Bicycle',
                      'general-liability': 'General Liability',
                      'commercial-auto': 'Commercial Auto',
                      'commercial-property': 'Commercial Property',
                      'workers-comp': "Workers' Compensation",
                    }
                    const displayName = typeLabels[insuranceLabel] || insuranceLabel || 'Insurance'
                    
                    return (
                      <div key={cert.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🎖️</span>
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{displayName}</p>
                            {coverage?.policy_number && (
                              <p className="text-xs text-slate-400">Policy: {coverage.policy_number}</p>
                            )}
                          </div>
                        </div>
                        <a
                          href={`/api/contracts/${contractId}/certificate/${cert.coverage_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          📥 Download
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
                <h3 className="text-lg font-semibold text-white mb-4">💳 Payment History</h3>
                <div className="space-y-2">
                  {payments.map((pmt, idx) => (
                    <div key={idx} className="flex justify-between items-center rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                      <div>
                        <p className="text-sm font-medium text-white">{pmt.description || 'Payment'}</p>
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
              <h3 className="text-lg font-semibold text-white mb-4">Next Steps:</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>You will receive an email with your signed contract and insurance certificates.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Your insurance policy is active and starts today.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>You can access all your documents and payments in &quot;My Panel&quot;.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-400 mr-2">✓</span>
                  <span>Your first monthly payment will be charged in 30 days.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/my-panel"
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500 text-center"
              >
                Go to My Panel
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 text-center"
              >
                Back to Home
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
            <h1 className="text-3xl font-bold text-white mb-4">Payment Not Completed</h1>
            <p className="text-slate-300 mb-6">
              There was a problem with your payment. Please try again or contact our support team.
            </p>
            
            <div className="flex flex-col gap-3">
              <Link
                href="/my-panel"
                className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500 text-center"
              >
                Try Again
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 text-center"
              >
                Back to Home
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
          <h1 className="text-3xl font-bold text-white mb-4">Verifying Payment</h1>
          <p className="text-slate-300 mb-6">
            Your payment is being processed. This may take a few minutes. Please check your email for confirmation.
          </p>
          
          <div className="flex flex-col gap-3">
            <Link
              href="/my-panel"
              className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500 text-center"
            >
              Go to My Panel
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:bg-slate-800 text-center"
            >
              Back to Home
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
          <p className="text-slate-300 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}