# Edge doctrine vs. the shipped board — measured 2026-09-08

Read-only. Every number below comes from a `SELECT` against production
(`gse-postgres`, Neon project `summer-brook-99380762`) run 2026-09-08 15:00-15:15 UTC,
or from a source line quoted verbatim. Nothing here was written, flipped or tuned.

Scope: the 779 published picks with `generatedAt >= now() - 14 days`.

---

## 0. The doctrine being tested

`_HANDOFF-to-coding-agent.md` (gse-competitive-intel), the engineering handoff from the
research pass, states one rule above all others: fire and rank on calibrated edge
`e = p - q` — model probability minus the no-vig market implied probability — and
**never** on confidence `kappa = max(p, 1-p)`. Its words: "Confidence-gating = betting
chalk at -EV = scores24's fatal error. This is the single most important modeling rule."

This document asks one question: is that rule in force on the board we would launch?

---

## 1. The rule is implemented, and it is inert

`apps/web/lib/calibration/selective-publish.ts`, `passesSelectiveThresholds`, applies the
edge filter correctly:

```ts
if (t.edge != null && t.edge > 0) {
  if (row.marketP != null && Number.isFinite(row.marketP)) {
    if (Math.abs(row.p - row.marketP) < t.edge) return false;
  }
  // no market line: allow in signal mode (edge filter N/A)
}
```

Two facts about how it runs today:

- **The live plan sets no edge.** `selective-publish-runtime.ts:70` reads
  `edge: plan?.selectiveRecommended?.edge ?? null`, and production
  `/api/ops/public-surface-truth` reports `selectiveRecommended` with `"edge": null`,
  `"delta": 0.12`. With `t.edge` null the whole block above is skipped, so public
  selection reduces to `|p - 0.5| >= 0.12` — distance from a coin flip.
- **It is a tuned outcome, not an oversight.** The sweep grid is
  `edges = [null, 0.03, 0.05]` (`selective-publish.ts:179`) and it maximises Murphy
  resolution subject to a Brier cap. `null` won on the rows the tuner saw.

## 2. On 89% of the published moneyline board there is no market at all, and the field named `rawEdge` is measured against 0.5

Counts over the 14-day window, by market:

| pickType | published | has `independentEdge` | has `independentEdge.marketFairProb` | has top-level `marketFairProb` |
|---|---|---|---|---|
| MONEYLINE | 435 | 428 | **41** | 48 |
| SPREAD | 206 | 94 | 93 | 206 |
| TOTAL | 138 | 0 | 0 | 138 |

387 of 428 moneyline picks carry an edge object with **no market probability in it**.
The reason is in the generator, verbatim
(`packages/ingestion-pipeline/src/generate-signal-slate.ts:369-381`):

```ts
// No book line on pure signal slate — omit market, never invent 0.5
marketFairProb: null,
trueProb,
rawEdge: trueProb - 0.5,
shrunkEdge: (trueProb - 0.5) * 0.7,
...
priced: true,
```

The comment says "never invent 0.5" for the market. The line under it subtracts 0.5 in
the edge formula, which is arithmetically the same assumption. `packages/types` already
documents this: `rawEdge: number; // trueProb − marketFairProb (or vs 0.5 when market null)`.

So on the signal slate three quantities collapse into one:

- `rankingP = trueProb` (`generate-signal-slate.ts:362`), the sort key,
- `rawEdge = trueProb - 0.5`, the "edge",
- the public selective gate, `|p - 0.5| >= 0.12`.

All three are the distance of the model's probability from a coin flip. That is
confidence under another name, and the handoff names it as the fatal error. This is not
an argument about wording: it is what 89% of the published moneyline board is ranked and
filtered on.

Measured magnitudes on the 522 published picks that carry `rawEdge`: mean `|rawEdge|`
0.2137, median 0.1906. Because most of those have no market term, **do not read that as a
21-point disagreement with the market.** It is mean |trueProb − 0.5|.

`trueEvScore` has the same shape: `generate-signal-slate.ts:389` sets it to
`trueProb - 0.5`. An expected value cannot be computed without a price.

### Withdrawn

An earlier pass in this session bucketed settled picks by `rawEdge` quintile and read a
hit rate of 0.837 against a mean market probability of 0.274 in the top quintile. That
comparison is invalid: the market means were averaged over the sparse minority of rows
that carry `marketFairProb`, so the two columns describe different populations. The
figure is withdrawn and no conclusion rests on it.

## 3. `priced: true` does not mean a price was used

