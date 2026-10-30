# Signal 7 — Paired-flip playoff leverage (@Timo_NFL construction)

Method: dossier D1, OVERNIGHT-CORPUS report. Season sims whose team
ratings update inside the simulation (Elo-style, K = 1.75 points,
logistic scale 5.5) contaminate outcome-filtered leverage: filtering
on "team won" also selects the sims where the team's rating path
drifted up. Timo measured the inflation at 1.3-1.6x per team on his
real Week 7 setup. This is a synthetic replication of the mechanism —
an 8-team league, 6 remaining rounds, top 4 make the playoffs, 8,000
sims per configuration — not a re-measurement of his chart (his sim
inputs are not public).

**Result — the mechanism reproduces, inside his band.**

Contender spot (6-win team vs a 6-win rival, week 1 of the remainder):
- naive outcome filter on dynamic sims: 0.437
- paired-flip (flip only the game in the standings): 0.321
- frozen-rating filter (control): 0.383
- **inflation ratio: 1.36x** — inside Timo's 1.3-1.6x band.

Longshot spot (3-win team vs the 8-win leader — Timo's "game that
barely matters" case):
- naive filter: 0.026 vs paired-flip 0.015
  (naive 1.7x the paired figure) — the filter
  manufactures leverage for a near-dead team; the paired construction
  keeps it near zero.

The paired and frozen constructions bracket the single-game effect
(paired is the conservative read); the naive filter sits above both.
Rule adopted for any GSE leverage surface: paired-flip or frozen
ratings, never an outcome filter on a dynamic-rating sim.

Table: `07_paired_flip_leverage.csv`.
