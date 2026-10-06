# [1519] EDGE: a closed-form directed test for the calibration of probabilistic binary classifiers (arXiv:2608.20511)

**Citation:** Ebrahim Khaled Ebrahim, Ahmed El-Kotory (2026). *EDGE: a closed-form directed test for the calibration of probabilistic binary classifiers*. arXiv:2608.20511v1 [stat.ME/stat.AP/stat.ML]. URL: https://arxiv.org/abs/2608.20511
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML; ~14,900 words, all sections incl. theory, simulation tables, application vignettes, software).
**Verdict:** ADAPT — port the directed binned calibration test (EDGE-poly 3) into GSE's model-monitoring as the statistical gate behind the reliability diagram; keep an omnibus companion (EF/HL) for rough misfit.

## 1. Research question
How can a practitioner test — not just describe — the calibration of a probabilistic binary classifier's binned reliability table, with a valid null distribution, in closed form, refit-free, cheap enough to run inside CV loops?

## 2. Dataset / schema
Fully simulated study plus benchmark binary-outcome datasets: Bliss flour-beetle (n=481, 291 killed, 8 doses), Hosmer–Lemeshow low-birth-weight (n=189, 59 events), Finney vasoconstriction (n=39, 20 events, near-separable), UIS drug-treatment (n=575, 147 events), GLOW (n=500, semi-synthetic with planted departures), Kyphosis, nodal, ICU. Simulation: base logit η = 0.6x + 0.5d, x~U(−3,3), d~Bernoulli(1/2), event rate ≈0.55; five departure families (link, omitted quadratic, omitted binary interaction, omitted continuous interaction, rough high-frequency). B=10,000 null reps / 5,000 power reps; all result CSVs released.

## 3. Method / model
EDGE (Ebrahim Directed Goodness-of-fit Evaluation): sort n cases by fitted π̂, form G=10 equal-frequency groups; compute standardized group residuals r_g = (o_g − e_g)/√V_g with o_g=Σy, e_g=Σπ̂, V_g=Σπ̂(1−π̂). Project r onto a pre-specified k≤3 smooth shape basis Z (default EDGE-poly 3 = orthogonal polynomials P_1,P_2,P_3 of group mean probability; alternatives EDGE-poly 2, EDGE-stk = Stukel link-shape basis). Statistic S = r′Z(Z′Z)^{−1}Z′r = ‖P_Z r‖² (Eq. 6). Fills the empty binned-and-directed cell of the calibration-test taxonomy (HL/EF are binned-omnibus, Stukel score is unbinned-directed, projection tests are unbinned-omnibus-resampling).

## 4. Equations & assumptions
- Standardized residual: r_g = (o_g − e_g)/√V_g (Eq. 1).
- Binned ECE: ÊCE = Σ_g (|g|/n)·|ȳ_g − p̂_g| (Eq. 2); relation r_g = |g|(ȳ_g − p̂_g)/√V_g (Eq. 3).
- Null covariance: r ~̇ N(0, Ω), Ω = I_G − U(X′WX)^{−1}U′ (Eq. 7); U rows collect weighted design within groups; W = diag{π̂_i(1−π̂_i)}.
- Null distribution: S ~̇ Σ_{j=1}^k λ_j χ²_{1,j}, {λ_j} = eigenvalues of (Z′Z)^{−1}Z′ΩZ (Eq. 8); Satterthwaite closed form S ≈ c·χ²_ν, c = Σλ_j²/Σλ_j, ν = (Σλ_j)²/Σλ_j², p = 1 − F_{χ²_ν}(S/c) (Eq. 9); or exact Imhof.
- Local power: under Pitman sequence π_i^{(n)} = π_i + h·γ(η_i)/√n, total non-centrality λ_EDGE = μ′P_Z μ = ‖P_Z μ‖² = Θ(h²) (Eq. 13); per-df power advantage ≤ (G−1)/k ≈ 3× for G=10,k=3 (Eq. 14).
- Algorithm 1 (7 steps): sort→group→residuals→build Z→S→Ω via Z′ΩZ trick (never forms G×G)→eigendecompose k×k→p-value.
- Assumptions (A1–A4): fixed G with equal-frequency grouping, i.i.d. covariates with finite second moment, probabilities bounded away from 0/1, continuous linear-predictor distribution. Basis fixed a priori (no data-driven selection).

## 5. Features / target
Method takes any fitted (y, π̂) pair; the closed-form null additionally needs the design matrix X (logistic fit). Target: binary outcome. In the paper's demos: dose→mortality, covariates→low birth weight, etc. For GSE: game outcome (win/loss, cover/no-cover) vs. engine's published probability.

## 6. Validation design
Size gate first (null grid n∈{200,500,1000,2000,5000}, G∈{6..20}, α∈{0.01,0.05,0.10}); power reported only where size held. Headline: n=1000, α=0.05, G=10, pre-specified EDGE-poly 3 vs. EF, HL, HL-equal-width, Pigeon–Heyse, Tsiatis, Xie, Stukel score (size-adjusted), projection test (Liu et al. 2024 reimplementation). Tie margin 0.014. Benchmark vignettes on 5 real datasets with documented misfits + 4 clean ones.

