'use client'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { useStore } from '@/store'
import { positions } from '@/positions'
import { sendMove } from '@/lib/net'
import { SEAT_POS, SEAT_HEADING, EXIT_POS, INTERACT_RADIUS, COUCH_BOX, PLAYER_RADIUS } from '@/seat'

const SPEED = 3.36
const INV_SQRT2 = 1 / Math.SQRT2
const BOUNDS = { xMin: -7.4, xMax: 7.4, zMin: -4.6, zMax: 4.4 }
const LERP_PER_SEC = 10
const TWO_PI = Math.PI * 2

const IDLE_URL = '/models/idle.glb'
const WALK_URL = '/models/walking.glb'
const SIT_URL = '/models/stand-to-sit.glb'
const STAND_URL = '/models/sit-to-stand.glb'

// Os GLBs do personagem trazem todos os materiais em cinza neutro
// (baseColorFactor [0.604, 0.604, 0.604, 1] hardcoded no export).
// Pintamos em runtime: corpo = cor do usuário; rosto = cores fixas.
const FACE_BROWS = '#2a1a10'
const FACE_MOUTH = '#7a2a1a'
const FACE_EYES = '#f4ecd8'
const DEFAULT_BODY = '#f4c95a'

function inputToWorld(input) {
  return {
    x: (input.x + input.z) * INV_SQRT2,
    z: (-input.x + input.z) * INV_SQRT2,
  }
}

// Keep only transform tracks (position/quaternion/scale) that target nodes
// existing in the bound scene. Animation GLBs may carry material/morph tracks
// which would corrupt the shared materials when bound by name.
function sanitizeClip(clip, scene) {
  if (!clip) return null
  const names = new Set()
  scene.traverse((o) => { if (o.name) names.add(o.name) })
  const c = clip.clone()
  c.tracks = c.tracks.filter((t) => {
    const dot = t.name.lastIndexOf('.')
    if (dot < 0) return false
    const nodeName = t.name.slice(0, dot)
    const prop = t.name.slice(dot + 1)
    if (!names.has(nodeName)) return false
    return prop === 'position' || prop === 'quaternion' || prop === 'scale'
  })
  return c
}

function insideCouch(x, z, r) {
  return (
    x > COUCH_BOX.minX - r && x < COUCH_BOX.maxX + r &&
    z > COUCH_BOX.minZ - r && z < COUCH_BOX.maxZ + r
  )
}

