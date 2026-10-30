# GROK47 Agent 2 — Instagram sweep and full-stack calibration audit

Date: 2026-10-30. Branch read: `engine/cv-bootstrap-2026-10-30`. No code was changed. No commit, no push.

Sources read, not inferred:

- `docs/data-sources/research/2026-10-30/INSTAGRAM-ALL-SWEEPS-CONSOLIDATED.md` lines 40-61, 751-764, 2395-2424
- `docs/research/2026-10-01/ig-sweep/IG-SWEEP-2026-10-01-master-matrix.md` line 18 (the only full transcription of the 1Q carousel)
- `docs/research/2026-10-01/ig-sweep/kernels-top10.md` line 5
- `scripts/ops/gse_coach_mind_simulator.py` (HFA at 1315, quarter registers at 1511-1536 and 2001-2043, tau_hat call at 2168, rush shares at 1388-1393)
- `scripts/ops/run_week8_slate.py` lines 53-56 (calls `simulate_matchup_pbp`, passes no posted line)
- `intelligence/data_loaders/signal_pack_loader.py` (`consume_signal_pack`, `append_gate_decision`)
- `intelligence/math/effective_theory_and_large_deviations.py` (`talisman_dependency_variance_multiplier`, `compute_residual_corank`, `exact_decomposition_allowed`)
- Measured on `intelligence/coaching/data/play_by_play_2026.parquet` (nflverse play-by-play, timestamp in file metadata `2026-10-28 05:04:59 EDT`)

Attribution fence. The Script, The Stop, and The 1Q Math are `@thelocktalk` carousel `Dd4TpsFicXE` (transcribed 2026-10-01, labeled "Creator claims, UNVERIFIED"). The consolidated file's "QB Vulture" line is a separate Sep 10 self-thread share, not that carousel. The measured thelocktalk TD kernel in the consolidated file is the anytime-TD yardline split at line 754. This audit treats the vulture kernel as that yardline split plus the task's inside-the-5 QB/RB question, and says so wherever the two are not the same object.

## RESULT

1Q scoring shape on 2026 weeks 1-7 matches the creator's "~20% / ~9 vs ~14" claim. The "~37% of home edge" claim is not a 2026 fact: regulation home edge is negative, and the only positive home edge is in Q1. The simulator spreads home-field as a flat EPA bump on every home offensive snap, then smears a separate first-half prior across all four quarters. Pathwise `1H = Q1 + Q2` is already an identity. A 1Q home-edge wire has to live inside the Q1 register or it will leak into Q2-Q4 through the calibration weights.

The gap audit at lines 2417-2420 is stale on the signal pack and half-stale on `tau_hat`. The `gate_decisions` production writer is still unwired. Stacking `corank < 2`, `TDR < 0.30`, and `tau_hat = 6.77` as a sniper AND-gate would veto on incommensurate quantities and would not raise hit rate.

## 1. The 1Q Math

### What the corpus actually says

Oct 1 matrix, post `Dd4TpsFicXE`, exact claim as filed:

- The Script: "60% of teams better on scripted plays since 2007"
- The Stop: "1Q ≈ 9 combined pts vs 14 in 2Q"
- The 1Q Math: "1Q = 20% of scoring but 37% of home edge; key numbers 0/3/4/7"

The consolidated file repeats only the 20% / 37% sentence (line 61). It does not contain `9.0-9.5`, `0.55`, or `1.5`. Those three figures are the task brief's reconstruction of `0.37 * 1.5 = 0.555` and of The Stop's "~9". They are not a measured row in the sweep. Do not cite them as corpus measurements.

### What 2026 play-by-play measures

File: 18,738 rows, 107 games, `season_type = REG` only, weeks 1-7. Quarter points are the change in `total_home_score` / `total_away_score` from the last play of the previous quarter to the last play of the quarter. A missing quarter carries the previous end score (none of the 107 games lacked Q1-Q4 plays in a way that changed the totals used here; OT is separated).

| Quarter | Combined pts / game | Share of regulation scoring | Home minus away |
|---|---:|---:|---:|
| Q1 | 8.7757 | 0.1926 | +0.7757 |
| Q2 | 13.4860 | 0.2960 | +0.1028 |
| Q3 | 9.5794 | 0.2103 | -0.1776 |
| Q4 | 13.7196 | 0.3011 | -1.0280 |
| Regulation | 45.5607 | 1.0000 | -0.3271 |
| OT (mean, including zeros) | 0.4766 | — | -0.1776 |

