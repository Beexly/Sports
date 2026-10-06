# c09 Syntheses — Phase 2 cross-chunk compositions

**Slice:** c09 (NFL intelligence: qb-behavior, coaching, trust-signals, reasoning) — 10 deep-analysis chunks, 2026-10-02.

How the findings from different chunks compose into bigger systems. Every composition cites its sources; INFERENCE is labeled as such. Cross-referenced files in `~/workspace/corpus-intelligence/deep/c09/working/`.

---

## SYN-1. The closed calibration loop (0433 → 0473 → 0503 → 0564)

Four papers from two chunks close a single loop: **generate well-ordered signals → emit calibrated intervals → cluster them correctly → prefer calibrated probabilities over raw ratings.**

- **Joint GLMM (0433, d02 S1):** joint models of (YPP, win) and (sacks, win) beat binary-only win models on win log-loss in every season 2005–2013 (fumbles+win deliberately null — the control that proves the gains aren't leakage). The design pattern: auxiliary continuous outcomes (per-play efficiency, pressure) carry signal that binary win outcomes alone lose. Adoptable piece = the joint-likelihood *template*, not the college numbers.
- **MIS/quantile heads (0473, d02 S1 / r01 S8):** L_MIS heads produce (1−ρ) intervals with a residual |y−f| guard; DeepGLEAM hybrid wins 1-week-ahead RMSE 66.03 vs GLEAM 73.59 vs pure deep-learning 239.94. But the fine print matters: no significance tests, weak MC-dropout straw-man, "deep fails under shift" is partially the benchmark's choice.
- **Game-clustered bootstrap (0503, d02 S2 / r01 S7):** 4,101 games → 2,291 independent-play equivalents (56%); nominal-90% i.i.d. intervals cover at 0.60 ± 0.01 (width 0.027); φ=0.35 fractional-cluster restores 0.90 ± 0.01 at 2.3× width. **Do NOT hard-code φ=0.35** (tune on nflverse 2020–2024). Tails stay hard (~85% conditional near WP 0.3/0.7). Caveat: toy simulator (d02 C6).
- **√K law (0564, r01 S18):** the exact-calibration limit E[(1/N)|X−ρ|_1] ≤ ((N−1)/N)√(8K/ℓ_η) for K ≤ ℓ_η/2; Prop 12 says the transformed prediction E[b(2X¹)] is *exactly* unbiased (lands on the diagonal). The slogan: **trust calibrated probabilities over raw ratings** — use as K-factor *scheduling discipline*, not a theorem to quote (all numerics N=2, no t-rate, needs correct model spec).

**What it composes into:** the c09-intelligence pipeline is 0433 (joint structure) → 0473 (interval heads) → 0503 (clustered uncertainty) → 0564 (calibration discipline) — each layer addressing the previous layer's failure mode. This is the recommended feature-extraction → interval → uncertainty order for the QB-behavior/trench/scheme stack.

## SYN-2. The uncertainty stack: QOOB + ACI + AC-RAC

Three nested-conformal papers compose into one deployment pipeline (r03 S1–S3):

1. **QOOB (1650):** beats split-CQR at small n (narrower at valid coverage) on all 6 UCI sets — this is the cold-start solution for **weeks 1–6**, where the engine has almost no data. A wire-disabled implementation exists in-repo (`1910-10562-nested-conformal-qoob.ts`, `ENABLED=false`) with a defined gate (width ≤90% of split-CQR at coverage ±2pp for k≤6 weeks).
2. **ACI (1640):** once data accumulates (weeks 7+), split-CQR + ACI with α_{t+1} = α_t + γ(α−err_t), γ=0.005 sweet spot. AC-RAC's own exchangeability assumption (violated by NFL weeks) is patched by ACI upstream. Implementations exist (`aci-durable.ts`, `aci-state.ts`). **Audit item:** err_t must be computed on the *published* interval, not the latest revision.
3. **AC-RAC (2142):** at decision time, max-min action selection; the *only* method with valid conditional coverage across all actions at α=0.05; critical error 0.21–0.35% vs RAC's 3.35–4.70%.

**The stack:** QOOB (weeks 1–6) → ACI-tracked split-CQR (weeks 7+) → AC-RAC max-min action selection. Each solves the previous layer's weakness (cold start → distribution shift → action-conditional validity).

## SYN-3. The three-stage abstention stack: DAC → SPTD → CARL

Two chunks agree on the architecture; d02 (S3) and r02 (S18) specify it as one system:

- **Stage 1 — DAC (0693, label denoising):** discards samples, not predictions. CIFAR-10 ResNet-34 at noise 0.2/0.4/0.6/0.8: baseline 88.94/85.35/79.74/67.17 → DAC 92.91/90.71/86.30/74.84, beats oracle at 0.2 noise. **NFL warning (load-bearing):** at 0.8 noise DAC removes 75% of data — that would delete a whole season. Gate: ≤25% abstention.
- **Stage 2 — SPTD (0715, post-hoc, monotone):** coverage-50 99.8 vs DE 99.7 vs SR 98.6; coverage-90 96.5 vs 96.8 vs 96.4. The 0715 theorem is load-bearing for the whole program: **monotone post-hoc calibration (temperature scaling) CANNOT reduce the ranking term ε_rank** — this is why d29's resolution≈0 is *structural*, not a data accident, and why the calibration crisis (§challenges) can't be fixed by calibration alone.
- **Stage 3 — CARL (1008, pre-hoc, learned):** ℓ⁽¹⁾ λ=1 → 68.1/30.0/1.8 (correct/abstain/incorrect). But the honest comparison: at similar abstention CARL is *worse* than the margin-threshold baseline (35.8% vs 29.2% adversarial error) — the "reduces adversarial error" headline invites the wrong comparison.
- **Copy constraint (1152):** inaccurate-subset accuracy Alone 62% → +AI 50% → +Selective 55%, and FNR stays elevated 31%→41%→42%: *announcing* abstention keeps false-negatives elevated — the public-facing constraint on how abstention is communicated.

**What it composes into:** the no-bet ladder is discard-samples → calibrate-what-remains → abstain-on-the-hard-remainder, gated at ≤25% removal, with 1152's copy rule governing public presentation.

## SYN-4. The 6-layer unified call order (r01 S20 + d06)

Two chunks independently converge on the same ordered stack — r01 S20 names it, d06 formalizes it as a typed, gap-aware pipeline (BS-4):

1. **Availability/trench** — injury status, pressure rates, pocket stability
2. **Scheme/coaching** — play-call tendencies, situational decision quality
3. **QB behavior** — decision quality (EHCP), pressure sensitivity, coverage reads
4. **Pair trust** — QB–receiver chemistry (JOI), trust features
5. **Projections** — rating layer (phantom-BT, Mn-Dirichlet, √K) → distributions
6. **Calibration → combination → sizing → no-bet** — scalars, ensembles, Kelly stack, abstention gates

**The ordering is a dependency, not a preference (d06 BS-4):** OL state conditions scheme options; scheme conditions QB reads; QB conditions pair trust. Concretely: a QB's pressure grade is meaningless without the OL pressure rate underneath it; the air-yards portfolio is meaningless without the coverage shell split. The pipeline uses typed context objects (TrenchContext → SchemeContext → QBContext) with **explicit DATA_GAP states** — `qbUnderPressure` is missing from nflverse, so it must be computed, not imputed. r02 S24 names the same ordering: OL↔scheme as conditioning set for QB decisions ("QB behavioral profiling in c09 must condition on the scheme context").

## SYN-5. The residual-correction doctrine: new signals enter as corrector features, never as engine inputs

Three independent arrivals at the same architecture (d04 #1, d02 S11, map):

- **CRAFTER (1851, d04 #1):** "feeding covariates directly to a covariate-capable backbone can substantially degrade the raw forecast" — residual mandates make direct covariate injection *actively harmful*. The recommended build: freeze the engine, learn new signals (QB pressure, trench metrics, trust features) as corrector features on the residuals.
- **DeepGLEAM hybrid (0473, d02 S11):** residual-vs-market deep learner (1W RMSE 66.03 vs GLEAM 73.59 vs pure deep 239.94) — the same pattern in a different domain.
- **The existing-research map:** residual architectures appear as an established pattern (`state/existing-research-map.md`).

**What it composes into:** the c09 intelligence build is a *residual-corrector layer on a frozen engine* — every new signal from the QB/coaching/trench trust stack enters as corrector features with the residual-vs-market gating from d02 S11 (signals must explain *engine residuals*, not the target directly). This also answers the d06 "how do full-tables transcriptions enter the engine" question: they enter as residual-corrector candidates *after* nflverse recomputation, never as direct inputs.

## SYN-6. The sizing stack: decision-metric weighting → δ/σ gate → Kelly

The full staking chain, composed across d02, d03, d06, r02, r03:

1. **Constitution (0791):** CRPS-optimal ensembles earned *lower* trading profits than equal-weight qEns counterparts; all ensembles earn 80–96% of crystal-ball profits; CRPS learning ≈500× slower. **The rule: optimize ensemble weights on CLV/P&L, never on CRPS.**
2. **One-step combination (1172, r02 S7):** standard DM/White tests lose power by 10–50× (0.010–0.012 vs 0.154/0.304/0.655 at T=1000/2000/5000); the puzzle ("optimal ≈ equal") is a two-step estimation artifact. **Flag:** any GSE "not significant, keep equal weights" result from standard tests on ~270 games may be this artifact (r02 inference).
3. **Multi-pick Kelly (0813):** f_K(p)=2p−1; p=0.51 needs L≥1,761 for full-Kelly growth within 10% (finite-memory correction G(p,L)≈G_K(p)−1/(2L)).
4. **Maximin-drawdown (0834):** 9.4%/−3.3% max DD vs Markowitz 5.7%/−6.1% — one 3-month COVID window; author calls it "preliminary."
5. **δ/σ gate (1748, the merge point):** E[growth] = 2(δ²−σ²)Φ(δ/σ) + 2σδφ(δ/σ); design: stake iff δ_perc > 1.5σ, scale Kelly by Φ(δ_perc/σ). Three chunks specify it (d02 S4, d03 #2, map #15) — merged here; must be **re-derived for general decimal odds** before deployment (1748 is even-odds/small-δ/normal-ξ).
6. **Dual-objective NSGA-III (1463):** joint calibration+bankroll optimization; the knee dominates single-objective weights — but cost tables weren't transcribed, and "simpler scalarization may reach the same knee cheaper" is unablated.
7. **Correlated-slate Kelly (1212):** closes the named GSE gap — `kelly-investigation.ts` sizes single bets independently; the Gaussian closed form f = μ/(μ²+σ²) gives the multivariate extension ("positive correlation reduces optimal fractions").
8. **Kelly-gap diagnostic (1232):** g_t⋆ − g_t^π = ½‖θ_t − σ_tᵀπ_t‖² — the audit identity for how much sizing is being left on the table.

**What it composes into:** decision-metric combination → δ/σ gate (re-derived) → multivariate Kelly sizing, with the 0813/0834/1222/1232/1630/1761 supporting machinery as specified lanes. The gate ordering matters: nothing is sized before the scalarizer f1=1 gate clears and the abstention ladder abstains.

## SYN-7. The trust-quantity assembly: JOI + EHCP + AIRWAVE + weak signals

Map gap #1 (no social/video quote mining, no QB–receiver public trust dynamics) is the intelligence program's headline gap, and four chunks each contribute a leg:

- **JOI (0910, r02 S2):** pair chemistry is *predictive* (joint-impact RMSE 0.04464 vs 0.05448, ~18%), seen-pair-only effects decay after ~50 matches, unseen pairs need a CatBoost predictor (ρ ≥ 0.40 gate). Defensive JDI is a null — skip. Transfer is via the pair-chemistry *mechanism*, not the soccer numbers.
- **EHCP (0402, r01 S1):** the QB decision-grade: % throws to max-EHCP receiver (Winston 26.8% vs Wilson 13.2%), throw-away rate, receiver credit/blame (Tate +11.8pp, Bryant −18.4pp). Caveats: random splits, no pressure features, thrown-passes-only selection bias.
- **AIRWAVE legal spec (r01 S19):** the *legal* answer to the trust gap — paraphrase-only output, operator_status=APPROVED + rights in (OWNED, PUBLIC, LICENSED) required, UNFALSIFIABLE ≠ pick evidence (`AIRWAVE_SOURCE_POLICY.md:38,67,80–82,105`). The trust-signal module mines press conferences/interviews via paraphrase-only intake; it can produce *context*, never pick *evidence*.
- **Weak-signal engine (d04 #6):** the intake substrate — 30-min spike threshold, 3+ independent Tier-5 sources = rumor cluster, 1.5+ point move = market correlation, uncorroborated signals EXPIRE after 30 min, crawler BLOCKED on source-policy approval.
- **0202 + 0332 (d01 S1):** evidence-grounded reasoner (timestamp/box-grounded answers) + video denoiser (finding trust-relevant moments) = the retrieval substrate for video quote mining.

**What it composes into (INFERENCE):** the trust-signal module is 0202-retrieval + 0332-timestamping over press-conference/interview video, gated by the AIRWAVE legal spec, emitting Tier-5 weak signals (JOI/EHCP pair statistics as the quantitative counterpart). The weak-signal Tier-5 → Tier-1/2 corroboration ladder (`intelligence-routing.md`) is the governance. One more leg (r01 S2, 0289): a production video-summarization system for NFL games with an NFL IP caution.

## SYN-8. The market-informativeness gate (0866 → 1359 → 1735)

Three papers on market prediction compose into one pre-deployment screen (d03 #1, adopting 0866/1359/1735 as a system):

- **0866:** PredictIt consensus fails all four wisdom-of-crowds tests (two political binary markets).
- **1359:** steady-state whale distortion δ_S = ρΔ_S (~40% capital threshold — simulation, not a market fact).
- **1735:** information gain saturates at log 2 ≈ 0.693 nats; identifiability floor ω₁ ≈ 0.15 (synthetic-only — re-estimate on real odds).
- **CL1–CL9 (d04 #5):** the closing-line forecaster — nine claimed findings, each needing a specific test; the *build* it mandates is concrete: a closing-line forecast (CLF) table + CL1..CL9 feature table + an ablation harness on the 2020–2024 closed odds archive.

**What it composes into:** the Market Informativeness Gate fires before the engine trades on any consensus number — check whale distortion, information saturation, and wisdom-of-crowds failure modes *before* treating a market price as a signal. If the gate fails, the line is a settlement target, not a signal.

## SYN-9. The nested-dependency pattern (0242/0584 β₃ + d22 kneel-outs)

Two apparently unrelated findings are the same phenomenon at different levels:

- **Nested score models (0242/0584):** 3–6 point wins in EURO 2016, 3–6 point RPS reductions, the WC-2022 top-2 containing the actual winner — but the ZIGP's *only adoptable piece* is the **β₃ pilot test** (≥0.5% exact-score log-loss improvement) because nested models misrank systematically (0584's Elo ranks are wrong — e.g., WC 2018; the 0242 ledger never reports its own Elo ranks).
- **Kneel-outs / garbage-time (d22, map #10):** kneel-outs delete pass attempts for big favorites; hurry-up garbage time inflates trailing QBs — nested end-state dependencies inside *games*, same as nested score dependencies *between* games.

**What it composes into (INFERENCE):** the end-state compositional simulator (d04 #4, r01 S6) is the single build that eats both — kneel-outs, garbage-time, nested scores, ZI-Skellam margin shapes (1791) — with the β₃ pilot as the acceptance gate. All other nested machinery is conditional on that gate.

## SYN-10. The honesty machinery: scalarizer + evidence ledger + claim-evidence triad

Three chunks converge on one governance doctrine (d05, d06, r04):

- **The scalarizer (d06 BS-8, d05, d04):** f1 = 0 ⟺ |r|≥0.08 AND |slope|>se on true holdout; only g=0 LIVE; "Honesty failing is DARK" — adopted **verbatim** with a **byte-for-byte DARK reproduction gate** (the documented officials/wind/coaching DARKs are the regression suite).
- **The claim-evidence ledger (r04 #3):** claim-evidence-entry / edge-experiment-entry / calibration-report-entry schemas (r22, `fable/evidence/EVIDENCE_INDEX.md`) — every edge claim carries its evidence, source+hash, and blockers.
- **The evidence-grade governor (d06 BS-13):** every output carries {value, evidenceGrade, basis, modelVersion, sampleInfo}; the 2025-holdout ALL-ASSOCIATION_ONLY regime ("Not agreement, not a cause, and not a pick") is the worked example of graded evidence in production.
- **The audit-receipts doctrine (ALIGNMENT_SYNTHESIS):** Garrett's 17:34 challenge — completion claims now arrive with test counts, what was exercised, where the logs live. The r22 schemas are the format; the claim-evidence ledger is the artifact.

**What it composes into:** the honesty layer sits *between* the engine and any public surface — the scalarizer gates whether a signal exists, the evidence-grade governor grades how strongly it exists, the ledger records the evidence, and the audit receipts are what get shown. Public surface = projections and rankings only; NGS internal-only (Garrett's 2026-09-28 HARD doctrine).

## SYN-11. The QB-profile feature inventory: what goes INTO the behavioral store

Composing d35, d34, d06, r01, r02, d05 into one intake specification for the QB Behavioral Profile Store:

- **Core split (STAGED/DATA_GAP):** clean vs pressured CPOE/EPA (Stroud 0.45 EPA/db clean; Rush −21.3 CPOE / 80% pressure-to-sack) — the #1 gap, computed not imputed.
- **Coverage-conditioned reads:** Purdy vs zone 8.71 YPA (transcription — needs nflverse recompute); Love 78.6% first-read / 35.7% bad-throw.
- **Pressure response:** Geno 0.00% negative-graded dropbacks; Wilson–Gannon 4-0, 104.4 rating; Rush pressure-to-sack 80%.
- **Decision quality:** EHCP max-receiver rate (Winston 26.8% vs Wilson 13.2%); aggressiveness (Stroud 21%); accurate-throw rate.
- **Pair trust:** JOI-style joint impact; McConkey ON/OFF as a feature *idea*; Tate +11.8pp / Bryant −18.4pp credit-blame.
- **Shell interaction matrix (d05 #1/#2):** QB × blitz/coverage interaction features recomputed from nflverse, conditioned on the OL pressure rate (SYN-4 ordering).
- **Governance:** singleton-diagnostic (flexBART DGP2), second-party provenance tags ([2P] salaries), season-frame matching (WR phase1 mismatch as the negative example), nflverse identity crosswalk (PFR strings never coerced).

---

## Key corrections (task-mandated, repeated verbatim for the record)

**(a)** Walsh & Joshi "+69.86% higher returns" is an unvalidated second-hand pointer from the 0282 survey (`0282…:30,50,66`), NOT corroborated evidence — the review never validated it on NFL data in-repo and flags its own publication bias.
**(b)** The map's "1172 ranking lasso" is a cataloging error — 1172 is the forecast-combination puzzle (Frazier et al.), zero "lasso" mentions in the ledger; it belongs in ensemble-combination, not ranking.
**(c)** The d05/d06 full-tables QB splits (Mayfield 5.42 YPA vs blitz, Purdy 8.71 YPA vs zone, Wilson 41.6% target share vs blitz, JSN 58.7% first-read vs Cover-4) are verbatim X transcriptions with author-defined universes — the transcriptions are verified, the underlying numbers are UNVERIFIED and need nflverse recomputation before becoming engine inputs.
**(d)** FPOE has an INVERTED sign convention in its dossier (negative = OUTscoring expectation, `dossier-v2-accounts.md:317`) and a pre-registered FAIL (Δrho = −0.0165, 95% CI [−0.0396, 0.0086], n=6022, 2020–2025 holdout) — descriptive only, do not weight.
