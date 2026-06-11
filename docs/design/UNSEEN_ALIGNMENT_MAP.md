# Unseen Studio Alignment Map

> Owner direction (2026-06-11): "I sent you some of the most visually stunning
> designs with unseen.co … That's the quality I want. All of their projects
> into our one. The overall theme is, interactive."

This is the standing translation table from Unseen Studio's portfolio
(unseen.co) into the Galaxy world. Every future visual/interaction pass MUST
pull from this map. Statuses: **SHIPPED** (live in code), **EXISTS** (the
pattern was already in our product DNA — deepen it), **ROADMAP** (needs a
dedicated build, plan noted).

## Project-by-project

### BlueYard (blueyard.com) — the closest sibling to our whole concept
"Users float in a galaxy where clusters represent industries; a bespoke
30,000-particle nebula IS the navigation."

| Signature | In Galaxy | Status |
|---|---|---|
| Galaxy clusters as navigation | Entrance waypoints are clickable doors — grab a destination as it flies past | SHIPPED |
| Drag/steer through space | Cursor steers the warp tunnel + waypoint field (CSS-var parallax, no re-render) | SHIPPED |
| Luminous particle orb / planet heroes | Destination orb at warp arrival (layered conic veils + bloom) | SHIPPED |
| LIVE ticker ribbon | Hero LIVE ribbon fed ONLY by real board state (rows cleared, gate holds, calibration, refresh) | SHIPPED |
| Type floating through atmosphere | Nebula hero + chrome headline treatments (Energi pass) | EXISTS |
| 30k-particle Houdini→WebGL nebula | True particle nebula for the entrance + observatory | ROADMAP¹ |

### unseen.co (the studio site)
| Signature | In Galaxy | Status |
|---|---|---|
| Click & Hold to enter | Boot phase: click & hold charges the warp (800ms ring); auto-engage fallback so nobody is blocked | SHIPPED |
| Custom cursor (dot + lagging ring, difference blend) | `GalaxyCursor` mounted site-wide; swells over interactives; off for touch/reduced-motion | SHIPPED |
| Film grain + vignette | `gse-grain`/`gse-vignette` on cinematic surfaces | EXISTS |
| Numbered exploration nav (01–04) | World chapters 00–09 + waypoint index | EXISTS |
| Sound toggle | Out of doctrine for now (no audio in entrance) | ROADMAP (only with owner ask) |

### Cult of the North — gamified navigation
| Signature | In Galaxy | Status |
|---|---|---|
| Navigation as a game | Waypoint-grab during warp; Cipher hunt (tokens hidden across rooms); Academy "train the pass" grading | SHIPPED / EXISTS |
| Recruitment-grade brand immersion | The world chapters as a journey, not a stack | EXISTS |

### Crosswire — the 3D world that represents the business
| Signature | In Galaxy | Status |
|---|---|---|
| 3D grid environment representing the customer's landscape | **Galaxy Twin / Observatory** — the slate as a living market map with gravity, pressure, edge windows | EXISTS (deepen: real-time nodes) |
| Small animated shapes = live users/features | Twin nodes + signal fragments; extend with live row events when board has volume | ROADMAP |

### Blue Marine / Dreamscapes — full-bleed scene worlds
| Signature | In Galaxy | Status |
|---|---|---|
| Full-bleed immersive scene per section | World chapters with nebula tones per chapter | EXISTS |
| Project-card gallery with distortion scroll | Engine/board card surfaces | ROADMAP² |

## ¹ The WebGL tier (decision needed from the owner)
BlueYard-class particle work is Three.js/custom WebGL with baked particle
data. Our current doctrine forbids new dependencies for visual work, so the
honest path is a deliberate exception: add `three` (or raw WebGL2 modules,
no framework) in a dedicated workstream with a perf budget (LCP unchanged,
lazy-loaded, reduced-motion fallback = current CSS warp). The existing
`ShaderAuroraLazy` proves the lazy-shader pattern works here.

## ² Scroll-distortion galleries
Needs the WebGL tier (render-to-texture). Same workstream.

## Hard lines that do NOT bend for aesthetics
Trust-safe copy, honest empty states, reduced-motion/AA accessibility,
no fake data in any visual, no second full-screen takeover.
