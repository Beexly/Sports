# MIMO self-audit loop ledger

- **2026-09-19T08:00:10Z** overnight loop · suite ok kills=1 K3 · L11 scorecard harness shipped
  - **`v530_l11_scorecard_harness.py` → `out/v530_l11_scorecard_draft.json`** (DRAFT only — not a bump):
    | Arm | n | Brier | realised bits | ECE10 |
    |---|---:|---:|---:|---:|
    | **marketFairProb** | 741 | **0.225** | **+0.075** | **0.024** |
    | v530 candidate mfp→indep→rp | 1826 | 0.236 | +0.031 | 0.049 |
    | independentTrueProb | 1507 | 0.246 | −0.016 | 0.073 |
    | rankingP | 1535 | 0.250 | −0.021 | 0.076 |
    | confidence/100 | 2550 | 0.267 | **−0.081** | 0.102 |
    - Paired mfp vs conf on same rows: Brier **0.225 vs 0.275**, Δ(conf−mfp)=**+0.049**
    - Law 11 ML baseline **0.211** remains the independent-ML bar; this export is board-path evidence only
    - **Keep rule:** founder L11 on PICKS-H1 + MODEL_VERSION path for scoring weight zeros; display/rank on mfp is withhold-only-safe
  - PASS census refresh: still **EXPORT_STALE_CENSUS_INCOMPLETE**
  - CLV refresh: strict clears still **TOTALS_first / MLB_TOTAL / type:TOTAL** only; all-denom none
  - Suite True. Push + bus this tick (founder authorized overnight push).

- **2026-09-19T07:40:18Z** suite ok kills=1 K3 0.7705; IMPLEMENT sigma ladder + totals e-process + hex32 residual
  - **A Sigma ladder** (`out/loop_implement_0739_sigma_eprocess.json`) on nflverse REG n=6967:
    - Weeks 1–4: **σ=14.36** n=1669 · home cover ex-push **0.482**
    - Weeks 5–18: **σ=14.69** n=5298 · home cover **0.492**
    - Fleet external claim (σ 13.8 early / 13.2 late) **NOT reproduced** on this file — Mimo OBS takes precedence
    - |Δσ|=**0.32 &lt; 0.5** → single residual σ still OK for UQ captions; market remains ranking authority
  - **B Totals e-process refresh:** n=236 with p/m/y · best ε=0.25 **M_max=5.01** · all eps **INSUFFICIENT_no_reject** · **skill_claim REJECTED_not_yet** (Ville threshold 20). Logit-pool TOTALS **MODEL_ADDS_INFORMATION** remains spine.
  - **C Hex32 residual:** resolved **2065/2087 = 0.9895** · newly +25 · **unresolved_total 22** visible
  - Suite re-run True.

- **2026-09-19T07:29Z FLEET DIRECTIVE SHIFT — Mimo Tasks 1–3 complete**
  - **T1 PASS-veto census v3** (`pass_veto_census_v3.py` → `out/pass_veto_census_v3.json`):
    - Export n=3261 · published pending **220** · **export_has_edge_fields=false**
    - Verdict **EXPORT_STALE_CENSUS_INCOMPLETE** — **cannot claim 100% clear**
    - Proxy pending trueProb &lt; mfp **n=3** (not a substitute for decision/expectedClv)
    - Ops: re-export board-export v3 then re-run census. Product rule still never-mint PASS / expectedClv&lt;0.
  - **T2 Dual-denominator CLV** (`clv_evaluation.py` → `out/clv_evaluation.json`), break-even 0.524:
    | Cell | CLV_strict n | CLV_all n | MATCHED |
    |---|---:|---:|---:|
    | ALL export | **0.406** (911) | 0.229 (1616) | 705 |
    | TOTALS first | **0.567** (473) | 0.424 (632) | 159 |
    | MLB_TOTAL | **0.599** (372) | 0.442 (505) | 133 |
    | NFL_TOTAL | 0.727 (11) **thin** | 0.667 (12) | 1 |
    | type SPREAD | 0.302 (248) | 0.101 (739) | 491 |
    | type ML | **0.142** (190) | 0.110 (245) | 55 |
    - **Strict ≥0.524 n≥30:** TOTALS_first, MLB_TOTAL, type:TOTAL only. **ALL-denom clears: none.**
    - Law 10 surfaces written; **no engine-wide CLV skill claim**. Totals-first product narrative stands.
  - **T3 Composite refit spec finalized** `docs/ops/stats-lane/composite_refit_v530_design.json`:
    - consensusScore **0**, marketDepthScore **0**, confidence **0** for public ranking
    - Primary key **marketFairProb** when books≥2; fallback de-vigged market p
    - `CALIBRATION_ADJUSTMENTS_ENABLED=false` until founder; MODEL_VERSION **v5.2.7 frozen**
  - Suite re-run True. Commit + bus this shift.

