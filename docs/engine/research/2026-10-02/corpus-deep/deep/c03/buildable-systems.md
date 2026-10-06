# Buildable Systems — Corpus Slice c03, Coaching Lane (Phase 2)

**Written:** 2026-10-02 · **Coordinator synthesis** of working report A6 (`deep/c03/working/A6-buildable-systems.md`) + A2's regime-detector ranking (`A2-regime-shift-specs.md`).
**Build target:** `~/workspace/gse-intelligence-build/coaching/` — extends `~/workspace/coaching-tendencies/` (import/extend, never duplicate).
**Non-negotiable boundaries:** base pipeline `compute_tendencies.py` already computes team-season pass rates by down/distance/field, shotgun/no-huddle rates, go4th_rate, two_pt_rate, air-yards distribution, pace, pressure proxies. New modules read its CSVs or reuse its loader and add computations the base does not have. `coach_tenures.py` (~10 coaches) is a seed; M03 expands it to all 32 teams. c04 owns the 1575 τ inverse-optimization and situational risk modules; this engine owns coach-era tendency vectors and tenure mapping — they meet at §3's interface contract. Honesty rule (DATA_GAPS.md): proxies are labeled as proxies; blitz/coverage/shell/motion/time-to-throw stay charting-gaps. **No wiring, calibration, or published outputs until Garrett approves** (program §6) — research data only (CSVs + schemas).

---

## 1. Module list

Shared infrastructure (build once, before P0): `coaching/common.py` — `neutral_mask(wp)` (0.35 ≤ wp ≤ 0.65), `empbayes(p, n)` with k = league-median cell n, `league_expected_rate(season, down, ydstogo_bin, script)` computed leave-one-team-out, safe-div, half-split helper. All modules share the pbp loader extended with `play_action`, `epa`, `timeout`, `timeout_team`, `play_id`, `drive`. Data: `~/workspace/coaching-tendencies/data/pbp_2022.parquet` … `pbp_2026.parquet` (2026 = weeks 1–3 as of 2026-10-01; all 2026 rows small-sample flagged).

### P0 — build first (measured numbers + replication recipes exist)

**M01 — `neutral_script_proe.py` — Early-down pass rate over expectation (PROE), neutral script.**
The slice's lead buildable estimand (the single biggest named-lane gap).
- Inputs: raw pbp + `off_tendencies.csv` (joins only — PROE computed fresh because the base has no neutral-script column).
- Computations: neutral mask 0.35≤wp≤0.65, downs 1–2, scrimmage plays only (no kneels/spikes/aborted); league expected rate per (season, down, ydstogo_bin ∈ {≤3,4–7,≥8}) with the target team-season **excluded**; `PROE_raw = actual − E`, plays-weighted to coach-era via M03; EB-shrink `PROE = PROE_raw·n/(n+k)`; SE = √(p̂(1−p̂)/n), 95% CI per cell.
- Outputs: `data/proe_early_neutral.csv` — `coach, team, season, era_id, pass_rate_actual, pass_rate_expected, proe_raw, proe, proe_se, n_plays, attribution_confidence`.
- Acceptance gate: (1) reproduces the slice's measured anchors — 2026 league 2nd-&-1 pass rate **32.7%** vs 2025 **20.6%** — within ±1pp each; (2) YoY Spearman of coach-era `proe` ≥ 0.50 across 2022–2025 stable coach-eras (n ≥ 200 neutral early-down plays per era-season).

