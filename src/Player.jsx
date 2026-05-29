import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from './store'
import { positions } from './positions'
import { sendMove } from './net'

const SPEED = 3.2
const INV_SQRT2 = 1 / Math.SQRT2
const BOUNDS = { xMin: -3.7, xMax: 3.7, zMin: -1.3, zMax: 2.2 }
const LERP_PER_SEC = 10
const TWO_PI = Math.PI * 2

function inputToWorld(input) {
  return {
    x: (input.x + input.z) * INV_SQRT2,
    z: (-input.x + input.z) * INV_SQRT2,
  }
}

function Avatar({ color, skin = '#e8c39a', bodyRef }) {
  return (
    <group ref={bodyRef}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.22, 0.42, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 0.45, 0.18]}>
        <boxGeometry args={[0.36, 0.32, 0.04]} />
        <meshStandardMaterial color="#fbf3df" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.08, 0]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.08, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#c98563" roughness={0.7} />
      </mesh>
      <mesh position={[-0.07, 1.13, 0.18]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.07, 1.13, 0.18]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}

export function LocalPlayer({ ref }) {
  const bodyRef = useRef()
  const headingRef = useRef(Math.PI)
  const phaseRef = useRef(0)
  const color = useStore((s) => s.self?.color ?? '#f4c95a')

  useFrame((_, delta) => {
    const group = ref?.current
    if (!group) return
    const input = useStore.getState().input
    const moving = Math.abs(input.x) + Math.abs(input.z) > 0.001
    if (moving) {
      const w = inputToWorld(input)
      group.position.x = Math.max(
        BOUNDS.xMin,
        Math.min(BOUNDS.xMax, group.position.x + w.x * SPEED * delta),
      )
      group.position.z = Math.max(
        BOUNDS.zMin,
        Math.min(BOUNDS.zMax, group.position.z + w.z * SPEED * delta),
      )
      headingRef.current = Math.atan2(w.x, w.z)
      phaseRef.current += delta * 9
    }
    group.rotation.y = headingRef.current
    if (bodyRef.current) {
      const target = moving ? Math.abs(Math.sin(phaseRef.current)) * 0.06 : 0
      bodyRef.current.position.y += (target - bodyRef.current.position.y) * 0.25
    }
    sendMove(group.position.x, group.position.z, headingRef.current)
  })

  return (
    <group ref={ref} position={[0, 0, 1]}>
      <Avatar color={color} bodyRef={bodyRef} />
    </group>
  )
}

export function RemotePlayer({ player }) {
  const groupRef = useRef()
  const bodyRef = useRef()
  const phaseRef = useRef(0)
  const lastXRef = useRef(0)
  const lastZRef = useRef(0)

  useFrame((_, delta) => {
    const p = positions.get(player.id)
    const g = groupRef.current
    if (!p || !g) return
    const k = Math.min(1, delta * LERP_PER_SEC)
    p.x += (p.tx - p.x) * k
    p.z += (p.tz - p.z) * k
    let dd = p.tdir - p.dir
    if (dd > Math.PI) dd -= TWO_PI
    else if (dd < -Math.PI) dd += TWO_PI
    p.dir += dd * k
    g.position.x = p.x
    g.position.z = p.z
    g.rotation.y = p.dir
    const dx = p.x - lastXRef.current
    const dz = p.z - lastZRef.current
    const moving = Math.hypot(dx, dz) > 0.0008
    lastXRef.current = p.x
    lastZRef.current = p.z
    if (moving) phaseRef.current += delta * 9
    if (bodyRef.current) {
      const target = moving ? Math.abs(Math.sin(phaseRef.current)) * 0.06 : 0
      bodyRef.current.position.y += (target - bodyRef.current.position.y) * 0.25
    }
  })

  return (
    <group ref={groupRef}>
      <Avatar color={player.color} bodyRef={bodyRef} />
    </group>
  )
}