Read against the claim:

- "~20% of scoring" — reproduced on this sample (19.3%).
- "~9 combined in Q1 vs ~14 in Q2" — reproduced (8.78 vs 13.49). The task brief's 9.0-9.5 band contains 8.78 only if the band is allowed to round; the point estimate is 8.78, not 9.25.
- "~37% of the home edge" — not reproducible here. Regulation home edge is -0.33 points, not +1.5. Q1 is +0.78. Q4 is -1.03 and more than cancels Q1. The share of a negative full-game edge is not a meaningful 37%. The structural fact that survives is different and stronger: on this 2026 sample the only positive home edge in regulation is in Q1.
- Key numbers 0/3/4/7 — 82.24% of the 107 games have a Q1 absolute margin in {0, 3, 4, 7}. Mass: 0 at 22.43%, 3 at 17.76%, 4 at 11.21%, 7 at 30.84%. That is a 2026 fact about the margin distribution, not a model.

Historical "since 2007" and the 1.5-point full-game HFA are NOT MEASURED. This parquet is 2026 only. Installing `0.37 * 1.5 = 0.55` as a 2026 parameter would invent a home edge the season has not produced.

### What the simulator does now

Home field is a constant added to home net EPA on every snap the home team has the ball, all quarters:

```
home_net_epa = (off_epa - injury_drop) * eff_mult - away_def_epa + (hfa / 79.1) + 0.35 * qb_shift
```

`gse_coach_mind_simulator.py:1312-1316`. Default `hfa` in the team table is 1.56 for most clubs (DEN 1.85, KC 1.72, NO 1.65, PHI 1.62, SF 1.58, LA 1.45, LAC 1.40). `1.56 / 79.1 = 0.01972` EPA per home offensive snap.

Measured home offensive snaps, same parquet, pass/run, kneels and spikes out: 13.57 per game in Q1 (median 14, n=107), 61.78 per game across all quarters. So a flat per-snap bump puts `13.57 / 61.78 = 22.0%` of home-offense exposure in Q1, not 37%. The divisor 79.1 is not the 2026 home snap count (61.78). It is a constant. Expected point translation of 0.01972 EPA times 61.78 snaps is about 1.22 if EPA were points one-for-one. That is a sketch, not a certified point total, and it is not quarter-shaped.

A second, separate shift is applied after the sim, to the full-game margin, not to Q1:

```
first_half_margin_shift = 0.10 * (home_first_half_prior - away_first_half_prior)
home_margin_out = shrunk_margin + (raw_margin_vec - raw_margin) * scale_m + first_half_margin_shift
```

`gse_coach_mind_simulator.py:2001-2003`. That scalar is then painted back onto quarters with fixed weights:

```
q_weights = [0.23, 0.29, 0.22, 0.26]
home_qtr_cal = home_qtr_raw + home_delta[:, None] * q_weights
home_1h = home_q1 + home_q2
```

`gse_coach_mind_simulator.py:2008-2016`. The weights sum to 1.00, so `1H = Q1 + Q2` and `full = 1H + 2H` hold by construction. The residual is asserted `<= 1e-6` at line 2043. That identity is real. It does not mean the first-half prior stays in the first half. Weights on Q3+Q4 are 0.48, so 48% of `first_half_margin_shift` is booked outside the first half. A 1Q home-edge term added the same way would leak into Q2, Q3, and Q4.

`run_week8_slate.py` does not pass `posted_home_spread` or `posted_total`, so the no-market branch fires: `shrunk_margin = clip(0.35 * raw_margin, -11.5, 11.5)` at line 1987. That 0.35 is not the tau_hat weight (computed below).

Table 06 of the signal pack is applied on every snap as a quarter defensive-EPA delta (`gse_coach_mind_simulator.py:1534-1536`):

```
qtr_def_mod = qtr_epa_allowed[q] - all_q_epa_allowed
net_epa_vec = base_net_epa + qtr_def_mod * 0.35 * w_stat
```

On the 32 defenses in `06_defensive_epa_by_quarter.csv`, mean `q1_epa_allowed - all_q_epa_allowed` is -0.0186 (range -0.27 to +0.266). That is a real quarter split. It is not The Script, and it is not a home-edge allocation. It hits every snap in the quarter, not drives 1 and 2.

### Specification that does not break `1H = Q1 + Q2`

