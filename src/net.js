import PartySocket from 'partysocket'
import { useStore } from './store'
import { ensure, setTarget, remove as removePos } from './positions'

const COLORS = ['#f4c95a', '#7ab8ff', '#ff7a5a', '#9d7ce0', '#5ac08a', '#e94a8d', '#ffb454']
const NAMES = ['Pinguim', 'Coelho', 'Lhama', 'Cacto', 'Lula', 'Croissant', 'Sapo', 'Bigode', 'Pão', 'Mochi']

const handlers = {
  welcome: () => {},
  join: () => {},
  leave: () => {},
  signal: () => {},
  reset: () => {},
}

export function setNetHandlers(h) {
  Object.assign(handlers, h)
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function defaultIdentity() {
  return {
    name: pick(NAMES) + ' ' + Math.floor(Math.random() * 100),
    color: pick(COLORS),
  }
}

let socket = null

export function connect({ room = 'lobby' } = {}) {
  if (socket) return socket

  const identity = defaultIdentity()
  useStore.setState({ self: { id: null, ...identity } })

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  socket = new PartySocket({
    host: isLocalhost ? 'localhost:1999' : window.location.host,
    room,
  })

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ t: 'hello', name: identity.name, color: identity.color }))
  })

  socket.addEventListener('message', (event) => {
    let msg
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }
    handle(msg)
  })

  socket.addEventListener('close', () => {
    handlers.reset()
    useStore.setState((s) => ({ self: { ...s.self, id: null }, roster: new Map() }))
  })

  return socket
}

function handle(msg) {
  if (msg.t === 'welcome') {
    const next = new Map()
    for (const p of msg.players ?? []) {
      next.set(p.id, { id: p.id, name: p.name, color: p.color })
      ensure(p.id, p.x, p.z, p.dir)
    }
    useStore.setState((s) => ({
      self: { ...s.self, id: msg.id },
      roster: next,
    }))
    handlers.welcome(msg.id, msg.players ?? [])
    return
  }

  if (msg.t === 'join') {
    const { player } = msg
    if (!player) return
    ensure(player.id, player.x, player.z, player.dir)
    useStore.setState((s) => {
      const next = new Map(s.roster)
      next.set(player.id, { id: player.id, name: player.name, color: player.color })
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
    return
  }

  if (msg.t === 'signal') {
    handlers.signal(msg.from, msg.payload)
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

export function sendSignal(to, payload) {
  if (!socket || socket.readyState !== 1) return
  socket.send(JSON.stringify({ t: 'signal', to, payload }))
}
