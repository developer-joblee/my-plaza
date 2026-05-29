'use client'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, ContactShadows } from '@react-three/drei'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { COUCH_POS } from '@/seat'

const C = {
  brick: '#c8775a', brickDark: '#a35a3f', mortar: '#7a3f2c',
  cream: '#f5e9d4', creamDark: '#e6d5b3',
  wood: '#8b5a3c', woodDark: '#4a2f1d', woodFloor: '#b0875e',
  counter: '#3e2a1f', counterTop: '#5e3a25',
  awningA: '#b73a2b', awningB: '#f4ead5',
  roof: '#3a2218', roofEdge: '#22130b',
  glass: '#bcd6e0', frame: '#3a2a22',
  chrome: '#dadfe2', chrome2: '#7a838a',
  leaf: '#5a8d4d', leafLight: '#7ba65a', leafDark: '#3d6b3b',
  pot: '#a85a3c', potDark: '#7a3f29',
  street: '#312c27', sidewalk: '#cfc6b8', sidewalkLine: '#a39a8c',
  chalk: '#1a241f', chalkW: '#f0ede2',
  white: '#ffffff', coffee: '#3b1f10', milk: '#fff5e0',
  warmLight: '#ffcd80', door: '#5b3a2e', metalBlack: '#222',
  signCream: '#fbeac4', signText: '#3a2014',
  couchBody: '#6d3a2a', couchCushion: '#b85a3c', couchPiping: '#3a1e14',
}

const Box = ({ size = [1, 1, 1], color, ...rest }) => (
  <mesh castShadow receiveShadow {...rest}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.85} />
  </mesh>
)

const Cyl = ({ args = [0.5, 0.5, 1, 16], color, ...rest }) => (
  <mesh castShadow receiveShadow {...rest}>
    <cylinderGeometry args={args} />
    <meshStandardMaterial color={color} roughness={0.7} />
  </mesh>
)

export function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fde7c2', '#5a3d2a', 0.35]} />
      <directionalLight
        castShadow
        position={[12, 16, 8]}
        intensity={1.4}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
      />
      <pointLight position={[0, 2.6, -1]} color={C.warmLight} intensity={0.9} distance={6} />
      <pointLight position={[1.5, 2.6, 0.5]} color={C.warmLight} intensity={0.6} distance={5} />
    </>
  )
}

function Floor() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[18, 12]} />
      <meshStandardMaterial color={C.woodFloor} roughness={0.7} />
    </mesh>
  )
}

function BrickWall({ size = [8, 3, 0.2], position = [0, 1.5, 0], rotation = [0, 0, 0], facing = 'z' }) {
  const [w, h, d] = size
  const rows = Math.floor(h / 0.3)
  const cols = Math.floor((facing === 'z' ? w : d) / 0.7) + 1
  const faceLen = facing === 'z' ? w : d
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={C.brick} roughness={0.95} />
      </mesh>
      {Array.from({ length: rows }).map((_, i) => {
        const y = -h / 2 + (i + 1) * (h / rows)
        const lineSize = facing === 'z' ? [w, 0.022] : [d, 0.022]
        const linePos = facing === 'z' ? [0, y, d / 2 + 0.001] : [w / 2 + 0.001, y, 0]
        const lineRot = facing === 'z' ? [0, 0, 0] : [0, Math.PI / 2, 0]
        return (
          <mesh key={`r${i}`} position={linePos} rotation={lineRot}>
            <planeGeometry args={lineSize} />
            <meshBasicMaterial color={C.mortar} />
          </mesh>
        )
      })}
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const offset = row % 2 === 0 ? 0 : 0.35
          const t = -faceLen / 2 + 0.2 + col * 0.7 + offset
          if (Math.abs(t) > faceLen / 2 - 0.05) return null
          const y = -h / 2 + (row + 0.5) * (h / rows)
          const seg = h / rows * 0.85
          if (facing === 'z') {
            return (
              <mesh key={`b${row}-${col}`} position={[t, y, d / 2 + 0.002]}>
                <planeGeometry args={[0.022, seg]} />
                <meshBasicMaterial color={C.mortar} />
              </mesh>
            )
          }
          return (
            <mesh key={`b${row}-${col}`} position={[w / 2 + 0.002, y, t]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.022, seg]} />
              <meshBasicMaterial color={C.mortar} />
            </mesh>
          )
        })
      )}
    </group>
  )
}

