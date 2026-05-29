import { createServer } from 'http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8080

// rooms: slug -> Map<connId, { ws, player }>
const rooms = new Map()
let seq = 0

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x')
  const roomSlug = (url.searchParams.get('room') || 'lobby').slice(0, 64)
  const connId = String(++seq)

  if (!rooms.has(roomSlug)) rooms.set(roomSlug, new Map())
  const room = rooms.get(roomSlug)

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.t === 'hello') {
      const player = {
        id: connId,
        userId: String(msg.userId || connId),
        name: String(msg.name || 'anon').slice(0, 32),
        color: String(msg.color || '#f4c95a').slice(0, 9),
        x: 0,
        z: 1,
        dir: 0,
      }
      room.set(connId, { ws, player })

      const others = [...room.values()]
        .filter((e) => e.player.id !== connId)
        .map((e) => e.player)

      send(ws, { t: 'welcome', id: connId, players: others })
      broadcast(room, { t: 'join', player }, connId)
      return
    }

    if (msg.t === 'move') {
      const entry = room.get(connId)
      if (!entry) return
      entry.player.x = +Number(msg.x).toFixed(2)
      entry.player.z = +Number(msg.z).toFixed(2)
      entry.player.dir = +Number(msg.dir).toFixed(2)
      broadcast(room, {
        t: 'move',
        id: connId,
        x: entry.player.x,
        z: entry.player.z,
        dir: entry.player.dir,
      }, connId)
      return
    }
  })

  ws.on('close', () => {
    if (room.delete(connId)) {
      broadcast(room, { t: 'leave', id: connId })
    }
    if (room.size === 0) rooms.delete(roomSlug)
  })

  ws.on('error', () => ws.terminate())
})

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}

function broadcast(room, msg, excludeId) {
  const data = JSON.stringify(msg)
  for (const [id, { ws }] of room) {
    if (id === excludeId) continue
    if (ws.readyState === 1) ws.send(data)
  }
}

server.listen(PORT, () => {
  console.log(`[ws-server] listening on :${PORT}`)
})
