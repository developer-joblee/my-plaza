import { create } from 'zustand'

export const useStore = create(() => ({
  input: { x: 0, z: 0 },
  self: null,           // { id, name, color }
  roster: new Map(),    // connId -> { id, userId, name, color }
  micEnabled: true,
  speaking: new Set(),  // set of LiveKit identities (Supabase user IDs) currently speaking
  nearSeat: false,
  sitting: false,
  standingUp: false,
}))
