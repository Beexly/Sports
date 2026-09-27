# [1646] Distribution-Free, Risk-Controlling Prediction Sets (arXiv:2101.02703)

**Citation:** Stephen Bates, Anastasios N. Angelopoulos, Lihua Lei, Jitendra Malik, Michael I. Jordan (2021). *Distribution-Free, Risk-Controlling Prediction Sets*. arXiv:2101.02703. JACM 2023. URL: https://arxiv.org/abs/2101.02703
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: UCB calibration framework, Theorem, five applications §§5.1–5.5, other risk functions §6, discussion).
**Verdict:** ADAPT — RCPS generalizes conformal prediction from "control miscoverage" to "control ANY monotone risk with high probability": the exact formalism GSE needs for abstention-gated publishing (control the fraction of WRONG posted picks, control tail drawdown) with a finite-sample 1−δ guarantee. Complements ledger [0743] (Conformal Risk Control, which controls risk in EXPECTATION) — RCPS controls risk with HIGH PROBABILITY, the stronger statement a public pick record needs.

## 1. Research question
Conformal prediction controls P(Y ∉ C(X)) ≤ α, but practitioners care about richer risks: class-varying error costs (medical diagnosis), false-negative rates in multi-label problems, hierarchical error distances, per-object miss rates in segmentation. Can we choose a set-size parameter λ̂ from calibration data such that a general risk R(T_λ̂) ≤ α holds with probability ≥ 1−δ — finite-sample, distribution-free, for any monotone loss?

## 2. Dataset / schema
Five prediction problems: (1) **ImageNet classification** with class-varying loss L(y,S) = L_y·1{y∉S} — 100 random splits of ImageNet-Val, **30,000 calibration / 20,000 evaluation** points; (2) **MS COCO multi-label** (80 categories, TResNet base) with loss 1 − |y∩S|/|y|; (3) **ImageNet hierarchical** (WordNet tree) with normalized hierarchical distance loss; (4) **polyp image segmentation** with per-polyp pixel-recall loss (90% of true polyp pixels per polyp); (5) protein structure prediction (AlphaFold-style, §5.5). All standard public vision benchmarks.

## 3. Method / model
**UCB calibration for Risk-Controlling Prediction Sets (RCPS)**: fix a NESTED family of set predictors {T_λ} (λ larger ⇒ larger sets ⇒ loss nonincreasing in λ). On calibration data compute empirical risks R̂(λ); for each λ form a high-probability UPPER CONFIDENCE BOUND R̂⁺(λ) ≥ R(λ); choose λ̂ = smallest λ with R̂⁺(λ) ≤ α (equivalently inf{λ : R̂⁺(λ′) ≤ α ∀λ′ ≥ λ}). Supported UCBs: Hoeffding, Hoeffding–Bentkus, Waudby–Smith–Ramdas, Pinelis–Utev, CLT/asymptotic. The nested-set construction per application: probability-thresholded label sets, hierarchical ancestor sets, pixel-mask thresholds.

## 4. Equations & assumptions
- Risk: `R(T) = E[ L(Y, T(X)) ]`, L nonincreasing in set size, bounded
- Selection: `λ̂ = inf{ λ : R̂⁺(λ′) ≤ α for all λ′ ≥ λ }`
- Guarantee (Theorem): `P( R(T_λ̂) ≤ α ) ≥ 1 − δ`
- Example UCB (Hoeffding): `R̂⁺(λ) = R̂(λ) + sqrt( log(1/δ) / (2n) )`
- Assumptions: (i) exchangeable calibration/test; (ii) nested sets; (iii) monotone bounded loss; (iv) for the exact finite-sample UCBs, boundedness (CLT variant needs only asymptotics).

## 5. Features / target
Vision: image pixels → label sets / masks / hierarchical nodes. Transferable abstraction: GSE's posted-pick slate as the "set" — T_λ = {games with |edge| ≥ λ} is nested in λ; the loss is any monotone slate risk.

## 6. Validation design
ImageNet: 100 random splits, 30k calibration / 20k eval, α and δ fixed; metrics = realized risk vs α across splits, mean set size. COCO: quantitative risk/size summary over 10 random images plus full-val evaluation. Segmentation: per-polyp recall at 90%. The repeated-splits design directly estimates P(R ≤ α) — the high-probability claim.

