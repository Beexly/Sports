# Deployed Performance Gate

Performance gates applied to preview / production deployments. Local
measurement is unreliable for these metrics — these gates are owner-run
against a preview URL.

## Targets (Core Web Vitals)

| Metric | Good | Needs improvement | Poor | Gate |
|---|---|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5s | 2.5–4.0s | > 4.0s | Public launch blocks if any T1 surface > 2.5s mobile |
| INP (Interaction to Next Paint) | ≤ 200ms | 200–500ms | > 500ms | Public launch blocks if Decision Room > 200ms mobile |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 | Public launch blocks if any T1 surface > 0.1 |

## Lighthouse targets

| Surface | Mobile Performance | Mobile A11y | Mobile Best Practices | Mobile SEO |
|---|---|---|---|---|
| `/` | ≥ 85 | ≥ 95 | ≥ 90 | ≥ 90 |
| `/today` | ≥ 80 | ≥ 95 | ≥ 90 | ≥ 90 |
| `/room/[id]` (demo game) | ≥ 80 | ≥ 95 | ≥ 90 | n/a |
| `/picks` | ≥ 80 | ≥ 95 | ≥ 90 | ≥ 90 |
| `/command` | ≥ 75 | ≥ 95 | ≥ 90 | n/a |
| `/galaxy-demo` | ≥ 80 | ≥ 95 | ≥ 90 | n/a (noindex) |

## Measurement procedure

1. Deploy a preview URL.
2. Run Lighthouse against each T1 surface in mobile mode (Moto G Power, slow 4G throttling, 4× CPU slowdown).
3. Capture LCP/INP/CLS from PageSpeed Insights or a CrUX-equivalent.
4. Record results in this file's history table (append per measurement).
5. Compare to targets. Anything below blocks the launch.

## Optimization priorities (when a target is missed)

In order of leverage:
1. **Image weight** — verify Next/Image used everywhere, formats are AVIF/WEBP, sizes hinted
2. **Font loading** — `font-display: swap`, preload critical fonts, no FOIT
3. **JS bundle size** — split per route, code-split heavy components (charts, OG generators)
4. **Third-party scripts** — verify nothing unmeasured ships
5. **CLS sources** — fixed dimensions on images and ad-like blocks; no late-injected banners

## Anti-patterns that trip the gate

- Hero LCP image not preloaded
- Web fonts blocking render
- Heavy state libraries shipped to surfaces that don't need them
- Layout shifts from late-arriving banners (e.g., bootstrap-mode notice)
- Server-rendered components hydrating heavy client trees they don't need

## When measurements are not possible

The local dev server is not a valid measurement surface for these gates.
Production-blocking measurements require a preview URL with:
- Production build (`next build`)
- Realistic data ingestion (not empty DB)
- The release-state and feature-flag configuration matching the planned launch

## Measurement history

| Date | Build SHA | Surface | LCP (mobile) | INP | CLS | LH Perf | LH A11y | Operator |
|---|---|---|---|---|---|---|---|---|
| _Empty at RC_ — owner action: run preview measurements | — | — | — | — | — | — | — | — |
