import type * as Party from 'partykit/server'

type Player = {
  id: string
  name: string
  color: string
  x: number
  z: number
  dir: number
}

export default class WorldServer implements Party.Server {
  players = new Map<string, Player>()

  constructor(readonly room: Party.Room) {}

  onMessage(message: string, sender: Party.Connection) {
    let msg: any
    try {
      msg = JSON.parse(message)
    } catch {
      return
    }

    if (msg.t === 'hello') {
      const player: Player = {
        id: sender.id,
        name: String(msg.name ?? 'anon').slice(0, 24),
        color: String(msg.color ?? '#f4c95a').slice(0, 9),
        x: Number(msg.x) || 0,
        z: Number(msg.z) || 1,
        dir: Number(msg.dir) || 0,
      }
      this.players.set(sender.id, player)

      const others = [...this.players.values()].filter((p) => p.id !== sender.id)
      sender.send(JSON.stringify({ t: 'welcome', id: sender.id, players: others }))
      this.room.broadcast(JSON.stringify({ t: 'join', player }), [sender.id])
      return
    }

    if (msg.t === 'move') {
      const p = this.players.get(sender.id)
      if (!p) return
      p.x = Number(msg.x) || 0
      p.z = Number(msg.z) || 0
      p.dir = Number(msg.dir) || 0
      this.room.broadcast(
        JSON.stringify({ t: 'move', id: sender.id, x: p.x, z: p.z, dir: p.dir }),
        [sender.id],
      )
      return
    }

    if (msg.t === 'signal') {
      const to = String(msg.to ?? '')
      if (!to || !this.players.has(to)) return
      const target = this.room.getConnection(to)
      if (!target) return
      target.send(
        JSON.stringify({ t: 'signal', from: sender.id, payload: msg.payload }),
      )
    }
  }

  onClose(conn: Party.Connection) {
    if (this.players.delete(conn.id)) {
      this.room.broadcast(JSON.stringify({ t: 'leave', id: conn.id }))
    }
  }
}
