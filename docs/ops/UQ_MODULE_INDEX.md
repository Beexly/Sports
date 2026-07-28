# UQ Honesty Stack — Module Index

**Last updated**: 2026-07-28 (post walk-forward harness + Council↔Gate alignment)

One-page map so the next agent does not rediscover ownership, invariants, or
test locations. Companion docs:

- `docs/ops/UQ_HANDOFF_2026-07-24.md` — original design handoff
- `docs/ops/UQ_HARDENING_SESSION_2026-07-28.md` — verification + dedup + council

## Calibration (Venn-Abers family)

| Module | Path | Invariants | Tests |
|--------|------|------------|-------|
| PAV (linear-time isotonic) | `calibration/pav.ts` | non-decreasing fitted values; weighted pool; total on empty | `__tests__/pav.test.ts` |
| Inductive Venn-Abers | `calibration/ivap.ts` | p0≤p1; width≥0; empty→0.5/0.5; imports shared PAV | `__tests__/ivap.test.ts` |
| Aggregation (geo + Neumaier) | `calibration/aggregation.ts` | ordered multiprob; finite on extremes | `__tests__/aggregation.test.ts` |
| Cross Venn-Abers | `calibration/cvap.ts` | K-fold IVAP + geo mean; fold clamp; deterministic seed | `__tests__/cvap.test.ts` |
| Local isotonic patch | `calibration/local-isotonic-patch.ts` | minSamples gate; λ∈[0,1]; isotonic knots | `__tests__/local-isotonic-patch.test.ts` |
| Multicalib audit-and-patch | `calibration/multicalib-audit-patch.ts` | minSamples gate; no cross-group contamination; maxIterations honest | `__tests__/multicalib-audit-patch.test.ts` |

## Conformal / Mondrian

| Module | Path | Invariants | Tests |
|--------|------|------------|-------|
| Mondrian residual manager | `conformal/mondrian.ts` | hierarchical fallback; abs residual; (n+1) quantile | `__tests__/mondrian.test.ts` |
| Sports taxonomy | `conformal/sports-taxonomy.ts` | pure category assignment; parent chain terminates | `__tests__/sports-taxonomy.test.ts` |
| Levene / Welch / split quality | `conformal/levene-welch.ts` | total function (no throw/NaN); saturated mean leg | `__tests__/levene-welch.test.ts` |
| LWT-MCPS sketch | `conformal/lwt-mcps-sketch.ts` | deterministic partition; sample accounting; depth bound | `__tests__/lwt-mcps-sketch.test.ts` |

## Edge Lab (decision path)

| Module | Path | Invariants | Tests |
|--------|------|------------|-------|
| Selective gate | `edge-lab/selective-gate.ts` | sole FIRE authority; width No-Bet; MIN_STRATUM_CALIBRATION=100; disjoint sets | `edge-lab/__tests__/selective-gate-multiprob.test.ts` |
| Agent role contracts | `edge-lab/agent-roles.ts` | typed roles + context | (via council tests) |
| Sequential Edge Lab Council | `edge-lab/edge-lab-council.ts` | guardian hard veto; placebo undefined≠passed; diagnostic-only ledger | `edge-lab/__tests__/edge-lab-council.test.ts` |
| Walk-forward taxonomy harness | `edge-lab/walk-forward-taxonomy.ts` | per-row Mondrian; underpowered/under-coverage/wide alerts; no invented fields | `edge-lab/__tests__/walk-forward-taxonomy.test.ts` |
| Council↔Gate alignment | — | shared width / sample-floor / lower-endpoint / placebo doctrine | `edge-lab/__tests__/council-gate-alignment.test.ts` |

## Design principles (do not violate)

1. Finite-sample honesty first (exchangeability → multiprob / group-conditional coverage).
2. Selective prediction / No-Bet is first-class — never overridden by apparent edge.
3. Everything affecting a displayed probability must be recomputable from the Glass Ledger (when a writer exists).
4. Pure TypeScript for core UQ primitives; no external ML libs for PAV/IVAP/CVAP/Mondrian core.
5. Prefer pure functions and explicit data structures over hidden mutable state.
6. Absence of evidence ≠ evidence of failure (thin strata stay silent; undefined placebo is untested).

## Explicitly blocked (do not invent)

- **Ledger multiprob persistence** — `PRODUCT_CASCADE_MAP.md` §4: no production consumer of `FiredDecision`; domain mismatch with `LedgerPickEntry`.
- **Certificate / math pack** (`decision-certificate.ts`, etc.) — referenced artifact pack never found; do not fabricate statistical formulas.

## Next high-leverage items

1. Merge `feat/uq-honesty-stack-hardening` once CI green (already was at last check).
2. Feed real walk-forward / historical-replay rows into `runWalkForwardTaxonomy` from an existing replay harness (wiring only — harness is ready).
3. Optional: property-based fuzz (fast-check) on PAV/CVAP for random sequences.
4. Founder input required before any certificate/math module work.
