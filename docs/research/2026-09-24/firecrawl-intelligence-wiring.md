# Firecrawl Intelligence Wiring Pack

**Date:** 2026-09-25  
**Source:** Two Firecrawl deep-research agent runs against this repository  
(`01a0d6cf-7229-7649-a9dd-0758e9425524` pass-1 source map;  
`01a0d6d8-8c70-7785-9a0f-24b10ea01f86` pass-2 deep audit).  
**Snapshot reviewed:** `main` at `7da237b` (Sep 25, 2026).

This pack wires the external research **into the repo as durable, actionable
artifacts** — not a one-off PDF. Everything here is either (a) a source
candidate that can enter the legal registry, (b) a finding that should change
build order, or (c) a schema/pipeline contract for model-owned projections.

---

## What was wired

| Artifact | Path | Purpose |
|---|---|---|
| **Evidence-first intelligence spine** | [`evidence-first-intelligence-spine.md`](./evidence-first-intelligence-spine.md) | **Standing doctrine** — objective, six questions, publish boundary, signal-done definition |
| Source candidates (121) | [`source-candidates-firecrawl.json`](./source-candidates-firecrawl.json) | Machine-readable catalog of every recommended + expanded source, with priority, signal types, rights notes, and citations |
| Second-pass findings (38) | [`second-pass-findings-register.md`](./second-pass-findings-register.md) | What we missed, underleveraged, and overvalued — with recommended actions |
| Integration sprint S0–S7 | [`integration-sprint-S0-S7.md`](./integration-sprint-S0-S7.md) | Ordered build plan from "freeze truth/rights" through production reliability |
| Model-owned projection pipeline | [`model-owned-projection-pipeline.md`](./model-owned-projection-pipeline.md) | 10-step durable architecture + minimum schema + output contract |
| TD props usage prompts (6/8) | [`td-props-usage-prompts.md`](./td-props-usage-prompts.md) | Goal-line / red-zone / script / long-score / soft-spot / QB-vulture analysts for anytime-TD props |
| Legal source registry additions | [`packages/data-ingestion/src/source-registry.ts`](../../packages/data-ingestion/src/source-registry.ts) | Open sources cleared; commercial vendors declared `paid-required` (gated until licensed) |

---

## Bottom line (from the expanded research)

> The next bottleneck is not finding another hundred feeds. It is converting the
> existing breadth into a trustworthy temporal data contract, durable fantasy
> schema, model registry, distributional/ownership model, and sealed evaluation
> loop.

The repo is **stronger** than its durable fantasy/model artifacts suggest in
gates, evidence vocabulary, and deterministic testing — and **weaker** in
point-in-time semantics, model ownership, contest-state persistence, operational
SLO/privacy/security evidence, and production drift controls than its
documentation breadth suggests.

---

## Highest-impact gaps (first pass)

1. **Fantasy projections are not model-owned** (critical) — `dfs-slate.ts`
   proj/ceiling/own values are manually authored constants. No training
   pipeline, no pick-result feedback loop.
2. **ADP is single-source and lazily refreshed** (high) — need a second ADP
   provider, freshness cron, and divergence alerts.
3. **Rankings adapter exists but has no live consumer** (high).
4. **Active legally usable coverage < seeded source universe** (high) —
   tracking/pressure/coverage/route/trenches data needs contracts.
5. **Many engine modules are orphaned / scripts-only** (high) — edge-lab
   harness has not run on a schedule or in CI.
6. **Calibration is not publish-ready** (critical) — Brier 0.2478 RED vs ≤0.22
   floor; auto-publish and calibration adjustments remain off.
7. **No monitor for `odds_line_snapshots`** (high) — prior archive outages went
   unnoticed.
8. **Health/recovery data ≠ public injury news** (high) — requires consent,
   minimization, access controls, and explicit rights.
9. **Backtesting proof is fixture-backed, not historical** (critical).
10. **Measurement shortage, not signal shortage** (critical) — invest in PIT
    snapshots, lineage, leakage tests, baselines, calibration, CLV, drift.

See [`second-pass-findings-register.md`](./second-pass-findings-register.md) for
the 38 second-pass findings (schema is still a betting-pick system, not a
model-owned fantasy system; player identity is NFL/nflverse-specific; model
governance is free-text `modelVersion`; and more).

---

## Source posture (from the research)

**Rule:** every source below is a *candidate*, not an automatic integration.

- Require written rights/terms for commercial feeds, tracking, video, league
  pages, and editorial content. Public visibility ≠ redistribution permission.
- Store `fetched_at`, `source_as_of`, license/contract, parser version, raw
  hash, and transformed feature version for every record.
- Do not put a signal into a published probability until it survives
  point-in-time leakage tests, purged walk-forward evaluation, market-baseline
  comparison, and a pre-registered kill line.
- Health/wearable/cognitive/biometric data only with athlete/team consent and a
  legal basis; isolate from public editorial feeds.
- Prefer abstention/withholding when freshness, coverage, identity, rights, or
  calibration floors fail.

Full catalog: [`source-candidates-firecrawl.json`](./source-candidates-firecrawl.json).

### Registry wiring (this PR)

