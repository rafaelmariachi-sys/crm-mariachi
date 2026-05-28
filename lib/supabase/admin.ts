import { createClient } from '@supabase/supabase-js'

/**
 * Admin client que bypassa o RLS (usa service role key).
 * Use APENAS em Server Components e Route Handlers — nunca no cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
