# FRONTIER PROGRAM — inventory, reevaluate, recalibrate, rescore

Founder order, 2026-09-21. This is the program. It is not a shrink of the
vision. The goal is the leading multi-signal engine in the world: every
field we have already learned from, wired, weighted, and then scored
against every settled pick so the record is a measurement, not a story.

Doctrine stays in `docs/ops/ENGINE_DOCTRINE.md`. This file is the sequence.

Census that drives it (grok-4.5 scouts, 2026-09-21, read-only). Do not
re-inventory what they already counted unless a row below says VERIFY.

## What we already have, and have not used

Sports repo, `C:/Users/Garrett/Sports`:

- 28 factor files. 7 CANDIDATE (A6, A7, A14, A19, A22, A23, A25). 18 DEAD.
  - 18 DEAD. 3 BLOCKED (A2, A8, A26). A failed market test is not a deletion.
    The ingestion path for every one of those 21, and for all 35 unwired
    modules, is `docs/ops/SIGNAL_SOLUTIONS.md`. DEAD is withdrawn as a
    status that means stop.
- 72 signal or calibrator modules in the prediction engine. 37 have some
  non-test importer. 35 do not, including the weighting machine itself:
  `earned-weight-ensemble.ts`, `evidence-readiness-matrix.ts`,
  `signal-ledger.ts`, `replay-harness.ts`. The ledger is the product and
  it has no production caller. `composite-score.ts` is called only by the
  ledger.
- MODEL_VERSION is v5.2.7 in `packages/prediction-engine/src/constants.ts`.
- Rescore corpora on disk: receipts snapshot 1,111 rows
  (`docs/data/receipts-snapshot-2026-09-08.json`), 1,087 scored WIN/LOSS.
  Board export 3,261 lines (`docs/ops/stats-lane/incoming/board-export.jsonl`),
  includes PENDING. PICKS-H1 fixture is 38 rows / 10,975 bytes. That fixture
  is a smoke test, not the holdout. The live settled pool is in the database.
  An agent does not write to it.

Competitive intel, `C:/Users/Garrett/gse-competitive-intel`: 531 top-level
files, 247 markdown. The July 16 dossiers (`_MASTER-gse-strategic-dossier.md`,
`_gse-domination-capstone.md`, `_HANDOFF-to-coding-agent.md`) already named
the machine: as-of feature store, line archive, walk-forward, calibration,
Mondrian gate, fire on edge not confidence, hierarchical-Bayes props,
closing-line distillation, market as a fixed offset, signal mesh whose
weight is empirical precision. They marked the mesh INERT until CLV cleared.
That freeze is the ten-month error. CLV is one column of the record. It is
not the lock on the ledger. Those dossiers are stale on later measurements.
Use them as a target list, not as current truth.

Local learning piles that the rescore must consume:

- `C:/workspace/gse-lab-20260919` — measured kills and one graduate
  (wind 15–19 mph). Decision-tier CSV. CRPS fails vs the close.
- `mimo/mimo-xfp-2026-09-18` — xFP FAIL vs naive points (n=6,022). Catchable
  air yards inconclusive. Log both. No buy/sell language from xFP.
- `mimo/salvage-tiera-2026-09-21` — the frontier code that is not scored.
  New modules across bio, biomechanical, chemistry, discipline, efficiency,
  environment, narrative, props, schematic, situational, tactical, trench,
  plus calibration-ladder, multi-market ensemble, weather-edge, pick-clv,
  source-reliability. This is the "learn from everything" pile. It is code.
  It is not yet a weight.
- `mimo/docs-cleanup-calib-2026-09-21` `docs/ops/CALIBRATION_STATUS.md`,
  quoted by the scout, not re-measured here: all settled 3,152 at 54.6%.
  v5.2.7 is 1,834 at 56.9%. Market Brier 0.2344, ECE 0.0169, on 1,270 paired
  rows. rankingP is worse. Shrinkage at 0.10 matches the market. CLV beat
  578, matched 752, lost 784. `clvPositive` is empty. That file is the
  current scoreboard the rescore has to beat, not replace.
- `gse-ml-service` exists (Docker). `gse-data-scout` exists (scrapers).
  `gse-discovery-A/B/C.md` are catalogs, not scores.
- `docs/ops/stats-lane` holds Mondrian, CQR, ordering, and the underpowered
  EPA-vs-market duel (8 market pairs). Do not cite 0.339 vs 0.105 as a kill
  or a pass.

Wiring conflict, VERIFY before a grunt treats a module as absent. An earlier
scout found poisson and dixon-coles imported by
`build-independent-fair-values.ts`, and nfl-epa-fair-value imported there
too, cold-start gated at 4 games. This census listed dixon-coles and
nfl-epa-fair-value as unwired under a different importer rule. One rg
settles it. Do not rebuild either.

## The four phases

### 1. Inventory — closed enough to start

The census above is phase 1. What is still open, and only this:

- One importer check for dixon-coles, poisson, nfl-epa-fair-value.
- A file list of the salvage `src` signal folders (bio through trench),
  one line per module: computes as-of, or needs a fact we do not have.
- Do not re-read the 531 intel files. The 20 targets in the census are
  the intel contribution.

### 2. Reevaluate — every item becomes one of five labels

No new research. Label what we already hold.

