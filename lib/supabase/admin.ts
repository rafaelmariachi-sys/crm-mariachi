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

  // Valida que a chave é uma JWT com role=service_role (e não a anon key por engano)
  try {
    const parts = key.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
      if (payload.role && payload.role !== 'service_role') {
        console.error(
          `[createAdminClient] ATENÇÃO: a chave configurada tem role="${payload.role}" (esperado "service_role"). ` +
          'Provavelmente a ANON KEY foi colocada no lugar da SERVICE ROLE KEY no Vercel.'
        )
        throw new Error(`Admin client: chave com role "${payload.role}", esperado "service_role"`)
      }
    }
  } catch (e: any) {
    // Re-lança erros de validação de role; ignora falhas de decode JWT
    if (e.message?.startsWith('Admin client:')) throw e
    console.warn('[createAdminClient] Não foi possível decodificar a chave JWT:', e.message)
  }

  return createClient(url, key)
}
