import { Room, RoomEvent, Track } from 'livekit-client'

let room = null

export async function connectVoice(url, token) {
  if (room) return room

  if (typeof window !== 'undefined' && !navigator.mediaDevices) {
    throw new Error(
      'Microfone bloqueado: acesse via HTTPS ou localhost, ou ative a flag chrome://flags/#unsafely-treat-insecure-origin-as-secure para este endereço.',
    )
  }

  room = new Room({
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  // Anexa manualmente cada track de áudio remoto ao DOM — necessário para
  // garantir playback em todos os browsers mesmo sem gesto explícito na track
  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind !== Track.Kind.Audio) return
    const el = track.attach()
    el.setAttribute('data-livekit', 'audio')
    document.body.appendChild(el)
    el.play().catch(() => {})
  })

  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    if (track.kind !== Track.Kind.Audio) return
    track.detach().forEach((el) => el.remove())
  })

  // startAudio deve ser chamado antes do connect para ficar no contexto de gesto do usuário
  room.startAudio().catch(() => {})

  await room.connect(url, token)
  await room.localParticipant.setMicrophoneEnabled(true)

  return room
}

export function getLiveKitRoom() {
  return room
}

export function setMicEnabled(enabled) {
  if (!room) return
  room.localParticipant.setMicrophoneEnabled(enabled)
}

export async function startScreenShare() {
  if (!room) return
  await room.localParticipant.setScreenShareEnabled(true)
}

export async function stopScreenShare() {
  if (!room) return
  await room.localParticipant.setScreenShareEnabled(false)
}

export function disconnectVoice() {
  if (!room) return
  room.disconnect()
  room = null
  document.querySelectorAll('[data-livekit="audio"]').forEach((el) => el.remove())
}

export function onParticipantEvent(event, handler) {
  if (!room) return
  room.on(event, handler)
  return () => room?.off(event, handler)
}

export function onActiveSpeakersChanged(handler) {
  if (!room) return () => {}
  room.on(RoomEvent.ActiveSpeakersChanged, handler)
  return () => room?.off(RoomEvent.ActiveSpeakersChanged, handler)
}
