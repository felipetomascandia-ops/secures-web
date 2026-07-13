/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/providers/SupabaseProvider'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { signInWithGoogle } = useSupabase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-white">OLIMPO</span>
            <span className="text-slate-400 block text-sm">Coverage Group</span>
          </div>
        </Link>

        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
          <p className="text-slate-400 mb-8">Enter your credentials to continue</p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
                required
              />
              <div className="text-right text-sm mt-2">
                <Link href="/login/forgot-password" className="font-medium text-blue-400 hover:text-blue-300">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-800/50 text-slate-400">or continue with</span>
            </div>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-3 px-4 rounded-xl font-semibold transition-all shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.564 12.256c0-.78-.07-1.53-.2-2.256H12v4.284h5.916a5.04 5.04 0 01-2.208 3.312v2.76h3.576c2.09-1.924 3.28-4.752 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.976 0 5.46-.984 7.284-2.664l-3.576-2.76c-.984.66-2.232 1.06-3.708 1.06-2.868 0-5.292-1.932-6.168-4.536H2.184v2.844C3.996 20.532 7.704 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.832 14.1c-.396-1.188-.624-2.472-.624-3.804s.228-2.616.624-3.804V3.648H2.184C.78 6.432 0 9.132 0 12s.78 5.568 2.184 8.352l3.648-2.844z"
              />
              <path
                fill="#EA4335"
                d="M12 4.752c1.632 0 3.096.564 4.236 1.668l3.168-3.168C17.448 1.392 14.976 0 12 0 7.704 0 3.996 2.472 2.184 6.348l3.648 2.844c.876-2.604 3.3-4.44 6.168-4.44z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="text-center text-slate-400 mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
