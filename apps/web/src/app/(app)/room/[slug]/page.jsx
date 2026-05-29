import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateLiveKitToken } from '@/lib/livekit'
import WorldLoader from './WorldLoader'

export default async function RoomPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verifica acesso — RLS na tabela rooms só retorna salas onde o usuário é membro
  const { data: room } = await supabase
    .from('rooms')
    .select('id, slug, name')
    .eq('slug', slug)
    .single()

  if (!room) notFound()

  const { data: membership } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, color')
    .eq('id', user.id)
    .single()

  const livekitToken = await generateLiveKitToken({
    roomName: slug,
    identity: user.id,
    name: profile?.display_name ?? user.email,
  })

  return (
    <WorldLoader
      room={slug}
      roomName={room.name}
      user={{
        id: user.id,
        name: profile?.display_name ?? user.email,
        color: profile?.color ?? '#f4c95a',
      }}
      livekitUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      livekitToken={livekitToken}
      wsUrl={process.env.NEXT_PUBLIC_WS_URL}
    />
  )
}
