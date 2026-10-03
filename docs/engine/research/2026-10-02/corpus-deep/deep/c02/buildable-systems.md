# c02 Deep Research — Buildable Systems

**Coordinator:** c02 Phase 2+ · **Date:** 2026-10-02
**Purpose:** the exact systems the `qb-behavior/` module implements, each traceable to verified claims. A system is "buildable" when its inputs exist, its formula is specified, and its validation gate is stated.

---

## System 1 — Pressure-split engine (EPA + INT)

**Implements:** c02 finding #8 (pressure indices proposal — a01 verified); a03 V4 (veto boundary); a06 buildable spec; a02 naming contract.

**CRITICAL CORRECTION (a01 PRESS-7/PRESS-8):** the proposal's Index 1 (`sensitivity` on a *charted* clean/pressured split) is **unbuildable from nflverse** — the nflverse FTN release has no per-play pressure field; pbp has only `qb_hit`; `pbp_participation.was_pressure` is post-season-only. The engine therefore serves a *floor* construction, honestly named, and keeps the spec's charted Index 1 as NULL pending charting. The phase-1 `qb_hit`-over-dropbacks team-week construction is NOT this system (wrong label, wrong grain — PRESS-9).

**Formulas:**
```
dropback grain:  qb_dropback == 1, REG only, exclude qb_kneel/qb_spike
pressured_floor: qb_hit == 1 OR sack == 1          # FLOOR — hurries absent everywhere
clean:           NOT pressured_floor               # contaminated: contains unflagged hurries

sensitivity_epa_floor(qb, grain) = mean(epa | clean) − mean(epa | pressured_floor)
  reported ALWAYS alongside mean(epa | clean) — the clean baseline, never the raw gap alone
  (CH-PRESS-4: raw cross-QB ranking confounds fragility with QB quality)
int_rate_clean / int_rate_pressure_floor: EB-shrunk INT rates per the System 2 ladder, split on pressured_floor
```

**Null guards:** ≥100 pressured dropbacks required (proposal :23); small-sample refusal per a02 (never clamp). The 100-guard overselects QBs in bad situations (CH-PRESS-5) — leaderboard views carry the caveat.

**Attenuation direction (PRESS-9, SIT-4):** the clean cell contains unflagged hurries, so the clean−pressured contrast is biased TOWARD ZERO. Every served contrast is conservative (understated), never overstated. Documentation says this; bands don't pretend otherwise.

**Naming:** `sensitivity_epa_floor`, `int_rate_pressure_floor`, `clean_epa_baseline` — the `_floor` suffix is mandatory (CH-X-1). Never bare "pressure." Never "fragile" — neutral "degradation" (CH-PRESS-10).

**Veto boundary (a03):** this system evaluates QBs under pressure. It NEVER projects sack totals (R² < 0.005). No `predicted_sacks` column exists in any output.

**Confounding note:** report `sensitivity_epa_floor` + `clean_epa_baseline` + `protection_stress` (System 1b) always — the QB's response, his baseline, and his protection context are a triple, never a lone number (S2, CH-PRESS-4).

**Validation:** (1) league-marginal pressure-floor rate reproduces across seasons within tolerance; (2) sensitivity is negative for ≥90% of QBs with n≥100 (pressure hurts — a sign check, not a value pin); (3) no FTN-derived column in engine outputs (rights acceptance, a06).

## System 2 — INT-by-situation with EB shrinkage

**Implements:** a03 INT recipe (display lane) + a06 buildable spec (engine lane); c02-r36 denoised-rate auditor method; occurrence-not-recovery rule.

**Engine lane (T1 nflverse pbp only):**
```
modeled quantity: interception (actual occurrence — never margin, never worthy rate)
cells: pressure_floor × qtr × score_bucket × field_zone × down_distance
  score_bucket: {trail_8+, trail_1_7, tied, lead_1_7, lead_8+}
  field_zone:   {own_1_25, mid, opp_25_21, redzone (yardline_100<=20)}
  down_distance: {early (1-2), late (3-4)} × {short ≤3, mid 4-7, long 8+}
estimation: cell = (w + M·p̂_parent)/(n + M), M=25, ladder league → team → QB, global→downward
floors: no leaf served at n<30 (auto back-off); no QB pressure split below 100 pressured dropbacks
pooling: 3 seasons, regime-change reset on team/coach change (roster-break detection per projection_methods.md)
output: E[INT_rate] per QB×cell + Poisson band; top contributing cells; NULLs where floors unmet
```

