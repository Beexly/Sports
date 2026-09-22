# True solutions — nothing in the census is a dead end

Founder order, 2026-09-21. Written by the session that had called 18 factors
dead and 3 blocked. That wording is withdrawn. A failed market test is a
wrong job for a living observable. The solution is the job, then the wire.

Source of the numbers: `docs/factors/INDEX.md`, runs dated 2026-09-15.
Source of the modules: `mimo/salvage-tiera-2026-09-21` `signals/` and
`packages/prediction-engine/src/`. No new facts invented. Where a number
is null, the row still enters. The coefficient starts at the measured
value, including zero. The earned-weight loop moves it. A human does not
delete it.

The spine these all plug into is `signal-ledger.ts` → `compositeScore`.
It has no production caller. That is the first wire. Everything below is
a row in that ledger.

## The 18 marked DEAD

A1. Birthday and former-team. Measured effect -0.13 targets, CI includes
0, n=550. The "more targets" claim is not supported. The observable is.
Birth date is on nflverse rosters. Former team is on roster history.
Solution: ingest `days_from_birthday` and `former_team_flag` on every
player-week. Starting weight equals the measured slope, which is
indistinguishable from zero, so it prints as zero. The job is not "more
targets." The job is a narrative feature the public overweights, so the
residual versus our usage model is what the weight trains on. Module
already written: `signals/narrative/contract-incentives-milestones.ts`
covers the milestone half. Birthday is a date diff, not a new scraper.

A3 and A27. Referee crews. A3 n=90, A27 n=92, both CIs include 0. Named
crew leans are underpowered by construction. 32 crews will never have a
stable cover rate in one season. Solution: do not publish "Vinovich
under." Ingest `official_id` as a partial-pool random effect and
`crew_penalty_yards_per_game` from play-by-play, which we already have.
Crews with thin n shrink to the league mean. The signal is in the engine
the week the crew is assigned. Module already written:
`signals/situational/referee-crew-tendencies.ts`.

A4. Eastward travel. Effect -3.3 covers, CI includes 0, n=149. The binary
"covers less" test was too small. Solution: ingest continuous
`time_zones_crossed` and `kickoff_hour_local` on every team-week, pooled
with days of rest. Not a cover-rate claim. A feature in the rest vector.
Module already written: `signals/situational/circadian-travel-fatigue.ts`
and `short-week-road-deficit.ts`.

A5. Wind and team totals. Effect +6.7 on the over, wrong sign, CI includes
0, n=113. The team-total version of wind is the dead job. The living job
is already A25: wind suppresses player passing and receiving yards,
effect -4.2, CI excludes 0, n=7,196. Lab also graduated wind 15–19 mph
on completion rate. Solution: route wind into the prop and completion
path. Keep team-total wind as a row whose coefficient stays at the
measured near-zero until a larger panel moves it. Modules already
written: `signals/environment/wind-elasticity.ts`,
`signals/environmental/linear-wind-pass-impact.ts`,
`temperature-precipitation-decay.ts`.

A9. DFA of EPA. Delta Brier 0.0002, CI includes 0, n=1,020. It does not
beat mean EPA as a next-game probability. Solution: it is not a spread
feature. It is the shrinkage-speed input. High persistence means trust
recent form. Low persistence means shrink harder to the prior. Ingest
the exponent. Its coefficient multiplies the prior weight, it does not
add to win probability directly.

A10. Wasserstein play-mix distance. Delta Brier ~0, n=1,020. Same class.
Solution: not a bet. It is the similarity kernel for empirical-Bayes
borrowing. A team borrows strength from opponents with a similar play
mix. Ingest the distance. It chooses neighbors. It does not add a point
spread by itself.

A11. HMM form regimes. Delta Brier ~0, n=1,020. Solution: regimes are
Mondrian bins, not a probability addend. A game in a different form
state gets its own calibration bucket. If the buckets do not separate
coverage, they collapse, and the row remains so the next season can
split them. Do not delete the state label.