- WIRE-NOW. Observable exists, source is cleared, can be computed as-of.
  The seven CANDIDATES. Occurrence turnovers. Opponent-adjusted EPA as a
  feature. Weather as a field (wind graduated in the lab for 15–19 mph;
  pressure and humidity stay low-weight until their own outcome test).
  Poisson and Dixon-Coles if the importer check says they are not already
  on the fair-value path. Salvage modules whose inputs are on disk.
- WEIGHT-ZERO. Computes, but the outcome test failed or was a market test
  we are no longer using as a deletion. The 18 DEAD factors. xFP. W5–W8
  in the lab. They get a ledger row so the composite can see them. Their
  starting weight is zero. The refit may move it. A human does not.
- BLOCKED. Cannot compute without inventing a fact. Nutrition. Unsourced
  coachspeak. Broadcast tracking. A2, A8, A26, whatever their yaml says
  is missing. Name the missing source. No stub number.
- ALREADY-IN. Already on a live path. Leave it. Do not rebuild it.
  Market price is already-in. It stays one signal, fixed offset, not a god.
- DO-NOT-PUBLISH. Anything whose only honest state is "we do not know."
  In-play rows stay out of every calibration denominator. Invalid American
  odds stay out of win rates and stay in the ledger as an exclusion count.

Family tag every WIRE-NOW row. Five signals off one table are one family.
Agreement is counted once.

### 3. Recalibrate — fit the weights to outcomes

This is the refit the founder authorized. It is not a silent edit to the
live score.

- Fit on pre-game, decided, non-bootstrap rows only. In-play is a separate
  stratum and is not in the fit.
- Market logit is a fixed offset. Other signals get coefficients. A
  coefficient that does not clear its pre-registered outcome bar stays at
  the weight it entered with (zero, for WEIGHT-ZERO rows).
- The published confidence number is not the target. It is backwards on
  the book path. The target is the outcome. The output is a new composite
  probability and the contribution of each signal.
- Do not bump MODEL_VERSION in the same change as the fit. The fit lives
  as a scored artifact first: coefficients, sample, exclusions, Brier,
  log-loss, and the market's Brier on the same rows. A version bump is a
  later founder decision after that artifact exists.
- Do not flip a gate. Do not edit schema. Do not write the database.

The learner that should run this already exists and is unwired:
`earned-weight-ensemble.ts`, `evidence-readiness-matrix.ts`,
`replay-harness.ts`. Wire those three to the artifact. Do not write a
fourth fitter.

### 4. Rescore — the actual record, beside the published one

This is what the founder asked for. Every settled pick, rescored under
the refit composite, so we can see what the engine actually is.

Two books. Both shown. Neither erases the other.

- Book A is the published record. It does not move. Rewriting history to
  flatter the new composite would destroy the only thing a frontier
  ledger is. `isPublished` stays. Settlement stays.
- Book B is the shadow rescore. Same picks, same outcomes, new
  probability from the refit. Report n, hit rate, Brier, log-loss, by
  sport and market and model version, with the exclusion counts on the
  same page. Wilson intervals. If Book B does not beat Book A on Brier,
  say so. That is a result.
- Corpus, in order: board-export.jsonl decided rows, then the receipts
  snapshot as a check, then a read-only production SELECT if an operator
  runs it. An agent session does not open a write connection. If the
  export is missing a column the rescore needs, the rescore says NOT RUN
  for that column. It does not drop the pick silently.
- Pushes are not wins. In-play is reported separately, not blended.
- Invalid American odds are an exclusion, counted.
- The 38-row PICKS-H1 fixture is a unit test of the scorer, not the record.

What "world class" means on the page this produces: more signals in the
composite than any public board will show, each with a weight you can
read, a record you can recompute, and a market row that is allowed to
still be the best single signal. That is the frontier. A fake 60% is not.

## Who does what

Grunt agents execute. They do not reopen the vision.

1. Importer VERIFY for dixon-coles, poisson, nfl-epa-fair-value. One rg.
   Write the result into a comment on this file's open section. Stop.
2. Salvage module list: one line each, WIRE-NOW or BLOCKED, with the
   missing fact if blocked. No scoring.
3. Ledger wire: `signal-ledger.ts` called from the shadow path only, with
   the WIRE-NOW and WEIGHT-ZERO rows. Weight zero where doctrine says
   zero. No mint change. No MODEL_VERSION change.
4. Refit artifact from `earned-weight-ensemble.ts` on the board export's
   decided pre-game rows. Coefficients and Brier in a JSON file under
   `docs/ops/stats-lane/`. No database write.
5. Book B rescore from that JSON. Same folder. Book A numbers copied from
   `CALIBRATION_STATUS.md` and labeled as that file's measurement, not
   re-derived from memory.

Founder, not a grunt: whether Book B replaces the live probability after
the artifact exists. Whether a version bump ships. Whether any env flag
moves. Until that word, Book B is the record we look at, and Book A is
the record we publish.

## What this program refuses

- Amputating fantasy, props, weather, narrative, or scheme to "focus."
  The July capstone said amputate. The founder has overruled that. Those
  are signals. They enter at the weight they have earned, including zero.
- Treating a failed market test as permission to leave the pipe unbuilt.
- Replacing the published record with a backfit.
- Inventing a nutrition number, a revenge game, or a closing line.
- A fourth calibration math stack. The modules exist. Use them.
- Quoting the July 16 "50.9% CLV" figure as current. Later measurements
  disagree with it, and they disagree with each other depending on
  denominator. Book B states its denominator. It does not pick the
  flattering one.