Keep the existing identity. Do not add a second post-hoc 1Q margin.

Let `H` be the team-table home-field prior in points (the `hfa` column). Do not set `H = 1.5` from the task brief. On this branch the table value is the prior; the 2026 realized regulation edge is -0.33 and must not be substituted in as if it were the prior without a written prior-update.

Snap-proportional share of home offense in Q1, measured: `pi_Q1 = 13.57 / 61.78 = 0.2197`.

If a future multi-year measurement actually returns a Q1 home-edge share `s_H = 0.37`, the Q1-only EPA add on home offensive snaps, and zero elsewhere, is:

```
epa_add(snap) = 0    if posteam is away or qtr != 1
epa_add(snap) = (s_H - pi_Q1) * H / n_home_Q1
              = (0.37 - 0.2197) * H / 13.57
              = 0.01108 * H
```

For the table default `H = 1.56` that is `+0.0173` EPA per home Q1 snap, and the flat `hfa / 79.1` term comes out of `home_net_epa` entirely. Points land in `home_qtr_raw[:, 0]` because the snap loop already indexes `q_idx = qtr - 1` (line 1517) before it books a score. The calibration delta is still spread by `q_weights` summing to 1, so:

```
home_1h - (home_q1 + home_q2) = 0
```

remains true. The forbidden wire is adding `0.37 * H` again onto `first_half_margin_shift` or onto `home_margin_out`. That would double-count and, through `q_weights`, put 48% of a "1Q" edge into the second half.

Until a multi-year file is measured, do not install `s_H = 0.37`. The 2026-legal quarter shape is the measured one: Q1 combined scoring share 0.193, Q1 home-minus-away +0.78, and no positive home edge after Q1. A 2026-only HFA wire that matches the measurement is "Q1 home residual +0.78, Q4 home residual -1.03", which is a result, not a stable prior. Label it a sample, n=107.

### The Script

Definition used for the measurement: first 15 pass/run plays per team-game, kneels and spikes excluded. 214 team-games.

- Share with script EPA above non-script EPA: 0.4439, not 0.60.
- Mean script EPA: -0.0266. Mean non-script EPA: +0.0214. Delta: -0.0481.

The "60% of teams better on scripted plays since 2007" claim is UNTESTED on any pre-2026 file in this audit, and it is contradicted on 2026 weeks 1-7. Do not add a positive script-efficiency bump to drives 1 and 2. A negative 2026 delta of 0.05 EPA is a one-season sample; it is not a license to hard-code a script penalty either. The honest state is: opening script is not a positive edge in this file.

### The Stop

Possession rates, same offensive-play filter, drive rank within team-game:

| Cut | Drives | Mean plays | Punt rate | Three-and-out and punt | Mean EPA/play |
|---|---:|---:|---:|---:|---:|
| Opening drive (rank 1) | 214 | 6.224 | 0.4393 | 0.2523 | -0.2974 |
| Drives 1-2 starting in Q1 | 417 | 6.350 | 0.4412 | 0.2206 | -0.2535 |
| Drive rank >= 3 | 1808 | 6.164 | 0.3374 | 0.1781 | -0.1861 |

Opening drives punt more and score worse per play than later drives. That supports the possession framing ("reason in possessions, not per-game averages") on this sample. It does not support a positive script. The points half of The Stop (9 vs 14) is the quarter table above, not this rate table.

A Stop wire that preserves the identity: raise drive-end probability only when `drv_rank <= 2` and `qtr == 1`, and book the resulting score change into `qtr_raw[:, 0]` only. Do not also add a Q1 total shift after `home_margin_out`.

## 2. QB Vulture / inside-the-5 rush TD split

### Corpus

Consolidated line 754, already reproduced by that sweep on 2012+2018+2024 (1,377 rush TDs, playoffs excluded): 57% of rush TDs from inside the 5 under the strict `yardline_100 < 5` reading (measured there 56.1; inclusive 60.9); 33.1% from the 1-yard line. That sweep did not split rusher into QB vs RB. The Sep 10 "QB Vulture" prompt is a different, ungated-caption item. There is no thelocktalk equation in the repo that says mobile QBs steal a stated share of inside-the-5 TDs.

### 2026 measurement

Rush TDs: `rush_touchdown == 1`, `yardline_100` present, rusher id present. n=204. A rusher is a QB if their id has at least 20 pass plays for a team in this file, or the name is in the listed mobile/sneak set (Hurts, Allen, Daniels, Jackson, Maye, Murray, Love, plus the other starters used only as a name backstop).

