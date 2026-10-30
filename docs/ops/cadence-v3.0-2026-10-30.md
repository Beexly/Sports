# Cadence v3.0, Friday 16:30 CT, 2026-10-30: final pre-kickoff overlay and sealed ticket minting

Slot: SUN_EARLY, Week 8, 2026 season. Branch `ledger/consolidated-2026-10-30`.
Run at 16:39 to 17:05 CT. Every number below comes from the run output in this session.

Runner: `scripts/ops/run_cadence_v30_sunday_overlay.py` (new, reusable per slot).
Report: `docs/predictions/research/2026-10-30/cadence_v30_overlay_sun_early_w8.json`.
Tests: `scripts/ops/tests/test_run_cadence_v30_sunday_overlay.py`, 9 pass.

## 1. Seal unchanged, nothing re-estimated

| Check | Result |
|---|---|
| `sealed_center_merkle_matches_recorded` | true (`23245bcbba04f147…`, week 2026-W44) |
| `candidate_parent_seal_hash_matches_center` | true |
| `candidate_tau_rating_recorded` | true (4.6607) |
| `coach_mind_tau_is_0_42` | true |
| `epa_dropoff_table_unmodified` | true (`9b8c701c162efa85…`) |
| `qb_questionable_ev_dropoff_is_0_0947` | true |

`unchanged: true`. tau, cost matrix, team ratings and the EPA dropoff table were read
verbatim from the sealed baseline; no re-estimation, no re-simulation, no reseal. The
tickets are minted against the sealed writeup build `2026-10-29T23:30:08Z`
(sha256 `72f32b55a8fe39c2…`).

## 2. Injury overlay inputs

The nflverse injuries feed was refreshed from
`https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2026.csv`
(HTTP 200, 274,770 bytes, sha256 `d7b7021b17ef7043…`, 2,417 rows; written to both
`data/nflverse/` and `data/gse-dataset/current/`, previous copy kept as
`injuries_2026.csv.bak-pre-v30-20261030`).

**It carried zero game designations for the Sunday slate.** All 163 Week-8 rows for the
16 Sunday teams have a blank `report_status`; practice status (DNP / LP / FP) is populated
but is not a game designation and was not promoted. Every designation used in this report
therefore comes from the ESPN public summary endpoint (`site.api.espn.com`, per-event
`injuries` block, HTTP 200 on all 8 requests), which is live with Friday game statuses.

50 designations applied across 16 teams, 19 of them carrying role keys the sealed table
cannot price (7 `LT`, 5 `CB1`, 7 `EDGE1`). Roster statuses (Injured Reserve, Suspension)
are recorded per game and deliberately **not** applied: roster availability is a
Tuesday-baseline input, not a game-day designation.

## 3. Per-game overlay and sealed calls

| Game | Sealed side | Conf | CLV | Sealed total | Conf | CLV | Overlay Δ (side / total) | Weather |
|---|---|---|---|---|---|---|---|---|
| Ravens @ Bills | Bills -3 (PASS) | 54 | -0.015 | OVER 54.5 (**PLAY**) | 60 | +0.076 | -0.097 / -0.097 | clear, 63.6 F, 5.1 mph |
| Titans @ Bengals | Titans +11.5 (PASS) | 52 | -0.035 | UNDER 46.5 (PASS) | 52 | -0.035 | +0.059 / -0.059 | clear, 65.3 F, 6.5 mph |
| Cardinals @ Cowboys | Cowboys -7 (PASS) | 53 | -0.025 | OVER 54.5 (PASS) | 53 | -0.025 | 0.000 / 0.000 | indoor (AT&T) |
| Vikings @ Lions | Lions -3 (**PLAY**) | 59 | +0.066 | OVER 46.5 (PASS) | 53 | -0.025 | 0.000 / 0.000 | indoor (Ford Field) |
| Raiders @ Jets | Raiders +1.5 (PASS) | 51 | -0.045 | UNDER 45.5 (PASS) | 51 | -0.045 | -0.007 / -0.007 | clear, 59.4 F, 4.0 mph |
| Browns @ Steelers | Steelers -3.5 (PASS) | 55 | -0.005 | UNDER 39.5 (**PLAY**) | 57 | +0.046 | -0.007 / +0.007 | clear, 64.4 F, 5.4 mph |
| Falcons @ Buccaneers | Buccaneers -2.5 (PASS) | 53 | -0.025 | UNDER 44.5 (PASS) | 52 | -0.035 | 0.000 / 0.000 | **PRECIP** 45%, 79.4 F, 11.9 mph |
| Colts @ Jaguars | Colts +10 (PASS) | 52 | -0.035 | UNDER 46.5 (PASS) | 51 | -0.045 | 0.000 / 0.000 | clear, 76.5 F, 12.2 mph |

