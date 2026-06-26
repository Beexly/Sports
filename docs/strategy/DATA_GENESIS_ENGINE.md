# Data Genesis Engine

**Package:** `packages/data-genesis` · **Adapter:** `packages/prediction-engine/src/data-genesis-adapter.ts`
**Status:** shadow-only. Pure, deterministic, dependency-light infrastructure. Not wired into live
scoring. No `MODEL_VERSION` change. No public claim. No pick behavior change.

## Why this exists

GSE produces two kinds of things. The first is **directly observed fact** — a final score, a stored
closing line, a settled outcome. The second is everything we *generate*: a modeled win probability, an
edge assessment, a projection, a calibration curve, an AI-assisted narrative. The second kind is
useful, but it is not truth. The failure mode of every picks platform is letting a generated number
quietly become operational truth — driving a pick, a confidence score, a price, or a public claim —
before it has earned that standing.

The Data Genesis Engine is the **law layer for synthetic intelligence**. A generated signal is inert
until it passes through a gate. It makes the system **stricter, not louder.**

> A synthetic signal may not influence picks, content, dashboards, confidence, pricing, or promotion
> until it carries a receipt, has been doubted, has been meta-doubted, and — where it applies — has
> calibration evidence. Promotion is the only door, and it is narrow.

## What a SyntheticSignal is

A `SyntheticSignal` is the unit of synthetic intelligence: a typed value plus the metadata that lets us
govern it — a `domain`, a `confidence` and `uncertainty` in `[0,1]`, an explicit `validationStatus`
(`draft → candidate → validated → promoted | rejected`), and a `GenesisReceipt`. A new signal is born
`draft` and inert. It can never be born `promoted`.

`confidence` is a subjective strength, **not** a calibrated probability. It becomes trustworthy only
once calibration proves it — "calibration before influence."

## Why synthetic signals need receipts

A `GenesisReceipt` is a tamper-evident record of HOW a signal was produced: a content hash of its
inputs, of the transformation metadata (engine/model version + sources), and of its output, plus the
canonical payload itself. It is the same discipline as the existing `proof-of-record.ts`: the hash
function is **injected**, never hard-wired, so production chooses the strength of the guarantee.

Receipts are deterministic — identical inputs always produce identical hashes, because they hash over
`canonicalize()` (sorted keys), not raw `JSON.stringify` (insertion-order dependent). A receipt is
usable as proof of origin only when its `receiptIntegrity` is `valid`. This is what makes a synthetic
signal **proof-bearing** rather than free-floating.

## How StructuredDoubt works

Every signal must be doubted on the record before it can be trusted. A `DoubtCase` is one categorized,
severity-rated reason the signal might be wrong, with its evidence and (optionally) its mitigation.
Some categories are blocking by default:

- A `licensing` doubt blocks promotion unless explicitly mitigated.
- A `model_leakage` doubt blocks promotion unless explicitly mitigated.
- A `critical` doubt blocks until it is resolved.
- A `market_absorption` doubt does **not** hard-block — it reduces readiness, because a signal the
  market has already absorbed is weak, not invalid.

Doubt is a first-class artifact, not an afterthought.

## How MetaDoubt prevents fake rigor

The frontier layer asks: **did we doubt the signal well enough?** A system can manufacture the
*appearance* of rigor by recording a couple of easy doubts and promoting on it. `runMetaDoubt` audits
the doubt itself — did we cover every axis a careful skeptic checks (data quality, sample size, source
freshness, calibration, market absorption, model leakage, licensing)? It computes a
`doubtCoverageScore`, lists the missing categories, and raises an `overconfidenceFlag` when confidence
is high but doubt coverage is weak — the exact combination that lets fake rigor through. A
high-confidence, weakly-doubted signal **cannot** promote.

## How calibration gates promotion

