# Higgsfield Asset Registry

Every generated asset that touches the product, with its provenance, placement, and code-native fallback. Generation was authorized by the owner for the cinematic work. Model: Recraft 4.1 (images/vector), Seedance 2.0 / Kling 2.6 (video). Workspace: private (Ultra).

## Integrated

| Asset | Job ID | Model | Placement | Fallback | Status |
|---|---|---|---|---|---|
| GSN broadcast control-room plate | `0ad33e01-…250d` | recraft_v4_1 (2k, 16:9) | `/the-beat` broadcast backdrop, `public/immersive/gsn-broadcast-plate.webp`, via `GeneratedPlate` @ 20% opacity | `GeneratedPlate` gradient base (auto); reduced-motion safe (still only) | ✅ integrated |

Prompt (broadcast plate): "Premium low-light sports-intelligence broadcast control room, deep obsidian black, bioluminescent cyan and restrained ultraviolet edge glow, abstract out-of-focus data-light geometry and faint surveillance screens, soft volumetric haze, cinematic and sophisticated. Wide establishing plate with a darker calmer center reserved for UI overlay. No text, no logos, no people, no faces, no team marks, no scoreboard, no casino imagery."

## Reference only (informed the hand-built work, not shipped as-is)

| Asset | Job IDs | Model | Used for |
|---|---|---|---|
| Logo concepts (round 1) | `808c57b1`, `8c21d219`, `d77f7cc2`, `be24f053` | recraft_v4_1 vector | Direction for the new brand-family mark (split orbital ring + edge blade + core + ping). Owner liked it, asked for "more defined / recognizable". |
| Logo concepts (round 2, refined) | `7ae8dc48`, `8654fa8f`, `26a2eefd` (defined); `52615cc1`, `3104abcf`, `93ecce33` (abstract) | recraft_v4_1 vector | Refined directions. The hand-built canonical mark (`logo-mark-inline.tsx`, foolproof geometry) was crafted from this direction so it is verifiable and kinetic-safe. |

## Pending owner approval (Higgsfield MCP spend prompt)

| Asset | Model | Placement | Note |
|---|---|---|---|
| GSN broadcast motion plate | kling2_6 / seedance_2_0 (i2v from the plate, silent, loopable) | `/the-beat` backdrop `motion` | `generate_video` requires an interactive approval click; the still is the shipped fallback so nothing breaks if it never runs. |
| Cold-open intro title video | kling2_6 | montage motion bed | Replaces `home-hero-cosmos.mp4` bed when approved. |

## Rules honored

- Every generated asset has a code-native fallback and a placement; nothing photoreal, no faces, no team/league marks, no embedded fake text, no casino imagery.
- Stills are tiny (≈28KB webp) and decorative (low opacity); reduced-motion shows still/gradient only.
