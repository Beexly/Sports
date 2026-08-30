# Ranking-signal second pass — absolute best (2026-08-09)

Applied after the audit of MODEL_VERSION v5.2.2. Goal: every user-visible and
operator surface respects the ranking law, and public docs match code.

## What shipped

### P0 — Public truth
| Surface | Change |
| --- | --- |
| `/methodology` Ranking probability | SPEAK/LEAN gate language **removed** — finite trueProb incl. PASS |
| `/methodology` v5.2.1 changelog | Explicit "incl. PASS" |
| `docs/ops/ENGINE_RESOLUTION_HARD_STOP.md` | Ranking law + v5.2.2 coverage + public sort note |

### P1 — Display order follows rankingP
Shared helper: `apps/web/lib/ranking/sort-key.ts` (`rankingSortKey`, `comparePicksByRanking`).

| Surface | Behavior |
| --- | --- |
| `GET /api/picks` | After selective filter → sort by rankingP (featured pin) |
| Board published lane | Fetch 48 → rank → top 12 |
| Dashboard today | Fetch wide → rank → tier limit |
| Cockpit overview | Fetch 48 → rank → top 12 |
| Cockpit brief | Fetch 80 → rank → top 50 |
| Matchup preview | Nested picks take 8 → best by rankingP |
| Admin dashboard API pending | Fetch 120 → rank → top 60 |

### P2 — Code comments / types match law
- `packages/prediction-engine` scoring + index + scoreGames JSDoc
- `packages/ingestion-pipeline` process-sport
- `packages/types` IndependentEdgeSummary.priced + rankingScore docs
- `docs/ops/MODEL_VERSION_INDEPENDENT_RANKING.md` public-surface note

### Tests
- `apps/web/__tests__/ranking-sort-key.test.ts` — 6 cases (incl. demotion)
- proven-path-rows still green (honest pIndependent load)

## What intentionally did **not** change
- ML-only independents (spread/total conf-echo ranking until ATS models)
- Eligibility still conf/100 provisional (documented)
- Floors / AUTO_PUBLISH / map apply still OFF
- No Prisma `rankingScore` column yet (optional stronger follow-up — SQL orderBy)

## Founder ops after merge
1. Promote Production → main SHA including this pass.
2. Re-run calibration-metrics; generate slate under v5.2.2.
3. Spot-check board + `/api/picks` order vs factorBreakdown.rankingP on a high-conf demotion.
4. Optional later: persist `rankingScore Int?` for cheap SQL orderBy.

## Self-correction still holds
If selective RES on independent/blend stays < 0.02 after settle sample under
v5.2.2 → engine resolution hard-stop (sport models / features), not more maps.