A12. Fourth-down Prelec. Effect -0.26, CI [-0.55, 0.04], n=9,171. The
functional form failed. The residual did not. Solution: drop Prelec
alpha. Ingest `go_rate_minus_epa_optimal` per coach from nflverse fourth
downs. That is the aggressiveness feature, worth a prior of well under
two points, fit on outcomes, not assumed. Module already written:
`signals/situational/fourth-down-coaching-aggressiveness.ts` and
`coaching-tendencies.ts`.

A13. Persistent homology. Did not beat either null, n=1,020. The
information this was hunting is already in A6, which passed: permutation
entropy, effect 0.096, CI excludes 0, n=2,686. Solution: wire A6 as the
play-call complexity signal. Keep the homology numbers computed in the
lab as the check that A6 is not missing a hole. Ingest Betti numbers
only as members of A6's family, starting weight zero, so they cannot
be counted as a second confirmation. One family, one vote.

A15. Contract incentives. Effect +0.33, CI [0.05, 0.61], n=3,515. This
was killed because the placebo on non-incentive contracts also moved.
The effect is real. The label "incentive clause" is not specific.
Solution: wire contract year, games remaining, and cap hit from
OverTheCap-style public contract tables we already treat as research
inputs. Do not claim the clause. Claim the expiry window, which is what
the data showed. Module already written:
`signals/narrative/contract-incentives-milestones.ts`.

A16. Bradley-Terry with home, rest, QB change. Delta Brier 0.0000 versus
the market, n=1,610. It adds nothing on top of the price. That was the
wrong question. Solution: it is the team-strength prior before the
market offset, and the strength input for props and fantasy, where
there is no closing spread to hide inside. `standings-strength.ts` and
`elo-from-results.ts` already compute this class. Wire them as the model
side of the composite, market as the fixed offset, not as a second
feature beside a price that already contains them.

A17. QB-receiver games together. Slope -0.06 targets per 10 games, CI
includes 0, n=14,336. At that n the mean does not move. Saying otherwise
would be a lie. Solution: ingest `games_together` anyway. The job is
stability, not more targets. Test whether target-share variance falls
as the pair accumulates snaps, and whether a new coordinator resets it.
Mean coefficient starts at the measured -0.06. Module already written:
`signals/chemistry/qb-receiver-continuity.ts`.

A18. Primetime target share. Effect -0.21, CI includes 0, n=75. The kill
line itself required n>=300. Marking this DEAD violated its own rule.
Solution: reverse the stamp. Status is insufficient sample, not dead.
Ingest kickoff window on every player-week now. Refit when n clears 300.
Module already written:
`signals/situational/primetime-target-concentration.ts`.

A20. Backup QB and WR1 share. Effect -0.57, CI [-1.21, 0.07], n=505.
Direction matches the hypothesis. The interval still touches zero.
Solution: ingest `backup_qb_start` from roster starter changes. Shrink
the coefficient toward zero. Do not hard-zero a -0.57 point estimate.
Module already written:
`signals/efficiency/backup-qb-target-distribution.ts`.

A21. OL starter change. YPC residual -0.02, CI includes 0, n=1,234. The
rushing-yards job is null. The trench job was never the kill. Solution:
ingest `ol_starters_retained` (0 to 5) into the pressure and sack path,
not the YPC path. Module already written:
`signals/trench/offensive-line-continuity.ts`.

A24. Bye times age. Interaction -0.006, CI includes 0, n=1,297. The
interaction is null. Rest is not. Solution: ingest `days_rest` and `age`
as separate rows. The interaction coefficient starts at -0.006. Do not
sell "old players benefit more from byes." Module already written:
`signals/situational/age-conditioned-rest.ts`.

A28. Rookie draft-capital growth. Growth delta 0.008, CI includes 0,
n=115. Growth is null. Level is the standard prior. Solution: ingest
`draft_round` as the shrinkage prior on rookie target share, not as a
growth slope. Day 1 and 2 start higher. The slope stays at the measured
near-zero. Module already written:
`signals/narrative/rookie-breakout-cohort.ts`.

## The 3 marked BLOCKED

A2. Shrinkage toward the market. Not blocked on a missing fact. Blocked
because the validator pointed at `picks-h1.json`, which is 38 rows.
`CALIBRATION_STATUS.md` on the docs branch already measured shrink at
w=0.10 matching the market on 1,270 paired rows. Solution: point the
validator at `docs/ops/stats-lane/incoming/board-export.jsonl` decided
pre-game rows. Run it. The coefficient is the measured w, not a guess.
This is the market row of the composite. It is not a license to delete
the other rows.

