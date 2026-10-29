# Drive dump review — 2026-10-02

Compared the dump at `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26` with the read-only checkout `C:\Users\Garrett\Sports-wt-intel`, verified at `motif/gse-intelligence-build-2026-10-02` / `1758cfa0d`. All 18 loose root TypeScript files below are byte-identical to the indicated live paths. No archives were opened.

## Files opened

Sizes are bytes. The first table lists all loose root TS and test files opened.

| Dump file | Size |
|---|---:|
| `sportsbook-mispricing-audit.ts` | 5,129 |
| `sportsbook-mispricing-audit.test.ts` | 1,978 |
| `sports-lexicon-sentiment.ts` | 4,137 |
| `sports-lexicon-sentiment.test.ts` | 1,482 |
| `2304-04437-sports-cv.ts` | 5,824 |
| `2304-04437-sports-cv.test.ts` | 1,919 |
| `2301-13576-sports-cv.ts` | 6,015 |
| `2301-13576-sports-cv.test.ts` | 1,889 |
| `2412-19215v1-optimizing-fantasy-sports-team-selection.ts` | 2,939 |
| `2412-19215v1-optimizing-fantasy-sports-team-selection.test.ts` | 1,483 |
| `2012-00253-sports-cv.ts` | 5,603 |
| `2012-00253-sports-cv.test.ts` | 1,788 |
| `2504-06163v1-action-valuation-in-sports-a.ts` | 3,268 |
| `2504-06163v1-action-valuation-in-sports-a.test.ts` | 1,553 |
| `2504-10106v1-soccernetv3d-leveraging-sports-broadcast-replays.ts` | 5,913 |
| `2504-10106v1-soccernetv3d-leveraging-sports-broadcast-replays.test.ts` | 1,834 |
| `sports-taxonomy.ts` | 4,298 |
| `sports-taxonomy.test.ts` | 5,161 |

The six paths named as directories in the prompt are regular, nonempty files in this Drive view, not directories; each contains Git ref/reflog-like text, so there were no child TypeScript files to inspect there. I opened these path entries:

| Dump path | Type here | Size |
|---|---|---:|
| `sports-prediction-platform-6F7Wa` | file | 212 |
| `sports-prediction-platform-6F7Wa (1)` | file | 165 |
| `sports-intelligence-os-phase-9-ci` | file | 197 |
| `sports-wip-2026-06-04` | file | 372 |
| `sports-wip-2026-06-04 (1)` | file | 41 |
| `galaxy-sports-corporate-structure-Cni9A` | file | 160 |

None of the opened files was 0 bytes.

## TS module disposition

| Dump module | Disposition | Live counterpart |
|---|---|---|
| `sportsbook-mispricing-audit.ts` | Already in live tree (byte-identical) | `packages/data-ingestion/src/sportsbook-mispricing-audit.ts` |
| `sports-lexicon-sentiment.ts` | Already in live tree (byte-identical) | `packages/data-ingestion/src/sports-lexicon-sentiment.ts` |
| `2304-04437-sports-cv.ts` | Already in live tree (byte-identical) | `packages/data-ingestion/src/2304-04437-sports-cv.ts` |
| `2301-13576-sports-cv.ts` | Already in live tree (byte-identical) | `packages/data-ingestion/src/2301-13576-sports-cv.ts` |
| `2412-19215v1-optimizing-fantasy-sports-team-selection.ts` | Already in live tree (byte-identical) | `packages/prediction-engine/src/2412-19215v1-optimizing-fantasy-sports-team-selection.ts` |
| `2012-00253-sports-cv.ts` | Already in live tree (byte-identical) | `packages/data-ingestion/src/2012-00253-sports-cv.ts` |
| `2504-06163v1-action-valuation-in-sports-a.ts` | Already in live tree (byte-identical) | `packages/prediction-engine/src/2504-06163v1-action-valuation-in-sports-a.ts` |
| `2504-10106v1-soccernetv3d-leveraging-sports-broadcast-replays.ts` | Already in live tree (byte-identical) | `packages/prediction-engine/src/2504-10106v1-soccernetv3d-leveraging-sports-broadcast-replays.ts` |
| `sports-taxonomy.ts` | Already in live tree (byte-identical) | `packages/prediction-engine/src/conformal/sports-taxonomy.ts` |