**Display lane (T2 FTN, analyst-only):** danger-volume formula `expected_dropbacks × worthy_rate × 0.523` with stated bands; blitz splits via `n_blitzers` join (95% coverage guard); explicit "single-game INTs are noise" labeling. Never enters training exports.

**Recovery-luck purge:** regress realized INT counts toward the 46.3% league recovery mean before comparing danger vs results; model occurrence only. (a06 §EVIDENCE-2)

**Validation:** (a) league-marginal INT rate reproduces the nflverse marginal on a holdout season; (b) backed-off rates monotone-sensible where priors exist (trailing > leading); (c) `resolveFeatureRights`-style pin: no FTN-derived column in any training export.

## System 3 — Trust-target time series

**Implements:** a05 buildable spec; PRFFBall triple (re-implementation); FTN `read_thrown` validation lane.

**Per QB × week × situation (situation ∈ {all, rz, third_down, two_min, trailing, pressure_floor}):**
```
universe: pass_attempt==1 AND receiver non-missing; exclude spikes; throwaways via FTN is_throw_away where joined (else kept, documented)
targets T, distinct receivers N, shares s_i
hhi = Σ s_i² ; n_eff = 1/hhi ; top_share = max s_i ; top2_share = sum of top 2
top_share_cv_4wk = sd/mean of top_share over rolling 4 weeks (trust STABILITY)
bootstrap HHI CI: 1,000 resamples of plays within grain
min denominator: T ≥ 25 per grain (else NULL)
```

**PRFFBall legs (pbp-native):** leg 2 (air-yard share = receiver air yards / team air yards): YES; leg 3 (TPRR): NO (needs routes — charting); leg 1 (first-read): proxy only (deep/short air-yard band + FTN `read_thrown` validation in display lane). Backtest the historical ordering on 2021–2025 with pre-registered conditioning.

**Validation gates (a05, adopted as build gates):** (1) reproduce Dynatyze 21% median WR1 share ±2pp from raw pbp; (2) triple backtest ordering holds; (3) week-to-week autocorrelation of hhi/top_share reported (persistence gate); (4) point-in-time week boundaries (KONTOGRAPH anti-leakage — week w uses plays before week w kickoff).

**Naming:** `hhi_pbp`, `top_share_pbp`, `first_read_proxy_pbp` vs `first_read_charted_ftn` — the `charted`/`pbp_proxy` boundary is never crossed (a05 challenge).

## System 4 — Independent CPOE-style QB grade (c01 interface)

**Status:** OWNED BY C01 (core profile engine). This module does not build it; it specifies the interface it needs.

**Needed from c01:** per-play `E[complete | situation, receiver talent, coverage]` (T1 pbp only, never trained on `cp`/`cpoe`), from which this module computes situational QB_CPOE splits (by pressure-floor, quarter, score bucket) for the reasoning traces. If c01's grade is unavailable, this module serves `cpoe_nflverse_pbp` (the nflverse column, honestly suffixed per a02) as the interim — never the NGS name, never as "the" CPOE.

**Spec reference:** a04 §SKILL-PRIOR-DESIGN (hierarchical logistic + EB receiver/defense effects); validation per a04 Spec B-1 (temporal holdout, beats nflfastR `cp` AUC, debiased ECE ≤ 0.05, slope [0.9,1.1]).

---

## System 1b — Protection Stress (team-week, nflverse-buildable NOW)

**Implements:** proposal Index 2 (a01 PRESS-3/PRESS-4/PRESS-10). The buildable half of the pressure proposal — full PFR pressure taxonomy (hurries INCLUDED), team grain, no charting needed.

**Inputs (nflverse `pfr_advstats`, stat_type="pass", summary_level="week", 2018+):** per team-week (REG only), QB rows summed: `times_pressured`, `times_blitzed`, dropback denominator. **VERIFY FIRST** (PRESS-10): PFR's pressure dedup rule (pressured ≈ hurried+hit+sacked — confirm), PFR's blitz definition, the denominator of `times_pressured_pct`.

**Formula (verbatim from proposal):**
```
pressure_rate_allowed = pressured_tw / dropbacks_tw
blitz_rate_faced      = blitzed_tw / dropbacks_tw
league fit (refit weekly, season-to-date): OLS pressure_rate_allowed ~ α + β·blitz_rate_faced
protection_stress = pressure_rate_allowed − (α̂ + β̂·blitz_rate_faced)   # + = losing 1v1s
```

**Guards:** < 3 team games → NULL; fit pool < 32 team-weeks → NULL for all teams (early-season null). Unweighted OLS is the literal read of "linear"; intercept included; document both choices. Consider a fit-quality gate (|t(β)|>2) — owner call, not in spec.

