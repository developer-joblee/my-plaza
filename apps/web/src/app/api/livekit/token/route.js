import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateLiveKitToken } from '@/lib/livekit'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const room = searchParams.get('room')
  if (!room) return NextResponse.json({ error: 'room obrigatório' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()

  const token = await generateLiveKitToken({
    roomName: room,
    identity: user.id,
    name: profile?.display_name ?? user.email,
  })

  return NextResponse.json({ token })
}