## 7. Numerical results / baselines
- ImageNet class-varying loss: RCPS controls risk at the nominal level across all 100 splits with "reasonable" set sizes (Figure 7) — the realized-risk histogram concentrates just below α, confirming near-tightness.
- COCO multi-label (FNR loss): risk controlled, sets of reasonable size (Figure 9).
- Hierarchical ImageNet: risk controlled; predictions "generally relatively precise (i.e., of low depth in the tree)" (Figure 11) — the method doesn't buy safety with trivially huge sets.
- Polyp segmentation: captures 90% of true polyp pixels per polyp per image with the CLT bound (Figure 12).
- No competing-method horse race — the contribution is the guarantee framework; the empirical claim is tightness (risk ≈ α from below, not α/2).

## 8. Code / data availability
"The reader can reproduce our experiments using our public GitHub repository" (paper §5; angelopoulos-lab RCPS repo). Datasets: ImageNet, MS COCO, polyp segmentation (public).

## 9. Leakage & limitations
(a) High-probability control costs conservatism: the UCB gap sqrt(log(1/δ)/2n) bites at small n — with a 100-pick calibration window and δ=0.1 the penalty is ~0.12, enormous next to α=0.45. (b) Exchangeability again; NFL drift unaddressed (combine with [1645] weighting or [1640] ACI). (c) Monotone-in-λ losses only — profit-based objectives that aren't monotone in set size are excluded. (d) The nested family must be FIXED before seeing calibration data; tuning the family on the same data voids the guarantee. (e) δ must be chosen upfront; the guarantee is vacuous-ish for δ near 0.5.

## 10. GSE overlap
Ledger [0743] (Conformal Risk Control, Angelopoulos et al. 2022) controls E[L] ≤ α — expectation over calibration draws. RCPS controls R ≤ α with probability 1−δ — strictly stronger and the right claim for a PUBLIC track record ("with 90% probability our posted slate's loss-rate is under 45%"). GSE's `selective-publish.ts` / `selective-publish-runtime.ts` implement abstention heuristics with NO risk-control formalism. This ledger supplies the missing theory.

## 11. GSE implementation spec
(1) **Posted-slate risk control**: T_λ = {games with model |edge| ≥ λ}; loss L = fraction of posted picks that lose (bounded [0,1], monotone decreasing in λ); calibration = trailing posted picks; choose λ̂ via the Hoeffding–Bentkus UCB at (α=0.45, δ=0.1); publish only T_λ̂. (2) **Drawdown variant**: loss = slate max-drawdown (bounded, monotone in stake threshold). (3) Recompute λ̂ weekly; log realized risk vs α for the public record. Effort: 2–3 days.

## 12. Reproducible test
Dataset: GSE posted picks 2023–2025 with edges and outcomes. Rolling calibration (trailing 200 picks), (α, δ) ∈ {(0.45, 0.1), (0.4, 0.05)}. Metrics: fraction of recalibration windows with realized loss-rate ≤ α (target ≥ 1−δ), mean posted volume vs unfiltered, realized loss-rate distribution. Baselines: fixed-λ threshold, CRC-expectation variant ([0743]).

## 13. Acceptance / rejection gate
ADAPT if: ≥ (1−δ) − 0.05 of windows satisfy realized risk ≤ α AND posted volume ≥ 50% of unfiltered (the UCB conservatism must not strangle volume). REJECT the Hoeffding UCB in favor of the Waudby–Smith–Ramdas (empirical-Bernstein) UCB if volume collapses — tighter bounds are the paper's own §6 remedy.

## 14. Improvement experiment
**Class-varying pick loss**: replicate the paper's §5.1 class-varying loss with GSE pick TIERS (high-edge vs low-edge picks get different loss weights L_y) — control a cost-weighted risk rather than raw loss-rate, so the guarantee tracks bankroll damage, not just pick counts. Compare realized weighted risk vs the unweighted variant.

**Verdict:** ADAPT — implement RCPS UCB calibration as the formal risk-control layer for GSE's selective publishing (nested pick sets by edge threshold, Hoeffding–Bentkus UCB, α=0.45/δ=0.1); accept on ≥(1−δ)−0.05 of rolling windows holding realized loss-rate ≤ α at ≥50% posted volume.