- **2026-09-19T07:20:43Z** suite ok kills=1 K3 0.7705; IMPLEMENT totals path + cold-start Brier + coach registration
  - **A Totals CRPS density:** n=683 settled TOTAL rows on export; **predictedMeanMargin = 0/683** → model-residual CRPS **NOT RUN** (export gap). Baseline residual CRPS on actualMargin **2.59**. Kill not evaluable until export carries predicted total. **Positive path:** `out/totals_binary_mfp_score.json` — TOTALS decided with marketFairProb scored on binary Brier/bits; logit-pool **MODEL_ADDS_INFORMATION** stands; e-process M_max **4.43&lt;20** → **no Ville skill language**.
  - **B Cold-start prior vs market ML:** paired n=**543**; prior-EPA p Brier **0.247** vs market ML **0.207** → **PRIOR_LOSES_TO_MARKET_ML**. Law-11 baseline **0.211** stands (this subset market even tighter). Kill **not** met — independent fair p stays research.
  - **C Coach go-rate:** **CANDIDATE_REGISTERED_NOT_WIRED** mean Spearman **0.428**; wire only after holdout Brier ≥0.002 n≥272 + factors YAML order gate.
  - Suite re-run **True**. Ops still owed: board-export v3 (passVeto + **predictedTotal** for CRPS path).

- **2026-09-19T07:20Z FLEET SYNTHESIS INTAKE (Grok walk-forward + Hermes README)**
  - **EXTERNAL claims recorded, not Mimo OBS** (`fleet_synthesis_intake.py` → `out/fleet_synthesis_mimo_2026-09-19.json`):
    - Grok 2019–2025 CRPS: market close **7.109** · DAVE k=8 **7.500** · play-pooled EPA **7.573** · Elo **7.576** · last-year **7.778**; DAVE ρ **0.349** vs play-pooled **0.323**
    - **Boundary A (Grok):** DAVE beats Elo/play-pooled but **loses to market** → **Rung-2 team-strength prior only; NOT a spread μ addend**
    - **Boundary B (Hermes):** `NFL_EPA_MIN_GAMES=4` still returns null until ≥4 games; bridge **does not auto-bypass** — founder-gated v5.3.0 only
    - **PASS veto = honesty standard** (never mint `decision:PASS` / `expectedClv<0`), **not** a win-rate booster; NFL PASS n=20 CI wide — no rate inflation claim
    - **MLB SPEAK 0.400 n=90 inverted** (Neon census) — conjunction gates / product **do not trust MLB decision tiers** until composite refit
    - Quarantined multi-season script (home/away orientation bug) — **do not reuse**
  - **Mimo independent walk-forward on owned games.csv** (REG, n=**6967** with spread; point RMSE/MAE, **not** relabeled as CRPS):
    - **Market +spread_line** RMSE **13.19** Spearman **0.429** — **efficient benchmark (wins)**
    - DAVE-or-prior RMSE **14.08** ρ **0.317** · Elo margin-proxy RMSE **14.16** ρ **0.308** · prior-EPA RMSE **14.27** ρ **0.281**
    - Ordering: **market < dave_or_prior < elo_proxy < prior_epa** — directionally matches Grok (market best; DAVE ≥ Elo as research prior)
    - Leak note: full-season current PBP in DAVE blend labeled **LEAKY** when used mid-season; cold-start path = prior-only
  - **Boundaries locked into stats-lane doctrine (no gate flips):**
    1. Public/rank p stays **marketFairProb** when priced (H3 bits +0.075)
    2. Law 11 baseline **market ML Brier 0.211** n=5051
    3. DAVE/adj-EPA/Elo = research until as-of Brier beats market ML −0.002 n≥272
    4. PASS never mint; export v3 census still owed by ops
    5. Confidence display-only; depth display-only; K3 product No-band; weather/rest UQ captions OK where OOT≥0.85

