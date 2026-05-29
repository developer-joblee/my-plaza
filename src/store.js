import { create } from 'zustand'

export const useStore = create(() => ({
  input: { x: 0, z: 0 },
  self: null,
  roster: new Map(),
  micEnabled: true,
}))
