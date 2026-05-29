'use client'
import { useState, useEffect } from 'react'

const C = {
  overlay: 'rgba(58,32,20,0.55)',
  card: '#fbeac4',
  border: '#3a2014',
  text: '#3a2014',
  input: '#fff7e3',
  btn: '#f4c95a',
  muted: 'rgba(58,32,20,0.55)',
  danger: '#b73a2b',
}

export default function MembersModal({ room, onClose }) {
  const [members, setMembers] = useState([])
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetch(`/api/rooms/${room.slug}/members`)
      .then((r) => r.json())
      .then(setMembers)
      .catch(() => {})
  }, [room.slug])

  const invite = async (e) => {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')
    setError(null)
    setSuccess(null)

    const res = await fetch(`/api/rooms/${room.slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
    } else {
      setSuccess(`${email} adicionado com sucesso.`)
      setEmail('')
      fetch(`/api/rooms/${room.slug}/members`).then((r) => r.json()).then(setMembers)
    }
    setStatus('idle')
  }

  const remove = async (userId) => {
    if (!confirm('Remover este membro?')) return
    await fetch(`/api/rooms/${room.slug}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setMembers((prev) => prev.filter((m) => m.profiles?.id !== userId))
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: C.overlay, display: 'grid', placeItems: 'center', zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: C.card, border: `4px solid ${C.border}`, borderRadius: 18,
          padding: '28px 32px', width: 'min(460px, 94vw)', maxHeight: '80vh',
          overflow: 'auto', boxShadow: '0 16px 0 -6px #b73a2b, 0 24px 30px rgba(58,34,24,0.25)',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Membros · {room.name}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}>✕</button>
        </div>

        <form onSubmit={invite} style={{ display: 'flex', gap: 8 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@empresa.com"
            type="email"
            required
            style={{
              flex: 1, fontFamily: 'inherit', fontSize: 14, padding: '9px 12px',
              borderRadius: 10, border: `2px solid ${C.border}`,
              background: C.input, color: C.text, outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
              padding: '9px 16px', borderRadius: 10, border: `2px solid ${C.border}`,
              background: C.btn, color: C.text, cursor: status === 'loading' ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {status === 'loading' ? '…' : 'Convidar'}
          </button>
        </form>

        {error && <div style={{ background: C.border, color: '#ffd2c2', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#5ac08a22', border: '2px solid #5ac08a', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2a6a3a' }}>{success}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map((m) => (
            <div
              key={m.profiles?.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, background: '#fff7e3',
                border: `2px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: m.profiles?.color ?? '#f4c95a',
                  border: `2px solid ${C.border}`,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.profiles?.display_name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{m.profiles?.email} · {m.role}</div>
              </div>
              {m.role !== 'owner' && (
                <button
                  type="button"
                  onClick={() => remove(m.profiles?.id)}
                  style={{
                    background: 'none', border: `2px solid ${C.danger}`, borderRadius: 8,
                    color: C.danger, cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontFamily: 'inherit',
                  }}
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