- **2026-09-19T07:02:03Z** suite ok kills=1 K3 0.7705; IMPLEMENT ranking shadow + rest/weather UQ + hex32 retry
  - **Ranking shadow (same-row, no MODEL_VERSION bump)** `out/ranking_shadow_duel.json`:
    - marketFairProb top-decile hit **0.912** [~0.84,0.95] n=689 · spread top−bottom **0.588**
    - rankingP top **0.696** n=1483 · confidence/100 top **0.517** n=2380 (spread 0.088)
    - trueProb−mfp top **0.421** n=389 (negative spread — not a board key)
    - **Winner by top-decile hit (n≥100): marketFairProb.** Positive path: sort cascade mfp → rankingP independent → confidence display-only. Depth stays display-only (I1 kill −0.80 Spearman).
  - **Rest/weather K3 replacement** `out/rest_weather_k3_replacement.json`:
    - **16/16 cells OOT≥0.85** (60/40 split, fail-closed qhat) on nflverse REG: roof dome/outdoor, wind lt5/5–15/ge15, rest home+3/bal/away+3, totals cells — coverage **0.887–0.955**
    - Label these **market-residual UQ bands** (|actual − +spread_line| / total_line), **not** engine edge. **K3 product stays NO_BAND.**
    - Replaces killed K3 product bands as the honest NFL margin/total UQ caption path.
  - **Hex32 retry** `resolve_hex32_retry.mjs`: newly **+25**, resolved **2065/2087 = 0.9895** (was 0.9775); **22** UNRESOLVED_AFTER_RETRY remain.
  - Weather props e-process: n_games 7276, pool FIRE_NOTHING, Mmax 1.01 — no skill claim.
  - MIMO-6 re-run: NFL still UNDERPOWERED on board; MLB/NCAAF BLOCK_market_fixed_offset; rolling coverage 0.495 fail-closed note stands.
  - Standing OOT: alerts=6, books_cells=4.
  - Suite re-run True. Ops still owed: board-export v3 for passVeto census.

- **2026-09-19T07:00Z ERRATA + re-measure (spread sign)**
  - Measured nflverse `games.csv` convention: spearman(home_margin, spread_line)=**+0.43**; home wins **~68%** when spread_line>0 ⇒ **positive = home favored**. First-pass used −spread and inverted the market (market Brier artifact ~0.35, market RMSE artifact 18.3).
  - Corrected market: Phi(+spread/σ) Brier **~0.212** (n=6,952); market margin RMSE **12.44** on prior-duel sample.
  - **Re-measured prior-only cold-start:** RMSE **15.13** vs market **12.44** (n=544) → **PRIOR_ONLY_NOT_BETTER_THAN_MARKET**. Kill line for ranking authority NOT met. Positive path remains: marketFairProb when priced; adj-EPA/prior research-only until clean as-of Brier duel vs **market ML 0.211**.
  - H1 unchanged after ML baseline: Elo 0.233 still loses to market ML 0.211.

- **2026-09-19T06:51:37Z** suite ok kills=1 K3 0.77; GLM5.3 fleet plan integrated without fabricating Neon:
  - **Top replacement re-affirmed:** weather/roof/rest Mondrian UQ + K3 No-band + marketFairProb public p + Law-11 market ML Brier 0.211
  - **NEW instrument `epa_prior_bridge_turnover.py`** (Mimo independent on nflverse):
    - Prior-season net EPA cold-start (N=0) path measured; **superseded by 07:00Z errata** (sign fix)
    - Turnover: team_week regressed occurrence shipped; external oppadj `turnover_luck_2026.csv` 32 rows = **fleet artifact**
    - Decision-tier CSV = **EXTERNAL_CLAIM_FLEET_DB** (Law 7: Mimo does not query Neon)
    - Week 3 slate CSV = research artifact only
  - Suite re-run True
  - **Ops still owed:** board-export v3 for passVeto census

