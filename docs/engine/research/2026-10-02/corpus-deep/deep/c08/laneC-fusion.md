# Lane C — Correlated Sources, Fusion, Ensemble Theory
**Deep-research slice c08, Phase 2. Read-only verification against `~/workspace/vendor/Sports/docs/`.**
**Date:** 2026-10-02. Status labels: CONFIRMED / CORRECTED / UNVERIFIABLE. Inferences are marked INFERENCE.

---

## 1. VERIFIED CLAIMS

### 1.1 ICI view fusion (0790, map finding 14)

- **Claim:** PW fusion median Sharpe 0.11 vs ICI 0.48; global Sharpe 0.10 vs 0.34.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/0790-view-fusion-black-litterman.md:46` (median: PW **0.11**, CU **0.16**, CI **0.38**, ICI **0.48**; single-view medians 0.01–0.53) and `:47` (global 29-yr Sharpe PW 0.10 → ICI **0.34**).
  **Status: CONFIRMED.**
- **Claim:** Naive inverse-variance averaging is overconfident on correlated sources; the PW (zero cross-covariance) assumption yields inconsistent estimates.
  **Source:** 0790 ledger `:49` ("PW ... was the weakest fusion — authors note assuming independence yields inconsistent estimates and hurts trading") and `:30` (PW formula Σ̂ = (Σ̂₁⁻¹+…+Σ̂S⁻¹)⁻¹; μ̂ = Σ̂(Σ̂₁⁻¹μ̂₁+…), "assumes zero cross-covariance").
  **Status: CONFIRMED.** The mechanism is explicit: PW drops every cross-term of the source covariance matrix. When sources share information (they do: GSE's engine, market-implied, analyst, LLM-panel sources "share information — market feeds into engine and vice versa", ledger `:63`), the fused variance is understated and the fused mean is over-trusted.
- **Claim:** The ≥1% log-loss gate.
  **Source:** 0790 ledger `:73`.
  **Status: CONFIRMED as the file's own proposed GSE test gate** ("ICI/CU/CI fusion beats PW and simple averaging ... by ≥1% log-loss improvement over the best single source, with consistency"). It is not a paper result — the paper's metric was portfolio Sharpe. INFERENCE: this gate has not been run against GSE data (no evidence of it in the checkout; treat as unexecuted spec).
- **Recipe restated (for combining correlated pick-probability sources), from 0790 ledger `:23–31`:**
  1. Treat each source's pick probability as a "view" μ̂_s with an information (inverse-covariance) matrix, not a scalar variance.
  2. Do NOT precision-weight (PW) — that is the overconfident path.
  3. Under **unknown/unstable pairwise correlation** (exactly the GSE case), use **CI** (Julier–Uhlmann): fuse via convex combination of information matrices — guaranteed consistent (never understates variance) without knowing the correlations.
  4. Use **ICI** (Noack et al.) when the sources share an identifiable *common-information structure* (e.g., all four sources read the same pressure-rate fact): ICI splits common vs private information and produces tighter consistent bounds than CI.
  5. Use **CU** (Reece–Roberts) only when sources may be mutually inconsistent/contradictory.
  6. Decomposition to maintain alongside: var(y*|x*,D) = epistemic (reducible: var of the conditional mean) + aleatoric (irreducible: mean of the conditional variance). Fuse the two components separately; the aleatoric floor is not learnable away.

### 1.2 RD-FGL regime-dependent forecast combination (1675, map finding 14)

- **Claim:** RD-FGL achieved MSFE ratios to equal weights as low as ~0.31–0.44 (60–70% reduction), in the 90% Model Confidence Set for GDP and inflation.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/1675-regime-dependent-factor-glasso.md:21`.
  **Status: CONFIRMED.** Ranked 1–3 on the broken series. For unemployment (no strong breaks) plain FGL beat RD-FGL — the regime machinery only pays when breaks exist.
