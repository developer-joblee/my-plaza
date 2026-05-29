// Module-level mutable store for high-frequency remote player positions.
// Outside React so 15Hz updates don't trigger renders. Read in useFrame.
//
// Shape per id: { x, z, dir, tx, tz, tdir }
//   x/z/dir    = current interpolated values (driven by useFrame)
//   tx/tz/tdir = network targets (written by net.js on each 'move')
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
