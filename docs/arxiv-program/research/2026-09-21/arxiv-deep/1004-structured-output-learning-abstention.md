# [1004] Structured Output Learning with Abstention: Application to Accurate Opinion Prediction (arXiv:1803.08355)

## Citation / full-text source

- arXiv:1803.08355 — full text: https://arxiv.org/pdf/1803.08355
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Alexandre Garcia, Slim Essid, Chloé Clavel, Florence d'Alché-Buc (2018; v2). *Structured Output Learning with Abstention: Application to Accurate Opinion Prediction*. arXiv:1803.08355v2. URL: https://arxiv.org/abs/1803.08355
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/1803.08355.txt` (arXiv conversion; single-line file read in full via chunked extraction — abstract, §§1–6, Theorems, Tables 1, Figures 2–3 described in text; supplementary derivations referenced but not in the main text).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — per-component abstention on structured outputs ports to GSE two ways: (1) parlay/DFS-leg-level skip decisions with per-leg costs, (2) an abstention-aware text pipeline for the nlp lane (beat-writer text → structured injury/news signals, abstaining on ambiguous sentences).

## 1. Research question
Can a structured-output predictor (labels on graph nodes, e.g., aspect + polarity per sentence in a review hierarchy) learn to abstain on individual COMPONENTS of the structure at a user-chosen cost, trained via surrogate least-squares regression with a decoding (pre-image) step, with statistical guarantees on excess risk?

## 2. Dataset / schema
TripAdvisor hotel-review subset from Marcheggiani et al. 2014: 369 reviews, 4,856 sentences, predefined train/test split; 10 aspects × 3 polarities (positive/negative/neutral) annotated at sentence level + review-level star ratings. Inputs: InferSent dense sentence embeddings (Conneau et al. 2017). Also ImageCLEF2007 MRI hierarchical classification (settings/results in supplementary). Baselines use sparse handcrafted features (one-hot words, POS tags, sentiment lexicon).

## 3. Method / model
SOLA learns a PAIR (h, r): h predicts each component label, r decides per-component abstention; output lives in 𝒴* ⊂ {0,1,a}^d (a = abstain label), f_i^{h,r}(x) = 1_{h_i=1}1_{r_i=1} + a·1_{r_i=0} (Eq. 1). Loss family: Δ_a(h(x),r(x),y) = ⟨ψ_wa(y), C ψ_a(h(x),r(x))⟩ (Eq. 3) — asymmetric embeddings comparing complete true labels with incomplete predictions. Novel Ha-loss for hierarchies (Eq. 4): Δ_Ha = Σ_i [c_{Ai}·1{abstain at i, parent correct} (abstention cost) + c_{A_c i}·1{wrong at i, parent abstained} (abstention REGRET — penalizes unnecessary parent abstention) + c_i·1{wrong at i, parent correct and predicted} (misclassification)]. Training in two steps: (1) kernel ridge regression min_g (1/n)Σ‖ψ_wa(y_i)−g(x_i)‖² + λ‖g‖²_H in a vector-valued RKHS (decomposable operator kernel K(x,x′)=I·k(x,x′)), closed-form ĝ(x)=Σ_i α_i(x)ψ_wa(y_i), α(x)=K_x(K+λI_{qn})⁻¹ (Eqs. 5–9); (2) pre-image decoding (ĥ(x),r̂(x)) = argmin_{(y_h,y_r)∈𝒴^{H,R}} ⟨ĝ(x), C ψ_a(y_h,y_r)⟩ (Eq. 6), solved as an integer program — polynomial via LP relaxation when the constraint matrix is totally unimodular (H-loss case), otherwise branch-and-bound (Ha-loss), initialized at the no-abstention solution. Theorem 1: excess risk ℛ(h,r)−ℛ(h*,r*) ≤ 2c_l √(ℒ(ĝ)−ℒ(E_{y|x}ψ_wa(y))), c_l=‖C‖max‖ψ_a‖ — abstention-aware consistency reduces to the regression error. Parameterization: c_i = c_{p(i)}/|siblings(i)| (root c_0=1), c_{Ai}=K_A·c_i, c_{A_c i}=K_{A_c}·c_i with K_A∈[0,0.5], K_{A_c}∈{0.25,0.5,0.75}.

## 4. Equations & assumptions
- f^{h,r}(x), Eq. 1; risk ℛ(h,r)=E_{x,y}Δ_a (Eq. 2); surrogate loss inner-product form (Eq. 3); Ha-loss decomposition (Eq. 4); KRR learning (Eqs. 5,7–9); pre-image (Eq. 6); excess-risk bound (Eq. 10).
- Binary special case: Δ_a^bin = 1 if wrong & predicted, 0 if right & predicted, c if abstained, c∈[0,0.5] (Cortes et al. 2016 form).
- Assumptions: i.i.d. train sample; legal labelings satisfy hierarchy y_i ≥ y_j on parent edges (HEX graph legality); abstention costs user-chosen; pre-image tractability assumptions per loss.

## 5. Features / target
Inputs: InferSent sentence embeddings per review (sequence of dense vectors); output structure = depth-3 tree (root → 10 aspect nodes → 30 polarity nodes) encoded as binary matrix. Targets: sentence-level aspect/polarity labels; downstream: review-level star rating. Abstention variable r per node.

## 6. Validation design
Three experiments on TripAdvisor: Exp1 aspect prediction (multilabel) — baselines: per-aspect logistic regression (InferSent), linear-chain CRF (InferSent), Marcheggiani et al. 2014 hierarchical CRF (sparse features); metric micro-F1. Exp2 joint aspect+polarity with abstention — sweep K_A, K_{A_c}, H-strict vs relaxed constraint; metric Hamming loss vs mean abstentions, plus polarity-after-abstained-aspect Hamming loss. Exp3 review star-rating regression from sentence-level predictions with abstention-aware representation (subtract (1−r) components → bias polarity toward 0). Significance: Wilcoxon rank-sum, p=10⁻⁶ reported for Exp3.

## 7. Numerical results / baselines
Exp1 μ-F1: H Regression (InferSent) 0.59, Logistic Regression 0.60, Linear-chain CRF 0.59, Marcheggiani hierarchical CRF 0.49 — dense embeddings dominate; structured regression matches flat baselines. Exp2 μ-F1: H Regression 0.54 vs logistic 0.53 vs CRF 0.52; Hamming-loss baselines 0.03 at 0 abstentions; abstaining on <3 aspects reduces aspect-node errors, beyond 3 quality degrades (remaining abstention candidates have lower error than polarity nodes); polarity-after-abstained-aspect best with 2–4 abstentions/sentence (relaxed constraint wins — can predict polarity even for abstained aspect). Exp3: H Regression "strongly outperforms" Hierarchical CRF on star-rating regression both text-level tasks (Wilcoxon p=10⁻⁶); abstention-aware representation improves text-level prediction over plain H Regression (exact Exp3 scores not tabulated in main text — chart/qualitative only). K_{A_c} and H-strict choice had little influence.

## 8. Code / data availability
None stated. Data: Marcheggiani et al. 2014 TripAdvisor subset (public), InferSent (public), ImageCLEF2007 (public).

## 9. Leakage
Predefined train/test split from prior work — no leakage introduced. Note: K_A/K_{A_c} swept on the test task (Exp2 curves are test-set); branch-and-bound init at no-abstention solution is a heuristic. Abstention "improvements" in Exp2 are measured against baselines that cannot abstain — fair per the paper's framing (abstention is the feature).

## Limitations
- Branch-and-bound for the Ha-loss pre-image is NP-hard in general; scalability to large structures unproven.
- Abstention costs (K_A, K_{A_c}) hand-tuned, no learning of costs.
- Exp3's key claim lacks a numeric table in the main text.
- Opinion-mining domain; the hierarchy is shallow (depth 3) and tiny (40 nodes).

## 10. GSE overlap
No structured-output-with-abstention work exists in the repo — the abstention phase-1 reads (0618, 0692–0696) are all flat single-output. The existing-research-map's gap #12 (text/news as features beyond price) is directly relevant: beat-writer text → structured signals is untested at GSE. Also complements 1003's post-hoc abstention (that one abstains on whole predictions; this one abstains per component). New capability in two lanes: nlp (text pipeline) and a finer-grained abstention primitive for multi-leg products.

## 11. GSE implementation spec
Two adaptations: (A) **Parlay/DFS leg-level abstention**: treat a parlay slip or DFS lineup as a structured output (legs = nodes, slip = root); learn (h, r) where r can void individual legs at cost c_A (modeled as reduced-stake singles). Implement the cheap version first: per-leg calibrated edge estimates as ĝ, then a greedy pre-image (drop legs with edge < K_A·stake-cost). No kernel machinery needed for v1. (B) **NLP injury-news pipeline**: sentence-level classifier over beat-writer articles outputting (entity=player, aspect=injury/practice-status, polarity=severity) with per-node abstention; abstention-aware sentence representation feeds the weekly injury adjustment to the engine. v1: fine-tune a small classifier with a reject head per node; tune K_A on 2025 articles vs official injury reports. Effort: (A) 1–2 days; (B) 1–2 weeks.

## 12. Reproducible test
(A) Backtest 2024–2025 same-game parlays: legs = engine's calibrated per-leg edges; greedy leg-drop rule vs publish-all-legs; metric: realized ROI per dollar staked at fixed total stake, time-ordered. (B) 2025 season beat-writer corpus (sample 8 teams): sentence-level injury/polarity extraction with abstention vs no-abstention; metric: precision/recall vs official Wednesday injury reports; downstream: does the abstention-aware representation improve the engine's spread prediction (ΔMAE) on those teams' games?

## 13. Acceptance / rejection gate (numeric gate)
(A) ADOPT leg-level abstention if parlay backtest ROI improves by ≥5.0 pp per dollar staked vs all-legs baseline over ≥300 settled slips, bootstrap p<0.05. (B) ADOPT the text pipeline if injury-signal F1 ≥ 0.60 vs official reports AND engine spread MAE improves ≥0.15 points on the covered games. Otherwise REJECT. The single decisive number: **+5.0 pp parlay ROI (A) / F1 ≥ 0.60 with ΔMAE ≥ 0.15 (B)**.

## 14. Improvement experiment
Learn the abstention costs instead of hand-tuning: treat (K_A, K_{A_c}) as hyperparameters optimized by Bayesian optimization against the downstream objective (parlay ROI / star-rating-style downstream metric) rather than the surrogate Hamming loss — the paper fixes costs a priori, but the excess-risk bound (Thm. 1) suggests the real objective is downstream risk, so optimize costs end-to-end and test whether learned costs beat the K_A∈[0,0.5] grid on the backtest.