`packages/prediction-engine/src/ranking-prob.ts:106` — `priced: source !== "confidence"`.
Its meaning is "the independent model drove the ranking path." It is persisted as
`priced: true` on 428 of 435 published moneyline picks, 387 of which have
`marketFairProb: null` in the same object. In a betting product the word reads as "a book
price was used." Same defect class as C-241, C-246, C-250: a label whose stated meaning
is not what it measures.

**The user-facing half of this is now fixed (C-252).** The pick card's badge read
"priced into ranking" whenever `rankingP` and `trueProb` were finite — true on every
signal-slate row — while the rationale two lines below it said "No book price is attached
to this pick." The card asserted and denied a price in the same box. The badge now
requires a finite `marketFairProb` before it will claim a price, and says
"model signal, no book price" otherwise. Display only: no gate, no ranking, no number
moved. The persisted `priced` flag itself is untouched — it is engine state under
MODEL_VERSION freeze and it is not an agent's to redefine.

## 4. The tuner and the runtime disagree about where `marketP` comes from

- Tuner: `toProvenPathPickRow` (`proven-path-rows.ts`) resolves marketP as
  `independentEdge.marketFairProb ?? factorBreakdown.marketFairProb ?? receipt.marketFairProb`.
- Runtime: `/api/picks/route.ts:186` reads **only** the top-level
  `factorBreakdown.marketFairProb`, with no `independentEdge` and no receipt fallback.

Top-level `marketFairProb` is present on 48 of 435 moneyline picks. So an edge threshold,
if the sweep ever recommends one, would be tuned on a population where the receipt supplies
the market and then enforced on one where it usually does not — and the rows without it are
waved through by the "edge filter N/A" branch. A threshold tuned on one population and
applied to another is not the threshold that was tuned.

**Left alone deliberately.** Aligning the runtime resolver is a change to what publishes,
and AGENTS.md law 3 puts that with the founder. It is also a no-op while `edge` is null,
so there is no urgency that justifies an agent taking it.

## 5. What is NOT wrong

Two things I expected to find broken and did not:

- **The calibration sample is clean on this axis.** `proven-path-rows.ts` excludes rows
  with no market probability under `no_market_probability` and never scores
  `confidence/100` against the floors, and it excludes three-way moneylines
  structurally. The ECE/Brier/Murphy numbers are computed on rows that really do carry a
  market anchor. (They remain measurements over the settled record that C-247 shows is
  contaminated — that is a separate and larger problem.)
- **The pick copy is honest.** The signal-slate reasoning says, verbatim, "Model signal
  (no book line) ... uncalibrated and not a sportsbook quote. No book price is attached
  to this pick."

## 6. DFS optimizer — three founder questions, answered from the code

- **"Are we running hundreds of simulated tests for the optimizer?"** No.
  `grep -rl "monteCarlo\|MonteCarlo\|Monte Carlo\|nSims\|numSims\|simulateSlate\|runSimulation"`
  over `apps`, `packages`, `workers` (non-test) returns three files, none of them in the
  fantasy or DFS path. `apps/web/lib/fantasy/dfs-optimizer.ts` is an exact deterministic
  salary-cap DP over **one point projection per player**: no per-player distribution, no
  correlation matrix, no contest-field simulation. The category leaders (SaberSim,
  Stokastic) are simulation engines first and optimizers second. On that axis we have no
  product.
- **"Do customers get a capped number of lineups, with anything above the cap gated to a
  higher tier?"** No cap and no gate. The lineup count is a client slider,
  `<input type="range" min={1} max={20}>` (`components/fantasy/dfs-optimizer.tsx:95`),
  and `generateLineups` runs in the browser. `app/fantasy/dfs/page.tsx` performs no
  entitlement check, and there is no server route in the optimizer path to perform one.
  A frontend-only limit is not a paywall (CLAUDE.md rule 3).
- **Mitigating and important:** the optimizer runs on `DFS_SLATE`, an explicitly labelled
  fictional sample pool, and both the page note and an in-component banner say so. It is a
  demo today, not a paid feature — which is the honest framing, and also means the DFS
  optimizer is not currently a launchable paid surface.

## 7. What this changes about launch

Nothing here is a wording problem. The board that would go live ranks and filters on
distance from a coin flip for the large majority of its moneyline picks, and the
document that defines this product's strategy says that specific choice is the fatal
error of the competitor it is meant to beat. The fix is not an agent's: it needs a real
second book on the moneyline path (WP-27 / C-104), and then an edge threshold tuned on
rows that actually carry `q`. Both are founder-gated.

Related and independent: C-247 (the settled record itself is contradicted by the feed it
was ingested from) means the calibration numbers are measurements over bad inputs. The
two findings compound: a selection rule that is not edge-based, scored against outcomes
that are partly wrong.
