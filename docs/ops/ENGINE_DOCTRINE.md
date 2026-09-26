# ENGINE DOCTRINE — founder, standing, not optional

Written 2026-09-21 after the founder corrected ten months of agents
treating "do not beat the market" as "do not wire."

This is the product. It has been the product since the repo said so.
Read it before any plan, kill line, or "leave it in research" note.

## The ask, in the founder's words

We will never beat the market. That is not the goal and it is not a
reason to leave a signal unwired.

The engine exists to be the smartest one in the world. It ingests more
signals than anyone else. Papers, equations, charts, StatRankings, PFF,
EPA, competitor tables, and our own derived metrics are how we LEARN.
Then we either wire the signal, or we use what we learned to build the
signal we actually need. Both end in the engine. Neither ends in a
folder of unread research.

Every signal is calibrated. Every signal has a weight. Weights differ.
A soft signal is present and discounted. It is never ignored. A signal
that has not earned weight yet is still spoken for, at a low weight,
until outcome calibration moves that weight. Failing a market test does
not delete it. The market is one signal in the matrix. It is not the
god and it is not the enemy.

## The training set is prior years, not our own slate

Founder correction, 2026-09-21. We are a new book. Our published NFL
sample is thin because the brand is new, not because football started
this month. Predicting this season off "wait until we have 100 of our
own settled picks" is a category error. Agents who treat that thin
slate as the reason we cannot model NFL are wrong.

The backend is historical public data we already hold or already know
how to fetch legally.

- Play-by-play 2019 through 2026 is on disk at
  `C:/workspace/gse-lab-20260919/data/pbp_*.csv.gz`. nflverse goes back
  to 1999. That is the fit. Hold out a later season. Apply to this week.
- Player-game outcomes for props (yards, targets, touchdowns) are in
  those same releases. The props model does not need our pick history.
  It needs prior seasons of player results, which we have.
- Game closing spreads and totals are on nflverse schedules and in
  public line archives already named in this repo (spreadspoke, Covers).
  That is enough to train a side and a total.
- Prop closing prices are the one fetch, not the one excuse. Outcomes
  are local. Lines come from a source whose terms allow it, including
  files the founder already pointed at. Do not write "props cannot be
  tested" when the outcome half is sitting in a gzip.
- Our published picks are the honesty surface. They are what we show.
  They are not the training set. Book A is the live record. The model
  that prices Sunday was fit on prior years.

Legal public and left-open sources are in scope when the registry or a
founder ruling says so. Do not re-ban them out of caution. PFF grades
embedded in PFF's own public pages are use-with-caution under the
2026-09-18 founder override, cited with time, date, and URL. FTN
charting via nflverse is cleared with attribution. Statcast, Sleeper,
and nflverse are cleared. A source the registry marks forbidden stays
forbidden. A source marked use-with-caution is to be used, attributed,
not shelved.

## Learn from everything. The papers are a transfer library.

Founder, 2026-09-21, second correction. The corpus is not sports.
Machine learning, cognition, physics, weather and its effect on the
play, pace, scheme, coaches, milestone and revenge and playoff
narratives, injuries, sports medicine, nutrition, algorithms, engines,
and code. That is why the arxiv pile exists. A paper that is only filed
is a failure. A paper that becomes a new unwired model is the same
failure with extra files.

The transfer, and it is the only way a paper counts:

1. Mechanism. One sentence from the paper. Not a vibe.
2. Observable. The sports fact that mechanism predicts. Computable
   as-of from a cleared source, or BLOCKED with the missing source
   named. Never invented.
3. Ledger row. key, value, weight, confidence, freshness, family.
   Weight starts low. Family stops five copies of one table from
   counting as five confirmations.
4. Outcome test, pre-registered, no market kill. The test moves the
   weight. It does not decide whether the row exists.

Domain to signal, so agents stop filing and start transferring:

- Machine learning and algorithms are the weighting machine
  (earned-weight ensemble, walk-forward, trials registry, e-process).
  Wiring the learner outranks downloading paper 1501.
- Cognition is decision-weight error (coaches, public, us). Prelec was
  already tried. A category error stays a null. The transferable piece
  is a measured distortion on a real decision, logged, low weight.
- Physics is persistence, tempo, and accumulation. A failed
  market-Brier test on DFA or homology sets weight zero. It does not
  delete the observable if it still computes.
- Weather is a field: wind, pressure, humidity, roof, direction. Not
  one binary. A25 (wind vs passing and receiving yards) is a CANDIDATE
  with a confidence interval that excludes zero. A5 (team totals) died
  on the recent era. Different observables, different weights. Both
  stay spoken for.
- Pace, scheme, and coaches are usage and tendency features already
  computed in lab tables. They enter the ledger. They do not wait for
  a new paper.
