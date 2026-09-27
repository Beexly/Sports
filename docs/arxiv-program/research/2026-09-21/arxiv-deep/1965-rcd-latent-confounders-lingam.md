# [1965] Causal discovery of linear non-Gaussian acyclic models in the presence of latent confounders (arXiv:2001.04197)

**Citation:** Takashi Nicholas Maeda, Shohei Shimizu (2020). *Causal discovery of linear non-Gaussian acyclic models in the presence of latent confounders*. arXiv:2001.04197. URL: https://arxiv.org/abs/2001.04197
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; abstract, §§1–4, Theorems 1–2, Lemmas 1–4, Algorithm 1, simulation §4.1, GSS real-data §4.2).
**Verdict:** ADAPT

## 1. Research question
PC, GES, and LiNGAM assume no latent confounders; FCI-family handles confounders but is constraint-based and weak on direction recall. Can a *functional-model-based* method (exploiting non-Gaussianity) discover causal structure while explicitly representing latent confounding — outputting directed arrows for genuine causal directions and bi-directed arrows for pairs sharing an unobserved common cause?

## 2. Dataset / schema
- Simulation: linear DAG with 40 causal arrows among observed variables (random endpoints); latent confounders each sending 2 arrows to observed variables; non-Gaussian noise e_i, f_k drawn as X = Y³ with Y ~ N(0.0, 0.5); coefficients b_ij, λ_ik ~ U on [−1.0,−0.5] ∪ [0.5,1.0]; f_k count set to 4.
- Real: General Social Survey (NORC, http://www.norc.org/GSS+Website/), n = 1380, sociological variables with domain-knowledge ground-truth directions (Duncan et al.; also the DirectLiNGAM benchmark in Shimizu et al.).

## 3. Method / model
RCD — Repetitive Causal Discovery (three steps):
1. **Ancestor extraction**: repeatedly infer causal direction between a small number of variables (Lemmas 1–2 for the no-confounder case; Lemma 3 extends to confounders), each time removing the effect of already-identified common ancestors by least-squares regression. Maximum regression size n=2 (small when samples < variables). Direction inference rests on the Darmois–Skitovitch theorem (Theorem 1): independence of two linear combinations of independent variables implies Gaussianity of shared components — so non-Gaussian residuals reveal direction.
2. **Parent vs. ancestor separation**: Lemma 4 + Theorem 2 (conditional-independence test built from unconditional tests) distinguishes direct parents from indirect ancestors.
3. **Latent-confounder detection**: pairs that remain correlated but whose direction cannot be identified are marked with bi-directed arrows (shared latent confounder).
- Nonlinearity: HSIC-based nonlinear causal-function estimation via L-BFGS (least-squares init) mentioned as extension path.
- Prior knowledge hook: ancestor sets can be initialized from known causal relations rather than empty.
- Tuning used: α_C (Pearson correlation) = 0.01, α_I (independence) = 0.01, α_S (Shapiro–Wilk non-Gaussianity check) = 0.01, n = 2.

## 4. Equations & assumptions
- Darmois–Skitovitch (Theorem 1): Y_1 = Σ α_i s_i, Y_2 = Σ β_i s_i with independent s_i; if y_1, y_2 independent then all s_j with α_jβ_j ≠ 0 are Gaussian. Contrapositive: a non-Gaussian shared component ⟹ dependence.
- Data-generating model: linear, acyclic, external influences (noise) non-Gaussian and mutually independent. Shapiro–Wilk test (α_S) checks non-Gaussianity in practice.
- Evaluation metric: F-measure = 2·precision·recall/(precision+recall).

## 5. Features / target
Unsupervised: inputs are the observed variables' data matrix. Target: a causal graph with two edge types — directed (x_i → x_j, genuine causal direction, no shared confounder) and bi-directed (x_i ↔ x_j, same latent confounder).

## 6. Validation design
- Simulation: precision/recall/F-measure evaluated separately for bi-directed arrows (latent confounders) and directed arrows (causality; TP requires correct position *and* direction). Baselines: FCI, RFCI, GFCI (PAGs — only directed/bi-directed edges scored), PC, GES, LiNGAM, RESIT (directed only).
- Real (GSS): directed arrows scored against domain-knowledge ground truth; bi-directed arrows counted correct if they exist as directed arrows in the ground-truth figure. α_I swept as α_I = 0.1^k, k = 1…25, keeping the result with fewest confounded pairs.
- No time-ordered splits (cross-sectional data).

## 7. Numerical results / baselines
- Simulation (box plots, medians quoted): latent-confounder detection — precision/recall/F "almost the same" for RCD, FCI, RFCI, GFCI, with RCD's medians highest. Causality — RCD has the highest median precision and F-measure of all methods; median recall second-highest (next to RESIT). Paper's own caveat: "RCD does not greatly improve the performance metrics compared to the existing methods. However, there is no other method that has the highest or the second highest performance for each metric."
- GSS real data (Table 1): bi-directed — RCD 4 estimated/4 correct (precision 1.0); FCI, RFCI 3/3 (1.0); GFCI 0/0. Directed — RCD 5 est/4 correct (0.8); LiNGAM 5/4 (0.8); RESIT 12/4 (0.3); FCI/RFCI 3/1 (0.3); PC/GES 2/1 (0.5). RCD's only error: dashed arrow x_3 ← x_5. Paper: "RCD performs the best among the existing methods in terms of both."

## 8. Code / data availability
No code link stated in the paper. GSS data public (NORC). Simulation recipe fully specified.

## 9. Leakage & limitations
Adversarial notes: (1) Linear only — the paper explicitly defers nonlinear extension to future work; sports relationships are nonlinear (ledger 1963's f^(2) evidence). (2) No public code — reimplementation from the paper's Algorithm 1/lemmas required. (3) Non-Gaussianity is load-bearing (Shapiro–Wilk gate): near-Gaussian sports indicators (EPA/play over large samples) may fail the gate and yield no directions. (4) The paper itself warns real-world structures are "often very complex" and RCD "likely produces a causal graph where each pair is connected with a bi-directed arrow" — α_I tuning (0.1^k sweep) is a fragile heuristic. (5) Cross-sectional method — no time dimension; applying to team-week panels ignores autocorrelation (complement, not replacement, for ledger 1963). (6) Pairwise-repetitive inference is O(pairs × regressions) — fine at d≈35.

## 10. GSE overlap
New capability; the missing audit layer. Ledgers 1962–1964 all assume causal sufficiency (or punt on it); the existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has nothing on latent-confounded structure learning. Sports is rife with latent confounders (weather, officiating crews, motivation/rest, scheme changes) that would make NOTEARS/PCMCI+ hallucinate causal edges between indicators. RCD's bi-directed edges give a principled way to *flag and quarantine* confounded pairs rather than silently trusting them. Extension, not duplicate.

## 11. GSE implementation spec
- Data: nflverse team-week panel, 2015–2026; aggregate to team-season averages (≈380 team-seasons) for cross-sectional RCD — deliberately discards time to complement the time-series ledgers.
- Nodes: same ~35-indicator set as ledger 1962. Pre-screen: Shapiro–Wilk per indicator; drop near-Gaussian ones from direction inference (keep for correlation only).
- Model: reimplement RCD per Algorithm 1 (ancestor loop with least-squares residualization, Lemma-4 parent filtering, bi-directed marking); α_C = α_I = α_S = 0.01, n = 2; sweep α_I = 0.1^k (k=1…10) keeping the sparsest-confounder solution.
- Downstream: any indicator pair joined by a bi-directed edge in ≥60% of bootstrap runs is quarantined — neither may be used as a *cause* in narrative content, and at most one enters the prediction stack (prevents confounded double-counting).
- Effort: ~4 engineer-days (no public code; algorithm fully specified).

## 12. Reproducible test
Dataset: team-season aggregates 2015–2023 for RCD learning; 2024–2025 held-out. Baselines: (a) NOTEARS graph from ledger 1962, (b) NOTEARS graph minus RCD-quarantined pairs. Test 1 (stability): bi-directed edge sets across season-blocked bootstraps, Jaccard ≥ 0.5 required. Test 2 (prediction): game-outcome model with (b) vs (a) on 2024–2025 Brier. Test 3 (domain check): known confounded pairs (e.g. offensive EPA & defensive EPA both driven by strength-of-schedule; home/away splits driven by travel) must surface as bi-directed, not directed.

## 13. Acceptance / rejection gate
ADOPT the RCD quarantine layer if: (a) model (b) matches or beats (a) on 2024–2025 Brier (parity within 0.002) while removing ≥15% of directed edges as confounded; (b) bootstrap Jaccard of bi-directed edge set ≥ 0.5; (c) ≥3 of 5 hand-labeled known-confounded pairs are flagged bi-directed (domain sanity). Reject if bootstrap Jaccard < 0.4 (confounder detection unstable) or if >50% of indicator pairs end up bi-directed at the sparsest α_I (the paper's own degenerate failure mode).

## 14. Improvement experiment
Beyond the paper: feed RCD's bi-directed pairs as *hard constraints* into NOTEARS (ledger 1962) — forbid directed edges between quarantined pairs during continuous optimization (a masked-W variant of the ECP). Hypothesis: constrained NOTEARS will reallocate edge weight to genuine mechanisms and produce sparser, more stable graphs than either method alone — testable via the gate's Brier-parity + edge-removal criteria. Second: replace the α_I = 0.1^k heuristic with stability-selection over α_I (choose the α_I maximizing bootstrap Jaccard of the bi-directed set), which directly targets the paper's fragility warning.
