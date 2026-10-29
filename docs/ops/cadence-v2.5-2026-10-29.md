# Cadence v2.5, Thursday 16:30 CT, 2026-10-29: injury overlay advanced, Sinkhorn weights reallocated, seal unchanged

Slot: TNF, Week 8, 2026 season. Branch `engine/public-baseline-2026-10-24`.
Run at 16:33 to 16:40 CT. All command output below was observed in this session.

## 1. Injury overlay advanced

| | Before (HEAD copy) | After (nflverse release) |
|---|---|---|
| Path | `data/nflverse/injuries_2026.csv` | same, plus `data/gse-dataset/current/injuries_2026.csv` |
| SHA-256 | `2ccefb12af2e4c14...` | `b9a96a8bd0ad600cb9a4470e3bd301bc13adbf998ef145b345f3e7a921da7517` |
| Size | 246,382 bytes | 271,605 bytes |
| Rows | 2,155 | 2,388 |
| Week 8 rows | 16 (all with blank `report_status`) | 249 |
| Week 8 TNF designations | 0 | 8 |

Source: `https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2026.csv`, HTTP 200, downloaded 2026-10-29 16:36 CT.
Backups written next to both copies as `injuries_2026.csv.bak-pre-v25-20261029`.

Week 8 designations that map to a sealed role key. Practice status alone was not promoted.

| Team | Player | Pos | Report | Role key |
|---|---|---|---|---|
| CAR | Damien Lewis | G | Out | LT |
| CAR | Jaelan Phillips | LB | Out | EDGE1 |
| CAR | Akayleb Evans | CB | Out | CB1 |
| GB | Zaire Franklin | LB | Out | EDGE1 |
| GB | Sean Rhyan | C | Out | LT |
| GB | Matthew Golden | WR | Questionable | WR1 |

Also designated but carrying no role key: CAR Torricelli Simpkins III (G, Out, second lineman), GB Travis Glover (G, Out, second lineman), GB Devonte Wyatt (DT, Questionable), GB Brenton Cox Jr. (LB, Questionable, second LB), GB Anthony Campbell (DT, Questionable), CAR Bobby Brown III (DT, Questionable).

Loader parity: `gse_coach_mind_simulator.load_week8_injuries_from_csv` returns exactly the same role sets, asserted `True` in the report JSON.

## 2. Sinkhorn reallocation under the sealed cost matrix

Sealed inputs, unchanged: cost matrix C `[[0.05,0.35,0.55,0.75,0.90],[0.35,0.05,0.28,0.50,0.75],[0.55,0.28,0.05,0.42,0.65],[0.75,0.50,0.42,0.05,0.48],[0.90,0.75,0.65,0.48,0.05]]`, epsilon 0.05, base shares WR1 0.26 / WR2 0.21 / WR3 0.17 / TE1 0.20 / RB1 0.16.

| Team | Scratched roles | Feasible shares after Sinkhorn | Mass moved | Execution mass |
|---|---|---|---|---|
| CAR | LT, EDGE1, CB1 | unchanged (0.26 / 0.21 / 0.17 / 0.20 / 0.16) | 0.0000 | 1.0000 |
| GB | EDGE1, LT, WR1 | WR1 0.0133, WR2 0.2800, WR3 0.2267, TE1 0.2667, RB1 0.2133 | 0.2467 | 0.9976 |

GB WR1 execution multiplier 0.82 applied to the 0.0133 residual, so WR1 effective mass is 0.0109 and GB total execution mass is 0.9976, a delta of -0.0024 from the pre-refresh 1.0000. At the sealed GB offensive EPA of 0.068 per play that is -0.000163 EPA per play, about -0.01 points over 64 plays. The re-run slate is therefore numerically identical to the 14:47 CT build apart from `generatedAt` (`document hash c55e80e27b62d5c6` before and after, `generatedAt` excluded).

Independent cross-check, pure-Python Sinkhorn from `gse_injury_overlay_v2.py` on the same marginals and the same sealed C:

| Team | Iterations | Row residual | Col residual | Converged | Feasible shares |
|---|---|---|---|---|---|
| CAR | 200 | 4.44e-5 | 5.55e-17 | yes | identical to 1e-9 |
| GB | 91 | 1.41e-10 | 5.55e-17 | yes | identical to 1e-9 |

The two implementations agree, so the reallocation is not an artifact of one code path.

## 3. Seal hash unchanged

All six checks true, `unchanged: true`.

