# formal-heartbeat — Wave 3 batch (Decision-A-independent pieces)

Dormant, **lab-only** TypeScript. **Nothing here is wired into production**:
no writes, no alerts, no enforcement, no DB, no I/O, no side effects. It is a
monitoring/detection layer plus its pure statistical core, built additively
against the already-landed formal spec
`formal/live-sports/LiveModelDispatchUnderAmbiguity.tla` (PR #174, this branch's
history) and following the adapter/reference-model pattern established by
`labs/w2-03-property-chaos-harness` (`formal-regression/`).

These are the three batch items that are **independent of Decision A** (the
in-flight credit-authorization-port collapse). This package touches **no**
credit-admission / credit-port / executor / invocation-pipeline file — it only
*reads* their published record shapes to know what to project from.

## The three modules

### 1. `src/e-process.ts` — sequential-confidence / e-process kernel

A genuine **e-process** (test supermartingale) for **anytime-valid** sequential
testing of a one-sided Bernoulli-rate null. Real math, cited to the
game-theoretic-statistics literature (Ramdas–Grünwald–Vovk–Shafer 2023; Shafer
2021; Waudby-Smith–Ramdas 2024).

- **Null controlled**: `H0: E[X_t | past] <= p0` for all `t`, where each
  `X_t ∈ {0,1}` (1 = event of interest, e.g. an invariant violation). One-sided.
- **Construction**: wealth `E_0 = 1`, `E_t = E_{t-1} · (1 + λ(X_t − p0))` with
  `λ ∈ (0, 1/p0]` (default `λ = 1`, always admissible). Nonnegative;
  supermartingale under `H0`.
- **Decision**: reject when `E_t ≥ 1/α`. By **Ville's inequality**,
  `P(sup_t E_t ≥ 1/α) ≤ α` — anytime-valid (you may peek after every
  observation).
- Wealth is tracked in the log domain to avoid under/overflow.
- **Honest proof**: `src/tests/e-process.test.ts` runs a **Monte-Carlo**
  simulation (5000 seeded streams, horizon 500) at the null boundary and
  empirically confirms the anytime-valid false-positive rate stays `≤ α`, plus a
  power check under `H1`.

### 2. `src/projection.ts` — event projection + ConstInit emitter

- `projectWindow` — pure, deterministic projection of a window of **real**
  observed control-plane records onto the abstract state shape of
  `LiveModelDispatchUnderAmbiguity.tla` (all 12 spec variables + the constants
  its invariants close over).
- `emitConstInit` — renders a projected state as a TLA+ `CONSTANTS` + `ConstInit`
  fragment (a string), with observed ids renamed to stable symbolic model values
  (`inv1`, `att1`, …) and a legend, so the output is always valid TLA+.
  Deterministic: projecting twice yields byte-identical output.

**Event shape projected FROM** (real, not invented): `AiAttemptSummary` from
`apps/web/lib/ai-control-plane/contracts.ts` (the canonical per-attempt record on
every `AiTaskResult.attempts`), composed with the credit-reservation record state
from `apps/web/lib/ai-control-plane/credit-admission.ts`. Those shapes are
mirrored in `src/events.ts` with citations; this package stays self-contained and
does not import across worktrees or modify any control-plane file.

The emitted `ConstInit` was validated with the **real TLC model checker**
against the actual spec: a conformant projected state passes every invariant
("No error has been found"), and a state with an ambiguous exposure hold released
without a trusted actor is correctly caught
("Invariant AmbiguousExposureHeldUntilTrustedResolution is violated").

### 3. `src/heartbeat.ts` — Formal Heartbeat

Pure function re-checking a window of projected abstract states against the
spec's invariants — the four new composed ones
(`AmbiguousExposureHeldUntilTrustedResolution`,
`ReservedNeverExceedsBudgetWindowCap`, `AvailableBudgetNeverNegative`,
`NoDispatchWithoutExposureHold`) plus the re-exported base ones
(`BaseLedgerNeverExceedsBalance` / `BaseNeverOverAdmit` /
`BaseAmbiguousAttemptStopsFallback`). It returns a structured pass/fail result
with per-violation witnesses and **burns a "cognitive SLO error budget"** by
feeding each invariant check as a Bernoulli observation into the e-process kernel
(0 = holds, 1 = violated). Clean windows keep wealth low; violations drive it,
anytime-valid, toward the reject boundary.

**Monitoring/detection ONLY** — Decisions B–F forbid wiring alerts or
enforcement, respected here: no writes, no alerts, no enforcement, no I/O.

## Running

```
npm install
npm run typecheck   # tsc --noEmit, strict, no `any`
npm test            # vitest, incl. the Monte-Carlo FPR simulation
```

## Scope notes (honest)

- One composed abstract snapshot per projected window; the heartbeat re-checks
  invariants over a window of such snapshots (state-by-state), it does not
  re-run TLC and does not model transitions — that is what the TLA+ spec + TLC
  are for. The emitter exists precisely to hand an observed state back to TLC.
- `src/events.ts` mirrors the real record interfaces rather than importing them,
  so the package is dormant and self-contained even if the real-code worktrees
  are absent. If those interfaces drift, that mirror is the single reconcile
  point.
- No production wiring, by design.
