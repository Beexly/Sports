# What We Missed — First-Pass Gaps Found on Second Pass (2026-09-27)

The first-pass ledgers for this batch were diligent — real reads, honest adversarial sections, explicit uncertainty flags. The second pass found structural gaps anyway. They fall into six classes.

---

## 1. The stale-checkout error (the big one)

**What happened:** At least two first-pass ledgers asserted that the engine modules named in their task briefs — `calibration-ladder`, `multi-market-ensemble`, `pick-clv`, `source-reliability`, `oos-split`, `synthetic-fade` (as `*.db.ts`) — "do not exist" at `packages/prediction-engine/src/`. One ledger flagged this honestly as checkout uncertainty. The claim was wrong.

**Verified on second pass** (against remote tip `b3c0ea032`, branch `motif/repo-bucket-reorg-2026-09-27`):
- All six modules exist as `packages/prediction-engine/src/*.ts`, each with tests under `__tests__/`.
- The `.db.ts` suffix in the task briefs was stale; the modules dropped it at some point. The files the ledgers looked for never existed under that name, but the modules themselves are real and substantial (e.g., `multi-market-ensemble.ts` is a documented precision-weighted fusion engine; `calibration-ladder.ts` implements Platt + Wilson-bounded binned-empirical + time-ordered method selection).

**Consequence:** Every implementation spec in the batch that said "build a new module" had to be re-examined. Two of the six (rate audit → `calibration-ladder.ts` delta; LEAP → `multi-market-ensemble.ts` upgrade) turned out to be upgrades to existing code, not greenfield builds. The second-pass synthesis rewrites all six specs against verified interfaces.

**Lesson for the program:** "module does not exist" is a high-stakes claim — it flips a spec from *upgrade* to *greenfield*, which changes cost estimates by an order of magnitude. Verify against the remote tip (`git ls-tree FETCH_HEAD`), never the local checkout, before asserting absence. The local `~/workspace/vendor/Sports` checkout is known-stale and carries unrelated local-only commits; it is not evidence of anything.

---

## 2. The source-reliability stub (the sequencing miss)

**What happened:** The deliberative-crowds ledger (2609.22497) specified an expert-dominance detector and reliability-weighted revision loop routing through "the source-reliability/earned-weight machinery." That machinery does not work yet.

**Verified:** `source-reliability.ts` is a documented stub — `computeSourceReliability` always returns `INSUFFICIENT_DATA`, with a `TODO(v9-D)` noting it needs the SignalLedgerEvent (feat/ledger) PR merge. There is no per-source hit-rate/CLV rollup in the engine today.

**Consequence:** Any spec that consumes per-source reliability must be explicitly sequenced: ledger → rollup → detector. The second pass marks the expert-dominance detector `BLOCKED_ON_LEDGER` with its interface defined now (per-market-type rolling Brier, Wilcoxon p < 0.05, ≥50 events) so no redesign is needed later — but it cannot be built today. The first pass's reproducible test for the deliberative module implicitly assumed the reliability feed exists; the corrected test uses static weights until the ledger lands.

**Lesson:** specs must distinguish *interface* (definable now) from *implementation* (blocked). "Blocked on X" with the interface pinned is a complete spec; "routes through the machinery" without checking the machinery is a plan to fail at build time.

---

## 3. The missing integration story (the architecture miss)

**What happened:** Seven papers, seven standalone module specs. Three of the papers propose aggregation schemes — LEAP's tempered Bayesian update, the deliberative protocol's revision rounds, and the *existing* precision-weighted `multi-market-ensemble.ts` — and the first pass specified the first two as independent new modules sitting alongside the third. Nobody reconciled them.

**The corrected view** (see `corrected-cross-paper-architecture.md`): one aggregation upgrade path —
- `multi-market-ensemble.ts` is round one (exists),
- LEAP's prior + tempering + dependency clustering + LOO audit are upgrades to it,
- the deliberative protocol is the outer loop with LEAP's update as the revision math,
- the LOO audit feeds the expert-dominance detector.

**Also missed:** four of the seven papers are about **calibration** (verifiable rewards → calibration auditing; LEAP → calibrated aggregation; tennis → live calibration; deliberative crowds → Brier-scored aggregation), and the program already owns the Blown-Lead pathwise diagnostic (2601.18774) that should gate the live-WP build. The first pass never connected the tennis paper to the Blown-Lead paper — they're the same lane (live WP construction + live WP audit), and the audit paper was already counted in phase 1.

**Lesson:** second passes should always ask "which papers in this batch are the same lane?" and "what does the program already own that gates this build?" Standalone specs are a first-pass artifact; the program's value compounds when papers are composed.

---

## 4. The calibration theme (the synthesis miss)

Related to §3 but worth naming: the batch's through-line is that **probabilistic calibration is the binding constraint on GSE's accuracy**, not model sophistication. Four independent papers converge on: score against denoised rates not noisy outcomes (00164); temper and prior-anchor your aggregation (01337); shrink live estimates toward priors with clock-aware strength (07617); aggregate diverse sources with a protocol, not a flat average (22497). The first pass treated each as a module; the second pass reads them as four facets of one doctrine: *never let a noisy point estimate move a probability farther than its evidence warrants.*

---

## 5. Unexecuted spikes (the follow-through miss)

Two concrete, cheap, high-value experiments were specified and never run:
1. **The WST spike test** (from the 2609.23158 second pass): one day of work, no new data — Kymatio 1D scattering on line-movement/EPA sequences vs. simple features, group-out validation, pass gate +0.02 OOS AUC concentrated in non-zeroth-order coefficients. Still unexecuted.
2. **The physiological-load historical study** (same source): load proxies (rest differential, travel, snap counts, altitude) vs. prop outcomes/CLV. Still a hypothesis with no backtest.

Both are research tasks, not engineering — they need a data agent, not a build agent. They are recorded here so they don't evaporate: the batch's most novel idea (unpriced physiological state) currently has zero empirical backing.

---

## 6. The filing error (the housekeeping miss)

The seven first-pass ledgers landed under `docs/dfs/research/2026-09-25/arxiv-deep/` — the DFS bucket — during the September 27 repository reorganization. They are arXiv program material and belong under `docs/arxiv-program/research/`. (The radar second-pass reassessment was filed correctly under `docs/arxiv-program/research/2026-09-26/arxiv-deep/`.) This second-pass delivery follows the current bucket rule: everything lands in `docs/arxiv-program/research/2026-09-27/`. The misfiled first-pass ledgers are left in place (another agent's work; the reorg branch owns the layout) but noted here so the program index can link them.

---

## Net assessment

The first pass was honest work — the adversarial sections caught real weaknesses (tennis checkpoint leakage, LEAP's prior-dependence, deliberation's anchoring artifacts, the radar's amplitude confound), and two ledgers flagged their own checkout uncertainty rather than bluffing. What the second pass added is what second passes are for: **verification against the build surface** (what exists, what's a stub, what the interfaces actually are), **composition across papers** (one pipeline, not seven modules), and **connection to what the program already owns** (the Blown-Lead diagnostic, the oos-split harness, the calibration ladder). The corrected specs are cheaper to build than the first-pass versions — two greenfield modules became two deltas — which is the usual sign that the second pass did its job.

---

*Report completed 2026-09-27 as part of the owed GSE arXiv second pass.*
