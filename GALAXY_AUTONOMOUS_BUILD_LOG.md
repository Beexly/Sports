# Galaxy Dynasty — Autonomous Build Log (World-Graph era)

Continuation log after the Galaxy City prototype. Appends to the existing
`BUILD_LOG.md` / `STAGE_2_BUILD_REPORT.md` rather than replacing them.

## Phase 0 — Orientation (current state)

- **Repo:** `Beexly/Sports` monorepo; branch `claude/gracious-albattani-f63wx1`.
- **Stack:** Next.js 14 (App Router) + TS, Prisma/Postgres, `@sports/galaxy-engine`
  (pure engine), NextAuth, Stripe (test mode), existing GSN/GSE grading engine.
- **Galaxy surface already built (Stages 1–2 + deepening):** 20 routes under
  `apps/web/app/galaxy/*` (campus, onboarding, war-room, blacktop, depths, duel,
  leaderboard, season, vault[+slug], market, crew, factions, creators, wardrobe,
  store, friends, dynasty, score, admin, u/[handle]); 23 server libs under
  `apps/web/lib/galaxy/*`; engine modules (calibration, credit-constitution,
  signal-check, bosses×5, rating, duel, season, cosmetics, consumables, crew-roles,
  galaxy-score, language-law, asset-brief).
- **Tests:** ~164 Galaxy tests (engine + web) + brand-safety suite (2191) green.
- **Failed prototype:** `Galaxy City` (hand-coded Three.js box-arcade), was deployed
  via Higgsfield and briefly promoted on the Campus. Contained in Phase 1.

**Decision:** the world is a **graph** (Account → Campus → Districts → Rooms →
Sports Weather → Progression), not a 3D map. The previous prototype inverted this
(map before world system). Correcting now.

## Phase 1 — Galaxy City containment

- Removed the "Play Now" banner from the Campus and the `GALAXY_CITY_GAME_URL`
  constant from `theme.ts` (no primary surface promotes it).
- Moved source to `experiments/failed-galaxy-city/` (kept as reference; vendor/zip
  remain gitignored).
- Wrote `FAILURE_REPORT_GALAXY_CITY.md`.
- Added a test asserting no primary Galaxy UI promotes the prototype.
- The deployed Higgsfield game remains live at its URL (delisting it would need a
  separate tool/owner action — documented, non-blocking). It is simply no longer
  surfaced anywhere in the product.

Subsequent phases recorded in `GALAXY_CAMPUS_BUILD_REPORT.md`.
