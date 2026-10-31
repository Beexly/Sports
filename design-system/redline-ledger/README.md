# GSE — REDLINE LEDGER

A separate Galaxy Sports Edge website, card, OG, and social design package.

## Open the website

```powershell
cd site
npm install
npm run dev -- --port 4173
```

Open `http://127.0.0.1:4173`.

## Verify

```powershell
cd site
npm test
npm run build
npm audit

cd ..
node scripts\audit.mjs
python scripts\validate_assets.py
python scripts\validate_exports.py
node scripts\visual-audit.mjs
```

The browser audit expects the Vite server on port 4173.

## Locations

- Visual philosophy: `VISUAL_PHILOSOPHY.md`
- Design specification: `docs/gse-redline-design.md`
- Implementation plan: `docs/superpowers/plans/2026-10-30-gse-redline.md`
- Portable design rules: `DESIGN.md`
- Website and React components: `site/src/`
- Source-locked Week 8 data: `site/src/data/week8.ts`
- Token and mandatory numeric CSS: `site/src/styles/tokens.css`
- Social browser templates: `site/src/social.tsx` and `site/src/styles/social.css`
- Higgsfield review log and exact prompt references: `assets/higgsfield/ASSET_LOG.md`, `scripts/generate_assets.ps1`, `scripts/generate_rescues.ps1`
- OG asset: `assets/og/gse-redline-og.png`
- Social static pack: `assets/social/`
- DFS card: `assets/cards/gse-dfs-card.png`
- Story motion: `assets/social/gse-redline-story.mp4`
- Ready-to-post captions: `assets/social/CAPTIONS.md`
- Visual reviews: `reviews/`

## Package contents

- A full responsive React + Tailwind website with Board / DFS / Held views.
- Big Shoulders display type and IBM Plex Sans body/data type, self-hosted in Latin subsets.
- Source-locked NFL pick proofs, salary-exact nine-player DFS roster, and an honest 47/0 CFB hold.
- Seven static exports plus a six-second 1080×1920 H.264 story video.
- Four reviewed Higgsfield-derived images and four deterministic fallbacks. Rejected originals are not used.

## Package portability

All commands and references are relative to this package root. The design package is self-contained and does not change production routes, canonical tokens, package locks, environment files, or git history.
