# Fledge slice — loose *.ts modules in dump root

Source folder: `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26`
Scope: files whose names contain sports-cv, lexicon, mispricing, fantasy, action-valuation, or taxonomy.
Comparison target: `C:\Users\Garrett\Sports-wt-intel\packages` (no files modified anywhere).

## Classification

| File (dump root) | Status vs Sports-wt-intel | Identical? | Emits probability? | Sample count attached? | Publish verdict |
|---|---|---|---|---|---|
| 2012-00253-sports-cv.ts | Already present: `packages/data-ingestion/src/2012-00253-sports-cv.ts` | Yes (diff clean) | Yes — `ScoredBox.score` detection confidences | No | Unsafe to publish |
| 2301-13576-sports-cv.ts | Already present: `packages/data-ingestion/src/2301-13576-sports-cv.ts` | Yes | Yes — `ScoredBox.score` | No | Unsafe to publish |
| 2304-04437-sports-cv.ts | Already present: `packages/data-ingestion/src/2304-04437-sports-cv.ts` | Yes | Yes — `ScoredBox.score` | No | Unsafe to publish |
| 2412-19215v1-optimizing-fantasy-sports-team-selection.ts | Already present: `packages/prediction-engine/src/…team-selection.ts` | Yes | Yes — PPO probability ratio `pi_new/pi_old` | No | Unsafe to publish |
| 2504-06163v1-action-valuation-in-sports-a.ts | Already present: `packages/prediction-engine/src/…action-valuation-in-sports-a.ts` | Yes | Yes — `completionSurface` probability field | No | Unsafe to publish |
| sportsbook-mispricing-audit.ts | Already present: `packages/data-ingestion/src/sportsbook-mispricing-audit.ts` | Yes | Yes — `impliedProb` per line, calibration slope on realized vs implied | Aggregate audit carries `n` per book; per-line probability does not | Unsafe to publish |
| sports-lexicon-sentiment.ts | Already present: `packages/data-ingestion/src/sports-lexicon-sentiment.ts` | Yes | Yes — `attentionWeights` are a softmax distribution; sentiment score | No | Unsafe to publish |
| sports-taxonomy.ts | Already present: `packages/prediction-engine/src/conformal/sports-taxonomy.ts` | Yes | Not primarily — emits Mondrian taxonomy categories; `CategoryDiagnostics` carries `sampleSize`/`n` | Yes (`n` in diagnostics) | Categories + counts usable; any probability derived from it must carry that n |

## Notes

- No file in this slice is "new and shadow-only": every source .ts and .test.ts has a byte-identical twin in Sports-wt-intel (verified with diff, read-only).
- No file was blocked/unreadable; all eight parsed cleanly (export signatures + acceptance gates readable).
- All eight carry `ENABLED = false` / `enabled: false` in CONFIG (fantasy and action-valuation likewise disabled) — nothing here is live-wired.
- Per the stated rule: any module that emits a probability without a sample count is marked unsafe to publish; lines above carry that mark unless a sample count travels with the probability.
- Excluded by name filter: `2504-10106v1-soccernetv3d-leveraging-sports-broadcast-replays.ts` (name matches none of the slice keywords; not evaluated).
