import { useState } from 'react'
import { startAudio, translateMediaError } from './audio'

function sanitizeRoom(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
}

export default function EntryGate({ onEnter }) {
  const [room, setRoom] = useState('lobby')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'requesting') return
    setStatus('requesting')
    setError(null)
    try {
      await startAudio()
      onEnter({ room: sanitizeRoom(room) || 'lobby' })
    } catch (err) {
      setError(translateMediaError(err))
      setStatus('idle')
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        color: '#3a2014',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: '#fbeac4',
          border: '4px solid #3a2014',
          borderRadius: 18,
          padding: '28px 32px',
          width: 'min(380px, 90vw)',
          boxShadow: '0 18px 0 -8px #b73a2b, 0 24px 30px rgba(58, 34, 24, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            letterSpacing: -0.5,
            textAlign: 'center',
          }}
        >
          Meu Gather
        </h1>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.75, textAlign: 'center' }}>
          Hangout social com voz proximal.
        </p>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>Sala</span>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="lobby"
            autoFocus
            maxLength={32}
            style={{
              fontFamily: 'inherit',
              fontSize: 15,
              padding: '10px 12px',
              borderRadius: 10,
              border: '2px solid #3a2014',
              background: '#fff7e3',
              color: 'inherit',
              outline: 'none',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={status === 'requesting'}
          style={{
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: 0.3,
            padding: '14px 18px',
            borderRadius: 12,
            border: '3px solid #3a2014',
            background: status === 'requesting' ? '#d6b985' : '#f4c95a',
            color: '#3a2014',
            cursor: status === 'requesting' ? 'wait' : 'pointer',
            boxShadow: '0 5px 0 #3a2014',
            transform: status === 'requesting' ? 'translateY(2px)' : 'none',
            transition: 'transform 120ms, background 120ms',
          }}
        >
          {status === 'requesting' ? 'Pedindo microfone…' : 'Entrar'}
        </button>

        <p style={{ margin: 0, fontSize: 11, opacity: 0.7, textAlign: 'center' }}>
          Ao entrar, o navegador vai pedir acesso ao microfone.
        </p>

        {error && (
          <div
            style={{
              background: '#3a2014',
              color: '#ffd2c2',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </form>
    </div>
  )
}
