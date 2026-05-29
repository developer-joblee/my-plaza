import { useEffect } from 'react'
import { useStore } from '@/store'

const keys = new Set()

function pushInput() {
  let x = 0
  let z = 0
  if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1
  if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1
  const len = Math.hypot(x, z)
  if (len > 0) { x /= len; z /= len }
  useStore.setState({ input: { x, z } })
}

export function useKeyboardControls() {
  useEffect(() => {
    const onDown = (e) => {
      if (e.repeat || keys.has(e.code)) return
      keys.add(e.code)
      pushInput()
    }
    const onUp = (e) => { keys.delete(e.code); pushInput() }
    const onBlur = () => { keys.clear(); pushInput() }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
