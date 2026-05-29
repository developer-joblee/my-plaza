import { setNetHandlers, sendSignal } from './net'
import { getMicStream, attachRemoteStream, detachRemote } from './audio'

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

let myId = null
const peers = new Map() // peerId -> { pc, pendingIce, remoteSet }
let initialized = false

export function initWebRTC() {
  if (initialized) return
  initialized = true
  setNetHandlers({
    welcome: (id, others) => {
      myId = id
      for (const p of others) ensurePeer(p.id)
    },
    join: (player) => {
      ensurePeer(player.id)
    },
    leave: (peerId) => {
      closePeer(peerId)
    },
    signal: (from, payload) => {
      handleSignal(from, payload).catch((err) => {
        console.error('[webrtc] signal error', from, err)
      })
    },
    reset: () => {
      for (const id of [...peers.keys()]) closePeer(id)
      myId = null
    },
  })
}

function ensurePeer(peerId) {
  if (peerId === myId) return null
  const existing = peers.get(peerId)
  if (existing) return existing

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  const state = { pc, pendingIce: [], remoteSet: false, peerId }
  peers.set(peerId, state)

  const mic = getMicStream()
  if (mic) {
    for (const track of mic.getAudioTracks()) {
      pc.addTrack(track, mic)
    }
  } else {
    // No mic available — still receive remote audio.
    pc.addTransceiver('audio', { direction: 'recvonly' })
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal(peerId, { kind: 'ice', candidate: event.candidate.toJSON() })
    }
  }

  pc.ontrack = (event) => {
    const stream = event.streams[0]
    if (stream) attachRemoteStream(peerId, stream)
  }

  pc.oniceconnectionstatechange = () => {
    const s = pc.iceConnectionState
    if (s === 'failed' || s === 'disconnected') {
      console.warn('[webrtc]', peerId, 'iceConnectionState=', s)
    }
  }

  if (myId && myId < peerId) {
    // We're the initiator: lower id makes the offer.
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        sendSignal(peerId, { kind: 'sdp', sdp: pc.localDescription.toJSON() })
      })
      .catch((err) => console.error('[webrtc] offer error', peerId, err))
  }

  return state
}

async function handleSignal(from, payload) {
  const state = ensurePeer(from)
  if (!state) return
  const { pc } = state

  if (payload.kind === 'sdp') {
    const desc = new RTCSessionDescription(payload.sdp)
    await pc.setRemoteDescription(desc)
    state.remoteSet = true
    while (state.pendingIce.length) {
      const cand = state.pendingIce.shift()
      try {
        await pc.addIceCandidate(cand)
      } catch (err) {
        console.warn('[webrtc] addIceCandidate failed', err)
      }
    }
    if (desc.type === 'offer') {
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal(from, { kind: 'sdp', sdp: pc.localDescription.toJSON() })
    }
    return
  }

  if (payload.kind === 'ice') {
    const cand = new RTCIceCandidate(payload.candidate)
    if (state.remoteSet) {
      try {
        await pc.addIceCandidate(cand)
      } catch (err) {
        console.warn('[webrtc] addIceCandidate failed', err)
      }
    } else {
      state.pendingIce.push(cand)
    }
  }
}

function closePeer(peerId) {
  const state = peers.get(peerId)
  if (!state) return
  try {
    state.pc.close()
  } catch {
    // already closed
  }
  peers.delete(peerId)
  detachRemote(peerId)
}
