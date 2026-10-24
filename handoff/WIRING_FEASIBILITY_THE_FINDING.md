# The Wiring Is Not Possible Yet, And That Is The Finding

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Source:** the wiring worker's two exhaustive repo investigations, delegated before any wiring
was attempted

---

## 1. The headline

> **The G1–G9 pipeline is fully built but 100% dead code, and seven of the nine gates have
> no live evidence producer anywhere in the repo.**

Measured, not assumed:

| module | live importers (non-test, non-self) |
|---|---|
| `pick-pipeline.ts` (T8) | **0** |
| `settlement-loop.ts` (T16) | **0** |
| `arxiv-hnsw-bridge.ts` (T1/T4) | **0** |
| `conformal-copula-kelly.ts` (T7) | 1 (only `pick-pipeline.ts`) |
| `mcp-cognitive-router.ts` (T14) | 1 (only `pick-pipeline.ts`) |

The two "1"s are each other: T7 and T14 feed T8, and T8's output goes nowhere. **The top of
that chain is dead.**

## 2. Why the wiring cannot simply be done

The investigation enumerated every site that persists a Pick row, and for each one asked:
**what evidence is available at that point?** The answer, gate by gate:

| gate | needs | live producer? |
|---|---|---|
| G1 | `MIN_SIGNAL_COVERAGE = 0.65` over a coverage floor | **PARTIAL** — the bridge-principles corpus exists (`data/gse-dataset/bridge-premises.jsonl`, tracked), but `home_sign` in it is an OBJECT (`{margin_diff, scored_diff, …}`) where G1 wants a scalar `-1\|0\|1` |
| G2 | conflict-consensus floor `eta_c >= 0.20` | available — the same deadband `mind-reasoning.ts` already computes |
| G3 | bridge premise with a sample count | available in the corpus |
| G4 | `AdversaryRedTeamVerdict` | **NO** — `adversaryRedTeamIntercept` has **zero** non-test callers |
| G5 | `AdversaryRedTeamVerdict` (entity-swap, CausalPhys RA) | **NO** — same |
| G6 | `ItcrGateResult` + `sgp_joints` | **NO** — `evaluateItcrTrace` is only reached via `evaluateCausalClaim` |
| G7 | a calibration window (`samples`, `coverage_errors`, `aci`) | **PARTIAL** — `calibrationHistory` (settled picks) exists, and `apps/web/lib/calibration/aci-durable.ts` holds durable ACI state |
| G8 | trailing CLV history | **PARTIAL** — a settled-picks-with-`clvValue` query exists in `packages/ingestion-pipeline/src/se…` |
| G9 | an fsync-confirmed commit | available |

**Seven of nine have no producer; two are partial.** The honest wiring point is
`generate-signal-slate`, and the honest count of gates that could be enforced there today
is small.

**There is also no live producer of a `CausalCertificate`** — the type `pick-pipeline.ts`'s
`validateCertificate` accepts. G1's first gate is a certificate, and no code in the tree
mints one outside the module's own tests. The repository's own
`reconciliation/design_spec_reconciliation.md:383` says `pick-pipeline.ts` is **"NOT BUILT"** —
which was true when written and is now stale in the other direction: it IS built, and it is
unwired.

## 3. Why this is the finding, and not a failure to wire

The alternative to reporting this is inventing the evidence. It would have looked like
progress: an import, a call, a green test. And it would have been **worse than nothing**,
because:

- G4/G5 need an `AdversaryRedTeamVerdict`. There is no producer. The only way to produce
  one at the publish site is to *call the interceptor with inputs derived from the pick
  itself* — which is a rubber stamp, and a rubber stamp on a "refuse if the entity-swap
  divergence is >= 0.02" gate is a gate that never refuses.
- G6 needs an `ItcrGateResult`, which is only produced by `evaluateCausalClaim` — the
  upstream function. A pick that never passed through a causal trace has no trace to
  score, and a default-constructed one would always pass.
- G1 needs a scalar `home_sign`; the corpus has a richer object. Coercing it to a scalar
  loses the `allowed_diff` / `opp_scored_diff` distinctions, and a coerced value is a
  guess.

**A gate that is fed a rubber-stamped verdict is not a gate.** The audit's whole point is
that the difference between a system that looks safe and a system that is safe is exactly
this. The spec's Step 8 names the wiring of T6, T7 and T8 as a step, and the honest
content of that step is the **producers**, not the calls.

