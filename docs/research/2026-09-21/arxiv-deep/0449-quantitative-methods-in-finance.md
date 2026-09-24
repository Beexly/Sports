# [0449] Quantitative Methods in Finance (arXiv:2601.12896v3)

**Citation:** Vansteenberghe, E. (2026). *Quantitative Methods in Finance*. arXiv:2601.12896v3. URL: https://arxiv.org/abs/2601.12896v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 86845 lines).
**Verdict:** REJECT — a pedagogical Master 2 replication course with no novel research findings; all methods are textbook-standard and the finance applications have no transfer path to NFL probability calibration.

## 1. Research question
No research question — this is not a research paper. It is the complete lecture notes (86,845 extracted lines) for a Master 2 Research course "Quantitative Methods in Finance" (author dated August 10, 2026). Its stated objective (Introduction): "equip students with practical quantitative skills relevant for careers across the financial sector," with the explicit aim "not (yet) to produce innovations, but rather to learn to replicate academic research papers using available data." It covers data handling, probability/statistical inference, regression, time series (stationarity, SARIMAX, GARCH), structural VARs and impulse–response analysis, Difference-in-Differences and event studies, risk modelling via Extreme Value Theory, dependence modelling with copulas, Monte Carlo inference, and a session on when to prefer parametric econometrics over ML. All Python/R replication code lives at https://github.com/skimeur/QMF.

## 2. Dataset / schema
Pedagogical datasets only, no novel empirical dataset:
- Credit-card default data (I. Yeh and Lien 2009, "comparisons of data mining techniques for the predictive accuracy of probability of default of credit card clients", Expert Systems with Applications) — used in the ML session (§12.5) and Python exercises.
- CASdatasets insurance/business-interruption data for EVT replication (Zajdenweber 1996; Charpentier 2007; Charpentier & Flachaire 2021) — R packages ReIns, POT, extRemes.
- Fake/simulated data generated in-course for DiD teaching (DiD_lecture.py: 2N firms, 24 monthly periods, treatment at t=1 with continuous intensity, outcome y_{i,t}=y_t+T_{D_{i,t}}+X_i(1+log[1+T_{D_{i,t}}])).
- Bank stock returns + Eurostoxx index for event-study exercises (fines/stress-test impact on banks, following a 2016 UK regulatory-sanctions paper).
- French text-mining/news examples (bank central-bank headlines 2008/2012) for NLP illustrations.
- No NFL, sports, or prediction-market data anywhere.

## 3. Method / model
Not a single method — a survey course. The substantive methodological blocks (each with Python/R replication scripts):
1. **Time series:** Box–Jenkins workflow; stationarity (weak stationarity, ADF/augmented Dickey–Fuller with Monte Carlo p-values), SARIMA(p,d,q)×(P,D,Q)_s–GARCH(r,s) estimated jointly (explicit warning: do not estimate ARMA then GARCH on residuals sequentially); variance-stabilizing Box–Cox transforms.
2. **Impulse–response functions** for ARMA processes via Wold representation; structural VARs (SVAR_vansteenberghe.py, long-run restrictions variant).
3. **Cointegration/ECM:** Engle–Granger two-step, null of no cointegration, ECM for long-run equilibrium relationships between I(1) series.
4. **Event studies:** market-model abnormal returns AR_{i,t}=R_{i,t}−α_{i,t}−β_i R_{m,t} (OLS on t−261…t−2 window), average abnormal returns, cumulative average abnormal returns over [t1,t2].
5. **Risk:** historical-simulation and parametric VaR; Expected Shortfall; EVT — Hill estimator (OLS on log-exceedance counts, dating to Pareto), peak-over-threshold (GPD), block maxima; insurance/reinsurance applications.
6. **Dependence:** Sklar-style copula definition, Frank copula quantile regression (∂C(u,v)/∂u = F_{Y|X}(F_Y^{−1}(v)|F_X^{−1}(u))); Bouri-style quantile-regression contagion tests separating degree vs. structure of dependence.
7. **Causal inference:** DiD with continuous treatment intensity, synthetic control method (DiD as subset of SCM), Monte Carlo hypothesis testing.
8. **Inference:** Monte Carlo methods for OLS coefficient significance and ADF p-values; Bayesian examples.
9. **ML session:** parametric-econometrics-vs-ML positioning (econometrics = inference under DGP assumptions; ML = predictive power, no DGP assumptions), transparency argument for linear models (Angrist/Pischke-style), false-positive/base-rate illustration via UCI hidden-motor testing; ML techniques applied to credit-card default data (ML_credit_cards.py).
No training procedure beyond student exercises; no hyperparameters.