**M02 — `coordinator_fingerprint.py` — Coach-era tendency vector + YoY deltas.**
Serves the program's "Tendency evolution" row.
- Inputs: `off_tendencies.csv`, `coach_offense.csv`, M01, M03.
- Computations: per coach-era (coach × continuous team-season block), plays-weighted aggregate of proe_early_neutral, pass_rate_rz, shotgun_rate, no_huddle_rate, pace_sec_median, quick_game_rate, avg_air_yards, deep_rate, two_pt_rate, playaction_rate, script_beta, go4th_rate (descriptive only — τ replaces it, see §3); league z-score each metric within season; YoY Δ within the same era, never across an M04 regime boundary; nearest-neighbor self-consistency (own prior season should be nearest).
- Outputs: `data/coach_fingerprints.csv` — `coach, era_id, team, season, n_plays, <raw>, <z>, yoy_delta_json, nearest_neighbor_own_prior (0/1)`; `data/fingerprint_deltas.csv`.
- Acceptance gate: ≥75% of stable coach-eras have their own prior season as nearest neighbor (2022–2025, n ≥ 400 plays); within-coach MAD of Δ < across-coach MAD at p < 0.05 (permutation). If coaches aren't more like themselves than each other, the vector is noise — nothing downstream consumes it.

**M03 — `tenure_registry.py` — Full 32-team coach-era mapping (2022–2026).**
The locate-first gate: mark what we don't know, don't fill it.
- Inputs: web-verified HC/OC/DC/playcaller per team × season (manual research; source URLs per row — provenance is part of the schema).
- Computations: contiguous (coach, team) blocks → `era_id = coach|team|start-end`; `attribution_confidence` ∈ {1 sole caller, 2 shared (0.5 downweight in era aggregates), 3 unknown (excluded from coach-era aggregates, retained in team tables)}; HC-calls-plays vs HC-delegates flags; mid-season firings split the season (`era_id` suffix a/b).
- Outputs: `data/tenures/offense.csv`, `data/tenures/defense.csv` — `coach, role {HC,OC,DC}, team, season, era_id, playcaller {0,1}, attribution_confidence, note, source_url, verified_date`.
- Acceptance gate: 160/160 offense + 160/160 defense team-seasons (32×5); every confidence-2/3 row has a non-empty note; join audit — zero orphans either direction with `off_tendencies.csv`.