A probabilistic signal earns influence only once its forecasts match observed frequencies, on **real
binary outcomes** (pushes/voids excluded upstream). `buildCalibrationCurve` produces a reliability
curve; `betaPosteriorCalibration` gives a Bayesian posterior over a hit rate. Its 95% credible interval
is **exact** — computed by inverting the regularized incomplete beta function (Lanczos logΓ + a
continued-fraction `betacf` + bisection), not a normal approximation that misleads at the small samples
and near-boundary rates a calibration gate actually sees. The label is honest about sample size: a small
sample can never be `excellent`, and below a floor it can never exceed `good`. Promotion of a
high-confidence or probabilistic signal requires calibration evidence that clears both a minimum-sample
and a maximum-ECE threshold.

## How this aligns with CLV / EV / proof-of-record

The engine does not reinvent the existing math. `packages/prediction-engine` already owns CLV, the edge
engine, isotonic calibration, Brier decomposition, ECE, and the proof-of-record Merkle commitment. The
adapter (`data-genesis-adapter.ts`) **reuses** those outputs:

- `edgeAssessmentToSyntheticSignal` wraps an `EdgeAssessment` (from the edge engine).
- `clvGradeToSyntheticSignal` wraps a realized `ClvGrade` (CLV is the measurement of beating the close).
- `calibrationCurveToGenesisResult` converts an already-computed `reliabilityCurve` — it does not
  recompute calibration, it carries prediction-engine's result into the promotion gate.
- `pickSignalSnapshotToGenesisReceipt` turns the immutable prediction-time snapshot into a receipt.

The direction is one-way: prediction-engine depends on data-genesis; data-genesis never depends on
prediction-engine.

## The promotion law — one narrow door

There is exactly **one** place in the engine where `validationStatus` becomes `promoted`: inside
`promoteSignal`, after every gate passes. No raw cast may forge a promoted signal anywhere else. The
gate checks, in order: the signal is a candidate (or validated); the receipt is valid; the doubt
belongs to the signal and carries no blocker (and no unmitigated model-leakage); a meta-doubt report
exists, belongs to the signal, and is applied; doubt coverage meets the threshold and is not
overconfident; calibration evidence exists and clears the sample/ECE gates where required; and the
license scope permits the intended use. A signal that fails returns its `failures` — it is never
silently dropped and never half-promoted.

This law is machine-checked. The **Genesis Promotion Conservation Theorem**
(`__tests__/genesis-conservation.theorem.test.ts`) runs an adversarial grid through `promoteSignal` and
proves, for every input, that its verdict and exact failure set equal an *independent* re-derivation of
every gate — the keystone proof that the engine has one door and no parallel path. It is a sibling of
the authority-tensor, meaning-conservation, and sixth-ledger conservation theorems.

## What is shadow-only today

- Building a `SyntheticSignal` is inert. Nothing in this package or the adapter publishes, prices, or
  moves a pick.
- The adapter is exported from prediction-engine but **not** called by live scoring.
- No `MODEL_VERSION` bump. No public surface change. No entitlement or trust-gate change.

## What is forbidden

- Treating a synthetic signal as directly observed data.
- Forging a `PromotedSignal` by casting around `promoteSignal`.
- Letting a synthetic signal influence a live pick.
- Promoting a high-confidence or probabilistic signal without calibration evidence.
- Promoting for a public claim when the license scope does not allow it.
- Describing a synthetic signal as an "edge discovered." It is synthetic evidence under structured
  doubt — nothing more until it is settled, calibrated, and promoted.

## Future activation path (gated, not scheduled)

1. **Shadow capture (now).** Wrap edge/CLV/calibration/snapshot outputs as draft signals; record
   receipts; accumulate doubt and meta-doubt. No influence.
2. **Calibration accrual.** As settled, learning-eligible samples accumulate, build curves and Bayesian
   posteriors per signal class. Still shadow.
3. **Promotion in shadow.** Run the promotion gate; log which signals would promote and which fail and
   why. Measure, do not act.
4. **Owner-gated activation.** Only a deliberate, audited `MODEL_VERSION` step — never a config flip —
   may let a promoted signal influence anything, and only within its license scope.

The contract is the commitment: a synthetic signal can only ever mean what its receipt, doubt,
meta-doubt, and calibration permit. Shadow until proven.
