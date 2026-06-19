# Analytics & Utility Toolkit — Capability Manifest

The Galaxy Sports Edge codebase ships a cohesive layer of **pure, dependency-free,
unit-tested TypeScript libraries** spanning sports analytics, business/product analytics,
math, and general utilities. Every library is namespaced and reachable through a single
entry point.

## Entry points

```ts
// one cohesive import surface
import { sports, analytics, math, utils } from '@/lib/toolkit';
sports.badmintonAnalytics.gameWinner(21, 19);   // 'a'
math.numberTheory.gcd(48, 18);                   // 6
utils.unitConversion.milesToKm(26.2);            // marathon km
analytics.retentionAnalytics.churnRate(40, 100); // 0.4

// or per-domain barrels
import { complexNumbers } from '@/lib/math';
import { financialMath } from '@/lib/math';
```

> Namespaced re-exports (`export * as`) mean identically-named helpers across libraries
> (e.g. `dkProjection` in every sports library) never collide.

## Sports analytics — `@/lib/sports` (50 modules)

- `archery-analytics`
- `badminton-analytics`
- `baseball-analytics`
- `basketball-analytics`
- `boxing-analytics`
- `cricket-analytics`
- `curling-analytics`
- `cycling-analytics`
- `draft-utils`
- `elo-utils`
- `equestrian-analytics`
- `esports-analytics`
- `f1-analytics`
- `football-analytics`
- `game-simulation`
- `game-status`
- `golf-analytics`
- `gymnastics-analytics`
- `handball-analytics`
- `hockey-analytics`
- `injury-impact`
- `lacrosse-analytics`
- `matchup-utils`
- `mma-analytics`
- `nba-analytics`
- `nfl-advanced-analytics`
- `pace-analytics`
- `player-comparison`
- `player-stats-aggregation`
- `playoff-utils`
- `position-utils`
- `power-ranking`
- `rowing-analytics`
- `rugby-analytics`
- `schedule-utils`
- `scoring-rules`
- `skiing-analytics`
- `soccer-analytics`
- `spread-math`
- `swimming-analytics`
- `table-tennis-analytics`
- `team-normalize`
- `tennis-analytics`
- `track-field-analytics`
- `triathlon-analytics`
- `volleyball-analytics`
- `water-polo-analytics`
- `weather-analytics`
- `weather-impact`
- `wrestling-analytics`

## Product / business analytics — `@/lib/analytics` (27 modules)

- `ab-testing`
- `attribution-analytics`
- `bet-tracker`
- `cohort-analysis`
- `cohort-analytics`
- `content-analytics`
- `customer-lifecycle`
- `email-analytics`
- `engagement`
- `events`
- `funnel-analytics`
- `geographic-analytics`
- `line-movement`
- `market-analytics`
- `parlay`
- `pick-display`
- `pick-performance`
- `predictive-analytics`
- `pricing-analytics`
- `product-analytics`
- `prop-analytics`
- `recommendation-engine`
- `retention-analytics`
- `social-analytics`
- `streak`
- `subscription-analytics`
- `user-journey`

## Math & numerical — `@/lib/math` (36 modules)

- `bankroll`
- `bayesian-blend`
- `calculus`
- `clustering`
- `combinatorics`
- `complex-numbers`
- `conformal`
- `devig`
- `dixon-coles`
- `easing`
- `elo-rating`
- `entropy`
- `financial-math`
- `game-theory`
- `geometry`
- `graph-utils`
- `information-theory`
- `interpolation`
- `kelly`
- `line-movement-classify`
- `linear-algebra`
- `matrix`
- `number-theory`
- `numerical-methods`
- `odds-format`
- `optimization`
- `poisson-model`
- `probability-distributions`
- `probability`
- `regression`
- `signal-processing`
- `spring`
- `staking`
- `statistics-advanced`
- `statistics`
- `time-series`

## Utilities — `@/lib/utils/toolkit` (39 modules)

- `array-utils`
- `async-utils`
- `cache-utils`
- `collection-utils`
- `color-utils`
- `content-utils`
- `crypto-utils`
- `currency`
- `date-utils`
- `error-utils`
- `event-emitter`
- `fetch-utils`
- `format-utils`
- `fuzzy-search`
- `html-utils`
- `network-utils`
- `notification-utils`
- `number-format`
- `number-utils`
- `object-utils`
- `odds-utils`
- `parser-utils`
- `pipeline`
- `queue-utils`
- `random-utils`
- `rate-limiter`
- `relative-time`
- `retry-utils`
- `rss-builder`
- `schema-utils`
- `seo-utils`
- `slug`
- `social-text`
- `storage-utils`
- `string-utils`
- `unit-conversion`
- `url-utils`
- `validation-utils`
- `validation`

## Totals

- **152 pure library modules** barreled across 4 domains.
- Each carries its own Vitest suite under `apps/web/__tests__/` (collectively 13,000+ assertions).
- Zero runtime npm dependencies added; TypeScript-native, strict-mode, `noUncheckedIndexedAccess`-safe.
- Verified: `trust-gate` clean, `model-freeze` clean (MODEL_VERSION frozen at v5.0.0), toolkit integration test passing.

## Parked (complete code, awaiting tests)

Three libraries (`event-analytics`, `forecasting-analytics`, `risk-analytics`) live under
`reports/parked-libraries/` — complete but untested (their build agents stalled before writing tests).
They are intentionally NOT in the build until they have passing suites. See that folder's README.