| Cut | Rush TDs | QB | Non-QB | QB share |
|---|---:|---:|---:|---:|
| All | 204 | 40 | 164 | 0.1961 |
| `yardline_100 <= 10` | 161 | 33 | 128 | 0.2050 |
| `yardline_100 <= 5` | 139 | 28 | 111 | 0.2014 |
| `yardline_100 < 5` | 122 | 26 | 96 | 0.2131 |
| `yardline_100 == 1` | 66 | 19 | 47 | 0.2879 |
| `yardline_100 > 5` | 65 | 12 | 53 | 0.1846 |

Inside-5 inclusive share of all rush TDs: `139 / 204 = 0.6814`. Strict `< 5`: `122 / 204 = 0.5980`, close to the prior sweep's 0.561. One-yard line: `66 / 204 = 0.3235`, close to 0.331. Passing TDs inside 5 inclusive: 0.2997 of 327. The yardline concentration reproduces. The "QB steals the TD from RB1" rate does not: even inside the 5, about 4 of 5 rush TDs are still non-QB.

Named set inside the 5: Allen 7, Love 2, Maye 1, Hurts 1, Jackson 1, Daniels 0, Murray 0. Total 12 of 139 (0.086). Top non-QB inside the 5: McCaffrey 7, J. Williams 7, Henry 6, Swift 6, Taylor 6, Gibbs 6, Cook 4. A blanket RB anytime-TD haircut would cut the players who are still scoring those TDs.

Signal-pack table 01 `QB_xtd_share` is a red-zone expected-TD receiving share, not a rush-TD share. Across 32 defenses: min 0.00, mean 0.0576, max 0.12. The simulator uses it to blend red-zone target shares (`gse_coach_mind_simulator.py:1357-1365`). It does not touch the rush vector.

The rush vector is flat, every yard line (`gse_coach_mind_simulator.py:1388-1393`):

```
rush shares before KKT normalize ≈ [RB1, RB2, QB1=0.11, WR1=0.04]
```

`0.11` is below the measured inside-5 QB TD share (0.20) and well below the 1-yard-line share (0.29). It is not conditioned on `yardline_100`. So the sim slightly under-assigns goal-line TDs to QBs and does not over-assign them. The failure mode the task asked about (RB anytime / 1Q / 1H TD over-projection from ignored vultures) is real only for the sneak QBs, and only inside the 5, and it is not a league-wide RB haircut.

### Conditional kernel

On a rush snap, leave the current shares alone when `yardline_100 > 5`.

When `yardline_100 <= 5` and the offense QB is in the sneak set, set the rush-TD allocation (not the carry allocation) to a shrunk team rate:

```
p_QB_td = (n_team * p_team + k * 0.2014) / (n_team + k)
```

with `k` large enough that a 7-game Allen sample cannot go to 1. League anchor `0.2014` is the 2026 inside-5 rate, n=139. At the 1-yard line the anchor is `0.2879`, n=66. Do not use 0.50 or "most goal-line TDs" — that number was not measured.

Book the TD into the same `q_idx` the snap already uses, and into the QB rush-role register (index 2 of the 4-role rush vector), not into RB1. Then 1Q and 1H TD counts for RB1 fall only by the TDs that were actually reassigned, and `1H = Q1 + Q2` is untouched because no post-hoc margin is added.

Outside the 5, QB share 0.1846 is close to the flat 0.11 only in spirit; 0.11 is still a carry share, not a TD share. Do not retune the open-field carry share from this TD table.

## 3. Gap audit, lines 2417-2420

The consolidated gap audit says three things are unwired. Checked against this branch.

### Signal pack — the "unconsumed" line is false here

Line 2418: "7 signals built... no engine code reads the tables yet."

On this branch `consume_signal_pack` refuses a missing table, and `_get_cached_signal_pack_tables` (`gse_coach_mind_simulator.py:798-863`) reads all seven CSVs from `docs/research/2026-10-30/signal-pack/outputs/` and applies them inside `simulate_matchup_pbp`:

| File | Used as |
|---|---|
| `01_red_zone_xtd_share.csv` | Red-zone target blend |
| `02_missed_tackles_by_defense.csv` | Tackle-miss modulator |
| `03_qb_throwaway_rate.csv` | Per-QB throwaway rate |
| `04_rb_rushing_epa.csv` | Team rush EPA |
| `05_big_plays_vs_success.csv` | Explosive rate |
| `06_defensive_epa_by_quarter.csv` | Per-snap quarter defensive EPA delta |
| `07_paired_flip_leverage.csv` | `timo_damping = 1 / inflation_ratio` |

