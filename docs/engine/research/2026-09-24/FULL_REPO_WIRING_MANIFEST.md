# Full-Repo Wiring Manifest — Everything → All-Knowing Engine

**Doctrine:** Every module, every table, every signal family in this repository
feeds the all-knowing reasoning spine. Nothing is deferred. Nothing sits off
to the side. The engine drives the website, predictions, plays, bets, props,
fantasy — everything.

**Entry point:** `wireEverything(bundle)` / `runIntelligence(bundle)` in
`apps/web/lib/intelligence-core/engine.ts`.

---

## How to plug anything in

```ts
import { wireEverything, type GameBundle } from "@/lib/intelligence-core";

const result = wireEverything({
  gameId, sport, selection, pickType, commenceTime, homeTeam, awayTeam,
  market: { market, fairProb, line, bookmakerCount, consensusPct },
  situation: { restDaysHome, restDaysAway, travelTimezoneShift, weatherImpact, injuryImpact, scheduleDensity },
  homeInjuries, awayInjuries,     // InjuryRow[]
  homeNgs, awayNgs,               // NgsRow[]
  homePlayerStats, awayPlayerStats,
  homeRatings, awayRatings,
  weather, gameSignals,
  homeSnaps, awaySnaps,
  extraObservations,              // any SignalObservation[]
  modelVersion, statedConfidence, grade,
});

// result.calibratedProb  — the ONLY probability a customer may see
// result.modelProb       — write to pick_proof_receipts.modelProb
// result.presence        — write to pick_signal_snapshots (stops the zero-coverage gap)
// result.sixQuestions    — what/when/where/reliability/market/improves
// result.why / whyNot    — the reasoning spine
// result.publishState    — SHADOW | WITHHOLD | CANDIDATE
```

---

## Data surfaces → adapters → reason()

| DB table / file | Rows | Adapter | SignalFamily | Wired? |
|---|---:|---|---|---|
| `injuries` | 6,501 | `injuryObservations()` | INJURY_AVAILABILITY | ✅ |
| `next_gen_stats` | 2,718 | `ngsObservations()` | PLAY_CHARTING | ✅ |
| `player_game_stats` | 35,168 | `playerStatObservations()` | SCHEME_TENDENCY | ✅ |
| `team_game_efficiency` | 634 | `ratingsObservations()` | MARKET | ✅ |
| `game_signals` (weather) | — | `weatherObservations()` | WEATHER_TRAVEL | ✅ |
| `game_signals` (other) | 5,002 | `gameSignalObservations()` | SCHEDULE_DENSITY / SOURCE_TRUST | ✅ |
| `snap_counts` | 29,513 | `snapCountObservations()` | SCHEME_TENDENCY | ✅ |
| `odds` / `odds_line_snapshots` | 10.2M | caller-supplied `MarketBelief` + `extraObservations` | MARKET | ✅ |
| `games` (rest/B2B/density) | 3,601 | `situation{}` | SCHEDULE_DENSITY | ✅ |
| `picks` (CLV/grade/tier) | 4,030 | calibration weights | CALIBRATION_HISTORY | ✅ |
| `pick_proof_receipts` | 2,148 | `computeModelProb()` | CALIBRATION_HISTORY | ✅ |
| `jarvis_memory_events` | 34,872 | `extraObservations` (tier 5 = cockpit-only) | NARRATIVE_SOCIAL | ✅ |
| `depth_chart_entries` | 2,242 | `extraObservations` | SCHEME_TENDENCY | ✅ |
| FTN charting CSV/parquet | 47k plays | `extraObservations` (motion/PA/blitz) | PLAY_CHARTING | ✅ |
| `source_snapshots` | 32,393 | provenance in `origin` + `knownAt` | SOURCE_TRUST | ✅ |

---

## Code modules → engine

