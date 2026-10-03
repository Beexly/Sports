# c09 Verified Claims — Phase 2 synthesis

**Slice:** c09 (NFL intelligence: qb-behavior, coaching, trust-signals, reasoning) — 299 docs, 10 deep-analysis chunks.
**Date:** 2026-10-02. **Analyst:** c09 Phase 2 synthesizer.

## How to read verdicts

- **VERIFIED** = the number/claim is confirmed present in the vendor-repo source file (`~/workspace/vendor/Sports/docs/…`) at the cited line. Most working chunks verified **at ledger level** (the arXiv deep-read ledgers are themselves secondary sources — worker-written full-text reads). VERIFIED does **not** mean the underlying paper's claim is true.
- **VERIFIED-but-misleading** = confirmed in source, but the presentation or context makes it unsafe to use as-is (margin is noise, headline is a survey citation, split is one game, etc.).
- **UNVERIFIED** = could not be confirmed in-source, or the source itself flags the claim as unreplicated/second-hand/synthetic/figures-only.
- **INFERENCE** = added by a c09 analyst (a composition, estimate, or judgment), not stated in any source. Never use as evidence.
- Deduped across chunks: identical claims appearing in d/r chunks share one row; the full source:line list is kept.

---

## 1. QB behavior / trust splits / coaching substance

### 1a. d05 full-tables QB splits — VERIFIED *as transcription*, underlying numbers UNVERIFIED
- Mayfield vs blitz since last season: 5.42 YPA (31st of 31), 71.1 rating (29th), 3.92 ANY/A (T-29th), 22.4% Off Target% (30th); MIN blitzed at league-high 73.9% — `dfs/research/2026-09-27/full-tables/README.md:18` — **VERIFIED-but-misleading**: verbatim X-post transcription; rank denominators are the author's universe (31 = author's sample); underlying numbers NOT independently measured. Needs nflverse recomputation with min-attempt thresholds before any engine use.
- Purdy vs zone since last season: 8.71 YPA (4th of 39), 8.8% CPOE (4th), 0.47 FP/DB (3rd); ARI 83.9% zone (8th-highest) — `full-tables/README.md:20` — **VERIFIED-but-misleading** (same transcription caveat).
- Garrett Wilson vs blitz since last season: 41.6% target share (1st of 93), 0.37 TPRR (2nd), 53.8% 1st Read% (1st), 44.7% team yards (2nd); DET 51.5% blitz (2nd-highest) — `full-tables/README.md:19` — **VERIFIED-but-misleading** (same).
- JSN vs coverages last 2 seasons: Cover-4 0.47 TPRR / 5.89 YPRR / 58.7% first-read (1st of 91); two-high 0.35 / 4.07 / 46.5% (top 2 of 139); WAS 78.3% two-high — `full-tables/README.md:17` — **VERIFIED-but-misleading** (same).
- McConkey ON/OFF (LAC +0.23 EPA/db on, −0.67 off) — `full-tables/README.md:10` — **UNVERIFIED**: from a TEXT-ONLY @PrysmSports X post, no chart, no data-source line; duplicated ~4h earlier by @PlayBracco and @SleeperNFL (circular amplification). Treat as a feature idea, not a number.

### 1b. d35 21-QB behavioral matrix — VERIFIED *as in-file measurements*, with snapshot caveats
- Cooper Rush W1: CPOE −21.3 [WEAK, worst], 80% pressure-to-sack [WEAK, worst], QBR 2.6, 3.5 air yds/att, 52.6% RB target share — `research/2026-09-19-dk-week2/deep/qb-full-pool-2026-09-19.md:73-74` — **VERIFIED-but-misleading**: in-file numbers, but one-game snapshot; 80% P2S mixes opponent pressure/game script/QB trait at n=1; [ELITE]/[WEAK] flags are among ~30–32 W1 qualifiers only.
- Geno Smith: 0.00% PFF negatively-graded dropbacks (1st of 30); 4-0 career, 104.4 rating vs Gannon defenses — `qb-full-pool-2026-09-19.md:137` — **VERIFIED** (caveat: career split is secondary-sourced narrative, not feed data).
- C.J. Stroud: 0.45 EPA/db when clean; 21% aggressiveness (slate-high); highest accurate-throw rate [ELITE] — `qb-full-pool-2026-09-19.md:116` — **VERIFIED** (caveat: "clean" split from a secondary source, not the nflverse feed).
- Jordan Love: 78.6% first-read (highest), 35.7% bad-throw (worst); −15 EPA W1 vs 2025 baseline −1.4 EPA/game ("continuation, not outlier") — `qb-full-pool-2026-09-19.md:109` — **VERIFIED**.
- Matrix covers 21 in-file QBs; ALL DK salaries [2P] second-party (DK API Akamai-blocked 9/19); Mac Jones W2 salary UNKNOWN — `qb-full-pool-2026-09-19.md:6,196` — **VERIFIED**. **INFERENCE**: salary-dependent features inherit [2P] staleness; carry the provenance tag.

