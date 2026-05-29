import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera, ContactShadows } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Scene, Lights } from './CoffeeShop'
import { LocalPlayer, RemotePlayer } from './Player'
import { useKeyboardControls } from './controls'
import { connect } from './net'
import { useStore } from './store'
import { setMicEnabled } from './audio'
import { initWebRTC } from './webrtc'

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
    <OrthographicCamera
      ref={camRef}
      makeDefault
      position={[16, 16, 16]}
      zoom={62}
      near={0.1}
      far={100}
    />
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

function HUD({ room }) {
  const self = useStore((s) => s.self)
  const rosterSize = useStore((s) => s.roster.size)
  const micEnabled = useStore((s) => s.micEnabled)
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(26, 16, 10, 0.62)',
          color: '#fbe6c2',
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 13,
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1.55,
          minWidth: 180,
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
      <button
        type="button"
        onClick={toggleMic}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          padding: '10px 14px',
          borderRadius: 10,
          border: '2px solid #3a2014',
          background: micEnabled ? '#f4c95a' : '#3a2014',
          color: micEnabled ? '#3a2014' : '#ffd2c2',
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.4,
          cursor: 'pointer',
          boxShadow: '0 4px 0 #3a2014',
        }}
      >
        {micEnabled ? 'MIC ON' : 'MIC OFF'}
      </button>
    </>
  )
}

export default function World({ room = 'lobby' }) {
  useKeyboardControls()
  const playerRef = useRef()
  useEffect(() => {
    initWebRTC()
    connect({ room })
  }, [room])
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)',
      }}
    >
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <CameraFollow targetRef={playerRef} />
        <Lights />
        <Scene showFrontWall={false} />
        <LocalPlayer ref={playerRef} />
        <RemotePlayers />
        <ContactShadows position={[0, 0.025, 0]} opacity={0.45} scale={30} blur={2.4} far={10} />
      </Canvas>
      <HUD room={room} />
    </div>
  )
}