function BackWallDecor() {
  return (
    <group position={[0, 0, -2.38]}>
      <group position={[-2.4, 2.0, 0]}>
        <Box size={[1.8, 1.2, 0.05]} color={C.woodDark} />
        <Box size={[1.55, 0.95, 0.02]} position={[0, 0, 0.04]} color={C.chalk} />
        {[[0.6, 0.32], [0.45, 0.16], [0.5, 0.0], [0.4, -0.16], [0.55, -0.32]].map(([w, y], i) => (
          <mesh key={`t${i}`} position={[-0.4, y, 0.06]}>
            <planeGeometry args={[w, 0.04]} />
            <meshBasicMaterial color={C.chalkW} />
          </mesh>
        ))}
        {[0.32, 0.16, 0.0, -0.16, -0.32].map((y, i) => (
          <mesh key={`p${i}`} position={[0.55, y, 0.06]}>
            <planeGeometry args={[0.12, 0.04]} />
            <meshBasicMaterial color={C.chalkW} />
          </mesh>
        ))}
        <Box size={[1.85, 0.05, 0.07]} position={[0, 0.65, 0.02]} color={C.wood} />
      </group>
      <group position={[2.2, 2.3, 0]}>
        <Box size={[2.4, 0.06, 0.3]} color={C.woodDark} />
        {[-0.95, -0.55, -0.15, 0.25, 0.65, 1.0].map((x, i) => (
          <group key={i} position={[x, 0.18, 0]}>
            <Cyl args={[0.08, 0.08, 0.3, 16]} color={i % 2 ? C.coffee : '#6b3f23'} />
            <Cyl args={[0.085, 0.085, 0.05, 16]} position={[0, 0.17, 0]} color={C.chrome2} />
          </group>
        ))}
      </group>
      <group position={[2.2, 1.65, 0]}>
        <Box size={[2.4, 0.06, 0.3]} color={C.woodDark} />
        {[-0.95, -0.55, -0.15, 0.25, 0.65, 1.0].map((x, i) => (
          <Cyl key={i} args={[0.075, 0.055, 0.13, 16]} position={[x, 0.1, 0]} color={i % 2 ? C.white : '#f0e6d2'} />
        ))}
      </group>
    </group>
  )
}

