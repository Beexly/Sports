# GSE 2026 — Trust Loop & New Modeling Primitives (Sprint 3)

This sprint turns the top research findings into **working, tested code** — the executable
embodiment of the #1 strategic move from `GSE_2026_HIGHEST_VALUE_IMPROVEMENTS.md`.

## 1. The trust loop (`apps/web/lib/gse/trust-loop.ts`)

The white space the entire competitive field leaves open, run end to end:

```
de-vig market → blend model ⊕ market → marshal evidence → verdict
   → FREEZE receipt (pre-result) → grade CLV (post-result)
```

Why it matters (from the competitor deep-dive): **Outlier** has EV/devig but no tracking or CLV;
**Betstamp** has CLV but no outcome calibration; **DRatings** publishes calibration but has weak UX.
No one closes the whole loop. GSE already owns the pieces — `runTrustLoop()` composes them.

Functions (all pure, illustrative until wired to live inputs):
- `runTrustLoop(input)` → every intermediate (market fair prob, blend, edge, evidence/counter/
  falsifier scores, confidence, fragility, verdict, frozen receipt) so the work is auditable.
- `gradeClv(entryAmerican, closeAmerican)` → CLV in probability points + `beatClose` (a process
  signal, never a guarantee a bet won).
- `freezeReceipt()` / `verifyReceipt()` → a tamper-evident, FNV-1a-hashed snapshot of the claim
  state captured **before** the result. Recomputing the hash detects any post-hoc edit. This is the
  primitive behind "we froze the claim before the game" — the trust differentiator competitors lack.

Cockpit: `/cockpit/trust-loop` runs it on screen.

## 2. New modeling primitives (`apps/web/lib/gse/projection-models.ts`)

The highest-leverage GAP methods from the analytics research, built as pure, dependency-free
functions (kept in the tested `lib/gse` zone; not yet wired into `packages/prediction-engine`, which
already ships Elo/Poisson/Shin-devig/Kelly/CLV):

| Primitive | What it adds | Verification |
|---|---|---|
| `glicko2Update` | Uncertainty-aware ratings (Elo + RD + volatility) — a confident rating and an uncertain one are no longer treated alike | **Matches Glickman's canonical worked example** (1500/200/0.06 → 1464.06 / 151.52 / 0.05999) |
| `blackLittermanBlend` | Precision-weighted model ⊕ market fusion in log-odds space — turns edge from a raw difference into a posterior that anchors on the market and tilts by confidence | Posterior precision = sum of inputs; heavier market precision pulls back toward market |
| `dixonColesTau` | Low-score correlation correction for soccer scorelines that plain Poisson misprices | τ for {0,1}² scorelines |
| `conformalProjectionInterval` | Distribution-free "safe / balanced / upside" projection band from residual quantiles | wraps `splitConformalHalfWidth` |
| `americanToImpliedProb`, `removeVigProportional` | Odds → implied prob; multiplicative de-vig (a cross-check on Shin) | balanced market → 50/50 |

These join the four primitives shipped in Sprint 2 (`logOpinionPool`, `extremize`,
`splitConformalHalfWidth`, `fitReliabilityCalibration`). The method registry in
`analytics-methods.ts` now marks all of them **partial** (built as a primitive; not yet in the live
decision path) rather than gap.

## 3. What's still a gap (for the next agent)

`methodsByMaturity("gap")` still lists: hierarchical Bayes, Platt/temperature scaling, CRPS,
Kalman/state-space in-season form, Ledoit-Wolf shrinkage, risk-parity exposure, matrix-factorization
comps, Thompson sampling, gradient boosting. The integration work — wiring `blackLittermanBlend` into
the edge engine, `glicko2Update` into ratings, and `runTrustLoop` to live odds + settled outcomes —
is the highest-leverage next step and needs the DB/live data this container does not have.

## 4. Verification

`tsc --noEmit` exit 0 (whole app); new tests `gse-models-trust.test.ts` (12) pass incl. the Glicko-2
canonical check; full GSE suite green; cockpit-gating green with the new `/cockpit/trust-loop` page;
ESLint clean. All numbers on the cockpit page are illustrative computations over example inputs,
explicitly labeled — no live data, no fabricated track record.
