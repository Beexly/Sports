# GSE REDLINE LEDGER — Verification record

## Automated checks

| Check | Result |
|---|---|
| `npm test` in `site/` | PASS — 2 test files, 7/7 tests |
| `npm run build` in `site/` | PASS — TypeScript and Vite production build |
| `npm audit` in `site/` | PASS — 0 vulnerabilities after Vitest 5.0.5 update |
| `node scripts/audit.mjs` | PASS — anti-slop and sports-integrity scan across 20 source files |
| `python scripts/validate_assets.py` | PASS — 8 reviewed assets with SHA-256 provenance |
| `python scripts/fallback_assets.py` then asset validation | PASS — existing assets preserved; hashes still match |
| `python scripts/validate_exports.py` | PASS — 7 static exports at exact dimensions |
| `node scripts/visual-audit.mjs` | PASS — 320/390/768/1024/1440px plus reduced motion |
| `node scripts/export-social.mjs` | PASS — all seven browser-rendered static exports regenerated |
| `scripts/export-motion.ps1` + `ffprobe` | PASS — H.264, 1080×1920, 24fps, 6.000000 seconds |

## Browser and accessibility evidence

`reviews/browser-audit.json` records:

- No horizontal overflow or broken images at 320, 390, 768, 1024, or 1440px.
- No duplicate IDs, failed asset responses, or JavaScript page errors.
- Big Shoulders and IBM Plex Sans loaded successfully.
- Comparable values are tabular, use IBM Plex Sans, are right-aligned, and do not wrap.
- Pick prices occupy a shared flex numeric column.
- Hero media fills its frame within the 1px border tolerance; export previews use `object-fit: contain`.
- All tested interactive targets meet the 44×44px contract.
- Axe reports zero WCAG 2.1 A/AA violations at 390px and 1440px, and after selecting DFS and Held.
- Board / DFS / Held interactions work; all three public download URLs return HTTP 200.
- Reduced-motion hover has no displacement.

## Visual evidence

- `reviews/site-1440.png` — full desktop page.
- `reviews/site-390.png` and `reviews/mobile-fold.png` — mobile page and fold.
- `reviews/site-390-reduced.png` and `reviews/mobile-fold-reduced.png` — reduced-motion path.
- `reviews/social-contact-sheet.png` — all seven final static exports after the last regeneration.
- `reviews/motion-00.png` — CHI ML +142 and GSE identity visible at time zero.
- `reviews/motion-01.png` — final motion at one second.

## Package evidence

`python scripts/validate_package.py` verifies that the copied repository package includes its own documentation, source, scripts, review evidence, and final assets; contains no standalone path leak; and contains no rejected original PNGs.

## Limits

- Core Web Vitals were not collected with a Chrome performance trace; no LCP/CLS/INP score is claimed.
- Browser checks used installed Chrome, not physical iOS/Android devices or platform-native social upload previews.
- Sports examples are source-locked to October 30, 2026 and labeled historical. No live-board availability or current price is claimed.
