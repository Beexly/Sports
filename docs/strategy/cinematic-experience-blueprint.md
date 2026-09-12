# Cinematic Experience Blueprint — GSE / Sports

Distilled 2026-09-12 from a deep-audit review of award-winning immersive studios (Unseen, Trionn, Igloo Inc, Monolith, La Revoltosa) plus production/legal requirements. Purpose: one reference doc for the Sports frontend's cinematic layer. The commerce/VAT/tax content was out of scope for Sports (no storefront yet) and was dropped; what remains is the **creative architecture** and the **production floor** that applies to any immersive route.

## A. The philosophy (what actually separates award work)

1. **One building, rest is camera work.** You need ONE well-built world, explored intentionally. The camera is the storyteller; assets are supporting evidence. Not a thousand 3D assets.
2. **Pipeline > pixels.** Unseen extended Theatre.js with a filesystem API + built their own version control into the Theatre GUI because designers kept overwriting each other's state files. The pipeline that lets a team iterate without breaking each other's work is the real deliverable.
3. **Bake everything you can, render only what must be live.** ZERO compressed over 1GB of source assets into a 10MB site at 60fps on a budget Android phone. That is authoring/compression work done before the browser ever sees the file — not a rendering trick.

## B. The architecture layers

### Layer 1 — Single Canvas Doctrine
- One persistent WebGL canvas behind the DOM; every "page" is a camera position inside that canvas.
- DOM (text, buttons, commerce) scrolls independently, synced to the 3D timeline.
- Multiple canvases/contexts kill performance (browser 3D-context limits).
- Trionn chose NOT to use React Three Fiber for the continuous-world case — they manage the Three.js renderer outside React's lifecycle to avoid re-render overhead. R3F is great for componentized scenes, a liability when the whole site is one world.

### Layer 2 — The Scroll Must Be Yours
- Native scroll is not the animation driver; a single normalized progress value is. The scroll is a timeline scrubber, not a browser feature.
- Lenis: virtual scroll position decoupled from native scroll, drives animations. GSAP ScrollSmoother: alternative when GSAP owns everything.

### Layer 3 — The Gate System
- Major section transitions require an interaction (draw a zero, hold to shatter, hold to launch). Gates convert "website" into "experience" — passive scroller → participant.
- BlueYard's orb responds to mouse VELOCITY (physics feel), not just position.

### Layer 4 — The Asset Pipeline
```
Blender / Houdini → gltf-transform optimize (Draco + KTX2 in one command) →
gltfjsx (compress + convert to JSX) → custom Theatre.js sequences →
web worker loading with progress → single WebGL scene
```
- `gltf-transform optimize` alone often drops file size 80%+ (Draco + KTX2 in one pass). This is the ZERO compression secret — a CLI tool, not a proprietary algorithm.
- ASTC texture compression mandatory for mobile; 4K textures for every material crash mobile GPUs.
- Distant objects: bake lighting into lightmaps, use unlit shaders.

### Layer 5 — Procedural Where Possible
- Igloo didn't model ice blocks — crystal-growth algorithm simulates ice inside a container; every enclosure unique. Build generators, not hand-authored assets.
- For a digital-goods store: product visualizations procedurally generated from product data, not pre-rendered per SKU.

## C. Toolchain (with the insight for each)

