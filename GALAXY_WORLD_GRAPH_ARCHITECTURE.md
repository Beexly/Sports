# Galaxy Dynasty — World Graph Architecture

The product is **not a 3D map**. It is a connected **sports-world graph**:

```
Account → Campus → Districts → Rooms → Sports Weather → Profile Progression
              ↘ Rewards · GSE · Crews · Cards · Factions · Seasons · Revenue ↙
```

The "open world" is the **live sports ecosystem**, not geography. Every node feeds
**one persistent account**. If an activity doesn't write back to the profile, it is
not part of Galaxy.

## Layers

### 1. Account layer (the save file)
`GalaxyProfile` + relations (Prisma): Sports IQ skills, Galaxy Score, Credits
(closed-loop), Prestige, cards + watchlist, rewards/merch, crew + lane, faction,
season progress + tier, equipped cosmetics, consumables/active effects, follows,
boss progress, duels, ratings. Source of truth for identity, economy, status.

### 2. Campus layer (the command map)
`apps/web/app/galaxy/page.tsx` renders: live **sports-weather** banner, a
personalized **"where to go next"** route, the **district grid** (with HOT markers
for weather-affected districts), profile + Galaxy Score summary, first-session
checklist, daily-streak claim. Reads `lib/galaxy/world-state.ts`.

### 3. District layer (nodes)
Single typed source of truth: **`@sports/galaxy-engine` → `world/districts.ts`**
(12 districts). Each `DistrictDef` declares: purpose, primary/daily/weekly actions,
reward, GSE/crew/faction/card/monetization hooks, `roomTypeNow`/`roomTypeFuture`,
required systems, locked future, brand motifs, metrics, testId, accent.
Districts: War Room, Proving Grounds, Blacktop, Depths, Vault, Crew Hall, Academy,
Creator Row, Merch Foundry, Signal Cup (Season Gate), Stadium Gates, My Dynasty.

### 4. Room layer (how a node is experienced)
**`world/rooms.ts`** Room Registry: per-room current vs future implementation,
recommended stack, persistence contract, API callbacks, required assets,
multiplayer need, risk, **quality gate**, test strategy. Room types: web-native,
solo-interactive, async-pvp, pvm-encounter, phaser-minigame, 2d-district,
colyseus-room, premium-3d-room, event-room, creator-room.

### 5. Sports-weather layer (the live world)
**`world/sports-weather.ts`**: 14 states (Upset Storm, Rookie Heat, Injury Fog,
Trade Shock, Playoff Pressure, Public Collapse, Card Heat, Rivalry Surge, Deadline
Shock, Championship Gravity, Fantasy Waiver Surge, Slump Watch, Breakout Signal,
Market Whiplash). Each shifts: district copy, quest recommendation, boss rotation,
card prompts, GSE prompt, crew/faction missions, admin alert. Deterministic by UTC
day now; interface designed so a **live sports feed replaces the rotation later**
without changing callers. Tests assert every weather points at real districts +
real bosses + carries hooks.

### 6. Progression layer (write-back)
Every room action routes through server libs to `applyReward` and friends, writing:
XP, Credits, Sports IQ, Galaxy Score inputs, card state, crew/faction contribution,
season points, reward wallet, GSE prompt history. Boosts multiply **only**
Credits + Season Points (never skill/rating/outcomes). All mutation is
server-side; the client never asserts a reward.

## Cross-cutting law
- **Calibration is the soul** (Sports IQ earned via graded confidence).
- **Credit Constitution**: closed-loop, no cash-out, no wagering stake (enforced
  in code + brand-gate tests).
- **Galaxy Standard + Visual/Language Law** on every surface (tests scan
  `/galaxy`).
- **Pay-to-win impossible**: cosmetics/boosts never alter outcomes (gate test).
- **Quality gate**: no public playable room ships before it passes review.

## Where the world renders next
Premium rooms (Babylon.js/PlayCanvas) attach to district nodes (Vault first), each
writing back to the account — the world deepens node-by-node, never as a monolith.
