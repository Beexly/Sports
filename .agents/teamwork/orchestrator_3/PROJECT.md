# Project: Galaxy Sports Edge 200+ Gates, L1-L5 Reasoning, CI Repair & Pre-Kickoff Deployment

## Architecture
- Module/package boundaries, data flow, shared interfaces:
  - `packages/ingestion-pipeline` / `workers/data-refresh`: Odds-first keyless ingestion (Galaxy/ESPN) with paid fallback, bet term preservation, and line snapshot persistence.
  - `packages/prediction-engine`: Independent estimators, edge calculation, de-vig models, and Wilson LCB / BDR-Kelly allocations.
  - `frontier/sports`: 5 Engine Gates (G1 Live Roster, G2 Provenance & Freshness, G-Sig 47 catalogued signals, G3 JEV Epistemic Arbitration, G4 Real Empirical LCB & Math Synthesis, G5 Stamp `ENGINE_GATE_V1`), Vine Copula Parlay Engine, Higham nearest-PSD repair.
  - `intelligence/roster/live_roster_gate.py`: Live ESPN + Sleeper roster gate, suffix-aware identity preservation, fail-closed on injuries/inactives/feed down.
  - `intelligence/reasoning`: L1-L5 reasoning trace engine, 5-track checklist (`qb_behavior`, `coaching_scheme`, `offensive_line`, `trust_signals`, `scheme_matchup`), L4 adversary breaking conditions evaluating to False, hierarchy OL -> Coaching -> QB.
  - `intelligence/props` & `intelligence/sgp`: Prop discrepancy engine, measured nflverse correlations (`sgp_correlations.json`), Clayton/Gaussian copulas, 25 unmodeled prop families quarantine (`UNGRADED`/priced-only).
  - `apps/web`: Next.js web application, public `/sgp-projections` route, adverse edge suppression, paywall entitlements.
  - `scripts/deploy`: Neon HTTP migration parity gate (`neon-http-migration-parity.mjs`) over TLS 443, Vercel build integration.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Test Runner Worktree Isolation | Enforce .worktrees/** and .agents/** exclusion across Vitest and pytest configurations | M1 | Survey |
| 2 | CI on Main Repair | Fix process-sport.ts syntax splice, nav.tsx duplicate Nav, auth/signin duplicate metadata, and data-ingestion export | M1 | Survey |
| 3 | Process-Sport Test Suite Baseline | Verify vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts passes 87/87 tests | M1 | Survey |
| 4 | Restore 50 Missing Frontier Engines | Merge commit b711f4c81598090f5b94e04e689c0ecdef60ddc5 into active tree to resolve ModuleNotFoundError across frontier/sports | M2 | Survey |
| 5 | Live Roster Gate Verification | Verify ESPN primary + Sleeper cross-check, inactives detection, suffix awareness, and fail-closed policy | M2 | Survey |
| 6 | 5 Frontier Gates & Conjunction Gate | G1 Roster, G2 Provenance, G-Sig 47 Signals, G3 JEV, G4 Real LCB, G5 Stamp ENGINE_GATE_V1 | M2 | Survey |
| 7 | Fail-Closed PASS & Negative CLV Veto | Fix scoring.ts:815/1456, adverse-edge-suppression.ts:83, and generate-signal-slate.ts:875 to strictly veto decision == "PASS" | M2 | Survey |
| 8 | L1-L5 Reasoning Trace Engine Integration | Enforce L5 trace depth on published cards/picks, 0 breaking conditions met, 0 unchecked tracks, OL->Coaching->QB hierarchy | M2 | Survey |
| 9 | Mathematical & Statistical Rigor Proof | Wilson score LCB, Bayesian robust Kelly, Copula tail dependence, Higham nearest-PSD repair, Poisson/CQR | M2 | Survey |
| 10 | PR #1158 Merge (SGP Copula + Measured Correlations) | Merge feat/sgp-chain-real-data-2026-10-12 cleanly into main (copula, nflverse correlations, prop discrepancy engine, auto-settle) | M3 | Survey |
| 11 | PR #1157 Merge (/sgp-projections Route) | Merge feat/sgp-projections-page-2026-10-12 with defensive loading and honest empty state | M3 | Survey |
| 12 | 25 Prop Families Quarantine | Quarantine unmodeled prop families as UNGRADED or priced-only without EV claims | M3 | Survey |
| 13 | Live Props Board Merge | Merge motif/props-board-live-2026-10-12 keyless Pinnacle Shin devig and honest empty joins | M3 | Survey |
| 14 | Migration Ledger Execution & Parity | Verify Neon HTTP migration parity (verdict=up-to-date repo=4 applied=59) | M4 | Survey |
| 15 | User-Authenticated Checklist | Document pre-filled Neon and Vercel credentials and connection checklist | M4 | Survey |
| 16 | Pre-Kickoff Engine Gauntlet | Verify all 241+ intelligence tests pass (props 59, sgp 32, physics 19, settle 28, refresh 16, reasoning 73, roster 11) | M4 | Survey |
| 17 | Production Deployment & Route Verification | Trigger Vercel deploy, run post-deploy smoke and prod-probe, verify HTTP 200 on all production routes | M4 | Survey |
| 18 | Final Multi-Agent Verification & Handoff | Reviewers (2) + Challengers (2) + Forensic Auditor adversarial verification gauntlet | M5 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Test Suite Isolation & CI on Main | Vitest/pytest .worktrees/** exclusion, fix 4 compilation blockers on main, repair junctions, verify 87/87 process-sport tests | none | DONE |
| M2 | 200+ Engine Gates & L1-L5 Reasoning | Restore 50 frontier files, fix decision=="PASS" leak in scoring.ts, wire L1-L5 reasoning into emission, prove math engines | M1 | IN_PROGRESS |
| M3 | Deterministic Merges & Quarantine | Merge PR #1158 (SGP + correlations), PR #1157 (/sgp-projections), props board, enforce 25 prop quarantine | M1, M2 | PLANNED |
| M4 | Migration Ledger & Production Deployment | Execute migration ledger parity, user auth checklist, pre-kickoff gauntlet, deploy, verify live HTTP 200 routes | M3 | PLANNED |
| M5 | Final Verification & Sentinel Handoff | Multi-agent adversarial verification (Reviewers, Challengers, Auditor), deliver handoff.md | M4 | PLANNED |

## Interface Contracts
### Ingestion ↔ Prediction Engine
- `process-sport.ts` produces `GameRow` and `CandidateOdds` with `provider: "galaxy" | "espn" | "odds-api"` and write-once bet terms.
- `scoring.ts` / `edge-engine.ts` consumes candidate odds, produces `IndependentEdgeSummary` with `decision: "PLAY" | "LEAN" | "PASS"`, `expectedClv: number`.
- Contract rule: If `decision === "PASS"`, `scoring.ts` MUST return `null`.

### Gates ↔ Pick Publication
- `engine_gate.py` evaluates candidate pick through G1 (Live Roster), G2 (Freshness/Provenance), G-Sig (47 signals), G3 (JEV), G4 (Wilson LCB + BDR-Kelly).
- `publishable(pick)` returns `True` iff `stamp == "ENGINE_GATE_V1"` and all gates ok.
- Candidate MUST carry an L5 reasoning trace with zero breaking conditions met.

### Web ↔ SGP Projections
- `/sgp-projections` route reads `apps/web/data/sgp-projections.json`.
- If file is missing or contains 0 projections, route renders honest empty state without throwing HTTP 500.

## Code Layout
- `packages/ingestion-pipeline/`: Ingestion, odds adapters, signal registry, process-sport.
- `packages/prediction-engine/`: Scoring, edge calculation, model limitations, robust Kelly.
- `frontier/sports/`: Engine gate, vine copula, matrix repair, signal registry parity, mathematical proofs.
- `intelligence/roster/`: Live roster gate with ESPN/Sleeper feeds.
- `intelligence/reasoning/`: L1-L5 reasoning trace engine, checklist, adversary, hierarchy validation.
- `intelligence/props/` & `intelligence/sgp/`: Prop discrepancy engine, SGP copula, measured correlations.
- `apps/web/`: Next.js web application.
- `scripts/deploy/`: Migration parity gate, build scripts, deployment checklists.
