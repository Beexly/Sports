# Data & Analytics Strategy — from market-reader to trend-discoverer

> Verdict in one line: today the engine reads the **betting market** extremely
> well and ingests **almost no player/team statistics**. That's the gap between
> "we price the line" and "we caught the trend before the pundit." This doc is
> the honest audit, a working proof that the gap is closeable *now* (for free),
> and the plan.

## 1. What we actually ingest today (ground truth)

Audited the full ingestion + engine + schema. The finding is unambiguous:

| Category | Status | Detail |
| --- | --- | --- |
| **Market data** (odds, spreads, totals, line movement, bookmaker consensus) | **~100% live** | The Odds API every 30 min, 7 sports. The whole engine runs on this. |
| **Final scores** | live | The Odds API `/scores` + ESPN (settlement only). |
| **Team scoring rates** (Poisson λ) | coded, **gated off** | `team-rates.ts`/`poisson.ts` derive λ from stored scores — real, but not wired (`TEAM_RATES_AVAILABLE=false`). |
| **Kalshi fair value, Reddit narrative, OpenFootball** | scaffolded, **inert** | Built, not wired. |
| **API-Sports** (`API_SPORTS_KEY` set) | **unused** | Key configured; zero code consumes it. |
| **Player/team statistics** (targets, snaps, air yards, usage, EPA, age, injuries, depth charts, weather, play-by-play) | **0% — none** | No `Player` table, no `PlayerStat` table, no ingestion. |

The engine is **market-derived**: it de-vigs sportsbook odds (Shin / goto), blends
a few historical-context signals (ATS form, H2H, rest, schedule density, line
movement), and grades itself against the close (CLV). That is genuinely
well-built. But it cannot answer a single player-usage question — by design,
there is no player data in the system. The owner's suspicion is correct.

**So a trend like "QB age 34+ → RB target share +10-12%" is currently
un-catchable by the engine** — not because the math is hard, but because the
data and the discovery layer don't exist.

## 2. Proof the gap is closeable now — for free

The blocker everyone assumes is "we need an expensive licensed stats feed." We
don't. **nflverse** (`github.com/nflverse/nflverse-data`, MIT-licensed, plain
CSV/parquet, fetchable straight from Node — no R) carries exactly what we need:
weekly player stats (targets, receptions, air yards, EPA, attempts) and rosters
(birth_date → age, position, team).

We pulled 2016-2024 and computed the owner's example trend directly
(`scripts/analytics/qb-age-rb-target-share.mjs`, real data, 4,936 team-weeks):

```
RB share of team targets, by starting-QB age
  ≤26     n=2251   18.1%
  27-29   n=1017   18.7%
  30-33   n= 770   17.9%
  34-36   n= 491   19.2%
  37+     n= 407   22.9%

QB 34+ vs <34:  20.9% vs 18.2%  →  +2.7 pts  (relative +14.7%)
Welch z = 8.0,  p = 1.3e-15  (overwhelmingly significant)
```

The trend is **real, larger than the 10-12% the pundit quoted, and concentrated
in the 37+ cohort.** We computed and significance-tested it from free data in a
single pass. This is the capability, demonstrated.

## 3. The capability, productized

`packages/prediction-engine/src/trend-discovery.ts` (pure, tested) is the
reusable discovery layer the engine was missing: feed it observations (a metric
+ categorical features per unit — team-week, player-game, matchup), define
buckets over any feature, and it returns each cohort's mean vs the field,
absolute/relative delta, and a Welch significance test, ranked by effect size.
`discoverCohortTrends()` / `significantTrends()`. It generalises the QB-age
analysis to any feature × any metric, so the same engine can scan air-yards by
QB age, RB efficiency by rest, WR target share by defensive scheme, etc.

A discovered trend is a **hypothesis**, not a pick. Wiring one into live scoring
is a separate, founder-gated `MODEL_VERSION` step — and the bar is the one the
platform already holds itself to: it must also beat the close (CLV), not just
backtest.

## 4. The plan — become the most data-advanced engine in the category

**Phase 0 — done in this pass:** proved free granular data is reachable; built +
tested the trend-discovery engine; computed a real, significant trend.

**Phase 1 — nflverse ingestion (no license, no R).** Add an `nflverse-source`
adapter to `packages/data-ingestion` that fetches the release CSVs (rosters,
weekly player stats, snap counts, and — later — play-by-play for EPA/air yards).
Add `Player` + `PlayerGameStat` tables (the schema's `GameSignal` /
`SourceSnapshot` already reserve `PLAYER_AVAILABILITY` / `CONTEXT_TEAM_STATS`
categories for exactly this). Backfill 2016→present.

**Phase 2 — feature store + nightly trend scan.** Materialise per-unit features
(QB age, RB target/snap share, air yards, rest, pace, usage trend). Run
`discoverCohortTrends` nightly across feature × metric pairs; surface the
significant, stable ones to a cockpit "Trend Desk" with sample size, effect
size, p-value, and a recency check (is it holding this season?).

**Phase 3 — shadow → wire (founder-gated).** Promote a trend to a scoring signal
only after it (a) replicates out-of-sample and (b) shows CLV in shadow mode,
per `docs/evidence-engine.md`. This keeps the "no fabricated edge" doctrine
intact while finally making the engine **stats-driven, not just market-driven.**

**Phase 4 — the moat.** Public-facing "we called it first" receipts: timestamped,
significance-tested trend cards (the Airwave Ledger and Decision Autopsy patterns
already exist to display them). The pitch writes itself — *we publish the trend,
the data, and the date, before the takes catch up.*

## 5. Honest scoreboard

- Market-edge engine: **strong, live.**
- Stats ingestion: **near-zero today** — the single biggest gap.
- Trend discovery: **built and proven in this pass; not yet fed by a live data pipeline.**
- Distance to "catch QB-age-class trends before pundits": **one ingestion adapter + a feature store away** — weeks, not quarters, and at ~$0 data cost to start (nflverse).

## Files added in this pass
- `packages/prediction-engine/src/trend-discovery.ts` (+ tests) — the discovery engine.
- `scripts/analytics/qb-age-rb-target-share.mjs` — the real-data proof (run: `node scripts/analytics/qb-age-rb-target-share.mjs`).
- This doc.

Nothing here is wired into live scoring or the production database — it is the
foundation + proof, founder-gated for productization per the engine's existing
evidence/MODEL_VERSION discipline.
