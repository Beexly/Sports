# Project: Mandatory GSE Engine Gate & Roster/Signal Enforcement Audit

## Architecture
- **Mandatory Emission Gate**: `frontier/sports/engine_gate.py` implementing the Unified 5-Gate Emission Standard (`ENGINE_GATE_V1`):
  - G1: Live Roster Gate (`intelligence/roster/live_roster_gate.py` — ESPN primary + Sleeper cross-check)
  - G2: Provenance & Freshness Gate (`Sourced` objects, age <= 30m for lines/odds, age <= 7d for history)
  - G3: JEV Mandatory Arbitration (`jev.cmd ask`, CERTIFIED/CAUTION <= 0.70)
  - G4: Real Empirical LCB & Mathematical Synthesis (Wilson 95% LCB, BDR-Kelly, CQR, Law 9 enforcement)
  - G5: Provenance Stamping (`EmittedPick`, `publishable()` check)
- **GSE Signal Registry**: `packages/ingestion-pipeline/src/signal-registry-definitions.ts` and `signal-registry-extensions.ts` (47 registered signals across 8 families), mirrored in native Python `frontier/sports/signal_registry.py` with 1:1 parity.
- **Mathematical Engines**:
  - `frontier/sports/bayesian_robust_kelly_engine.py`: Beta-Binomial, Cornish-Fisher, CV penalty $\kappa$, Browne ruin.
  - `frontier/sports/vine_copula_parlay_engine.py`: Clayton/Gumbel/Frank/Gaussian, Fréchet-Hoeffding bounds, exact h-functions.
  - `frontier/sports/matrix_repair.py`: Higham nearest-PSD repair, safe Cholesky.
  - `frontier/sports/adaptive_conformal_engine.py` & `poisson.ts`: CQR, Jackknife+, DtACI, Poisson scoring.
  - `frontier/sports/nfl_ep_wp_engine.py` & `shootout_velocity_engine.py`: 7-state EP/EPA, Brownian WP, logistic SVI, clock expansion.
- **Data Ingestion & Feeds**: `frontier/sports/live_feeds.py` (ESPN live scoreboard, prop bets, gamelogs).
- **Enforcement & Quarantine**: 16 legacy scripts locked down with `_retired.py`, static CI anti-bypass scanning in `test_engine_gate.py`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Signal Registry Mirror & Parity | Native Python mirror of all 47 signals with 1:1 ID, family, category, weight parity | M1 | Survey |
| 2 | Engine Gate Signal Enforcement | Route candidates through Signal Registry (G-Sig) in `engine_gate.py` | M1 | Survey |
| 3 | Engine Gate Math Synthesis | Integrate BDR-Kelly, CQR, SVI, EPA, and Copula into Gate G4 | M1 | Survey |
| 4 | Wilson Score LCB Verification | Formal empirical validation of 95% LCB, $n \ge 5$, no scalar shortcuts | M2 | Survey |
| 5 | Bayesian Robust Kelly Verification | Verify Beta-Binomial conjugate update, Cornish-Fisher LCB, CV penalty $\kappa$, Browne ruin | M2 | Survey |
| 6 | Copula Tail Dependence Verification | Verify Clayton lower-tail, Gumbel upper-tail, Fréchet-Hoeffding bounds, C-Vine simulation | M2 | Survey |
| 7 | Higham Nearest-PSD Repair Verification | Verify eigenvalue clipping, unit diagonal normalization, safe Cholesky recovery | M2 | Survey |
| 8 | Poisson & CQR Verification | Verify Poisson discrete PMF, Jackknife+ finite-sample coverage $\ge 1-2\alpha$, DtACI miscoverage | M2 | Survey |
| 9 | EPA & SVI Verification | Verify 7-state EP/EPA, Brownian WP, logistic SVI, bilateral playoff leverage harmonic mean | M2 | Survey |
| 10 | DET @ CAR Live Feeds & Roster Audit | Ingest live ESPN Event 401872978, verify 32-team rosters & inactives, block traded players | M3 | Survey |
| 11 | DET @ CAR Board Re-Verification | Evaluate all live DET @ CAR props through strengthened Engine Gate, enforce Law 9 fail-closed | M3 | Survey |
| 12 | Live Feed Provenance Stamp Audit Report | Generate sealed JSON & Markdown audit report in `outbox/` with full provenance stamps | M3 | Survey |
| 13 | E2E Independent Test Suite | Execute full test suite across `frontier/sports/` and `intelligence/roster/` | M4 | Survey |
| 14 | CI Anti-Bypass Static Scanning | Scan repo for zero inline player data, zero ungated emitters, all 16 scripts retired | M4 | Survey |
| 15 | Forensic Integrity Audit | Multi-agent forensic audit verifying zero cheating, zero facades, clean integrity verdict | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Engine Gate Signal Registry & Math Integration | Implement `frontier/sports/signal_registry.py`, strengthen `frontier/sports/engine_gate.py`, add parity tests | None | DONE |
| M2 | Mathematical Equations & Formal Verification | Create comprehensive test suite proving all 6 mathematical equations fail-closed | M1 | DONE |
| M3 | DET @ CAR SNF Board Re-verification & Audit | Execute live DET @ CAR board evaluation with live feed provenance stamps, write sealed audit | M1, M2 | DONE |
| M4 | E2E Test Suite & Forensic Integrity Audit | Reviewers, Challengers, and Forensic Auditor verification across all deliverables | M1, M2, M3 | DONE |

