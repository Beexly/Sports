# [0695] Controlled Abstention Neural Networks for Identifying Skillful Predictions for Classification Problems (arXiv:2104.08281v1)

**Citation:** Elizabeth A. Barnes, Randal J. Barnes (2021). *Controlled Abstention Neural Networks for Identifying Skillful Predictions for Classification Problems*. arXiv:2104.08281v1. URL: https://arxiv.org/abs/2104.08281v1
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2104.08281.txt`, ar5iv-converted HTML text; complete paper §§1–6, all use cases and the DAC-vs-NotWrong comparison, read in full).
**Verdict:** ADAPT — companion to ledger 0694 (regression CAN); the NotWrong loss is the classification-side abstention loss and it beats the DAC loss (ledger 0693) on the authors' own head-to-head, so prefer NotWrong for GSE's classification (cover/no-cover) head. Synthetic climate data only.

## 1. Research question
Can a classification network with an extra abstention class, trained with a "NotWrong" loss (penalize being wrong, not failing to be right) plus a PID-controlled abstention fraction, identify skillful predictions and beat post-hoc likelihood thresholding — and does it beat the DAC loss of Thulasidasan et al. (2019)?

## 2. Dataset / schema
- Synthetic climate benchmark (Mamalakis et al. 2021, public), targets binned into k=10 decile classes.
- Three synthetic use cases: badClasses (20% label corruption concentrated in classes 4–5; 8k/5k/5k), mixedLabels (5% uniform random corruption; 8k/5k/5k), fooENSO (35% corrupt overall, 29% "tranquil" strong-El-Niño samples clean; 32k/5k/5k, deeper net 500-250-20).
- Oracle baseline for mixedLabels: all corrupted samples removed pre-training. Baselines: standard 10-class ANN + post-hoc winning-likelihood thresholding.
- 50 random-init runs per configuration; abstention setpoints 0.05–0.95. All synthetic; no sports data.

## 3. Method / model
CAN: same net as baseline + one abstention output unit p_{k+1}. NotWrong loss (Eq. 3): ℒ_NW(x_j) = −log(p_j + p_{k+1}) − α log q, where q = 1 − p_{k+1} = Σ_{m=1}^k p_m. First term = likelihood of "not being wrong" (correct + abstain); second = abstention penalty. α PID-controlled (velocity algorithm, 6-batch/192-sample windows, same as ledger 0694) to hit user-specified abstention setpoints. Networks keep learning on abstained samples (proof in supplement). LRP heatmaps used to verify the CAN keys on the ENSO region.

## 4. Equations & assumptions
- Baseline CE: ℒ_C(x_{i,j}) = −log p_{i,j}.
- NotWrong loss: ℒ_NW(x_j) = −log(p_j + p_{k+1}) − α log q; q = 1 − p_{k+1}.
- DAC loss (Thulasidasan): ℒ_DAC(x_j) = −q log(p_j/q) − α log q. Difference: DAC's first log is the likelihood of being *correct*; NotWrong's is the likelihood of *not being wrong*. Authors show NotWrong has larger negative derivatives ∂ℒ/∂a_j (wrt the correct-class logit) in the relevant phase-space region → "puts more energy into learning the correct answer."
- Assumptions: softmax outputs sum to 1; PID setpoint reachable; validation abstention within 0.1 of setpoint for model selection.

## 5. Features / target
SST anomaly maps → 10 decile classes of climate response. For GSE: game features → outcome classes {cover, no-cover} (or {over, under}) with an abstention class = "don't publish."

## 6. Validation design
Synthetic use cases with known corruption fractions; accuracy-vs-coverage curves over 50 seeds; setpoint sweep 0.05–0.95; head-to-head NotWrong vs DAC loss (Supp. Figs. S2, S3); LRP interpretability check; oracle upper bound on mixedLabels. No real-data validation.

## 7. Numerical results / baselines
- CAN beats the best baseline ANN at the same coverage for most setpoints in all three use cases; maximum accuracy improvement **+0.045 (4.5%)**.
- mixedLabels: best CAN models match ORACLE accuracy at 40–80% coverage — abstention does a "nearly ideal job" of skipping corrupted samples.
- Strategy decomposition (§4.2): fooENSO wins via better learning on tranquil samples (strategy #2); badClasses wins via both better corrupt-sample identification and better learning (#1+#2).
- NotWrong > DAC loss on these use cases (Supp. S2, S3); the authors attribute it to stronger gradients on the correct class.
- LRP: CAN's correct class-1 predictions concentrate relevance in the ENSO box — it learns the true opportunity mechanism.

## 8. Code / data availability
None linked in this version ("will be made available via Mountain Scholar/Zenodo once published" — no DOI). Synthetic generator Mamalakis et al. 2021 is public.

## 9. Leakage & limitations
- All synthetic; corruption fractions known to the experimenter; no sports or real-world validation.
- NotWrong-vs-DAC comparison is on the authors' own synthetic use cases — no independent replication.
- 50-seed sweeps × 19 setpoints × 3 use cases is a lot of compute for a method whose edge over post-hoc thresholding is a few accuracy points.
- Same frozen-percentile/threshold fragility as ledger 0694: abstention setpoints calibrated on validation may not transfer across seasons.

## 10. GSE overlap
Existing-research map: no classification-abstention entries — new capability. Pairs with ledger 0694: together they cover both GSE heads (classification for ATS/moneyline, regression for totals). The NotWrong > DAC finding refines ledger 0693's recommendation: if GSE implements a DAC-style cleaner, use the NotWrong loss.

## 11. GSE implementation spec
1. Add an abstention output to GSE's cover/no-cover classification head; train with ℒ_NW = −log(p_correct + p_abstain) − α log(1 − p_abstain), α PID-controlled to GSE's target publish fraction.
2. Publish rule: publish iff argmax ≠ abstain class (equivalently p_abstain below calibrated τ).
3. A/B against: (a) baseline + post-hoc likelihood thresholding, (b) DAC loss variant from ledger 0693 — expect NotWrong ≥ DAC per this paper.
4. Add LRP/gradient-based attribution on abstained games to check the network keys on real unreliability features (backup QB, weather) rather than spurious ones.
Effort: ~3–4 days (shares infrastructure with the 0694 regression CAN).

## 12. Reproducible test
Dataset: nflverse 2010–2025, target = ATS cover (3-class: cover/push/no-cover or binary). Train (a) NotWrong CAN, (b) DAC-loss CAN, (c) baseline + post-hoc threshold — all at matched 30% coverage. Time-ordered: train ≤2023, validate 2024, test 2025. Metric: accuracy and ROI on covered games in test window. Baseline to beat: (c).

## 13. Acceptance / rejection gate
ADAPT if (a) beats (c) on test-window covered-set accuracy by ≥2pp with p<0.05, AND (a) ≥ (b) (replicating the paper's NotWrong > DAC ordering); reject if (a) doesn't beat (c) — then post-hoc thresholding stands and the extra machinery is dropped.

## 14. Improvement experiment
Test the paper's strategy decomposition on GSE data: does the CAN win by (1) identifying unreliable games or (2) learning reliable games better? Split test games into "anomalous" (late line move >2 pts, backup QB, extreme weather) vs "clean" and measure per-subset accuracy lift. If the lift concentrates on clean games (strategy #2), the CAN is a better learner and should replace the production head entirely; if on anomalous games (strategy #1), it's a filter and should sit in front of the existing head.
