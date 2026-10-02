# c09 Buildable Systems — Phase 2 consolidated, deduped

**Slice:** c09 (NFL intelligence: qb-behavior, coaching, trust-signals, reasoning) — 10 deep-analysis chunks, ~100 systems specified, deduped below. 2026-10-02.

**Merge convention:** duplicate specifications (δ/σ gate, CLV grader, scalarizer, scheme layers, QB stores) are merged into a single entry with the best-specified version first and all chunk cross-refs. Gate phrases (STAGED, PARKED, DATA_GAP, DATA-BLOCKED, QUEUED) are load-bearing — do not drop them. Read-only on `~/workspace/vendor/Sports/` — these are build specs, not builds.

---

## TIER 0 — The six mandated priorities (in task order)

### 0.1 Trust-signal intake module — the intelligence program's headline gap (map #1)
- **What:** social/verbal/media intake for QB–receiver public trust dynamics + press-conference/interview quote mining. The map's gap #1 is unfilled by *any* c09 chunk — no build exists yet. This is priority #1.
- **Spec:** retrieval substrate = 0202 evidence-grounded reasoner (timestamp/box-grounded answers) + 0332 denoiser (timestamping trust-relevant video moments) over press-conference/interview video (d01 S1, INFERENCE composition). **Legal spec is non-negotiable:** AIRWAVE paraphrase-only — no verbatim quotes in public output; public output requires operator_status=APPROVED + rights in (OWNED, PUBLIC, LICENSED); UNFALSIFIABLE claims cannot produce pick evidence (`AIRWAVE_SOURCE_POLICY.md:38,67,80–82,105` — r01 S19). Output is Tier-5 weak signals only, governed by the weak-signal engine (30-min spike; 3+ independent Tier-5 sources = rumor cluster; 1.5+ point move = market correlation; uncorroborated signals EXPIRE after 30 min; crawler BLOCKED on source-policy approval BLOCK-7) and the intelligence-routing ladder (Tier-5 → Tier-1/2 corroboration; source reliability ±5/event, 30-pick rolling; Tier 6 never cited as evidence). Copy rule from 1152: *announcing* abstention keeps false-negatives elevated — the same applies to surfacing uncorroborated signals. All text models use the 0844 masking protocol (names/teams/numerics masked — surnames alone gave 100% recall leak).
- **Cross-refs:** r01 S19, d01 S1, d04 #6, d03 #7, r02 S22, r03 S7-adjacent. Related but separate: 0289 video summarization (NFL IP caution).

### 0.2 QB Behavioral Profile Store + clean-vs-pressured splits (DATA_GAP)
- **What:** the canonical per-QB store; clean vs pressured is the #1 missing split.
- **Spec:** schema covers the d35 qb-full-pool features (CPOE, pressure-to-sack, first-read %, aggressiveness, air yds/att, EPA/db clean/pressured — the Stroud/Rush/Love/Geno anchors) + EHCP decision grade (0402: max-EHCP rate, throw-away rate) + JOI pair chemistry (0910: unseen-pair CatBoost ρ≥0.40 gate) + d05 shell interaction features (QB × blitz/coverage recomputed from nflverse) + trust features (d06 BS-3). **DATA_GAP:** `qbUnderPressure` missing from nflverse — computed, not imputed (BS-4). Provenance discipline: [2P] tags on second-party salaries; season-frame matching (wr-verify mismatch = negative example); nflverse identity crosswalk (PFR strings, never coerced); singleton diagnostic (flexBART DGP2). STAGED: clean/pressured, WR coverage splits, OL outs table. First consumer: d05 #1/#2 pressure/coverage interaction matrix recomputed from nflverse (the highest-leverage build of the chunk).
- **Cross-refs:** d06 BS-1, d05 #1/#2, d35 (map #1), r01 S1/S2, r02 S2, r04 #5.

### 0.3 Scalarizer adopted verbatim + byte-for-byte DARK reproduction gate
- **What:** the f1 honesty gate, adopted exactly as specified.
- **Spec:** f1 = 0 ⟺ |r|≥0.08 AND |slope|>se on true holdout; only g=0 LIVE; "Honesty failing is DARK" (`overnight-agent-prompt-2026-09-26.md:125`). **The DARK regression suite is the acceptance test:** officials n=113 r=−0.09257 slope=−0.01007 se=0.01028; wind −0.135/mph se=0.1618 n=349; coaching 4th-down go rate r=−0.01363 n=255 — reproduce byte-for-byte before any live use. Calibration contract bar: n≥250, ECE≤0.06, drift≤0.10 → below is INSUFFICIENT_SAMPLE, probabilityClaimsAllowed=false. 16 doctrine priors are v1 — refit ownership and cadence are d06 open question #2.
- **Cross-refs:** d06 BS-8 (best-specified), d05 #3, d04 (scalarizer references).

