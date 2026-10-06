# A6 — Coaching-Tendency Engine: Buildable Systems (slice c03)

**Analyst:** Deep Analyst A6 · **Phase:** 2 · **Date:** 2026-10-02
**Build target:** `~/workspace/gse-intelligence-build/coaching/` (directory exists, empty)
**Program:** TNF Intelligence Program, Track 2 — `.../from-motif/tnf-intelligence-program-2026-10-01.md` §4
**Slice evidence:** `~/workspace/corpus-intelligence/maps/c03-map.md` — the single biggest named-lane gap is
play-calling tendencies beyond 4th down (early-down pass rate over expectation, neutral-script splits,
coordinator fingerprints with YoY deltas, regime-change gating).

## 0. Boundaries (non-negotiable)

- The base pipeline `~/workspace/coaching-tendencies/code/compute_tendencies.py` **already computes**
  team-season pass rates by down/distance/field, `shotgun_rate`, `no_huddle_rate`, `go4th_rate`,
  `two_pt_rate`, quick-game proxy (`quick_game_rate` = share of attempts with `air_yards ≤ 5`),
  `avg_air_yards`, `deep_rate`, `pace_sec_median`, and defensive pressure proxies.
  **This engine EXTENDS it — import/extend, never duplicate.** Every module either reads
  `coaching-tendencies/data/off_tendencies.csv` (+ `coach_offense.csv`) or re-uses its loader,
  and adds computations the base does not have.
- `coach_tenures.py` maps only ~10 coaches (Monken, McCarthy, Shanahan, McVay, Moore, Stefanski,
  Arthur Smith; Fangio, Vance Joseph). It is a *seed*, not coverage — M03 expands it to all 32.
- **c04 (sibling lane) owns** the 1575 τ inverse-optimization (τ per coach-team × field region × WP bin)
  and ALL situational risk modules. This engine owns coach-era tendency *vectors* and *tenure mapping*.
  The two meet at the interface contract in §3 — neither recomputes the other's estimand.
- Honesty rule (from `DATA_GAPS.md`): profiles never present a proxy as the underlying metric.
  Blitz/coverage/shell/motion/time-to-throw remain charting-gaps; modules label proxies explicitly.
- Wiring doctrine: these modules produce structured research data (CSVs + schemas). **No engine wiring,
  no calibration, no published outputs until Garrett says so** (program §6). Research → wire → weight →
  calibrate → test → polish, in that order.

## 1. Module list

Shared infrastructure (build once, before P0): `coaching/common.py` —
`neutral_mask(wp)` (0.35 ≤ wp ≤ 0.65, nflverse descriptive norm), `empbayes(p, n)` shrink
`w = n/(n+k)`, `k` = league-median cell n, `league_expected_rate(season, down, ydstogo_bin, script)`
(from raw pbp, excludes the target team-season), safe-div, half-split helper for null tests.
All modules share the pbp loader (columns extend the base `OFF_COLS`: add `play_action`, `epa`,
`timeout`, `timeout_team`, `play_id`, `old_game_id`, `drive` already present).
Data: `~/workspace/coaching-tendencies/data/pbp_2022.parquet` … `pbp_2026.parquet`
(2026 = weeks 1–3 only as of 2026-10-01 — all 2026 rows are small-sample flagged).

### P0 — build first (measured numbers + replication recipes exist)

**M01 — `neutral_script_proe.py` — Early-down pass rate over expectation (PROE), neutral script.**
The slice's lead buildable estimand (map §Gaps: "early-down pass rate over expectation ... the single
biggest named-lane gap"; slice §17: Stroud 62.2% + 21% aggressiveness shows early-down splits move).

- Inputs: raw pbp (play-by-play, `pass_attempt`, `rush_attempt`, `down`, `ydstogo`, `wp`, `posteam`,
  `season`, `game_id`) + `off_tendencies.csv` (for the base team-season joins only — the PROE itself
  is computed fresh from pbp because the base has no neutral-script column).
- Computations:
  1. Neutral-script mask: `0.35 ≤ wp ≤ 0.65`, downs 1–2, scrimmage plays only (same exclusions as
     base: no kneels/spikes/aborted), `qb_dropback`/`rush_attempt` plays.
  2. League expected rate per (season, down, ydstogo_bin ∈ {≤3, 4–7, ≥8}): `E = P_league / (P+R)`
     computed with the target (team, season) **excluded** (leave-one-team-out; no self-reference).
  3. `PROE_raw = pass_rate_actual − E`, aggregated to coach-era via M03 tenures (plays-weighted).
  4. Empirical-Bayes shrink: `PROE = PROE_raw · n/(n+k)`; report both, gate on shrunk.
  5. Standard error: `SE = sqrt(p̂(1−p̂)/n)`; 95% CI on each cell.