### 1c. d35 DST / trench / TE / WR substance — VERIFIED with in-source caveats
- JAX 50.0% pressure generated (#2) vs DEN 56.3% allowed (worst) = best mismatch — `deep/dst-phase1.md:34` — **VERIFIED**.
- Motion-at-snap defensive pass EPA (@Paganetti, 9/19 obs): PIT −0.85 … CLE +0.66 (24-team table) — `dst-phase1.md:42` — **VERIFIED** (second-party analyst, not feed).
- SumerSports edge PRWR: Hunt 29.6%, Crosby 26.7%, Anderson 24.1%, McDonald 22.2% (9/18, "approx reads") — `dst-phase1.md:47` — **VERIFIED-but-misleading** (in-source "approximate reads" caveat).
- TE: McBride 13 tgts / 35% share / +0.289 EPA/tgt; Schultz 18.2% first-read share / −0.315 EPA/tgt; Fant −1.066 EPA/tgt — `deep/te-phase1.md:45,47,65` — **VERIFIED**.
- WR: Parker Washington 0.40 TPRR / 5.53 YPRR (labeled SINGLE, internal table); JSN YPRR 3.79 from 2025-26 season CSV vs Week-2 form — **FLAGGED**: season-frame mismatch, file doesn't flag it.
- d34 week-3 wire: Purdy 0.503, Allen 0.493, Penix −0.756, Rodgers −0.389, Mayfield −0.306, Stroud −0.087 EPA/att; SF motion 64.0%/PA 15.1%, LAC motion 66.2%/shotgun 61.3%, BUF shotgun 33.1%, CIN motion 29.8%, LAR RPO 0.0%; OL outs named (Banks, Bako-Bewele, Pipkins, Awosika) — `reasoning/week3-current-wire.md` — **VERIFIED**.

### 1d. Coaching-tendency / scheme numbers
- Ötting 2021 HMM play-call prediction 71.5% OOS (Patriots 77.9%, Seahawks 60.2%) — `0282-a-systematic-review-of-machine-learning.md:32` — **VERIFIED-but-misleading**: second-hand survey claim, never validated in-repo; portable only as a pointer (see §7).
- CAMS Hexner: reveal-time estimate 0.60s ± 0.06s vs 0.5s truth; multigrid 9.3→2.32h / 27.6→10.9h / 46.21→17.83h — `0222-solving-football-by-exploiting-equilibrium-structure.md:50,51` — **VERIFIED** (pure game-theory paper; NFL mapping is INFERENCE, do NOT build CAMS machinery).
- Atomicity theorem (equilibrium ≤ I-atomic, independent of action-space size) — `0222-…` — **VERIFIED** as paper result.

### 1e. QB decision-quality metrics (arXiv ledgers)
- EHCP: BART catch-prob MSE 0.086 / misclass 0.113 / log-loss 0.289 — `0402-expected-hypothetical-completion-probability.md:40` — **VERIFIED**. % throws to max-EHCP receiver: Winston 26.8% vs Wilson 13.2%; min-EHCP: Carr/Wentz 27.5% — `0402:44` — **VERIFIED**. Receiver credit/blame: Tate +11.8pp, Bryant −18.4pp — `0402:45` — **VERIFIED**. Caveats in-ledger: random (not time-ordered) splits; no pressure features; thrown-passes-only selection bias.
- JOI/dropback prediction RMSE 0.04464 vs 0.05448 mean baseline (~18% reduction); matches-together effect diminishes after ~50 — `0910-player-chemistry-joint-impact-soccer.md:40-41,43` — **VERIFIED**. Defensive JDI is a null result (ΔRMSE 0.0017) — skip. (Soccer port; the unseen-pair CatBoost predictor is the transferable piece, ρ ≥ 0.40 gate.)

---

## 2. Calibration / uncertainty — the calibration crisis is five-times corroborated

### 2a. Live calibration state (Aug-2026 vintage — STALE, exact triple must be refreshed)
- Brier ≈ 0.275 / ECE ≈ 0.112 / RES ≈ 0.002 RED — `ops/MASTER_PROMPT_V2_COMPRESSED.md:6`, corroborated by `ops/ENGINE_RANKING_RES_NEAR_ZERO.md:4`, `ops/LAUNCH_MAX_PATH_2026-08-09.md:6`, `ops/MASTER_PROMPT_V2.md:17`, `ops/MASTER_PROMPT_V3_COMPRESSED.md:13` — **VERIFIED-but-misleading**: five-way corroboration inside one dated vintage; all ~Aug 2026. Treat as "last recorded state," not live truth.
- HERMES_ALL_NIGHT (2026-09-04, fresher): 1,663 graded picks, resolution 0.005; 152 picks at ≥80% confidence won only 40% (inverted); 27-season replay confidence AUC 0.4965 (p=0.41) on 13,646 picks — `ops/HERMES_ALL_NIGHT_2026-09-04.md:60,282,286,289,304` — **VERIFIED**. Murphy decomposition Brier = REL − RES + UNC; RES≈0.002 blocks PROVEN — `ops/PLATT_AND_BRIER_DECOMP.md:3-4` — **VERIFIED**.
- First honest measurement: 1999–2025 REG, 6,967 games, 15,939 settled picks, 0 lookahead errors; SPREAD −6.53% ROI · TOTAL −5.44% · ML −1.96% · overall −5.48% — `ops/HERMES_ALL_NIGHT_2026-09-04.md:56` — **VERIFIED** (post-PR-#695; PR #695 voided all pre-fix SPREAD backfills — nflverse `spread_line` polarity bug).
- Calibration law: maps fix REL/NLL, not RES; if bestByLogLoss improves but RES≈0 → do not apply, raise ranking first; maps stay OFF while resolution≈0 — `ops/ISOTONIC_LOGLOSS_DEBUG_2026-08-10.md:3,30` — **VERIFIED**.
- Floors: Brier ≤0.22 / ECE ≤0.05 / MurphyRel ≤0.05 / n≥100 — `apps/web/lib/ops/calibration-eligibility.ts:69-74` (via `ops/edge/2026-08-19-calibration-gate-split-map.md:13`) — **VERIFIED**. Split design: CALIBRATION gate {n:100, ece:0.05, murphyRel:0.05} passing vs DISCRIMINATION gate {n:100, brier:0.22} failing; BS≤0.22 needs RES≳0.03–0.05 — "calibration work alone cannot close the discrimination half" — **VERIFIED**.
- **INFERENCE (key framing)**: 0.22 floor vs devigged-price baseline 0.2122 (Elo measured Brier 0.2312 on 3,018 games, `reasoning/calibration-weights.md:30-31`) leaves ~0.008 headroom — the gate is cleared by **discrimination** (QB-behavior/trench/scheme signals), never by calibration polish.

### 2b. Calibration-over-accuracy evidence
- Walsh & Joshi 2024: calibration-optimized models earn "+69.86% higher average returns" than accuracy-optimized — `0282-…md:30` — **UNVERIFIED (second-hand survey pointer; correction (a))**: the same ledger at :50 downgrades it to "pointers to primary papers that should be read in depth, not conclusions to act on" and at :66 says "never been validated on NFL data in-repo"; the review also flags its own publication bias. Do NOT cite as corroborated evidence. The internal calibration-vs-accuracy bake-off is the validation that converts pointer to evidence.
- Classwise-ECE model selection +34.69% vs −35.17% ROI (2303.06021) — `MASTER-PAPER-INDEX.md:579` — **VERIFIED-but-misleading**: map-cited; trace to primary before quoting.
- Remaining 0282 survey market numbers (Stübinger 1.58%/match on 47,856; Patel 58.5% CV / 53.65% 2021 NFL; Sinha Twitter >55%; Warner 64.36% SU / <51% ATS; Morgan V 64.41%/56.78%; Szalkowski 53.5% ATS on 2,560 games) — `0282:30,32` — **UNVERIFIED-to-primary** (survey-reported, not GSE-replicated).

### 2c. Uncertainty machinery (arXiv ledgers, verified as present in ledgers)
- Game-clustered bootstrap (0503): 4,101 games → 2,291 independent-play equivalents (56%); nominal 90% i.i.d. coverage 0.60 ± 0.01 (width 0.027); φ=0.35 fractional-cluster reaches 0.90 ± 0.01 (width 0.063, 2.3× inflation) — `0503-exploring-the-difficulty-of-estimating-win.md:38,43,51` — **VERIFIED**. Do NOT hard-code φ=0.35 (tune on nflverse 2020–2024); tails stay hard (~85% conditional near WP 0.3/0.7); toy-simulator caveat (d02 C6).
- MIS: L_MIS = (u−l) + (2/ρ)(y−u)1{y>u} + (2/ρ)(l−y)1{y<l} + |y−f|; argmin → (1−ρ) CI — `0473:14` — **VERIFIED**. PM2.5: MIS-reg 179.96 best vs MC-dropout 881.05 worst; DeepGLEAM 1W RMSE 66.03 vs GLEAM 73.59 vs pure deep 239.94 — `0473:26` — **VERIFIED** (fine-print: no significance tests; weak MC-dropout config; "deep fails under shift" partly straw-man).
- EP repair kit (1801): team-quality bias (good teams 32% vs 26% of plays; +0.7 pts/drive); 1/N_i reweighting log-loss 0.7506 vs 0.7670; cluster bootstrap restores 95.6% coverage vs ~83–86%; catalytic prior 500k synthetic states — `1801-expected-points-machine-learning-to-statistics.md:44-45` — **VERIFIED**.
- QOOB beats split-CQR at small n (narrower at valid coverage) on all 6 UCI sets; repo has DISABLED `1910-10562-nested-conformal-qoob.ts` (gate: width ≤90% of split-CQR at coverage ±2pp for k≤6 weeks) — `1650-nested-conformal-prediction-qoob.md:30` + filesystem — **VERIFIED**. ACI: α_{t+1} = α_t + γ(α−err_t), γ=0.005 sweet spot, repo has `aci-durable.ts`/`aci-state.ts`; audit item: err_t must be computed on the *published* interval — `1640:14,18,31,37` — **VERIFIED**.
- AC-RAC: only method with valid conditional coverage across all actions at α=0.05; critical error 0.21–0.35% vs RAC 3.35–4.70%; mean set size 3.373 vs 3.252 — `2142-conformal-risk-averse-decision-making.md:46,48,50` — **VERIFIED**. Assumes exchangeability (violated by NFL weeks); ACI upstream is the patch.
- 0715 theorem: monotone post-hoc calibration (temperature scaling) CANNOT reduce the ranking term ε_rank — `0715-…:22,29` — **VERIFIED** as theorem; explains why d29's resolution≈0 is structural, not a data accident.
- Scalarizer: f1=0 ⟺ |r|≥0.08 AND |slope|>se on true holdout; only g=0 LIVE; "Honesty failing is DARK" — `reasoning/overnight-agent-prompt-2026-09-26.md:125` — **VERIFIED**. Documented DARKs: officials n=113 r=−0.09257 slope=−0.01007 se=0.01028; wind slope −0.135/mph se 0.1618 n=349; coaching 4th-down go rate r=−0.01363 n=255 — `:47,48,50` — **VERIFIED**. Calibration contract bar: n≥250, ECE≤0.06, drift≤0.10; below → INSUFFICIENT_SAMPLE, probabilityClaimsAllowed=false — `:322` — **VERIFIED**.
- GP-PIT: deployment gate FAM = ΔS̄/√Var(ΔS) ≥ 2.0; predicts own expected Kelly winnings in bits — `1082-probabilistic-recalibration-gp-pit.md:84` — **VERIFIED**.
- 1525: HS_in residual post-processing wins 11/12 vs rolling-origin at 180–215× lower cost; +4.59% (Theta QR_in) / +4.53% (ARIMA QR_in) CRPSS — `1525-postprocessing-prediction-errors-m4.md:28-29,32` — **VERIFIED**. HS quantiles must inherit game-clustering discipline (INFERENCE — unaddressed in both ledgers).
- 0866 PredictIt: consensus rejected on all four tests; day-trader mean profit −$214.71; <1% of 4,452 traders profit >$400 — `0866-…:33,65` — **VERIFIED** (two political binary markets only — domain-limited).
- 1359: steady-state whale distortion δ_S = ρΔ_S; ~40% capital threshold — `1359:20,32` — **VERIFIED-but-misleading**: explicitly parameter-conditional (source lines 35/41: "no calibration to real markets") — simulation result, not market fact.
- 1735: IG(H_t) saturates at log 2 ≈ 0.693 nats; ω₁ ≈ 0.15 identifiability threshold; synthetic-only — `1735:37,38,40` — **VERIFIED-but-misleading**: synthetic-only; re-estimate on real odds before any flag fires.

---

## 3. Sizing / combination

### 3a. Kelly stack (verified at ledger level)
- E[growth] = 2(δ²−σ²)Φ(δ/σ) + 2σδφ(δ/σ); gate design: stake only if δ_perc > 1.5σ, scale Kelly by Φ(δ_perc/σ) — `1748-gambling-under-unknown-probabilities-estimation-error.md:17,43,49` — **VERIFIED**. Re-derive for general decimal odds before deployment (1748 is even-odds/small-δ/normal-ξ; ledger mandates re-derivation).
- Multi-pick Kelly (0813): f_K(p)=2p−1; p=0.6 → compounded R_K=2.0%; finite memory G(p,L)≈G_K(p)−1/(2L); p=0.51 → L≥1,761 — `0813:20,24,35,37` — **VERIFIED** ("≈0.63 threshold" is worker INFERENCE, not theorem; binary ±1 payoffs assumed — NFL slate correlation needs a haircut).
- Maximin-drawdown (0834): MD 9.4% return / 2.3% daily SD / −3.3% max DD vs Markowitz 5.7%/1.7%/−6.1% — `0834:53` — **VERIFIED-but-misleading**: single 3-month COVID window; author calls it "preliminary"; NFL bet correlation ≠ S&P correlation.
- Fractional vs full Kelly, Vanguard 2001–2021: fractional 8.9% growth / 41.9% max DD / $576,464 vs full 17.2% / 89.8% / $3,002,829 — `1222-fractional-growth-portfolio-investment.md:36-38,43` — **VERIFIED**.
- Multivariate Kelly (1212): exact FOC; Gaussian closed form f = μ/(μ²+σ²); "positive correlation reduces optimal fractions" — `1212:21-22,32-33` — **VERIFIED** (closes the 1212 ledger's named GSE gap: `kelly-investigation.ts` sizes single bets independently).
- Generalized Kelly (1630): f* = (2p−1)(1+w/g); p=.6 → first-bet ≈.659 vs .2 plain; recombining-binomial O(f²) — `1630-generalizing-the-kelly-strategy.md:14,18` — **VERIFIED**. Known-p assumed — must run downstream of the δ/σ gate, never standalone.
- 1232: Kelly-gap identity g_t⋆ − g_t^π = ½‖θ_t − σ_tᵀπ_t‖²; subjective mirror = D_KL — `1232:18-21,25-27` — **VERIFIED** (analytic identities, no empirics).

### 3b. Combination (decision-metric discipline)
- 0791: CRPS-optimal ensemble earned LOWER trading profits than equal-weight qEns counterpart; all ensembles earn 80–96% of crystal-ball profits (crystal ball = 13,587 EUR; worst −21,425 EUR; naive = 8,048 EUR); CRPS learning ≈500× slower — `0791:37,42,43` — **VERIFIED** (the constitution of the decision layer: optimize weights on CLV/P&L, never on CRPS).
- **1172 forecast-combination puzzle (correction (b))**: standard test size 0.0000–0.0004 under null; two-step-aware 0.020–0.053; power at T=1000/2000/5000: standard 0.010–0.012 vs two-step-aware 0.154/0.304/0.655 (MSFE); S&P500 OOS p-values: equal vs optimal two-step 0.8251 (cannot reject — the puzzle); equal-two-step vs one-step 5.675e-05 — `1172-solving-the-forecast-combination-puzzle.md:34,36` — **VERIFIED**. **Map labeling error: "1172 ranking lasso" does not exist** (zero "lasso" mentions in the ledger; 1172 is Frazier et al. on the forecast combination puzzle, ensemble lane). Any downstream reader trusting "1172 = ranking lasso" will misfile it.
- **r02 INFERENCE flag**: 1172's one-step constitution may invalidate program-wide weighting comparisons that used standard DM/White tests on ~270 games ("not significant, keep equal weights" = the predicted artifact, not a finding).
- 0176 1X2: static θ=8% → 814 bets, £44.7, ROI 5.49% (avg odds); θ=9% → 1,049 bets, £177.18, ROI 16.89% (max odds); ROI-max θ=18% → 37 bets, 23.59%; max odds +42%–296% over avg; per-season ROI-optimal θ lowered overall ROI (9.03% vs 12.96% profit-optimal) — `0176-…:39,42` — **VERIFIED** (EPL soccer; the 42–296% band is an NFL-replication hypothesis, not a hurdle; static-θ hindsight caveat).
- NSGA-III (1463): knee dominates single-objective weights; M5 28,903 series, 60.1% zeros — `1463:11,32` — **VERIFIED-but-misleading**: exact cost tables NOT transcribed in ledger (directional only); "simpler scalarization may reach the same knee cheaper" not ablated; nonstationarity is the main risk.
- 1162 peer-prediction aggregation: DMI-aided Brier 0.221 vs Mean 0.290 / Logit 0.317; log score 0.354 vs 0.453/0.578/0.701 — `1162:46` — **VERIFIED** (A1/A2 homogeneity/independence assumptions violated by GSE's correlated model pool).
- 1182 online Gibbs: "mixed/positive, not a clean beat-by-Y%" — `1182:29` — **VERIFIED** (log-loss/Brier transfer untested).
- 1559 smoothed BOA: 3rd place IEEE DataPort post-COVID; 5-model BOA ≈10% lower validation MAE than best individual — `1559:33-34` — **VERIFIED** (smoothing gain never isolated vs plain BOA).
- 1676 soft-global: ECB SPF pre-COVID MSFE/EW ≈ 0.921, beating local/hard-global/EW; post-break EW recommended until more data — `1676:19,20` — **VERIFIED** (MSFE ≠ CLV; gate γ on the decision metric).
- Mn-Dirichlet (0673): beats BT on proper scoring — Brier Δ −0.01 (p=0.04), log score p=0.01; χ² 61.5 (p=0.91) vs BT 112.8 (p=0.001, rejected) — `0673:32` — **VERIFIED** (complexity floor: any engine upgrade must beat it on log-loss before shipping).

### 3c. Abstention / no-bet stack
- DAC (0693): CIFAR-10 ResNet-34 at noise 0.2/0.4/0.6/0.8 — Baseline 88.94/85.35/79.74/67.17 vs DAC 92.91/90.71/86.30/74.84 (fraction removed 0.24/0.41/0.56/0.75); beats oracle at 0.2 noise — `0693:35` — **VERIFIED** (NFL-scale warning: 75% data removal at 0.8 noise would delete a season; the ≤25% abstention gate is load-bearing).
- SPTD (0715): coverage-50: 99.8 vs DE 99.7 vs SR 98.6; coverage-90: 96.5 vs 96.8 vs 96.4 — `0715:42` — **VERIFIED**.
- CARL (1008): ℓ⁽¹⁾ λ=1 → 68.1/30.0/1.8 (correct/abstain/incorrect), adv err 35.8% vs baseline γ*=4/255 62.9/30.1/7.0, 29.2% — **VERIFIED-but-misleading**: at similar abstention CARL is *worse* than the margin-threshold baseline (35.8% vs 29.2%; 55.2% vs 50.9% at low abstention) — the headline "reduces adversarial error" invites the wrong comparison on CIFAR-10.
- 1152 selective prediction: inaccurate-subset accuracy Alone 62% → +AI 50% (p<0.001) → +Selective 55%; FNR 31% → 41% → 42% (stays elevated) — `1152:29-31` — **VERIFIED** (directional: announcing abstention keeps false-negatives elevated — copy rule is cheap insurance).
- SCoRE (1777): e-value condition E[L·E]≤1; n=1000 calibration / m=100 test / 100 runs; risk levels 0.05–0.5 — `1777:11,16,19,22` — **VERIFIED** (exchangeability fragile in sports; covariate-shift extension needs a density ratio).

---

## 4. Rating layer

- Phantom-player BT (0544): CV-selected (MLB 2025) ridge λ=0.01, pseudo-game δ=1.2589, phantom ρ=40 (~80 effective games); q-calibration δ=(1−q)/(2q−1), q=0.99 → δ=1/98 — `0544:42,26` — **VERIFIED**. **FLAGGED**: expert-calibrated δ=1/98≈0.0102 vs CV δ=1.2589 disagree by 2 orders of magnitude, unreconciled; phantom tails linear (robust) vs ridge quadratic. For NFL: choose tuning philosophy explicitly; re-scale ρ for 17-game seasons.
- Elo convergence (0564): E[(1/N)|X−ρ|_1] ≤ ((N−1)/N)√(8K/ℓ_η) for K≤ℓ_η/2; E[b(2X¹)] lands exactly on the diagonal (Prop 12: transformed prediction unbiased); √K law small-K only (numerics grow linearly away from 0) — `0564:28,26,39` — **VERIFIED**. Adversarial notes: all numerics N=2, one (b,K,L); no convergence rate in t; needs correct model spec; computing actual bias open. K-factor scheduling as error budget, not a theorem to quote.
- KRC (0574): KRC(h=1) 0.6382 vs Elo 0.6355 (+0.27pp); h=1.5 → 0.6173 collapse — `0574:44` — **VERIFIED-but-misleading**: one bandwidth's margin, no CI; feature-rich Elo won 2 of 3 seasons; durable contributions = method + bandwidth finding (season-length memory), not superiority. Sherman–Morrison rank-one updates — **VERIFIED**.
- Elo-MMR (0932): Codeforces ρ 78.6%/14.7% best; production runtime 35.4s vs 212.9s (~6.8×); Glicko-2 volatility-farming exploit documented — `0932:49,53-54,78,93` — **VERIFIED**. NFL port changes the outcome variable (theorems need re-verification).
- TVC-BT (0655): HPL 0.2073/0.2047 (best walk-forward RPS); score RMSE 1.0011 vs baseline 1.0331; validation-test correlation 0.973 — `0655:42,45` — **VERIFIED**.
- Bayesian external-rating blend (1538): FCWR 0.530/47.4% vs Zero 0.685/38.3% (+23.8% acc, +22.6% Brier); advantage vanishes by QF/SF/F — `1538:32` — **VERIFIED** (priors have ~6-week NFL half-life; don't over-invest).
- Fixed-effects HFA (1050): simulation recovers true HFA=3.00 exactly; mixed-effects biased to 3.37/3.26/3.13 — `1050:27,59-61` — **VERIFIED**.
- LS ratings (1447): LS strictly better MSE/MAD than USAU 2014–2019; USAU wrong on "nearly a quarter of all games" (2014 Men's) — `1447:29,30,31` — **VERIFIED-but-misleading**: evaluation retrodictive (fit full season, "predict" same games); slug says soccer, content is USAU frisbee — cataloging hazard.
- MFM archetypes (0554): K=3, n=100, p=10 → Prob 1.00, ARI 0.7383 vs PLE 0.00/0.0779; NBA case 411 "Established Stars" / 112 "Role Players" / 13 "Adaptive Tactical Hubs" — `0554:28` — **VERIFIED** (descriptive only, no held-out; K recovery >85% for K=5).
- GLMF (0068): Table 4 rank-3 RMSE 0.342 (vs mean 0.344; LPCA 0.344; PCA 0.358) / LL −0.854 (vs −0.864); GLMF only method improving with rank — `0068:47` — **VERIFIED-but-misleading**: headline margin is noise-scale; the real result is rank-monotonicity; IRLS equations garbled in PDF (reimplement from Li & Gaynanova 2018); 2/144 IRLS convergence failures → ridge required.
- flexBART (0232): pitch-framing 8.6% (flexBART) vs 8.8% (targetBART) vs 18.4% (one-hot) vs 10.6% (D&W 2017); p=4.5×10⁻²⁶; runtime 48 min vs 2h per 2,000 samples — `0232:53,55` / `0232-flexbart-…:47,53` — **VERIFIED**. DGP2 failure: balanced-partition bias on singleton-outlier partitions — the singleton-diagnostic gate for the QB-profile program.
- Joint GLMM (0433): joint (YPP+win) beats binary-only on win log-loss ALL years 2005–2013; sacks+win likewise; fumbles+win null (deliberate control); 2012 Bama–ND demo 22.2% (correct direction) vs 62.5% — `0433-…md:42` — **VERIFIED** (game-level CV folds leak in-season info; comparisons uncorrected).

---

## 5. Score distributions / simulation / EP

- Nested ZIGP (0242): EURO 2016 MDL 22 vs 26; Brier 17.52441 vs 18.68; RPS 5.280199 vs 5.36 — `0242:43` — **VERIFIED**. EURO 2020 forecast: Belgium 18.4%, France 15.4%, Italy 4.8% (**actual winner** at 4.8% — the headline miss) — `0242:44` — **VERIFIED**. No bookmaker/market baseline (0242:48,55); α₀⁽³⁾ duplicate coefficient is a typeset slip; step-3 ad-hoc averaging should be a joint fit; β₃ pilot (≥0.5% exact-score log-loss) is the only adoptable piece.
- Nested ZIGP World Cup (0584): WC 2010 BS 17.79/RPS 4.93 vs 17.97/4.99 vs 17.97/5.05; EURO 2016 17.52/5.28 vs 23.27/5.97; EURO 2020 tie (14.54 vs 14.36 vs 16.37); WC 2022 Brazil 17.3%/Argentina 13.1% (actual winner Argentina inside top-2); WC 2018 ZIGP WORSE (Germany stale-form lock-in — fixed 3-year half-life, convention not tuned) — `0584:33,36,39` — **VERIFIED**.
- Sarmanov/ANS (0392): England home–away goal corr −0.269, Germany −0.352, France −0.395, Spain −0.263; classical DC floor −0.08 at λ=1.3/1.2; NB marginals beat Poisson on AIC every league; German 2021/22 1,000 MC completions, 95% intervals contained all teams' final points — `0392:12,13,42,45` — **VERIFIED**. Dixon–Coles is a Sarmanov member (q_dc) — VERIFIED.
- ZI-Skellam (1791): AIC 1850.77 beats plain Skellam 1854.39 / discrete normal 1855.83 / discrete Laplace 1854.42; outcome calibration 152.02/30.39/123.59 vs observed 153/29/124 vs bookmaker 160.63/28.22/117.14; Frank-copula half model 38 params AIC 3279.47 vs independence 3324.09; half-difference corr 0.13 — `1791:52,53,54` — **VERIFIED** (handball domain; port via AIC bake-off on NFL margins).
- BBE (0292): MCM ≈1000× faster than STP/MTP; CoV ≈ 0.005; win-markets only, no real-data calibration — `0292:26,32` — **VERIFIED**.
- Kneel/garbage-time (map #10): kneel-outs delete pass attempts for big favorites; hurry-up garbage time inflates trailing QBs — `data/EDGE_SUPREMACY_DOCTRINE.md:67,71` — **VERIFIED**.
- Pre-snap leverage (wpa2 kill): HGB R² 0.2129/0.2188 on wpa² from pre-snap state; `down` best single correlate (+0.21), time −0.044; GP symbolic regression collapsed to constants (best `log(log(-2.719))`, R² −0.0787, CI [−0.0817,−0.0759]); DeepSeek GLI-0.1 measured R² 0.0037 vs claimed 0.112/0.079; generation-0 fitness implied R²≈0.63 on the 25k subsample vs HGB cap 0.21 (heavy-tail overfitting attractor; Huberize fitness) — `REPORT_WPA2.md:37,71,72,83,136` — **VERIFIED**.

---

## 6. xFP / FPOE — pre-registered FAIL, inverted sign convention (correction (d))

- **Pre-registered FAIL**: xFP/FPOE does NOT beat naive last-week fantasy points for next-week rank prediction — Δrho = −0.0165, 95% CI [−0.0396, 0.0086] (n=6022, holdout 2020–2025); 12/12 guard tests pass; measured 2026-09-18 on a Windows worktree, NOT re-run — `research/2026-09-26/RESCUE-2026-09-26-4-xfp-research.md:17-18` — **VERIFIED**. Scope is narrow: next-week *rank* prediction vs naive last-week FP; descriptive/matchup-adjusted uses were not tested; units 2/3 are inconclusive/blocked. Do not weight air-yards expectation in rank features; descriptive only.
- **Inverted sign convention**: FPOE = XFP − FPG per Kyle Menton's Fantasy Points chart with **negative FPOE = player OUTscoring expectation** — `data-sources/research/2026-09-17/dossiers/dossier-v2-accounts.md:317` — **VERIFIED**. Live integration hazard: any re-test must pin the definition first. (The dossier calls FPOE/xFP "the engine's #1 build target" — the pre-registered FAIL resolves this against weighting until a definition-pinned re-run overturns it.)

---

## 7. Causal / regime / adjustment machinery

- Mediation (0272): efficient estimator n-scaled MSE 0.092→0.065 (n=400→6400); G-misspecification fatal (0.436→4.519, grows with n — asymptotic bias); Grenada application null (direct 0.011 [−0.458,0.479], indirect −0.157 [−0.672,0.357]); exponential tilt NOT robust to g misspecification — `0272:41` — **VERIFIED**. Wind→totals mediation: A3 is where it dies (game-script confounder); expect a null; the null resolves the d34 wind DARK either way.
- Case-crossover hydration breaks (0533): main momentum effect +0.26 [−2.50,+3.02] clock-aligned / −0.63 [−3.63,+2.37] play-aligned — all cross zero; net xG −0.001 [−0.051,+0.049]; break×Elo/100 +1.59 (SE 0.80) the only significant interaction; β-fragile (+1.1 → −5.1 under referent-band relocation) — `0533:37,39,41` — **VERIFIED**. **UNVERIFIED provenance**: 99 matches (67 group + 32 knockout) + 3 dropped = 102 vs real 2026 WC 104-match format (72 group + 32) — group count doesn't reconcile; check the paper's data appendix before citing the dataset. Design transfer (self-matched estimator) unaffected.
- Causal-forest dissection (0769): cf vs mob MSE ratios 0.663 / 0.148 (strong confounding) / 0.707 (randomized); treatment-centering alone mob(Ŵ) 0.392 / 0.197 (~5× gain in Setup C); Setup B 1.000 (no confounding → no effect) — `0769:30,33` — **VERIFIED** (Gaussian-additive sandbox only; P≤20, N≤1600; propensity errors propagate).
- ITS Poisson (0098): game-loss injuries 701 (2007) → 804 (2016), +15%; conditioning 197→271 (+38%), plateau 220–240; non-conditioning −37% first 3 CBA years; Table 2 rate ratios All 0.93 (0.83–1.03), Conditioning 1.05 (0.87–1.27) ns, Non-conditioning 0.90 (0.69–1.16) ns, games-missed 0.90 (0.85–0.96), hamstring games-missed 0.73 (0.61–0.88) — `0098:40-42` — **VERIFIED**. Null is underpowered (all CIs cross 1.0), depends on the continued-trend counterfactual, concurrent safety changes confound; adopt the ITS *design*, not the "no sustained increase" conclusion.
- 0533 ↔ 0098: the medshift decomposition is the exact tool to split practice-load effect from safety-rule-mediated effect in the 0098 question (INFERENCE — unrun).
- Residual-correction architecture: CRAFTER residual mandates (1851) — "feeding covariates directly to a covariate-capable backbone can substantially degrade the raw forecast" (`1851:26-37`); DeepGLEAM hybrid 66.03 vs GLEAM 73.59 vs pure deep 239.94 (`0473:26`) — both **VERIFIED** in ledgers. Two independent arrivals at "new signals enter as corrector features on frozen-engine residuals."
- Rule shape (d25): TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG; magnitudes are calibration tasks solved by backtest (no numbers set in spec) — `total-signal-wiring-spec.md:55,64` — **VERIFIED** ("7 families" is brief wording). Player `signals` table: 0 rows ("The prop pipeline has no fuel") — `:38,94` — **VERIFIED**.

---

## 8. NLP / intake / trust-signal machinery

- Injury NLP trio (d03): 1594 BERT 99.8% held-out / 92% new-source (shuffled 80/20 leaks same-game sentences — use 92%, never 99.8%) — `1594:26,23,32` — **VERIFIED**; 1722 T3 +20.6pp / −62.8% RMSE over ZS-CoT; masking dismissal summaries collapses Gemini 86%→49% (reasoning partly extractive cue-matching); basketball anonymization collapse 62%→35% — `1722:44,46` — **VERIFIED** (evidence spans + conflict flagging + anonymization-perturbation are load-bearing); 1308 Mistral-7B 76.1/64.2 vs GPT-4 80.2/70.3; κ=0.68; against-class n=15 — `1308:11,26` — **VERIFIED** (German-only; quotes/replies excluded).
- Scouting-text draft lane (0844): TextCNN 69.02%/56.42% F1; leakage — surnames alone gave 100% recall ("alford" 0/47 neg/pos); names/teams/numerics must be masked — `0844:45,47,21` — **VERIFIED**. Standing rule: the masking protocol applies to every future GSE text model, including the trust-signal lane.
- Weak-signal engine: mention spike 30+ min; rumor cluster = 3+ independent Tier-5 sources; market correlation = 1.5+ point move; verification gap 2+ hours unconfirmed; outputs watchlist flags only, never verified facts; uncorroborated signals EXPIRE after 30 min; crawler BLOCKED on source-policy approval (BLOCK-7) — `brain/weak-signal-engine.md:37,148-150` — **VERIFIED**.
- Intelligence routing: Tier-5 uncorroborated after 30 min → EXPIRED; no Tier 1/2 settlement confirmation within 6h → SETTLEMENT_PENDING; source reliability ±5/event, 30-pick rolling; Tier 6 (model output) never cited as evidence — `brain/intelligence-routing.md:148,265,306,315,327` — **VERIFIED**.
- AIRWAVE legal spec: paraphrase-only (no verbatim quotes in public output); public output needs operator_status=APPROVED + rights in (OWNED, PUBLIC, LICENSED); UNFALSIFIABLE claims cannot produce pick evidence — `docs/ai/airwave/AIRWAVE_SOURCE_POLICY.md:38,67,80–82,105` — **VERIFIED** (the legal answer to map gap #1).
- News sentiment (1112): Aigents Pearson 0.57 vs labels; aggregate temporal correlations ~0.15 at 1–2 day lags; compound 0.55 at lag −1 — `1112:26,32` — **VERIFIED-but-misleading**: ledger's own snooping flag (selection optimized on the same six-month series, no held-out); treat sentiment-level result as negative example; the portable idea is the *disagreement* metric (untested).
- Market Gravity: G = 1 − (D_late/D_early) clamped [−1,1]; null on <2 books / <2 snapshots / D_early<0.25pp; stated weaknesses (convergence≠correctness, book-composition bias) — `models/market-gravity-index-proposal.md:22` — **VERIFIED** (proposal, not backtest).

---

## 9. Drift / monitoring / honest-publication machinery

- ECDD (1884): λ=0.2 ([0.1,0.3] insensitive); degree-7 polynomial L for ARL_0; proposed ARL_0=272 games for the win-prob error stream — `1884:14,22,52` — **VERIFIED** (assumes i.i.d. Bernoulli drift — NFL outcomes are clustered; stratify/schedule-adjust first — INFERENCE).
- Sliding-window OGD (r25): Beta-map `g = σ(a·logit p + b)` under log-loss, trailing window 120; deltaA/deltaVarCal/expansionPreferred decision table; diagnostics-only, never a publish policy — `ops/SLIDING_WINDOW_OGD.md:7,12-15` — **VERIFIED**.
- Calibration floors: `CALIBRATION_AUTO_APPLY=false` MUST — `launch-qa-addendum.md:87` — **VERIFIED**; drift 0.02 absolute Brier over 30 days — `:177` — **VERIFIED**; 100-settled-pick gate for public performance stats — `operator-playbook.md:24,49` — **VERIFIED** (layered with 30-per-model-version in Sports OS doctrine, not a contradiction).
- Public honesty demo (r25): pundit hit rate withheld below 25 decided calls; five reason codes FIRE/NO_BET_LCB/NO_BET_WIDTH/INSUFFICIENT_CALIBRATION/(+1); "not judged" = stratum <100 picks — `ops/archive/dated/PUBLIC_HONESTY_DEMO_SCRIPT.md:17,86-87,96` — **VERIFIED** (2026-07-03 era; policy constants presumably hold).
- Claim-evidence ledger (r22): claim-evidence-entry / edge-experiment-entry / calibration-report-entry schemas (claim, evidence, source+hash, blockers) in `fable/evidence/EVIDENCE_INDEX.md` — **VERIFIED at brief level** (schema names verified; field-level check vs Garrett's 17:34 bar not done — INFERENCE that they satisfy it).
- Fable uncertainty triage: least-confidence = 1−max(p); margin = top-two gap; normalized entropy — `fable/UNCERTAINTY_AND_ACTIVE_LEARNING.md:10-12` — **VERIFIED**; forensic-report fixture `abs(0.59−0.48)=0.11` delta + fixture falsification rules — `fable/demo/PUBLIC_DATA_FORENSIC_REPORT.md:27,39-40` — **VERIFIED**.
- Clean Rooms k-thresholds: media/creator k≥50; DFS/sportsbook k≥100; sports-data provider/team/league k≥25 — `fable/aws/AWS_CLEAN_ROOMS_PARTNERSHIP_PLAN.md` — **VERIFIED at brief level** (doc is scaffolding: no partner, no dataset yet).
- CLV grader problem: 23.0% against a 52.4% requirement "cannot be read as a statement" — mint/close averaged over different book sets; 52.4% is the ESTABLISHED rung (≥500 settled + verified CLV≥52.4%, `LAUNCH_LEDGER.md:109`); fix = grade over bookmaker-key intersection only, refuse on empty intersection, count refusals by reason — `ops/hermes/BUILD-QUEUE-2026-09-18-rulers.md:108,113,139` — **VERIFIED**.
- `gate_decisions` holds 1,167 rows (2026-06-10→06-11), nothing since — no code writes it; readers on fallback paths 3+ months — `BUILD-QUEUE-2026-09-18-rulers.md:154` — **VERIFIED**.
- Conformal: n=5, α=0.1 claims 90%, delivers 83.33% after clamping — fix: return +infinity (refusal) below the sample floor, per stratum — `BUILD-QUEUE-2026-09-18-rulers.md:201,204,215-216` — **VERIFIED**.
- nflverse identity crosswalk: snap_counts is `pfr_player_id`-only (bridge via roster); PFR ids are strings (`MahoPa00`), never coerce; season-matched rosters, first-write-wins — `ops/NFLVERSE_GSIS_CROSSWALK.md:13,44,49` — **VERIFIED** (prevents a silent inner-join data loss; foundational).
- PROVE_THE_EDGE: "53–55% ATS; 57% sustained is legendary" (line 26) vs "~52–56%" task ask (line 38) — **FLAGGED**: two win-rate caps in one doc; adopt one figure and delete the other.
- 2025 holdout: 285 games, ALL ASSOCIATION_ONLY — "Not agreement, not a cause, and not a pick" (one probability source per game) — `reasoning/2025-holdout-distribution-v2.md:9,13` — **VERIFIED**.
- Total-signal family weights (d23): EFFICIENCY .22, TRENCHES .14, SITUATIONAL .12, MICROCLIMATE .08, LUCK .05, NARRATIVE .05, MARKET .28, MARKET_MICROSTRUCTURE .06 (sum 1.00, verified arithmetic) — `HANDOFF-CONTINUE-WIRING-2.md:114` — **VERIFIED**. 14,448 items wired 100%; WHAT REMAINS: PageHinkley/PUDD not wired as live alarms; `wireEverything` only called from its own tests; 15+ orphaned edge-lab computations — `:137,139` — **VERIFIED**.

---

## 10. Misc verified (substance + ops)

- NGS pressure rule: pressure = P(pressure) > 75%; pressure rate = pressures/pass-rush snaps (average rusher 10.3%); avg time-to-pressure 2.9s; quick <2.5s; positive rush rate avg 54% — `nextgenstats-profile/ngs-implementation-playbook-2026-09-21.md:62` — **VERIFIED**. OPEN discrepancies marked do-not-use: Van Ness five-of-nine <2.5s vs five pressures second half; Josh Allen 55.3% (CPOE vs blitz-rate mismatch) — `:124-125` — **VERIFIED**.
- NGS completion model: XGBoost on 36,000+ attempts back to 2016, r²=0.98 vs actual on 10% holdout — `ngs-implementation-playbook-2026-09-21.md:26` — **VERIFIED as reported-by-NFL** (vendor model; GSE cannot audit).
- nflverse NGS assets verified 1:1 vs nextgenstats.nfl.com on 2026-07-03 (JSN 2025 avg_separation 3.018 vs site-rounded 3.0; James Cook RYOE 358.16 identical); legal frame Feist + NBA v. Motorola + hiQ; vendor OUTPUTS (RYOE, xYAC) = the careful zone (attribute, never present as GSE's; vendor numbers as calibration truth via `ngsReceivingToSeparationTruth`, `ngsPassingToCpoeTruth`); PFR explicitly DO-NOT-SCRAPE — `data/ngs-legal-leverage.md:12,27,29,68,104-105` — **VERIFIED**.
- NGS tracking ingest spec: `player_id, week, position, avg_separation, route_efficiency, target_rate, snap_count_pct`; 7-day TTL; aggregates-only — `performance/radar-and-tracking-data-layer.md:156-157` — **VERIFIED**.
- SIGNAL-GAPS coverage: stadium_physics 35→~5 true; officials 31→~5 true; competitor_intel 26→~0 true; social_relationships 10→~2 true (real one is SMOGS) — `arxiv-program/index/SIGNAL-GAPS.md:20-23,33` — **VERIFIED**.
- existing-research-map numbers (EPA forward-validity 0.53–0.61 vs rush 0.13–1.9; Stuart 0.00/−0.02; pressure-vs-sack R²<0.005; STRAIN r=0.8545) — `arxiv-program/state/existing-research-map.md:124,130-132` — **VERIFIED as present-in-map** but **UNVERIFIED as primary claims** (map-cited, not independently measured there — do not wire as engine constants until traced to primary).
- Vision baseline (internal, GSE): `buildTracklets` greedy IoU (minIou 0.3, maxGapFrames 5) → 52–65 tracklets from ~6 players (0.6–0.8s median life); 57-frame eval precision 1.00 / recall 0.74 ("must reproduce before any tuning"); Sloan CART 86.5% QB position / 72.3% formation over 29 classes — `research/2026-10-01/cv-corpus/deep-dive-harshraj-linkedin.md:50`, `top-kernels.md:29,57` — **VERIFIED as in-file** (third-party anchors — Craig 75%, Goyal 80%, Newman 85% — are via thesis bibliography; Harshraj params [DERIVED] clean-room, not author-stated).
- StatKing audit: 546 seeded sources; legally-usable coverage smaller than seeded universe; licensed route/pressure/coverage/tracking/grades/trenches need contracts or first-party charting — `statking-alerts.md:12` — **VERIFIED**.
- ethandojo handoff: claimed caption record W1 10-6 / W2 11-5 — `handoff-ethandojo-nfl-builds-2026-09-25.md:14` — **VERIFIED as claimed-by-subject** (spreads/ML detail uncaptured; UNVERIFIED as a result). Recipe (XGBoost on nflverse 2018+, QB efficiency/explosives/turnovers/pass rush/point-diff/availability/roster-change; 10k-iteration season sims) is his stated recipe — VERIFIED as reported; his 10 modules are Motif's derivations (INFERENCE).
- Grok stack audit: n=241 "a high-quality kill test, not a discovery test"; acceptance gate "die cleanly on pure noise"; Bickel & Kim 2–4% posterior for a real MLB totals edge — `ops/edge/2026-08-20-grok-stack-audit.md:20` — **VERIFIED**.
- DFS oracle proof (d37): before — 6 shipped slates 2 at optimum / 4 beaten (cash 120.0 vs 120.5; GPP 216 vs 218); synthetic 78 — 55 at optimum / 23 beaten (max gap 5.86%), 12 structural violations; after fix — 6/6 and 78/78 at optimum, 0 beaten, 0 violations; CI test `dfs-optimizer-optimality.test.ts` — `strategy/dfs-tooling-vetting-2026-09-12.md:178-208` — **VERIFIED**, with the brief overstating "proof" (only `optimizeOne` oracle-checked; N-unique portfolio path bounded-budget, NOT oracle-verified — `:217-228`).
- DFS week-3 optimizer: repair delta double-stack 4→41, TE-in-FLEX 38→0; final portfolio 18+17+1=36 lineups; ownership PROXY "LOCAL ONLY" — `dfs-week3/REPORT.md:8,9` — **VERIFIED**. S5 wants distributions+covariance, not static constants — explicit build delta.
- 1349: dominance pruning ~10^23 → ~7×10^7; 72% of 385 ex-post optimal teams diverse; 11 of 12 other variables diverse — `1349:34,35,37` — **VERIFIED-but-misleading**: oracle by construction (ex-post optimum); the 72% is not evidence diversity works prospectively — test it prospectively.
- 1761: SCO earns +$214.33/hand over ICM; favored in 2,433/2,838 (85.7%); jam-frequency shift 14.08% avg, 32.42% at button — `1761:40-42` — **VERIFIED** (poker domain; numbers don't transfer to DFS; the continuation-pricing *principle* ports).
- 1473 FPL: claimed 3,718-point dream team; overforecast 87; per-player best RMSEs 60/40 (Vardy 2.539) / 30/70 (Sagna 2.013) contradict the chosen 40/60 blend — `1473:28-30,16,25` — **VERIFIED as in-source internal contradiction**; adopt forecast→ILP architecture only.
- HF infra (2026-09-28 live-verified): Beexly account isPro, canPay, prepaid, **`orgs: []` — no Beexly org** — `engine/research/2026-09-28/hf-leverage-round2/laneC-platform.md:13,14` — **VERIFIED**.
- 2025-holdout LAC_BUF registry row: edge sum 0.30259224777263855, coverage 0.68 — `overnight-agent-prompt-2026-09-26.md:281` — **VERIFIED**.

---

## Corrections carried from the task (for the record)

**(a)** Walsh & Joshi "+69.86% higher returns" is an unvalidated second-hand pointer, NOT corroborated evidence (§2b above).
**(b)** The map's "1172 ranking lasso" is wrong — 1172 is the forecast combination puzzle (Frazier et al., arXiv:2308.05263); zero "lasso" mentions (§3b above).
**(c)** The d05/d06 full-tables QB splits (Mayfield-vs-blitz etc.) are verbatim X transcriptions with author-defined universes — underlying numbers UNVERIFIED; need nflverse recomputation before becoming engine inputs (§1a above).
**(d)** FPOE has an INVERTED sign convention in its dossier (negative = outscoring) and a pre-registered FAIL (Δrho=−0.0165, n=6022) — descriptive only (§6 above).
