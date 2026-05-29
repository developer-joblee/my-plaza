import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'sala'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabase
    .from('room_members')
    .select('role, rooms(id, slug, name, description, created_at)')
    .eq('user_id', user.id)

  return NextResponse.json(data ?? [])
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { name, description } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const baseSlug = slugify(name)

  const { data: existing } = await admin.from('rooms').select('id').eq('slug', baseSlug).maybeSingle()
  const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug

  // Admin para escrita — authorization já verificada acima (user autenticado)
  const { data: room, error } = await admin
    .from('rooms')
    .insert({ name: name.trim(), description: description?.trim() || null, slug, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await admin.from('room_members').insert({ room_id: room.id, user_id: user.id, role: 'owner' })

  return NextResponse.json(room, { status: 201 })
}