## Interface Contracts
### `signal_registry.py` ↔ `engine_gate.py`
- `SignalRegistry`: Catalog of 47 `SignalDefinition` instances (19 base, 5 blocked, 23 extended).
- `evaluate_signals(ctx: SignalContext) -> Dict[str, SignalEvaluationResult]`
- G-Sig Gate in `EngineGate`: Verifies candidate context matches active registered signals and extracts model weights.

### `engine_gate.py` ↔ Mathematical Engines
- `bootstrap_free_lcb(history, line, side, z=1.645) -> Optional[Dict[str, float]]`
- `BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly(...) -> RobustKellyAllocation`
- `safe_cholesky(matrix_repair.nearest_positive_definite(corr)) -> (L, was_repaired)`
- `VineCopulaParlayEngine.evaluate_parlay(...) -> CopulaEvaluationResult`
- `ShootoutVelocityEngine.compute_game_script_urgency(...) -> SVIResult`

### `audit_tonight_snf.py` ↔ `outbox/`
- Emits `outbox/DET-CAR-SNF-AUDIT-2026-10-04.json` containing:
  - Event metadata (ESPN Event ID `401872978`, kickoff, venue, weather)
  - Live roster gate status (ESPN + Sleeper)
  - Sourced props with live feed capture timestamps (<30m)
  - Full GateLogs G1–G5 for each candidate pick
  - Stamped `EmittedPick` payloads with `ENGINE_GATE_V1`

## Code Layout
- `frontier/sports/engine_gate.py`: Core 5-gate engine.
- `frontier/sports/signal_registry.py`: Native Python Signal Registry mirroring TS.
- `frontier/sports/test_signal_registry_parity.py`: Parity test verifying 1:1 match with TS definitions.
- `frontier/sports/bayesian_robust_kelly_engine.py`: BDR-Kelly engine.
- `frontier/sports/vine_copula_parlay_engine.py`: Vine Copula SGP engine.
- `frontier/sports/matrix_repair.py`: Higham PSD matrix repair.
- `frontier/sports/adaptive_conformal_engine.py`: CQR & DtACI engine.
- `frontier/sports/shootout_velocity_engine.py`: SVI engine.
- `frontier/sports/nfl_ep_wp_engine.py`: EPA engine.
- `frontier/sports/audit_tonight_snf.py`: SNF board re-verification runner.
- `intelligence/roster/live_roster_gate.py`: Dual-feed live roster gate.
- `outbox/`: Output destination for audit reports and stamped pick artifacts.
