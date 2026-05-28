import { createClient } from '@supabase/supabase-js'

/**
 * Admin client que bypassa o RLS (usa service role key).
 * Use APENAS em Server Components e Route Handlers — nunca no cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[createAdminClient] SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não definidos')
    throw new Error('Admin client: variáveis de ambiente ausentes')
  }
  return createClient(url, key)
}