A8. Temperature scaling versus isotonic. Blocked on the same 38-row
fixture. On those 20 scored rows it already beat isotonic, CI
[0.002, 0.080]. Solution: fit one temperature on the 1,087 scored
receipts, pre-game only. Isotonic cannot invert the book-path score.
Temperature can pull an overconfident score back without pretending to
flip a ranking. `log-loss-optimize.ts` already implements Newton
temperature scaling and is unwired. That file is the solution. Run it
on the receipts snapshot. If it wins on Brier, it becomes the display
map. If it loses, the coefficient stays at 1 and the row remains.

A26. Man versus zone by receiver alignment. Blocked on the sentence "no
coverage column in the public release." That sentence is stale.
nflverse-ftn `load_ftn_charting()` carries coverage, routes, and motion
from 2022, CC-BY-SA. A14 already passed a Brier test on that feed
(delta -0.0009, CI excludes 0, n=2,134). Solution: build A26 from the
same feed. Do not invent coverage. Do not wait for a column that will
never appear in raw play-by-play. Module already written:
`signals/efficiency/man-zone-receiver-archetype.ts`.

## The 35 modules with no production caller

Each one has a job. None is a new model to invent.

signal-ledger.ts. The spine. Called by nothing. First wire. Shadow path
only until Book B exists. Every row below is a ledger row.

composite-score.ts. Already called by the ledger. Lands when the ledger
lands.

earned-weight-ensemble.ts. The fitter. This is phase 3 of the frontier
program. It reads ledger rows and outcomes. It writes coefficients to
an artifact. It does not write the database.

evidence-readiness-matrix.ts. The admission mill. It already encodes
trust, sample, and age floors, and nothing calls it. It sits in front
of the fitter. A row with no sample does not get a nonzero coefficient.
It still exists in the ledger.

replay-harness.ts. The walk-forward cutter. The fitter calls it. Cuts
are fixture-grouped, not row-index. The charter already named the
row-index bug. Fix the cut, then use it. Do not write a second harness.

signal-snapshot.ts. Called once at pick creation, never updated. This is
how Book B can rescore without leakage. Wire it on the shadow mint so
every new pick stores the ledger vector that was known at the time.

elo-from-results.ts and elo-backtest.ts. The model side of A16. Wire
elo-from-results into the composite prior. elo-backtest is the check,
run in the lab, not on the request path.

standings-strength.ts. Same family as Elo. One family, one vote. Use it
where Elo has no games yet (opening week, new season).

nfl-epa-fair-value.ts and opponent-adjusted.ts. VERIFY the importer.
An earlier scout found them called from `build-independent-fair-values.ts`,
cold-start gated at 4 games. If that import is real, they are ALREADY-IN
and this census mislabeled them. If the import is comments only, wire
them as the EPA row, weight fit on outcomes, not auto-published at
Week 5 with the 0.12 scale that scored worse than a coin flip on the
2025 holdout. The scale fix is part of the wire. Shipping the broken
scale is not "ingesting the signal."

dixon-coles.ts. Same VERIFY. If ingestion already calls it, it is
ALREADY-IN. If not, it is the low-score correlation on top of poisson.ts,
which is the soccer and low-total MLB correction. Wire it beside Poisson.
One family with Poisson, not a second confirmation.

player-archetype.ts, player-rush-scheme.ts, player-projection.ts,
player-rate-posteriors.ts. The fantasy and prop prior. Archetype is
usage, not charted scheme. The file says so. Wire them into the GSE
score path as the player vector. Rate posteriors are how A19, A22, and
A23 stay honest at small samples. They shrink. They do not fabricate.

availability-role-tenure.ts. Injury and practice status, Kaplan-Meier
return spells. This is the sports-medicine row. Wire it to the injury
feed we already ingest. Nutrition does not go here. There is no calorie
column. The return-spell curve is the medicine signal we can compute.

readiness.ts. Platform gates, not a sports signal. It stays an ops
check. It does not enter the composite. That is not a dead end. It is
a different system. Do not force it into a pick.

