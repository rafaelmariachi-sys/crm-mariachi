import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verify that the requester is the admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verify the user is admin (not in brand_users)
  const { data: brandUser } = await supabase
    .from('brand_users')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (brandUser) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { email, password, brand_id } = await req.json()

  if (!email || !password || !brand_id) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Create auth user
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Link to brand
  const { error: linkError } = await adminClient
    .from('brand_users')
    .insert({ user_id: newUser.user.id, brand_id })

  if (linkError) {
    // Rollback: delete the created user
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