**M04 — `regime_change_gate.py` — Coordinator-change regime gating.**
Implements A2's #1 buildable detector (0598 permutation two-sample regime gate, Variant B) + deterministic tenure boundaries.
- Inputs: M01–M03 outputs, raw pbp.
- Computations: (1) deterministic boundaries from M03 — always a regime start; (2) 0598-style empirical detector: permutation two-sample test on [proe, pace_z, shotgun_z, no_huddle_z] between first-half and second-half season windows per coach-era-season, p < 0.05 (10,000 perms), reporting p + effect size (mean |Δz|); (3) uncertainty flag: `low_sample=1` when n_plays < 200 neutral early-down plays or first season with a new team — CI width must be ≥1.5× league median (the 2129 analog: uncertainty rises on regime shift); (4) null calibration on 2022–2025 stable eras.
- Outputs: `data/regime_flags.csv` — `era_id, season, regime_start {0,1}, detection {tenure, empirical, low_sample}, p_value, effect_size, ci_width_ratio`.
- Acceptance gate: flags ≥80% of known HC/OC-change seasons (M03 ground truth, 2022–2025); false-flag rate in [2%, 25%] on stable eras (0598's [2%,10%] widened for small n — stated as loosened, not hidden); 100% of new-playcaller era-seasons carry `low_sample=1` until n ≥ 200.

**Build order within P0:** M03 (tenures) → M01 (PROE) → M04 (regime gate) → M02 (fingerprint). M03 must precede the M01/M02 era joins.

### P1 — next (buildable, thinner slice evidence)

**M05 — `red_zone_mix.py` — Red-zone run/pass mix + RZ PROE.**
Inputs: raw pbp (yardline_100 ≤ 20 exact per DATA_GAPS §7), M03. Computations: `rz_pass_rate`, LOYO league-expected RZ pass rate per (season, down, ydstogo_bin), `rz_proe` raw + EB-shrunk, goal-to-go (≤10) split, coach-era aggregates. Outputs: `data/rz_mix.csv`. Gate: YoY Spearman of coach-era `rz_proe` ≥ 0.40 (2022–2025, n ≥ 60 RZ plays); reproduces base `pass_rate_rz` exactly (regression lock).

**M06 — `script_elasticity.py` — Playcalling sensitivity to game script (β_script).**
Complement of M01's neutral window. Inputs: raw pbp, M03. Computations: per coach-era, bin early-down plays into 10 WP bins; OLS of pass_rate on bin-center WP (plays-weighted); β_script = slope; β_rel = β_script − β_league(season); SE via 200 game-level bootstraps. Restricted to 1st–2nd down, neutral field. Outputs: `data/script_elasticity.csv`. Gate: YoY correlation of `beta_rel` ≥ 0.45 on stable eras; league-median β reported descriptively (never gate on an invented number).

**M07 — `playaction_screen.py` — Play-action rate by script + shotgun/under-center splits.**
nflverse *has* `play_action` and `shotgun` (verified); motion/RPO do NOT exist in nflverse (week-2 snapshots LAC 84.3% / WAS 14.7% stay intake-only). Inputs: raw pbp, M03. Computations: `pa_rate_neutral` (0.35≤wp≤0.65, 1st down), `pa_rate_all`, `under_center_rate = 1 − shotgun_rate`, `pa_by_script` (trailing/neutral/leading), coach-era + league z. Outputs: `data/playaction.csv`. Gate: league season PA rate within ±0.5pp of nflverse descriptive; TEN 2026 no_huddle_rate within ±2pp of the 22.4% week-2 snapshot.

**M08 — `sequencing_lite.py` — First-order play-type sequencing (honest small step toward the unbuilt Hawkes lane).**
Inputs: raw pbp ordered by (game_id, drive, play_id); `epa` for success. Computations: P(pass_t | play_type_{t−1}, success_{t−1}, down_t) for 2nd/3rd down; success = epa > 0; coach-era cells: P(pass | prev successful run) vs P(pass | prev failed run) — the Panthers/Jets contrast. Outputs: `data/sequencing.csv`. Gate: reproduces the week-2 anchors (Panthers 87.5% / Jets 0.0%, 2026 wk1–2 window) within ±3pp (small-n flagged); coach-era contrast YoY Spearman ≥ 0.35. First-order only; the Hawkes marked-point-process is future work.

### P2 — later (descriptive or research-grade)

**M09 — `tempo_signature.py` — Full tempo distribution.** Base has median + no-huddle; this adds p25/p75 of inter-play seconds (4–120s filter) and `hurryup_rate` (no-huddle when trailing, wp<0.35, <300s left in 2nd/4th quarter). Outputs: `data/tempo.csv`. Gate: YoY Spearman on pace_med ≥ 0.50; reproduces base `pace_sec_median` exactly.

**M10 — `adjustment_case_study.py` — Weekly game-plan adjustment quantifier (the Monken template).** Per (coach, game): tendency vector that week vs season-to-date baseline (excluding that week); Mahalanobis distance over [quick_game_rate, playaction_rate, avg_air_yards, pace, shotgun_rate]; Δ decomposition; percentile rank vs all coach-games that season; nullable context tags (OL injuries, elite opposing pass rush — joinable from the OL/pressure lane later). Outputs: `data/adjustments.csv`. Gate (ordinal, no invented numbers): the Monken 2026-Wk4 (TNF) game must rank top-decile in Δquick_game_rate pct_rank among 2026 weeks 1–4 — the postmortem's known adjustment must be visible.

**M11 — `dc_pressure_signature.py` — DC pressure profile by down/distance.** Extends base def_tendencies into situational splits; blitz/coverage/shell stay NaN (DATA_GAPS) — pressure *outcomes* only, labeled. Outputs: `data/dc_pressure.csv` with `proxy_label='outcome-not-frequency'`. Gate: DC-era YoY Spearman ≥ 0.40 on early-down pressure proxy; honesty audit: every row carries the label (grep-missing = fail).

**M12 — `in_game_aggression.py` — Timeout/challenge usage + halftime adjustment proxy.** The slice's in-game coaching gap ("nothing" exists). Descriptive first pass; nflverse timeout fields verified, challenge fields not — marked accordingly. Inputs: raw pbp (`timeout`, `timeout_team`, `epa`, `posteam`), M03. Computations: timeouts used per game by situation (before vs after 2-min warning); challenge-rate where fields exist (else NaN + label); halftime adjustment proxy: 2nd-half tendency Δ vs 1st-half per coach-game (delta on the M02 vector components). Gate: descriptive module — no stability gate until two full seasons exist; all challenge columns labeled `unverified-field` where the pbp column is absent.

---

## 2. Sequenced follow-ons (A2's ranked detectors, build after their gates are earned)

| Detector | From | When | Function signature |
|----------|------|------|--------------------|
| 1888 AdaER conflict audit | A2 rank #2 | once a champion/challenger weekly GBM refit pipeline exists; paper's protect-rule inverted (quarantine pre-change high-s games ×0.25); drop the balancing half if ECE rises > 0.005 | `score_buffer_interference(champion, new_week_games, buffer, target)` → s(m) per game; `build_regime_aware_refit_set(...)` → (refit_set, RegimeReport{conflict_teams, flag ≥50% top-20 conflicts from one regime, ece_delta}) |
| 1905 ADKL z^t drift | A2 rank #3 | ~3 weeks; meta-train DeepSets ψ_η on 2015–2024 team-seasons first; gate: ≥0.01 Brier vs league-average prior on new-regime first-4-game predictions | `train_regime_encoder(team_seasons, ...)` → encoder; `encode_team_regime(team_games)` → z^t; `regime_drift_zscore(z_history, trailing=16, threshold=3.0)` → (z, flag); `label_drift_direction(z_new, prototype_bank)` → archetype label |
| 2129 NIG epistemic monitor | A2 rank #4 | after the TSFM backbone exists + calibration audit; hard REJECT if epistemic doesn't rise on held-out regime games | `forecast_with_epistemic(team_week_context, head)` → (m, aleatoric, epistemic); `epistemic_regime_flag(epistemic_series, mult=2.0, median_window=8, confirm_weeks=2)` → bool |

---

## 3. c04 interface contract (shared build dir)

**Provides → c04 (c04 consumes, never recomputes):**
- `data/coach_fingerprints.csv` (M02) — coach-era tendency vectors
- `data/rz_mix.csv` (M05) — red-zone mix per coach-era
- `data/script_elasticity.csv` (M06) — playcalling script elasticity per coach-era
- `data/tenures/{offense,defense}.csv` (M03) — the attribution mapping c04's τ estimation joins against
- `data/regime_flags.csv` (M04) — c04 estimates τ only on stable-regime samples, and only on cells meeting 1575's own gate: **≥25 observed 4th-down decisions per region per WP range** (A1-V18)

**Consumes ← c04 (read-only; this engine never recomputes τ):**
- `coaching/tau/tau.csv` — `coach, team, season, region {own_half, opp_half}, wp_bin, tau, tau_ci_low, tau_ci_high, n_decisions`
- **Rule:** τ replaces raw `go4th_rate` in any 4th-down decision context — never combined, never averaged. `go4th_rate` stays as a descriptive column only (the slice's NULL r=−0.014 arbitrates against it as a decision feature).
- c04 must ship its annual refit cadence with the file (stale τ̂ underrates current aggression per 1575's own trend).

**Cross-cutting rules:** every module exposes `compute()`, `save()`, `gate()`; one-line-run acceptance; all data research-only until Garrett approves wiring; every file carries a provenance header naming the research it implements.
