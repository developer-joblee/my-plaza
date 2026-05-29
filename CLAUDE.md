# myplaza — CLAUDE.md

## O que é este projeto

**myplaza** (nome do pacote: `my-voice-plaza`) é um espaço social multiplayer 3D em tempo real.
Usuários entram em uma "sala", são colocados numa cena de cafeteria 3D em perspectiva isométrica, podem andar pelo ambiente e ouvir/falar com os outros via voz proximal (WebRTC P2P).

Inspiração direta: Gather.town, mas construído do zero com primitivas web.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 8 |
| 3D | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Estado global | Zustand 5 |
| Tempo real (WebSocket) | PartyKit / PartySocket |
| Voz | WebRTC nativo + Web Audio API |
| Servidor de sala | PartyKit (Cloudflare Workers) — `party/index.ts` |

Linguagem do frontend: **JSX** (sem TypeScript). O servidor PartyKit é **TypeScript**.

---

## Estrutura de arquivos

```
src/
  App.jsx          — raiz, ErrorBoundary, troca EntryGate ↔ World
  EntryGate.jsx    — tela de entrada: escolha de sala + permissão de mic
  World.jsx        — cena 3D ativa: canvas, câmera follow, HUD
  CoffeeShop.jsx   — geometria estática da cena (paredes, móveis, decoração)
  Player.jsx       — avatares LocalPlayer e RemotePlayer (animação de andar)
  net.js           — WebSocket via PartySocket; mensagens: hello/welcome/join/move/leave/signal
  webrtc.js        — P2P audio: RTCPeerConnection, offer/answer, ICE via net.js
  audio.js         — singleton AudioContext, stream do mic, grafos de áudio remotos
  controls.js      — teclado (WASD/setas) → store.input
  positions.js     — Map module-level para posições remotas (fora do React, evita re-renders a 15Hz)
  store.js         — Zustand: { input, self, roster, micEnabled }

party/
  index.ts         — servidor PartyKit: Players Map, roteamento hello/move/leave/signal

partykit.json      — config do servidor (nome: my-voice-plaza, main: party/index.ts)
```

---

## Fluxo principal

### Entrada
1. `EntryGate` → usuário digita nome da sala → clica "Entrar"
2. `startAudio()` — cria `AudioContext` + pede `getUserMedia` (mic obrigatório para continuar)
3. `onEnter({ room })` → `App` passa para `<World room={room} />`

### Conexão
4. `World` monta → `connect({ room })` abre `PartySocket`
5. Socket `open` → envia `{ t: 'hello', name, color }` (identidade gerada aleatoriamente)
6. Servidor responde `{ t: 'welcome', id, players: [...] }` + broadcast `{ t: 'join', player }` para os outros

### Movimento
7. Teclado → `controls.js` → `store.input { x, z }`
8. `LocalPlayer.useFrame` lê input, atualiza `group.position`, chama `sendMove(x, z, dir)`
9. `sendMove` throttleia a 15 Hz + heartbeat de 1,5 s → envia `{ t: 'move' }` ao servidor
10. Servidor faz broadcast do `move` para os outros; `net.js` chama `setTarget` → `positions.js`
11. `RemotePlayer.useFrame` interpola posição/rotação a partir de `positions.get(id)`

### Voz (WebRTC)
12. `initWebRTC()` registra handlers em `net.js`
13. Ao receber `welcome`/`join`: `ensurePeer(id)` → cria `RTCPeerConnection`
14. O peer com ID menor faz a oferta; sinalização SDP + ICE via mensagens `{ t: 'signal' }`
15. `ontrack` → `attachRemoteStream` → Web Audio gain node → saída
16. `setMicEnabled` apenas habilita/desabilita as trilhas do `micStream` (não fecha a conexão)

### Saída
17. Socket fecha → `handlers.reset()` → fecha todos os peers, limpa roster e self.id

---

## Servidor PartyKit (`party/index.ts`)

Tipos de mensagem tratados:

| `t` | Direção | Ação |
|---|---|---|
| `hello` | client → server | Registra player, envia `welcome` ao remetente, broadcast `join` |
| `move` | client → server | Atualiza posição; broadcast `move` (exceto remetente) |
| `signal` | client → server | Relay de SDP/ICE para peer específico |
| `welcome` | server → client | Lista de players existentes + ID atribuído |
| `join` | server → broadcast | Novo player chegou |
| `leave` | server → broadcast | Player desconectou |

Estado em memória: `Map<string, Player>` — não persiste entre reinicializações.

---

## Identidade dos jogadores

