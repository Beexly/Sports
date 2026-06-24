# Galaxy Dynasty Studio Rescue Report

Date: 2026-06-20
Branch: `codex/galaxy-dynasty-studio-rescue-v2`

## What Changed

The rescue pass moved the build from placeholder registry/docs into a playable, repo-native game slice:

- Rookie Plaza is a Babylon first-town floor with keyboard movement, touch joystick, NPCs, quest board, inventory, Blacktop/Depths/Beat routing, and live room roster.
- Ghost presence is no longer only declared. It is disclosed, rendered, backed by a Colyseus room package, and surfaced through a local live-room adapter in the current Next route.
- The Beat Broadcast Wall is a Babylon spatial instrument with ledger backplane, broadcast rings, source ticks, urgency towers, confidence/calibration rings, route trails, and source ledger UI.
- Blacktop has a Phaser Signal Sprint court.
- The game kernel now includes IP-safe cinematic rules and a launch teaser beat sheet adapted from the Rockstar-style prompt without copying proprietary GTA/Rockstar assets or locations.
- The spatial package now records a procedural asset kit and explicitly marks final authored character/prop assets as the remaining art track.

## Placeholder Items Addressed

| Placeholder | Current State |
| --- | --- |
| Rookie Plaza primitive geometry | Replaced with multi-part procedural Babylon player/NPC/gate/marker kit plus asset manifest; final authored art still gated. |
| Ghost presence declared only | Added Colyseus package and local live-room adapter; UI shows room count and disclosed ghost/player roster. |
| Touch joystick missing | Added pointer joystick and merged movement vector with keyboard input. |
| Beat represented as node | Expanded into a full spatial instrument with multiple animated visual layers. |
| Babylon/Phaser/Colyseus engine choices | They are now installed, scoped, tested dependencies. Production hosting remains future work for Colyseus. |

## Repo-Derived Direction

The build uses repo/package patterns as mentors:

- Babylon.js for engine lifecycle, camera, materials, mesh primitives, cleanup.
- Phaser for the Blacktop minigame loop.
- Colyseus for schema room contracts.
- RuneScape floor logic for first-town NPCs, quests, inventory, skills, and grind.
- GTA north-star logic for city mood, route density, cinematic camera grammar, crews, safehouse, and broadcast wall, while staying original and IP-safe.

No external third-party source code, proprietary assets, logos, team marks, player likenesses, GTA locations, Rockstar characters, or UI/audio assets were copied into trunk.
