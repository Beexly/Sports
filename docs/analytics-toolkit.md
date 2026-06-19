# Analytics & Utility Toolkit — Capability Manifest

Galaxy Sports Edge ships a cohesive layer of **pure, dependency-free, unit-tested TypeScript
libraries** spanning sports analytics, business/product analytics, math, and utilities — all
namespaced and reachable through one entry point.

## Entry points

```ts
import { sports, analytics, math, utils } from '@/lib/toolkit';
sports.badmintonAnalytics.gameWinner(21, 19);
math.numberTheory.gcd(48, 18);
utils.unitConversion.milesToKm(26.2);
analytics.retentionAnalytics.churnRate(40, 100);
```

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

## Product / business analytics — `@/lib/analytics` (30 modules)

- `ab-testing`
- `attribution-analytics`
- `bet-tracker`
- `cohort-analysis`
- `cohort-analytics`
- `content-analytics`
- `customer-lifecycle`
- `email-analytics`
- `engagement`
- `event-analytics`
- `events`
- `forecasting-analytics`
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
- `risk-analytics`
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

- **155 pure library modules** across 4 domains, ~26,900 passing assertions.
- Zero runtime npm dependencies; TS strict + `noUncheckedIndexedAccess`-safe.
- Verified: full `tsc` 0 errors, `next build` green, trust-gate + model-freeze clean (MODEL_VERSION v5.0.0).
