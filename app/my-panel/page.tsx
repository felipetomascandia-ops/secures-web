'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/providers/SupabaseProvider'

type ContractRow = {
  id: string
  contract_number?: string | null
  client_company_name?: string | null
  client_name?: string | null
  status?: string | null
  total_premium?: number | null
  down_payment?: number | null
  monthly_payment?: number | null
  number_of_payments?: number | null
  created_at?: string | null
  signed_document_url?: string | null
  certificate_url?: string | null
  is_signed?: boolean | null
  client_signature?: string | null
  client_signature_date?: string | null
}

type ScheduleRow = {
  id: string
  contract_id: string
  label?: string | null
  amount?: number | null
  due_date?: string | null
  status?: string | null
  checkout_url?: string | null
}

type CoverageRow = {
  id: string
  contract_id: string
  insurance_type?: string | null
  policy_number?: string | null
  effective_date?: string | null
  expiration_date?: string | null
}

type CertificateRow = {
  id: string
  contract_id: string
  coverage_id?: string | null
  certificate_type?: string | null
  certificate_url?: string | null
}

export default function MyPanelPage() {
  const { user, isLoading } = useSupabase()
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [coverages, setCoverages] = useState<CoverageRow[]>([])
  const [certificates, setCertificates] = useState<CertificateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'contracts' | 'payments' | 'certificates'>('contracts')
  const [signingContractId, setSigningContractId] = useState<string | null>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const pos = 'touches' in e 
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: e.clientX - rect.left, y: e.clientY - rect.top }
    isDrawingRef.current = true
    lastPosRef.current = pos
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const pos = 'touches' in e 
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: e.clientX - rect.left, y: e.clientY - rect.top }

    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()

    lastPosRef.current = pos
    setSignatureData(canvas.toDataURL('image/png'))
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureData(null)
  }

  const saveSignature = async (contractId: string) => {
    if (!signatureData) return
    setSigning(true)
    try {
      const { data: { session } } = await import('@/lib/supabase').then((mod) => mod.supabase.auth.getSession())
      const accessToken = session?.access_token
      if (!accessToken) return

      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          signature: signatureData,
          signatureDate: new Date().toISOString().slice(0,10),
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save signature')

      // Reload contracts
      const loadRes = await fetch('/api/my-panel', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const loadJson = await loadRes.json()
      if (loadJson.success) {
        setContracts(loadJson.contracts || [])
      }

      setSigningContractId(null)
      setSignatureData(null)
    } catch (err) {
      console.error('save signature error:', err)
      alert('Failed to save signature. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        console.log('My Panel: No user')
        setLoading(false)
        return
      }

      console.log('My Panel: Loading data for user', user)

      try {
        const { data: { session } } = await import('@/lib/supabase').then((mod) => mod.supabase.auth.getSession())
        const accessToken = session?.access_token
        if (!accessToken) {
          console.log('My Panel: No access token')
          setLoading(false)
          return
        }

        console.log('My Panel: Fetching data from /api/my-panel')
        const res = await fetch('/api/my-panel', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        const json = await res.json().catch(() => ({}))
        console.log('My Panel: API response', json)

        if (!res.ok || !json.success) {
          console.error('my-panel load failed', json)
          setContracts([])
          setSchedules([])
          setCoverages([])
          setCertificates([])
          setLoading(false)
          return
        }

        setContracts((json.contracts as ContractRow[]) || [])
        setSchedules((json.schedules as ScheduleRow[]) || [])
        setCoverages((json.coverages as CoverageRow[]) || [])
        setCertificates((json.certificates as CertificateRow[]) || [])
        console.log('My Panel: Data loaded', {
          contracts: json.contracts,
          schedules: json.schedules,
          coverages: json.coverages,
          certificates: json.certificates
        })
      } catch (error) {
        console.error('my-panel load error', error)
        setContracts([])
        setSchedules([])
        setCoverages([])
        setCertificates([])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  const contractSchedules = useMemo(() => {
    const byContract = new Map<string, ScheduleRow[]>()
    schedules.forEach((schedule) => {
      const list = byContract.get(schedule.contract_id) || []
      list.push(schedule)
      byContract.set(schedule.contract_id, list)
    })
    return byContract
  }, [schedules])

  const contractCoverages = useMemo(() => {
    const byContract = new Map<string, CoverageRow[]>()
    coverages.forEach((coverage) => {
      const list = byContract.get(coverage.contract_id) || []
      list.push(coverage)
      byContract.set(coverage.contract_id, list)
    })
    return byContract
  }, [coverages])

  const contractCertificates = useMemo(() => {
    const byContract = new Map<string, CertificateRow[]>()
    certificates.forEach((cert) => {
      const list = byContract.get(cert.contract_id) || []
      list.push(cert)
      byContract.set(cert.contract_id, list)
    })
    return byContract
  }, [certificates])

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4">Loading your panel...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-20 text-center text-slate-200">
        <h1 className="text-3xl font-semibold">My Panel</h1>
        <p className="mt-3 text-slate-400">Please sign in to access your contracts and payments.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white">Sign in</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/30 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-400">My Panel</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Your contracts and payments</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Review your insurance agreements, keep track of pending payments, and download your documents from one place.</p>
          </div>
          <Link href="/" className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800">Back home</Link>
        </div>

        <div className="mb-8 flex flex-wrap gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          {[
            { key: 'contracts', label: 'Contracts' },
            { key: 'payments', label: 'Payments' },
            { key: 'certificates', label: 'Certificates' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'contracts' | 'payments' | 'certificates')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Active contracts</p>
            <p className="mt-3 text-3xl font-semibold text-white">{contracts.filter((contract) => contract.status !== 'cancelled').length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Pending payments</p>
            <p className="mt-3 text-3xl font-semibold text-white">{schedules.filter((schedule) => schedule.status === 'pending').length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm text-slate-400">Certificates available</p>
            <p className="mt-3 text-3xl font-semibold text-white">{certificates.length}</p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {activeTab === 'contracts' && (
            <>
              {contracts.filter((c) => !c.is_signed).length > 0 && (
                <div className="mb-6 rounded-2xl border border-amber-700 bg-amber-900/30 p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 text-2xl">⚠️</span>
                    <div>
                      <p className="text-amber-300 font-semibold">
                        You have {contracts.filter((c) => !c.is_signed).length} unsigned contract{contracts.filter((c) => !c.is_signed).length > 1 ? 's' : ''}
                      </p>
                      <p className="text-amber-200/80 text-sm mt-1">
                        Please sign them to make them valid. Unsigned contracts may be cancelled.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {contracts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center text-slate-400">
                  No contracts have been linked to your account yet.
                </div>
              ) : (
                contracts.map((contract) => (
                  <div key={contract.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">{contract.contract_number || 'Policy pending'}</p>
                          {!contract.is_signed ? (
                            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300">
                              Unsigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                              Signed ✓
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 text-xl font-semibold text-white">{contract.client_company_name || contract.client_name || 'Insurance contract'}</h2>
                        <p className="mt-2 text-sm text-slate-400">Status: <span className="font-semibold text-slate-200">{contract.status || 'pending'}</span></p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                        <div>Premium: ${Number(contract.total_premium || 0).toFixed(2)}</div>
                        <div>Down payment: ${Number(contract.down_payment || 0).toFixed(2)}</div>
                        <div>Monthly: ${Number(contract.monthly_payment || 0).toFixed(2)} for {contract.number_of_payments || 0} payments</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a href={`/api/contracts/${contract.id}/document`} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">
                        View contract
                      </a>
                      {contractCertificates.get(contract.id)?.map((cert, idx) => (
                        cert.coverage_id ? (
                          <a key={`${cert.id}-${idx}`} href={`/api/contracts/${cert.contract_id}/certificate/${cert.coverage_id}`} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
                            View {cert.certificate_type || 'insurance'} certificate
                          </a>
                        ) : null
                      )) || null}
                      {!contract.is_signed && (
                        <button
                          onClick={() => setSigningContractId(contract.id)}
                          className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                        >
                          Sign contract
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {signingContractId && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-2xl w-full p-6">
                <h2 className="text-2xl font-semibold text-white mb-4">Sign contract</h2>
                <p className="text-slate-400 mb-4">
                  Please draw your signature in the box below to confirm you agree to the contract terms.
                </p>
                <div className="border-2 border-slate-700 rounded-2xl bg-white mb-4">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setSigningContractId(null)
                      setSignatureData(null)
                      clearSignature()
                    }}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={clearSignature}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Clear signature
                  </button>
                  <button
                    onClick={() => saveSignature(signingContractId)}
                    disabled={!signatureData || signing}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signing ? 'Saving...' : 'Save and sign'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold text-white">Payment schedule</h2>
              <div className="mt-6 space-y-3">
                {schedules.length === 0 ? (
                  <p className="text-sm text-slate-500">No payments have been scheduled yet.</p>
                ) : (
                  schedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{schedule.label}</p>
                        <p className="text-xs text-slate-500">Due {schedule.due_date ? new Date(schedule.due_date).toLocaleDateString() : 'TBD'}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <p className="text-sm font-semibold text-slate-200">${Number(schedule.amount || 0).toFixed(2)}</p>
                        {schedule.checkout_url && schedule.status === 'pending' ? (
                          <a href={schedule.checkout_url} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500">Pay now</a>
                        ) : (
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{schedule.status}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold text-white">Certificates</h2>
              <div className="mt-6 space-y-3">
                {certificates.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
                    Certificates will appear here once the contract is linked to your account.
                  </div>
                ) : (
                  certificates.map((cert) => (
                    <div key={cert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{cert.certificate_type || 'Certificate'}</p>
                        <p className="text-xs text-slate-500">Contract: {contracts.find((c) => c.id === cert.contract_id)?.contract_number || 'N/A'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cert.coverage_id ? (
                          <a href={`/api/contracts/${cert.contract_id}/certificate/${cert.coverage_id}`} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500">View certificate</a>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
