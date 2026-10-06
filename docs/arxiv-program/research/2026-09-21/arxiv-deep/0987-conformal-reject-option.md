# 0987 — Classification with reject option: distribution-free error guarantees via conformal prediction (2506.21802v1)
**Ledger:** 0987 | **arXiv:** 2506.21802v1 (2025) | **Lane:** abstention
**Title:** "Classification with Reject Option: Distribution-free Error Guarantees via Conformal Prediction" — J. H. Szabadváry, T. Löfström, U. Johansson, C. Sönströd (Jönköping U.), E. Ahlberg, L. Carlsson
**Replacement context:** Fresh-search replacement (query: `ti:"reject option" OR ti:"classification with abstention"`) for an original-assignment duplicate already in the corpus map. Duplicate skips are not REJECTs — see wave summary. First of three abstention-lane papers.

---

## Citation / full-text source
Full citation: "Classification with Reject Option: Distribution-free Error Guarantees via Conformal Prediction" — J. H. Szabadváry, T. Löfström, U. Johansson, C. Sönströd (Jönköping U.), E. Ahlberg, L. Carlsson. Full text: arXiv 2506.21802v1 (2025), https://arxiv.org/abs/2506.21802v1.

## Research question
A theoretical paper that formalizes conformal prediction (CP) as a classifier with reject option for **binary classification** and derives the correct distribution-free error rate for the *accepted* (singleton) predictions — resolving confusion in prior work (Linusson et al. 2016, 2018; Bortolussi et al. 2019) whose singleton-error formulas are shown to hold only in the online setting, not the offline inductive setting practitioners actually use.

**Core construction.** A binary CP outputs prediction sets of size 0, 1, or 2. Accept only singletons:
- m(x,ε) = ®∅ (novelty rejection) if |Γ^ε(x)|=0; = Γ^ε(x) (accept) if |Γ^ε(x)|=1; = ®𝒟 (ambiguity rejection) if |Γ^ε(x)|=2.
- Accept iff ε ∈ I_x := [γ_x, c_x), where confidence 1−γ_x = second-largest p-value and credibility c_x = largest p-value.
- ε acts as the reject parameter (Chow-style): error rate and reject rate are both functions of ε.

## Dataset / schema
No single dataset; the paper demonstrates the theory on three numerical examples:
1. **Full CP (transductive), Mondrian 1-NN**: qsar-biodeg (1055×41); train 100, predict 200, 100 reshuffles.
2. **Offline ICP, RandomForest via Crepes** (default nonconformity): spambase (4601×57); proper 500 / calibration 500 / test 100; 1000 runs.
3. **Batch offline ICP**: California-Housing-Classification (20640×8); proper 200 growing +100 per batch ×10 batches; calibration 300.

