'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CreateRoomModal from './CreateRoomModal'
import MembersModal from './MembersModal'
import { createClient } from '@/lib/supabase/client'

const C = {
  bg: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)',
  card: '#fbeac4',
  cardHover: '#fff3d6',
  border: '#3a2014',
  text: '#3a2014',
  muted: 'rgba(58,32,20,0.55)',
  btn: '#f4c95a',
  btnDanger: '#3a2014',
}

function RoomCard({ room, onClick, onManage }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? C.cardHover : C.card,
        border: `3px solid ${C.border}`,
        borderRadius: 14,
        padding: '18px 20px',
        cursor: 'pointer',
        boxShadow: hover ? '0 6px 0 #3a2014' : '0 4px 0 #3a2014',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'all 120ms',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
      onClick={onClick}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: '#3a2014', display: 'grid', placeItems: 'center',
          color: '#fbe6c2', fontSize: 20, flexShrink: 0,
        }}
      >
        ☕
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{room.name}</div>
        {room.description && (
          <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.description}
          </div>
        )}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          {room.userRole === 'owner' ? 'Dono' : 'Membro'} · /{room.slug}
        </div>
      </div>
      {room.userRole === 'owner' && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onManage() }}
          style={{
            padding: '6px 10px', borderRadius: 8, border: `2px solid ${C.border}`,
            background: 'transparent', color: C.text, fontSize: 12, cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600,
          }}
          title="Gerenciar membros"
        >
          ⚙ Membros
        </button>
      )}
    </div>
  )
}

export default function RoomList({ rooms, user }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [managingRoom, setManagingRoom] = useState(null)
  const [localRooms, setLocalRooms] = useState(rooms)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleRoomCreated = (room) => {
    setLocalRooms((prev) => [...prev, { ...room, userRole: 'owner' }])
    setShowCreate(false)
    router.push(`/room/${room.slug}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `3px solid ${C.border}`,
          background: C.card, boxShadow: '0 3px 0 #3a2014',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: user.color ?? '#f4c95a',
              border: `2px solid ${C.border}`, flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{user.display_name ?? user.email}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{user.email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
              padding: '8px 16px', borderRadius: 10, border: `2px solid ${C.border}`,
              background: C.btn, color: C.text, cursor: 'pointer', boxShadow: `0 3px 0 ${C.border}`,
            }}
          >
            + Nova sala
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
              padding: '8px 16px', borderRadius: 10, border: `2px solid ${C.border}`,
              background: 'transparent', color: C.text, cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Suas salas</h2>

        {localRooms.length === 0 ? (
          <div
            style={{
              background: C.card, border: `3px dashed ${C.border}`, borderRadius: 14,
              padding: '40px 24px', textAlign: 'center', color: C.muted,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>☕</div>
            <p style={{ margin: 0, fontSize: 15 }}>Nenhuma sala ainda.</p>
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              Crie a primeira sala ou peça para ser convidado para uma existente.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {localRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => router.push(`/room/${room.slug}`)}
                onManage={() => setManagingRoom(room)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={handleRoomCreated}
        />
      )}

      {managingRoom && (
        <MembersModal
          room={managingRoom}
          onClose={() => setManagingRoom(null)}
        />
      )}
    </div>
  )
}
