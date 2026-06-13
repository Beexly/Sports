# Immersive plates

Committed AI-generated atmosphere assets (Higgsfield) served as decorative
background plates via `components/immersive/generated-plate.tsx` and registered in
`lib/visual-production/asset-manifest.ts`.

Rules (the doctrine — "generate atmosphere, render truth"):
- Abstract atmosphere only. No text, odds, logos, player likenesses, sportsbook
  imagery, or hype symbols baked in. All truth is app-rendered on top.
- Each plate is decorative (`aria-hidden`) with a CSS gradient base + fallback,
  and motion is gated behind `prefers-reduced-motion`.
- Naming: `<slate-asset-id>.<ext>` (e.g. `home-hero-cosmos.webp`,
  `home-hero-cosmos.mp4`), matching the id in `world-slates.ts`.
- Prefer WebP/AVIF for stills, compressed MP4/WebM for motion; keep stills well
  under the route's performance budget.
