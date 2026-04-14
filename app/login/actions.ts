'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  console.log('[LOGIN] error:', error)
  console.log('[LOGIN] user:', data?.user?.email)

  if (error) {
    return { error: error.message }
  }

  const user = data.user
  if (!user) return { error: 'Usuário não encontrado' }

  const { data: brandUser, error: brandError } = await supabase
    .from('brand_users')
    .select('brand_id')
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('[LOGIN] brandUser:', brandUser, 'brandError:', brandError)
  console.log('[LOGIN] redirecting to:', brandUser ? '/brand/dashboard' : '/admin/dashboard')

  redirect(brandUser ? '/brand/dashboard' : '/admin/dashboard')
}
