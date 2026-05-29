'use client'
import { useState } from 'react'

const C = {
  overlay: 'rgba(58,32,20,0.55)',
  card: '#fbeac4',
  border: '#3a2014',
  text: '#3a2014',
  input: '#fff7e3',
  btn: '#f4c95a',
  muted: 'rgba(58,32,20,0.55)',
}

export default function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || status === 'loading') return
    setStatus('loading')
    setError(null)

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao criar sala')
      setStatus('idle')
      return
    }

    onCreated(data)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: C.overlay,
        display: 'grid', placeItems: 'center', zIndex: 50,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: C.card, border: `4px solid ${C.border}`,
          borderRadius: 18, padding: '28px 32px', width: 'min(400px, 92vw)',
          boxShadow: '0 16px 0 -6px #b73a2b, 0 24px 30px rgba(58,34,24,0.25)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Nova sala</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}
          >
            ✕
          </button>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>Nome *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Sala de reuniões"
            autoFocus
            maxLength={48}
            required
            style={{
              fontFamily: 'inherit', fontSize: 15, padding: '10px 12px',
              borderRadius: 10, border: `2px solid ${C.border}`,
              background: C.input, color: C.text, outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>Descrição</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
            maxLength={120}
            style={{
              fontFamily: 'inherit', fontSize: 14, padding: '10px 12px',
              borderRadius: 10, border: `2px solid ${C.border}`,
              background: C.input, color: C.text, outline: 'none',
            }}
          />
        </label>

        {error && (
          <div style={{ background: C.border, color: '#ffd2c2', borderRadius: 10, padding: '10px 12px', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
            padding: '12px 18px', borderRadius: 12, border: `3px solid ${C.border}`,
            background: status === 'loading' ? '#d6b985' : C.btn, color: C.text,
            cursor: status === 'loading' ? 'wait' : 'pointer',
            boxShadow: `0 4px 0 ${C.border}`,
            transform: status === 'loading' ? 'translateY(2px)' : 'none',
          }}
        >
          {status === 'loading' ? 'Criando…' : 'Criar sala'}
        </button>
      </form>
    </div>
  )
}