Weather values are the Open-Meteo hourly bucket at the kickoff hour (18:00Z), fetched
live for the six outdoor venues; the two roofed venues are reported as indoor with no
weather effect. Flags only, no points coefficient (see findings).

Points delta derivation, both terms from sealed values:
`execution_points = (Σ feasible_i × sealed multiplier_i − 1) × sealed off_epa × round(1800 / sealed pace_sec)`
plus `epa_table_points = Σ sealed epaDropoffTable[QB key] × plays`, with an even
1,800-second possession split per team.

## 4. Sealed ticket mint

42 tickets minted from the sealed calls, ticket-set merkle `14bb3f96732444f2…`:

| mint_status | count |
|---|---|
| `PLAY` | 12 |
| `WITHHELD_PASS` | 30 |

Playable rows: 1 side, 2 totals, 9 props.

| Kind | Selection | Conf | CLV |
|---|---|---|---|
| total | Ravens @ Bills OVER 54.5 | 60/100 | +0.0762 |
| total | Browns @ Steelers UNDER 39.5 | 57/100 | +0.0462 |
| side | Vikings @ Lions, Detroit Lions -3 | 59/100 | +0.0662 |
| prop | Zay Flowers OVER 82.5 rec yds | 60/100 | +0.0762 |
| prop | Josh Allen OVER 252.5 pass yds | 59/100 | +0.0662 |
| prop | Dalton Kincaid OVER 46.5 rec yds | 58/100 | +0.0562 |
| prop | Amon-Ra St. Brown OVER 77.5 rec yds | 61/100 | +0.0862 |
| prop | Jahmyr Gibbs OVER 86.5 rush yds | 60/100 | +0.0762 |
| prop | Jahmyr Gibbs OVER 33.5 rec yds | 59/100 | +0.0662 |
| prop | Jaylen Warren OVER 65.5 rush yds | 59/100 | +0.0662 |
| prop | DK Metcalf UNDER 56.5 rec yds | 58/100 | +0.0562 |
| prop | Quinshon Judkins UNDER 48.5 rush yds | 58/100 | +0.0562 |

Every `WITHHELD_PASS` row carries a negative sealed `expectedClv` and a sealed decision of
`PASS`; the mint does not resurrect them, per the adverse-edge-suppression rule. No ticket
was re-priced (`repriced: false` on all 42).

**Nothing here is a publication.** These are internal sealed artifacts; the Class B
conjunction gate (stage 5) was not run in this phase.

## 5. Findings, flagged not fixed

1. **The sealed EPA dropoff table cannot price the designations that actually exist.**
   Table keys are `{QB1, QB_QUESTIONABLE, OL, SKILL, DEF}`; the mapping emits
   `{WR1, WR2, WR3, TE1, RB1, QB1, QB_QUESTIONABLE, LT, CB1, EDGE1}`. Only the QB keys
   intersect, and no quarterback is designated in this slot, so all 19 OL/CB/EDGE
   designations carried zero engine weight. This reconfirms the v2.5 finding on 8 games.
   Fixing it is a mapping change (model behavior) and was not made on a game day.
2. **The injury overlay is effectively inert on this card.** Sinkhorn reallocates rather
   than deletes target-share mass, and the sealed execution multipliers act on the small
   residual, so the largest |Δ| across all 16 calls is 0.097 points. Tickets were minted on
   the sealed numbers unchanged. If the intent is that a scratched WR1 moves a total by
   roughly a point, the sealed multipliers are too small and that is a reseal decision, not
   a cadence decision.
3. **Three of eight games carry an actionable sealed call; five are all-PASS.** The gate is
   doing its job (negative `expectedClv` rows are `PASS` in the sealed build), but a
   3-game card from an 8-game window is the real shape of the slate.
4. **The TNF schedule-label regression from v2.5 is still live.** ESPN `dates=20261101`
   returns 12 events and `401873023` (CAR @ GB) is not among them; the writeup for that
   game still reads `Sunday 1:00 PM ET · Week 9 Spotlight` with `kickoff 2026-11-01T18:00Z`.
   Owner commit `b398a2d1e` produced that label; it is untouched here.
5. **Weather flag threshold is docile by construction.** Only Tampa clears a flag (PRECIP
   45%); Jacksonville sits at 39% against a 40% threshold. That is the rule working, but
   it means a 39%-precip game reads identical to a clear one.

## 6. Files written

- `scripts/ops/run_cadence_v30_sunday_overlay.py` (new)
- `scripts/ops/tests/test_run_cadence_v30_sunday_overlay.py` (new, 9 tests, all pass)
- `docs/predictions/research/2026-10-30/cadence_v30_overlay_sun_early_w8.json`
- `data/nflverse/injuries_2026.csv`, `data/gse-dataset/current/injuries_2026.csv` (refreshed)
- `data/nflverse/injuries_2026.csv.bak-pre-v30-20261030` (backup)
- this document

Not written: no writeup regeneration, no reseal, no public surface, no ledger change.
