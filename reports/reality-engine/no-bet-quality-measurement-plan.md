# No-Bet Quality Measurement Plan

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Decision document. No code, schema, deps, or gate changes proposed here.
**Scope:** How to *prove* the no-bet gate creates alpha (it screens out bad bets) rather than cowardice (it screens out winners). Defines the No-Bet Ledger and the exact gate-quality metric.

---

## The problem in one line

We pass on far more markets than we publish — the product *is* restraint (`edge-engine.ts`: "The honest default is silence"). But a gate that never logs what it rejected can never be audited. **Restraint and cowardice produce the identical visible artifact: fewer picks.** The only way to tell them apart is to track the rejects and check, in hindsight, whether they were worth rejecting.

## What the gate is today

Two distinct rejection points, both currently silent:

1. **The publish-confidence gate** — `scoring.ts:542 / 726 / 898`: `if (confidence < MIN_PUBLISH_CONFIDENCE) return null;` (`MIN_PUBLISH_CONFIDENCE = 50`, `constants.ts:8`). A market that scored but fell short is dropped with no trace.
2. **The edge gate** — `edge-engine.ts` returns `PASS` (with a real `rationale`) for most markets. That PASS is currently surfaced at weight 0 and otherwise discarded.

Neither writes a row. We cannot, today, answer: *"Of everything we passed last month, how did it close and resolve?"*

## The claim we want to be able to defend

> Markets we rejected had **worse** CLV and **worse** results than the markets we published.

If true, the gate is alpha: it is removing the lower-quality tail. If false (rejects closed and resolved as well as, or better than, publishes), the gate is leaving money on the table — and we want to *know that*, tighten or loosen the threshold, and say so honestly. Either outcome is a win for an honesty-first product; the only loss is not measuring.

---

## What's needed: the No-Bet Ledger

A row per **considered-but-not-published** market. (Schema changes are owner-gated. Two viable forms — pick whichever the owner approves; the metric is identical either way.)

### Form A — DB table (preferred, owner-gated)

`NoBetConsideration` (one row per considered market per cycle):

| Field | Type | Source | Why |
|---|---|---|---|
| `id` | cuid | — | PK |
| `gameId` | string | scorer loop | join to result + odds history |
| `sportKey` | string | game | segment the metric |
| `market` | enum SPREAD/TOTAL/MONEYLINE | scorer | segment the metric |
| `side` | string | scorer | which side we declined |
| `consideredAt` | DateTime | now() | anchor for "price at rejection" |
| `rejectReason` | enum | gate | `BELOW_MIN_CONFIDENCE` \| `EDGE_PASS_NO_DIVERGENCE` \| `EDGE_CONTRADICTS` \| `STALE_DATA` \| `INSUFFICIENT_BOOKS` \| `OTHER` |
| `modelProb` | Float? | step 2 | what we thought |
| `marketFairProb` | Float? | step 3 (`consensusNoVig`) | the benchmark |
| `priceAtRejection` | Float/Int | odds at `consideredAt` | the line we *would* have locked |
| `lineAtRejection` | Float? | odds at `consideredAt` | spread/total form |
| `edgeDecision` | string? | `assessEdge` | SPEAK/LEAN/PASS context |
| `confidence` | Int? | scorer | the number that failed the gate |
| `modelVersion` | string | constants | auditability |

**Deliberately NOT stored at write time:** the eventual close and result. Those are *derived later* from data we already have — `deriveClosingSnapshotFromOdds()` (`clv-capture.ts`) over the existing `Odds` history, and the final score from the settled `Game`. This keeps the ledger a point-in-time capture (consistent with the CLAUDE.md rights-snapshot discipline) and avoids duplicating state.

**Cadence:** written every scoring cycle, alongside the picks that *do* survive — same loop in `scoring.ts`, same transaction boundary as pick persistence. Backfill is impossible (the considered set was never recorded), so the metric starts accruing the day the ledger ships; honest note: it is forward-only.

### Form B — file-backed interim (no migration)

If the table is not yet approved: the scorer's considered set can be appended to a newline-delimited JSON sidecar per cycle (operator-only, not a public surface), carrying the same fields. Close + result are derived on read using the same `clv-capture.ts` primitive against the live `Odds` history. Lower durability and no indexing, but it unblocks the metric *today* without a schema change. Migrate to Form A when the owner approves.

---

## The metric: Gate-Quality Score

Once rejected markets have a derivable close and result, compute — over a settled window — both sides of the comparison:

For the **published** set (we already have this — `Pick.clvVerdict` / `clvValue` / `result`):
- `publishBeatCloseRate` = share with `clvVerdict = BEAT_CLOSE`
- `publishWinRate` = wins / (wins + losses), pushes excluded

For the **rejected** set (derived from the ledger):
- `rejectBeatCloseRate` = share whose `priceAtRejection` beat the derived close (reuse `computeSpreadClv` / `computeTotalClv` / `computeMoneylineClv` against the derived closing snapshot)
- `rejectWinRate` = share where the side we declined *would have won*

**Gate-Quality Score (two complementary readings):**

```
gateCLVAlpha     = publishBeatCloseRate − rejectBeatCloseRate   (target: > 0)
gateResultAlpha  = publishWinRate       − rejectWinRate          (target: > 0)
```

A positive `gateCLVAlpha` is the *leading* indicator (CLV predicts profit before games settle — see `clv-quality-measurement-plan.md`); `gateResultAlpha` is the lagging confirmation. Report both with sample sizes; suppress any reading below a minimum n (mirror the conviction module's ≥20 discipline) so a 3-reject month never produces a headline.

**Segment it** the same way as CLV: by `sportKey`, `market`, and `rejectReason`. The most actionable cut is *by reject reason* — if `BELOW_MIN_CONFIDENCE` rejects show negative alpha (they'd have been fine), `MIN_PUBLISH_CONFIDENCE = 50` is set too high and we can defend lowering it with data. If `EDGE_PASS_NO_DIVERGENCE` rejects show strong positive alpha, the edge gate is earning its keep and we can say so.

## Honest interpretation guardrails

- This metric is **operator/owner-facing first.** It must clear the honesty/copy scanners before any public claim ("we pass on X% and those pass on worse" is a strong claim — gate it like any other).
- A "would have won" counterfactual ignores that we never paid vig on the reject and never tied up bankroll — so `gateResultAlpha` slightly *understates* the gate's value. Note this; don't correct for it silently.
- Forward-only. State the start date on every report.

## Leverage-preservation close

This does **not** end on "needs data." The data to *derive* close and result already exists (`Odds` history + settled `Game` + the `clv-capture.ts` primitive). The only genuinely new thing is **capturing the considered set at decision time** — a forward-only ledger (Form A table, owner-gated, fields above; or Form B file-backed interim, today). The moment it is writing rows, the Gate-Quality Score (`gateCLVAlpha` / `gateResultAlpha`, segmented by reason) is computable on the existing CLV primitives. That is the smallest move that converts "we pass a lot" from an unfalsifiable posture into a measured, defensible one.