- **2026-09-19T06:24:27Z** suite ok kills=1 K3 0.77; IMPLEMENT battery multi-path (user: SOLUTIONS not one):
  - H1 CORRECTED: Elo 0.233 loses to market ML 0.211 (Phi(spread) misspecified — never treat as market)
  - H3: marketFairProb realised bits +0.075 ONLY positive; confidence/100 −0.081
  - H8: market ML Brier 0.211 n=5051 = frozen scorecard baseline
  - I1 DEPTH kill: bookmakerCount Spearman −0.80 vs mfp +0.90 → DISPLAY_ONLY
  - I3 coach go-rate stickiness mean r=0.428 → CANDIDATE not wired
  - I4 Shin Δ≈2e-5 → PROPORTIONAL_STAYS
  - I5 CLV dual denom: pooled R1 0.231 / R4 0.407; MLB TOTAL R4 0.598 n=366 named cell only
  - CODE: tweedie-aci + conformal-margin-set fail-closed +Inf (warmup point band); compute.ts marketAnchoredDual
  - Tests: tweenie-aci + conformal-margin-set **15/15 PASS** on signal-arch-typecheck
  - Suite re-run True; self_audit_loop ok; loop_implement_replacements.py artifacts shipped
  - Ops still owed: board-export v3 re-export (passVeto fields live in script, not on disk export)

- **2026-09-19T04:36:43.937168+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T04:38:33.905104+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **implement 2026-09-18T23:40:33.7976849-05:00** hex32 retry + totals eps sweep + weather promotion artifact

- **2026-09-19T04:40:50.255661+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet- **2026-09-19T04:40:50Z** kills=1 K3_band 0.77; hex32 retry 2040?2065/2087 (98.95%); totals eps best 0.25 M_max=5.01 no reject; weather 6/6 PROMOTE; ML 0.142 gated

- **2026-09-19T05:05:48.666238+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T05:21:42.033152+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T05:34:44.735038+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T05:48:05.538421+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T06:02:08.146774+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T06:24:27.993885+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T06:51:37.078988+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T07:02:03.492904+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T07:20:43.929775+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T07:40:18.003182+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet
- **2026-09-19T08:00:10.651744+00:00** suite exits=[0, 0, 0, 0, 0, 0] kills=1 actions=6 score={"k3_best_cov": 0.7704918032786885, "hex32_resolve_rate": 0.97747963584092, "ml_clv_nonpush": 0.14210526315789473, "logit_pool_totals": "MODEL_ADDS_INFORMATION", "logit_pool_ml": "FIRE_NOTHING", "weather_bins_ge_085": "6/6", "eprocess_totals_Mmax": 4.430387116702636}
  - KILL {'metric': 'K3_margin_band', 'value': 0.7704918032786885, 'line': 0.85, 'verdict': 'KILL_band_model'}
  - NEXT K3 OOT < 0.85 → use weather/roof Mondrian + sport margin densities; No-band label on K3 product-market residuals
  - NEXT hex32 resolve 0.9775 < 1.0 → retry remaining UNRESOLVED_NO_SCOREBOARD_MATCH via date±2 and name aliases
  - NEXT ML CLV 0.142 < 0.50 → e-process + logit-pool gates; totals-first product; no ML beat-close claim
  - NEXT totals add info vs market (logit-pool) → advance totals density/CRPS path + e-process accumulation; keep kill lines
  - NEXT weather Mondrian all bins OOT>=0.85 → promote weather/roof residual bands as NFL margin UQ replacement
  - NEXT totals e-process M_max=4.430387116702636 < 20 → accumulate more settled totals + shrinkage eps sweep; formal Ville test — do not claim skill yet