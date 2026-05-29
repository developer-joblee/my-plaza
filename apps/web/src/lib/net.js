import { useStore } from '@/store'
import { ensure, setTarget, remove as removePos } from '@/positions'

const handlers = {
  welcome: () => {},
  join: () => {},
  leave: () => {},
  reset: () => {},
}

export function setNetHandlers(h) {
  Object.assign(handlers, h)
}

let socket = null

function resolveWsUrl(configured) {
  const base = configured || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'
  if (typeof window === 'undefined') return base
  // In production the configured URL is a real domain — use as-is
  if (!base.includes('localhost') && !base.includes('127.0.0.1')) return base
  // In dev, keep the port but use the actual page hostname so other devices
  // on the LAN connect to the right machine instead of their own localhost
  const port = new URL(base).port || '8080'
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.hostname}:${port}`
}

export function connect({ room = 'lobby', user, wsUrl } = {}) {
  if (socket) return socket

  const url = `${resolveWsUrl(wsUrl)}?room=${encodeURIComponent(room)}`
  socket = new WebSocket(url)

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
      t: 'hello',
      userId: user.id,
      name: user.name,
      color: user.color,
    }))
  })

  socket.addEventListener('message', (event) => {
    let msg
    try { msg = JSON.parse(event.data) } catch { return }
    handle(msg)
  })

  socket.addEventListener('close', () => {
    handlers.reset()
    useStore.setState((s) => ({ self: { ...s.self, id: null }, roster: new Map() }))
    socket = null
  })

  socket.addEventListener('error', () => socket?.close())

  return socket
}

function handle(msg) {
  if (msg.t === 'welcome') {
    const next = new Map()
    for (const p of msg.players ?? []) {
      next.set(p.id, { id: p.id, userId: p.userId, name: p.name, color: p.color })
      ensure(p.id, p.x, p.z, p.dir)
    }
    useStore.setState((s) => ({ self: { ...s.self, id: msg.id }, roster: next }))
    handlers.welcome(msg.id, msg.players ?? [])
    return
  }

  if (msg.t === 'join') {
    const { player } = msg
    if (!player) return
    ensure(player.id, player.x, player.z, player.dir)
    useStore.setState((s) => {
      const next = new Map(s.roster)
      next.set(player.id, { id: player.id, userId: player.userId, name: player.name, color: player.color })
      return { roster: next }
    })
    handlers.join(player)
    return
  }

  if (msg.t === 'move') {
    setTarget(msg.id, msg.x, msg.z, msg.dir)
    return
  }

  if (msg.t === 'leave') {
    removePos(msg.id)
    useStore.setState((s) => {
      if (!s.roster.has(msg.id)) return s
      const next = new Map(s.roster)
      next.delete(msg.id)
      return { roster: next }
    })
    handlers.leave(msg.id)
  }
}

const SEND_INTERVAL_MS = 1000 / 15
const HEARTBEAT_MS = 1500
let lastSentAt = 0
let lastSig = ''

export function sendMove(x, z, dir) {
  if (!socket || socket.readyState !== 1) return
  const now = performance.now()
  const dt = now - lastSentAt
  if (dt < SEND_INTERVAL_MS) return
  const qx = +x.toFixed(2)
  const qz = +z.toFixed(2)
  const qd = +dir.toFixed(2)
  const sig = `${qx},${qz},${qd}`
  if (sig === lastSig && dt < HEARTBEAT_MS) return
  lastSig = sig
  lastSentAt = now
  socket.send(JSON.stringify({ t: 'move', x: qx, z: qz, dir: qd }))
}

export function disconnectWS() {
  if (!socket) return
  socket.close()
  socket = null
}
