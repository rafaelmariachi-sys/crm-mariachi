import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET  → retorna todos os place_ids já visitados
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('route_visits')
    .select('place_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ids: (data ?? []).map((r: any) => r.place_id) })
}

// POST → marca um lugar como visitado
export async function POST(req: NextRequest) {
  const { place_id, place_name, address, region_key } = await req.json()
  if (!place_id) return NextResponse.json({ error: 'place_id obrigatório' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('route_visits')
    .upsert({ place_id, place_name, address, region_key }, { onConflict: 'place_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE → remove marca de visitado
export async function DELETE(req: NextRequest) {
  const place_id = req.nextUrl.searchParams.get('place_id')
  if (!place_id) return NextResponse.json({ error: 'place_id obrigatório' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('route_visits').delete().eq('place_id', place_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