calibration-commitment.ts, calibration-monitor.ts, calibration-sequence.ts,
calibration-kelly-bridge.ts, isotonic-debug.ts, log-loss-optimize.ts,
online-beta-sliding-window.ts, regression-detector.ts. These are the
honesty machine around the composite. Wire them to the shadow rescore
and to the ops truth surface. Commitment receipts the map. Sequence is
the e-process that catches drift. Monitor is the consecutive-day Brier
check. Kelly bridge sizes only after calibration, fractional, never off
raw confidence. Isotonic-debug explains why PAVA hurt. Temperature
scaling is log-loss-optimize, which is the A8 solution. None of these
change a published pick until Book B is accepted.

clv-capture.ts and clv-decomposition.ts. CLV is a column of the record,
not the lock on the ledger. Wire capture so Book A and Book B both have
a closing number where the archive has one. Decomposition says how much
of CLV was information versus liquidity. It does not gate a signal.

conformal-margin-set.ts. The margin interval. Wire it as a no-bet when
the set is empty or wider than the line. It does not pick a side.
Mondrian bins from A11 feed it.

conviction-tier.ts. A classifier of what we are willing to stand behind.
It runs after the composite. It does not change the probability. Wire
it to read the composite, not raw confidence.

anytime-ledger.ts. The sequential evidence display on the public record.
Wire it to Book B so the page can say whether the composite has evidence
yet, without waiting for a fixed sample size we peek at.

adaptive-delta-analysis.ts. Ops metric on the hedge. Not a sports
signal. Wire it to the shadow orchestrator that already runs the hedge.
It reports regret. It does not add a factor.

linear-thompson.ts. Contextual bandit. Dark on purpose. The job, when
we have more than one live composite, is to allocate attention across
composites. It does not enter a pick probability. Leave it dark until
two composites exist. Name that condition. Do not pretend it is a
factor.

market-anchored-reconciliation.ts. The market-as-fixed-offset math.
This is how A2 and A16 share one price without double counting. Wire it
inside the fitter. One market row.

ml-estimator.ts. GBM scaffold. It does not go live because a file exists.
It becomes a candidate estimator beside Elo, scored by the same fitter,
family-tagged so it cannot confirm itself. If it loses, weight zero,
row remains.

team-index-registry.ts. Identity map for the particle filter. Append-only.
Wire it before any filter state is trusted. It is infrastructure for
the strength prior, not a signal of its own.

## Salvage is the implementation, not a rumor

These files exist on `mimo/salvage-tiera-2026-09-21` and match the rows
above. They have not been scored as a composite. Scoring them is the
frontier program's phase 3, not a new research program.

- situational: referee, circadian travel, short week, fourth down,
  coaching tendencies, primetime, age-conditioned rest, Lopez second-and-10
- environment: wind elasticity, linear wind, temperature and precipitation,
  altitude fatigue
- efficiency: backup QB redistribution, man-zone archetype, WR1-out
  redistribution, red-zone TE leverage, turnover-worthy throw regression
- narrative: contract and milestones, rookie cohort
- chemistry: QB-receiver continuity
- trench: OL continuity
- bio: injury trajectory
- biomechanical: turf fatigue
- props: negative-binomial red-zone TD, red-zone conversion
- tactical: early-down pass rate, red-zone personnel, two-minute
- schematic: bye-week defensive installation
- signals: opponent-adjusted EPA, turnover luck

Turf fatigue, altitude, and Lopez second-and-10 are additional observables
the factor index never gave an id. They enter as new ledger rows, weight
starting at zero until the fitter sees them, family-tagged with the
nearest existing row so they do not cast a second vote.

## What "added into the engine" means, so this cannot be walked back

A row is added when `signal-ledger` returns it on a shadow pick, with a
value computed as-of, a weight, a confidence, a freshness, and a family.
A row is not added by a YAML status, a comment, or a plan. The first
commit that counts is the one that calls the ledger from the shadow path
and stores the vector on the signal snapshot.

Book A does not change in that commit. Book B is the rescore of every
decided pick under the vector. That is the record. The founder decides
whether it becomes the live number. Until then the signals are in the
engine, and the published card is unchanged.