function Counter() {
  return (
    <group position={[-0.5, 0, -1.75]}>
      <Box size={[5, 1, 0.7]} position={[0, 0.5, 0]} color={C.counter} />
      <Box size={[5.1, 0.06, 0.78]} position={[0, 1.03, 0]} color={C.counterTop} />
      {[-2, -1, 0, 1, 2].map((x) => (
        <mesh key={x} position={[x, 0.5, 0.36]}>
          <planeGeometry args={[0.025, 0.95]} />
          <meshBasicMaterial color={C.woodDark} />
        </mesh>
      ))}
      <group position={[-1.8, 1.06, 0]}>
        <mesh castShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[1.2, 0.6, 0.6]} />
          <meshPhysicalMaterial color={C.glass} transparent opacity={0.35} roughness={0.05} transmission={0.6} thickness={0.2} />
        </mesh>
        <Box size={[1.25, 0.04, 0.65]} position={[0, 0.04, 0]} color={C.woodDark} />
        <Box size={[1.25, 0.04, 0.65]} position={[0, 0.6, 0]} color={C.woodDark} />
        <Cyl args={[0.18, 0.18, 0.16, 24]} position={[-0.32, 0.13, 0]} color="#e6b27a" />
        <Cyl args={[0.04, 0.04, 0.18, 16]} position={[-0.32, 0.3, 0]} color="#c44a4a" />
        <Cyl args={[0.18, 0.18, 0.16, 24]} position={[0, 0.13, 0]} color="#c44a4a" />
        <Cyl args={[0.18, 0.18, 0.16, 24]} position={[0.32, 0.13, 0]} color="#5a3a22" />
        <Box size={[0.04, 0.06, 0.3]} position={[0.32, 0.25, 0]} color="#dadada" />
      </group>
      <group position={[0.6, 1.06, 0]}>
        <Box size={[1.0, 0.45, 0.5]} position={[0, 0.22, 0]} color={C.chrome} />
        <Box size={[1.05, 0.1, 0.55]} position={[0, 0.5, 0]} color="#3a3a3a" />
        <Box size={[0.9, 0.05, 0.45]} position={[0, 0.58, 0]} color={C.chrome2} />
        <Cyl args={[0.06, 0.06, 0.12, 16]} position={[-0.25, 0.05, 0.27]} color={C.metalBlack} />
        <Cyl args={[0.06, 0.06, 0.12, 16]} position={[0.25, 0.05, 0.27]} color={C.metalBlack} />
        <Box size={[0.04, 0.04, 0.22]} position={[-0.25, 0.01, 0.42]} color={C.woodDark} />
        <Box size={[0.04, 0.04, 0.22]} position={[0.25, 0.01, 0.42]} color={C.woodDark} />
        <Cyl args={[0.05, 0.045, 0.08, 16]} position={[-0.25, 0.0, 0.27]} color={C.white} />
        <Cyl args={[0.05, 0.045, 0.08, 16]} position={[0.25, 0.0, 0.27]} color={C.white} />
        <Cyl args={[0.012, 0.012, 0.3, 8]} position={[0.5, 0.2, 0.18]} rotation={[Math.PI / 8, 0, -Math.PI / 6]} color={C.chrome2} />
        {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
          <Cyl key={i} args={[0.035, 0.035, 0.04, 12]} position={[x, 0.62, 0]} color={i % 2 ? C.metalBlack : '#aaa'} />
        ))}
        <Cyl args={[0.06, 0.06, 0.05, 16]} position={[0, 0.32, 0.26]} color="#222" />
      </group>
      <group position={[2.0, 1.06, 0]}>
        <Box size={[0.5, 0.35, 0.4]} position={[0, 0.18, 0]} color="#2a2a2a" />
        <Box size={[0.45, 0.04, 0.2]} position={[0, 0.38, -0.08]} color={C.chrome2} />
        <Box size={[0.3, 0.08, 0.25]} position={[0, 0.32, 0.08]} color="#1a1a1a" />
      </group>
      <Box size={[0.45, 0.05, 0.35]} position={[1.35, 1.09, 0]} color="#d6b27a" />
      <Cyl args={[0.06, 0.06, 0.05, 16]} position={[1.28, 1.14, 0.06]} color="#8b5a2a" />
      <Cyl args={[0.06, 0.06, 0.05, 16]} position={[1.42, 1.14, -0.05]} color="#a47148" />
      <Cyl args={[0.06, 0.06, 0.05, 16]} position={[1.32, 1.14, -0.08]} color="#c08a4a" />
    </group>
  )
}

function PendantLamp({ position = [0, 2.6, 0] }) {
  return (
    <group position={position}>
      <Cyl args={[0.008, 0.008, 1.2, 8]} position={[0, 0.6, 0]} color="#222" />
      <mesh castShadow position={[0, -0.05, 0]}>
        <coneGeometry args={[0.18, 0.25, 16, 1, true]} />
        <meshStandardMaterial color={C.metalBlack} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.13, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial emissive={C.warmLight} emissiveIntensity={1.5} color={C.warmLight} />
      </mesh>
    </group>
  )
}

function Chair({ position = [0, 0, 0], rotation = [0, 0, 0], color = C.woodDark }) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[0.5, 0.05, 0.5]} position={[0, 0.5, 0]} color={color} />
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z], i) => (
        <Box key={i} size={[0.04, 0.5, 0.04]} position={[x, 0.25, z]} color={color} />
      ))}
      <Box size={[0.5, 0.55, 0.04]} position={[0, 0.8, -0.23]} color={color} />
      <Box size={[0.42, 0.04, 0.04]} position={[0, 0.95, -0.21]} color={color} />
    </group>
  )
}

function Table({ position = [0, 0, 0], color = C.wood, withCups = true }) {
  return (
    <group position={position}>
      <Cyl args={[0.45, 0.45, 0.05, 24]} position={[0, 0.75, 0]} color={color} />
      <Cyl args={[0.05, 0.05, 0.75, 16]} position={[0, 0.375, 0]} color={color} />
      <Cyl args={[0.25, 0.3, 0.04, 24]} position={[0, 0.05, 0]} color={color} />
      {withCups && (
        <>
          <Cyl args={[0.07, 0.05, 0.1, 16]} position={[-0.15, 0.83, 0]} color={C.white} />
          <Cyl args={[0.065, 0.05, 0.02, 16]} position={[-0.15, 0.87, 0]} color={C.coffee} />
          <Cyl args={[0.07, 0.05, 0.1, 16]} position={[0.15, 0.83, 0.15]} color={C.white} />
          <Cyl args={[0.065, 0.05, 0.02, 16]} position={[0.15, 0.87, 0.15]} color={C.milk} />
          <Box size={[0.18, 0.02, 0.12]} position={[0, 0.79, -0.15]} color="#d6b27a" />
        </>
      )}
    </group>
  )
}