- Outputs: `data/proe_early_neutral.csv` —
  `coach, team, season, era_id, pass_rate_actual, pass_rate_expected, proe_raw, proe, proe_se,
   n_plays, attribution_confidence`.
- Acceptance gate (slice-grounded):
  1. **Replication anchor:** module must reproduce the two measured anchors from the slice —
     2026 league 2nd-&-1 pass rate **32.7%** vs 2025 **20.6%** (wr-phase2 / map Gaps) — within **±1pp**
     each. If it can't, the loader is wrong, not the theory.
  2. **Fingerprint stability:** YoY Spearman of coach-era `proe` **≥ 0.50** across 2022–2025
     stable coach-eras (min n=200 neutral early-down plays per era-season). Coordinator fingerprints
     must stick — the whole module exists because coordinators have stable tendencies.

**M02 — `coordinator_fingerprint.py` — Coach-era tendency vector + YoY deltas.**
Directly serves the program's "Tendency evolution (the Fangio/Joseph/McVay/Shanahan drift)" row and
the memory doctrine that coordinators' tendencies evolve year to year.

- Inputs: `off_tendencies.csv`, `coach_offense.csv`, M01 output, M03 tenure registry.
- Computations:
  1. Per coach-era (coach × continuous team-season block, from M03), plays-weighted aggregate of:
     `proe_early_neutral` (M01), `pass_rate_rz` (base), `shotgun_rate` (base), `no_huddle_rate` (base),
     `pace_sec_median` (base), `quick_game_rate` (base), `avg_air_yards` (base), `deep_rate` (base),
     `two_pt_rate` (base), `playaction_rate` (M07), `script_beta` (M06), `go4th_rate` (base,
     descriptive only — see §3 for why τ replaces it).
  2. League z-score each metric within season: `z = (x − μ_league)/σ_league`.
  3. YoY delta: `Δ = z_t − z_{t−1}` within the same era (regime-gated by M04: never delta across a
     regime boundary).
  4. Nearest-neighbor self-consistency: for each era-season, rank all 32 era-seasons by
     Euclidean distance of the z-vector; check own prior season is the nearest.
- Outputs: `data/coach_fingerprints.csv` — `coach, era_id, team, season, n_plays, <raw metrics>,
  <z metrics>, yoy_delta_json, nearest_neighbor_own_prior (0/1)`. Plus `data/fingerprint_deltas.csv`.
- Acceptance gate: **≥75% of stable coach-eras have their nearest-neighbor fingerprint be their own
  prior season** (2022–2025; era-seasons with n ≥ 400 plays). Within-coach MAD of Δ < across-coach MAD
  at p < 0.05 (permutation test). If coaches aren't more like themselves than each other, the vector
  is noise and nothing downstream may consume it.

**M03 — `tenure_registry.py` — Full 32-team coach-era mapping (2022–2026).**
`coach_tenures.py` covers ~10 coaches; every per-coach computation below depends on complete coverage.
This is the *locate-first gate*: the slice's HC-vs-OC attribution gap means we must mark what we
don't know, not fill it.

- Inputs: web-verified HC/OC/DC/playcaller per team × season (manual research task; source URLs
  recorded per row — provenance is part of the schema).
- Computations: era assembly — contiguous (coach, team) blocks; `era_id = coach|team|start-end`.
  Attribution rule: `attribution_confidence` ∈ {1 sole caller, 2 shared (downweight 0.5 in era
  aggregates), 3 unknown (excluded from coach-era aggregates, retained in team-season tables)}.
  HC-delegates-to-OC vs HC-calls-plays flags; mid-season firings split the season (`era_id` suffix
  `a`/`b`).
- Outputs: `data/tenures/offense.csv`, `data/tenures/defense.csv` —
  `coach, role {HC, OC, DC}, team, season, era_id, playcaller {0,1}, attribution_confidence,
   note, source_url, verified_date`.
- Acceptance gate: **160/160 offense team-seasons and 160/160 defense team-seasons** covered
  (32 teams × 5 seasons); every `attribution_confidence=2/3` row has a non-empty `note`;
  join audit — every row of `off_tendencies.csv` maps to exactly one era, every era maps to
  ≥1 row (zero orphans either direction).

**M04 — `regime_change_gate.py` — Coordinator-change regime gating.**
The slice's fourth named sub-gap ("regime-change gating") plus two measured gates to honor:
0598's pre-registered false-rejection band [2%, 10%] on within-season half-splits, and 2129's
hard REJECT if epistemic uncertainty does not rise on held-out regime-shift games (adapted:
our CI widths must widen on new-regime samples — we have no NIG head yet, so CI-width is the
honest stand-in).

