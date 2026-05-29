'use client'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera, ContactShadows } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Scene, Lights } from './CoffeeShop'
import { LocalPlayer, RemotePlayer } from './Player'
import { useKeyboardControls } from '@/controls'
import { connect, disconnectWS, sendSit } from '@/lib/net'
import { connectVoice, setMicEnabled, disconnectVoice, onActiveSpeakersChanged } from '@/lib/livekit-voice'
import { useStore } from '@/store'

const CAM_OFFSET = new THREE.Vector3(16, 16, 16)
const _desired = new THREE.Vector3()
const _look = new THREE.Vector3()

function CameraFollow({ targetRef }) {
  const camRef = useRef()
  useFrame(() => {
    const t = targetRef.current
    const cam = camRef.current
    if (!t || !cam) return
    _desired.copy(t.position).add(CAM_OFFSET)
    cam.position.lerp(_desired, 0.12)
    _look.set(t.position.x, t.position.y + 1, t.position.z)
    cam.lookAt(_look)
  })
  return (
    <OrthographicCamera ref={camRef} makeDefault position={[16, 16, 16]} zoom={62} near={0.1} far={100} />
  )
}

function RemotePlayers() {
  const roster = useStore((s) => s.roster)
  return (
    <>
      {[...roster.values()].map((p) => (
        <RemotePlayer key={p.id} player={p} />
      ))}
    </>
  )
}

function toggleMic() {
  const next = !useStore.getState().micEnabled
  setMicEnabled(next)
  useStore.setState({ micEnabled: next })
}