## 7. Numerical results / baselines
- Size: EDGE bases held nominal everywhere (realized 0.047–0.051 at α=0.05 across n=200–1000; Anderson–Darling p=0.22/0.67/0.07 at n=500/1000/5000 — null p-values indistinguishable from Uniform).
- Headline power (n=1000, α=0.05): EDGE-poly 3 led or tied every rival binned test on the fitted index in 19 of 22 detectable scenarios; median relative gain over the better of HL/EF ≈ 27% (range 12–78%). Cloglog link: 0.77 vs 0.40 (HL) vs 0.50 (EF). Asymmetric Stukel link: 0.93 vs 0.83 (HL) vs 0.82 (EF). Omitted quadratic 0.62 vs 0.41; binary interaction 0.51 vs 0.27; continuous interaction 0.50 vs 0.24.
- vs. Stukel score (size-adjusted): EDGE-poly 3 0.93 vs 0.62 on asymmetric Stukel link; Stukel kept a narrow edge on cloglog (0.83 vs 0.79) and omitted quadratic (0.63 vs 0.58).
- Robustness: Stukel's auxiliary refit failed to converge in 20–28% of sparse samples (event rate ≈1.5%, all n); EDGE failure rate 0% everywhere any grouped test could bin.
- Honest limits: rough 4-cycle oscillation — omnibus tests 1.00 power vs EDGE-poly 3 0.52; sawtooth — omnibus 0.95 vs EDGE 0.11. Off-index departure (2 omitted covariates): all index tests at nominal size, covariate-space tests 0.94 power.
- Cost: 8.1 ms/call at n=1000 (vs 5.0 ms for the glm fit); scales sublinearly (72 ms at n=50,000); projection test ≈ 42 s/call (≈5,100× more).
- Real data: beetle logit misfit EDGE-poly 2 p=0.003 vs HL 0.122; low-birth-weight additive model 0.039 vs HL 0.211; fix (cloglog / add interactions) clears all tests.

## 8. Code / data availability
R package **ebrahim.gof** v2.4.0 on CRAN (https://doi.org/10.32614/CRAN.package.ebrahim.gof); `def.gof(fit)` runs EDGE, `run.all.gof(fit)` the full battery; also accepts raw (y, π̂) pairs (prediction-only entry point). Reproducible paper repo: https://github.com/ebrahimkhaled/edge-gof-paper; Zenodo archive https://doi.org/10.5281/zenodo.21247541 with every CSV table.

## 9. Leakage & limitations
- No leakage (simulations); benchmark datasets have documented misfits so vignettes are illustrations, not validation — authors say so explicitly.
- The paper is honest about boundaries: rough/high-frequency misfit (omnibus wins), off-index departures (invisible to every index-based test), basis must be pre-specified, null is a large-group approximation (mildly conservative below n≈200).
- For ML classifiers (no design matrix), the closed-form Ω correction is unavailable — the raw (y, π̂) entry point needs parametric bootstrap; the authors flag this as future work. GSE's win-prob heads that aren't logistic fits need this caveat.
- Probit-like links close to logit are an identifiability limit for every test.
- Generative-AI language polishing disclosed by authors; content is their responsibility.

## 10. GSE overlap
GSE publishes win probabilities for every pick (moneyline) and posts results publicly — calibration of those numbers is the trust product. Existing research map (~/workspace/arxiv-sweep/existing-research-map.md) has a calibration cluster (ECE/reliability-diagram level); EDGE upgrades "plot the reliability diagram" to "run a hypothesis test on it with a p-value." This is new capability: a formal statistical QC gate that can run inside the weekly backtest loop. Complements ledger 1518 (conformal win probabilities — which generate the numbers EDGE would audit).

## 11. GSE implementation spec
- Port Algorithm 1 to TypeScript in the GSE engine (pure matrix ops; k≤3 eigendecomposition; Imhof via numerical integration or Satterthwaite closed form — paper shows they agree to |Δp|≈0.0013).
- Weekly QC job: take the season-to-date published moneyline probs + outcomes, run EDGE-poly 3 (G=10) + HL/EF companion; page if p < 0.05 on the directed test (smooth miscalibration → trigger recalibration) or if the omnibus companion alone fires (rough misfit → revisit features).
- The rejected direction identifies WHICH recalibration map is warranted: first-order component → Platt/temperature scaling; higher-order → isotonic; off-index → new features, not post-processing (per §9 discussion).
- For non-logistic heads use the (y, π̂) entry with parametric bootstrap, or run the R package ebrahim.gof offline for audits until the TS port covers it.
- Effort: ~0.5–1 day for the TS port + weekly cron wiring.

## 12. Reproducible test
Dataset: GSE published NFL moneyline picks 2023–2025 (engine DB) + outcomes. Test A (sanity): EDGE-poly 3 on the engine's current logistic win-prob head — expect it to hold size/fail to reject at 5% on a correctly-specified head. Test B (detection): apply a deliberate monotone distortion (cube the probs) to a copy and verify EDGE rejects (p<0.05) while AUC is unchanged — replicates the paper's matched-AUC demo and proves the gate catches what discrimination metrics miss.

## 13. Acceptance / rejection gate
ADOPT into the weekly QC pipeline if Test B rejects the distorted copy at p<0.05 AND the directed test fires on the real engine at least once on a known-bad historical window (e.g., any season where the reliability diagram visibly bends); REJECT the port if it cannot distinguish the distorted copy from the original at 5% on ≥500 games.

## 14. Improvement experiment
Go beyond the paper: build a sequential version — run EDGE on rolling 4-week windows and combine p-values by Fisher's method for a live miscalibration monitor (the paper only considers single-shot tests). Second: adapt the directed-projection idea to the conformal win-probability CPDs of ledger 1518 (non-logistic) by deriving the Ω-analogue for CPD residuals — the paper leaves "extension beyond logistic regression" as future work, and GSE's CPD heads are exactly the use case.
