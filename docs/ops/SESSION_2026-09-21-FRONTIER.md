# Session record — 2026-09-21 frontier correction

Written so another agent can continue without this chat. Branch
`hermes/last-plan-2026-09-15`. Not a claim that any of this is on `main`.
Not pushed unless a later line in this file says a SHA on origin.

## What the founder corrected, in order

1. The Google audit is not the build queue. Most of the modules it
   names already exist. Its ECE gate of 0.06 over 250 samples is not
   the live gate.
2. We will never beat the market. That is not the goal and it is not a
   reason to leave a signal unwired. Learn from everything, not only
   sports. Wire it, or build the signal the learning implies. A paper
   that is only filed does not count.
3. Factors stamped DEAD for losing a market test are not dead ends.
   Each one has a job. The salvage branch already holds most of the
   modules.
4. Do not shrink the vision. Inventory, reevaluate, recalibrate, rescore.
   Book A is the published record and does not get rewritten. Book B is
   the shadow rescore.
5. The brand-new published NFL slate is not the training set. Prior
   seasons are. Play-by-play 2019-2026 is already gzipped in the lab.
   Player yards and touchdowns are in those releases. That is how this
   Sunday gets priced. Waiting for 100 of our own settled picks is the
   wrong design.
6. Do not re-ban sources the registry or a founder ruling already
   cleared. Use them. Cite them. Forbidden stays forbidden.
   Use-with-caution is to be used, not shelved. PFF grades embedded in
   PFF's own public pages are in scope under the 2026-09-18 founder
   override, with time, date, and URL.

## Counts actually checked

- GitHub `Beexly/Sports`: 442 branches (API Link last page 442), 843
  pull requests (last page 843). This clone tracked 443 remote refs.
  A remembered "980 branches" or "922 branches" was not what the API
  returned. 187 remote names start with `claude/` and were not opened
  one by one. The 96 Sports-* clones on disk were not diffed.
- `docs/factors`: 28 YAML. 18 were stamped DEAD, 7 CANDIDATE
  (A6, A7, A14, A19, A22, A23, A25), 3 BLOCKED (A2, A8, A26).
- Receipts snapshot `docs/data/receipts-snapshot-2026-09-08.json`:
  1,111 rows. Ablation: 199 invalid American odds (17.91%), decided
  subset n=890, confidence 50-54 realized 57.1% (n=457), 80+ realized
  37.5% (n=16). Source:
  `docs/data/CONFIDENCE-INVERSION-ABLATION-2026-09-08.md`.
- `packages/verifier/fixtures/picks-h1.json` is 10,975 bytes, 38 rows.
  It is a unit fixture, not the holdout. Do not score a season on it.
- Board export `docs/ops/stats-lane/incoming/board-export.jsonl` is
  about 3,261 lines and includes pending games.
- Lab play-by-play: `C:/workspace/gse-lab-20260919/data/pbp_2019.csv.gz`
  through `pbp_2026.csv.gz`. Present on disk this session.
- xFP holdout, verified from the result file, not from a note:
  `Sports-worktrees/mimo-xfp-2026-09-18` at `d9f37cc34`,
  `scripts/research/mimo-xfp/results/unit1_holdout.json`.
  n=6022, spearman_xfp 0.210119, spearman_naive 0.226608,
  delta -0.016489, CI includes 0, kill_line_passed false.
  RMSE favored xFP and was not the kill metric. Do not rescue it by
  switching metrics. Do not build buy/sell language from it.
  The row can still exist in the ledger at a low weight.
- Mimo salvage tip `b8dfe5d06` on `mimo/salvage-tiera-2026-09-21`
  matches origin and is clean. It holds the cross-domain signal
  modules. They have not been scored as a composite.
- CQR in the dirty working tree is already fail-closed
  (`apps/web/lib/calibration/cqr.ts` returns infinity when the sample
  cannot certify coverage). That dirt belonged to another agent. It
  was left uncommitted by them and was not swept into a commit from
  this session unless a later line says otherwise.

## Files this session added or changed

Doctrine and program, for the next agent:

- `docs/ops/ENGINE_DOCTRINE.md` — standing founder order, transfer
  rule, training-set correction.
- `docs/ops/FRONTIER_RESCORE.md` — inventory, reevaluate, recalibrate,
  rescore. Book A stays. Book B is the shadow rescore.
- `docs/ops/SIGNAL_SOLUTIONS.md` — a job for every factor that was
  stamped dead or blocked, and for the unwired modules.
- `docs/ops/BLIND_SPOTS.md` — what the branch list does not show.
  Props fit on prior years. Market features used backwards. Fantasy,
  parlays, Statcast, lab CSVs.
- `docs/ops/SESSION_2026-09-21-FRONTIER.md` — this file.

Engine code, shadow path only. Does not publish a pick. Does not bump
`MODEL_VERSION` (still `v5.2.7` in `constants.ts`).

- `packages/prediction-engine/src/frontier-signal-catalog.ts`
  Every learned signal is a ledger row. Absent observation does not
  vote. Present observation votes at a floor. One vote per family.
- `packages/prediction-engine/src/__tests__/frontier-signal-catalog.test.ts`
  5 tests passed this session (`npx vitest run` in the prediction-engine
  package, 2026-09-21).
- `packages/prediction-engine/src/index.ts` exports the catalog.
- `apps/web/lib/ops/shadow-evaluation-pass.ts` calls
  `composeFrontierLedger` and records the row count in notes. It still
  does not create, mutate, or publish a `Pick`.

Also touched, outside this repo or already dirty:

- Top of `AGENTS.md` on this branch points at the doctrine and the
  frontier program. The file was already modified before this session.
- `C:/Users/Garrett/agent-bus/sports/CHARTER.md` carries the same order.
- Bus messages under `agent-bus/sports/msg/hermes/` dated 20260921.
- Hermes plan copy:
  `C:/Users/Garrett/.hermes/plans/2026-09-21_215058-gse-110-capacity.md`
- Sports-edge-lab skill carries the founder order.

## What is not done

The catalog speaks for the rows. It does not yet fill them from
nflverse, FTN charting, schedules, or contracts. Filling a missing
value with a guess is forbidden. The populator is the next build.
Then the fitter (`earned-weight-ensemble.ts`, still unwired as a
runner). Then Book B on decided, pre-game rows of the board export
and the receipts snapshot. Book A does not change in that work.

A2 shrinkage was blocked on the 38-row fixture. Point it at the board
export. A8 temperature scaling is the same mistake. A26 man/zone was
blocked on a stale "no coverage column" sentence. nflverse-ftn
charting has coverage from 2022. Use it.

Do not import the 600-line intelligence modules on the salvage branch
straight onto the publish path. Score them. Wire them through the
ledger.

## How to continue

Read `ENGINE_DOCTRINE.md`, then this file, then `SIGNAL_SOLUTIONS.md`.
Do not re-derive the dead-factor list. Do not treat a thin published
slate as a missing history of football. Fit on the gzips. Price this
week. Show the published record unchanged until the founder accepts
Book B.
