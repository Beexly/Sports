# Failure Report — "Galaxy City" prototype

## What was attempted
A "closest to GTA" playable 3D experience, built fast via Three.js and deployed
through the Higgsfield apps engine to a public, shareable URL.

## What shipped
A single hand-coded Three.js scene: a night "city" of gray box buildings
(instanced cubes with a procedural window texture), an arcade hover-car, follow
camera, glowing "Signal" pickups, a timer, combo, and a score screen. Deployed +
listed; briefly promoted with a "Play Now" banner on the Galaxy Campus.

## Why it failed
- **It set a GTA-scale expectation and delivered a gray-box arcade.** The gap
  between "open-world sports MMORPG" and a box-city timed-collectathon is enormous,
  and the result read as cheap.
- **Map-before-world-system.** It tried to build geography before the persistent
  world (identity graph, sports weather, room registry, progression write-back).
  The map is not the product; the persistent sports-life graph is.
- **Hand-coded primitives, no art direction.** Box geometry + one procedural
  texture, no generated 3D models/textures/skybox/audio, no real lighting or
  composition. The polished reference games use a full asset pipeline; this skipped
  all of it to ship in one pass.
- **"Closest to GTA" was misread** as "make a tiny drivable city now" instead of
  "build toward GTA-grade engagement/retention via the world system, and only
  render premium rooms once they pass a quality bar."

## Resources used
- Higgsfield: 2 image generations (16:9 cover + 1:1 icon) + one game deploy.
  Account balance was healthy (~2,396 credits, Ultra) and remained so. No other
  paid spend.

## What must not be repeated
- No hand-coded gray-box "city" presented as a world.
- No public playable deployment before it passes the **Galaxy quality gate**
  (screenshots/video or local capture reviewed against the Visual Law; premium art
  direction; not primitives).
- No building geography before the world graph + progression write-back.
- No promoting an experiment as the product.

## Useful technical residue (kept under `experiments/failed-galaxy-city/`)
- A working Higgsfield **build→upload→deploy** path (zip layout, media upload, card
  images, deploy/publish) — valuable for *future* premium rooms that DO pass the gate.
- A clean Three.js solo-client skeleton (relative paths, fixed timestep, vendored
  deps, touch/keyboard/gamepad) — a starting point for a genuinely art-directed room.

## New rule (enforced)
**No public playable deployment until it passes the Galaxy quality gate.** Premium
rooms (e.g. The Vault gallery) are built with real assets + art direction, captured,
and reviewed before any public surface links to them. The world graph + persistent
identity come first; rooms are nodes that feed the one account.