function avoidCouch(prevX, prevZ, newX, newZ) {
  const r = PLAYER_RADIUS
  if (!insideCouch(newX, newZ, r)) return { x: newX, z: newZ }
  if (!insideCouch(prevX, newZ, r)) return { x: prevX, z: newZ }
  if (!insideCouch(newX, prevZ, r)) return { x: newX, z: prevZ }
  return { x: prevX, z: prevZ }
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

function Avatar({ moving, sitting, userId, color, onStandFinished }) {
  const idle = useGLTF(IDLE_URL)
  const walk = useGLTF(WALK_URL)
  const sit = useGLTF(SIT_URL)
  const stand = useGLTF(STAND_URL)
  const scene = useMemo(() => cloneSkeleton(idle.scene), [idle.scene])
  const clips = useMemo(() => {
    const r = []
    const i = sanitizeClip(idle.animations[0], scene)
    const w = sanitizeClip(walk.animations[0], scene)
    const s = sanitizeClip(sit.animations[0], scene)
    const u = sanitizeClip(stand.animations[0], scene)
    if (i) { i.name = 'idle'; r.push(i) }
    if (w) { w.name = 'walk'; r.push(w) }
    if (s) { s.name = 'sit'; r.push(s) }
    if (u) { u.name = 'stand'; r.push(u) }
    return r
  }, [idle, walk, sit, stand, scene])
  const { actions, mixer } = useAnimations(clips, scene)

  useLayoutEffect(() => {
    const bodyColor = color || DEFAULT_BODY
    scene.traverse((o) => {
      if (!o.isMesh || !o.material) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      const replaced = mats.map((mat) => {
        const cloned = mat.clone()
        if (!cloned.color) return cloned
        if (mat.name === 'Boy01_Body_MAT1') cloned.color.set(bodyColor)
        else if (mat.name === 'Boy01_Brows_MAT2') cloned.color.set(FACE_BROWS)
        else if (mat.name === 'Boy01_Mouth_MAT2') cloned.color.set(FACE_MOUTH)
        else if (mat.name === 'Boy01_Eyes_MAT2') cloned.color.set(FACE_EYES)
        else cloned.color.set(bodyColor)
        return cloned
      })
      o.material = Array.isArray(o.material) ? replaced : replaced[0]
    })
  }, [scene, color])

  const prevSittingRef = useRef(null)
  const standingUpRef = useRef(false)
  const standTimeoutRef = useRef(null)
  const movingRef = useRef(moving)

  useEffect(() => { movingRef.current = moving }, [moving])

  useEffect(() => {
    const idleAction = actions.idle
    const walkAction = actions.walk
    const sitAction = actions.sit
    const standAction = actions.stand
    if (!idleAction || !walkAction) return
    if (sitAction) {
      sitAction.setLoop(THREE.LoopOnce, 1)
      sitAction.clampWhenFinished = true
    }
    if (standAction) {
      standAction.setLoop(THREE.LoopOnce, 1)
      standAction.clampWhenFinished = false
    }

    const isInitialMount = prevSittingRef.current === null
    const sittingChanged = !isInitialMount && prevSittingRef.current !== sitting
    prevSittingRef.current = sitting

    // Mount already sitting (remote join while seated): snap to end pose.
    if (isInitialMount && sitting && sitAction) {
      const dur = sitAction.getClip().duration
      sitAction.reset()
      sitAction.time = dur
      sitAction.play()
      sitAction.paused = true
      return
    }

    // Sit down: play stand-to-sit forward.
    if (sittingChanged && sitting && sitAction) {
      if (standTimeoutRef.current) {
        clearTimeout(standTimeoutRef.current)
        standTimeoutRef.current = null
      }
      standingUpRef.current = false
      if (standAction) standAction.stop()
      idleAction.fadeOut(0.2)
      walkAction.fadeOut(0.2)
      sitAction.reset()
      sitAction.setEffectiveTimeScale(1)
      sitAction.fadeIn(0.2)
      sitAction.play()
      return
    }

    // Stand up: play sit-to-stand clip, then fade to idle/walk on finish.
    if (sittingChanged && !sitting && standAction) {
      standingUpRef.current = true
      if (sitAction) sitAction.fadeOut(0.2)
      standAction.reset()
      standAction.setEffectiveTimeScale(1)
      standAction.fadeIn(0.2)
      standAction.play()

      const finishToIdle = () => {
        standAction.fadeOut(0.2)
        standingUpRef.current = false
        standTimeoutRef.current = null
        const target = movingRef.current ? walkAction : idleAction
        target.reset().fadeIn(0.2).play()
        onStandFinished?.()
      }

      const onFinished = (e) => {
        if (e.action !== standAction) return
        mixer.removeEventListener('finished', onFinished)
        if (standTimeoutRef.current) {
          clearTimeout(standTimeoutRef.current)
          standTimeoutRef.current = null
        }
        finishToIdle()
      }
      mixer.addEventListener('finished', onFinished)

      // Fallback if 'finished' doesn't fire for some reason.
      const dur = standAction.getClip().duration
      standTimeoutRef.current = setTimeout(() => {
        mixer.removeEventListener('finished', onFinished)
        finishToIdle()
      }, (dur + 0.05) * 1000)

      return () => {
        mixer.removeEventListener('finished', onFinished)
      }
    }

    // Plain idle/walk toggle (only while fully standing).
    if (sitting) return
    if (standingUpRef.current) return
    const next = moving ? walkAction : idleAction
    const prev = moving ? idleAction : walkAction
    if (next && next !== prev) {
      next.reset().fadeIn(0.2).play()
      prev?.fadeOut(0.2)
    } else if (next) {
      next.play()
    }
  }, [sitting, moving, actions, mixer, onStandFinished])

  useEffect(() => () => {
    if (standTimeoutRef.current) clearTimeout(standTimeoutRef.current)
  }, [])

  return (
    <group>
      {userId && <SpeakingRing userId={userId} />}
      <primitive object={scene} scale={0.01} />
    </group>
  )
}

useGLTF.preload(IDLE_URL)
useGLTF.preload(WALK_URL)
useGLTF.preload(SIT_URL)
useGLTF.preload(STAND_URL)

export function LocalPlayer({ ref, userId }) {
  const headingRef = useRef(Math.PI)
  const movingRef = useRef(false)
  const nearSeatRef = useRef(false)
  const wasLockedRef = useRef(false)
  const [moving, setMoving] = useState(false)
  const sitting = useStore((s) => s.sitting)
  const standingUp = useStore((s) => s.standingUp)
  const color = useStore((s) => s.self?.color)

  const onStandFinished = useCallback(() => {
    useStore.setState({ standingUp: false })
  }, [])

  useFrame((_, delta) => {
    const group = ref?.current
    if (!group) return

    const locked = sitting || standingUp
    if (locked) {
      group.position.x = SEAT_POS.x
      group.position.z = SEAT_POS.z
      headingRef.current = SEAT_HEADING
      group.rotation.y = SEAT_HEADING
      if (movingRef.current) {
        movingRef.current = false
        setMoving(false)
      }
      wasLockedRef.current = true
      sendMove(group.position.x, group.position.z, headingRef.current)
      return
    }

    // First frame after lock released (stand-up just finished): teleport
    // out of the couch box so the player can move freely.
    if (wasLockedRef.current) {
      wasLockedRef.current = false
      group.position.x = EXIT_POS.x
      group.position.z = EXIT_POS.z
      headingRef.current = SEAT_HEADING
      group.rotation.y = SEAT_HEADING
    }

    const input = useStore.getState().input
    const isMoving = Math.abs(input.x) + Math.abs(input.z) > 0.001
    if (isMoving) {
      const w = inputToWorld(input)
      const prevX = group.position.x
      const prevZ = group.position.z
      const proposedX = Math.max(BOUNDS.xMin, Math.min(BOUNDS.xMax, prevX + w.x * SPEED * delta))
      const proposedZ = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, prevZ + w.z * SPEED * delta))
      const resolved = avoidCouch(prevX, prevZ, proposedX, proposedZ)
      group.position.x = resolved.x
      group.position.z = resolved.z
      headingRef.current = Math.atan2(w.x, w.z)
    }
    group.rotation.y = headingRef.current
    if (isMoving !== movingRef.current) {
      movingRef.current = isMoving
      setMoving(isMoving)
    }

    const dx = group.position.x - SEAT_POS.x
    const dz = group.position.z - SEAT_POS.z
    const near = (dx * dx + dz * dz) < (INTERACT_RADIUS * INTERACT_RADIUS)
    if (near !== nearSeatRef.current) {
      nearSeatRef.current = near
      useStore.setState({ nearSeat: near })
    }

    sendMove(group.position.x, group.position.z, headingRef.current)
  })

  return (
    <group ref={ref} position={[0, 0, 1]}>
      <Avatar moving={moving} sitting={sitting} userId={userId} color={color} onStandFinished={onStandFinished} />
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
      <Avatar moving={moving} sitting={!!player.sitting} userId={player.userId} color={player.color} />
    </group>
  )
}
