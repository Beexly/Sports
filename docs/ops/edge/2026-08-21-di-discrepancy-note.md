# D_i Discrepancy Note — 2026-08-21

**Date:** 2026-08-21
**Scope:** Frozen spec conflict in the MLB totals empirical-Bayes shrinkage estimator.
**Classification:** FLAG ONLY — spec recorded, not amended.

## The conflict

The symbol `D_i` appears in two frozen documents with two different definitions:

### Form A — empirical (binding)
> **Prereg section 3, point 5** (frozen 2026-08-20, amended v2.2 on 2026-08-21):
> ```
> D_i = s^2 / n_i        # team i's sampling variance; undefined if n_i = 0
> ```
> where `s^2` is the **pooled sample variance of Anscombe-transformed past totals** across all teams, with a frozen fallback of `s^2 = 0.04` when fewer than 8 past games exist league-wide.

### Form B — theoretical (historical)
> **Ledger row C-64** (frozen 2026-08-20-era, pre-reconciliation):
> ```
> D_i = 1 / (4 * n_i)
> ```
> derived from the `Var(y) ~ 1/(4n)` property of the Anscombe square-root transform under a Poisson(λ) model (variance-stabilizing transform: `Var(sqrt(y + 3/8)) ≈ 1/(4n)`).

## Which is binding

**Form A is binding for the empirical-Bayes estimator.** This is established by three independent, traceable pieces of evidence, none of which contradict each other:

1. **The locked worked example** (prereg section 3, point 12) uses `s^2 = 0.04` and derives:
   ```
   D = [0.01, 0.002, 0.01, 0.005]
   ```
   These values are computed as `D_i = s^2 / n_i` with `s^2 = 0.04`:
   - n = [4, 20, 4, 8] → D = [0.04/4, 0.04/20, 0.04/4, 0.04/8] = [0.01, 0.002, 0.01, 0.005] ✓
   - Form B (`1/(4n_i)`) would give [0.0625, 0.0125, 0.0625, 0.03125] ✗

2. **The implementation** (`packages/prediction-engine/src/efron-morris-js.ts`, line 116) computes:
   ```ts
   const dI = s2 / t.n;
   ```
   This is `D_i = s^2 / n_i` (Form A), using the empirical `s2` resolved by `pooledVariance()`.

3. **The test** (`packages/prediction-engine/src/research/efron-morris-js.test.ts`, lines 38–43) asserts:
   ```ts
   const expectedD = [0.01, 0.002, 0.01, 0.005];
   ```
   These match Form A with `s^2 = 0.04`, and all 8 tests pass. The fixture is described as
   "the arbiter" and is locked to 3.79e-07 precision against independently re-derived theta values.

## Why they diverge

Forms A and B are the **same structural formula** (`D_i = variance / n_i`) but differ in what supplies the numerator variance:

- Form A uses `s^2` — an **empirical, walk-forward sample variance** computed from actual past-game Anscombe-transformed totals. It is data-driven and updates per game.
- Form B uses `1/4` — a **theoretical constant** from the Anscombe variance-stabilizing property. It is a fixed upper-bound approximation suitable when no empirical variance is available.

They coincide **only when** the empirical `s^2 = 0.25` (i.e., `s^2/n_i = 1/(4 n_i)`). The locked fixture uses `s^2 = 0.04`, a five-fold difference, which makes the two forms produce materially different `D_i` values and therefore different shrinkage weights `B_i`, different shrunk estimates `theta_i`, and different model over-probabilities `q_t`.

## Why Form B was superseded

Ledger row C-64 recorded `D_i = 1/(4 n_i)` as the **equal-variance special case** of the charter James-Stein formula, carried forward from early documentation. Amendment v2.2 (2026-08-21) reconciled two competing frozen specs and selected Efron-Morris (1975) section 3 as the binding operational estimator for the unequal-`n` case. Under Efron-Morris, `D_i = s^2 / n_i` where `s^2` is the empirical pooled variance — not the theoretical constant `1/4`. The reconciliation is recorded in full in C-64 (DONE, commit 3986996d) and the amended spec in prereg section 3.

## What was done

Nothing in code or spec was changed. This note is the **documentation-only** resolution:
- The discrepancy is on the record.
- The binding form (`D_i = s^2 / n_i`) is stated explicitly.
- Both forms are recorded with their source locations.
- The reason (Amendment v2.2, unequal-variance Efron-Morris selection) is cited.

## Source locations

| Form | Symbol | Definition | Frozen at | Implemented in | Tested in |
|------|--------|-----------|-----------|----------------|-----------|
| A (binding) | D_i | s^2 / n_i | prereg §3 point 5 (C-64 reconciliation) | efron-morris-js.ts:116 `dI = s2 / t.n` | efron-morris-js.test.ts:38 (expectedD) |
| B (historical) | D_i | 1 / (4 n_i) | Ledger row C-64 (pre-reconciliation) | — (not implemented) | — |

## See also

- `docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md` — section 3 points 5, 12
- `docs/ops/AGENT_LEDGER.md` row C-64 — the equal-variance special case
- `packages/prediction-engine/src/efron-morris-js.ts` — line 116, `dI = s2 / t.n`
- `packages/prediction-engine/src/research/efron-morris-js.test.ts` — lines 38–43, locked D_i fixture