## 4. Equations & assumptions
Selected key equations quoted faithfully (the document contains hundreds of standard textbook equations):
- Weak stationarity: E(y_t)=μ<∞, Var(y_t)=σ²<∞, Cov(y_t,y_{t+s})=γ(s)<∞ ∀t,s.
- SARIMA–GARCH: Φ_P(L^s)φ_p(L)(1−L)^d(1−L^s)^D y_t = Θ_Q(L^s)θ_q(L)ε_t, ε_t=σ_t z_t, z_t∼i.i.d.(0,1), σ_t² follows GARCH.
- AR(p): φ_p(L)y_t=Σ_{i=1}^p φ_i y_{t−i}. MA(q): θ_q(L)ε_t=Σ_{j=1}^q θ_j ε_{t−j}.
- IRF(h)=E(y_{t+h}|ε_t=1,ε_{t−1}=0,…); from Wold, IRF = ∂y_t/∂ε_{t−h}=b_h.
- Cointegrating regression: y_t=α+βx_t+ε_t with ε_t∼I(0) required for cointegration of I(1) y_t,x_t.
- Event study: AR_{i,t}=R_{i,t}−α_{i,t}−β_i R_{m,t}; AR_t=Σ_i AR_{i,t}/N; CAR(t1,t2)=Σ_{t=t1}^{t2} AR_t.
- VaR_q=inf{x:P(R>x)≤1−q}=F^{−1}(q); historical-simulation VaR_q̂=R_{n,s}, s=[nq]; parametric VaR_q=μ+σz_q.
- EVT/GPD tail: Pr(X≤x|X>u)≃1−(1+ξ(x+u)/σ)^{−1/ξ}; Hill-style: log(count X>x)≃−(1/ξ)log x+constant.
- Frank copula: C(u,v,δ)=−δ^{−1}log[1+(e^{−δu}−1)(e^{−δv}−1)/(e^{−δ}−1)]; copula quantile identity ∂C(u,v)/∂u=F_{Y|X}(F_Y^{−1}(v)|F_X^{−1}(u)).
- ML objective: min_m L(y_i,m(X_i)) under constraints on m.
Assumptions stated: stationarity conditions for moment estimators; i.i.d. standardized innovations in GARCH; common stochastic trends for cointegration; representative-data assumption for historical-simulation VaR; parallel-trends-style logic implicit in DiD teaching.

## 5. Features / target
Not applicable — no prediction task, no features/target defined. Pedagogical examples use: wage regression (y=log wage; X=gender, education, experience); credit-card default probability; bank daily returns vs. market index; insurance loss exceedances; index-return quantiles.

## 6. Validation design
No validation design — no empirical claims are made. The course teaches replication of published papers (Zajdenweber 1996, Charpentier 2007, Charpentier & Flachaire 2021, Bouri quantile-contagion, 2016 UK sanctions event study) as student exercises. No train/test splits, no backtests, no baselines, no reported metrics.

## 7. Numerical results / baselines
None. The document reports no original numerical results, confidence intervals, or sample-size statements of its own. (Paper's own statement: methods "developed for pedagogic purpose only and would not be recommended for actual investment decision making.") The only numbers are textbook illustrations (e.g., 252 trading days → VaR 99.6% ≈ worst day of the year; 24-month DiD simulation design).

## 8. Code / data availability
Stated in the document: all lecture code at https://github.com/skimeur/QMF (named scripts include stationarity_adf_ar.py, SVAR_vansteenberghe.py, SVAR_long_run_restrictions_vansteenberghe.py, VaR_ES_vansteenberghe.py, DiD_lecture.py, ML_credit_cards.py, Zajdenweber1996.R, Charpentier2007.R, Charpentier_Flachaire_2021.R). Data: public/standard sources (CASdatasets, Yeh–Lien credit data, Eurostoxx/bank returns, simulated data). Not independently verified.

## 9. Leakage & limitations
- **No novel content to leak** — but as a research input it has zero information value: every method is decades-old textbook material.
- The author's own disclaimer disavows real-world applicability ("pedagogic purpose only").
- Dated pedagogical choices (Anaconda/conda setup circa 2020, "Plus" LLM pricing Sept 2025) — tooling advice is stale.
- Empirical-finance methods (event studies on bank fines, GARCH on returns) assume liquid-market data generating processes; volatility-clustering and cointegration machinery do not map to NFL game outcomes (short seasons, discrete scores, no continuous price).
- The tail-dependence/copula material is the closest to transferable, but the course adds nothing beyond Sklar/standard references.
- Sample-size reality: a full course's worth of methods but zero validation evidence for any of them in the document itself.

## 10. GSE overlap
Per the existing-research map (Section 4 dedup guide): GSE's corpus already covers the substantive methods at greater depth — CQR/conformal calibration stack, grouping loss (2210.16315), temperature/Platt/isotonic/Venn-Abers calibration, Clopper-Pearson intervals, reliability diagrams/LRD (2207.13770), ECE by slice, Kalman/particle/state-space dynamics (1701.05976), and the 58-paper dossiers. **Extension, not duplicate, but only as a reference**: the one marginal gap it touches is pedagogical EVT (Hill/POT/GPD) worked code, which GSE has not read a paper on — but this is a course, not a paper, and EVT-for-tails is peripheral to GSE's calibration lane (sports outcomes are bounded, thin-tailed). No overlap with Garrett's CEPT/MOVE-37 lanes. No Kelly criterion coverage (grep: zero mentions) — the map's gap #1 remains open.

## 11. GSE implementation spec
No build recommended (REJECT). If the replication repo were wanted as a teaching reference for EVT tail checks on bankroll drawdowns: clone https://github.com/skimeur/QMF, run the EVT R scripts on GSE's own historical bankroll P&L series — ~2 hours. Not a model, not a feature pipeline, not serving-relevant.

## 12. Reproducible test
Not applicable — no claim to test. The document makes no empirical claim about any predictive method.

## 13. Acceptance / rejection gate
REJECT confirmed: the document contains zero novel methods, zero empirical results, and zero sports-domain content; its most transferable blocks (copulas, EVT, event studies, DiD) are textbook-standard and already covered in GSE's corpus at research depth. No acceptance test can be constructed because there is nothing to accept.

## 14. Improvement experiment
If any follow-up were justified: port the EVT POT/GPD block to GSE's bankroll time series to estimate tail risk of drawdowns (estimate ξ via Hill plot on daily P&L exceedances) — but this is risk-management, not prediction, and adds nothing to pick calibration; the gap-list's Kelly-under-uncertainty papers remain the higher-value target.
