import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 1. Verifica autenticação
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Verifica que é admin (sem brand_users)
  const { data: brandUsers } = await supabase
    .from('brand_users').select('brand_id').eq('user_id', user.id).limit(1)
  if (brandUsers?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // 3. Parâmetros
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  if (!brandId || !start || !end) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // 4. Busca tudo via admin (bypassa RLS)
  const admin = createAdminClient()

  const [
    { data: visits, error: visitsErr },
    { data: allPositivations, error: posErr },
    { data: followups, error: fuErr },
  ] = await Promise.all([
    // Todas as visitas do período
    admin
      .from('visits')
      .select('id, visited_at, notes, venues(name, neighborhood, city, type)')
      .gte('visited_at', start + 'T00:00:00')
      .lte('visited_at', end + 'T23:59:59')
      .order('visited_at', { ascending: false }),

    // Todas as positivações da marca
    admin
      .from('positivations')
      .select('id, product_name, status, notes, positivated_at, created_at, venue_id, venues(name, neighborhood, city), visit_id, visits(venues(name, neighborhood, city))')
      .eq('brand_id', brandId)
      .order('positivated_at', { ascending: false, nullsFirst: false }),

    // Follow-ups da marca com due_date no mês
    admin
      .from('followups')
      .select('id, content, due_date, status, visits(venues(name, neighborhood, city))')
      .or(`brand_id.eq.${brandId},brand_id.is.null`)
      .gte('due_date', start)
      .lte('due_date', end)
      .order('due_date', { ascending: true }),
  ])

  if (visitsErr) return NextResponse.json({ error: visitsErr.message }, { status: 500 })
  if (posErr) return NextResponse.json({ error: posErr.message }, { status: 500 })
  if (fuErr) return NextResponse.json({ error: fuErr.message }, { status: 500 })

  return NextResponse.json({
    visits: visits ?? [],
    positivations: allPositivations ?? [],
    followups: followups ?? [],
  })
}