## 4. What the investigation DID find that is wireable now

Not everything is blocked:

1. **G7's circuit breaker is the highest-value piece, and it has a real pause mechanism.**
   `apps/web/app/api/ops/ranking-pause-apply/route.ts` and
   `apps/web/lib/ops/ranking-pause-durable.ts` are exactly the per-family hold mechanism
   the spec's "Gate G7 halts firing on that market family" needs. The G7 rule is
   `ECE30 - ECE250 > 0.02`, and both inputs are computable from settled picks.
2. **The Murphy Brier partition has a second home.** `computeSegmentedMurphy` already
   exists in `apps/web/lib/calibration/ranking-power-control.ts` — so the settlement
   loop's partition is not the only implementation, and the two should be reconciled
   rather than the spec's formula being used.
3. **G2 and G3 have their evidence today** (the consensus deadband `mind-reasoning.ts`
   computes, and the bridge-principles corpus), so a partial wiring of the gates that can be
   honoured is possible now.
4. **The `generate-signal-slate` path is the honest wiring point** — and it is the path the
   T15 CRPS gate already guards, which means the two gates compose in one place rather than
   being scattered.

## 5. The settlement-side seams, precisely

For the settlement loop's G7 to actually HALT EMISSION (not merely report), the emission
side has to be reachable per market family. The candidate emission paths are
`apps/web/app/api/cron/generate-signal-slate/route.ts`,
`apps/web/app/api/cron/board-fill/route.ts`,
`apps/web/app/api/cron/refresh-odds/route.ts`, and
`packages/ingestion-pipeline/src/generate-signal-slate.ts`.

The settlement side is `apps/web/lib/data-sources/free-settlement-runner.ts` (the pending-pick
query, the `updateMany` that writes the settled result, and `writeFreeSettlementInTx`), plus
`apps/web/app/api/cron/settle-picks/route.ts` (which runs the free settlement pass, the paid
supplement, and the zero-sit lane, and already has a staleness-veto concept).

**A "market family" concept does not exist as a first-class field** — it must be derived
from `sportKey` / `pickType` (`MONEYLINE`, and the prop families). Any G7 hold therefore
needs a family key defined, and that definition is a decision, not an implementation detail.

## 6. What this changes about "done"

The spec's 10-step sequence ends at Step 9 with the settlement loop and Step 10 with the
dashboard, the bus receipt and the push. **Step 8 ("Wire ITCROrcaGate, conformal-copula-kelly,
and HonestyPublishGate (G1–G9)") cannot be completed as specified**, because seven of the
nine gates have no evidence producer to wire to. What Step 8 actually requires is:

1. **Produce** the missing evidence: an `AdversaryRedTeamVerdict` at the publish site, an
   `ItcrGateResult` from a real trace, a `CausalCertificate` minted by something, and a
   scalar `home_sign` the corpus can supply.
2. **Then** wire G1–G9 onto that evidence.

Step 8's first half is a *producer* task, and the spec's own words — "run all 600
conformal-copula-Kelly tests, and verify compile-time ValidatedCausalTrace brand enforcement
in pick-pipeline.ts" — read as a verification step, not a wiring step, which is consistent
with the producers being the real work.

**The right next piece is therefore the producers, not the wiring.** And the highest-value
single producer is the **G7 circuit breaker**, because it needs evidence that already exists
(settled picks, ECE) and it has a real hold mechanism already built
(`ranking-pause-durable.ts`) — so it is a gate that can genuinely start refusing, and
refusing is the whole point of a gate.

## 7. Files

| artifact | status |
|---|---|
| the two investigation reports | in the delegation transcripts; summarised here |
| `packages/prediction-engine/src/picks/pick-pipeline.ts` | built, 60/60, **0 live importers** |
| `packages/prediction-engine/src/learning/settlement-loop.ts` | built, 17/17, **0 live importers** |
| `packages/prediction-engine/src/literature/arxiv-hnsw-bridge.ts` | built, 13/13, **0 live importers** |
| `packages/prediction-engine/src/calibration/conformal-copula-kelly.ts` | built, 795/795, 1 importer (T8 only) |
| `packages/prediction-engine/src/mcp/mcp-cognitive-router.ts` | built, 18/18, 1 importer (T8 only) |
| `reconciliation/design_spec_reconciliation.md:383` | says `pick-pipeline.ts` is "NOT BUILT" — now stale; it is built and unwired |
