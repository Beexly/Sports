# Signal 1 — Red-zone expected TD share allowed, by position

Method: @KoalatyStats (post 2115828918963859896, Oct 29). Window: Weeks 1-7,
nflverse play-by-play + roster positions.

**Definition.** Every red-zone opportunity a defense faced (targets:
pass attempts excl. spikes/2pt with an identified receiver; carries:
rush attempts excl. 2pt; yardline_100 <= 20) is grouped by the
ball-handler's roster position. Each opportunity is priced at the
*league* red-zone TD rate for that position group; a defense's expected
TDs are shared out by position. Propensity, not results — where a
defense's RZ touchdowns *should* come from, with TD variance stripped.

League RZ TD rates this window: OTHER 0.000, QB 0.207, RB 0.160, TE 0.363, WR 0.228.

**Check vs the post:** the post published a chart image; no values exist
in text form, so no numeric check is possible. The method is replicated
exactly as the dossier specifies. (The same account's open-field funnel
chart was reproduced 4-of-5 claims in the Oct 29 in-house repro pass;
its PROE column was refuted — Miami, not Detroit, allows the most
over-expectation passing. Borrowed numbers are never imported; this
table is computed, not copied.)

Top-5 defenses by expected WR share of RZ TDs allowed:

| defense | rz_opps_faced | rz_tds_allowed | WR_xtd_share |
|---|---|---|---|
| NYG | 60 | 14 | 0.433 |
| CLE | 57 | 9 | 0.418 |
| NE | 56 | 11 | 0.413 |
| HOU | 55 | 13 | 0.407 |
| JAX | 58 | 8 | 0.385 |

Top-5 by expected TE share:

| defense | rz_opps_faced | rz_tds_allowed | TE_xtd_share |
|---|---|---|---|
| KC | 41 | 5 | 0.427 |
| DET | 61 | 17 | 0.395 |
| WAS | 61 | 18 | 0.393 |
| LV | 71 | 22 | 0.386 |
| IND | 49 | 12 | 0.36 |

Full table: `01_red_zone_xtd_share.csv` (32 defenses x QB/RB/WR/TE/OTHER shares).
