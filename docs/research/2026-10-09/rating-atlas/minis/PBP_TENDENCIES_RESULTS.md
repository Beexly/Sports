# CFB PLAY-BY-PLAY TENDENCIES — 126,362 plays (2026 wks 1–6)
**cfb_pbp_tendencies.py · diagnostic only, kill-gated**

## 1. Fourth-down aggression (4th & ≤3, opp territory — league go-rate 54.9%, n=1,522)
- Most aggressive: Vanderbilt .889 (z+2.05), Florida Atlantic .889, USC .875, South Carolina .875, Troy .875
- Least: **Wyoming .000 (z−3.12)**, Clemson .250, Idaho State .250
- FBS-relevant spread: ~.25 to .89 — coaching identity is REAL and measurable

## 2. Tempo (seconds/play, same-drive, n>150)
- Fastest: Auburn 27.0, WVU 27.1, Mississippi State 27.7
- Slowest: Wisconsin 34.6, Boise State 35.0 (spread ≈ 8 s/play ≈ 25+ possessions swing potential)

## 3. Penalties (n=6,858 penalty plays)
- Most penalized: Utah State .0937/play, Kent State .0915
- Pre-snap kings: Kent State .0587, Texas Southern .0581 — drive-killers, live-total relevant

## 4. Halftime adjustment (2H margin − 1H margin, n≥5)
- Best: Texas Tech +13.8, Fresno State +12.0, UAB +12.0
- Worst: **USC −12.0 (n=6)**, Miami −12.0 — the "front-runner" profile
- Caveat: small n, includes garbage-time asymmetry; needs residual-vs-close framing before any weight

## 5. Success rate (std down-distance rule, n>250)
- Elite: Army .615, Miami .598, Notre Dame .591 — the PPA-adjacent efficiency check

## What this feeds (registry pipeline)
| tendency | feature slot | gate path |
|---|---|---|
| aggression z | team-year covariate | residual-vs-close → t ≥ 1.96 → walk-forward |
| tempo | total-side context | live totals only (rule 14 discipline) |
| pre-snap penalty rate | drive-kill covariate | turnover/possession model input, diagnostic |
| halftime adjustment | live-half pricing | conformal live gate first |
| success rate | PPA cross-check | consistency diagnostic |

All diagnostic. No coefficients. The close is still the anchor.
