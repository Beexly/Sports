# 1085 — Multivariate Forecasting Evaluation: On Sensitive and Strictly Proper Scoring Rules

## Citation / full-text source

- arXiv:1910.07325v1 — full text: https://arxiv.org/pdf/1910.07325
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 1910.07325v1
- **Full-text URL**: https://arxiv.org/pdf/1910.07325v1 (read in full; cached text 174,869 bytes / 1,486 wrapped lines: scoring-rule theory §§2.1–2.6, reporting/estimation §§3–4, Diebold-Mariano test §5, three simulation studies §6.1–6.4 with Figs 1–7, airline real-data study §7 with Tables 1–2 and Fig 10, summary §8, appendix lemmas + DM tables)
- **Authors**: Florian Ziel, Kevin Berk
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: none (assigned paper, not rejected)
- **Reason for ADAPT**: Ledger 1083 chose the ignorance score for *univariate* engine-variant selection; this paper is the multivariate companion GSE needs whenever forecasts are joint — weekly slate margins for parlay pricing, correlated player-stat distributions for DFS stacks, spread+total joint forecasts, multi-game Kelly portfolios. Three concrete transfers: (1) the energy score is the preferred strictly proper multivariate scoring rule — it separated the true model from all alternatives in every simulation study, including dependency-structure-only differences, contradicting the Pinson–Tastu skepticism (their relative-change metric was the problem; the Diebold-Mariano test reverses the conclusion); (2) the copula energy score (CES, eq. 6) isolates dependency structure and was the single most sensitive detector of mis-predicted dependencies in the airline study (DM statistics 28–158 with only N=19 windows) — exactly the diagnostic for whether GSE's slate-correlation model is right; (3) hard engineering guidance: ensemble sizes of M=8/19/51 used in the literature are far too small — DM statistics only stabilize at ~M=1,024, and even M=16,384 may be insufficient for tricky 9-dimensional cases. GSE's current ensemble sizes should be audited against this bar.
- **Read depth**: FULL READ: CRPS/energy (1)–(2)/variogram (3)/DSS (4) definitions, marginal-copula score (5) with Sklar's theorem and strict propriety proof (Theorem 1), CES (6) with lower-bound lemmas, CVS (7)–(10), CDSS (11)–(12), reporting options, estimation §4.1–4.6 (K-band energy estimator (14)–(16), copula-observation rank adjustment (22)–(23), MS–CS plug-in (24)), Diebold-Mariano test (25)–(27), sensitivity studies I (bivariate normal correlation grids, M=2^14, N=2^9) and II (likelihood-matched biases, 7 models, L=64 replications), random peak study (8 models incl. mixture-normal with identical marginals), ensemble-size study (M grid 16→16,384; horizon H=3 vs 9), airline AirPassengers study (9 AR models × comonotone/countermonotone residuals, H=12, M=2^16=65,536, N=19, Tables 1–2, low-dimensional diagnostics Fig 10), §8 guideline (1)–(4), appendix bounds proofs and all DM tables.
- **Wave**: wave2-reader-20
- **GSE overlap**: No multivariate-evaluation ledger exists in the corpus; 1083 covers only univariate scoring. The copula-decomposition idea complements IDR (1084) and GP-PIT (1082) — those produce joint distributions; this paper evaluates them. **New capability**: multivariate variant comparison + dependency-structure diagnostics + ensemble-size requirements.

## Research question

How should multivariate probabilistic forecasts (e.g., joint outcome simulators) be scored so that both marginal calibration and dependence structure are evaluated, and which score best discriminates?

## Summary

The paper reviews the four standard multivariate scores (energy, variogram, Dawid-Sebastiani, log) and introduces marginal-copula scores: MCS(a)=MS(a)·CS (multiplicative, strictly proper when components are; Theorem 1), with copula energy score (CES), copula variogram score (CVS), and copula Dawid-Sebastiani score (CDSS). Key empirical conclusions from three simulation studies: (i) the energy score clearly separates the true model from all alternatives, including correlation-only misspecifications — it is almost as powerful as the (Gaussian-only) DSS and beats the variogram score; the earlier "energy score is insensitive" claim was an artifact of using relative change instead of the DM test; (ii) the CES is the strongest pure dependency-structure detector (airline study: detects comonotone/countermonotone residual misspecification with DM statistics 28–158 at N=19); (iii) estimation matters: K-band energy estimators (eq. 16) with small K, rank-adjusted copula observations (22) to fix misspecified-marginal leakage into the copula score, and the MS–CS plug-in correction (24); (iv) ensemble size M must be large — stability in DM statistics needs ~1,024 paths for simple settings and 16,384+ for hard 9-dimensional ones; M=8–51 as in the literature is insufficient. Forecasting guideline: ensemble forecasts with large M, full-dimensional energy score, DM test for significance, CRPS for marginals and bivariate CES along the horizon as diagnostics.

## Method, math, and equations

- ES_β(F_X,y)=E‖X−y‖₂^β − ½E‖X−X̃‖₂^β (2), β∈(0,2), strictly proper; energy distance (28), Cramér distance (29), characteristic-function representation (30).
- VS_{W,p} (3); DSS (4); marginal-copula MCS=MS·CS (5), Theorem 1 strict propriety.
- CES (6) with lb_CES=1/4−1/(2√6), scaling H^{−1/2}; CVS (7)–(10) bounded by 1′W1; CDSS (11)–(12), unbounded, not strictly proper in practice.
- Estimation: ED/EI estimators (14)–(16) K-band; VS estimator (17)–(18); DSS plug-in (19)–(21); copula observations via mid-point ecdf with rank adjustment u*=(2R−1)/(2N) (22); empirical copula (23); MS–CS plug-in (24).
- Evaluation: sample mean score (25), relative change (26), Diebold-Mariano test (27) under weak stationarity assumptions.

