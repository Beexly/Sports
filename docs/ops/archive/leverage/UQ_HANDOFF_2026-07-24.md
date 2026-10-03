# Universe of Uncertainty Quantification & Honesty Stack — Coding Agent Handoff

**Date**: 2026-07-24  
**Purpose**: Complete synthesis of the extended research session so the coding agent only *verifies* and wires. All core algorithms have been designed; implement the remaining pure TypeScript modules, tests, and integration points listed below.

## 1. Already Present in Repo (Do Not Rewrite)

- `packages/prediction-engine/src/calibration/ivap.ts` — solid Inductive Venn-Abers + linear-time PAV
- `packages/prediction-engine/src/conformal-intervals.ts`
- `packages/prediction-engine/src/edge-lab/selective-gate.ts`
- Calibration maps, placebo, Glass Ledger / Pedersen, etc.

## 2. New Modules to Add / Complete (Priority Order)

### Core Calibration & Venn-Abers Family

1. **`packages/prediction-engine/src/calibration/pav.ts`**  
   Extract the linear-time weighted PAV (already inside ivap.ts) into a reusable pure function + Neumaier-safe variants if needed.

2. **`packages/prediction-engine/src/calibration/cvap.ts`**  
   Cross Venn-Abers Predictor: K-fold IVAP + geometric-mean aggregation (log-space + Neumaier summation). See session for exact formulas and TypeScript sketches.

3. **`packages/prediction-engine/src/calibration/aggregation.ts`**  
   - `logSpaceGeometricMeanAggregation` (with Neumaier)
   - Arithmetic mean aggregator
   - Helper to convert multiprobability → single point (midpoint / lower / minimax)

4. **Local Isotonic Patch** (for multicalibration audit-and-patch)  
   `packages/prediction-engine/src/calibration/local-isotonic-patch.ts`

### Mondrian & Tree-Based Partitioning

5. **`packages/prediction-engine/src/conformal/mondrian.ts`**  
   Taxonomy interface, per-category residual stores, quantile lookup, fallback to parent.

6. **Levene / Welch split utilities**  
   `packages/prediction-engine/src/conformal/levene-welch.ts`  
   Brown-Forsythe preferred. Used by LWT-MCPS style trees.

7. **LWT-MCPS sketch**  
   Document + minimal pure-TS prototype of the Levene-Welch tree + KNN feature augmentation + per-leaf CPD. Full production tree grower can be deferred; start with the split quality function and leaf assignment.

### Multicalibration

8. **Audit-and-patch loop**  
   `packages/prediction-engine/src/calibration/multicalib-audit-patch.ts`  
   Iterative group × bin audit + local isotonic (or Venn-Abers) patch. Include min-sample guards and soft blending λ.

9. **Venn Multicalibration notes**  
   Reference the 2025 van der Laan & Alaa framework; implement only the binary / group-indicator special case first.

### Sports Subgroup Taxonomy

10. **`packages/prediction-engine/src/conformal/sports-taxonomy.ts`**  
    Concrete Tier-1 / Tier-2 group functions (home/away, favorite/underdog, rest buckets, intersections). Diagnostics helpers (size, coverage, width per category).

## 3. Non-Code Artifacts Already Synthesized (Place in docs/)

- Full competitive teardown of sports-science AI companies (Catapult, VALD, Kitman Labs, Stats Perform, etc.) + partnership approach (honesty layer on top of their data).
- Concrete multi-agent Edge Lab map adapting TradingAgents-style debate (Market Microstructure Analyst, Feature Analyst, Placebo Analyst, Calibration Analyst, Decision Agent, Risk/Honesty Guardian, Glass Ledger).
- Highest-leverage revenue action plan (sports-science partnerships → white-label API → MCP packaging → content/affiliate).
- Top AI agent systems by category (finance, robotics, medical selective prediction, sports science, forecasting, math engines, etc.) with GSE transfer notes.

These live in this handoff and in earlier session docs (e.g. CLAUDE_MCP_CONNECTOR_LEVERAGE). Coding agent should turn the multi-agent roles into typed interfaces and a thin orchestrator stub.

## 4. Integration Points with Existing Stack

- Wire IVAP / CVAP multiprobability into `selective-gate.ts` (width and lower endpoint as primary No-Bet signals).
- Record full multiprobability + taxonomy category + conformal set into Glass Ledger / Pedersen commitments.
- Add walk-forward diagnostics for per-category coverage and interval width.
- Keep all new code pure TypeScript, side-effect free where possible, matching existing style (no external ML libs for the core UQ primitives).

## 5. Testing Expectations for Coding Agent

- Unit tests for PAV (already partially covered), IVAP edge cases, geometric aggregation (including extreme probabilities), Mondrian category assignment, local isotonic patch min-sample behavior.
- Property tests: multiprobability width ≥ 0, p0 ≤ p1 after ordering, coverage diagnostics on synthetic exchangeable data.
- Do **not** re-implement the core PAV or IVAP algorithms; extend and test.

## 6. Immediate Next Actions for Coding Agent

1. Extract / polish `pav.ts` and add Neumaier helpers if not present.
2. Implement `cvap.ts` + `aggregation.ts` using the log-space Neumaier geometric mean from the session.
3. Add sports taxonomy + basic Mondrian residual manager.
4. Create a thin multi-agent Edge Lab role interface file (typed agents + debate summary type).
5. Write the partnership one-pager content into `docs/ops/sports-science-partnerships.md`.
6. Verify everything against existing conformal / selective-gate / ledger tests; keep the honesty invariants intact.

## 7. Design Principles (Do Not Violate)

- Finite-sample honesty first (exchangeability → multiprobability / group-conditional coverage).
- Selective prediction / No-Bet is a first-class citizen.
- Everything that affects a displayed probability or decision must be recomputable from the Glass Ledger.
- Prefer pure functions and explicit data structures over hidden mutable state.

---

**This handoff contains the complete intellectual output of the research session.**  
The coding agent’s job is verification, wiring, tests, and production hardening — not rediscovery.