**Caveats served with the number (CH-PRESS-6/7/8):** blitz rate is endogenous (defenses choose it); QB-fault sacks inflate the line's number; quick-game scheme suppresses both rates. Display-only v1 per the proposal (PRESS-5) — "No pick-engine input in v1."

**Build order position:** after the shared I/O library; needs a `pfr_advstats` loader (new — confirm the local venv can fetch it).

## Non-goals (explicitly out of v1 — see S7)

TTT, true aggressiveness, cushion/separation, blitz-conditioned engine splits, hurry-inclusive pressure, Dirichlet-multinomial smoothing, first-read-by-coverage-shell, aggressiveness-by-game-state. Each is named in syntheses.md S7 with its unblock condition.

## Build order (dependency order)

1. **Shared I/O + grain library** (pbp + FTN join, REG filters, dropback grain, situation cells, point-in-time weeking) — everything depends on this.
2. **System 3** (trust-target) — no dependencies beyond I/O; validates the target universe for everything else.
3. **System 1** (pressure splits, floor construction) — needs the dropback grain + pressure-floor definition.
4. **System 1b** (Protection Stress) — needs the `pfr_advstats` loader; independent of 1–3.
5. **System 2** (INT situational) — needs System 1's pressure-floor + the EB ladder.
6. **System 4 interface** — c01 dependency; interim `cpoe_nflverse_pbp` fallback.

---

## Build status (2026-10-02, c02 Phase 3 complete)

All four buildable systems are implemented in `~/workspace/gse-intelligence-build/qb-behavior/`:

| System | Code | Data | Status |
|---|---|---|---|
| Shared I/O + grains | `src/qb_behavior/situational/cells.py` + `specs.py` (SplitSpec per c01 protocol) | — | DONE |
| System 3 trust-target | `situational/trust.py` | `data/trust_weekly.csv` (1,940 rows, 2022–2026) | DONE |
| System 1 pressure splits (floor) | `situational/serve.py` + `specs.PressureFloorSplit` | `data/qb_weekly.csv` + `qb_season.csv` | DONE |
| System 1b Protection Stress | `situational/protection.py` | `data/protection_stress.csv` (4,350 rows, 2018–2026) | DONE |
| System 2 INT situational | `situational/serve.py` (EB ladder) | `data/int_cells.csv` (302,282 rows) | DONE |
| Provider (ABC) | `situational/provider.py` — UNPARKS `get_pressure_splits` | `data/meta.csv` | DONE |

**Verification vs the research:**
- a01's charted-Index-1 verdict honored: the served `sensitivity_epa_floor` is the
  honest T1 floor construction, never the spec's charted index (which stays NULL).
- a03's veto honored: no `predicted_sacks` column exists anywhere (test-pinned).
- a06's rights gate honored: engine tables are T1 nflverse-pbp only; FTN/NGS absent.
- a02's naming contract honored: `_floor`/`_pbp` suffixes; TTT never emitted.
- a05's validation gates implemented: T≥25 guard, bootstrap HHI CIs, point-in-time
  weeking, CV stability + autocorrelation persistence gates.
- a04's CPOE discipline: served as `cpoe_nflverse_pbp` (nflverse column, honestly
  suffixed); skill-prior CPOE remains c01's lane (System 4 interface).

**Corrections applied during the build (autonomous, per Garrett's order):**
1. `season_key_for` capped at the latest charted week (was serving baseline for
   future-week queries).
2. Protection Stress `< 3 team games` guard now counts cumulative games to date
   (was counting games in the single team-week, always 1 — every team nulled).
3. c01 `ProfileEngine._ensure_name_map` nondeterminism fixed: `.unique()` collapsed
   each (id, name) to one vote, so a 1-season variant ("Aa.Rodgers") tied the
   17-season canonical ("A.Rodgers") 1-1. Now counts occurrences.
4. `cpoe` added to the build via `ProfileEngine(extra_columns=["cpoe"])` (pruned
   from c01's default ENGINE_COLUMNS).

**Tests:** 152 in `qb-behavior/tests/` (57 c01 + 95 c02), all green.
Real-data cross-check: Watson's computed INT splits (clean 1.03%, pressured 4.43%)
land inside the reasoning spec §6.1 fixture bands (0.8–3.2% / 3–5%).

**Remaining gaps (unchanged from S7):** charted pressure (needs licensed charting);
blitz-conditioned engine splits (founder rights decision); TTT/aggressiveness/
cushion/separation (NGS, founder-gated); hurry-inclusive pressure (no source).