All seven files are on disk (sizes 284 to 2,805 bytes for the CSVs). `run_week8_slate.py` calls `simulate_matchup_pbp`, so a slate run consumes the pack. The Oct 30 gap sentence is stale relative to this branch. It was true of the sweep document's own date relative to whatever tree that sentence was written against. Do not delete the sentence from the sweep doc in this audit; record the contradiction.

### `gate_decisions` writer — still unwired from the sim, and still not the Prisma table

`append_gate_decision` exists in `signal_pack_loader.py:163`. It validates `PASS` / `REJECT` / `ABSTAIN`, writes a local JSONL if `ledger_path` is set, and returns a dict shaped like the Prisma row. It does not open a database. The simulator imports the symbol (line 40) and never calls it. The only call sites are three unit-test lines in `intelligence/math/test_brenier_stability.py`. `compute_luck_penalty_wp_swing` explicitly refuses to be the writer and is fenced off `simulate_matchup_pbp` (lines 250-260).

So: a local writer exists and is tested; the production Prisma table still has no writer from this path; the sim does not append a decision. Line 2419's "none since June 11, 2026" remains true of the database. "Untouched by the Oct 30 sweep work" is stale of the function, true of the call site.

### `tau_hat = +6.77`, n = 3,988 — consumed as a certificate, not as the price

`apply_tau_hat_calibration_shrinkage` (`gse_coach_mind_simulator.py:193-220`) requires `held_out_only=True` and computes:

```
weight = prior_sd^2 / (prior_sd^2 + tau_hat^2)
shrunk = weight * raw_margin
```

With the defaults `prior_sd = 13.5`, `tau_hat = 6.77`:

```
weight = 182.25 / (182.25 + 45.8329) = 0.799052
```

The call at line 2168 passes `raw_margin`, `tau_hat=6.77`, `n=3988`, `held_out_only=True`, and stores the dict on the output under `tau_hat_calibration` (line 2314). It does not assign `home_margin_out`. The printed Week 8 margin is the 0.35 no-market shrink (or the 0.70 market blend if a posted line is passed). `run_week8_slate.py` passes neither posted line, so the slate price ignores 0.799 and uses 0.35.

Line 2419's "tau_hat consumer unwired" is therefore half wrong. A consumer runs. It does not set the number the slate prints. Treating the log line as "tau_hat is live in the price" would be a false claim.

`n = 3,988` is a parameter in the function signature and the call. This audit did not re-fit it. It is read-from-source, not remeasured.

### How the three interact, as executed

Order inside `simulate_matchup_pbp`:

1. Signal pack is loaded before the snap loop and modulates EPA, targets, and throwaways on every snap.
2. Scores are booked into quarter registers during the loop.
3. After the loop, the printed margin is the 0.35 (or market) shrink plus `first_half_margin_shift`, then painted onto quarters with `q_weights`.
4. After that, `tau_hat` shrinkage is computed on the raw mean margin and attached to the result dict.
5. `append_gate_decision` is not called.

They do not form a conjunction. The pack moves the sim. The writer does not run. The tau_hat number is a sidecar.

## 4. Sniper-gate calibration review

The quantities named in the task are not one gate. Putting them in one AND will not raise precision. It will veto on category errors.

### `corank < 2`

`compute_residual_corank` counts eigenvalues of a 6-series correlation matrix that sit outside the Marchenko-Pastur edge, minus one for the rank-1 mode (`effective_theory_and_large_deviations.py:917-927`). `exact_decomposition_allowed` is true only when that count is 0 or 1 (lines 930-937). The sim still emits the distribution when the count is >= 2; it refuses a point identity (`gse_coach_mind_simulator.py:2191-2268`).

That is a spectral fence on whether six correlated box-score series have a low-rank exact decomposition. It is not a measure of whether a side, total, or prop beats the de-vigged price. AND-ing `corank < 2` into a publish gate will withhold games because the score and the yardage series are correlated, which is the normal case. Leave it as a certificate. Do not let it PASS a ticket.

### `TDR < 0.30`

