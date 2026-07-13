import { supabase } from '@/lib/supabase'

export async function isAdminUser(userId?: string | null) {
  if (!userId) return false

  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Admin check failed', error)
    return false
  }

  return Boolean(data)
}
