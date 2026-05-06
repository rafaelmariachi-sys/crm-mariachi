import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 1. Verifica autenticação
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Verifica que é um brand user
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id')
    .eq('user_id', user.id)
  if (!brandUsers?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 3. Lê parâmetros de data
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  if (!start || !end) return NextResponse.json({ error: 'Missing start/end params' }, { status: 400 })

  // 4. Usa service role para bypassar RLS e buscar TODAS as visitas do período
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: visits, error } = await admin
    .from('visits')
    .select('id, visited_at, notes, venues(name, neighborhood, city, type)')
    .gte('visited_at', start + 'T00:00:00')
    .lte('visited_at', end + 'T23:59:59')
    .order('visited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ visits })
}
