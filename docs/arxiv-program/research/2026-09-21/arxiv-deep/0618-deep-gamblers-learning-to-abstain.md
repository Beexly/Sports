# 0618 Deep Gamblers: Learning to Abstain with Portfolio Theory (arXiv:1907.00208v2)

**Citation:** Ziyin Liu et al. *Deep Gamblers: Learning to Abstain with Portfolio Theory*. arXiv:1907.00208v2. URL: https://arxiv.org/abs/1907.00208
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the reservation-class abstention mechanism is a directly portable pick-selection filter for GSE; the reward parameter o tunes the coverage/selective-error trade-off the way a bankroll manager tunes how often the engine fires.

## 1. Research question
Can a classifier learn to abstain (say "I don't know") in a single end-to-end training run by adding an (m+1)th "reservation" class and borrowing the Kelly/portfolio idea that the objective of a gambler is to grow wealth while being allowed to reserve cash? The paper asks whether this beats the two-model selective-classification approach (a separate selection head, as in SelectiveNet) and uncertainty baselines (softmax response, Bayesian dropout) on standard vision benchmarks.

## 2. Dataset / schema
- **SVHN:** 73,257 train / 26,032 test images of street-view house numbers.
- **CIFAR-10:** 50,000 train / 10,000 test images, 10 classes.
- **CIFAR-100** and a cats-vs-dogs variant also referenced in the experimental section.
- Model: a VGG16-variant convolutional network (paper's deep classifier backbone).
- All datasets are public image benchmarks; nothing sports-specific. No private data involved.

## 3. Method / model
Add one extra output neuron to the classifier: f_w(x)_{m+1} is the "reservation" (abstention) probability, alongside the m class probabilities f_w(x)_1..f_w(x)_m. Training maximizes, over a mini-batch, the log of a portfolio: for sample i with true class j(i) and reward hyperparameter o,

max_w Σ_i log[ f_w(x_i)_{j(i)} · o + f_w(x_i)_{m+1} ].

At inference, the network abstains when the reservation probability exceeds the largest class probability; otherwise it predicts the argmax class. Low reward values required a cross-entropy warmup phase before the gambler loss was stable (stated practical caveat). Comparisons run against softmax-response thresholding, Bayesian (MC) dropout, and SelectiveNet.

## 4. Equations & assumptions
- Core objective: max_w Σ_i log[ f_w(x_i)_{j(i)} · o + f_w(x_i)_{m+1} ], where j(i) is the true label index and o > 0 is the reward hyperparameter. (Paper equation; reproduced faithfully.)
- Reward-range claim: meaningful rewards satisfy 1 < o < m. If o > m the reservation class is never used (never abstain); if o < 1 the network always reserves (always abstain). (Paper's stated property.)
- Assumptions: outputs are a valid probability distribution over m+1 classes (softmax); mini-batch optimization approximates the full objective; reward o is fixed per training run.

## 5. Features / target
- Input features: raw pixel images (SVHN/CIFAR).
- Target: the true class label; additionally, the model implicitly learns a coverage decision (abstain vs. predict) at a given reward o. No hand-engineered features.

## 6. Validation design
Coverage-vs-selective-error curves: sweep o (or the abstention threshold) and report error on the non-abstained subset. Baselines: softmax response, Bayesian dropout, SelectiveNet, all evaluated on the same coverage grid. Splits are the standard train/test splits of the vision benchmarks (not time-ordered; vision task).

## 7. Numerical results / baselines
- SVHN: at 95% coverage, selective error 1.36 ± 0.02; at 90% coverage, 0.76 ± 0.05 — best among the compared methods at low coverage. (Paper's reported figures.)
- CIFAR-10: same pattern — Deep Gamblers wins at low coverage (high abstention), competitive elsewhere. (Paper's claim; exact CIFAR table values not extracted — see full text.)
- Key trade-off stated by the authors: tuning o trades full-coverage error against low-coverage selective error; no single o dominates everywhere.

## 8. Code / data availability
A PyTorch snippet of the gambler loss is printed in the paper's appendix. No repository URL or dataset link is stated in the paper. (Vision datasets are public via their standard sources.)

## 9. Leakage & limitations
Vision benchmarks are i.i.d. by construction, so the method has never been stress-tested under temporal distribution shift — exactly the regime that matters for sports betting, where the data-generating process (teams, books, market efficiency) drifts season to season. Abstention on vision data means "the image is ambiguous"; abstention on picks must mean "the edge is small", which is a different quantity the paper never models (its reservation is about aleatoric image ambiguity, not expected value). The reward o has to be re-tuned per task; the paper gives no automatic rule for choosing it, and at low o a cross-entropy warmup is needed to keep training stable. Adversarially: a selective classifier that abstains on the hardest images could look great on coverage-error curves while being useless if the abstained cases are precisely the ones a bettor must price (e.g., close games). For GSE, abstention must be calibrated against *edge*, not against model confusion alone.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. GSE already has a calibration lane: competitor-scrape-2026-09-12.md covers the grouping-loss calibration paper (arXiv 2210.16315), temperature scaling, and EV50. The 750-program taxonomy has an explicit "abstention" lane (pick selection) and the engine has a picks DB (3,411 engine picks), but the map shows no existing principled abstain/don't-bet mechanism — this is a **new capability**, extending the calibration lane into a decision-theoretic no-bet filter rather than duplicating anything.

## 11. GSE implementation spec
- Data: GSE picks DB (3,411 engine picks, SPREAD/MONEYLINE/TOTAL) joined to realized outcomes; features are the engine's existing pick-level signals (model price, market price, edge, sport, market type).
- Build: add a reservation head (one extra output neuron) to the pick-side/outcome classifier the engine already runs, or fit a lightweight logistic head with the gambler loss as a post-hoc filter on top of frozen engine probabilities. Implement the loss exactly as the appendix snippet: log(p_true·o + p_reserve), with p from softmax over (classes + reserve).
- Sweep o over a grid (e.g., 1.1 … m in steps); pick o by ROI on retained picks, not by error rate.
- Serving: at inference, if p_reserve ≥ max class probability, the engine withholds the pick (no publish, no bet); otherwise it fires with the standard stake.
- Effort: ~2–3 days (loss implementation + sweep + evaluation harness on the existing picks DB).

## 12. Reproducible test
Backtest on the 3,411 engine picks in the predictions DB: split picks time-ordered 70/30 (train on earliest, test on latest). Baseline: the engine's current all-picks ROI at flat stakes. Treatment: gambler-loss reservation filter trained on the train window, evaluated on the test window. Metric: ROI of retained picks at flat stakes, and fraction of picks retained. Report both.

## 13. Acceptance / rejection gate
ADOPT the filter iff, on the time-ordered test window, retained-picks ROI exceeds the all-picks baseline ROI by ≥ 2 percentage points AND retention ≥ 60% (it must not achieve ROI by abstaining on nearly everything). If retention < 40% or the ROI lift < 1 point, reject — the mechanism is not pulling its weight. Gate set before running the test.

## 14. Improvement experiment
Make the reward o a learnable function of market features (e.g., line movement, market liquidity) instead of a global constant: reserve more aggressively in thin/volatile markets where the engine's edge is least trustworthy. Why it might win: the paper's global o assumes uniform ambiguity; in betting, ambiguity is market-conditional, so an adaptive o could keep coverage high in liquid markets and abstain selectively where it matters most.