All nine test files are also already in the live tree and byte-identical: the first four pairs and the `2012-00253`, `2301-13576`, `2304-04437` tests are under `packages/data-ingestion/src/`; the PPO, action-valuation, and SoccerNet tests are under `packages/prediction-engine/src/`; `sports-taxonomy.test.ts` is `packages/prediction-engine/src/__tests__/sports-taxonomy.test.ts`. No module in the opened dump is new and safe to reimplement or blocked on its contents; the six unavailable directory trees remain unreviewed.

## Smallest fail-closed publication change

Keep `scoreGames` scoring-only; it returns scored objects and does not itself persist a published pick. Put the gate at the `process-sport.ts` persistence boundary, before any pick create/upsert/update branch in the `for (const pick of scoredPicks)` loop. Require an actual per-game trace evaluation for that pick. Continue only for a structurally valid, correctly branded trace with `ok === true` and `conclusion === "ASSOCIATION_ONLY"`; otherwise record a GATED decision and skip all pick writes for that item. Missing trace maps to a missing-trace gate reason; `WITHHELD` and `INSUFFICIENT` map to their own refusals; `ok === false`, a malformed/unbranded trace, or an unrecognized conclusion maps to INVALID. Do not treat the trace's `agreementSummary` as a scoring probability or as permission to publish.

This is a publication-path guard only: leave scoring formulas and `modelVersion` untouched. The current `process-sport.ts` path constructs `oddsInputs`, calls `scoreGames`, then enters persistence without a reasoning trace. Therefore fail-closed behavior means these picks remain unpublished until an honest trace is supplied for the same game; do not fabricate premises or repurpose holdout-only `traceHoldoutGame` rows as live evidence. `reasoning-trace.ts` currently has conclusions `WITHHELD | ASSOCIATION_ONLY | INSUFFICIENT`; `reasonAbout` errors are `{ ok: false }`, so treat that error branch and any malformed/unknown runtime value as INVALID without pretending INVALID is already a trace conclusion. `generate-signal-slate.ts` already refuses to run absent an `ASSOCIATION_ONLY` trace, but that does not gate the `process-sport.ts` scored-pick path.

## Dump content that could fake a pick if wired as-is

- `sportsbook-mispricing-audit.ts` documents a 3-SD odds filter, a 100k random-betting bootstrap, and a fractional-Kelly cap, but its implementation only computes a regression slope and favorite/longshot diagnosis. It does not apply those filters, run that bootstrap, or calculate Kelly. Its `CONFIG.enabled` is false. Treating the comments or acceptance gate as an implemented QA result would falsely imply a pick passed checks that never ran.
- `sports-lexicon-sentiment.ts` is a hand-written lexicon scorer/classifier, not the described trained CNN or a probability estimator. Wiring its bullish/bearish label or scalar directly as a win probability/confidence would manufacture forecast evidence.
- `2504-06163v1-action-valuation-in-sports-a.ts` accepts caller-supplied coefficients and returns a logistic value; it contains no trained/calibrated completion model. The test's chosen coefficients establish toy monotonic behavior, not a fitted probability. Do not treat the output as a pick probability.
- `2412-19215v1-optimizing-fantasy-sports-team-selection.ts` contains PPO/GAE surrogate math, not a trained policy or field simulator; `ENABLED` is false. The objective is not a lineup recommendation or measured payout edge.
- The three sports-CV modules expose generic box IoU/NMS/precision-recall primitives. They do not implement the larger paper-specific video, rally segmentation, pose-lifting, or action-benchmark systems described in their comments. They cannot substantiate a pick or a claim of those systems' validation.
- `2504-10106v1-soccernetv3d-leveraging-sports-broadcast-replays.ts` is simplified geometry and omits robust checks for invalid camera parameters and non-finite inputs. Its outputs must not be promoted to verified tracking evidence or pick features without separately validated inputs and method.
- `sports-taxonomy.ts` and the CV/market diagnostic helpers are categorization or diagnostics, not calibrated predictive evidence. In particular, taxonomy categories/sample summaries must not be presented as a calibration fit or invented sample support.

The live `reasoning-trace.ts` itself explicitly makes `publishablePick` and `beatsBookClaim` false on every path; it is an audit trace, not a pick generator.
