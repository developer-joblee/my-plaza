// Singleton for the AudioContext, the local mic, and per-peer remote graphs.
// startAudio() MUST be called from a user-gesture handler.

let ctx = null
let micStream = null
const remoteAudio = new Map() // peerId -> { source, gain, sinkEl }

export function getCtx() {
  return ctx
}

export function getMicStream() {
  return micStream
}

export async function startAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) throw new Error('AudioContext não disponível neste navegador.')
    ctx = new Ctor({ latencyHint: 'interactive' })
  }
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  if (!micStream) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microfone não suportado neste navegador.')
    }
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })
  }
  return { ctx, micStream }
}

export function setMicEnabled(enabled) {
  if (!micStream) return
  for (const track of micStream.getAudioTracks()) {
    track.enabled = enabled
  }
}

export function attachRemoteStream(peerId, stream) {
  detachRemote(peerId)
  if (!ctx) return

  const source = ctx.createMediaStreamSource(stream)
  const gain = ctx.createGain()
  gain.gain.value = 1.0
  source.connect(gain)
  gain.connect(ctx.destination)

  // Chrome workaround: a MediaStream needs to be attached to an <audio> element
  // and play()'d for the Web Audio graph to actually pull data on some versions.
  const sinkEl = document.createElement('audio')
  sinkEl.muted = true
  sinkEl.autoplay = true
  sinkEl.srcObject = stream
  sinkEl.style.display = 'none'
  document.body.appendChild(sinkEl)
  sinkEl.play().catch(() => {})

  remoteAudio.set(peerId, { source, gain, sinkEl })
}

export function detachRemote(peerId) {
  const a = remoteAudio.get(peerId)
  if (!a) return
  try { a.source.disconnect() } catch { /* ignore */ }
  try { a.gain.disconnect() } catch { /* ignore */ }
  a.sinkEl.srcObject = null
  a.sinkEl.remove()
  remoteAudio.delete(peerId)
}

export function setRemoteGain(peerId, value) {
  const a = remoteAudio.get(peerId)
  if (!a || !ctx) return
  a.gain.gain.setTargetAtTime(value, ctx.currentTime, 0.05)
}

export function translateMediaError(err) {
  const name = err?.name ?? ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Permissão de microfone negada. Habilite no cadeado do navegador e tente de novo.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Nenhum microfone encontrado.'
  }
  if (name === 'NotReadableError') {
    return 'Microfone em uso por outro app. Feche e tente de novo.'
  }
  return err?.message || String(err)
}
