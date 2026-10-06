# Buildable Systems — Corpus Slice C10, HALF B (r31–r60)

Concrete build specs. Each has: inputs, outputs, exact equations/gates from the files,
numeric acceptance gates, and provenance. INFERENCE is marked. REJECT-verdict methods
stay rejected (none in this half; 1631 noted as excluded).

---

## B1. α-governor drawdown overlay (1749)

- **Inputs:** weekly bankroll B_t, running maximum M_t, unconstrained Kelly stake f*_t.
- **Outputs:** scaled stake π_t · f*_t.
- **Equation:** π = 1 − α/d_t, d_t = B_t/M_t, α = 0.7. (Ledger's discrete-time
  reconstruction of the paper's continuous-time Azéma–Yor rule; the paper proves
  existence/uniqueness/turnpike only.)
- **Acceptance gate:** on 2023–2025 NFL walk-forward backtest — min B_t/M_t ≥ α − 0.02
  AND terminal log growth ≥ 80% of unconstrained. (ledger 1749:50)
- **Provenance:** `arxiv-deep/1749-numeraire-property-drawdown-constrained-growth-optimal.md:44,47,50`.
  Composes with SESSION_2 κ=0.25 (S1).
- **INFERENCE:** GSE has no drawdown layer today (ledger's map read) — this is the first
  one, and it's ~20 lines.

## B2. Two-layer CVaR stake sizer (2143)

- **Inputs:** market model F (game-outcome distribution), posterior over engine's edge
  estimate p (beta-binomial on rolling 8-week Brier history).
- **Outputs:** stake sized under CVaR_ε(inner) ⊗ CVaR_δ(outer) composite risk.
- **Equations:** inner CVaR_ε over outcomes given F; outer CVaR_δ over the p-posterior.
  Use **CVaR-Expectation (33)** — convex, LP-solvable via SAA with sample complexity
  M ≥ C₁(H,F)/γ²·[C₂(H,F)n + C₃(H,F)log(1/ε)]. **Do NOT use VaR-Expectation** — non-convex,
  no global guarantee.
- **Acceptance gate:** on the 300-day-trading analog (paper: CVaR-Exp 1.65s solve at
  N=100K/n=4): NFL backtest must show no-worse log growth than κ=0.25 Kelly with
  strictly lower realized drawdown. New capability: penalizes edge-estimation
  uncertainty, which Kelly ignores.
- **Provenance:** `arxiv-deep/2143-composite-risk-measure-framework.md:16-17,25-26,41-43`.
- **Caveat:** paper's experiment assumes Gaussian returns and convex-in-x H(x,ξ) — verify
  both on the NFL stake problem before quoting the paper's 0.096%/day numbers.

## B3. Production calibration chain (BAYES_NONPARAMETRIC + PLATT_HIERARCHICAL)

- **Inputs:** raw model probabilities + group key (sport|market).
- **Outputs:** calibrated probabilities with fixed group intercepts.
- **Chain (exact):** Raw → Temperature → Platt (MAP IRLS) → Isotonic PAVA/CIR →
  hierarchical EB-τ. Per-market u_g; τ via EB moment or Laplace marginal, **clamped
  [0.05, 2]**; A_g = A + a_g — **intercept-only unless holdout proves a slope hierarchy**.
  DP/HDP/CRF/PYP/stick-breaking → notebooks/offline EDA only. Mixtures rejected
  (label switching, versioning, MCMC cost).
- **Acceptance gates:** adaptive-bin ECE ≤ 0.02 on Cohort-E-style walk-forward
  (baseline 0.0126); reliability ≤ 0.0324; resolution ≥ 0.0361. (LAUNCH_CALIBRATION_COHORT:36)
- **Provenance:** `.../BAYES_NONPARAMETRIC_OFFLINE_ONLY.md:3-4,107,126,132`;
  `ops/PLATT_HIERARCHICAL_FULL_POSTURE.md:51,58,62,67,72,81,83,95,98,103`. Two
  independent docs specify the same chain — implement exactly once.

## B4. Evidence-guard publish gate (RESCUE)

- **Inputs:** any artifact proposed for live picks.
- **Outputs:** SHIP / HOLD / BLOCKED decision.
- **Gate:** 15-test evidence guard, 15/15 required (RESCUE:6,10). Every artifact rebinds
  evidence by hash at publish (RESCUE:23,46). **BLOCKED artifacts' numbers never touch a
  live pick** — precedent: A8 (Boltzmann 0.2558 vs isotonic 0.2148, Δ=0.041).
- **Acceptance gate:** the guard itself is the gate; regression-test it by submitting a
  known-BLOCKED artifact and confirming HOLD.
- **Provenance:** `predictions/research/2026-09-22/RESCUE.md:6,10,23,46`.

## B5. INT prop pricing rule (kicker-defense-props)

- **Inputs:** QB season INT rate, projected pass attempts, opposing completion rate allowed.
- **Outputs:** expected INTs for the game.
- **Equation:** E[INT] = INT_rate × pass_attempts × completion_rate.
  Worked examples from the file: Allen 3.66% × 27.0 × 52.3% = **0.5**;
  Goff 1.44% × 34.2 × 52.3% = **0.3**.
- **Hard veto (same file):** individual-player sack props have **negative predictive
  value** — pressure→sack R² < 0.005. Never price them from pressure rate.
- **Acceptance gate:** backtest E[INT] vs actual INTs, 2024 season, Poisson deviance vs
  the market's implied line; adopt iff deviance improves ≥5%.
- **Provenance:** `props/research/2026-09-25/kicker-defense-props-methodology.md:85,95,112-113,130-134`.

## B6. Luck-layer margin pricer (edge-sheet)

- **Inputs:** home/away net EPA/play (garbage-time, kneel/spike, WP<0.05 excluded; OT
  retained), nflfastR cp/ep-family expected turnovers.
- **Outputs:** fair margin + luck decomposition.
- **Equations:** fair_margin = (home_netEPA − away_netEPA) × 63 + 2.0.
  Expected-turnover band: publish only outside **|actual − expected| < 1.5** (neutral).
  Priors: fumble recovery → flat 50% (YoY correlation ~0.00); **~4.5 points per turnover**.
- **Acceptance gate:** shadow-model backtest 2024 — margin MAE vs closing line; adopt as
  a shadow component iff it explains residual variance the EPA model misses (partial-R²
  gate, pre-registered).
- **Provenance:** `predictions/research/2026-09-17/edge-sheet/README.md:13,41,48,50,57,101,103`.
  Corroborated by dossier-v2 (r41) — two independent sources on 4.5 pts/turnover and
  ~0.00 recovery correlation.

## B7. NNTD selective-classification abstention gate (1778)

- **Inputs:** 25–50 training checkpoints, late-weight k=0.05.
- **Outputs:** per-pick disagreement score → abstain/publish decision.
- **Rule:** withhold picks whose checkpoint-disagreement exceeds the threshold calibrated
  to target error. Reference operating points (CIFAR-10, from the paper): coverage
  91.2 / 86.4 / 75.9 at fixed error 2% / 1% / 0.5%; at 90% coverage, error 1.83.
- **Composition (INFERENCE):** intersect with market disagreement — NNTD alone is blind
  to confidently-wrong subpopulations (ledger's own limitation); the market is the
  external second opinion.
- **Acceptance gate:** on 2024 held-out picks, abstention must cut realized Brier on the
  published set by ≥0.005 with ≤20% coverage loss. Re-tune k on NFL data (k=0.05 was
  tuned on the paper's benchmarks).
- **Provenance:** `arxiv-deep/1778-selective-classification-via-neural-network-training.md:28-31,40`.

## B8. Bradley–Terry upgrade candidates (2601.14727)

- **Inputs:** game results with weights, home/away indicators, team covariates.
- **Outputs:** team strength ratings γᵢ.
- **Equations (all <20 lines each):**
  1. Newman (2023) FPI: γᵢ = [Σⱼ wᵢⱼγⱼ/(γᵢ+γⱼ)] / [Σⱼ wⱼᵢ/(γᵢ+γⱼ)] — fewest full-data
     passes in all four benchmark settings.
  2. EM-MAP: γᵢ = (a−1+Σwᵢⱼ)/(b+Σnᵢⱼ/(γᵢ+γⱼ)) — Zermelo is the a=1,b=0 special case;
     fixes Ford-condition divergence (undefeated team → ûᵢ→∞).
  3. PlusDC: P(i≻j) = σ(uᵢ−uⱼ+(xᵢⱼ−xⱼᵢ)ᵀv) — home advantage as a special case.
- **Landmines:** sync Newman FPI may diverge on near-bipartite graphs (use async);
  vanilla MLE unusable early-season without regularization.
- **Acceptance gate:** ≥2% walk-forward Brier improvement over the current team-strength
  prior, 2022–2024. (brief's gate)
- **Provenance:** `dfs/research/2026-09-25/arxiv-deep/2601.14727-bradley-terry-advances.md:55,63,65,71,92`.

## B9. xT-style error-law publication gate (1814)

- **Inputs:** grid resolution K, sample size n for any estimated field-value/EPV surface.
- **Outputs:** publish / don't-publish decision for the surface.
- **Law:** error ≈ LogNormal(−2.0916 + 1.01·log K − 1.0267·log n, 0.1782), R²=0.864
  (SEs 0.017/0.002/0.003). Maximal acceptable error 0.0192; require
  **P(error < 0.0192) ≥ 0.90**. Reference: K=192 (16×12) at n=2.4M clears 0.90;
  24×18 needs n≈3,348,000.
- **Design implication:** ŝ-error (scoring-probability head) dominates T̂-error — spend
  modeling budget on the scoring head.
- **Acceptance gate:** apply to GSE's EPV/field-value surface; coarsen the grid or grow n
  until P≥0.90, then publish.
- **Provenance:** `arxiv-deep/1814-expected-threat-model-quality.md:24-26,48-52,62,77`.
- **Caveat:** ground-truth models are themselves estimates; ℓ∞ is conservative.

## B10. Feature store with (event_ts, creation_ts) semantics (2022)

- **Inputs:** source feeds with event time and creation (as-of) time.
- **Outputs:** point-in-time-correct feature values; online overrides.
- **Rules (exact):** offline keyed (event_timestamp + creation_timestamp), insert iff key
  absent; online override iff new event_ts > existing, or equal event_ts and new
  creation_ts > existing. Leakage rule: nearest-past-value with **per-source delay**
  (NGS re-runs 48h, odds 0). Backfill runner: no-leakage by construction.
- **Acceptance gate:** synthetic leak-injection test — insert a future-dated row, prove
  no as-of query can read it. (The paper provides no such validation; this test is the
  rehabilitation from C13.)
- **Provenance:** `arxiv-deep/2022-managed-geo-distributed-feature-store.md:28-31,47,58-61`.
  Composes with EV fail-closed rules (S3).

## B11. tsflex time-series feature extraction (2188)

- **Inputs:** irregular game/week-indexed series (bye-week gaps).
- **Outputs:** windowed features on the time index.
- **Spec:** sequential tsflex 4.3±0.1s vs TSFEL 16.4±0.8s; memory 1.3±0.1MB vs 3.5±0.3;
  paper claims ~3× faster, ~2.5× less memory. Index-based windows (the bye-week case).
- **Hardening (ledger's own):** wrap every function with `make_robust`; re-verify API
  (paper is v0.2.3, 2021).
- **Acceptance gate:** re-run the paper's benchmark on the current tsflex version;
  feature-parity check (same windows → same values ±1e-9) before replacing any
  hand-rolled windowing.
- **Provenance:** `arxiv-deep/2188-tsflex-flexible-time-series-processing-feature-extraction.md:28,32-34,40,43`.

## B12. Drift-detection ensemble (1885)

- **Inputs:** streaming feature/prediction series.
- **Outputs:** drift alarm + implicated detector set.
- **Spec:** majority vote — abrupt: ADWIN + HDDM-A + KSWIN; gradual: HDDM-A + HDDM-W +
  Page-Hinkley. Imputation always helped (kNN k=4 lowest RMSE). Windows 2000/1000
  instances (scale to NFL weekly grain — INFERENCE: map to season-scale windows).
- **Acceptance gate:** inject label-flip drift into 2024 weekly features; ensemble must
  fire within 2 weeks at ≤1 false alarm/season.
- **Provenance:** `arxiv-deep/1885-detecting-concept-drift-in-the-presence.md:5,8,14,28`.

## B13. QB Phase-2 archetype: rusty-backup rule (keenum + qb-pipeline)

- **Inputs:** QB layoff duration, target distribution on return.
- **Outputs:** archetype flag + individual-player blanket candidate for the 8-dim vector.
- **Rule:** layoff-return = ≥10 targeted attempts after ≥8-week gap. Blanket =
  individual player with the most separation-friendly role (slot / receiving RB / WR1),
  **not** a positional checkdown lean (return games skew slightly *more* WR-heavy, *less*
  RB-heavy than career baseline).
- **Acceptance gate:** backtest on 2024–2025 backup-QB returns before entering the vector
  (n=323 targets/10 games is suggestive, not predictive — keenum:167).
- **Provenance:** `fantasy/research/2026-09-24/keenum-target-splits.md:23,97,99-159`;
  `.../reasoning-layer/drafts/qb-pipeline-spec.md:5,17,25`.

## B14. CLV measurement repair (clv-hunt + forensics + cohort)

- **Inputs:** `gse.odds` (8,083,183 rows, 2.0 GB, 2025-04-24→2026-10-01).
- **Outputs:** repaired close lines → CLV beat-rate.
- **Steps (in order):** (1) settle games on the odds archive — no re-probe
  (clv-hunt:52); (2) merge MAX_CLOSE_AGE_MS (M-F7) — the unmerged staleness fix
  (clv-forensics:45-51); (3) backfill CLOSE-phase stamps for NFL/MLB
  (RESULTS:17-25); (4) grade per the canonical pipeline — per-book American→implied,
  mean per side, proportional two-way de-vig, latest row fetchedAt ≤ generatedAt,
  ≥MIN_BOOKMAKERS books quoting both sides (LAUNCH_CALIBRATION_COHORT:102-107).
- **Acceptance gate:** no CLV number is quoted until steps 1–3 land. Current 0.2273
  beat-rate (328/611/504 of 1,443, clearsBreakEven=false) is graded under the broken
  regime — reference only.
- **Provenance:** `predictions/research/2026-10-01/clv-hunt.md:45-48,52`;
  `.../2026-08-19-clv-forensics-verdict.md:45-51,74,81`;
  `ops/hermes/hf7-archive/RESULTS.md:17,20,24-25`.

## B15. DK salary-import template (dk-salary-week2)

- **Inputs:** DK contest metadata.
- **Outputs:** player salary table (619 players from 1,135 draftables, 13 teams, 12 games
  in the verified run).
- **Spec:** verify against DK's own metadata — draftGroupId 154078; salary file is the
  single source of truth (DK CSV columns not present in `/scores`). 16.8s first fetch,
  1.4s warm.
- **Acceptance gate:** weekly re-verification — draftGroupId + draftable count vs DK
  metadata before each slate build.
- **Provenance:** `.../dk-salary-week2-import.md:5,7,9-12`.
- **Policy flag:** the verified run used a TLS-impersonated client — **Garrett's
  forbidden-endpoint ruling required before generalizing** (C8).

## B16. cv-scoreboard-ocr clean-room build (deep-dive-haw)

- **Inputs:** broadcast frames.
- **Outputs:** scoreboard state (clock, score, down/distance) for the tracking pipeline.
- **Spec:** `cv-scoreboard-ocr.ts` exists as a **clean-room spec written 2026-09-30,
  never implemented** — the CV pipeline has no OCR. Camera-motion compensation already
  exists (`camera-motion.ts`) but `buildTracklets` in `track-player.ts` doesn't call it.
- **Acceptance gate:** implement per spec; OCR accuracy ≥98% on a labeled 500-frame
  sample; wire camera-motion compensation into `buildTracklets` in the same change.
- **Provenance:** `.../deep-dive-haw-2026-10-01.md:36,44`. Build-or-drop decision item.

## B17. Trend-discovery layer (data-analytics-strategy)

- **Inputs:** free structured data (nflverse team-weeks etc.).
- **Outputs:** ranked candidate trends with effect size + significance.
- **Spec:** cohort mean vs field + Welch test, ranked by effect size. Reference run:
  QB age 34+ → RB target share +10–12%, 4,936 team-weeks (2016–2024), concentrated in the
  37+ cohort. Productized as `packages/prediction-engine/src/trend-discovery.ts`
  (pure, tested).
- **Acceptance gate:** any discovered trend must clear the same bar before entering the
  engine — effect size on ≥2,000 team-weeks + Welch p<0.01 + out-of-sample holdout
  confirmation.
- **Provenance:** `.../data-analytics-strategy.md:28,40-41,55-65`.

## B18. EnbPI-style conformal prediction intervals (from map §2a + 2601 context)

- **Inputs:** sequential game predictions with residuals.
- **Outputs:** prediction intervals with finite-sample coverage.
- **Note:** the cqr.ts finding (architecture-handoff:110-113) is the anti-spec — n=5,
  α=0.1 claiming 90% while delivering 83.33% via the finite-sample clamp. Any conformal
  build must use the exact finite-sample quantile (⌈(n+1)(1−α)⌉/n), never the clamped
  asymptotic rank.
- **Acceptance gate:** empirical coverage on 2024 held-out within ±2pp of nominal at
  α=0.1 and α=0.2.
- **Provenance:** `ops/handoff/2026-09-18-architecture-handoff.md:110-113` (anti-spec);
  EnbPI reference from the slice map.

---

## Build sequencing (INFERENCE — recommended order, not from the files)

1. **Integrity first:** B14 (CLV repair) + B10 (feature store) + S3 leak-wall fixes —
   nothing built on contaminated data survives.
2. **Calibration second:** B3 (calibration chain) + B4 (evidence guard) — the honesty
   substrate every later number rests on.
3. **Pricing third:** B6 (luck-layer margin) + B5 (INT props) + B8 (BT candidates) —
   the components with the cleanest acceptance gates.
4. **Staking fourth:** B1 (α-governor) + B2 (two-layer CVaR) — only meaningful once
   probabilities are calibrated and CLV is measurable.
5. **Intelligence fifth:** B13 (QB archetype) + B17 (trend discovery) + B7 (abstention) —
   the reasoning-layer consumers.
6. **Research-grade (gated, not scheduled):** Decision Diffuser (1947, TVD≤5% + ECE≤0.03
   gate), CFCQL (1930, ≥1pp ROI gate), MAML vs NGGP race (S5 gates), StruSR (2170,
   reimplementation only after the neural win-prob model exists and is good).
