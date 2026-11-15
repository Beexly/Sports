# Cadence v2.5 — TNF W10 (WAS @ NYG), 2026-11-12 16:30 CT

Run: `scripts/ops/run_cadence_v25_injury_overlay.py --slot TNF --week 10 --away WAS --home NYG`

## 1. Injury overlay advanced

`data/nflverse/injuries_2026.csv` moved from the week-9 snapshot (2,725 rows, 266 week-9)
to the live nflverse release (3,097 rows, 276 week-10). Prior file kept as
`injuries_2026.csv.bak-pre-v25-20261112`.

nflverse's week-10 file is a Wednesday practice snapshot — `report_status` is empty for
almost everyone. The official Thursday designations were pulled from the ESPN game-summary
endpoint for event `401873052` and merged worst-of (Out > Doubtful > Questionable > none),
so a source conflict can only make a player look less available. Provenance:
`tnf_w10_designation_merge.json`.

| Team | Player | nflverse | ESPN | Applied |
|---|---|---|---|---|
| NYG | J.J. McCarthy (QB) | — | Questionable | Questionable |
| NYG | Cam Skattebo (RB) | — | Out | Out |
| NYG | Colton Hood (CB) | — | Out | Out |
| NYG | Malik Harrison (LB) | Questionable | Questionable | Questionable |
| WAS | Lucas Patrick (C) | Out | Questionable | Out |
| WAS | Treylon Burks (WR) | — | Out | Out |
| WAS | Colson Yankoff (TE) | Out | Out | Out |

IR (Tyrone Tracy Jr., Dyami Brown, Daron Payne) is not written as a report_status
designation; the overlay consumes Out/Doubtful/Questionable only.

## 2. Sinkhorn execution weights reallocated

Sealed cost matrix C and execution multipliers used as-is. No re-estimation, no reseal.

| Team | Injured roles | Mass moved | Effective mass (prior → now) |
|---|---|---|---|
| WAS | LT, WR1, TE1 | 0.4243 | 1.0000 → 0.9939 |
| NYG | EDGE1, QB_QUESTIONABLE, RB1, CB1 | 0.1482 | 1.0000 → 0.9982 |

Total mass moved 0.5725. Independent pure-Python Sinkhorn cross-check converged on both
teams (WAS 131 iters, row residual 1.0e-10; NYG 143 iters, row residual 1.3e-11).

## 3. Seal hash unchanged

All six checks true: sealed-center merkle `23245bcbba04f147…` matches the recorded
2026-W44 value, candidate `parent_seal_hash` matches the center, candidate tau 4.6607,
coach-mind tau 0.42, EPA dropoff table sha256 unmodified, QB_QUESTIONABLE dropoff 0.0947.
`candidates/sealed-center.json` sha256 `7b764dbc4b351616…` — no sealed artifact touched.

Caveat carried from the script: `candidates/` is quarantined per
`artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md` D1. "Unchanged" asserts byte-identity with
the active seal center, not independent reproducibility.

## Tests

`pytest scripts/ops/tests/test_gse_injury_overlay_v2.py scripts/ops/tests/test_run_cadence_v25_injury_overlay.py` → 24 passed.