| Source | Verdict | Why |
|---|---|---|
| `openligadb` | cleared-with-attribution | ODbL 1.0, no key/quota; Bundesliga + other football |
| `thesportsdb` | cleared-with-attribution | Free/open crowd-sourced multi-sport DB; free API tier |
| `openf1` | use-with-caution | Open-source F1 API; verify license/rate limits before production |
| `sportradar` | paid-required | Multi-sport commercial API; contract required |
| `genius-sports` | paid-required | Official data + tracking; commercial terms required |
| `stats-perform` | paid-required | STATS/Opta live + historical; access key + contract |
| `api-sports` | paid-required | Multi-sport API products |
| `football-data-org` | paid-required | Free tier exists; commercial redistribution needs a plan |
| `sportmonks` | paid-required | Football API; free tier to start, production needs plan |
| `nba-official-injury` | use-with-caution | Official public injury report; facts only, no republication |
| `nfl-official-injury` | use-with-caution | Official public injury report; facts only |
| `mlb-injury-report` | use-with-caution | Official public injury/transactions; facts only |
| `whoop-api` | paid-required | Sensitive health; OAuth + consent + minimization required |
| `oura-api` | paid-required | Sensitive sleep/readiness; token + privacy controls required |

Already present and relevant: `nflverse`, `sportsdataio`, `baseball-savant`,
`statsbomb-free` (forbidden for commercial), `nws-weather`, `open-meteo`,
`espn-public-api`, `kalshi`, `the-odds-api`, and the free-first adapter set.

---

## Build order (do not skip)

**Ordering principle:** do not add more signal breadth until identity,
point-in-time availability, durable model artifacts, and evaluation receipts are
real.

1. **S0 — Truth, identity and rights freeze.** Canonical entity IDs + provider
   crosswalks; source registry with rights/status/contract/attribution; PIT
   event schema; conflict/freshness rules; sensitive-data boundary; provider
   health monitoring.
2. **S1 — Durable fantasy slate and contest plane.** Contest, ContestSlate,
   ContestRule, SalarySnapshot, PlayerEligibility, Lineup, LineupSlot,
   OwnershipProjection, OptimizationRun — versioned artifacts.
3. **S2 — Point-in-time feature and label store.** FeatureDefinition registry
   with owner, sport, source, rights, event_time, availability semantics.
4. **S3 — Baseline model-owned projections.** Market-only/role-only baseline +
   sport-specific hierarchical model. Distributional output, not point estimates.
5. **S4 — Calibration, uncertainty, sealed evaluation.** Purged walk-forward,
   sealed holdout, Brier/log-loss/ECE/reliability/coverage, CLV, promotion/kill
   gates. No public superiority claim before this gate.
6. **S5 — Ownership, correlation, contest decision engine.** Ownership model
   with time-sliced training; simulation-based optimizer on real slates.
7. **S6 — High-value signal activation in shadow mode.** Official
   injuries/transactions/lineups, weather/venue/travel, tracking/video only
   under contract, news/beat with timestamps, health only with consent.
8. **S7 — Production reliability, safety, evidence UX.** Champion/challenger
   registry, drift dashboards, SLOs, evidence cards, abstention states.

Full detail: [`integration-sprint-S0-S7.md`](./integration-sprint-S0-S7.md).

---

## Model-owned projection pipeline (summary)

> The model owns the projection; sources own observations; the contest engine
> owns constraints; the evidence layer owns explanation; the registry owns
> promotion. Do not let a source, heuristic rank, LLM narrative, or optimizer
> silently become the projection.

10 steps: identity → observation ledger → PIT features → role/availability →
hierarchical distribution → calibration/uncertainty → ownership/contest →
evaluation/promotion → serving/evidence → monitoring/retrain.

Minimum durable schema entities: CanonicalEntity, SourceSnapshot,
FeatureDefinition/FeatureSnapshot, LabelDefinition/LabelObservation,
ModelArtifact/ModelVersion/ModelPromotion, PlayerProjection/
ProjectionDistribution, OwnershipProjection, Contest/ContestSlate/
SalarySnapshot, Lineup/LineupSlot, OptimizationRun, EvaluationReceipt.

Full spec: [`model-owned-projection-pipeline.md`](./model-owned-projection-pipeline.md).

---

## What not to do

- Do not train on "latest" tables without as-of/created-at filtering.
- Do not call manual illustrative constants model-owned projections.
- Do not blend probability, edge, rank, confidence, ownership, and narrative
  into one unexplained number.
- Do not activate a source because it is publicly visible.
- Do not expand public performance claims while Brier is RED and auto-publish
  is off.
- Do not treat fixture-backed backtests as historical prediction proof.

---

## How to use this pack

1. **Triage sources:** open `source-candidates-firecrawl.json`, filter by
   `integration_priority` and `pass`, and promote candidates into
   `packages/data-ingestion/src/source-registry.ts` only after rights review.
2. **Work the gaps:** use the findings register as the issue backlog; each
   finding has a recommended action and evidence URL.
3. **Follow S0→S7:** the sprint plan is the ordering contract. S0 and S2 are
   prerequisites for real projections.
4. **Build projections against the pipeline spec:** any new projection code
   should map to the 10-step pipeline and the minimum durable schema.
5. **Keep the safety posture:** internal calibration only, no auto-publish, no
   auto-bet, no automated external posting — until S4 gates pass.

---

## Citations

- Repository: https://github.com/Beexly/Sports
- Snapshot commit: https://github.com/Beexly/Sports/commit/7da237bcec21c26f1eeebdd1de6e6e88bd461939
- First-pass run: Firecrawl `01a0d6cf-7229-7649-a9dd-0758e9425524` (218 tool calls, 128 pages)
- Second-pass run: Firecrawl `01a0d6d8-8c70-7785-9a0f-24b10ea01f86` (117 tool calls, 108 pages)
- All source citations live inside `source-candidates-firecrawl.json` and the
  findings register.
