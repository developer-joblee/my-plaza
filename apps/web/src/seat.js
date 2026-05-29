// Sofá encostado na parede do fundo (z=-5.0), deslocado para a esquerda.
// COUCH_POS é o centro do grupo do sofá em coords de mundo; tudo mais deriva dele.
export const COUCH_POS = { x: -2.5, z: -4.25 }

export const SEAT_POS = { x: COUCH_POS.x, z: COUCH_POS.z - 0.05 } // centro da almofada do meio
export const SEAT_HEADING = 0  // facing +Z (afastando-se da parede)
export const EXIT_POS = { x: COUCH_POS.x, z: COUCH_POS.z + 0.85 } // logo à frente do sofá
export const SEAT_HEIGHT = 0.45
export const INTERACT_RADIUS = 1.2

// AABB do sofá em coords de mundo. Origem do sofá: COUCH_POS.
// Geometria relativa (em CoffeeShop): X [-1.1, 1.1], Z [-0.55, 0.35].
export const COUCH_BOX = {
  minX: COUCH_POS.x - 1.1, maxX: COUCH_POS.x + 1.1,
  minZ: COUCH_POS.z - 0.55, maxZ: COUCH_POS.z + 0.35,
}

export const PLAYER_RADIUS = 0.25
