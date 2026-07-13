'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/providers/SupabaseProvider'
import { isAdminUser } from '@/lib/admin/auth'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

type AdminShellProps = {
  children: React.ReactNode
}

export default function AdminShell({ children }: AdminShellProps) {
  const { user, isLoading } = useSupabase()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  useEffect(() => {
    let active = true

    const verifyAccess = async () => {
      if (isLoading) return

      if (!user?.id) {
        if (active) {
          setIsAdmin(false)
          setIsCheckingAdmin(false)
        }
        return
      }

      const admin = await isAdminUser(user.id)

      if (active) {
        setIsAdmin(admin)
        setIsCheckingAdmin(false)
      }
    }

    verifyAccess()

    return () => {
      active = false
    }
  }, [isLoading, user?.id])

  if (isCheckingAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-4 text-sm text-slate-300">
          Verifying admin access...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white">Access required</h2>
          <p className="mt-3 text-sm text-slate-400">
            Please sign in to continue to the admin area.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white">Access denied</h2>
          <p className="mt-3 text-sm text-slate-400">
            This area is restricted to administrator accounts.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Return home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1">
          <AdminHeader title="Admin Panel" description="Manage tickets, contracts, payments and customers from one professional workspace." />
          <main className="p-6 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
