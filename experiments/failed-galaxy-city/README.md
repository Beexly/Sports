# Galaxy City — playable 3D arcade (Higgsfield-deployed)

The first **playable 3D incarnation** of Galaxy Dynasty: a stylized night
sports-city you drive through collecting Signal orbs against the clock. Built with
Three.js, deployed to the Higgsfield apps engine as a shareable browser game.

- **Live:** https://joyful-field-633.higgsfield.gg/
- **Higgsfield game_id:** `7514cc77-3151-4ecb-ad39-a0b4b9b74dc1` (pass this back to
  `deploy_game` to UPDATE in place — never omit it for an update, or it forks a new game).

## Files (zip root layout required by the apps engine)

- `index.html` — the game (Three.js: night city, arcade driving, Signal pickups,
  combo, timer, HUD). Touch + keyboard + gamepad. Relative paths, fixed timestep.
- `logic.js` — solo rules stub (the platform requires a root rules module; the game
  is fully client-side).
- `strings.js` — all player-visible text (language swap = swap this file).
- `vendor/three.module.js` + `vendor/three.core.js` — vendored Three.js (no CDN).

## Build & deploy (reproducible)

```bash
# 1. Vendor Three (from the repo's installed dependency)
mkdir -p vendor
cp ../node_modules/three/build/three.module.js vendor/three.module.js
cp ../node_modules/three/build/three.core.js   vendor/three.core.js

# 2. Package (root layout — no wrapper dir)
zip -rq galaxy-city.zip index.html logic.js strings.js vendor

# 3. Deploy via Higgsfield MCP:
#    media_upload(galaxy-city.zip) -> PUT bytes -> media_confirm(type:file)
#    deploy_game(title, description, thumbnail 16:9, favicon 1:1, source_game=<zip url>, game_id=<above>)
```

Brand law: night sports city, black/gold/deep-blue, ~0 violence, no
casino/sportsbook iconography. Card art (thumbnail/favicon) generated via
Higgsfield with the mandatory Galaxy visual line.

## Roadmap (extends this trunk, not throwaway)

- Post score back to the player's Galaxy Profile (Credits/Season Points) via a
  signed callback → "everything feeds one character".
- More districts, drivable variety, missions (the GTA-style loop) — and
  eventually a funded full real-time 3D world.
