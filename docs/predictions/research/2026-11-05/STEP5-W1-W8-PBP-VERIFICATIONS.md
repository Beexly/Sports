# Step 5 — W1–8 PBP Verifications & Watchlist Status

**Generated:** 2026-11-05 13:20 CST
**Data:** nflverse 2026 pbp Weeks 1–8 | **JSON:** `data/engine/step5_w1_w8_reproductions_2026_11_05.json`

## W1 — `@The_Coach_A` Coverage Execution Index (CEI) arbitration

Public data reproduces 2 of the 5 CEI pillars: YAC per completion allowed (b) and deep 20+ completion rate allowed (d), plus completion rate allowed. Composite = sum of the three pillar ranks, lower is better.

| Team | Composite rank | Completion % allowed | YAC/comp allowed | Deep 20+ comp % allowed |
|---|---|---|---|---|
| SEA | 1 | 59.25 | 4.573 | 25.93 |
| CAR | 3 | 59.92 | 3.742 | 28.00 |
| DEN | 3 | 55.59 | 5.335 | 24.14 |
| DET | 13 | 61.17 | 3.767 | 40.00 |
| LA | 13 | 57.62 | 5.981 | 27.27 |
| HOU | 17 | 61.28 | 4.779 | 41.38 |
| SF | 17 | 64.09 | 5.078 | 30.43 |

**Ruling:** the published ordering (SF/SEA/LAR/HOU/DEN ahead of CAR/DET) is **not supported** by the two pillars public data can compute. CAR is 3rd, DET 13th, while SF and HOU sit 17th. The CEI's other three pillars (rush-independent coverage, shell discipline, personnel) are not in nflverse pbp, so this is a proxy contradiction, not a refutation of the proprietary metric. Any leg leaning on the CEI ordering is PASS.

## W7 — 3rd-down target trust (min 12 targets)

| Receiver | Targets | Receptions | 1st downs | Conv rate |
|---|---|---|---|---|
| J. Smith-Njigba | 30 | 20 | 16 | 0.533 |
| C. Lamb | 25 | 17 | 14 | 0.560 |
| B. Bowers | 23 | 14 | 14 | 0.609 |
| D. London | 23 | 16 | 12 | 0.522 |
| M. Evans | 20 | 13 | 12 | 0.600 |
| C. Olave | 19 | 12 | 12 | 0.632 |
| J. Downs | 16 | 14 | 11 | 0.688 |
| G. Pickens | 23 | 14 | 10 | 0.435 |

Reproduced directly from `down == 3` pass attempts.

## W8 — QB fantasy check (Tyler Shough)

Actual fantasy points (4-pt pass TD, 6-pt rush TD, 0.04 pass yd, 0.1 rush yd, −2 INT):

| Metric | Value |
|---|---|
| Dropbacks | 287 |
| FP total | 108.84 |
| FP per game (7 team games) | **15.55** |
| FP per dropback | 0.379 |
| Rank by FP/dropback (QBs ≥100 dropbacks) | **19th** |

**Ruling:** the `@boxscorescout` xFP model is unpublished; this is actual FP, not xFP. On actual scoring Shough is a QB2/3 by volume, not a top-3 xFP performer. Any "QB3" thesis is unverified.

## B2 — Worst pass defenses per game

| Team | Pass yds allowed/game | YPA allowed |
|---|---|---|
| DET | 298.7 | 6.767 |
| TEN | 272.8 | 7.498 |
| BUF | 269.0 | 6.654 |
| JAX | 264.3 | 7.198 |
| HOU | 262.7 | 6.914 |
| CIN | 261.0 | 7.000 |

## B8 — Chicago carry split by position group

| Position group | Carries | Yards |
|---|---|---|
| RB | 203 | 869 |
| LB | 29 | 103 |
| QB | 28 | 148 |
| UNK | 8 | 29 |
| WR | 2 | 37 |
| S | 1 | 11 |

Players: D. Swift 143/545, K. Monangai 60/324, R. Johnson 29/103 (ESPN lists LB), C. Williams 21/115. Position mapping uses the current ESPN CHI roster; the LB/S labels are roster positions, not offensive usage.

## Unavailable

- **F8 playoff luck residue since 2018:** local pbp covers 2024–2026 only; 2018–2023 playoff games are not on disk.
- **F9 referee crew penalty tendencies 2022–2025:** no referee/crew field in the local pbp files.

## X watchlist browser pass — COMPLETE

Chrome was launched on a dedicated automation profile with `--remote-debugging-port=9222 --remote-allow-origins=*`, and CDP answered (Chrome 156.0.8078.80). `x.com/PattonAnalytics` rendered only the profile header (7,314 posts, 11.4k followers); the timeline was replaced by the logged-out "Log in or sign up" wall. No X session exists for this agent, so no timeline text is available.

After Garrett logged the automation profile into X, all seven timelines were captured (5-6 posts each, 35 total) with timestamps and saved to `data/research/x_watchlist_pass_2026_11_05.json`. Digest: `docs/predictions/research/2026-11-05/X-WATCHLIST-CATCHUP-2026-11-05.md`.

Notable TNF items: SumerSports' Brissett/Flowers MOF post (34.8% / 76.8%; Flowers 29-22-339), nfl_simulator's Week 8 luck table (DEN +2.5, MIN +2.3, CHI +1.8; NYJ -3.0), run_the_sims' Steelers +984 luck points since 2018, and Timo_NFL's Week 9 playoff leverage.
