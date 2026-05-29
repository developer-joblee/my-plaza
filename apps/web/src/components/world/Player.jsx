'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useStore } from '@/store'
import { positions } from '@/positions'
import { sendMove } from '@/lib/net'

const SPEED = 3.36
const INV_SQRT2 = 1 / Math.SQRT2
const BOUNDS = { xMin: -7.4, xMax: 7.4, zMin: -2.6, zMax: 4.4 }
const LERP_PER_SEC = 10
const TWO_PI = Math.PI * 2

const IDLE_URL = '/models/idle.glb'
const WALK_URL = '/models/walking.glb'

function inputToWorld(input) {
  return {
    x: (input.x + input.z) * INV_SQRT2,
    z: (-input.x + input.z) * INV_SQRT2,
  }
}

function SpeakingRing({ userId }) {
  const ringRef = useRef()
  const tRef = useRef(0)

  useFrame((_, delta) => {
    const mesh = ringRef.current
    if (!mesh) return
    const speaking = useStore.getState().speaking.has(userId)
    tRef.current += delta
    mesh.visible = speaking
    if (speaking) mesh.scale.setScalar(1 + Math.sin(tRef.current * 8) * 0.07)
  })

  return (
    <mesh ref={ringRef} position={[0, 1.52, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
      <torusGeometry args={[0.26, 0.025, 8, 32]} />
      <meshStandardMaterial color="#5ac08a" emissive="#5ac08a" emissiveIntensity={1} />
    </mesh>
  )
}

function Avatar({ moving, userId }) {
  const idle = useGLTF(IDLE_URL)
  const walk = useGLTF(WALK_URL)
  const scene = useMemo(() => cloneSkeleton(idle.scene), [idle.scene])
  const clips = useMemo(() => {
    const idleClip = idle.animations[0]?.clone()
    const walkClip = walk.animations[0]?.clone()
    if (idleClip) idleClip.name = 'idle'
    if (walkClip) walkClip.name = 'walk'
    return [idleClip, walkClip].filter(Boolean)
  }, [idle, walk])
  const { actions } = useAnimations(clips, scene)

  useEffect(() => {
    const idleAction = actions.idle
    const walkAction = actions.walk
    const next = moving ? walkAction : idleAction
    const prev = moving ? idleAction : walkAction
    if (next && next !== prev) {
      next.reset().fadeIn(0.2).play()
      prev?.fadeOut(0.2)
    } else if (next) {
      next.play()
    }
  }, [moving, actions])

  return (
    <group>
      {userId && <SpeakingRing userId={userId} />}
      <primitive object={scene} scale={0.01} />
    </group>
  )
}

useGLTF.preload(IDLE_URL)
useGLTF.preload(WALK_URL)

export function LocalPlayer({ ref, userId }) {
  const headingRef = useRef(Math.PI)
  const movingRef = useRef(false)
  const [moving, setMoving] = useState(false)

  useFrame((_, delta) => {
    const group = ref?.current
    if (!group) return
    const input = useStore.getState().input
    const isMoving = Math.abs(input.x) + Math.abs(input.z) > 0.001
    if (isMoving) {
      const w = inputToWorld(input)
      group.position.x = Math.max(BOUNDS.xMin, Math.min(BOUNDS.xMax, group.position.x + w.x * SPEED * delta))
      group.position.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, group.position.z + w.z * SPEED * delta))
      headingRef.current = Math.atan2(w.x, w.z)
    }
    group.rotation.y = headingRef.current
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving
      setMoving(isMoving)
    }
    sendMove(group.position.x, group.position.z, headingRef.current)
  })

  return (
    <group ref={ref} position={[0, 0, 1]}>
      <Avatar moving={moving} userId={userId} />
    </group>
  )
}

export function RemotePlayer({ player }) {
  const groupRef = useRef()
  const lastXRef = useRef(0)
  const lastZRef = useRef(0)
  const movingRef = useRef(false)
  const [moving, setMoving] = useState(false)

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
    const isMoving = Math.hypot(dx, dz) > 0.0008
    lastXRef.current = p.x
    lastZRef.current = p.z
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving
      setMoving(isMoving)
    }
  })

  return (
    <group ref={groupRef}>
      <Avatar moving={moving} userId={player.userId} />
    </group>
  )
}
