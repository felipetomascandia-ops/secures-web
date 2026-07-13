'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getAuthRedirectUrl } from '@/lib/authRedirect'
import type { User, Session } from '@supabase/supabase-js'

interface SupabaseContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleCallbackRedirect = () => {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      const isLocalCallback = currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')
      const hasAuthHash = currentUrl.includes('access_token') || currentUrl.includes('error=') || currentUrl.includes('code=')

      if (isLocalCallback && hasAuthHash) {
        window.location.replace(getAuthRedirectUrl('/profile'))
        return true
      }

      return false
    }

    if (handleCallbackRedirect()) {
      return
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl('/profile'),
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <SupabaseContext.Provider value={{ user, session, isLoading, signInWithGoogle, signOut }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
