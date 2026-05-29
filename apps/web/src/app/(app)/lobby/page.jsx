import { createClient } from '@/lib/supabase/server'
import RoomList from '@/components/lobby/RoomList'

export default async function LobbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('room_members').select('role, rooms(id, slug, name, description, created_at)').eq('user_id', user.id),
  ])

  const rooms = (memberships || []).map((m) => ({ ...m.rooms, userRole: m.role }))

  return (
    <RoomList
      rooms={rooms}
      user={{ id: user.id, email: user.email, ...profile }}
    />
  )
}
