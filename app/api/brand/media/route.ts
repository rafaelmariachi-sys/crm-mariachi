import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  // 1. Verifica autenticação
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Verifica que é um brand user e pega os brand_ids
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id, brands(id, name)')
    .eq('user_id', user.id)

  if (!brandUsers?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const brandIds = brandUsers.map((bu: any) => bu.brands.id)

  // 3. Usa admin para bypassar RLS e buscar TODA a mídia da marca + global (brand_id = null)
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('brand_media')
    .select('*, brands(name), venues(id, name, neighborhood)')
    .or(`brand_id.in.(${brandIds.join(',')}),brand_id.is.null`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 4. Gera signed URLs server-side via admin (bypassa RLS do storage também)
  const withUrls = await Promise.all(
    (data || []).map(async (item: any) => {
      const { data: u } = await admin.storage
        .from('brand-media')
        .createSignedUrl(item.storage_path, 3600)
      return { ...item, signedUrl: u?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ media: withUrls })
}
