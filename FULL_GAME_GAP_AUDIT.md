# Galaxy Dynasty Full Game Gap Audit

Updated: 2026-07-04

## Placeholder Closures In This Pass

- Rookie Plaza primitive-only runtime was replaced with a real GLB loading path and an in-repo generated GLB city kit.
- Ghost presence was replaced with `/api/galaxy/rookie-plaza`, an in-memory live room snapshot consumed by the HUD.
- Touch joystick now has a visible knob state, mobile-only detection, and movement input.
- Beat Broadcast Wall now has WebAudio interaction, pulse rings, waveform bars, emissive animation, and selectable HUD controls.
- Babylon and Phaser are not part of this slice; Three.js is the locked runtime for the playable route.
- UE5-inspired placeholders are now represented with web-native equivalents: streamed campus chunks, Rapier rigid bodies, Three particles, WebAudio synth, and deterministic PCG props/routes.
- Lumen and Nanite tuning is now explicit in runtime constants and the GLB manifest instead of being only descriptive language.

## GTA-Feel Targets Now Represented

- Third-person chase camera with exponential damping.
- Smooth acceleration, sprint, jump, and directional facing.
- Night-city streets, sidewalks, high-rise silhouettes, parked vehicles, neon gates, fog, ACES tone mapping, and bloom.
- Minimap and nearest-route prompt.
- Route readability across Rookie Plaza, The Beat, Blacktop, Depths, and Vault.

## RuneScape-Hub Targets Now Represented

- Readable walkable plaza floor.
- Strong district routes from center hub to named anchors.
- NPC silhouettes stationed around route starts.
- Quest kiosks and district gates.
- Dense dressing without covering the playable center.

## Nanite/Lumen Web Equivalents Now Represented

- GLB kit contract with a HIGGSFIELD-style manifest.
- Distance-priority object visibility as the first Nanite-style culling layer.
- Manifest cluster budget of 128 triangles per future import chunk.
- Dynamic emissive materials, tone mapping, fog, moon/hemi lights, point lights, and bloom as the current Lumen-style web lighting stack.
- World Partition equivalent: north/east/south/west campus chunks load and unload by player distance.
- Pixel LOD equivalent: chunk high/low instanced meshes switch by projected screen size and frustum visibility.
- Priority streaming equivalent: each world partition chunk has a generated GLB URL, async load state, load priority, and HUD-visible virtual memory usage.
- Lumen settings equivalent: GI quality, reflection quality, surface cache resolution, screen probe count, final gather rays, trace distance, temporal blend, bloom settings, and SDF steps are represented as runtime-tunable values.
- Surface Cache/SDF equivalent: a custom shader field under the player visualizes low-cost bounce/probe coverage without blocking gameplay readability.
- Chaos equivalent: Rapier dynamic props bounce inside fixed plaza boundaries.
- Niagara equivalent: Beat Wall particle field animates in Three.js points.
- MetaSounds equivalent: Beat pulses use layered oscillators, filter sweep, and gain envelope.
- PCG equivalent: deterministic instanced chunk props and route markings generate from seeds.

## Honest Remaining Gaps

- This is not literal GTA or UE5 Nanite/Lumen. It is an IP-safe browser vertical slice.
- The GLB kit is generated in-repo from original mesh data. It is now loaded as GLB, but it is not final hand-authored commercial art.
- Full Colyseus WebSocket multiplayer needs a standalone server process and deployment target.
- Vehicle driving, ragdoll physics, Rapier collision bodies, multi-map streaming, quest persistence, and NPC AI remain Phase 2+.
- Licensed external model packs were not imported because no license-clean pack was already present in the branch and the referenced GTA clone has no root license to copy from.
- Literal GPU Nanite cluster rasterization and Lumen GI are not available in browser Three.js; this branch implements practical web analogs with explicit settings, chunk files, and QA checks while recording that boundary.
