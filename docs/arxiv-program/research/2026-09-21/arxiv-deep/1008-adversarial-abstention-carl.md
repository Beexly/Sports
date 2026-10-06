# [1008] Playing it Safe: Adversarial Robustness with an Abstain Option (arXiv:1911.11253)

## Citation / full-text source

- arXiv:1911.11253 — full text: https://arxiv.org/pdf/1911.11253
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Cassidy Laidlaw, Soheil Feizi (2019; v1). *Playing it Safe: Adversarial Robustness with an Abstain Option*. arXiv:1911.11253v1. URL: https://arxiv.org/abs/1911.11253
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/1911.11253.txt` (arXiv conversion; read in full — abstract, §§1–8, experiments with Table 1 and Fig. 7, Appendix A proof; six attack variants, CARL loss, baseline Theorem 1). Note: the assignment's title string for this ID ("An Efficient Model-Agnostic Approach to Learning with Abandon Option") does not match the actual paper at this ID; the ledger follows the actual full text read.
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — CARL's jointly-learned abstain region is the model for GSE's "hostile market" no-bet layer: learn to skip games where inputs look adversarial (sharp steam, stale lines) rather than bet into them.

## 1. Research question
In adversarial robustness, if the classifier is allowed to abstain (output no class) — penalized for abstaining on natural inputs but not on adversarial ones — can we characterize the accuracy/robustness tradeoff and jointly learn the classifier AND the abstain region (CARL) better than a margin-based baseline?

## 2. Dataset / schema
MNIST (6-layer CNN) and CIFAR-10 (WideResNet-28-5, softmax activations). Attacks: L∞ with ε=0.3 (MNIST), ε=8/255 (CIFAR-10). Evaluation against six white-box attacks: four PGD variants (ℓ_abstain, ℓ_sum, ℓ_interp, ℓ_switch) + two DeepFool variants (DF, DF-Abs), adversarial error = union over all six (perturbed to misclassified AND not abstained).

## 3. Method / model
Baseline (§4): adversarially-trained classifier that abstains when the geometric margin γ(x) ≤ γ*; Theorem 1 gives exact natural error and an adversarial-error upper bound via the signed-margin CDF F_Γ. CARL (§5, Combined Abstention Robustness Learning): single network with an extra abstain class, loss ℒ(f,x,y) = −log p_y(x) + λ·ℓ(f,x̃,y) + η‖G_f(x,y)‖_1 (Eq. in §7.2), where x̃ is an adversarial example generated to fool the classifier into misclassifying WITHOUT abstaining (six new attack losses, §6; training samples {ℓ_abstain, ℓ_interp} with decaying step sizes), plus Jacobian L1 regularization. λ dials the natural/adversarial tradeoff.

## 4. Equations & assumptions
- f_baseline(x) = a if γ(x) ≤ γ*, else g(x) (Appendix A, Lemma 1: |γ̂(x1,y)−γ̂(x2,y)| ≤ ‖x1−x2‖).
- CARL loss: ℒ = −log p_y(x) + λ ℓ(f, x̃, y) + η‖∇_x(z_y − max_{i≠y} z_i)‖_1.
- Assumptions: L∞ threat model; white-box evaluation; abstention on natural inputs penalized, on adversarial inputs free.

## 5. Features / target
Features: images (MNIST/CIFAR-10). Target: class label plus an explicit abstain class a.

## 6. Validation design
Natural accuracy / abstain / incorrect rates; noise-input abstention rate; adversarial error under the union of six attacks (PGD-100, DeepFool-50). Theorem 1's predicted tradeoff verified empirically (natural error close; adversarial bound tight for small γ*).

## 7. Numerical results / baselines
Table 1 (CIFAR-10, exact): baseline γ*=0 → 77.1% correct / 0.0% abstain / 22.9% incorrect, union-attack adversarial error 50.9%. Baseline γ*=4/255 → 62.9/30.1/7.0, adv. err. 29.2%. Baseline γ*=8/255 → 49.7/47.7/2.6, adv. err. 11.7%. CARL ℓ⁽¹⁾ λ=1/2 → 82.1/3.7/14.2, adv. err. 55.2% (worse than baseline at low abstention). CARL ℓ⁽¹⁾ λ=1 → 68.1/30.0/1.8, adv. err. 35.8% (vs baseline 29.2% at similar abstention — baseline wins here on union attack). CARL ℓ⁽¹⁾ λ=2 → 58.2/41.3/0.5, adv. err. 20.1%. CARL ℓ⁽¹⁾ λ=4 → 54.3/45.3/0.4, adv. err. 13.9%. CARL ℓ⁽²⁾ λ=1/4 → 76.6/16.8/6.6, adv. err. 49.3%. CARL ℓ⁽²⁾ λ=1/3 → 69.7/27.3/3.0, adv. err. 40.1%. CARL ℓ⁽²⁾ λ=1/2 → 64.4/34.3/1.3, adv. err. 28.2%. CARL ℓ⁽²⁾ λ=1 → 52.8/46.5/0.8, adv. err. 12.1%. Noise abstention: 94–100% for most configs (CARL abstains on pure noise — OOD detection for free). MNIST headline: CARL reduces baseline adversarial error by more than half at equal natural error; on CIFAR-10 CARL surpasses the baseline Pareto frontier overall. Key safety stat: CARL ℓ⁽¹⁾ λ=1 gets 68.1% correct, abstains 30%, and is outright WRONG only 1.8% of the time on natural inputs.

## 8. Code / data availability
None stated. Data: MNIST, CIFAR-10 (public).

## 9. Leakage
Evaluation is white-box union-of-attacks — the strongest honest setting. Training attack set ⊂ evaluation set (evaluation adds DeepFool variants not used in training) — clean.

## Limitations
- CIFAR-10 union-attack results are mixed: at low abstention (λ=1/2, ℓ⁽¹⁾) CARL's adversarial error (55.2%) is WORSE than the plain baseline (50.9%); the Pareto claim rests on the full frontier, not every point.
- Baseline needs an attack at inference time (expensive); CARL fixes this but needs adversarial training (expensive).
- Adversarial-robustness framing ≠ betting markets; the threat model analogy is loose.

## 10. GSE overlap
Complements 1006 (bounded-rate abstention): this gives the LEARNED-region variant — don't just threshold a score, jointly learn the no-bet region with the predictor. The "adversarial" analogue for GSE is information-asymmetric markets: steam moves, late sharp action, lines that moved against the engine before it saw the news. CARL's abstain-on-noise finding maps to OOD games (unprecedented weather, QB debuts, coaching chaos) — the engine should learn to no-bet those rather than force a pick. The 1.8%-wrong stat is the GSE goal in miniature: a board that is rarely outright wrong because uncertainty becomes no-bets. Extension of gap #4.

## 11. GSE implementation spec
**Hostile-market no-bet head**: add an explicit "abstain" output to the pick model (extra class like CARL's), trained with a loss that penalizes abstaining on games the engine would have gotten right but not on games it got wrong. Features for the abstain head: line-move magnitude since open, time-to-kickoff of the move, reverse line movement flags, news-volume anomaly, input-feature OOD score. λ tuned to a target no-bet rate. Effort: 2–3 days.

## 12. Reproducible test
2024 season: train pick+abstain model on 2020–2023; evaluate published-set hit rate, no-bet rate, and "wrong-pick rate" (the 1.8% analogue) vs the threshold-based governor from 1006; time-ordered.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if the abstain head cuts the outright-wrong-pick rate by ≥40% relative to the 1006 governor at the SAME no-bet rate (±2 pp), with no loss of hit rate on the published set; otherwise REJECT. The single decisive number: **wrong-pick rate reduction ≥ 40% at matched no-bet rate**.

## 14. Improvement experiment
Adversarial training analogue: augment training with "market-shock" scenarios — games where the closing line moved ≥3 points against the engine's number after a news event. Train the abstain head explicitly on these so it learns the steam-move signature, mirroring how CARL trains against attacks designed to defeat the abstain region.
