# [1147] Classifiers With a Reject Option for Early Time-Series Classification (arXiv:1312.3989)

**Citation:** Hatami, N.; Chira, C. (2013). *Classifiers With a Reject Option for Early Time-Series Classification*. arXiv:1312.3989. URL: https://arxiv.org/abs/1312.3989
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:1312.3989v1 [cs.CV]).
**Verdict:** ADAPT

The domain (electronic noses, gas plumes) has zero GSE relevance, but the abstention mechanism does: accept a prediction only when two diverse classifiers agree, otherwise reject and wait for more signal. That is a concrete, implementable two-model agreement gate for GSE's pick pipeline — distinct from 1146's learned reject region.

## 1. Research question
Can a classifier make reliable early decisions on an incomplete time series by rejecting (deferring) whenever an ensemble of experts disagrees — avoiding both posterior-probability threshold tuning and dependence on a single classifier's stability?

## 2. Dataset / schema
Wind-tunnel gas plume facility: 8 Figaro metal-oxide sensors, 10 gases (carbon monoxide, ammonia, methane, acetaldehyde, benzene, butanol, ethylene, methanol, toluene, acetone), 504 eight-dimensional time-series recordings at 45 landmark locations, 100 Hz sampling, downsampled by averaging windows of 10. SVMs with RBF kernel; C and γ grid-searched over 2^-5…2^5; 10-fold CV.

## 3. Method / model
- Theory: Chow-style reject option — accept class i if P(ω_i|x) > d, else reject, with reject cost 0 ≤ d ≤ 1/2 (never reject if d > 1/2); risk E[min(f(x), 1−f(x), d)]; accuracy defined as P(correct|accepted).
- Mechanism: instead of thresholding one classifier's posterior, build a pool of SVMs over the (C,γ) grid, keep the n most accurate, compute the pairwise double-fault diversity matrix DF_{i,j} = P(both misclassify), and select the most diverse accurate pair. The pair forms a classifier-with-reject-option: **accept iff both classifiers agree on the label**, else reject.
- Forefront-Nose: serial CWROs, one per time interval k — the first classifier decides on a small signal prefix or rejects to the next classifier, which sees a longer prefix; continues until acceptance or until postponement cost exceeds a user threshold.

## 4. Equations & assumptions
- Reject rule: f^o(x) = i if P(ω_i|x) > d; 0 (reject) if P(ω_i|x) ≤ d.
- Diversity: DF_{i,j} = e = fraction of samples both classifiers misclassify (Kuncheva 2004); select pair with highest DF among accurate classifiers.
- Assumptions: diversity (low joint-error) + individual accuracy ⇒ reliable agreement signal; sequential signal availability; postponement has a cost the user can cap.

## 5. Features / target
Sensor resistance time series (gas identity classification). GSE mapping: pick features (edge, interval width, steam); target = pick outcome; the "time prefix" analogue is information arrival (early-week vs late-week lines).

## 6. Validation design
10-fold CV recognition rates at 45 wind-tunnel locations; earliness sweep k ∈ {5,10,15,20,25,30} seconds of signal; Forefront-Nose vs standard single-classifier CWRO (threshold-based) on identical SVMs.

## 7. Numerical results / baselines
Average recognition rate (accepted decisions) over 45 locations:

| Earliness | Std. CWRO | Forefront-Nose |
|---|---|---|
| 5s | 90.15 | 93.20 |
| 10s | 91.99 | 94.10 |
| 15s | 91.68 | 93.14 |
| 20s | 90.93 | 93.50 |
| 25s | 88.50 | 91.04 |
| 30s | 87.40 | 90.10 |

Agreement-based CWRO beats the threshold-based CWRO at every earliness; k = 10s is the earliness/accuracy optimum. Figure 5 shows CWRO beating a plain classifier on early prefixes.

## 8. Code / data availability
No code released. Data: wind-tunnel e-nose dataset (available via the Vembu et al. 2012 Sensors & Actuators B paper's group; not directly linked).

## 9. Leakage & limitations
- **Gas sensors, not sports** — the entire empirical section is domain-locked; only the abstention mechanism transfers.
- **Agreement ⇒ accept is conservative**: two diverse classifiers can agree and still be wrong (correlated errors on hard regions); the paper doesn't quantify agreement-conditioned error.
- **No reject-rate reporting**: accuracy is P(correct|accepted), but the abstention rate at each k is not reported — can't tell how much coverage was sacrificed for the accuracy gain.
- **Double-fault selection on the same CV folds** risks selection bias (the diversity matrix and accuracy estimates share data).
- **2013-era SVM grid** — the "ensemble" is just hyperparameter variants of one model family, not truly diverse model classes.

## 10. GSE overlap
GSE's abstention lane (1146's learned reject region, conformal gating) lacks a **multi-model agreement rule**: only publish/post a pick when two diverse engine configurations agree on the side. This paper is the mechanism's reference — accept-on-agreement is simpler and more auditable than a learned reject boundary, and it composes with 1146 (agreement gate first, learned region second). The serial-deferral idea also maps to GSE's weekly rhythm: early-week lean vs late-week confirmed pick after line movement arrives (the "wait for more signal" analogue).

## 11. GSE implementation spec
Add an **agreement gate** to the pick pipeline:
1. Maintain two diverse model configurations (e.g., current production model + a structurally different variant: different feature set or different algorithm family).
2. A pick is postable only if both models agree on the side AND both clear the edge threshold; disagreement → abstain (logged, not posted).
3. Track agreement-conditioned win rate vs single-model win rate; tune the diversity of the pair (different seeds of the same model don't count — require the double-fault-style joint-error to be low on backtest).
4. Weekly-rhythm version: early-week "lean" published internally; public card only after late-week agreement (mirrors the serial deferral).
Effort: ~3 days (the second model config is the main cost).

## 12. Reproducible test
Dataset: GSE picks DB (3,411 picks) with two model variants' historical outputs (or simulate the second variant via a perturbed retrain). Metrics: win rate and ROI of agreement-gated picks vs all picks, at the same bet count (subsample for fairness). Success: agreement-gated picks beat the full set on ROI by ≥3 percentage points with ≥100 gated picks (enough to rule out noise).

## 13. Acceptance / rejection gate
ADOPT the agreement gate only if: (a) agreement-conditioned ROI beats single-model ROI out-of-sample by ≥3 points, (b) the gate retains ≥30% of picks (not a degenerate tiny subset), and (c) disagreement cases are genuinely coin-flips (win rate 45–55%) rather than anti-signal. Otherwise drop it — 1146's learned region is the better abstention tool.

## 14. Improvement experiment
Weight agreement by **model-specific historical calibration**: instead of binary agree/disagree, compute each model's Brier-calibrated confidence and require the confidence-weighted agreement score to clear a bar. Hypothesis: a confident model + a lukewarm model agreeing is weaker evidence than two confident models agreeing, and the binary rule over-abstains on the former — test whether the weighted rule retains more picks at equal ROI.

---

**Notes for tracker:** arXiv:1312.3989v1 [cs.CV]. Primary ledger #1147 in reader-05 wave-3 set. Full text read.
