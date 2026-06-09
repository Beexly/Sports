# Claude Handoff: GSE Aesthetic R&D To Build Plan

Generated: 2026-06-09

## Read First

1. docs/research/gse-aesthetic-rd-master-plan.md
2. docs/research/gse-competitor-aesthetic-matrix.md
3. docs/research/gse-competitor-aesthetic-matrix.csv
4. docs/research/gse-top-2025-2026-design-references.md
5. docs/research/gse-design-motion-repo-watchlist.md
6. docs/research/gse-design-motion-repo-watchlist.csv
7. docs/research/gse-aesthetic-build-queue.jsonl
8. apps/web/package.json
9. apps/web/app/cockpit/sources/page.tsx
10. apps/web/lib/cockpit/intelligence-control-plane.ts

## Mission

Make GSE feel like the smartest sports intelligence engine of 2026 without becoming a generic betting site, a generic dark dashboard, or an award-site animation demo.

The app has two design modes:

- Operator mode: dense, quiet, fast, source-first, keyboardable, minimal motion.
- Public/story mode: premium, visual, more immersive, still source-led and performance-safe.

## Ordered Build Plan

1. Run repo orientation: git status, package scripts, current cockpit routes, current design tokens/CSS, and dependencies.
2. Create a small design-token proposal before adding dependencies. Include density, source states, confidence states, stale/conflict/fallback states, and reduced-motion rules.
3. Implement P0 table and motion foundations only where they solve an existing GSE workflow. Start with the source control-plane route because it is already typed and tested.
4. Add evidence drawer and command-palette patterns after the base cockpit remains stable.
5. Only then consider 3D, graph, Lottie, Remotion, or award-style public pages.
6. Verify with tests plus browser screenshots across desktop and mobile. If using canvas/3D, check it is nonblank and correctly framed.

## Hard Rules

- Do not copy competitor styling, screenshots, claims, projections, rankings, odds, ownership, or premium content.
- Do not introduce generic neon sports-betting aesthetics.
- Do not add scroll hijacking to cockpit pages.
- Do not add motion without reduced-motion behavior.
- Do not use cards-inside-cards or decorative blobs/orbs.
- Do not add visible tutorial text explaining the UI. Make controls self-evident.
- Keep output grounded in real source status, fallback health, freshness, and conflicts.

## Acceptance Checklist

- Dense cockpit tables are readable at desktop and mobile widths.
- Every important data surface has source/freshness/fallback/conflict affordances.
- Motion is meaningful and disabled/reduced when the user requests reduced motion.
- No text overlap, clipped controls, or layout shift under loading/empty/error states.
- All new dependencies are justified by a named GSE workflow.
- test:cockpit and typecheck pass.
