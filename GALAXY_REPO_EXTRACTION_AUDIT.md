# Galaxy Dynasty — External Repo Extraction Audit

Purpose: evaluate open-source engines/frameworks as **references and candidate
dependencies** for the world-graph rooms — not to blind-copy. Default posture is
**no-spend, notes-first**: extract patterns; clone into `research/external/` only
when a hands-on read is required; vendor a dependency only when it clearly fits the
Next.js/GSE stack and a room actually needs it.

Hard rules: no large external code pasted into the product trunk; no asset/IP
imported without explicit license safety; no heavy repos committed.

Stack context: Next.js 14 App Router + TS, Prisma/Postgres, `@sports/galaxy-engine`
(pure), NextAuth, Stripe (test). Rooms are nodes that write back to one account.

---

## A. Browser 3D / premium showcase rooms

### PlayCanvas (`playcanvas/engine`, `editor`, `awesome-playcanvas`, `supersplat`)
- **Status/license:** mature, actively maintained; engine **MIT**. Editor is a
  hosted SaaS (free tier) — not self-hosted OSS.
- **Runtime fit:** WebGL/WebGPU engine, small runtime, loads in a Next.js client
  component or an iframe-embedded build. Good mobile performance. SuperSplat =
  Gaussian-splat viewer (photoreal scenes) — interesting for a premium Vault.
- **Solves:** premium single 3D **rooms** (Vault gallery, War Room Plaza, Crew
  Clubhouse, Championship Gate, Merch Foundry) with real art direction.
- **Doesn't solve:** persistence, multiplayer, our economy — those stay in the trunk.
- **Risks:** editor lock-in (mitigate by using the MIT engine + glTF assets);
  asset pipeline discipline required (no AI-slop).
- **Recommendation:** **study now, strong candidate** for the first premium room
  (Vault). Prefer engine (MIT) + glTF over editor lock-in. Clone `engine` +
  `awesome-playcanvas` to `research/external/` for reference only.

### Babylon.js (`BabylonJS/Babylon.js`)
- **Status/license:** very mature, **Apache-2.0**, excellent docs, TS-native.
- **Fit:** first-class TS, npm dependency, integrates cleanly with Next client
  components; strong PBR, GUI, glTF, WebXR.
- **Solves:** same premium-room use as PlayCanvas, with the cleanest TS/npm DX.
- **Risks:** bundle size (code-split / lazy-load the room route only).
- **Recommendation:** **co-finalist with PlayCanvas.** For our TS/npm stack,
  Babylon is the lower-friction dependency. **Decision:** pick **Babylon.js** for
  the first premium room unless a splat-photoreal direction wins, in which case
  PlayCanvas SuperSplat. Lazy-load on the room route only.

## B. 2D / 2.5D browser MMO district references

### RPG-JS (`RSamaium/RPG-JS`)
- **License:** MIT. RPG/MMO framework (tilemaps, events, online).
- **Use:** **pattern reference** for tile districts, NPCs, zones, world transitions.
- **Risks:** opinionated runtime; integrating into Next is heavy. **Reject as
  dependency; study patterns only.**

### Kaetram (`Kaetram/Kaetram-Open`)
- **License:** MPL-2.0. Live browser MMORPG (BrowserQuest descendant).
- **Use:** excellent **architecture reference** for map/zones/inventory/quests/
  persistence/chat at scale. Do not import assets (IP/asset rights).
- **Recommendation:** **study only** — clone to `research/external/` for reading
  the server/world structure; extract patterns for a future 2D district.

### BrowserQuest (`mozilla/browserquest`)
- **License:** MPL-2.0/CC; **archived/old.** Classic teaching reference for a tiny
  browser MMO loop. **Study only; do not depend.**

### Biomes (`ill-inc/biomes-game`)
- **License:** MIT (archived). Full TS web voxel MMO — heavy.
- **Recommendation:** **defer/reject** as base; optional deep-read for an
  ambitious later district. Too large to adopt now.

## C. Fast browser game loops / Blacktop

### Phaser (`phaserjs/phaser`)
- **License:** MIT, mature, huge ecosystem, TS types.
- **Fit:** great for juicy 2D arcade loops; embeds in a client component.
- **Solves:** Blacktop mini-games (stat races, trivia duels, value guesses) with
  better game-feel than hand-rolled React.
- **Recommendation:** **adopt when a Blacktop mode needs real motion/feel.** Today
  **Signal Sprint ships in React** (no dep). Migration note recorded; add Phaser
  only when the feel demands it (lazy-loaded on the Blacktop route).

### Colyseus Phaser examples (`colyseus/tutorial-phaser`)
- **Use:** reference for wiring Phaser to authoritative rooms. **Study only.**

## D. Multiplayer rooms

### Colyseus (`colyseus/colyseus`)
- **License:** MIT, mature authoritative multiplayer (rooms, state sync, presence).
- **Fit:** Node server; deploy alongside (separate service) — not inside Next RSC.
- **Solves:** small authoritative rooms (Crew Hall presence, Blacktop lobby, live
  Signal Duel, boss raid, event/chat) at 8–16 players to start.
- **Risks:** new service to host/operate; schedule after async versions prove demand.
- **Recommendation:** **adopt later** as the room server when we go from async →
  live. Start at 8–16/room. **Do not build the MMO server first.**

## E. Later backend candidate

### Nakama (`heroiclabs/nakama`)
- **License:** Apache-2.0; heavyweight game backend (matchmaking, chat,
  leaderboards, storage, RT multiplayer; Go + embedded DB).
- **Recommendation:** **evaluate only / defer.** Our GSE + Prisma + (future)
  Colyseus covers the near term. Revisit if matchmaking/leaderboards/social scale
  outgrow the current stack. Adopting now would duplicate our identity/economy.

## F. WebXR / social 3D experiments

### networked-aframe (`networked-aframe/networked-aframe`)
- **License:** MIT. Multi-user WebVR/3D over WebRTC/WebSocket on A-Frame.
- **Recommendation:** **experiment-only/defer** — a future "users standing
  together in a virtual War Room." Not the trunk.

### Croquet Microverse (`croquet/microverse`, `create-croquet-microverse`)
- **License:** Apache-2.0 (Microverse). Synchronized multiuser 3D worlds.
- **Recommendation:** **experiment-only/defer.** Audit later for social 3D; do not
  make it the default trunk.

---

## Decisions (logged)

- **Premium rooms:** Babylon.js (Apache-2.0) as the default 3D room engine;
  PlayCanvas/SuperSplat if a photoreal-splat direction wins. Lazy-load per room.
- **Blacktop:** React now; Phaser (MIT) only when feel demands it.
- **Live multiplayer rooms:** Colyseus (MIT) as the room server when async → live.
- **Backend:** keep GSE + Prisma; Nakama deferred/evaluate-only.
- **2D district / social-3D:** Kaetram + RPG-JS + Croquet/NAF = study-only.
- **No external assets** imported without explicit license clearance. Clones go to
  `research/external/` (gitignored), never the trunk.
