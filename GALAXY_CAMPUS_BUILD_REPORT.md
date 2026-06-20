# Galaxy Dynasty — Campus / World-Graph Build Report

Continuation after the failed Galaxy City prototype. Strategy corrected: **the
world is a graph, not a 3D map.** The Campus is the command map; districts are
nodes; sports weather is the live world; the profile is the save file.

## What changed (architecture)
- Pivoted from "build the map" to **build the world system**. The persistent
  identity + economy + live sports layer is the product; rooms are nodes that feed
  one account.
- Introduced a typed **world graph** in `@sports/galaxy-engine/world/`:
  District Registry (12), Sports Weather (14), Room Registry.

## Failed prototype — contained (Phase 1)
- Galaxy City removed from all primary surfaces (no Campus banner, no
  `GALAXY_CITY_GAME_URL`); source archived to `experiments/failed-galaxy-city/`;
  `FAILURE_REPORT_GALAXY_CITY.md` written; brand-gate test asserts no Galaxy UI
  promotes it. The deployed Higgsfield game remains live at its URL but is
  surfaced nowhere (delisting would need a separate tool/owner action — documented).
- **New rule enforced:** no public playable deployment until it passes the Galaxy
  quality gate.

## Repos audited (Phase 2 — notes only, no clones committed)
`GALAXY_REPO_EXTRACTION_AUDIT.md`. Decisions: **Babylon.js** (Apache-2.0) as the
default premium-3D-room engine (PlayCanvas/SuperSplat if photoreal-splat wins);
**Phaser** for Blacktop only when feel demands (React now); **Colyseus** as the
live-room server when async→live; **Nakama** deferred/evaluate-only; Kaetram /
RPG-JS / Croquet / networked-aframe = study-only. No external assets/IP imported.

## What was built
- **World graph engine:** `world/districts.ts`, `world/sports-weather.ts`,
  `world/rooms.ts` (+ exports + completeness tests).
- **World-state service:** `lib/galaxy/world-state.ts` (`getGalaxyWorldState`,
  `getRecommendedRoute`) — deterministic now, live-feed-ready.
- **Campus** upgraded into the command map: live weather banner, "where to go
  next" decision helper, rich district grid with HOT markers.
- **Stadium Gates** (`/galaxy/stadium`): sport campaign portals driven by weather.
- **Signal Sprint** (`/galaxy/blacktop`): a 5-prompt rapid sports-IQ mini-game with
  signal tags (server-graded, React). Not gambling — IQ training.
- **Admin observability**: live weather + world-graph size on the owner console.
- Docs: world-graph architecture, repo audit, first-playable brief, this report.

## Already in place (Stage 2 + deepening, retained)
Sports IQ + calibration grading, Credit Constitution, Signal Duel + ranked ladder,
5 Depths bosses + crew co-op raids, Season Cup + objectives + Pro track, Crew
Utility (8 lanes/missions/clash/leaderboard), card watchlist + momentum tags + card
detail, Faction War, Creator Gauntlet, cosmetics economy + Wardrobe, boosts/
consumables (no pay-to-win), Cribs + Friends, Galaxy Score, GSE Pro gating
("vision, not wins"), brand/compliance gates.

## Intentionally deferred
Premium 3D rooms (Babylon — Vault first, behind the quality gate), live multiplayer
rooms (Colyseus), 2D districts, real marketplace/custody, the funded full 3D world.

## Tests run
- `@sports/galaxy-engine`: **84** pass; typecheck 0.
- Web Galaxy: **98** pass (first-session, stage2, language-law, schema-sync,
  engine-v0, brand-gates). **182 Galaxy tests total.**
- Brand-safety suite: **2209** pass (no regressions). Web typecheck 0; lint clean;
  production build succeeds (~22 Galaxy pages + 14 API routes).

## Risks
- Migration not yet applied (additive models; owner runs `db:push`/`db:migrate`).
- Galaxy City deploy still live externally (not promoted; delist via owner/tool).
- Read-then-write reward paths; wrap in transactions at scale.

## Current build status
Green. The Campus reads as the command map for a living sports world.

## Next recommended step
Build **The Vault** premium card gallery (Babylon.js) per `FIRST_PLAYABLE_ROOM_BRIEF.md`
— local prebuild with placeholders, wire watch/equip write-backs, then real assets,
then capture + pass the quality gate **before** any public link. It is the
GTA-flavored "wow" that is genuinely achievable and on-brand — and the first room
to prove the no-gray-box quality bar.
