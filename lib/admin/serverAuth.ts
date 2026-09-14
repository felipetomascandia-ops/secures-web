import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import supabaseAdmin from '@/lib/supabaseAdmin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function getServerCurrentUser() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.log('serverAuth: Missing Supabase URL or ANON Key')
    return null
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Server route handler – no need to set cookies back
      },
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })

  try {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      console.log('serverAuth: Current user ID:', data.user.id)
    }
    return data.user ?? null
  } catch (err) {
    console.error('serverAuth: failed to get user from session', err)
    return null
  }
}

export async function isServerAdmin(): Promise<boolean> {
  const user = await getServerCurrentUser()
  if (!user) {
    console.log('isServerAdmin: No current user found.')
    return false
  }

  console.log('isServerAdmin: Checking admin status for user ID:', user.id)

  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('serverAuth: admin check failed', error)
    return false
  }

  console.log('isServerAdmin: Admin check result for user ID', user.id, ':', Boolean(data))
  return Boolean(data)
}

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient<Database>(url, key)
}
