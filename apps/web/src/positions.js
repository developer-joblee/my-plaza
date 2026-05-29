// Mapa de posições remotas fora do React — evita re-renders a 15 Hz.
// Shape por id: { x, z, dir, tx, tz, tdir }
//   x/z/dir    = valores interpolados atuais (escritos no useFrame)
//   tx/tz/tdir = alvos de rede (escritos pelo net.js a cada 'move')
export const positions = new Map()

export function setTarget(id, x, z, dir) {
  let p = positions.get(id)
  if (!p) {
    p = { x, z, dir, tx: x, tz: z, tdir: dir }
    positions.set(id, p)
    return
  }
  p.tx = x
  p.tz = z
  p.tdir = dir
}

export function ensure(id, x, z, dir) {
  if (!positions.has(id)) {
    positions.set(id, { x, z, dir, tx: x, tz: z, tdir: dir })
  }
}

export function remove(id) {
  positions.delete(id)
}
