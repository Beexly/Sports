# HP-14 CORRECTION (04:10 UTC 2026-09-09) — read this before touching hermes/v528-week1 again

Measured on the remote at 04:08 UTC (`git fetch origin hermes/v528-week1`):
- The branch has ONE commit, `2d313557a`, and it is cut from a STALE main: `git diff origin/main
  origin/hermes/v528-week1 --stat` deletes 1,162 lines, including
  `docs/ops/BAKEOFF_IDENTICAL_ROWS_2026-09-08.md` (PR #722, merged 02:02 UTC). Merged as-is it would
  revert tonight's merges. First step: `git fetch origin main && git merge origin/main` (no rebase).
- `packages/prediction-engine/src/constants.ts:25` on the branch reads `MODEL_VERSION = "v5.2.7"`.
  The report's claim "MODEL_VERSION = v5.2.8 added (already verified present)" is false.
- `docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md:3` reads
  `status: PROPOSED`. Not flipped.
- `docs/ops/AGENT_LEDGER.md` has no C-276 row. No test file was added.
- The gate is the WRONG SHAPE. It is appended AFTER the existing 0.58 fair-prob floor (moneyline) and
  after the 0.55 vote / 50 confidence gates (totals), and it returns null whenever
  `independentEdge == null`. For totals it constructs an edge from the spread Skellam model and gates
  on it, so every total is suppressed. Net effect: FEWER NFL picks than v5.2.7, not more. The brief
  said the opposite: publish on positive market-relative edge INSTEAD OF the 0.58 floor.
- `const mlFair = mlFairProbHome ?? fairProb;` compares the chosen side's trueProb against the HOME
  fair probability even when the chosen side is away. Sign bug.

## What to do, mechanically, in this order

0. `git checkout hermes/v528-week1 && git fetch origin && git merge origin/main` (resolve, no rebase).
   Then `git diff origin/main --stat` must show ONLY files you intend to change.
1. Revert your two gate blocks in `scoring.ts` (the 35 lines). Start clean.
2. Moneyline (`scoreMoneylinePick`): REPLACE the 0.58 fair-probability floor (the `if (fairProb <
   MONEYLINE_FAIR_PROB_FLOOR) return null` style check near the old line 965) with the market-relative
   edge test: let `p` = the market-anchored probability for the CHOSEN side (the same basis
   `market_anchored_v2` the calibration loader uses; if the engine exposes it as `rank.rankingP` or
   the independent trueProb when priced, use that, never confidence/100), let `q` = the de-vigged
   consensus fair probability for the CHOSEN side (`fairProb`, already side-selected), and publish
   only when `p - q > 0`. Keep `MIN_BOOKMAKERS`. Keep the 50 confidence floor as is. When no `p`
   exists, fall back to the CURRENT behavior (the 0.58 floor), do not return null.
3. Totals (`scoreTotalPick`): do NOT use the Skellam spread model. Keep the priced-set and
   MIN_BOOKMAKERS checks. Replace the 0.55 over/under vote gate with the same positive-edge test when a
   market-anchored `p` for the chosen side exists; when it does not, keep the current vote gate
   unchanged. Never return null solely because an independent estimate is absent.
4. Same commit: flip the proposal front-matter to `status: IMPLEMENTED` and set
   `MODEL_VERSION = "v5.2.8"` in constants.ts. Run `node scripts/guardrails/model-freeze.mjs`; it must
   print OK v5.2.8.
5. Tests in `packages/prediction-engine/src/__tests__/v528-edge-publish.test.ts`, each red-checked
   (revert the code line, watch the test fail, restore): (a) ML with p 0.55, q 0.52 publishes even
   though 0.55 < 0.58; (b) ML with p 0.60, q 0.62 does NOT publish; (c) ML with no p and fairProb 0.60
   publishes (fallback unchanged); (d) total with p 0.53, q 0.50 publishes; (e) total with p 0.49,
   q 0.50 does not; (f) total with no p keeps the vote-gate behavior.
6. Ledger: add row C-276 "v5.2.8 IMPLEMENTED - edge-based NFL/NCAAF ML+totals publish" Owner hermes,
   CLAIMED in this commit, DONE with the SHA after the verify block. `node
   scripts/ops/check-agent-ledger.mjs` must exit 0.
7. Verify block, real exit codes: `npm run typecheck`, `npm run lint`, `npx vitest run
   packages/prediction-engine`, `npm run guardrails`, `npm run build`. Paste the last line of each
   into the PR body. If any is red after two attempts, mark C-276 BLOCKED with the exact error and
   stop.
8. Push `hermes/v528-week1` and open the PR as READY: "engine: v5.2.8 market-anchored probability,
   edge-based NFL/NCAAF moneyline and totals publish". Body lists each gate changed with line refs.

Report only what a command printed. Do not write "verified present" for anything you did not
`git show`.
