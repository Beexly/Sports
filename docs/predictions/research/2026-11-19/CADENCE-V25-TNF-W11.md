# Cadence v2.5 — TNF W11 (IND @ HOU), 2026-11-19 16:30 CT

Run: `scripts/ops/run_cadence_v25_injury_overlay.py --slot TNF --week 11 --season 2026 --away IND --home HOU --prior-injuries data/nflverse/injuries_2026.csv.bak-pre-v25-20261119 --output-dir docs/predictions/research/2026-11-19`

ESPN event `401873066`, kickoff 2026-11-20T01:15Z (Thu 7:15 PM CT), STATUS_SCHEDULED at run time.

## 1. Injury overlay advanced

`data/nflverse/injuries_2026.csv` moved from the Wednesday W11 snapshot (3,194 rows,
26 week-11 rows, HOU/IND only, all `report_status` empty) to the live nflverse release
(3,421 rows, 253 week-11 rows across 24 teams). Prior file kept as
`injuries_2026.csv.bak-pre-v25-20261119` (sha256 `a334fa75f31fbc20…`).
Final merged file sha256 `c208b42f490cd782…`.

Unlike W10, the live nflverse release already carried Thursday `report_status`
designations for both TNF teams (9 Out, 6 Questionable). The ESPN game-summary
designations were still pulled and merged worst-of (Out > Doubtful > Questionable >
none) via the generalized `scripts/ops/merge_tnf_designations.py`: **0 rows changed** —
the two sources agree on every matched player. One name alias was applied explicitly:
ESPN "Jake Hummel" = nflverse "Jacob Hummel" (both Questionable). Provenance:
`tnf_w11_designation_merge.json`.

Raw designations consumed (report_status only; practice status never promoted):

| Team | Player | Pos | Designation | Mapped sealed role |
|---|---|---|---|---|
| IND | Bernhard Raimann | T | Out | LT |
| IND | Charvarius Ward | CB | Out | CB1 |
| IND | Will Mallory | TE | Out | TE1 |
| IND | Anthony Gould | WR | Questionable | WR1 |
| IND | Sauce Gardner | CB | Questionable | — (2nd CB) |
| IND | Jalen Travis | T | Out | — (2nd T) |
| IND | Jerry Tillery | DT | Out | — (DT unmapped) |
| IND | Luke Rhodes | LS | Questionable | — (LS unmapped) |
| HOU | Danielle Hunter | DE | Out | EDGE1 |
| HOU | Marvin Harrison Jr. | WR | Out | WR1 |
| HOU | Brevin Jordan | TE | Out | TE1 |
| HOU | Woody Marks | RB | Out | RB1 |
| HOU | Wyatt Teller | G | Questionable | LT |
| HOU | Jaylin Smith | CB | Questionable | CB1 |
| HOU | Jacob Hummel | LB | Questionable | — (2nd LB/EDGE) |

Role mapping is the sealed simulator mapping (first designated player per position
family); it is identical to what `gse_coach_mind_simulator` consumes, so the writeup
engine and this report cannot diverge.

## 2. Sinkhorn execution weights reallocated

Sealed cost matrix C and execution multipliers used as-is. No re-estimation, no reseal.

| Team | Injured roles | Mass moved | Effective mass (prior → now) |
|---|---|---|---|
| IND | CB1, LT, TE1, WR1 | 0.4243 | 1.0000 → 0.9939 |
| HOU | EDGE1, LT, TE1, WR1, CB1, RB1 | 0.5468 | 1.0000 → 0.9880 |

Total mass moved 0.9711. Independent pure-Python Sinkhorn cross-check converged on both
teams (IND 131 iters, row residual 1.0e-10; HOU 87 iters, row residual 8.0e-12).
Feasible shares concentrate on the healthy replacements: IND WR2 0.3750 / WR3 0.3036 /
RB1 0.2857; HOU WR2 0.5122 / WR3 0.4146 with WR1/TE1/RB1 pinned near the 0.0244 floor.

## 3. Seal hash unchanged

All six checks true: sealed-center merkle `23245bcbba04f147…` matches the recorded
2026-W44 value, candidate `parent_seal_hash` matches the center, candidate tau 4.6607,
coach-mind tau 0.42, EPA dropoff table sha256 `9b8c701c162efa85…` unmodified,
QB_QUESTIONABLE dropoff 0.0947. `candidates/sealed-center.json` sha256
`7b764dbc4b351616…` — byte-identical to the W10 run. Coach-mind canonical digest
`354b4c132e200657…` — byte-identical to the W10 run. No sealed artifact touched.

Caveat carried from the script: `candidates/` is quarantined per
`artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md` D1. "Unchanged" asserts byte-identity with
the active seal center, not independent reproducibility.

## Tests

`pytest scripts/ops/tests/test_gse_injury_overlay_v2.py scripts/ops/tests/test_run_cadence_v25_injury_overlay.py` → 24 passed.

## Flags

- WARN: `data/gse-dataset/current/injuries_2026.csv` remains the Oct-29 snapshot
  (271,605 bytes); the v2.5 runner reads `data/nflverse/injuries_2026.csv` only, and the
  W10 precedent left the mirror untouched. Flagged, not changed.
- No odds, spreads, totals, or public tickets produced. Internal overlay artifact only.
