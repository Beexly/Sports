# PRE-REGISTRATION — L1 props lab: cold/wind × passing exposure (FROZEN)

Run: MINIS PROPS-LAB (2026-09-14), Grout Crew. Follows the 13-compound game-level
battery (0/13 passed). Game-level branch CLOSED; this is props space.
Frozen at 2026-09-14 ~17:45 UTC, **before any outcome was joined or inspected**.
Hash of this file is recorded in the final report.

---

## 1. Data (exact files)

| File | Role | Key columns |
|---|---|---|
| `/tmp/nfl/ftn_2022..2025.csv` | play charting (offense-derived) | `nflverse_game_id`, `nflverse_play_id`, `is_play_action` |
| `/tmp/nfl/pbp_2022..2025.csv` | nflverse play-by-play | `game_id`, `play_id`, `season`,`week`,`season_type`,`pass_attempt`,`complete_pass`,`passing_yards`,`posteam`,`defteam`,`roof`,`temp`,`wind`,`pass_length`,`down`,`ydstogo`,`epa` |
| `/tmp/sched.csv` (= nflverse `schedules/games.csv`) | closing lines, game metadata | `game_id`,`season_type`,`roof`,`temp`,`wind`,`total_line`,`spread_line` |

**Join:** `pbp.game_id = ftn.nflverse_game_id` AND `pbp.play_id = ftn.nflverse_play_id`.
Verified from `ftn_2024.csv` header+row: FTN's `nflverse_play_id` is the nflverse pbp
`play_id` (integer), e.g. row 2 → `nflverse_game_id=2024_10_CIN_BAL, nflverse_play_id=40`.
If pbp lacks a same-named column, the join is `game_id`+`play_id` and that fact is recorded.

## 2. Universe and filter (frozen)

- `season_type == 'REG'`, seasons 2022–2025.
- **Pass attempts:** pbp rows with `pass_attempt == 1` (excludes sacks, scrambles,
  aborted snaps) and non-null `complete_pass`.
- **Weather:** `roof ∈ {outdoors, open}` and non-null `temp` and `wind`; rows with null
  weather are dropped and counted.
- **ColdWindy** `= 1[roof ∈ {outdoors,open} AND (temp ≤ 40 OR wind ≥ 15)]` — per play,
  from pbp's own `roof/temp/wind`.
- **PlayAction** `= ftn.is_play_action` (1/0/unknown→dropped if non-binary).
- Analysis set = joined pass attempts with non-null ColdWindy, PlayAction, and baseline
  covariates.

## 3. Estimands (two model classes → Gate 6 by construction)

- **M-COMPLETE (primary):** `logit P(complete_pass)` on pass attempts.
- **M-YARDS (secondary):** `E[passing_yards | attempt]`, Gaussian OLS **and** a
  median (quantile τ=0.5) counterpart.

## 4. Models (frozen equations)

```
M0 (baseline):  logit P = a + b1·trail8_paEpa + b2·total_z + b3·|spread|_z + b4·down + b5·ydstogo
M1 (tested):    M0 + d1·ColdWindy + d2·PlayAction + c·(ColdWindy × PlayAction)
```

- `trail8_paEpa` = passing team's **as-of trailing-8-game** pass EPA/play, computed from
  strictly earlier weeks of the same season (leak-safe; season start falls back to
  prior-season mean, flagged).
- `total_z`, `|spread|_z` = closing `total_line` and `|spread_line|`, season-standardised
  (closing-line pace/competitiveness proxy).
- **Tested coefficient: `c`.** Main effects `d1,d2` are controls, not claims.
- The same structure is fitted for M-YARDS (OLS) and for the median counterpart.

**Seconds model class for Gate 6 = the yards (Gaussian) + median pair, fitted
independently of the logit.**

## 5. Metric

`ΔLL` = out-of-sample log-loss improvement of M1 over M0, **expanding-window by season**
(train seasons ≤ k−1, test season k, k = 2023, 2024, 2025), reported in **nats per pass
attempt**. Held-out, not in-sample.

## 6. Pre-registered direction

**c < 0 for M-COMPLETE** and **c < 0 for M-YARDS.**
Mechanism: wind/cold degrades ball flight and throw timing; play-action concepts are
deeper-developing and timing-dependent, so they are expected to tolerate poor conditions
*worse* than quick-game non-PA passes.
**Declared alternative (anti-direction) hypothesis:** play-action creates separation and
therefore *helps more* in bad weather. If the data show that, it is `[post-hoc]`, cannot be
ranked, and does not satisfy this pre-registration.

## 7. Null procedures (both required)

- **N1 permutation:** 1,000 within-season permutations of `ColdWindy`, refit M1, record
  `c`. 90% interval from the permutation distribution.
- **N2 indoor placebo:** indoor plays (`roof ∈ {dome,closed}`) with a within-season random
  30% `pseudo-ColdWindy` flag, 200 draws. **Must cover 0** — no interaction where weather
  cannot act.
- **Clustered uncertainty:** because weather is assigned per *game* and repeated across
  plays, all intervals are ALSO computed with a **game-clustered bootstrap** (10,000 game
  resamples). The attempt-level interval is reported beside it. Both are reported; the
  clustered one governs.

## 8. Kill lines (pre-registered, exact)

A SUPPORTED result requires ALL of: sign as pre-registered AND ΔLL ≥ 0.002 nats/attempt
AND game-clustered 90% CI excluding 0 AND the effect present in ≥2 of 3 severity tertiles
(not the middle tertile alone).

KILLED if ANY of:
- **K1** `c ≥ 0` (sign opposite the pre-registered direction).
- **K2** `ΔLL < 0.002` nats/attempt out-of-sample.
- **K3** game-clustered 90% CI for `c` contains 0.
- **K4** POWER_DEAD: fewer than **1,500** `ColdWindy × PlayAction` pass attempts
  (declared here; the game-level battery used n<150 games).
- **K5** effect present **only** in the middle severity tertile (Gate 5c).
- **K6** N2 indoor placebo shows a significant interaction (the null procedure failed).

## 9. Multiplicity

L1 is the only spec executed under this pre-registration. L2/L3/L5 remain frozen
pre-registrations with no outcomes inspected. Any post-hoc test is labelled `[post-hoc]`
and excluded from ranking.

## 10. Honesty check — "what would make this narrower than it looks?"

1. **Clustering.** `ColdWindy` is a game-level assignment repeated over ~35–70 attempts.
   Effective n is games, not attempts. Mitigated only by the game-clustered bootstrap, and
   even that cannot fix a design where weather is confounded with team, stadium, and month.
2. **Weather provenance.** nflverse weather is a single game-level reading (likely one
   station), not per-play conditions; indoor rows are NA. Any real effect is attenuated and
   a null may be a measurement null, not a mechanism null.
3. **Confounding.** Cold games cluster in November–January: late season, specific teams,
   playoff-relevant stakes. `season`/`week` controls were NOT included by design (they would
   absorb the treatment); a season/team-adjusted sensitivity run is `[post-hoc]` only.
4. **Play-action attribution** comes from FTN charting, available only 2022+ — four seasons,
   one of which is a 17-game season and all of which are post-2020 rule changes.
5. **Selection.** FTN charting coverage is not guaranteed complete; the join may drop plays
   non-randomly (e.g. un-charted plays). The join loss is reported as a percentage.