## Datasets

- Synthetic: bivariate normal correlation grids (ρ∈{−1,−0.8,…,1}, M=2^14, N=2^9); Scheuerer–Hamill likelihood-matched bias study (7 models, M=2^13, N=2^8, L=64); random peak study (H=3/9, Q=5, 8 models, M=2^14, N=2^5, L=64/128); ensemble-size sweep M∈{16,…,16,384}.
- Real: AirPassengers (144 monthly obs, 1949–1960), rolling windows T=70 in-sample, H=12, shift 4, N=19, 9 AR(12/13/p) models × standard/comonotone/countermonotone residuals, M=2^16=65,536 paths via residual bootstrap.

## GSE application and implementation spec

1. **Primary adaptation**: adopt the energy score as GSE's multivariate engine-variant selection metric for joint forecasts — weekly slate of game margins (parlay/hedge pricing), player-stat vectors for DFS, spread+total joint distributions. DM-test protocol for variant A/B.
2. **Dependency diagnostic**: CES (bivariate along the "forecasting path," Fig 10 style) to audit GSE's correlation models — e.g., correlated game outcomes within a slate, QB–WR stack correlations for DFS. Pairwise CES per game-pair reveals *where* in the slate the dependency model breaks.
3. **Engineering fix**: audit GSE's reported ensemble sizes against the M≥1,024 stability bar; upgrade to K-band energy estimators for large ensembles.
4. **Copula-observation discipline**: apply the rank-adjustment (22) whenever comparing copula structures across engine variants with different marginals — otherwise marginal misspecification leaks into dependency scores (paper §4.5).
5. Effort: ~1 week (scoring + DM test code; the work is generating large-enough ensembles).

## Leakage

- Relative change in score is explicitly shown to be a misleading sensitivity measure — the paper's own headline reversal rests on switching to the DM test; never report RelCh (26) as evidence of discrimination.
- CDSS is unbounded below and "a useless rule for applications" — exclude it despite its inclusion in the study.
- CVS-based MCS is not strictly proper (variogram score is merely proper); use CRPS-CES when strict propriety of the combined score is required.
- The CES's sensitivity depends on the copula-observation estimator; the misspecified-marginal pitfall (§4.5) means CES comparisons are only valid across variants with the same marginals or after rank adjustment (22).

## Limitations

- All simulation evidence is synthetic/linear (bivariate normal, AR); the airline study is one small real dataset (N=19). Transfer to fat-tailed NFL outcomes needs verification.
- Energy score with β=1 fixed; β tuning for heavy tails (Székely & Rizzo) unexplored in the paper.
- Strict propriety of MCS holds only for continuous marginals; NFL margins/totals are effectively continuous but moneyline outcomes are discrete — the discrete case degrades to plain propriety.
- No treatment of computational cost scaling: CES/CVS with M=65,536 × N windows is expensive; the K-band estimator mitigates but the paper gives no wall-clock numbers.
- The energy score's characteristic-function argument (§6.5) suggests it measures discrepancy in effectively lower-dimensional space for H>2 — acknowledged as intuition, not proven discrimination power.

## GSE overlap

The corpus has no multivariate forecast-evaluation entry; 1083 is univariate-only. GSE's engine produces joint forecasts (slates, DFS lineups) with no documented selection metric for the joint distribution — this fills it. **New capability**: energy-score variant selection + CES dependency diagnostics + ensemble-size standards.

## Implementation difficulty

Medium. Energy score and DM test are standard; the cost is generating M≥1,024 ensembles per game per variant and the rank-adjusted copula machinery for CES.

## Reproducible test

Replicate sensitivity study I on the bivariate normal correlation grid (M=2^14, N=2^9) to verify the paper's DM-test reversal of Pinson–Tastu, then apply to GSE data: engine variants A/B over the 2024 NFL season, joint forecast = vector of game margins for each week's slate; compute energy score per slate, DM test A vs B; separately compute bivariate CES per game-pair to localize dependency errors. Baseline: univariate ignorance selection (1083) on the same variants — check whether the multivariate ranking ever reverses the univariate one (it should when variants differ only in correlation structure).

## Numeric gate

**1,024** — adopt the energy score as GSE's multivariate variant-selection metric only after verifying that engine ensembles use **M ≥ 1,024** simulated paths per forecast (the paper's empirical stability threshold: below it, DM statistics had not converged for 3 of 7 settings). With M<1,024 the energy-score comparison is not trustworthy and the gate fails; upgrade ensemble size first, then compare.

## Improvement experiment

The paper leaves the multiplicative MS·CS combination unoptimized ("look for better isotonic functions"). Test an additive variant with scale-matched components: standardize MS by its rolling-window standard deviation before combining with CS, and compare DM-test power against the multiplicative MCS on the random-peak study design. If the scale-matched additive score matches or beats MCS power, it is more interpretable for GSE's public model cards (units preserved separately for marginals vs dependency).

## Verdict

**ADAPT** — Energy score is the strictly proper multivariate workhorse (separates true from all alternatives incl. correlation-only errors); CES is the most sensitive dependency-structure diagnostic (DM 28–158 at N=19); and the paper gives a hard engineering bar: M≥1,024 ensemble paths before energy-score comparisons are stable. Use energy score + DM test for joint-forecast variant selection, CES for slate-correlation audits, and enforce the 1,024-path minimum.