## Method
**Main result (Proposition 2, online smoothed CP).** Let E = {empty}, S = {singleton}, D = {double}. From ε = P(err) = P(E) + P(err|S)·P(S) (empty always errs, double never errs):
- **σ := P(err | S) = (ε − P(E)) / P(S)** — the singleton error probability.
- Estimator: σ̂ = (nε − e)/s (e = empties, s = singletons over n predictions) → σ a.s.
- **Error rate = σ; reject rate = 1 − P(S).** Bounds P(E) ≤ ε ≤ 1 − P(D) always hold (correct-label p-values uniform on [0,1]), so σ ∈ [0,1].
- Offline ICP correction (the paper's key fix): training-conditional (ε,δ)-validity requires **ε̃ = ε − sqrt(ln(1/δ)/(2h))** with calibration size h; singleton bound becomes **σ̃ = (ε̃ − P(E))/P(S)**, estimated by (nε̃ − e)/s — a PAC-type guarantee with two parameters. Prior papers used the online formula offline, making it only approximately correct for large calibration sets.
- Mondrian (label-conditional): σ_k = (ε_k − P(E_k))/P(S_k), estimated (n_k ε_k − e_k)/s_k per category.
- Batch offline ICP: σ̃_k = (N_k ε̃_k − e_k)/s_k per batch; → σ as batches accumulate (with δ_k → 0 option via δ_{k+1} = δ_k^{h_{k+1}/h_k}).

**Hyperparameters.** ε (significance/reject parameter); calibration size h; δ (PAC uncertainty); batch sizes; Mondrian taxonomy κ. No model hyperparameters — the theory wraps any base classifier.

## Equations / assumptions
- m(x,ε) as above; σ = (ε − P(E))/P(S); σ̂ = (nε − e)/s; ε̃ = ε − √(ln(1/δ)/(2h)); σ̃ = (ε̃ − P(E))/P(S); σ_k = (ε_k − P(E_k))/P(S_k); σ̃_k = (N_k ε̃_k − e_k)/s_k.
- Assumptions: exchangeable data sequence (weaker than i.i.d.); binary labels (multiclass via one-vs-all noted); smoothed CP for exact validity; nested prediction sets in ε.

## Features / target
Features: whatever the wrapped base classifier consumes (1-NN on qsar-biodeg features, RandomForest on spambase features, etc.); nonconformity scores computed from the base classifier's outputs (e.g., min same-label Euclidean distance for 1-NN, default nonconformity in Crepes for RandomForest). Target: the prediction-set size (0/1/2) and, for accepted singletons, the singleton label — with error/reject rates parameterized by ε.

## Validation
Three numerical experiments demonstrating the error-reject trade-off:
1. **Full CP, Mondrian 1-NN** on qsar-biodeg (1055×41): max singleton proportion ≈ **0.4** → minimum achievable reject rate ≈ **0.6**. Same reject rate can arise from different ε — always pick the smallest ε (lowest error). Estimator noisy for large ε (many empties, few singletons).
2. **Offline ICP, RandomForest via Crepes** on spambase (4601×57; proper 500 / cal 500 / test 100; 1000 runs): very low error rates achievable but at high reject rates — the operating-point trade-off is the point.
3. **Batch offline ICP** on California-Housing-Classification (20640×8; proper 200 growing +100 per batch ×10 batches; calibration 300).
- Deliverable in all cases: **error-reject curves** parameterized by ε, letting a user set a tolerable error or reject rate.
- **Baselines.** Chow (1957, 1970) optimal rejection rule is the classical baseline (reject when max posterior < 1−λ_r); the paper's contribution is the *distribution-free guarantee* no prior reject-option method provides. Prior singleton-error formulas (Linusson, Bortolussi) are the corrected competitors.

## Exact results / baselines
- **Proposition 2 (online smoothed CP):** σ := P(err | S) = (ε − P(E)) / P(S); estimator σ̂ = (nε − e)/s → σ a.s.; error rate = σ; reject rate = 1 − P(S). Bounds P(E) ≤ ε ≤ 1 − P(D) always hold, so σ ∈ [0,1].
- **Offline ICP correction:** ε̃ = ε − sqrt(ln(1/δ)/(2h)) with calibration size h; singleton bound σ̃ = (ε̃ − P(E))/P(S), estimated by (nε̃ − e)/s — a PAC-type guarantee with two parameters.
- **Mondrian (label-conditional):** σ_k = (ε_k − P(E_k))/P(S_k), estimated (n_k ε_k − e_k)/s_k per category.
- **Batch offline ICP:** σ̃_k = (N_k ε̃_k − e_k)/s_k per batch; → σ as batches accumulate (with δ_k → 0 option via δ_{k+1} = δ_k^{h_{k+1}/h_k}).
- **Baselines.** Chow (1957, 1970) optimal rejection rule is the classical baseline (reject when max posterior < 1−λ_r); the paper's contribution is the *distribution-free guarantee* no prior reject-option method provides. Prior singleton-error formulas (Linusson, Bortolussi) are the corrected competitors.

## Code / data
No code released by the authors; experiments use third-party tooling (Crepes for inductive conformal prediction) on public UCI-style datasets (qsar-biodeg, spambase, California-Housing-Classification).

## Leakage
No leakage discussion in the paper; the inductive (offline) setting splits proper training, calibration, and test sets (e.g., spambase: proper 500 / calibration 500 / test 100), and the core technical point is the distinction between online (smoothed CP) and offline (inductive CP) validity — the paper's correction exists precisely because the online formula does not transfer to the offline setting. Exchangeability of the data sequence is assumed; exchangeability breaks under distribution shift (the novelty-rejection case the paper names as a motivation).

## Limitations
- Binary classification only; multiclass handled by one-vs-all with no joint guarantee stated.
- The headline formula (Prop. 2) is online-only; the practical offline version is a PAC bound (ε̃,δ) that degrades with small calibration sets — the "distribution-free guarantee" is exact only in the setting nobody deploys.
- Not all reject rates are achievable — the predictor and data dictate the feasible frontier (e.g., min reject 0.6 for 1-NN on qsar-biodeg); a user cannot simply demand 5% error at 10% rejection.
- σ̂ is noisy exactly where it matters (large ε, few singletons) — the operating region with the lowest reject rates has the least reliable error estimates.
- Exchangeability breaks under distribution shift (the novelty-rejection case the paper names as a motivation) — the guarantee is weakest precisely when abstention is most needed.
- Numerical examples are small UCI-style datasets; no large-scale or sports application demonstrated.
- Empty-set (novelty) rejections conflate "no label fits" with miscalibration of the nonconformity measure.

## GSE overlap
- Corrects Linusson et al. (2016, 2018) and Bortolussi et al. (2019) rather than duplicating them — the paper's contribution *is* the correction.
- No overlap with the wave's other papers (all sports-side); this is pure ML theory for the abstention lane. Complements the corpus's CQR/conformal work (regression-side intervals) with classification-side accept/reject guarantees.
- This is the abstention lane's theoretical anchor and the direct answer to Garrett's standing correction context: GSE's cqr.ts had a *coverage-certification bug* (clamping rank to n−1, falsely certifying 90% at 83.33%) — this paper's exact singleton-error accounting is the same class of guarantee done right. No other corpus paper gives distribution-free error rates for accepted predictions; it pairs with the map's calibration/CQR cluster as the classification-side complement.

## Implementation (GSE adaptation)
- **What to build:** a **conformal abstention gate** on GSE's pick pipeline. For each binary pick (spread cover / moneyline / total over-under as binary outcomes): wrap GSE's win-probability model in an inductive conformal predictor (calibration set = recent closed picks), accept-and-publish only singleton prediction sets at a chosen ε, reject (withhold or flag for human review) empties and doubles. Report the guaranteed singleton error rate σ̃ = (ε̃ − P(E))/P(S) alongside every published slate.
- **Concretely:** (1) implement offline ICP with the (ε,δ)-valid ε̃ correction from eq. 48 — this is *exactly* the fix for the class of bug found in cqr.ts (never certify coverage/error rates without the calibration-size correction); (2) nonconformity = 1 − p̂(true class) from GSE's model; (3) Mondrian variant conditioned on league/market type for label-conditional guarantees; (4) publish the error-reject curve per market so the desk can pick operating points (e.g., "publish only singletons at ε giving ≤8% error, accept the resulting reject rate"); (5) novelty rejections (∅) route to analyst review, ambiguity rejections (double) to no-play.
- **Where it plugs in:** the pick-publication gate ("Every pick public. Every result posted" — this makes the *withheld* picks principled instead of silent), confidence-tiering for X posts, and stake-sizing (Kelly fractions scaled by singleton credibility).

## Reproducible test
- Reproduce the paper's offline-ICP experiment on spambase (RandomForest, proper 500 / cal 500 / test 100, 1000 reshuffles): confirm (a) empirical singleton error ≤ σ̃ bound at several ε values, (b) the error-reject curve shape (low error only at high reject), (c) that the naive online formula σ̂=(nε−e)/s *understates* the true singleton error for small calibration sets while the ε̃-corrected version does not.

## Numeric gate
- In the spambase reproduction at ε=0.10 with calibration size h=500 and δ=0.05: the empirical singleton error rate over the 1000 runs must be **≤ the corrected bound σ̃ = (ε̃ − P(E))/P(S)** in at least **95% of runs** (the PAC guarantee), where ε̃ = 0.10 − √(ln(20)/1000). If the uncorrected online formula is used instead, this gate must *fail* — demonstrating the implementation captures the paper's actual correction.

## Improvement experiment
- **Sports-data validation (the paper's missing piece):** run the abstention gate on 2+ seasons of GSE's own binary picks (spread/moneyline). Success: published singletons show empirically lower error than published-all by ≥3 percentage points at a reject rate ≤40%, AND the realized singleton error stays within the σ̃ bound — proving the guarantee transfers from UCI data to sports markets.
- **Multiclass extension:** implement the one-vs-all multiclass rejector for 1X2 soccer and test whether the per-class σ_k bounds hold empirically — success if all three classes' realized singleton errors respect their bounds simultaneously.

## Verdict
**ADAPT** — The abstention lane's foundational paper: the only distribution-free error-rate guarantee for accepted predictions in the corpus, with a concrete correction (the ε̃ calibration-size adjustment) that maps directly onto a real bug class already found in GSE's own conformal code. The error-reject curve is the operational tool the pick desk needs. Binary-only and UCI-demonstrated are the limits; the sports validation is the improvement experiment and a high-priority build.
