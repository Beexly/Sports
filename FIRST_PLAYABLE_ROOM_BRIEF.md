# First Playable Room Brief — The Vault (Premium Card Gallery)

**Recommendation:** the first premium playable room is **The Vault** — a premium 3D
card gallery — *not* a city. It connects to identity, cards, collection, display,
cosmetics, future commerce, and creator content; it is far easier to make visually
premium than a city; it produces screenshots; and it avoids the fake-GTA trap.

## One-sentence pitch
Step into your personal Vault — a luxury, card-vault-glow gallery where your cards
stand as lit pedestals you walk between, inspect, and show off.

## What the user does
Move through a small, gorgeous gallery; approach a card to inspect it (flip,
zoom, read GSE rating + form + value trend); toggle the watchlist; equip a card
frame cosmetic; share a Crib link. Start solo; later add presence (visitors).

## Why it matters
Cards become emotional before any marketplace exists. The Vault is the status room
of "My Dynasty" and the natural home of the cosmetics economy (frames, vault skins)
and the future marketplace.

## Design
- **Camera:** slow orbit / first-person "walk the gallery" with a gentle dolly;
  not twitchy. Controller-optional.
- **Movement:** point-to-move or WASD glide between pedestals; mobile = tap a
  pedestal to focus.
- **Interaction:** focus a card → inspect panel (DOM overlay) with companion data;
  buttons: Watch, Equip frame, Share.
- **Lighting/art:** black/gold/deep-blue, card-vault glow, stadium-light rims,
  clean stat geometry. Real materials (PBR), bloom, reflective floor. **No
  gray-box.**

## Assets (Higgsfield, briefs only until the quality gate)
Each brief carries the mandatory visual line. Card hero art, frame meshes/textures,
gallery environment (walls, floor, light rigs), skybox, ambient audio bed. Prefer
glTF; vendor nothing heavy into the trunk.

## Card display model
One pedestal per owned card; rarity drives frame + glow; momentum tags
(Breakout/Rookie Heat/Slump) shown as floating chips; GSE rating overlay.

## Persistence / callbacks (write-back)
Reads owned cards + watchlist; writes via `/api/galaxy/market` (watch) and
`/api/galaxy/cosmetics` (equip frame). No new economy. No cash, no custody.

## GSE + monetization connections
GSE rating overlay on every card (deepens GSE). Monetization: card-frame
cosmetics + vault skins (Nova test-mode) + the future marketplace — never
pay-to-win.

## Tech stack
- **Engine:** **Babylon.js** (Apache-2.0, TS-native, lazy-loaded on the room
  route) — or PlayCanvas/SuperSplat if a photoreal-splat direction wins.
- **Why not Three.js gray-box:** the failed Galaxy City proved hand-rolled
  primitives read as cheap; this room must use real assets + art direction in a
  proper engine.
- **Why not Phaser:** Phaser is 2D; the Vault is a premium 3D showcase.
- **Colyseus later:** add presence so friends can visit your Vault (8–16).

## No-credit prebuild plan
1. Build the room shell + camera + pedestal layout with placeholder primitives
   **locally only** (never deployed).
2. Wire inspect/watch/equip against the existing APIs.
3. Only then generate real assets (Higgsfield) and swap them in.

## Quality gate (must pass before any public link)
- Real art direction (no gray-box); 60fps on a mid phone; matches the Visual Law.
- Screenshots/video captured and reviewed against this brief.
- Watch/equip write-backs verified; brand-safe copy; tests green.
**Public deploy only after the gate passes** (the Galaxy City rule).