Gerada aleatoriamente em `net.js` na conexão:
- **Nome**: `pick(NAMES) + ' ' + número` (ex: "Pinguim 42") — lista portuguesa de animais/comidas
- **Cor**: hex de uma paleta de 7 cores
- **Sem autenticação** — sem persistência entre sessões

---

## Câmera e coordenadas

- Câmera ortográfica isométrica: posição `[16, 16, 16]`, zoom `62`
- Input de teclado usa coordenadas de câmera (x/z da tela) → transformadas para world space via rotação 45° (`inputToWorld`)
- Bounds do player: `xMin: -3.7, xMax: 3.7, zMin: -1.3, zMax: 2.2`

---

## Comandos

```bash
npm run dev      # Vite (frontend) — porta 5173
npx partykit dev # Servidor PartyKit — porta 1999
npm run build    # Build de produção em dist/
npm run lint     # ESLint
```

`net.js` auto-detecta localhost para apontar ao servidor local (`:1999`) vs produção (`window.location.host`).

---

## Padrões e decisões de design

- **`positions.js` fora do React**: posições remotas são mutadas diretamente para evitar que updates de 15 Hz causem re-renders do React. Lidas apenas dentro de `useFrame`.
- **AudioContext singleton**: criado uma vez em `startAudio()`, reutilizado. Exige gesto do usuário (clique no botão Entrar).
- **Chrome workaround em `audio.js`**: `<audio>` element muted é necessário para que o Web Audio graph puxe dados em algumas versões do Chrome.
- **Offer/answer determinístico**: o peer com menor `id` (string comparison) sempre inicia o offer — evita glare sem coordenação extra.
- **ICE buffering**: ICE candidates recebidos antes do SDP remoto ficam em `pendingIce[]` e são aplicados após `setRemoteDescription`.
- **`showFrontWall={false}`** em `World.jsx`: a parede frontal da cafeteria é omitida para que a câmera veja o interior sem obstrução.

---

## Estrutura do monorepo (apps/)

O projeto foi migrado para monorepo npm workspaces:

```
apps/
  web/         ← Next.js 15 (frontend + auth + API)
  ws-server/   ← Node WebSocket (presença + posições)
supabase/
  migrations/  ← Schema SQL
docker-compose.yml
.env.example
```

### apps/ws-server
- Porta 8080, `GET /health` para healthcheck
- Aceita conexões WS com `?room=slug`
- Protocolo igual ao anterior, sem `signal` (LiveKit cuida do áudio)

### apps/web (Next.js 15 App Router)
```
src/
  app/
    (auth)/login/       ← Magic link (email)
    auth/callback/      ← Supabase OAuth callback
    (app)/lobby/        ← Lista de salas (server component)
    (app)/room/[slug]/  ← Mundo 3D (WorldLoader → WorldClient)
    api/livekit/token/  ← Gera JWT LiveKit
    api/rooms/          ← CRUD de salas
    api/rooms/[slug]/members/ ← Convidar/remover membros
  lib/
    supabase/client.js  ← Browser client
    supabase/server.js  ← Server client (SSR cookies)
    supabase/admin.js   ← Service role (mutações sem RLS)
    livekit.js          ← generateLiveKitToken (server-side)
    livekit-voice.js    ← LiveKit client (browser): connect/mic/screen
    net.js              ← WebSocket (posições) adaptado do original
  components/
    world/WorldClient.jsx  ← Cena 3D + EntryOverlay + HUD
    world/CoffeeShop.jsx   ← Geometria (igual ao original)
    world/Player.jsx        ← Avatares (igual ao original)
    lobby/RoomList.jsx      ← Lista + header
    lobby/CreateRoomModal.jsx
    lobby/MembersModal.jsx  ← Convidar/remover membros
  store.js / controls.js / positions.js ← igual ao original
```

### Env vars necessárias
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
NEXT_PUBLIC_LIVEKIT_URL
NEXT_PUBLIC_WS_URL
```

### Auth flow
Login via magic link (email) → Supabase cria sessão → middleware protege rotas `(app)/*` → perfil auto-criado via trigger no Supabase.

### Room access control
- Apenas membros da tabela `room_members` acessam a sala
- Dono convida via `POST /api/rooms/[slug]/members` com e-mail
- RLS: usuário vê apenas salas onde é membro

### Voice (LiveKit)
`livekit-voice.js` substitui `webrtc.js` + `audio.js`. Suporte a screen share já incluso (`startScreenShare()`).

## O que não existe ainda (possíveis próximas features)

- Nome customizável na entrada (hoje é aleatório)
- Áudio proximal espacial baseado em distância (hoje é flat — todos ouvem todos com volume igual)
- Persistência de salas
- Mais cenários além da cafeteria
- Avatar customizável