| Tool | Insight |
|---|---|
| Theatre.js | Primary camera choreography tool; hook EVERY animatable property (camera, lights, materials, shader uniforms); single source of truth for the scene timeline |
| GSAP + Lenis | Not competitors: GSAP = component-level animations + page transitions; Lenis = smooth-scroll sync. Use GSAP matchMedia() so desktop/mobile have entirely separate animation logic |
| Three-VFX / three.quarks | GPU-accelerated particle systems with visual editors — Unseen-quality particles without writing every system from scratch |
| Rapier | Physics-based particle collision (Unseen's particle lab) — particles feel physical, not animated |
| Draco + KTX2 | Non-negotiable for the 10MB target |

**Theatre.js vs GSAP — the real distinction:** GSAP ScrollTrigger is "defined in code"; Theatre.js is "defined in a timeline UI + played in code." Designer wants to choreograph without touching code → Theatre.js. Programmatic control with precise easing/scroll triggers → GSAP. Use Theatre.js for the master camera timeline, GSAP for interaction feedback (buttons, hovers, gate responses).

## D. 3D generation pipeline (Hugging Face)

- **TRELLIS** (Microsoft) — open-source image-to-3D, #2 best generative 3D render, free Space (no GPU required)
- **Hunyuan3D-2.1** (Tencent) — 10B params, image-to-3D + texture generation (Paint v2.0 Turbo)
- **HunyuanWorld-Mirror** (Tencent) — multi-view/video → explorable 3D worlds in seconds, single-card deployment
- **HY-World 2.0** — text/image/multi-view/video → meshes or Gaussian Splattings
- **3D Model Zoo** — curated collection of 3D generative models

Workflow: reference images → TRELLIS/Hunyuan3D-2.1 → product 3D; HunyuanWorld-Mirror → environment/world; gltf-transform optimize; Theatre.js sequences; ship single WebGL world.

## E. The production floor (non-negotiable for a product)

### E1. Accessibility — WCAG 2.1 AA (EU Accessibility Act, June 2025)
- A `<canvas>` contributes nothing to the accessibility tree. Provide **parallel HTML controls** (number fields, selects, buttons) that update the same state as canvas interactions.
- Full keyboard path (Tab/arrows), visible focus rings ≥3:1 contrast, no focus traps (Escape/Tab must move forward).
- Labels/aria-labels on every control; 4.5:1 text contrast, 3:1 large text.
- No color-only information (add text/icon); WCAG 2.5.1 single-pointer alternative (number inputs substitute for drag handles).
- `aria-live` regions announce price/selection/error changes.
- `<canvas aria-label="...">` + tabindex="0" for focusable scene.
- Test: Tab through with mouse closed; axe / Lighthouse; zero AA violations. NVDA (Windows) / VoiceOver (Mac).
- Moving-scene a11y is an unsolved problem — parallel controls are the only reliable production approach.

### E2. Audio — the immersion multiplier
- Web Audio API `PannerNode` / Three.js `PositionalAudio` for true 3D spatialization (pan/attenuate/filter by listener position/material).
- Flavio De Lellis's Web-audio-project: sound propagation via rays, material absorption/reflection/transmission coefficients.
- Every product interaction has a sound coming FROM the object, not the browser.
- Must be user-initiated (autoplay policy), always-visible keyboard-accessible mute toggle.

### E3. Performance — the interaction budget (5 dimensions)
1. **Response** — how quickly the interface acknowledges input
2. **Render** — CPU/GPU work per visual state
3. **Residency** — network/decoded-asset/GPU memory retained
4. **Sustainability** — behavior under heat/battery/long sessions
5. **Equivalence** — degradation paths preserving the same task

Critical rule: visual acknowledgment must NOT wait for animation completion. Control changes immediately, aria-live announces, the transition continues as progressive detail.

2026 budget: LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1 · initial JS ≤ 400KB gzipped · 16.67ms/frame · <100 draw calls.
WebGPU is the production standard (Safari Sep 2025, Three r171+ zero-config): `import { WebGPURenderer } from 'three/webgpu'`. Up to 3.8× compute improvement; never use WebGLRenderer unless hardware <2022.

### E4. Security & fulfillment (digital goods — NOT YET APPLICABLE to Sports, documented for future)
- Presigned URLs ~15min expiry; 3–5 download limit; watermark PDFs with purchaser email.
- Keys generated on payment success (not spreadsheets); rate-limit activation APIs; idempotent delivery on webhook retry.
- Velocity checks, disposable-email blocking for high-risk SKUs, chargeback monitoring by product.

### E5. VAT/tax (NOT YET APPLICABLE — no storefront)
- Digital services = destination-based VAT in 120+ countries. EU OSS scheme, €10k threshold for cross-border B2C; Philippines 12%, Sri Lanka 18%. Integrate Stripe Tax/TaxJar before launch.

### E6. Testing — visual regression problem
- WebGL can't be tested with DOM selectors. **Introspection**: expose scene-graph/GPU state via a debug bridge API; assert camera position, object visibility, material props.
- **VRT**: headless capture at fixed camera positions, compare against baselines (quick-vrt, mcp-webgl-visual-regression).

### E7. Deployment/CDN
- Static assets: `Cache-Control: public, max-age=31536000, immutable` + content-hashed URLs. HTML revalidates every load.
- Draco/KTX2 assets get immutable headers; initial HTML shell tiny; 3D loads progressively after shell renders.

### E8. Analytics — what actually matters
- Page views/bounce are meaningless for immersive. Measure: time-to-first-interaction, gate completion rate, camera progression depth, audio engagement (mute/unmute), reduced-motion path adoption, frame-drop correlation with abandonment.
- Clarity/Mouseflow/Smartlook for heatmaps + session replay.
- A user who reaches 80% and bounces on a gate is a **failed gate**, not a bounce.

### E9. prefers-reduced-motion — non-negotiable
- `window.matchMedia('(prefers-reduced-motion: reduce)')` → entirely separate animation path (instant camera cuts, static hero states, text descriptions). WCAG 2.3. Not "slower" — equivalent static task-preserving experience.

## F. References / templates

- **Kage** — single-file cinematic Three.js experience to study
- **Trionn Architecture** (Codrops case study) — GSAP + Three.js + Lenis + Web Audio
- **Igloo Inc case study** — procedural crystal growth, shader-driven UI, VDB exporter
- **Immersive Portfolio** — animated floor transitions, neon-glow interface
- **Utsubo "Best Three.js Websites 2026"** — living reference of winning techniques
- **Monolith Studio** (FWA/awwwards/CDA sweep) — editorial typography + near-black palette + Cinema 4D + Webflow

## G. The uncomfortable truths

1. You will not ship at 10MB first try. ZERO took 4 months, multiple versions of the same effects. Budget for iteration.
2. AI is the prototyping layer, not the shipping layer (Unseen built draw-a-zero in 48h with AI, then refined). Prototype with AI, ship with taste.
3. Pipeline > pixels. Build the authoring/handoff pipeline FIRST.
4. One building, infinite camera work.
5. The gate is the experience.

## H. First move (recommended)

Don't start with Three.js or GSAP. Start with **Theatre.js + Blender**: one scene, one building, one environment; hook every property to Theatre; sequence the camera; feel it. Then bring in the rendering layer. Start from cinematic intent, choose tech to serve it.

## I. What this means for Sports today

- **Adopted into current branch**: the r3f signal-core scene + the DFS oracle (dev-time falsifier). Fits L1 (single canvas: `/observatory` uses one lazy-loaded scene) and the "bake what you can" principle.
- **Next concrete steps if greenlit**:
  1. Landscape the current `/observatory` scene vs the Single Canvas Doctrine (is it one canvas, camera-driven?).
  2. Add a reduced-motion path + keyboard focus test to the scene (E1/E9 — legal floor, cheap).
  3. Decide WebGPU renderer swap (E3) — three r171+ is production-ready.
  4. Gate system for the observatory → "/fantasy/showdown" cinematic room already exists branch-side (bbaa84ea / #805); treat gates as the pattern for section transitions.
- **Parked (out of scope until a storefront exists)**: E4 security/fulfillment, E5 VAT/tax, MEDUSA/Saleor commerce, GMShop Edge, DigitalHippo.