- Inputs: M01–M03 outputs, raw pbp.
- Computations:
  1. **Deterministic boundaries** from M03 (tenure change, mid-season firing) — always a regime start.
  2. **Empirical detector** (0598-style, simplified): for each coach-era-season, permutation
     two-sample test on the vector [proe, pace_z, shotgun_z, no_huddle_z] between first-half and
     second-half season windows; reject (flag intra-era regime shift) at p < 0.05, 10,000 perms.
     nflverse pbp week ordering gives the split. Report permutation p + effect size (mean |Δz|).
  3. **Uncertainty flag:** for any era-season with `n_plays < 200` neutral early-down plays OR
     coach in first season with a new team, set `low_sample=1` and require CI-width reporting —
     CI width must be **≥1.5× league median width** (the 2129 analog: uncertainty rises on regime shift).
  4. **Null calibration:** run the detector on 2022–2025 stable coach-eras; the false-flag rate on
     known-stable eras must sit in **[2%, 25%]** (0598's [2%,10%] widened for our small n — stated
     as a loosened band, not hidden).
- Outputs: `data/regime_flags.csv` — `era_id, season, regime_start {0,1}, detection {tenure,
  empirical, low_sample}, p_value, effect_size, ci_width_ratio`.
- Acceptance gate: detector flags **≥80% of known HC/OC-change seasons** (ground truth = M03
  tenure boundaries, 2022–2025) with false-flag rate in the [2%, 25%] band on stable eras;
  100% of new-playcaller era-seasons carry `low_sample=1` until n ≥ 200.

### P1 — next (buildable, thinner slice evidence)

**M05 — `red_zone_mix.py` — Red-zone run/pass mix + RZ PROE.**
Slice names red-zone run/pass mix in the biggest gap; base computes only raw `pass_rate_rz`.

- Inputs: raw pbp (`yardline_100 ≤ 20` exact derivation per DATA_GAPS §7), M03.
- Computations: `rz_pass_rate`, league-expected RZ pass rate per (season, down, ydstogo_bin) LOYO-style,
  `rz_proe` (raw + EB-shrunk), goal-to-go (yardline_100 ≤ 10) split, `rz_proe` by coach era.
- Outputs: `data/rz_mix.csv` — `coach, era_id, season, rz_pass_rate, rz_proe, rz_proe_se,
  gtg_pass_rate, n_rz_plays`.
- Acceptance gate: YoY Spearman of coach-era `rz_proe` **≥ 0.40** (2022–2025, n ≥ 60 RZ plays);
  module reproduces base `pass_rate_rz` exactly on the same input (regression lock with M-base).

**M06 — `script_elasticity.py` — Playcalling sensitivity to game script (β_script).**
"Neutral-script splits" sub-gap; the complement of M01's neutral window: how far the playcaller
leans into/against script outside it.

- Inputs: raw pbp, M03.
- Computations: per coach-era, bin early-down plays into 10 WP bins (0–1); regress
  `pass_rate` on bin-center WP (OLS, plays-weighted); `β_script` = slope Δpass_rate/Δwp,
  `β_script − β_league(season)` as the league-relative elasticity; SE via 200 game-level
  bootstraps (the 1575 uncertainty ritual, kept cheap). Restrict to 1st–2nd down, neutral field.
- Outputs: `data/script_elasticity.csv` — `coach, era_id, season, beta_script, beta_rel,
  beta_se, n_plays, wp_bin_rates_json`.
- Acceptance gate: YoY correlation of `beta_rel` **≥ 0.45** on stable eras; league-median
  β reported descriptively (no target value — never gate on an invented number).

**M07 — `playaction_screen.py` — Play-action rate by script + shotgun/under-center splits.**
nflverse *has* `play_action` and `shotgun` columns (verified fields, unlike motion/RPO — the
slice's week-2 snapshots LAC motion 84.3% / WAS RPO 14.7% are **not** buildable from nflverse
and stay intake-only; TEN no-huddle 22.4% IS verifiable — see gate).

- Inputs: raw pbp (`play_action`, `shotgun`, `down`, `wp`), M03.
- Computations: `pa_rate_neutral` (0.35 ≤ wp ≤ 0.65, 1st down), `pa_rate_all`,
  `under_center_rate = 1 − shotgun_rate`, `pa_rate_by_script` (trailing/neutral/leading),
  coach-era aggregates + league z.
- Outputs: `data/playaction.csv` — `coach, era_id, season, pa_rate_neutral, pa_rate_all,
  under_center_rate, pa_by_script_json, n_plays`.
- Acceptance gate: reproduces league season PA rate within **±0.5pp** of the nflverse
  descriptive; TEN 2026 (weeks 1–3) `no_huddle_rate` within **±2pp of the 22.4% week-2 snapshot**
  (sanity anchor from the slice).

**M08 — `sequencing_lite.py` — First-order play-type sequencing (the honest small version of the
unbuilt Hawkes lane).**
The map explicitly notes "No NFL play-sequencing model — 1820's Hawkes framework is soccer;
fitting a marked point process to NFL down/distance/play-type sequences is proposed but unbuilt."
This module is the measured first step, not the Hawkes build.