- **Claim:** Recipe = PCA-strip common forecast errors → Graphical LASSO on idiosyncratic precision → Bai–Perron break-aware regime weights.
  **Source:** ledger describes e_t = Bf_t + ε_t; GL on residual precision Θ̂_ε; Sherman–Morrison–Woodbury recomposition Θ̂ = Θ̂_ε − Θ̂_εB̂[Θ̂_f + B̂'Θ̂_εB̂]⁻¹B̂'Θ̂_ε; discrete kernel K_{γt} = γ·1[t≤T₁] + 1[t>T₁] with γ by CV; Bai–Perron break detection; Bates–Granger optimal weights w = Θι_p/(ι_p'Θι_p) minimizing w'Σw s.t. w'ι=1. Theorem 1 rate ‖ŵ−w‖₁ = O_P(ϱ_T d_T² s_T).
  **Status: CONFIRMED** (from the brief's formula record; the recipe is as stated).
- **Caveats (from the ledger/brief, not the map):** ECB Survey of Professional Forecasters, real GDP/inflation/unemployment 1999–2023, p=45–59 forecasters — macro-survey data, Gaussian errors assumed; break detection unreliable near the sample end; "one NFL season ≈ 18 weeks × K models is noisy for factor estimation"; forecaster panel assumed stable. **Transfer to GSE's model zoo is untested extrapolation — INFERENCE.**

### 1.3 Time-varying combination with group-SCAD (1482)

- **Claim:** gSCAD best overall, ASCFE 2.650×1000 on the equity-premium case.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/1482-time-varying-forecast-combination-for.md:40` ("**gSCAD 2.650 best overall** vs peLasso 3.349; DM: gSCAD < hist.avg p=0.065, < peLasso p=0.027, < EQ p=0.106").
  **Status: CONFIRMED.**
- **Claim:** 70%+ variance cut.
  **Source:** ledger `:17` — "data reflection (Hall–Wehrly/Chen–Hong) at the forecast boundary; reflection cuts asymptotic variance by >70% vs no reflection."
  **Status: CORRECTED — attribution error in the map.** The >70% variance cut belongs to the low-dim local-linear estimator's *boundary-reflection* step, not to group-SCAD pruning. The map's finding ("time-varying combination with group-SCAD pruning (70%+ variance cut, best ASCFE 2.650×1000)") merges two different results into one parenthetical. The gSCAD numbers are: exact-selection share 0.70→0.81 at J=100; relevant-forecast inclusion 0.96→1.00 (ledger `:38`).
- **Claim:** low-dim local-linear (NPRf) beat Bates–Granger and equal weights at every T.
  **Source:** ledger `:37` (NPRf 1.06/1.06/1.03 vs BG 1.19/1.22/1.20, EQ 1.29/1.34/1.34).
  **Status: CONFIRMED.**
- **Claim:** honest failure — plain local-linear combination fails when p is large vs T.
  **Source:** ledger `:46`.
  **Status: CONFIRMED.** This is precisely why the gSCAD pruning stage exists; do not deploy the unpruned variant on GSE's wide component panel.

### 1.4 CRPS doctrine (1649) + twCRPS (0746)

- **Claim:** GSE is Brier-only today, no CRPS, no written properness rationale.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/1649-proper-scoring-rules-estimation-forecast-evaluation.md:41` ("GSE has brier.ts, brier-ece.test.ts, scoring-reliability.ts, skill-metrics.ts — Brier-centric evaluation, no CRPS, no log-score doctrine, no properness rationale written down anywhere").
  **Status: CONFIRMED, with nuance.** The checkout also contains `apps/web/lib/calibration/scrps.ts` (scaled CRPS, arXiv 1912.05642 — an ADDITIVE utility whose header says it is "not wired into any ranking surface") and `crpsmod-loss.ts` (CRPSmod sharpness *training* loss, arXiv 2606.08587 — explicitly "not wired into any training or publish path"). So: research-grade CRPS math exists in the tree; the **evaluation doctrine, the `crps.ts` module, and any wired CRPS scoring are absent**. The gap claim is about the live evaluation path, and it holds.
- **Claim:** twCRPS + λ=0.6 linear pooling buys ~1.3–2.5% tail skill at the 90th percentile.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/0746-improving-probabilistic-forecasts-extreme-wind.md:26` ("twCRPS skill improvements average ~0.8% at the 80th-percentile threshold and ~1.3% at the 90th, with maxima ~1.4% and ~2.5% across stations/models. Linear pool at λ=0.6 ... retains most of the tail improvement while controlling much of the body loss").
  **Status: CONFIRMED with the mean-vs-max distinction preserved.** "1.3–2.5%" = average 1.3%, max 2.5% at the 90th-percentile threshold — a mean-to-max range, not a confidence interval. Paper's own caveats (ledger `:32`): single fixed train/test split, thresholds fixed ex ante, gains modest in absolute terms, no multiplicity control across 124 stations, λ=0.6 empirically chosen not optimized. The file's GSE adopt gate (ledger `:44`): ≥1% 90th-percentile twCRPS gain with ≤0.5% body degradation on 2024–2025 — unexecuted per available evidence (INFERENCE).

### 1.5 CQR bug (1639, map finding 1) — HIGHEST URGENCY

- **Claim:** `apps/web/lib/calibration/cqr.ts` clamped the quantile rank to n−1, falsely certifying 90% coverage at 83.33%; published intervals 6.67pp tighter than claimed.
  **Source (brief):** `1639-conformalized-quantile-regression.md.brief.md` findings section ("clamps rank to n−1 ... falsely certifying 90% coverage at 83.33%").
  **Current source state:** `apps/web/lib/calibration/cqr.ts` now implements the unclamped finite-sample rank `Math.ceil((1 - alpha) * (n + 1)) - 1` and **fail-closes to +∞ (vacuous interval / No-Bet)** when `rank >= n`, with an explicit comment: "instead of clamping the rank, which would falsely certify 1−α coverage. At α=0.1 this means n ≥ 9." The nonconformity recipe E_i = max{q̂_lo−y, y−q̂_hi} matches the paper. A separate verifier exists: `apps/web/lib/calibration/cqr-recipe-audit.ts` with three audit checks (finite-sample rank, nonconformity recipe, fail-closed at n=8). Git history (read-only): `1de6b69f6 feat(cal): CQR for numeric lines + isotonic vs Platt selection (#385)` → `1d3814010 fix(calibration): cqr.ts conformalQuantile fails closed on small n (research spec)`.
  **Status: CORRECTED — the defect is no longer live.** The map's finding 1 ("LIVE CQR correctness bug ... Highest urgency") describes a state that predates the repair commit. The audit module's acceptance gate (empirical coverage within ±1.5pp of nominal AND length ≤90% of the absolute-residual baseline on 2025) remains the unexecuted backtest (INFERENCE — no test output observed in the checkout, but a `cqr-recipe-audit.test.ts` exists). **Do not quote finding 1 as current; reference the repair and the still-owed backtest instead.**

### 1.6 NOTEARS (1962) + Skellam (1790) + AC ordinal (1446) coherence claims

- **Claim:** Skellam margin model Brier 0.58 vs 0.65 climatology.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/1790-skellam-regression-model-for-quantifying-positional.md:54`.
  **Status: CONFIRMED — with domain correction.** These are the *paper's* results in the *paper's* domain: ledger `:46` shows baselines "climatology (home 46% / away 29% / draw 25%)" and `:33` references Stern (1991) goal distributions — this is soccer data, not NFL. The NFL use is the file's own proposed experiment (ledger `:90`: 2015–2023 fit, 2024–2025 holdout; adopt only if Brier beats climatology by ≥0.02 AND P(cover) calibration slope ∈ [0.9, 1.1], ledger `:94`). **It must not be read as an NFL-measured result.** The key-number caveat (±3, ±7 need a mixture extension) is recorded in the map and consistent with the file's stated gate.
- **Claim:** NOTEARS prunes to the Markov blanket of the spread-cover target, gated on held-out Brier within 0.002 of the full-feature baseline at ≤60% feature count.
  **Source:** 1962 ledger `:58–61` — the dataset/protocol spec and the ADOPT conditions ("held-out Brier on 2024–2025 with ≤60% of features is within 0.002 of the full-feature baseline (parity), or better").
  **Status: CORRECTED — this is the file's own proposed adopt gate, not a measured result.** The paper's actual measured results are structural Hamming distance / FDR against simulation ground-truth graphs (ledger `:33`). The ledger's adversarial notes (`:44`) are substantive: linear-SEM least squares (NOTEARS-MLP follow-up exists; the 2104.05441 "Unsuitability of NOTEARS" varsortability critique); i.i.d. assumption violated by team-week autocorrelation ("will confuse lagged effects with contemporaneous ones"); O(d³)/iteration; threshold ω suboptimal; Sachs tie at SHD=22 suggests limited real-world lift. The map's phrasing "gated on held-out Brier within 0.002 ... at ≤60% feature count" is literally accurate but easily misread as achieved — it is a spec.
- **Claim:** AC ordinal model (1446) for cover/push/no-cover with uniform slopes.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/1446-ranking-by-points-and-ordinal-models.md` exists in the checkout; the brief records uniform-rule ξ_y = y recommendation (fitted slopes cluster near uniform, ≤0.01 gain from fitting) and the key NFL-relevant result: Proposition 1's schedule-equivalence condition fails on the NFL's unbalanced 17-game schedule — a principled argument for model-based ratings over standings.
  **Status: CONFIRMED (against the brief; full ledger formula check not re-run).**

### 1.7 0004 failed extensions (the honest-failure record)

- **Claim:** two-factor/rank-four extensions failed (H2 p≈1); trace-norm path 45.89% < naive baseline; two-stage Élő beats pure online at p=7.8×10⁻⁵.
  **Source:** `docs/arxiv-program/research/2026-09-21/arxiv-deep/0004-bradley-terry-elo-unification.md:72` (H1 two-stage Élő p = 7.8×10⁻⁵; H2 two-factor p ≈ 1; rank-four p ≈ 1; score-difference p = 0.235 n.s.), `:62` (trace-norm batch accuracy 45.89% [43.54%, 48.21%] — "worse than the naive home-win baseline"), `:86` (headline extensions failed; expressivity win rests entirely on the two binary promotion covariates, p=0.002), `:89` (trace-norm "does not survive contact with real data").
  **Status: CONFIRMED.** Additional honest detail the map omits: H1 was also highly significant for two-factor (p=4.4×10⁻¹⁴) and rank-four (p=9.8×10⁻⁹) — the two-stage *training* helps every parameterization; it is the *parameterizations* that add nothing over vanilla Élő on H2. And the p=0.002 covariate win carries its own multiplicity warning (ledger `:93`: Holm applied only to Table 7, not to the H2 column).

---

## 2. CHALLENGES

### 2.1 Contradictions and tensions between sources
- **Ensemble wisdom vs. break reality:** 1482 assumes weights move *smoothly* in rescaled time (Thm-level smoothness); 1675 assumes *abrupt* Bai–Perron breaks with a discrete pre/post kernel. On NFL data both can be true at different scales (gradual model decay à la 0790's "significant performance decay of view models over 30 years", ledger `:51`, plus abrupt QB-injury structural events). INFERENCE: the engine needs both a smooth-weight combiner and a break detector; picking one theory drops real structure.
- **Calibration-honest vs edge-empty (from the map's cross-file pattern):** the fusion machinery (0790/1482/1675) optimizes *combination of given sources*. If all sources are edge-empty (MI probe 0.0095 nats, p=0.060 per the map), fusion cannot invent resolution — same lesson as the map's isotonic/Kelly note. Fusion is a variance technology, not an information technology.
- **PW's failure vs the EW puzzle:** 1675 explains the equal-weights puzzle (EW emerges under one-factor/homogeneous-idiosyncratic structure, exactly when FGL adds value by detecting deviations). Tension with 1482's finding that plain NPRf loses to EQ on equity premium when p>T: when estimation noise dominates, shrinkage toward equal weights wins. Practical rule: fuse aggressively where the idiosyncratic precision is estimable, fall back to EW where it isn't — a data-driven dial, not a doctrine.
- **CI conservatism vs ICI tightness:** CI is always consistent but can be very conservative; ICI's tighter bounds depend on correctly identifying the *common-information* structure. Misidentifying common info reintroduces overconfidence through the back door. The file's own proposal (blend ICI with mAFTER-style adaptive source weighting, 0790 ledger improvement idea) is the hedge.

### 2.2 Failed extensions (do-not-build list, verified)
- 0004 two-factor / rank-four parameterizations: H2 p≈1 vs vanilla Élő. Do not implement.
- 0004 trace-norm (nuclear-norm) regularization of the log-odds matrix: 45.89% accuracy, below naive. Rejected by the file itself.
- 1482 plain local-linear (NPRf) combination when p is large vs T: loses to equal weights. Always pair with the group-SCAD stage.
- 1675 "Not Sparse" (τ=0) variant: among the worst — idiosyncratic-precision sparsity is necessary, not optional.
- 0746 pure-twCRPS training without the λ-pool: body CRPS degrades; the paper's own trade-off finding says the unpooled tail model is not deployable alone (ledger `:44`: REJECT if body degrades >1%).
- 1962 NOTEARS-MLP caveat and varsortability critique: linear NOTEARS on pooled team-weeks without time modeling will confuse lagged with contemporaneous effects — do not run it on raw team-week panels.

---

## 3. BUILDABLE SYSTEMS — the adversarial layer's correlated-thesis machinery

This is the theory behind CORRELATED-THESIS DETECTION (reasoning-depth spec §§4–7). The papers supply the math; the spec supplies the formalism. The mapping below is implementation-ready.

### 3.1 The L3-chain shared-link formalism (from the spec)

Every bet leg carries L3 chains: `[{cause, mechanism, outcome, verification, breaking_condition}]` (spec §6.1). A **causal link** is a named, machine-checkable element — e.g. `pit_pressure_lands` with breaking condition `TTT > 2.6s or quick-game < 0.55`. The L4 function `correlatedTheses(legs, trace) → ThesisBundle[]` groups legs whose chains share ≥1 link (spec T4). The bundle is presented as **one thesis with combined exposure**, never as N independent edges (spec §7).

### 3.2 The naive-averaging overconfidence mechanism (0790 → L4)

0790's PW formula is the exact mathematical shape of the L4 failure mode. Naive combination of S sources:
`Σ̂ = (Σ̂₁⁻¹ + … + Σ̂S⁻¹)⁻¹; μ̂ = Σ̂(Σ̂₁⁻¹μ̂₁ + …)`
assumes **zero cross-covariance**. Replace "sources" with "legs sharing a thesis" and you have the funnel bug: four legs on `pit_pressure_lands` treated as four independent edges understates the joint variance by dropping every cross-term. The paper's empirical result (PW weakest fusion; "assuming independence yields inconsistent estimates") is the measured cost of exactly the mistake the TNF card made.

**Adversary's score of naive averaging — buildable as a pure function:**
Given a thesis bundle with n legs, per-leg win probabilities p_i, per-leg variances σ²_i = p_i(1−p_i), and the pairwise link-correlation matrix R (estimated below):
1. Naive (independence) bundle variance: `V_naive = Σ σ²_i`.
2. True bundle variance: `V_true = w'Σw = Σ σ²_i + 2 Σ_{i<j} ρ_ij σ_i σ_j` — the Bates–Granger MSFE form from 1675 (`MSFE(w,Σ) = w'Σw`).
3. **Overconfidence ratio:** `OR = V_true / V_naive` (≥1; =1 only if all ρ_ij = 0).
4. **Effective number of independent bets:** `n_eff = n / (1 + (n−1)ρ̄)` (standard variance-inflation form).
5. L4 verdict rule: if legs share ≥1 causal link (spec T4) → bundle; report n_eff and OR on the card. The TNF funnel: 4 legs, shared link `pit_pressure_lands`, pairwise ρ̄≈0.7–0.9 (INFERENCE — ρ estimated from chain overlap, see §3.3) → n_eff ≈ 1.1–1.5 → **"one bet with four receipts"**, exactly the spec's language.

### 3.3 Detecting that N legs share one causal link (shared information structure)

Two detection channels, mirroring ICI's "common-information structure" (0790 ledger `:25`):

**Channel A — structural (from the trace, no history needed).** Two legs share a link iff the same named causal link (with its breaking condition) appears in both L3 chains. The breaking condition doubles as the machine-checkable identity: links with overlapping falsifiers are the same link. This is implementable today on the trace object alone.

**Channel B — statistical (from resolved outcomes, the RD-FGL recipe).** Build the panel of per-source forecast errors (rows = weeks, cols = sources/legs). Then:
1. **PCA-strip the common component** (1675): e_t = Bf_t + ε_t — the common factor is the shared information (e.g., the market consensus every source reads).
2. **Graphical LASSO on the idiosyncratic precision** Θ̂_ε (sparsity τ > 0 mandatory — the τ=0 variant is among the worst, 1675 ledger `:21`).
3. **Bates–Granger weights** w = Θι/(ι'Θι) — optimal under the estimated correlation structure.
4. **Break-aware regime weights** (1675 RD-FGL): Bai–Perron detection around structural events (QB injuries, coordinator changes); CV-chosen pre-break discount γ in K_{γt} = γ·1[t≤T₁] + 1[t>T₁]. For GSE: mid-season structural events re-estimate the correlation structure; pre-event data is discounted, not discarded.
5. The off-diagonal of the estimated Θ̂_ε⁻¹ *is* the pairwise leg-correlation matrix R feeding the §3.2 overconfidence score.

**Channel C — pruning the leg panel (1482).** When the card has many candidate legs (high-dim), run the two-stage procedure first: local-linear weight paths to see which legs' contributions vary vs collapse to noise, then **group-SCAD selection** (selection consistency P(Ŝ=S₀)→1) to prune dead legs *before* combining. Legs whose chains share no load-bearing link with any surviving leg are either independent edges (keep, weight by Bates–Granger) or dead weight (prune). The boundary-reflection estimator (the actual owner of the >70% variance cut, 1482 ledger `:17`) solves the now-casting problem: combine this week's legs using only past weeks' resolved data.

### 3.4 How the adversary scores "naive averaging of correlated sources" (the L4 report)

The L4 adversary's mandatory outputs (spec §4) map onto the papers as follows:

| L4 output | Paper math | Implementation |
|---|---|---|
| Breaking-condition check | CQR-style fail-closed logic: if the falsifier is already true, the link is dead | Evaluate each shared link's `breaking_condition` against pre-kickoff data; `breaking_conditions_met: true` kills the thesis before staking |
| Correlated-thesis detection | ICI common-information structure; 1675 factor structure | Channel A (chain overlap) + Channel B (PCA-strip + GL precision) → link-leg incidence matrix → ThesisBundle |
| Naive-averaging score | 0790 PW vs ICI; 1675 w'Σw | Report OR and n_eff per bundle; the "score" is how much the naive presentation overstates edge: edge_naive / edge_true |
| Steelman | CU fusion (Reece–Roberts) for contradictory sources | When specialist tracks disagree (spec §5 CONFLICT), fuse with covariance *union* — the method built for possibly-inconsistent sources — rather than averaging them away |
| Pre-mortem | 1492 selective-prediction lesson (map finding 13) | Write the pre-mortem *without* the engine's lean surfaced to the reviewer — showing the uncertain prediction hurts judgment (57.8% vs 60.2%); show deferral status only |

**Fusion choice by source relationship (decision rule for the synthesizer):**
- Pairwise correlations unknown/unstable → **CI** (convex combination of information matrices; consistency guaranteed).
- Identifiable common-information structure (Channel A/B agree on the shared link) → **ICI** (tighter bounds; the TNF funnel is the canonical ICI case: four legs, one common link `pit_pressure_lands`).
- Sources mutually inconsistent (spec §5 CONFLICT across tracks) → **CU**, not averaging.
- Never PW/inverse-variance on sources that share information — the paper's measured penalty is the PW Sharpe collapse (0.11 vs 0.48).

### 3.5 Exposure bundling rule

A ThesisBundle is staked as **one position**:
- Bundle win probability from the fused (ICI/CI) combination of leg probabilities — not the product (product assumes independence; the bundle is the anti-independence object).
- Bundle variance = w'Σw with the Channel-B correlation matrix; stake = Kelly/fractional-Kelly on the bundle edge with the 0822 drawdown governor (hard 30% cap; new thesis types start at reduced stakes — the "flat first period").
- Margin/total distributions inside a bundle: train with the **twCRPS + λ=0.6 pool** (0746) when the bundle's thesis is tail-sensitive (blowout/shootout legs); plain-CRPS body model otherwise. Evaluate bundles on the 1649 proper-score doctrine: CRPS primary for distributions, Brier for cover probabilities, log score as tail diagnostic — never a single metric.
- UI/API invariant (spec §7): the bundle renders as one thesis with combined exposure and its n_eff; the four-receipts presentation is a contract violation.

### 3.6 What remains unexecuted (INFERENCE — no evidence of implementation in the checkout)
Channel B/C on GSE's source panel; the ≥1% log-loss ICI gate (0790 `:73`); the 1482 two-season backtest (ADAPT bar: DM p<0.10); the 1675 break-aware regime weights; the twCRPS adopt gate (`:44`); the NOTEARS/Skellam adopt gates. The math is verified; the runs are not.

---

## 4. INFLATION WATCH (plain language)

1. **"70%+ variance cut" is attached to the wrong method in the map.** It belongs to the boundary-reflection estimator for the low-dim case (1482 ledger `:17`), not to group-SCAD pruning. gSCAD's real numbers are the ASCFE 2.650×1000 win and the selection-consistency rates (0.70→0.81 exact selection, 0.96→1.00 inclusion). Small fix, but the map's parenthetical conflates two results.
2. **Map finding 1 (CQR bug) is stale.** The clamp is gone from `cqr.ts`; the code fail-closes with an explicit comment naming the old failure mode, and a recipe-audit module verifies it. The highest-urgency defect has been repaired (commits `1de6b69f6`, `1d3814010`). What's still owed is the acceptance backtest (±1.5pp coverage, ≤90% baseline length), not the repair.
3. **"GSE is Brier-only, no CRPS" is true of the live evaluation path but not of the tree.** `scrps.ts` and `crpsmod-loss.ts` exist as additive, unwired utilities. The accurate statement: no CRPS doctrine, no `crps.ts`, nothing wired into ranking/training/publish. Don't let the file listing be read as "CRPS is done."
4. **NOTEARS "within 0.002 at ≤60% features" is a spec, not a result.** The map's "gated on" phrasing is literally true but invites misreading as achieved. The paper measured graph-recovery (SHD/FDR) on simulations; the NFL experiment is proposed with explicit reject conditions (Brier worsens >0.003 or fold-stability <0.5 → reject).
5. **Skellam "Brier 0.58 vs 0.65" is a soccer-paper result**, not an NFL measurement. The NFL adaptation is an unexecuted experiment with adopt/reject gates. The key-number caveat is real and load-bearing (±3, ±7 spikes break the plain Skellam).
6. **twCRPS "1.3–2.5%" is average-to-max, not a range of estimates** — 1.3% mean, 2.5% max at the 90th percentile, on a single train/test split with no multiplicity control. Modest absolute gains; the paper is honest about this and so should we be.
7. **RD-FGL's 60–70% MSFE reduction is ECB macro-survey data** (Gaussian errors, stable forecaster panel, p=45–59). An NFL season is ~17–18 weeks × K sources — the ledger itself flags noisy factor estimation. The regime machinery only beat plain FGL where real breaks existed (GDP/inflation yes; unemployment no).
8. **ICI's Sharpe 0.48 vs 0.11 is equities, 1993–2021, and the S&P 500 TR beat every model.** Fusion improved relative standing; it did not beat the index. The transfer to pick-probabilities is a proposal gated on an unexecuted ≥1% log-loss test — strong theory, zero GSE-measured evidence so far.
9. **The map's "Ensemble lesson, stated five ways" is genuinely convergent** (five independent sources, five methods, one lesson: model the correlation), but four of the five are finance/macro/weather-domain results. The convergence is about the *mathematics of correlated combination*, which transfers; the *magnitudes* do not.

---

## 5. SECOND-VERIFICATION PASS (2026-10-02, independent re-check of §§1–4 above)

An independent verifier re-ran the key source checks against the ledgers and the checkout. Results:

### 5.1 Ledger-direct confirmations (beyond the briefs)
- **0746 ledger, line 25 (direct read):** "twCRPS skill improvements average **~0.8% at the 80th-percentile threshold** and **~1.3% at the 90th**, with maxima **~1.4% and ~2.5%** across stations/models. Cost: body CRPS degrades slightly. **Linear pool at λ=0.6** (60% twCRPS model + 40% CRPS model) retains most of the tail improvement while controlling much of the body loss — the paper's recommended operating point. NLL training is competitive on the body but worse in the tail." §1.4's numbers CONFIRMED at the source.
- **1446 ledger (direct read):** uniform rule (ξ_y = y) beats each league's own rule everywhere they differ — NHL own 0.907 → uniform 0.965 (fitted 0.968); SuperLega own 0.963 → uniform 0.993; EPL/Championship 0.952–0.965 → uniform 1; **fitted slopes add ≤0.01 beyond uniform** (line 36). Constant-sum test is necessary-not-sufficient (SuperLega passes but underperforms uniform, line 44). NFL binary outcomes reduce to Bradley–Terry; **unbalanced 17-game schedule → Proposition 1 fails league-wide** → principled argument for model-based ratings over standings (lines 46, 50). ADOPT/REJECT gates: adopt AC head iff 2020–2024 NFL OOS log-loss ≤ best binary baseline AND fitted slopes within 2 SE of uniform; reject uniform simplification if any fitted slope deviates by >3 SE with OOS gain (line 63). §1.6's 1446 claims CONFIRMED at the source.
- **1675 ledger, line 21 (direct read):** MSFE ratios to EW "~0.31–0.44 (roughly 60–70% MSFE reduction)" on the ECB SPF GDP/inflation series, in the 90% Model Confidence Set, ranked 1–3; plain FGL beats RD-FGL on unemployment (no strong breaks). §1.2 CONFIRMED at the source.
- **1482 ledger, line 17 (direct read):** "reflection cuts asymptotic variance by >70% vs no reflection" — §1.3's attribution correction CONFIRMED at the source; the variance cut belongs to the Hall–Wehrly/Chen–Hong boundary-reflection step of the low-dim local-linear estimator, not to group-SCAD.
- **0790 ledger, lines 46–47, 73 (direct read):** median Sharpe PW 0.11 / CU 0.16 / CI 0.38 / ICI 0.48; global PW 0.10 → ICI 0.34; the ≥1% log-loss gate is the ledger's proposed GSE numeric gate (line 73), not a paper result. §1.1 CONFIRMED at the source.
- **0004 ledger, lines 62, 72, 86, 89 (direct read):** trace-norm 45.89% [43.54%, 48.21%] < naive baseline; H2 two-factor p≈1, rank-four p≈1; two-stage > online at p=7.8×10⁻⁵ (also for two-factor p=4.4×10⁻¹⁴, rank-four p=9.8×10⁻⁹ — the *training* helps every parameterization, the *parameterizations* add nothing); authors' own "many limitations" note on trace-norm. §1.7 CONFIRMED at the source.

### 5.2 CQR repair re-confirmed + audit module found
- `apps/web/lib/calibration/cqr.ts` lines 14–21: `rank = Math.ceil((1 - alpha) * (n + 1)) - 1; if (rank >= n) return Number.POSITIVE_INFINITY;` — fail-closed, no n−1 clamp. The header comment names the old failure mode verbatim ("instead of clamping the rank, which would falsely certify 1−α coverage") and cites `docs/research/2026-09-21/drive-deep/conformal-prediction-small-sample-calibration-audit.md`. Git: `1de6b69f6` → `1d3814010 fix(calibration): cqr.ts conformalQuantile fails closed on small n (research spec)`.
- `cqr-recipe-audit.ts` + `cqr-recipe-audit.test.ts` exist in the same directory (the audit module §1.5 references). §1.5's "CORRECTED — no longer live" verdict CONFIRMED independently. The still-owed item remains the acceptance backtest (coverage ±1.5pp, length ≤90% of absolute-residual baseline).

### 5.3 CORRECTION to §3.6: lane-C implementations EXIST in the checkout (unwired, gates unevaluated)
§3.6's "no evidence of implementation in the checkout" is **wrong**. A repo grep found a full ensemble inventory at `packages/prediction-engine/src/ensemble/` containing lane-C modules — all marked research-only / ADDITIVE / NOT wired into any live path, all acceptance gates NOT EVALUATED:

- **`covariance-intersection.ts`** (122 lines, 5 tests, header: "Research-only module. Not wired into any live fusion path."): implements `precisionWeighted` (the overconfident PW baseline), `covarianceIntersection` (CI via grid-search ω, sequential fusion for n>2), `simpleAverage`, `decomposeUncertainty` (epistemic/aleatoric split per paper eq. 34), `consistencyCheck` (NEES-style: fused variance must not understate empirical squared error), and `adaptiveWeights` (mAFTER-style softmax over recent log-loss — the 0790 ledger's improvement experiment, line 76, is coded). **Gap: ICI is NOT implemented** — only CI. The method that delivered Sharpe 0.48 (ICI, the common-information-structure variant) has no implementation; neither does CU.
- **`2209-01697-regime-factor-glasso.ts`** (140 lines, 5 tests, `ENABLED=false`, "Gate status: NOT EVALUATED", owner: Mimo, bucket: MODEL, lane: ensembles, verdict: ADAPT, doctrine: PROPRIETARY_EDGE): the docstring describes the full RD-FGL mechanism (PCA-strip → GL on residual precision → Bates–Granger weights → Bai–Perron break tests), but the implemented functions are **generic stacking blocks only** (`stackNNLS`, `logScoreStacking`, `regimeStackWeights`, `softThreshold`, `istaLasso`, `tvDenoise1d`) — **no PCA factor strip, no Woodbury recomposition, no graphical lasso on residual precision, no Bai–Perron test**. This is scaffolding carrying the paper's name and gate; the paper's mechanism is not implemented. (Same pattern as the CV-scaffolding finding: a landed file is not a landed mechanism. Garrett's 17:34 audit-challenge standard applies — claims need test+gate receipts, and the gate here explicitly requires walk-forward data "not available in this environment".)
- **`2010-10435v1-time-varying-forecast-combination.ts`** (124 lines, `ENABLED=false`, "Gate status: NOT EVALUATED", owner: Mimo): implements `ewaUpdate` and `boaUpdate` (Bernstein Online Aggregation with second-order correction) — online-aggregation machinery, **not** the paper's local-linear estimator + boundary reflection + two-stage group-SCAD. The acceptance gate (DM p<0.10 on ≥2-season backtest; fall back to static if weights collapse to near-constant) is documented verbatim and unevaluated.
- **`2408-00785v4-kairosis-forecast-aggregation.ts`** (3 tests, `ENABLED=false`, "Gate status: NOT EVALUATED"): Kairosis Bayesian change-point time-weighting with ICI fusion *within the post-change regime* — i.e., it proposes the §2.1 handoff (1482's smooth weights ↔ 1675's abrupt breaks) in one module, but the ICI half depends on an ICI that doesn't exist yet (see CI gap above). Gate: positive skill vs uniform-median benchmark on Brier and log-loss, margin exceeding the paper's ~0.04–0.06 skill units.
- **Adjacent inventory (not audited this pass, noted for the wiring lane):** `conflict-abstention.ts`, `mafter-combiner.ts`, `baee-ensemble.ts`, `variance-em-aggregator.ts`, `disagreement-blend.ts`, `disagreement`/`diversity-diagnostic.ts`, `pool-diversity.ts`, `2011-02077-factor-graphical-ensemble.ts`, `cqra-t.ts`, `iqra.ts`, `2108-02082v3-regime-blender-febama.ts`, `2203-03279v3-fforma-fusion.ts`, `2202-11834-beta-linear-pool.ts`, `regime-switch-aggregation.ts`.

**Revised status for the wiring lane:** the honest statement is not "math verified, runs not done" but "**math staged, mechanisms partially scaffolded, nothing wired, no gate evaluated**." The three build items, in dependency order: (1) implement ICI (the missing 0.48-Sharpe method — CI alone is the conservative half); (2) replace the 2209 scaffolding's generic stacking blocks with the actual FGL pipeline (PCA strip → residual-precision GL → Woodbury → Bates–Granger → Bai–Perron regime weights); (3) replace the 2010-10435v1 online-aggregation blocks with the local-linear + reflection + group-SCAD recipe — then run the documented gates on walk-forward data before any wire-in.

---

*End of lane C deep read (second-verification pass appended 2026-10-02). All numeric claims traced to ledger file:line above; repo-state claims traced to live source files read 2026-10-02. No repo files were modified.*
