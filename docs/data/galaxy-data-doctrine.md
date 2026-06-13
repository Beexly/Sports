# Galaxy Data Doctrine — Interpretation Engine (2026-06-12)

Owner directive distilled (externally drafted research, reconciled against
platform law). Companion to `docs/design/NFL_HOUSE_DOCTRINE.md`.

## The moat

raw → cleaned → enriched → derived → model probabilities → market
disagreement → uncertainty → decision → human story → feedback loop.
We win on interpretation, not collection.

## The five stat questions (publish gate)

Every number is unfinished until it answers: what does it measure · what does
it miss · stable or noisy · has the market priced it · what decision changes.
If a stat can't survive these, it gets no premium screen space.

## What already exists (deepen, don't rebuild)

- **Layers 1–3 (raw/context/derived)**: nflverse ingestion is live
  (play-by-play, snap share, NGS, pressure/coverage, injuries, QBR, combine,
  depth charts) with freshness stamps shipped 2026-06-12. EPA/success-rate
  vocabulary live in Player Lab + Academy.
- **Layer 4 (market)**: The Odds API ingestion, line movement, consensus
  (`consensus.ts`), CLV tracking (`/track`, `clv-calibration.ts`).
- **Layer 5 (probability/sim)**: poisson fair value, elo estimator,
  edge-significance, probability-calibration (isotonic + Brier
  decomposition), parlay correlation (Parlay MRI), human-performance sim
  priors.
- **Layer 6 (narrative)**: pick explainer (grounded, policy-validated, now
  register-aware), Model Journal, loss autopsies, premortems.
- **Uncertainty**: `assessUncertainty` (Wilson band, reliability tier,
  limitation flags) now PUBLIC on the calibration report (Honest Band,
  shipped 2026-06-12).
- **Calibration-over-accuracy is already law** (CLAUDE.md, doctrine §7,
  pricing ladder gates on calibration + CLV ≥52.4%).

## Stat factory — proposed derived stats, triaged

| Proposal | Status |
|---|---|
| Edge Fragility Score | exists in spirit: premortem layer + evidence health; formalize as a score later |
| Market Gravity Index | SHIPPED 2026-06-12 — `marketGravityIndex` (conviction × agreement × liquidity), badge on the Market Fair Board |
| Parlay Dependency Coefficient | SHIPPED — named in Parlay MRI vitals |
| Line Death Clock | HEARTBEAT shipped — capture-window drift on the fair board; full per-pick clock QUEUED |
| Stat Stability Grade | SHIPPED — Player Lab production/snaps/edge |
| QB Pressure Sensitivity / Protection Stress | pressure-coverage data live; derived indices = build candidates |
| Script Elasticity / False Favorite / Narrative Risk / Public Comfort | research candidates; need defensible math before any UI |

Rule: a new derived stat ships only with definition, formula, sample-size
floor, and a "known weakness" line — see commandment below.

## The stat commandment (publish contract)

No stat ships without: source · timestamp · definition · sample size ·
recency window · opponent adjustment (or "none") · confidence/stability ·
known weakness · decision use · narrative explanation.
Freshness stamps + metric explainers + `lib/intelligence/metric-methodology`
are the carriers; extend them rather than inventing new envelopes.

"Decision use" is the binding question: **what decision is this stat allowed
to influence?** EPA → team strength. CPOE → QB quality. Pressure → matchup
stress. Line movement → timing. CLV → whether our process beats the market.
Calibration → whether we deserve trust. Every stat gets a job or gets cut.

## Corrections / parked items

1. **New infra (DuckDB/Polars/Dagster/dbt/ClickHouse) is parked.** Real
   evaluation candidates, but founder-scale decisions; current
   Postgres+Prisma+BullMQ stack is not the bottleneck today. Revisit when
   ingestion volume demands it. No new deps without explicit owner call.
2. **Raw immutable data / reproducibility** — already platform law (rights
   snapshots, signal snapshots, versioned picks). Keep extending audit
   trails, not new storage layers.
3. **Kelly/stake sizing stays gated** (Elite, educational). Never on public
   pick surfaces.
4. **Analyst "agents" are pipeline stages, not personalities** — data
   validation, market check, calibration check, risk check, narrative,
   audit. Most exist as gates; do not productize fake personas.

## Build order (next, in order)

1. ~~No-vig implied probability engine~~ SHIPPED 2026-06-12:
   `market-read.ts` (Shin de-vig per book, median consensus across books,
   book hold, marketDisagreementPct). Feed: slate-twin loader already
   selects per-book odds rows.
2. ~~Market disagreement panel~~ FIRST MOUNT SHIPPED 2026-06-12: the
   Market Fair Board on /observatory (no-vig consensus per game, hold,
   book count — market description only). Model-vs-market comparison
   stays gated by the audit-drawer contract (no fair-prob/EV terms on
   pick surfaces) until the owner lifts it.
3. Stat Stability Grade: extend `assessUncertainty` to per-metric envelopes
   in Player Lab.
4. Line Death Clock prototype on the board (edge decay vs line movement).
5. Simulation cloud (distribution visual) on game pages.