- Narratives (milestone, revenge, contract, playoff) enter only with
  source and verifiedAt. The narrative module already refuses to infer.
  That refusal stays. The missing work is the sourced fact, then a low
  weight. An agent does not invent a revenge game to fill the ledger.
- Injuries and sports medicine enter through rest, practice status,
  and snap ramp, which we have. Nutrition enters only when a cleared
  fact exists. No calories are guessed.
- Other people's code and charts are read to learn a method. The
  output is our computation. Their table is never republished as ours.

Ready to wire now, because the observable and the source already
exist: A6, A7, A14, A19, A22, A23, A25, opponent-adjusted EPA,
occurrence-based turnovers, weather as a field, poisson and
dixon-coles. Low weight. Not a published probability.

Still blocked, and blocking is honest: nutrition, unsourced coachspeak,
broadcast tracking, any paper whose observable cannot be computed
as-of. Name the missing source. Do not stub a number.

## Where the repo already said this

- `docs/PROPRIETARY_METRICS_REPRODUCTION_STRATEGY.md`, section "North
  Star: weight ABSOLUTELY EVERYTHING." Universal signal ledger. Every
  input has a weight, a confidence, and a freshness. Soft signals never
  ignored. Weights tuned against outcomes. `compositeScore` is the blend.
- `_logs/REBUILD_SOURCE_LEDGER_2026-06-05.md`: founder directive, be the
  most intelligent site, ingest much more data, no fabricated data.
- `docs/ops/archive/root-museum/BUILD_LOG.md`: signal mesh
  `signal-ledger.ts` — "Phase 4 INERT stubs only."
- `packages/prediction-engine/src/signal-ledger.ts` and
  `composite-score.ts` exist. As of 2026-09-21 they are exported and
  tested. No production path calls them. That is the defect.
- `docs/factors/INDEX.md`: A1–A28 were scored and mostly marked DEAD
  because they did not beat a market-relative test. Under this doctrine
  DEAD means "weight not yet earned," not "delete the pipe."

## What agents did instead, and why that was wrong

Agents, including the 2026-09-21 plan that this file corrects, treated
a failed market duel as permission to leave the module unwired. That
inverted the spec. The spec says wire first, weight by calibration.
The charter of 2026-09-18 already said rung 1 is log immediately, no
test, because deferral destroys sample. Agents still did not wire.

xFP failed its own outcome test against naive fantasy points (Spearman
0.210 vs 0.227, n=6022, kill_line_passed false). That signal does not
get buy/sell language and does not get a positive weight. It still gets
logged if a source exists. Do not rescue it by switching the metric
after the fact. Do not pretend the failure means the ledger should stay
empty.

## Wiring rule, from here

1. If a source is cleared and the number can be computed as-of, it goes
   in the signal ledger. Weight starts low. Confidence and freshness
   are on the row. Absence is null, never fake agreement.
2. Weights move only by a pre-registered test against settled outcomes,
   not against the closing line. The market may be a covariate. It is
   not the kill.
3. A weight of zero is an honest state. An unwired source is not.
4. Do not publish a weight as a win probability. Confidence on the book
   path is already a backwards score. Recalibrate that composite. The
   founder authorized going back to get proper numbers. A MODEL_VERSION
   bump still needs a frozen scorecard. The wiring does not wait for
   the bump.
5. Do not flip a gate, a price, or an env flag to make this true.
6. Phantom consensus: five signals from one upstream table are one
   family, not five confirmations.

## First wiring tranche, already built, not connected

Connect these into the ledger at low weight. Do not reimplement them.
Do not promote them onto the published probability in the same commit.

- `signal-ledger.ts` / `compositeScore` — the spine. Nothing calls it.
- Opponent-adjusted EPA, occurrence-based turnovers, poisson, dixon-coles
- Props hierarchical Bayes (the only NFL holdout that passed). Still
  no product. Wire the score. Do not flip EVENT_ODDS_INGEST.
- Hawkes, robust-kelly, e-process: already on the shadow cron. Copy the
  reading into the ledger. Leave mint alone until the weight is fit.
- Mondrian and CQR: interval width is a signal (abstain), not a new
  probability. CQR fail-closed diff on hermes/last-plan is uncommitted.
  Land it. It still has no production importer.
- Factor rows A6, A7, A14, A19, A22, A23, A25 are CANDIDATE. They enter
  the ledger. DEAD rows stay in the index and enter at weight zero if
  the source still computes. Do not drop them from the catalog.
- Salvage branch `mimo/salvage-tiera-2026-09-21` at `b8dfe5d06`:
  research modules, not on mint. Ledger rows, not a merge onto publish.

## What "most calibrated" means under this doctrine

Not "we beat the close." The close is one input.

Most calibrated means: more signals than anyone, each with a measured
weight against what actually happened, a backwards score nowhere on the
card, and a composite that is a probability only after that fit. That
is reachable by wiring the machine that was specified and left stubbed.
It is not reachable by another unread paper.
