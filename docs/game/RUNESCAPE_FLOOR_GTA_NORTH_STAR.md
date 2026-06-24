# Galaxy Dynasty Pass/Fail Contract

Date: 2026-06-20

## RuneScape Floor

Galaxy Dynasty must clear a first-town RPG floor before it chases a larger city. The floor is:

- Persistent account.
- Avatar movement.
- Playable zones and district doors.
- NPCs with dialogue.
- Quests and missions.
- Sports IQ skills.
- Inventory, fictional items, and fictional cards.
- Repeatable tasks.
- System/ghost presence before live multiplayer.
- Sports weather and world state.
- Earned progression that writes back to the same Galaxy profile.

## GTA North Star

The north star is not crime, weapons, or licensed IP. The north star is a living sports city:

- District identity.
- Movement freedom.
- Missions and side activities.
- Crews and factions.
- Economy hooks that stay closed-loop and safe.
- Broadcast layer.
- Transit.
- Reputation.
- NPC life.
- Multiplayer rooms later.
- World events driven by sports weather.

## Galaxy Translation

- GTA city -> Galaxy Campus.
- GTA radio -> The Beat Broadcast.
- GTA missions -> Signal missions and sports-intelligence quests.
- GTA vehicles -> Campus transit, stadium tunnels, and future movement zones.
- GTA crews -> Galaxy crews and factions.
- GTA safehouse -> My Dynasty.
- GTA side activities -> Blacktop, Vault, Depths, Signal Duels, and proof rooms.
- GTA heat -> volatility pressure, sports weather, and market heat.
- RuneScape skills -> Sports IQ skill tree.
- RuneScape quests -> Galaxy mission chains.
- RuneScape inventory -> fictional cards, items, badges, and tools.

## Kill Criteria

Fail if the player thinks this is a dashboard with a mascot.

Pass if the player thinks this is the first town of a sports RPG.

Continue if the player thinks this can grow into a living sports city.

## Current Implementation

The first slice now lives in:

- `packages/galaxy-engine/src/game-kernel/`
- `packages/galaxy-spatial/`
- `apps/web/app/galaxy/campus/rookie-plaza/`
- `apps/web/lib/galaxy/rookie-plaza.ts`

Current renderer decision: Babylon is the Spatial OS engine for Rookie Plaza and The Beat; Phaser owns Blacktop; Colyseus owns the presence-room contract. Final authored assets and websocket hosting remain production tracks, not engine-selection blockers.