function Awning() {
  const stripes = 9
  return (
    <group position={[0, 2.85, 0.15]}>
      <Box size={[8.2, 0.1, 0.1]} position={[0, 0, 0]} color={C.woodDark} />
      <group rotation={[Math.PI / 7, 0, 0]} position={[0, -0.1, 0.55]}>
        {Array.from({ length: stripes }).map((_, i) => (
          <Box key={i} size={[0.85, 0.04, 1.3]} position={[-3.5 + i * 0.88, 0, 0]} color={i % 2 ? C.awningA : C.awningB} />
        ))}
        {Array.from({ length: stripes }).map((_, i) => (
          <mesh key={`s${i}`} castShadow position={[-3.5 + i * 0.88, -0.18, 0.65]}>
            <coneGeometry args={[0.42, 0.32, 3, 1]} />
            <meshStandardMaterial color={i % 2 ? C.awningA : C.awningB} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Sign({ position = [0, 3.4, 0.1] }) {
  return (
    <group position={position}>
      <Box size={[2.4, 0.7, 0.1]} color={C.signCream} />
      <Box size={[2.5, 0.07, 0.12]} position={[0, 0.34, 0]} color={C.woodDark} />
      <Box size={[2.5, 0.07, 0.12]} position={[0, -0.34, 0]} color={C.woodDark} />
      <Box size={[0.06, 0.7, 0.13]} position={[-1.22, 0, 0]} color={C.woodDark} />
      <Box size={[0.06, 0.7, 0.13]} position={[1.22, 0, 0]} color={C.woodDark} />
      <Cyl args={[0.2, 0.16, 0.22, 24]} position={[-0.35, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} color={C.signText} />
      <mesh position={[-0.05, 0, 0.07]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.025, 8, 16, Math.PI]} />
        <meshStandardMaterial color={C.signText} />
      </mesh>
      <Box size={[1.5, 0.18, 0.05]} position={[0.55, -0.15, 0.08]} color={C.signText} />
    </group>
  )
}

function FrontWall() {
  const wallH = 3
  return (
    <group position={[0, 0, 2.5]}>
      <Box size={[8.2, 0.7, 0.2]} position={[0, wallH - 0.35, 0]} color={C.cream} />
      <Box size={[5.2, 0.7, 0.2]} position={[-1.4, 0.35, 0]} color={C.cream} />
      <Box size={[0.2, wallH, 0.2]} position={[-4.0, wallH / 2, 0]} color={C.cream} />
      <Box size={[0.8, wallH - 0.7, 0.2]} position={[1.6, (wallH - 0.7) / 2, 0]} color={C.cream} />
      <Box size={[0.9, wallH - 0.7, 0.2]} position={[3.55, (wallH - 0.7) / 2, 0]} color={C.cream} />
      <Box size={[8.4, 0.08, 0.22]} position={[0, 0, 0]} color={C.woodDark} />
      <mesh position={[-1.4, 1.5, 0]}>
        <boxGeometry args={[5.2, 1.6, 0.05]} />
        <meshPhysicalMaterial color={C.glass} transparent opacity={0.35} roughness={0.05} transmission={0.7} thickness={0.1} />
      </mesh>
      {[-3.4, -1.4, 0.6].map((x) => (
        <Box key={x} size={[0.08, 1.6, 0.07]} position={[x, 1.5, 0.02]} color={C.frame} />
      ))}
      <Box size={[5.3, 0.08, 0.07]} position={[-1.4, 1.5, 0.02]} color={C.frame} />
      <Box size={[5.4, 0.1, 0.1]} position={[-1.4, 0.7, 0.02]} color={C.frame} />
      <Box size={[5.4, 0.1, 0.1]} position={[-1.4, 2.3, 0.02]} color={C.frame} />
      <Box size={[0.1, 1.7, 0.1]} position={[-4.05, 1.5, 0.02]} color={C.frame} />
      <Box size={[0.1, 1.7, 0.1]} position={[1.25, 1.5, 0.02]} color={C.frame} />
      <group position={[2.55, 1.15, 0]}>
        <Box size={[1.1, 2.3, 0.08]} color={C.door} />
        <Box size={[1.15, 0.08, 0.1]} position={[0, 1.18, 0.02]} color={C.woodDark} />
        <Box size={[1.15, 0.08, 0.1]} position={[0, -1.18, 0.02]} color={C.woodDark} />
        <mesh position={[0, 0.55, 0.05]}>
          <boxGeometry args={[0.7, 0.7, 0.04]} />
          <meshPhysicalMaterial color={C.glass} transparent opacity={0.4} roughness={0.05} transmission={0.7} thickness={0.1} />
        </mesh>
        <Cyl args={[0.035, 0.035, 0.06, 12]} position={[0.42, -0.15, 0.07]} rotation={[Math.PI / 2, 0, 0]} color={C.chrome2} />
        <Cyl args={[0.025, 0.025, 0.18, 12]} position={[0.42, -0.05, 0.07]} color={C.chrome2} />
      </group>
      <Awning />
      <Sign position={[0, 3.4, 0.18]} />
    </group>
  )
}

function Plant({ position, size = 1, leafColor = C.leaf }) {
  return (
    <group position={position} scale={size}>
      <Cyl args={[0.18, 0.14, 0.32, 16]} position={[0, 0.16, 0]} color={C.pot} />
      <Cyl args={[0.2, 0.2, 0.05, 16]} position={[0, 0.33, 0]} color={C.potDark} />
      {[[0, 0.52, 0, 0.18, 0], [0.13, 0.62, 0.06, 0.15, 0.6], [-0.11, 0.58, 0.08, 0.16, 1.2],
        [0.06, 0.72, -0.08, 0.14, 2.0], [-0.07, 0.75, 0.05, 0.15, 2.6], [0.0, 0.85, 0.0, 0.13, 3.0],
      ].map(([x, y, z, r, rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.2, rot, 0.3]} castShadow>
          <sphereGeometry args={[r, 14, 12]} />
          <meshStandardMaterial color={i % 2 ? leafColor : C.leafLight} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function Lamppost({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <Cyl args={[0.14, 0.16, 0.18, 16]} position={[0, 0.09, 0]} color={C.metalBlack} />
      <Cyl args={[0.045, 0.045, 3, 12]} position={[0, 1.6, 0]} color={C.metalBlack} />
      <Cyl args={[0.09, 0.06, 0.1, 16]} position={[0, 3.15, 0]} color={C.metalBlack} />
      <mesh castShadow position={[0, 3.32, 0]}>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color={C.warmLight} emissive={C.warmLight} emissiveIntensity={0.8} />
      </mesh>
      <Cyl args={[0.05, 0.05, 0.04, 12]} position={[0, 3.45, 0]} color={C.metalBlack} />
      <pointLight position={[0, 3.32, 0]} color={C.warmLight} intensity={0.5} distance={5} />
    </group>
  )
}

function OutdoorSet() {
  return (
    <group position={[5.0, 0, 1.2]}>
      <Cyl args={[0.03, 0.03, 2.4, 8]} position={[0, 1.2, 0]} color={C.woodDark} />
      <mesh castShadow position={[0, 2.15, 0]}>
        <coneGeometry args={[1.1, 0.55, 10, 1]} />
        <meshStandardMaterial color={C.awningA} />
      </mesh>
      <mesh castShadow position={[0, 1.9, 0]}>
        <coneGeometry args={[1.05, 0.2, 10, 1]} />
        <meshStandardMaterial color={C.awningB} />
      </mesh>
      <Cyl args={[0.04, 0.04, 0.06, 8]} position={[0, 2.45, 0]} color={C.metalBlack} />
      <Table position={[0, 0, 0]} color={C.woodDark} />
      <Chair position={[0.75, 0, 0.35]} rotation={[0, -Math.PI / 3, 0]} color={C.woodDark} />
      <Chair position={[-0.5, 0, -0.55]} rotation={[0, Math.PI * 0.75, 0]} color={C.woodDark} />
    </group>
  )
}

function Bicycle({ position = [-4.5, 0, 3.5] }) {
  return (
    <group position={position} rotation={[0, Math.PI / 8, 0]}>
      <Cyl args={[0.025, 0.025, 0.75, 8]} position={[0.3, 0.5, 0]} rotation={[0, 0, -Math.PI / 3.5]} color="#3a667a" />
      <Cyl args={[0.025, 0.025, 0.6, 8]} position={[-0.05, 0.4, 0]} rotation={[0, 0, Math.PI / 4]} color="#3a667a" />
      <Cyl args={[0.025, 0.025, 0.6, 8]} position={[0.55, 0.4, 0]} rotation={[0, 0, -Math.PI / 4]} color="#3a667a" />
      <Cyl args={[0.025, 0.025, 0.7, 8]} position={[0.0, 0.5, 0]} rotation={[0, 0, -Math.PI / 3.5]} color="#3a667a" />
      <mesh position={[-0.4, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.32, 0.04, 8, 24]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.6, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.32, 0.04, 8, 24]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <Box size={[0.22, 0.05, 0.09]} position={[0.0, 0.92, 0]} color={C.woodDark} />
      <Cyl args={[0.02, 0.02, 0.4, 8]} position={[0.0, 0.7, 0]} color="#3a667a" />
      <Cyl args={[0.02, 0.02, 0.5, 8]} position={[0.55, 0.6, 0]} rotation={[0, 0, Math.PI / 8]} color="#3a667a" />
      <Cyl args={[0.02, 0.02, 0.32, 8]} position={[0.55, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} color="#3a667a" />
      <Box size={[0.22, 0.15, 0.16]} position={[0.7, 0.7, 0]} color={C.awningA} />
    </group>
  )
}

function Couch() {
  // Footprint matches COUCH_BOX in @/seat: X [-1.1, 1.1], Z [-0.55, 0.35].
  // Seat surface around y ≈ SEAT_HEIGHT (0.45).
  return (
    <group position={[COUCH_POS.x, 0, COUCH_POS.z]}>
      {/* base / frame */}
      <Box size={[2.20, 0.40, 0.90]} position={[0, 0.20, -0.10]} color={C.couchBody} />
      {/* seat cushions */}
      <Box size={[0.62, 0.12, 0.70]} position={[-0.70, 0.46, -0.05]} color={C.couchCushion} />
      <Box size={[0.62, 0.12, 0.70]} position={[0.00, 0.46, -0.05]} color={C.couchCushion} />
      <Box size={[0.62, 0.12, 0.70]} position={[0.70, 0.46, -0.05]} color={C.couchCushion} />
      {/* backrest body */}
      <Box size={[2.20, 0.55, 0.20]} position={[0, 0.675, -0.45]} color={C.couchBody} />
      {/* back cushions */}
      <Box size={[0.62, 0.42, 0.14]} position={[-0.70, 0.66, -0.28]} color={C.couchCushion} />
      <Box size={[0.62, 0.42, 0.14]} position={[0.00, 0.66, -0.28]} color={C.couchCushion} />
      <Box size={[0.62, 0.42, 0.14]} position={[0.70, 0.66, -0.28]} color={C.couchCushion} />
      {/* armrests */}
      <Box size={[0.20, 0.55, 0.90]} position={[-1.00, 0.275, -0.10]} color={C.couchBody} />
      <Box size={[0.20, 0.55, 0.90]} position={[1.00, 0.275, -0.10]} color={C.couchBody} />
      {/* feet */}
      <Cyl args={[0.05, 0.05, 0.06, 10]} position={[-0.98, 0.03, -0.40]} color={C.couchPiping} />
      <Cyl args={[0.05, 0.05, 0.06, 10]} position={[0.98, 0.03, -0.40]} color={C.couchPiping} />
      <Cyl args={[0.05, 0.05, 0.06, 10]} position={[-0.98, 0.03, 0.20]} color={C.couchPiping} />
      <Cyl args={[0.05, 0.05, 0.06, 10]} position={[0.98, 0.03, 0.20]} color={C.couchPiping} />
    </group>
  )
}

export function Scene() {
  return (
    <>
      <Floor />
      <BrickWall size={[16.4, 6, 0.4]} position={[0, 3, -5.0]} facing="z" />
      <BrickWall size={[0.4, 6, 10.4]} position={[-8.2, 3, 0]} facing="x" />
      <Couch />
    </>
  )
}

function LockedCamera() {
  const ref = useRef()
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.lookAt(0, 1, 0)
      ref.current.updateProjectionMatrix()
    }
  }, [])
  return <OrthographicCamera ref={ref} makeDefault position={[16, 16, 16]} zoom={62} near={0.1} far={100} />
}

export default function CoffeeShop() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'linear-gradient(180deg, #fbe6c2 0%, #f5cf9a 55%, #e2a872 100%)' }}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <LockedCamera />
        <Lights />
        <Scene />
        <ContactShadows position={[0, 0.025, 0]} opacity={0.45} scale={30} blur={2.4} far={10} />
      </Canvas>
    </div>
  )
}