- Inputs: raw pbp ordered by (`game_id`, `drive`, play sequence) — needs `play_id` ordering;
  `epa` column for success definition.
- Computations: first-order transition `P(play_type_t = pass | play_type_{t−1}, success_{t−1},
  down_t)` for t in 2nd/3rd down; success = `epa > 0`. Coach-era cells: `P(pass | prev was
  successful run)` vs `P(pass | prev failed run)` — the Panthers/Jets contrast.
- Outputs: `data/sequencing.csv` — `coach, era_id, season, down, p_pass_after_succ_run,
  p_pass_after_fail_run, contrast, contrast_se, n_pairs`.
- Acceptance gate: reproduces the slice's week-2 anchors — **Panthers 87.5% pass after successful
  1st-down run vs Jets 0.0%** (2026 wk1–2 window) within **±3pp** (small-n flagged);
  coach-era contrast YoY Spearman ≥ 0.35. Explicitly marked: first-order only; the Hawkes
  marked-point-process extension is P2-adjacent future work, not this module.

### P2 — later (descriptive or research-grade)

**M09 — `tempo_signature.py` — Full tempo distribution.**
Base has `pace_sec_median` and `no_huddle_rate`; this adds the distribution + hurry-up situations.

- Inputs: raw pbp (`game_seconds_remaining`, `no_huddle`, `wp`, `down`), M03.
- Computations: p25/median/p75 of seconds between consecutive offensive plays within drives
  (base's 4–120s filter kept); `hurryup_rate` = no-huddle share when trailing with wp < 0.35 and
  `game_seconds_remaining < 300` in 2nd/4th quarter; coach-era + league z.
- Outputs: `data/tempo.csv` — `coach, era_id, season, pace_p25, pace_med, pace_p75,
  hurryup_rate, n_drives`.
- Acceptance gate: within-coach-era YoY Spearman on `pace_med` **≥ 0.50**; reproduces base
  `pace_sec_median` exactly (regression lock).

**M10 — `adjustment_case_study.py` — Weekly game-plan adjustment quantifier (the Monken template).**
Generalizes tonight's case study (Monken schemed quick game around two missing interior OL
starters vs the #5 pass rush) into a per-game module.

- Inputs: all M01–M09 era outputs + raw pbp by game-week.
- Computations: per (coach, game): tendency vector that week vs season-to-date baseline
  (excluding that week); Mahalanobis distance over [quick_game_rate, playaction_rate,
  avg_air_yards, pace, shotgun_rate]; decomposition into the Δ of each component;
  percentile rank vs all coach-games that season. Context tags: OL injuries, elite opposing
  pass rush (joinable from the OL/pressure lane later — tag fields nullable for now).
- Outputs: `data/adjustments.csv` — `coach, team, season, week, game_id, mahal_dist,
  pct_rank, delta_json, context_tags_json`.
- Acceptance gate: the **Monken 2026-Wk4 (TNF) game must rank in the top decile** of
  `pct_rank` for Δquick_game_rate among 2026 weeks 1–4 — the known adjustment from the
  postmortem must be visible. No invented numbers: the gate is ordinal, not a target value.

**M11 — `dc_pressure_signature.py` — DC pressure profile by down/distance.**
Extends base `def_tendencies` (pressure_proxy, tfl_rate_vs_rush) into situational splits;
all blitz/coverage/shell fields stay NaN per DATA_GAPS — pressure *outcomes* only, labeled.

- Inputs: raw pbp (`qb_dropback`, `sack`, `qb_hit`, `down`, `ydstogo`, `shotgun`), `def_tendencies.csv`.
- Computations: `pressure_proxy` by (down ∈ {1,2,3}, distance bin); early-down pressure;
  pressure vs shotgun / under-center; DC-era aggregates via M03 defense registry; league z.
- Outputs: `data/dc_pressure.csv` — `coach, era_id, season, down, dist_bin, pressure_proxy,
  tfl_rate, n_dropbacks, proxy_label='outcome-not-frequency'`.
- Acceptance gate: DC-era YoY Spearman **≥ 0.40** on early-down pressure proxy; every row carries
  `proxy_label` (honesty audit: grep for rows missing the label = fail).

**M12 — `in_game_aggression.py` — Timeout/challenge usage + halftime adjustment proxy.**
The slice's in-game coaching gap (timeout usage, challenge rates, halftime adjustments — "nothing"
exists). Descriptive first pass; nflverse timeout fields are verified, challenge fields are not —
marked accordingly.

- Inputs: raw pbp (`timeout`, `timeout_team`, `epa`, `posteam`), M03.
- Computations: timeouts used per game by situation (before 2-min warning vs after); 
...[truncated 5218 chars]