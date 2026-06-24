# Galaxy Dynasty Repo Extraction Matrix

Date: 2026-06-20

Shell access to GitHub API returned empty/unusable responses in this pass, so license fields below are marked `verify before copying` unless already established by local package metadata. No external code or assets were copied.

| Repo | Stack | Product role | Extract now | Copy code/assets | Recommendation |
| --- | --- | --- | --- | --- | --- |
| https://github.com/ssloy/tinyrenderer | C++ rendering education | Camera, rasterization, lighting vocabulary | Math and rendering fundamentals | No | Study only |
| https://github.com/lettier/3d-game-shaders-for-beginners | WebGL/shader education | Fog, lighting, post-processing vocabulary | Shader concepts for later polish | No | Study later |
| https://github.com/mosra/magnum | C++ engine framework | Scene abstraction and modular renderer discipline | Package boundaries and tests | No | Study later |
| https://github.com/sinanislekdemir/payton | Python 3D | Geometry prototyping ideas | None for trunk | No | Study only |
| https://github.com/zhu-xlab/GlobalBuildingAtlas | geospatial/building data | District massing and LOD thinking | Concept only | No | Study only |
| https://github.com/virtualglobebook/OpenGlobe | globe rendering | Streaming world concepts | Concept only | No | Study later |
| https://github.com/GlPortal/glPortal | portal game | Room transitions and spatial continuity | Portal/door mental model | No | Study later |
| https://github.com/godotengine/godot | game engine | Engine architecture reference | Node/scene ownership patterns | No | Study only |
| https://github.com/BabylonJS/Babylon.js | browser 3D engine | Rookie Plaza and The Beat spatial layer | Engine/Scene lifecycle, ArcRotateCamera, materials, mesh primitives, cleanup | No copied source; package dependency only | Shipped as scoped engine |
| https://github.com/libgdx/libgdx | Java game framework | Cross-platform loop/input lessons | Input abstraction ideas | No | Study later |
| https://github.com/4ian/GDevelop | event-system game tool | Quest/action authoring flow | Event-system design | No | Study later |
| https://github.com/phaserjs/phaser | browser 2D engine | Blacktop minigames | Scene/create/update/input/destroy loop | No copied source; package dependency only | Shipped for Blacktop |
| https://github.com/colyseus/colyseus | multiplayer rooms | Presence and small authoritative rooms | Schema room, MapSchema player state, join/leave/message contracts | No copied source; package dependency only | Shipped as presence package plus local adapter |
| https://github.com/RSamaium/RPG-JS | browser RPG | Quest, maps, NPC, inventory flow | RPG floor patterns | No | Study now |
| https://github.com/Kaetram/Kaetram-Open | browser MMO | MMO loop, NPCs, quests, inventory | Persistence and map flow concepts | No | Study now |
| https://github.com/ill-inc/biomes-game | web MMO | Entity and service boundaries | MMO architecture concepts | No | Study later |

## Current Extraction

- Built the game kernel as pure data and contracts, not copied source.
- Converted the spatial boundary to Babylon-first under `packages/galaxy-spatial`.
- Added Phaser for the Blacktop Signal Sprint court and Colyseus for the Rookie Plaza presence contract.
- Built Rookie Plaza as the first town with procedural Babylon geometry and an explicit authored-asset pipeline for final art.
- Adapted the new Rockstar-style video prompt into IP-safe Galaxy cinematic shot rules and launch teaser beats; no proprietary GTA locations, brands, sounds, missions, or characters are copied.

## Risks

- License verification must be rerun before copying code or assets.
- License verification must still happen before copying any third-party repo source or asset into trunk; current work uses installed package APIs and documented patterns only.
- Colyseus websocket hosting is not deployed yet; the playable web route uses a local live-room adapter that mirrors the room contract.
- Large cloned repos should stay outside the trunk under a gitignored research path.
- Generated assets require placement, fallback, quality gate, and owner approval before spend.
