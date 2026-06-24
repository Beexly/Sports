# Baseline Recovery Report

Date: 2026-06-20
Branch: `codex/galaxy-dynasty-studio-rescue-v2`

## Recovery Summary

The earlier placeholder path was replaced with repo-native game systems:

- Babylon-first spatial package for Rookie Plaza and The Beat.
- Phaser Blacktop Signal Sprint court.
- Colyseus Rookie Plaza presence package plus a local live-room adapter for the Next route.
- Game-kernel additions for quests, NPCs, inventory, skills, bosses, Blacktop games, ghost routes, reputation, and cinematic shot rules.
- Mobile touch joystick, keyboard movement, presence heartbeat, position sync, room roster, and richer procedural asset kit.

## Current Repo Truth

Babylon, Phaser, and Colyseus are no longer future dependency decisions. They are installed and scoped:

- `@sports/galaxy-spatial`: Babylon scene shell, materials, world builder, procedural asset kit, Beat instrument visuals.
- `apps/web/components/galaxy/blacktop-arcade.tsx`: Phaser-hosted Signal Sprint.
- `packages/galaxy-presence`: Colyseus room/schema contract.
- `apps/web/lib/galaxy/rookie-plaza-presence.ts`: local live-room adapter for the current Next app surface.

## Known Recovery Caveats

- Rookie Plaza has production-grade procedural Babylon geometry, not final authored character/environment assets.
- Colyseus websocket hosting is not deployed; the web app uses a local live-room adapter that mirrors the Colyseus contract.
- Mobile joystick is implemented, but full mobile browser QA remains a follow-up pass.
- The Beat is now a spatial instrument with rings, towers, source ticks, route trails, and ledger UI; final authored wall art remains asset-pipeline work.
- External repo code/assets were not copied into trunk. Current work uses installed package APIs, local package contracts, and repo-derived patterns.