- `candidates/sealed-center.json` merkle `23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b`, week 2026-W44, sealed 2026-10-25T04:00:00-05:00, tau 0.42, matches the value recorded in `artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md`.
- `candidates/2026-10-25-week7-candidate.json` `parent_seal_hash` equals that merkle; its rating tau is still 4.6607 over 32 teams.
- Coach-mind canonical digest `a293ee26ed6f1350047b26151aa1f4c890457ed9d44d1eecd50e5fc2ee9e775d`, tau 0.42, `QB_QUESTIONABLE` still 0.0947.
- `gse_injury_overlay_v2.py` EPA table hash `9b8c701c162efa8513b2c900474c0a4351b34be6f024ef7fc424677466f00938` equals its recorded `EPA_DROPOFF_SHA256`.

Nothing was resealed. Provenance caveat carried in the JSON: `candidates/` is quarantined per `artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md` D1, whose own audit says the parent seal hash is sequential hex. `unchanged` asserts byte identity with the active seal center, not independent reproducibility.

## 4. Cadence tick

`python scripts/ops/run_weekly_cadence_tick.py --phase INJURY_WEATHER_OVERLAY --slot TNF --week 8 --season 2026 --sims 10000`

- Report: `docs/predictions/research/2026-10-29/cadence_tick_injury_weather_overlay_tnf_w8.json`, merkle `aa5e06b5d797e2bee52575b23001883bb9ef7e87ff139bd65efe1520fd7a17f2`, 10,000 sims, version v2.5, output set TOTALS_SPREADS / PLAYER_PROPS / CORRELATED_SGP.
- Game: `401873023` Carolina Panthers at Green Bay Packers, window slot TNF.
- Internal edge gate: 1 of 1 game cleared at +8.62 percent (`force_gate_pass` default), side GB -3.5 at 61/100, total UNDER 47.5 at 58/100.
- Writeups regenerated: `data/packages/live-slate-writeups.json` and `data/writeups/latest_slate_writeups.json`, `generatedAt 2026-10-29T21:39:49Z`.
- No public surface was posted to. The ticket object in the tick report is an internal artifact, not a publication.

## 5. Findings, flagged not fixed

1. **Schedule label regression on the TNF game.** Commit `b398a2d1e` (2026-10-29 14:56 CT, "fix CAR@GB Sunday schedule") changed the CAR @ GB entry from `kickoff 2026-10-30T00:15Z`, `10/29 - 8:15 PM EDT` to `kickoff 2026-11-01T18:00Z`, `Sunday 1:00 PM ET · Week 9 Spotlight`. That is wrong on day, date, time and week. Verified independently: ESPN scoreboard `dates=20261029` returns exactly one event, `401873023`, `2026-10-30T00:15Z`, scheduled; `dates=20261101` returns 12 games and does not include `401873023`; nflverse `games.csv` has CAR @ GB as week 8, gameday 2026-10-29, Thursday, 20:15, the only Thursday game that week. The generator also hardcodes the same label at `generate_slate_writeups.py:862` (`formatWindowSlotLabel` TNF branch) and `:1071` (packet header). Left as-is because it is an owner commit on a live surface; this note is the flag.
2. **Role-key gap: OL and defensive designations carry zero engine weight.** The loader emits `LT`, `CB1`, `EDGE1`, but the sealed `epaDropoffTable` keys are `QB1`, `QB_QUESTIONABLE`, `OL`, `SKILL`, `DEF`, and `execution_multipliers` keys are `QB1`, `RB1`, `WR1`, `WR2`, `TE1`. `LT` never matches `OL`. CAR's two Out starting linemen and its Out edge rusher therefore produced `mass_moved 0.0000` and `epa_drop_sum 0.0`, and the writeup rationale claims they matter. Only GB's WR1 designation had any numeric effect. Changing this mapping is a model-behavior change, so it was not touched at 16:30 on a game day.
3. **Sealed Sinkhorn floor.** A scratched skill role is set to 0.01 before normalization, so GB WR1 keeps 1.33 percent feasible share, not zero. That is sealed semantics, recorded rather than reinterpreted.
4. **Tick gate naming.** `force_gate_pass` defaults to true and the tick labels anything over a 1.2 percent edge a published ticket, with no stage-3 to stage-5 conjunction re-run. Internal artifact only, but the word "published" in that file will read as a publication to a future reviewer.

## 6. Files written

- `scripts/ops/run_cadence_v25_injury_overlay.py` (new, reusable weekly runner)
- `scripts/ops/tests/test_run_cadence_v25_injury_overlay.py` (new, 5 tests, all pass)
- `docs/predictions/research/2026-10-29/cadence_v25_injury_overlay_tnf_w8.json`
- `docs/predictions/research/2026-10-29/cadence_tick_injury_weather_overlay_tnf_w8.json`
- `data/nflverse/injuries_2026.csv` and `data/gse-dataset/current/injuries_2026.csv` (refreshed, backups kept)
- `data/packages/live-slate-writeups.json` and `data/writeups/latest_slate_writeups.json` (regenerated)
- `docs/predictions/research/2026-10-29/GAME-DAY-CONTENT-PACKET-2026-10-29.md` (regenerated)