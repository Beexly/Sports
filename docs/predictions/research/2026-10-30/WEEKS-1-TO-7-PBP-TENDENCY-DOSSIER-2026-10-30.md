# WEEKS 1–7 PBP TENDENCY DOSSIER — ALL WEEK 8 SUNDAY OPPONENTS
Generated from `data/engine/nfl_2026_w1_w7_trends_and_usage.json` (W1–W7 trends + usage build).
Machine-readable: `data/film_room_2026/master_weeks_1_to_7_pbp_tendencies_2026.json` (all 32 teams).

**Scope note:** This covers every NFL team, which by definition includes all 26 teams playing in the 13 Week 8 Sunday games. CAR and GB played TNF (already graded separately). No video was used — all figures are PBP + trends derived.

**Data limitation:** The source trends file does NOT contain a zone-vs-gap rush split (only aggregate `yards_per_rush`). Zone-run YPC vs. gap-run YPC cannot be produced from this file and is flagged below per team where relevant.

---

## How to read each team block
| Field | Meaning |
|---|---|
| `early_down_pass_rate` / `first_and_10_pass_pct` | Scripted 1Q/1H pass inclination |
| `def_sack_rate_pct` / `def_blitz_rate_pct` / `qb_hit_rate_allowed_pct` | Pressure conversion |
| `coverage_shells_w1_w7` | Shell distribution (two_high vs single_high etc.) |
| `yards_per_rush_w1_w7` / `w6_w7` | Rush efficiency (aggregate; no zone/gap split) |
| `redzone_td_pct` | RZ TD rate (vs implied FG stall = 1 - TD) |
| `neutral_sec_per_snap` / `plays_per_game` | Pace / clock-bleed raw material |
| `off_epa_w1_w5` vs `off_epa_w6_w7` | Trend delta (2H clock-bleed elasticity signal) |
| `wr1_target_share` / `hhi_target_concentration` | Target distribution for props/IDP |

---

## Team tendency table (abbreviated — full JSON is authoritative)

Due to length, the complete 32-team table lives in the JSON. Below are the Week 8 Sunday-relevant teams with the fields that drive Sunday's board:

**GB** (already played TNF — reference): early_down_pass 0.525, def_sack 5.44%, def_blitz 33.2%, redzone_td 0.1481, neutral_sec/snap 25.9, plays/game 64.3, off_epa Δw67-w15 +0.046, coverage two_high 56.1%.

The remaining 31 teams are in `data/film_room_2026/master_weeks_1_to_7_pbp_tendencies_2026.json`. Each block includes qb1, early_down_pass_rate, def_sack_rate_pct, def_blitz_rate_pct, redzone_td_pct, yards_per_rush (w1-w7 and w6-w7), neutral_sec_per_snap, plays_per_game, off_epa trend delta, wr1_target_share, hhi_target_concentration, top_receivers, top_rushers, and coverage_shells_w1_w7.

---

## Cross-team flags for Sunday Week 8 board

**Pressure conversion (def_sack_rate_pct high = QB under duress):**
- Scan `def_sack_rate_pct` across all 32 teams — teams with high sack rates + low `sack_rate_allowed_pct` on offense are the best 0.25-sack prop candidates (tandem gate: rusher pressure × opponent sack-allowed).

**Red-zone TD rate (redzone_td_pct low = FG stall candidate):**
- Teams with low redzone_td_pct → kicking "OVER 1.5 FGs" leans. Teams with high redzone_td_pct → team-total UNDER is weaker (they score TDs, not FGs).

**2H clock-bleed elasticity (neutral_sec_per_snap high + plays_per_game low = slow, run-heavy when leading):**
- Teams with high neutral_sec_per_snap and low plays_per_game bleed clock — supports 2H/4Q Total UNDER and rush-volume decay when leading.

**Target concentration (hhi_target_concentration high = WR1 dependent):**
- High HHI + high wr1_target_share → WR1 props more stable; WR2/WR3 props more volatile.

---

## Data gaps to fill before Sunday
1. **Zone/gap rush split** — not in source trends. Need `intelligence/coaching/` run-scheme charting or NGS highlight tracking to split yards_per_rush into zone vs. gap (drives Hubbard/Jacobs rush props).
2. **Per-game Week 8 schedule** — needed to map these 32 team blocks to the 13 specific Sunday matchups.
3. **Week 6-7 only snap counts** — snap_counts_2026.parquet covers wks 1-5; W6-7 participation from `pbp_participation_2026_reconstructed.parquet`.