`talisman_dependency_variance_multiplier` on a share vector sets `tdr = max(s_i)` and raises variance only when `tdr >= 0.30` and the primary is scratched or the defense blitz rate is above 30 (`effective_theory_and_large_deviations.py:863-908`, called at simulator lines 2147-2148). Default target shares before injury are `[0.26, 0.21, 0.17, 0.20, 0.16]`. Max is 0.26, so a healthy roster never trips the threshold. The multiplier is a variance inflator for a concentrated, hurt skill chart. It is not a side filter and not a 1Q filter. Using `TDR < 0.30` as a publish requirement either never fires or fires exactly when a star is out, which is when the prop price should move, not when the ticket should be auto-killed.

### `tau_hat = 6.77`

6.77 is a held-out residual scale in points, n=3,988 as passed, not remeasured here. The licensed use is the shrinkage weight 0.799 toward 0, and only on held-out residuals. It is not a minimum edge. An "edge must exceed 6.77" rule rejects every realistic NFL edge (those live near 1-3 points) and would publish nothing. It is also not the weight the slate currently uses (0.35 with no posted line). Do not promote 6.77 into the conjunction until someone measures, on held-out games, whether 0.799 beats 0.35 on closing-line value. That comparison was not run in this audit. State: NOT TESTED.

### `edge` and `model_p`

These are the only two of the five that belong in a publish conjunction. Standing rule already in the repo: compare post-reasoning probability last to the de-vigged market; if the row's own decision is PASS or the signed edge is negative, do not publish; do not install a fake CLV floor. This audit did not re-read the market for a live slate and does not name a bet.

### What a precision stack actually is

Keep one publish conjunction, market-last:

- Signed edge versus the de-vigged price is positive.
- `model_p` is the post-reasoning probability, not the heuristic confidence score.
- Absence of a market price is silence, not a pass and not a fail.

Add market-family checks that are about the number's source, not extra vetoes:

- 1Q / 1H / 2H: the number must be the sum of the quarter registers. A 1Q edge that was added after `home_margin_out` is not a 1Q number, because `q_weights` will have moved part of it into other quarters. Refuse that construction, not the game.
- Kicking: the kick-point identity `kick_pts = 3*FGM + PAT` is already asserted. Do not gate kicking props on corank.
- IDP: the tackle funnel is a blitz-rate boost already in the sim. Do not gate it on TDR.
- Skill TD props: apply the inside-5 conditional QB split before comparing to the de-vigged anytime price. Do not haircut every RB.

Log, do not AND: residual corank, TDR multiplier, tau_hat certificate. A ticket that fails the market conjunction is PASS. A ticket that fails only corank or TDR is not a finding about the price.

## 5. Simple Jev

Consolidated lines 41, 1350, 1398, 1451, 2415. Simple Jev (`featherless-ai/simple-jev`, Apache-2.0, as filed) builds a JSON answer from next-token logits for typed questions. It does not generate text. The sweep marks it TEST, register S110, zero-dollar demo API specified, not run. The Laya gate eval on the same day was KILL. Simple Jev is the named next judge-seat candidate. It is not imported by `gse_coach_mind_simulator.py` or `run_week8_slate.py`. The simulator's logit-like objects (sealed `tau = 0.42`, the 2x2 QB matrix, the Rademacher bound at line 2165) are not Simple Jev. Do not describe the current gate as a Simple Jev logit gate.

## NOT DETERMINED

- Multi-year (2007-2025) scripted-play share. The 60% claim was not recomputed. 2026 contradicts it.
- Multi-year home-edge share by quarter. The 37% claim was not recomputed. 2026 does not have a +1.5 home edge to take 37% of.
- Whether `tau_hat = 6.77` on n=3,988 is the right held-out scale. Passed through as a constant. Not refit.
- Whether shrinkage weight 0.799 beats the live 0.35 no-market shrink on CLV. Not tested.
- Live de-vigged prices for any Week 8 market. Not pulled. No pick is implied.
- Prisma `gate_decisions` row count after 2026-06-11. Not queried. The code path above does not write it.

## Clean, so it is not re-litigated

- Parquet row count is 18,738. Confirmed.
- `1H = Q1 + Q2` and `full = 1H + 2H` are identities after calibration, asserted at `<= 1e-6`. The bug is where the edge is inserted, not whether the sums match.
- Signal-pack files for all seven tables are present and are read by the simulator on this branch.
- Inside-5 rush-TD concentration is real (68% inclusive, 60% strict). QB share of those TDs is about 20%, not a majority.
