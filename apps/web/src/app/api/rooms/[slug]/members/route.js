import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request, { params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Usa user session para checar acesso (RLS rooms_select garante que só membros veem a sala)
  const { data: room } = await supabase.from('rooms').select('id').eq('slug', slug).single()
  if (!room) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

  // Admin para listar todos os membros (room_members_select só retorna as próprias linhas)
  const admin = createAdminClient()
  const { data: members } = await admin
    .from('room_members')
    .select('role, profiles(id, display_name, color, email)')
    .eq('room_id', room.id)

  return NextResponse.json(members ?? [])
}

export async function POST(request, { params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { email } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Verifica se quem convida é dono
  const { data: room } = await admin.from('rooms').select('id').eq('slug', slug).single()
  if (!room) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

  const { data: myRole } = await admin
    .from('room_members')
    .select('role')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .single()

  if (myRole?.role !== 'owner') {
    return NextResponse.json({ error: 'Apenas o dono pode convidar membros' }, { status: 403 })
  }

  // Busca perfil pelo e-mail
  const { data: target } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (!target) {
    return NextResponse.json(
      { error: 'Usuário não encontrado. Ele precisa criar conta primeiro.' },
      { status: 404 },
    )
  }

  const { error } = await admin
    .from('room_members')
    .upsert({ room_id: room.id, user_id: target.id, role: 'member' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request, { params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { userId } = await request.json()
  const admin = createAdminClient()

  const { data: room } = await admin.from('rooms').select('id').eq('slug', slug).single()
  if (!room) return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })

  // Dono pode remover qualquer um; membros só podem sair (remover a si mesmos)
  const { data: myRole } = await admin
    .from('room_members').select('role').eq('room_id', room.id).eq('user_id', user.id).single()

  if (myRole?.role !== 'owner' && userId !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await admin.from('room_members').delete().eq('room_id', room.id).eq('user_id', userId)

  return NextResponse.json({ success: true })
}
