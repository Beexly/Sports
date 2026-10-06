# c04 Coaching Module — Buildable Systems

What Phase 3 builds, in priority order. Each system names its research provenance, inputs, outputs, acceptance gate, and what it explicitly does NOT do (non-duplication boundary with c03's core tendency engine).

Shared context: build dir `~/workspace/gse-intelligence-build/coaching/`; existing data `~/workspace/coaching-tendencies/data/pbp_2022..2026.parquet` (extend, never duplicate); tenure mapping `~/workspace/coaching-tendencies/code/coach_tenures.py` (import); reasoning spec `~/workspace/corpus-intelligence/handoff/reasoning-depth-spec.md`; X registry `~/workspace/corpus-intelligence/intake/x-intake-registry.md`.

---

## BS-1 — `coach_risk.py`: per-coach-team-season τ̂ estimation (PRIORITY 1)

**Provenance:** VC-1 (1575, arXiv:2309.00756); CH-1/CH-2/CH-3/CH-4/CH-6 constraints.
**What:** fit τ̂(coach-team-season, region, WP bin) from nflverse 2020–2025 4th-down decisions via the paper's inverse problem — min Hamming loss between observed decisions and τ-optimal decisions over a τ grid in [0.2, 0.8], against a WP-max reference policy computed from the pbp `wp` column (nflverse WP as the risk-neutral "Bot" translation; document as our translation, not nfl4th).
**Inputs:** 4th-down plays (down==4, excl. kneels/spikes) with posteam, coach-team-season key from tenure mapping, region (own/opp half), WP bin, observed action {GO, FGA, PUNT}.
**Outputs:** `tau_hat.csv` — rows per coach-team-season × region × WP bin with τ̂, n_decisions, inclusion flag (≥25 rule per CH-1), fallback level used. Serve function `tau_hat(coach, team, season, region, wp)`.
**Fallback chain:** coach-team-season cell (n≥25) → coach-team pooled → league region-WP cell. Never bare team-season (CH-1).
**Bias adjustment:** subtract the WP-max reference's own region gap from served τ̂_1 − τ̂_2 contrasts (CH-4); document.
**Gate:** team-specific τ̂ rule beats risk-neutral WP-max rule by ≥3 pp Hamming accuracy in the opponent half on 2024–2025 4th downs (1575 brief's gate).
**Does NOT:** rebuild tendency tables (c03's), rebuild tenure mapping (import it).

## BS-2 — `situational_wp.py`: shrunk situational WP engine (PRIORITY 1)

**Provenance:** VC-3 (0207 ADAPT); CH-5/CH-7 constraints; VC-2 (0247 baselines).
**What:** WP surface over state σ=(score_differential, game_seconds_remaining, down, ydstogo, yardline_100, timeouts_remaining, prev_drive_turnover) fit from 2020–2025 pbp drive outcomes, with James–Stein-style shrinkage of sparse situation cells toward coarser-cell priors and blended outcome profiles p̃ = n/(n+50)·p̂ + 50/(n+50)·p̄ (CH-7: our reconstruction, n_0=50 from the brief, tunable).
**Action sets:** v1 {GO, FGA, PUNT} with expected-WP comparison per action (conversion-rate models per state + FG-make model + punt net model, all shrunk the same way). v2 adds {XP, 2PT} using 0247's 51%/98.4% baselines as priors. Timeout action set stubbed (CH-8).
**Complementary-football input:** prev-drive non-scoring turnover × starting position enters the state (S-7; +0.6–1.0 pts/drive per map #4).
**Outputs:** `optimal_action(σ)`, `wp_of_action(σ, a)`, and the full action-WP table per state for audit use.
**Gate:** ≥5% Brier improvement over raw MLE on held-out 2026 drives AND ≥80% agreement with 4th-down-bot logic on a 200-play audit (0207 brief's gate, CH-5: both required).
**Does NOT:** duplicate the drive-start calibration (import as a prior if useful); claim blitz/man/zone inputs (DATA_GAPS honesty).

## BS-3 — `coach_audit.py`: coach-decision audit in WP points (PRIORITY 2)

**Provenance:** S-1 composition; VC-1/VС-3; c04-map gap #5 (closes it).
**What:** for every 4th-down (v1) decision 2022–2026: join observed action → BS-2 optimal action → WP gap = WP(a*) − WP(a_observed); join BS-1 τ̂-predicted action → predicted-vs-actual agreement. Aggregate per coach-team-season: total WP left on table, n_decisions, mean gap, τ̂ context.
**Outputs:** `coach_audit.csv` + weekly audit report generator (the "coach decision audit content" lane both briefs name).
**Gate:** audit reproduces the paper's qualitative ordering on 2021–2022 overlap data (conservative league aggregate; opponent-half heterogeneity) — a replication check, not a performance gate.

## BS-4 — Behavior-conditioned live-WP hook (PRIORITY 2)

**Provenance:** S-1; reasoning-depth-spec L3 causal-chain requirement.
**What:** a function `expected_wp_given_coach(σ, coach)` = WP of the τ̂-predicted action (not the WP-max action) — the behavior-conditioned drive-outcome probability the reasoning spec's L3 checks need. Pure function of BS-1 + BS-2 outputs; no new fitting.
**Gate:** unit-tested identity — when τ̂ predicts the WP-max action, equals BS-2 output exactly; documented divergence otherwise.

## BS-5 — Offseason refit procedure (PRIORITY 3, process not code)

**Provenance:** VC-1 time trend; S-2; CH-2.
**What:** a documented, runnable refit script (`refit_tau.py --seasons 2021-2026`) with the T^(2/3) coach-era forgetting window from the corpus applied to the decision dataset. Run each offseason; τ̂ artifacts versioned by season window.
**Gate:** refit on 2020–2025 completes and the measured 2020–2025 trend is reported (replacing CH-2's extrapolation with measurement).

## Explicitly deferred (not Phase 3)

- Full timeout decision modeling (CH-8) — stub only.
- nfl4th replication — external package, referenced as comparator, not rebuilt.
- Blitz/man/zone/shell tendency inputs — unavailable in nflverse (honesty constraint).
- Micro-edge "coach tendency shift after injuries" experiment — specified-not-built; needs the injury→tendency dataset that doesn't exist yet (module exposes the tendency tables it would consume).