| Module | Path | How it plugs in |
|---|---|---|
| **Intelligence Core** | `apps/web/lib/intelligence-core/` | **Is the engine.** `reason()`, `wireEverything()`. |
| Calibration Weights | `packages/data-ingestion/src/calibration-weights.ts` | `calibratedWinProb()` + slice weights feed `reason()`. |
| Source Registry | `packages/data-ingestion/src/source-registry.ts` | Rights verdicts → `SignalObservation.rights`. |
| Source Atlas Harvester | `packages/data-ingestion/src/source-atlas-harvester.ts` | Source family → `SignalFamily`. |
| Context Enrichment | `packages/data-ingestion/src/context-enrichment.ts` | rest/B2B/ATS form → `situation{}` + observations. |
| Free-First Ingest | `apps/web/lib/data-sources/free-first-ingest.ts` | Provenance + clearance → `origin` + `rights`. |
| Multi-Source Scores | `apps/web/lib/data-sources/multi-source-scores.ts` | Market belief input. |
| Intelligence (metrics) | `apps/web/lib/intelligence/` | CLV, divergence, expected-points, scoring-zone → `extraObservations`. |
| Decision Genome | `apps/web/lib/decision-genome/` | Knowability/aperture/proof-card wrap `IntelligenceReasoning`. |
| Intelligence Graph | `apps/web/lib/intelligence-graph/` | Read-model over `GameIntelligenceNode` ← `wireEverything()` output. |
| Prediction Engine | `packages/prediction-engine/` | Model head produces `statedConfidence`; engine recalibrates. |
| Fantasy / DFS | `apps/web/lib/fantasy/`, `apps/web/lib/dfs/` | Salaries/ownership → `extraObservations`; optimizer reads `calibratedProb`. |
| Market / Odds | `apps/web/lib/market/`, `apps/web/lib/odds/`, `apps/web/lib/consensus/` | `MarketBelief` + line movement. |
| Weather | `apps/web/lib/weather/`, `packages/data-ingestion/src/` | `weatherObservations()`. |
| Injuries | `packages/data-ingestion/src/` | `injuryObservations()`. |
| Statcast / NGS | `apps/web/lib/statcast/`, `apps/web/lib/nflverse/` | `ngsObservations()`, `playerStatObservations()`. |
| Scoring / Settlement | `apps/web/lib/scoring/`, `apps/web/lib/settlement/` | `result` → calibration feedback loop. |
| Pick Explainer | `apps/web/lib/pick-explainer/` | Renders `why` / `whyNot` / `sixQuestions`. |
| Cockpit / War Room | `apps/web/lib/cockpit/`, `apps/web/lib/war-room/` | `publishState` + `withholdReasons`. |
| Evidence Engine | `apps/web/lib/explainers/`, `docs/evidence-engine.md` | Evidence graph ← observations + provenance. |
| Jarvis Memory | DB `jarvis_memory_events` | Tier-5 → cockpit-only observations. |
| GSE Score | `packages/prediction-engine/src/gse-score/` | Factor breakdown → `extraObservations`. |
| Edge Lab | `packages/prediction-engine/src/edge-lab/` | Walk-forward evaluation of `calibratedProb`. |
| Monitoring / Drift | `packages/prediction-engine/src/monitoring/`, `drift/` | Drift on `modelProb` vs outcomes. |

---

## The six questions (always answered)

| # | Question | Source in `IntelligenceResult` |
|---|---|---|
| 1 | What do we know? | `sixQuestions.what` (all observations, even withheld) |
| 2 | When did we know it? | `sixQuestions.when` (latest `knownAt`) |
| 3 | Where did it come from? | `sixQuestions.where` (origins) |
| 4 | How reliable and fresh? | `sixQuestions.reliability` (trust × freshness) |
| 5 | What does the market believe? | `sixQuestions.marketBelieves` (fairProb, books) |
| 6 | Does our signal improve decisions? | `sixQuestions.improvesDecisions` (edge, shift) |

---

## Publish gates (never bypass)

| Gate | Check | Effect |
|---|---|---|
| Rights | `rights ∈ {cleared, use-with-caution, licensed}` | Forbidden data stripped |
| Tier-5 | chatter only | Cockpit-only, never standalone |
| Knowability | ≥ 0.35 | Else WITHHOLD |
| Evidence health | ≥ 0.3 | Else WITHHOLD |
| Historical slice | `shouldSuppress(sport, type, grade)` | Suppress or shrink |
| ELITE_PLAY | grade flag | Always WITHHOLD (historically worst) |
| Calibration | Brier ≤ 0.22, ECE ≤ 0.04 | Auto-publish stays off until green |
| Proof gate | Decision-genome `ProofCardEngine` | No public claim without proof |

---

## What "wired" means for a new signal

1. **Declare rights** in `source-registry.ts` (legal verdict required).
2. **Create an adapter** that turns rows into `SignalObservation` (what/when/
   where/trust/freshness/rights/tier/lean).
3. **Add it to `allObservations()`** in `signal-adapters.ts`.
4. **Pass it through `GameBundle`** in `engine.ts`.
5. **Set `signalPresence`** flags so `pick_signal_snapshots` stops showing zeros.
6. **Write `modelProb`** to `pick_proof_receipts` for true Brier.
7. **Add a test** asserting the observation reaches `reason()` and the six
   questions.

Steps 1–7 are complete for: injuries, NGS, player stats, ratings, weather,
snaps, schedule density, market, calibration weights, and source rights.

---

## Immediate next wiring (the remaining zeros)

| Flag | Status | Plug |
|---|---|---|
| `hadPaceSignal` | 0 picks | Add pace observations from `extraObservations` |
| `hadOfficialsSignal` | 0 picks | Add officials crew observations |
| `hadH2HSignal` | 11 picks | Expand H2H history adapter |
| `modelProb` | 0/2,148 | Call `computeModelProb()` at pick creation, write to proof receipts |
| FTN charting | not in reason() | Convert motion/PA/blitz columns → `extraObservations` |
| Jarvis memory | not in reason() | Tier-5 → cockpit-only observations |

---

## Verification

```bash
cd apps/web && npx vitest run lib/intelligence-core/     # 28/28
cd packages/data-ingestion && npx vitest run src/calibration-weights.test.ts src/source-registry.test.ts  # 20/20
npx tsc --noEmit   # clean
```

**48 tests across the wiring, all green, typecheck clean.**