function useSitToggle() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'KeyE' || e.repeat) return
      const { sitting, nearSeat, standingUp } = useStore.getState()
      if (standingUp) return
      if (sitting) {
        useStore.setState({ sitting: false, standingUp: true })
        sendSit(false)
      } else if (nearSeat) {
        useStore.setState({ sitting: true, standingUp: false })
        sendSit(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function SitPrompt() {
  const nearSeat = useStore((s) => s.nearSeat)
  const sitting = useStore((s) => s.sitting)
  if (!sitting && !nearSeat) return null
  return (
    <div
      style={{
        position: 'absolute', left: '50%', bottom: 80, transform: 'translateX(-50%)',
        padding: '10px 16px', borderRadius: 10,
        background: 'rgba(26,16,10,0.78)', color: '#fbe6c2',
        fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 14,
        pointerEvents: 'none', userSelect: 'none', letterSpacing: 0.3,
        border: '2px solid #3a2014',
      }}
    >
      Aperte{' '}
      <span style={{
        display: 'inline-block', padding: '1px 7px', borderRadius: 5,
        background: '#f4c95a', color: '#3a2014', fontWeight: 700,
        margin: '0 2px',
      }}>E</span>{' '}
      para {sitting ? 'levantar' : 'sentar'}
    </div>
  )
}

function ParticipantPanel({ user }) {
  const roster = useStore((s) => s.roster)
  const speaking = useStore((s) => s.speaking)
  const micEnabled = useStore((s) => s.micEnabled)

  const all = [
    { id: user.id, name: user.name, color: user.color, isLocal: true },
    ...[...roster.values()].map((p) => ({ id: p.userId, name: p.name, color: p.color, isLocal: false })),
  ]

  return (
    <div
      style={{
        position: 'absolute', right: 16, top: 16,
        background: 'rgba(26,16,10,0.72)', borderRadius: 10,
        padding: '10px 14px', color: '#fbe6c2',
        fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12,
        minWidth: 160, userSelect: 'none',
      }}
    >
      {all.map((p) => {
        const isSpeaking = speaking.has(p.id)
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
            <span
              style={{
                width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                background: p.color,
                boxShadow: isSpeaking ? `0 0 7px 2px ${p.color}` : 'none',
                transition: 'box-shadow 120ms',
              }}
            />
            <span style={{ flex: 1, opacity: isSpeaking ? 1 : 0.65, fontWeight: isSpeaking ? 700 : 400 }}>
              {p.name}{p.isLocal ? ' (você)' : ''}
            </span>
            {isSpeaking && <span style={{ color: '#5ac08a', fontSize: 10 }}>▶</span>}
            {p.isLocal && !micEnabled && <span style={{ color: '#ff7a5a', fontSize: 10 }}>✕mic</span>}
          </div>
        )
      })}
    </div>
  )
}

function HUD({ room, onLeave, user }) {
  const self = useStore((s) => s.self)
  const rosterSize = useStore((s) => s.roster.size)
  const micEnabled = useStore((s) => s.micEnabled)

  return (
    <>
      <ParticipantPanel user={user} />
      <SitPrompt />

      <div
        style={{
          position: 'absolute', left: 16, bottom: 16,
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(26,16,10,0.62)', color: '#fbe6c2',
          fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13,
          pointerEvents: 'none', userSelect: 'none', lineHeight: 1.55, minWidth: 180,
        }}
      >
        <div style={{ opacity: 0.85 }}>WASD / setas para andar</div>
        <div>
          <span style={{ color: self?.color ?? '#fbe6c2' }}>●</span>{' '}
          {self?.name ?? 'conectando…'}
        </div>
        <div style={{ opacity: 0.7 }}>
          sala: {room} · {rosterSize} outro(s)
        </div>
      </div>

      <div style={{ position: 'absolute', right: 16, bottom: 16, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={toggleMic}
          style={{
            padding: '10px 14px', borderRadius: 10, border: '2px solid #3a2014',
            background: micEnabled ? '#f4c95a' : '#3a2014',
            color: micEnabled ? '#3a2014' : '#ffd2c2',
            fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13,
            fontWeight: 700, letterSpacing: 0.4, cursor: 'pointer',
            boxShadow: '0 4px 0 #3a2014',
          }}
        >
          {micEnabled ? 'MIC ON' : 'MIC OFF'}
        </button>

        <button
          type="button"
          onClick={onLeave}
          style={{
            padding: '10px 14px', borderRadius: 10, border: '2px solid #3a2014',
            background: '#3a2014', color: '#ffd2c2',
            fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 0 #6b3a2a',
          }}
        >
          Sair
        </button>
      </div>
    </>
  )
}

function EntryOverlay({ roomName, onEnter, loading, error }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif', color: '#3a2014',
        zIndex: 10,
      }}
    >
      <div
        style={{
          background: '#fbeac4', border: '4px solid #3a2014', borderRadius: 18,
          padding: '32px 36px', width: 'min(380px, 92vw)',
          boxShadow: '0 18px 0 -8px #b73a2b, 0 24px 30px rgba(58,34,24,0.2)',
          display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>{roomName}</h1>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7, textAlign: 'center' }}>
          O navegador vai pedir acesso ao microfone ao entrar.
        </p>

        <button
          type="button"
          onClick={onEnter}
          disabled={loading}
          style={{
            width: '100%', fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
            padding: '13px 18px', borderRadius: 12, border: '3px solid #3a2014',
            background: loading ? '#d6b985' : '#f4c95a', color: '#3a2014',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 5px 0 #3a2014',
            transform: loading ? 'translateY(2px)' : 'none',
            transition: 'transform 120ms, background 120ms',
          }}
        >
          {loading ? 'Conectando…' : 'Entrar na sala'}
        </button>

        {error && (
          <div
            style={{
              width: '100%', background: '#3a2014', color: '#ffd2c2',
              borderRadius: 10, padding: '10px 12px', fontSize: 13, textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorldClient({ room, roomName, user, livekitUrl, livekitToken, wsUrl }) {
  const [entered, setEntered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const playerRef = useRef()

  useKeyboardControls()
  useSitToggle()

  const enter = async () => {
    setLoading(true)
    setError(null)
    try {
      useStore.setState({ self: { id: null, name: user.name, color: user.color }, micEnabled: true })
      connect({ room, user, wsUrl })
      await connectVoice(livekitUrl, livekitToken)
      onActiveSpeakersChanged((speakers) => {
        useStore.setState({ speaking: new Set(speakers.map((p) => p.identity)) })
      })
      setEntered(true)
    } catch (err) {
      setError(err.message || 'Erro ao conectar. Verifique as permissões de microfone.')
      setLoading(false)
    }
  }

  const leave = () => {
    disconnectVoice()
    disconnectWS()
    useStore.setState({ self: null, roster: new Map(), input: { x: 0, z: 0 }, speaking: new Set(), nearSeat: false, sitting: false, standingUp: false })
    window.location.href = '/lobby'
  }

  useEffect(() => {
    return () => {
      disconnectVoice()
      disconnectWS()
    }
  }, [])

  return (
    <>
      {!entered && (
        <EntryOverlay
          roomName={roomName || room}
          onEnter={enter}
          loading={loading}
          error={error}
        />
      )}

      <div
        style={{
          width: '100vw', height: '100vh',
          background: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)',
          visibility: entered ? 'visible' : 'hidden',
        }}
      >
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <CameraFollow targetRef={playerRef} />
          <Lights />
          <Scene />
          <LocalPlayer ref={playerRef} userId={user.id} />
          <RemotePlayers />
          <ContactShadows position={[0, 0.025, 0]} opacity={0.45} scale={30} blur={2.4} far={10} />
        </Canvas>

        {entered && <HUD room={room} onLeave={leave} user={user} />}
      </div>
    </>
  )
}