### 0.4 OL→scheme→QB ordered pipeline with typed context objects + explicit DATA_GAP states
- **What:** the 6-layer call order as executable pipeline, not a diagram.
- **Spec:** availability/trench → scheme/coaching → QB behavior → pair trust → projections → calibration → combination → sizing → no-bet (r01 S20). Dependency order is load-bearing: OL state conditions scheme options; scheme conditions QB reads; QB conditions pair trust. Typed objects TrenchContext → SchemeContext → QBContext (d06 BS-4); each stage exposes explicit DATA_GAP states (qbUnderPressure missing is the worked example). Play-call equilibrium pilot (d01 S1, r01 S13): Ötting HMM 71.5% as the *informational bound* (77.9% Patriots, 60.2% Seahawks — second-hand, unvalidated); 0222 CAMS supplies game-theoretic bounds (I-atomicity theorem) not machinery.
- **Cross-refs:** d06 BS-4 (best-specified), r01 S20, r02 S24.

### 0.5 Honesty machinery: evidence-grade governor + claim-evidence ledger + audit receipts
- **What:** the layer between the engine and any public surface that answers Garrett's 17:34 audit challenge.
- **Spec:** (a) evidence-grade governor (d06 BS-13): every output carries {value, evidenceGrade, basis, modelVersion, sampleInfo}; the 2025-holdout ALL-ASSOCIATION_ONLY regime ("Not agreement, not a cause, and not a pick") is the worked example. (b) Claim-evidence ledger (r04 #3): claim-evidence-entry / edge-experiment-entry / calibration-report-entry schemas (r22, `fable/evidence/EVIDENCE_INDEX.md`) — every edge claim carries evidence, source+hash, blockers. (c) Review-queue triage (r04 #1): daily scheduled loop catching stale-state, stale-caps, stale-build-queue, provenance mixes (currently proposed, not running). (d) Audit receipts as the output format: test counts, what was exercised, where the logs live — landed counts no longer spend. (e) Public honesty machinery (r25): pundit hit rates withheld below 25 decided calls; five reason codes; "not judged" = stratum <100 picks; 100-settled-pick gate for public stats; CALIBRATION_AUTO_APPLY=false MUST.
- **Cross-refs:** d06 BS-13, r04 #1/#3, r25, ops files.

### 0.6 Calibration store + resolution gate before any public surface
- **What:** the calibration pipeline with the discrimination gate binding.
- **Spec:** floors Brier≤0.22 / ECE≤0.05 / MurphyRel≤0.05 / n≥100 (d06 BS-12, best-specified); gate constants from `calibration-eligibility.ts`; split CALIBRATION gate {n:100, ece:0.05, murphyRel:0.05} vs DISCRIMINATION gate {n:100, brier:0.22}; BS≤0.22 needs RES≳0.03–0.05 — calibration alone cannot close the discrimination half. **Maps stay OFF while RES≈0** (`ISOTONIC_LOGLOSS_DEBUG:3,30`). Bayesian bake-off (d28) runs candidate calibrators; shadow promotion pipeline (d04 #8) with the 2025-holdout LAC_BUF registry pattern (edge sum 0.30259224777263855, coverage 0.68). Standing doctrine: public surface = projections and rankings only; NGS internal-only (Garrett 2026-09-28 HARD).
- **Cross-refs:** d06 BS-12 (best-specified), d05 #5, d28, d04 #8, d29/d27 arc.

---

## TIER 1 — Rating / uncertainty / abstention / sizing (the engine core)

### 1.1 Rating layer bake-off (one build, not six papers)
- **Spec:** three-way candidate comparison on nflverse 2020–2024 with proper scoring: phantom-player BT (0544: CV ridge λ=0.01, pseudo-game δ=1.2589, phantom ρ=40; flag the expert-vs-CV δ disagreement — choose tuning philosophy explicitly), Mn-Dirichlet floor (0673: must beat on log-loss before shipping; Brier Δ−0.01 p=0.04), √K policy (0564: K-factor scheduling discipline, small-K only). Supporting lanes: Elo-MMR (0932: 6.8× production runtime, Glicko-2 volatility-farming exploit), TVC+AR(1) (0655: RPS 0.2073/0.2047 best walk-forward), fixed-effects HFA (1050: recover true 3.00; mixed-effects biased 3.37/3.26/3.13 — NFL HFA re-estimate), external-prior blend (1538: priors have ~6-week half-life), MFM archetypes (0554: K=3 player archetypes, descriptive), SDI comps (0413), LS ratings (1447: adopt forecast→ILP architecture only — evaluation retrodictive).
- **Cross-refs:** r01 S4/S5/S17/S18, r02 S1/S3/S4/S23, d03 #10.

### 1.2 Game-clustered uncertainty (0503, best-specified single-method)
- **Spec:** game-clustered bootstrap on nflverse 2020–2024; tune φ (do NOT hard-code 0.35); target: restore nominal coverage (i.i.d. nominal-90% covered 0.60±0.01 at width 0.027 in-paper; φ=0.35 restored 0.90±0.01 at 2.3× width). Pairs with EP repair kit (1.3).

### 1.3 EP repair kit (1801)
- **Spec:** 1/N_i team-quality reweighting (log-loss 0.7506 vs 0.7670), cluster bootstrap (95.6% vs ~83–86% coverage), catalytic prior 500k synthetic states; ship with the as-of bitemporal guard (BS-10) so plays are always evaluated with the model version live at kickoff (map #11).

### 1.4 Nested uncertainty stack: QOOB + ACI + AC-RAC (one pipeline)
- **Spec:** QOOB for weeks 1–6 (enable the disabled `1910-10562-nested-conformal-qoob.ts` behind its gate: width ≤90% of split-CQR at coverage ±2pp for k≤6 weeks); ACI-tracked split-CQR weeks 7+ (err_t on the *published* interval; `aci-durable.ts`/`aci-state.ts` exist); AC-RAC max-min action selection at decision time (0.21–0.35% critical error vs 3.35–4.70%). Supporting: GP-PIT (1082: FAM≥2.0 deployment gate), HS_in residual post-processor (1525: 11/12 wins, 180–215× cheaper — must inherit game-clustering), quantile decomposition for totals (0725: 10–20% better), Student-t margin head (2125).
- **Cross-refs:** r03 S1/S2/S3 (best-specified), r02 S10/S11/S12, r03 S17.

### 1.5 Three-stage abstention stack DAC → SPTD → CARL (one build)
- **Spec:** DAC label denoising (≤25% removal gate — the load-bearing constraint; 75% removal would delete a season), SPTD monotone post-hoc calibration, CARL learned abstention — with 1152's copy-framing rule for public presentation and 1777's SCoRE e-value posted-card gate (E[L·E]≤1) as the formal no-bet policy. **Why it matters:** 0715's theorem (monotone calibration cannot reduce ε_rank) is why the stack exists instead of more calibration.
- **Cross-refs:** d02 S3, r02 S18 (best-specified), d03 #4.

### 1.6 δ/σ staking gate (1748, merged — the single staking gate)
- **Spec:** stake iff δ_perc > 1.5σ; scale Kelly by Φ(δ_perc/σ); E[growth] = 2(δ²−σ²)Φ(δ/σ) + 2σδφ(δ/σ). **Mandatory pre-step: re-derive for general decimal odds** (1748 is even-odds/small-δ/normal-ξ). Merges d02 S4, d03 #2, map #15.
- **Sizing supporting lanes:** multi-pick Kelly 0813 (f_K(p)=2p−1; p=0.51 → L≥1,761); maximin-drawdown 0834 (9.4%/−3.3% vs Markowitz 5.7%/−6.1%, preliminary); generalized/capped Kelly 1630 (f*=(2p−1)(1+w/g), downstream of δ/σ gate); multivariate correlated-slate Kelly 1212 (closes the `kelly-investigation.ts` single-bet gap); variance-budgeted fractional Kelly 1222 (8.9%/41.9% DD vs full 17.2%/89.8%); Kelly-gap diagnostic 1232; basis-risk portfolio monitor 0964; SCO continuation pricing 1761 (d03 #9, principle only).

### 1.7 Ensemble combination under the decision-metric constitution
- **Spec:** the 0791 constitution is load-bearing — optimize weights on CLV/P&L, never on CRPS (CRPS-optimal lost to equal-weight at P&L, 500× compute). Lanes: one-step DM/White constitution (1172, r02 S7 — standard tests lose 10–50× power; the "puzzle" is a two-step artifact); dual-objective NSGA-III 1463 (knee dominates; ablation needed); soft-global γ 1676 (r03 S4: γ chosen on decision metric, EW until enough data post-break); online Gibbs 1182 (r02 S8); smoothed BOA 1559 (r02 S9); peer-prediction cold-start 1162 (r02 S6: only for genuinely independent forecast sources); EIG-AGG fusion (r02 S24).
- **Cross-refs:** r02 S6–S9, r03 S4, d03 #3.

### 1.8 Market Informativeness Gate (0866/1359/1735, one pre-deployment screen)
- **Spec:** before the engine trades on any consensus number — check PredictIt-style wisdom-of-crowds failure modes (0866), whale distortion δ_S=ρΔ_S (~40% threshold — re-estimate, simulation only), information saturation log 2≈0.693 nats with ω₁≈0.15 identifiability floor (1735, synthetic — re-estimate on real odds). If the gate fails, the line is a settlement target, not a signal. Merges d03 #1, r02 S19.
- **Related:** closing-line forecaster CL1–CL9 + CLF table + ablation harness on the 2020–2024 closed odds archive (d04 #5 — DATA-BLOCKED until the odds store exists); Market Gravity index G=1−(D_late/D_early) (d05 #4, proposal).

### 1.9 Same-book CLV grader (merged)
- **Spec:** grade over bookmaker-key intersection only; refuse on empty intersection; count refusals by reason. Fixes the 23.0%-vs-52.4% misread (d03 #1). **DATA-BLOCKED** on the OddsLineSnapshot archive (no odds store, no settlement feed). Merges d03 #1, d06 BS-9, d22 CARDS_CLOSING_LINE.

## TIER 2 — Score simulation / residual correction / causal / drift

### 2.1 End-state compositional simulator (one build eats the nested-dependency family)
- **Spec:** composes kneel-outs/garbage-time end-state handling (d22, map #10: kneel-outs delete pass attempts for big favorites; hurry-up garbage time inflates trailing QBs), nested ZIGP β₃ pilot (0242/0584: adopt iff ≥0.5% exact-score log-loss improvement), ZI-Skellam margin shapes (1791: AIC bake-off on NFL margins), Sarmanov/ANS dependence (0392: −0.27 to −0.40 home–away correlations vs DC floor −0.08; NB marginals). **Gate:** run the rank-model bake-off first (0584's Elo ranks are wrong; 0242's never reported) — nested wins may be rank-model artifacts. d04 #4 owns the simulator; r01 S6 the nested composition.
- **Cross-refs:** d04 #4 (best-specified), r01 S6, d22.

### 2.2 Residual-corrector layer (1851 CRAFTER, one architecture)
- **Spec:** freeze the engine; learn new signals (QB pressure, trench metrics, trust features) as corrector features on frozen-engine residuals — because feeding covariates directly to a covariate-capable backbone can *degrade* the raw forecast (1851:26-37). Residual-vs-market gating (d02 S11): signals must explain engine residuals, not the target directly; DeepGLEAM hybrid (66.03 vs 73.59 vs 239.94) is the second arrival at the same architecture. **This is the answer to "how do c09 intelligence signals enter the engine."**
- **Signal discovery on top:** AutoAlpha signal-mining grammar (r03 S14) with SR governance (1826/1836, d03 #13: luck confounds "what wins"; benchmark saturation) and the SR dummy audit 2169 (d04 #7).
- **Cross-refs:** d04 #1 (best-specified), d02 S11, r03 S14, d03 #13.

### 2.3 Causal feature-validation toolkit
- **Spec:** CATE recipe (0769, d02 S6: only adopt under strong confounding; Setup B null is expected), case-crossover self-matched estimator (0533, d02 S7: for hydration/momentum-type within-game interventions — check data appendix first), Hi-CI dose-response (1122, r02 S26: the one real-data causal port — temperature→yield curve), causal feature-panel pruning PCMCI+→NoCurl (r03 S8), wind→totals medshift mediation (0272, r01 S11: expect a null — the null resolves the d34 wind DARK), ITS regime harness (0098, d01 S9, r01 S15: adopt the design for practice-load/safety-rule splits, not the underpowered null conclusion).
- **Cross-refs:** d02 S6/S7, r02 S26, r03 S8, r01 S11/S15, d01 S9.

### 2.4 Drift & regime monitoring (one build family)
- **Spec:** ECDD win-prob error-stream monitor (1884, d04 #2: ARL_0=272 games; stratify/schedule-adjust for clustering — NFL outcomes aren't i.i.d.), certainty-weighted refit + coreset (1894, d04 #3), sliding-window OGD regime detector (r25: Beta-map `g=σ(a·logit p+b)`, 120-game trailing window, diagnostics-only). Answers the frozen-weights staleness challenge (d06 CH-7) — **every weight gets a refit trigger** (d06 open question #3).
- **Cross-refs:** d04 #2/#3 (best-specified), r25.

### 2.5 Player trajectory models
- **Spec:** career GP trajectory (0604) + GARCH volatility (0594) as the QB/RB aging-and-variance pair (d02 S8/S9, r01 S12); development forecaster 1142 (r02 S21); transfer-fit 0986 (r02 S20 — strawman baselines, needs real ones). Feeds the rating layer (1.1) and the QB store (0.2).

### 2.6 NLP intake pipelines
- **Spec:** injury-trust pipeline 1594→1722→1308 (d03 #7): BERT sentence classifier (use 92% new-source, never the 99.8% shuffled figure) → evidence spans + conflict flags + anonymization-perturbation honesty test (T3 +20.6pp/−62.8% RMSE) → κ=0.68 human adjudication protocol; scouting-text draft lane 0844 (d02 S10: TextCNN 69.02%/56.42% F1; masking protocol is load-bearing — surnames leaked 100% recall). Both feed the trust-signal module (0.1) and injury-availability features (r01 S9).

### 2.7 Weather & venue layer
- **Spec:** postprocessed HRRR (1581) + RQE tail audit (1493) as the weather-for-totals build (d03 #8); three-stage venue/weather layer (r03 S7). Mediation analysis (2.3) is the design check on wind→totals.

### 2.8 Simulation engines
- **Spec:** BBE synthetic tapes (0292, d01 S7: MCM ≈1000× faster, CoV≈0.005, win-markets only — the pre-season simulation substrate); diffusion lanes Diffuser 1946 / Diff-MTS / TabDDPM (r03 S9/S10/S11: synthetic season generation for stress-testing the simulator); in-simulation nested engine 0584 (d02 S5: nested models *inside* the sim, not beside it).

### 2.9 DFS optimizer upgrades
- **Spec:** distributional rebuild S5 (d05 #6: distributions + covariance, not static constants — the explicit build delta on the week-3 optimizer: repair delta 4→41 double-stack, TE-in-FLEX 38→0, 36-lineup portfolio); 1349 dominance pruning (10^23→7×10^7) + 1761 SCO continuation pricing (d03 #9); entropy portfolio 1060 (r02 S17); listwise pick ranker 0888 (d03 #11); DFS oracle CI falsifier (d06/d37: extend the `dfs-optimizer-optimality.test.ts` oracle to the N-unique portfolio path — currently bounded-budget, NOT oracle-verified).
- **Cross-refs:** d05 #6, d03 #9, d06/d37, r02 S17.

### 2.10 Hawkes game-on-track (1813)
- **Spec:** self-exciting process for in-game momentum/runs (d03 #12). STAGED behind the end-state simulator (2.1) — momentum structure without end-state compositional structure is the wrong build order.

---

## TIER 3 — CV / charting / labeling (PARKED pending the 2026 path decision)

### 3.1 Computer-vision charting path (PARKED — d06 open question #4)
- **Spec:** keyframe sampler 0352 (d01 S10) → labeling-factory gating 0362 (d02 S12) → CFSC technique 1032 (r02 S27) / SPRINT hazard 0624 (r02 S28) / film boundary+tagging (r04 #6) → automated charting spec (r29/r04). Baseline: Sloan CART 86.5% QB position / 72.3% formation over 29 classes; `buildTracklets` greedy IoU (recall 0.74 on 57 frames — must reproduce before tuning). **The coordinator decision (d06 OQ #4):** CV charting (0.74 recall) vs licensed-data contracts as the 2026 path for route/coverage/trench data — the timeline decides whether BS-4/BS-5 run on second-party charting indefinitely. INFERENCE: Harshraj params are [DERIVED] clean-room, not author-stated.
- **Parked sub-lanes:** vision tracker (PARKED, needs Garrett's mandate); blur ball detector 0342 (PARKED, map #8).

---

## TIER 4 — Data ops / infra / governance

### 4.1 Data ops
- **nflverse identity crosswalk (r04 #5):** snap_counts is PFR-only (bridge via roster); PFR ids are strings (`MahoPa00`), never coerce; season-matched rosters, first-write-wins. Foundational — prevents silent inner-join data loss.
- **As-of bitemporal guard (d06 BS-10):** every backtest/play evaluated with the model version live at kickoff; blocks lookahead.
- **Conformal +inf refusal (d06 BS-11):** return +infinity (refusal) below the sample floor, per stratum — fixes the n=5/α=0.1 → 83.33% miscalibration.
- **NB2 dispersion check (d05 #8):** overdispersion audit for scoring distributions.
- **OddsLineSnapshot archive (DATA-BLOCKED):** the missing odds store + settlement feed blocking 1.9, 1.6, 1.8's CLF harness.

### 4.2 Adjustment layer v1 (d05 #3, d25)
- **Spec:** rule-shape contract TRIGGER→AFFECTED→DIRECTION→MAGNITUDE→LOG; magnitudes solved by backtest (no numbers in spec); shadow lifecycle (d27). **Fuel problem:** player `signals` table has 0 rows ("The prop pipeline has no fuel") — fill before any rule matters. Market Gravity (d05 #4) is the first candidate rule.

### 4.3 Governance & policy
- **SHARP auditable rubric (r03 S12):** the auditable prediction rubric.
- **Challenger/variant registry MWER (r03 S13):** minimum-weight-ensemble with regret bounds for model-variant management.
- **Engine dependency sandbox (1132, r02 S25):** fault-isolation for engine modules.
- **State-dependent exposure monitor (1617, r03 S6):** risk exposure conditioned on slate state.
- **Rankings publication engine (r04 #7):** QUEUED behind Phase 1/4/9 + total-signal plumbing + calibration fixes; no separate projection fork — the rankings program is gated, not staffed.
- **AI Gateway pilot (r04 #8):** decided, not executed — cost/consistency claims unmeasured; agent-fleet LLM accounting sits behind it.
- **Feature kill-list registry (d06 BS-7):** the burial ground for failed features (xFP/FPOE is the first entry — pre-registered FAIL, descriptive only).

### 4.4 Market stack (0645/1511/1102, r02 S19)
- **Spec:** order-book simulation of NFL spread markets for the whale-distortion (1359) and information-saturation (1735) re-estimates — the empirical substrate the Market Informativeness Gate (1.8) needs.

---

## Open questions for the coordinator (from d06, verbatim)

1. **Clean-vs-pressured splits sourcing** — which feed, and does the NGS-internal doctrine cover a commercial charting vendor's pressure splits, or only NGS?
2. **Scalarizer 16 doctrine priors** — who owns refitting them, and on what cadence?
3. **Drift-triggered refit for frozen weights** — propose the trigger metric (weights: w=0.1 confidence weight, position weights, scalarizer priors, CLV grader, Bayesian-bake-off weights — all frozen, all staling per CH-7).
4. **CV charting (0.74 recall, 57 frames) vs licensed-data contracts** — which is the 2026 path for route/coverage/trench data; the build timeline decides whether BS-4/BS-5 run on second-party charting indefinitely.

## Build priority recommendation (synthesizer's read, INFERENCE)

The dependency order that falls out of the synthesis: (0.2 QB store + 4.1 crosswalk + 4.2 adjustment layer fuel) → (0.4 ordered pipeline + 2.2 residual-corrector layer) → (0.3 scalarizer + 0.5 honesty machinery + 0.6 calibration store) → (1.2–1.7 uncertainty/abstention/sizing) → (0.1 trust-signal intake, once the legal spec and crawler approval unblock) → (2.1 simulator, 2.3 causal toolkit, 2.9 DFS) → (3.1 CV charting, pending the coordinator's 2026-path decision). Everything DATA-BLOCKED (1.9 CLV grader, 1.6's δ/σ backtest, 1.8's CLF harness) waits on the OddsLineSnapshot archive.
