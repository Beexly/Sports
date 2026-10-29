# Stale sports-branch audit

**Audit date:** 2026-10-02  
**Repository:** `Beexly/Sports`  
**Read-only sources:** GitHub compare and contents/commit APIs; no tracked source files were modified. This requested report is the only new workspace file. No local tests or backtests were run.

## Compare scope

Compared each named branch against `main` and `motif/gse-intelligence-build-2026-10-02`.

| Branch | `main...branch` ahead / behind | `motif...branch` ahead / behind |
|---|---:|---:|
| `rescue/intelligence-core-2026-06-28` | 1 / 2,877 | 1 / 2,878 |
| `research/proven-edge` | 5 / 2,934 | 5 / 2,935 |
| `claude/edge-map-rebuild-2026-06-04` | 32 / 3,281 | 32 / 3,282 |
| `safety/sports-wip-2026-06-04` | 30 / 3,433 | 30 / 3,434 |

The comparison bases were `main` at `2df5b06e37ea69143465aca80302e908059cf475` and the intelligence build at `1758cfa0dc4f8f387328151cbd9008416d31853c`. Ahead/behind counts describe GitHub's compare result; they are not counts of unique functional features.

## Findings

### 1. A real fail-closed matchup reader: `claude/edge-map-rebuild`

**Unique code:** [`apps/web/lib/intelligence/matchup.ts`](https://github.com/Beexly/Sports/blob/claude/edge-map-rebuild-2026-06-04/apps/web/lib/intelligence/matchup.ts), added by commit [`2f606a1ca167fd2ad3b184fa325bf5f8d748a700`](https://github.com/Beexly/Sports/commit/2f606a1ca167fd2ad3b184fa325bf5f8d748a700), “feat(v2-phase5): leverage the data — matchup-adjusted Rating, Player Dossier, Edge Board, the ‘why’”. The file is absent on both comparison tips.

This is a genuine refusal/withholding behavior, not a claim of predictive edge:

- `loadMatchupEngine()` returns a `source-error` result with no rows and `canPublishProjections: false` when the player model or schedule is unavailable or empty.
- Missing enrichment data does not get imputed into a matchup score: `computeMatchupDelta()` returns `delta: null` / grade `unknown` when there is no usable opponent context, and the note says the base rating is unadjusted.
- `canPublishProjections` remains `false` for the successful read too.

The actual matchup delta is a hand-weighted, bounded presentation adjustment (fixed reference bands, position sensitivities, and a ±12 cap). No out-of-sample evaluation or calibration evidence was found in the diff. The related `apps/web/lib/intelligence/player-model.ts` (commit `19863eb4617609aff1b43785778702207b5b57be`) labels process/production percentile gaps “Underpriced. Buy before the market catches up”; the reviewed code does not compare those gaps to market prices. That is an unsupported marketing-style inference, not a measured market edge. **Retain the refusal contract as a candidate; do not treat or wire the adjustment as a validated projection or probability.**

### 2. A distinct calibration diagnostic, but not current calibration evidence: `safety/sports-wip`

**Unique artifact:** [`scripts/generate-calibration-report.mjs`](https://github.com/Beexly/Sports/blob/safety/sports-wip-2026-06-04/scripts/generate-calibration-report.mjs), added by commit [`a44d1cdbe36f9700d6c9d101055e351dde6872c8`](https://github.com/Beexly/Sports/commit/a44d1cdbe36f9700d6c9d101055e351dde6872c8), “feat(calibration): self-running calibration report — the launch gate runs itself (B-04)”. The standalone generator is absent on both comparison tips.

The implementation is a real diagnostic: it reads settled picks, calculates Brier/bucket statistics and a Wilson interval, records a 150-pick minimum, and emits a verdict. Its tests check parity with `apps/web/lib/calibration/compute.ts`; the worker invokes it after settlement as a non-fatal child process.

But its committed [`_launch/CALIBRATION_REPORT.md`](https://github.com/Beexly/Sports/blob/safety/sports-wip-2026-06-04/_launch/CALIBRATION_REPORT.md) explicitly says `STUB — no DATABASE_URL configured` and **0 graded picks**. That is an empty-data status, not a measured calibration result. Also, the generator's sample query does not exclude picks generated at/after kickoff. In contrast, `apps/web/lib/calibration/report.ts` on both current baselines uses `partitionInPlay()` to withhold and disclose those rows. **Do not wire this generator unmodified or present its zero-sample report as evidence; reconcile the sample definition with the current look-ahead exclusion first.**

### 3. No new successful measured method in the rescue branch

Commit [`33251c814aa8646a8889f11d438cab5f8becad60`](https://github.com/Beexly/Sports/commit/33251c814aa8646a8889f11d438cab5f8becad60), “fix(engine): conformal correction, backtest driver, and VERIFY gate”, records a real-data result in `docs/EXECUTION_LEDGER.md`: 10,301 OOS samples; model MAE **5.447** versus trailing-points-persistence MAE **4.9999**; Clark–West `t=12.20`; `beats NAIVE = false`. The ledger says the output remains `priced=false` / shadow. This is negative evidence for that run, not a method to promote; its baseline is explicitly **naive persistence, not the Vegas market**. This run is reported by the branch ledger and was not independently rerun for this audit.

The backtest driver, [`scripts/backtest/player-projection-backtest.ts`](https://github.com/Beexly/Sports/blob/rescue/intelligence-core-2026-06-28/scripts/backtest/player-projection-backtest.ts), has the same Git blob (`37e00e1e6c154132ab9143ccbbcd58f66c76f5d8`) on `main` and the intelligence build. The corrected split-conformal `(n+1)` quantile is also already present in both baselines' `conformal-intervals.ts`. The rescue commit's Tweedie code calls itself a “Tweedie-FLAVORED shadow scaffold”; current `main` has a different Tweedie implementation and labels it unvalidated/shadow. **There is no missing successful measurement or backtest harness here, and the reported result argues against promoting the old model.**

### 4. `research/proven-edge`: a display/ranking score and documentation, not a measured probability method

The only substantive prediction-engine additions in the compare are [`packages/prediction-engine/src/gse-method-spec.ts`](https://github.com/Beexly/Sports/blob/research/proven-edge/packages/prediction-engine/src/gse-method-spec.ts) and [`packages/prediction-engine/src/gse-score.ts`](https://github.com/Beexly/Sports/blob/research/proven-edge/packages/prediction-engine/src/gse-score.ts), introduced in commit [`8169c2b8b5978f46bc08cc3bcf29b54e97712e8e`](https://github.com/Beexly/Sports/commit/8169c2b8b5978f46bc08cc3bcf29b54e97712e8e), “docs: GSE System Compendium + the PRICE Method & flagship GSE Score”. The later commits mainly consolidate/write documentation.

`gse-score.ts` defines `round(confidence × provenanceMultiplier)` with a multiplier from 0.80 to 1.00. The source explicitly calls it a **presentation/ranking index, not a win probability**; its tests pin the formula and constants, not predictive performance. The compendium/spec's labels and claims do not establish measurement. **Do not wire the GSE Score as a probability or a new predictive method.**

### 5. `safety/sports-wip`: unmeasured independent probability; do not wire

Commit [`588dd503f2f89e179f4b573da11d18cbc89c9a76`](https://github.com/Beexly/Sports/commit/588dd503f2f89e179f4b573da11d18cbc89c9a76), “feat(engine): shadow independent estimator + CLV scaffold”, adds [`packages/prediction-engine/src/independent-estimator.ts`](https://github.com/Beexly/Sports/blob/safety/sports-wip-2026-06-04/packages/prediction-engine/src/independent-estimator.ts). It calculates probability as `0.5 + fundamentalPoints * 0.005`, clipped to `[0.05, 0.95]`. The tests establish directionality, price independence, and that the flag leaves published fields unchanged; they do not establish calibration or outcome accuracy. The implementation itself calls this a conservative v1, not a proven edge. **This is an unmeasured probability: do not wire it into decisions or customer-facing probabilities.**

That commit's CLV module is a shadow measurement scaffold, not a result: missing/stale comparisons become `null`, and the branch does not report a real settled CLV sample proving the estimator. The subsequent settlement fix [`43873218fd718268650b5db12d43b92b6b724f73`](https://github.com/Beexly/Sports/commit/43873218fd718268650b5db12d43b92b6b724f73) addresses an away-spread perspective bug with regression cases. Current `main`/motif settlement code has since evolved to a home-perspective API and locked-line selection, so the old helper is not a safe standalone transplant.

## Bottom line

- **Real missing refusal behavior:** `claude/edge-map-rebuild`'s matchup loader refuses to produce matchup adjustments when gating sources are unavailable and leaves missing context unknown. This is source-integrity behavior, not validated prediction skill.
- **Real unique diagnostic implementation:** `safety/sports-wip`'s standalone calibration-report generator, but its checked-in report has no data and its population query omits the current in-play exclusion. Do not wire it as-is or claim model calibration from it.
- **Measured method not found:** the rescue run is negative, compares with naive persistence, and the driver is already identical on both baselines.
- **Do not wire as predictive methods:** the proven-edge GSE Score is explicitly a ranking index; the safety branch's independent probability is a fixed, unmeasured transform; edge-map's matchup and divergence scores have no OOS proof in the reviewed diffs.
