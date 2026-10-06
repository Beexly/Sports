# [0587] GNNRank: Learning Global Rankings from Pairwise Comparisons via Directed Graph Neural Networks (arXiv:2202.00211v3)

**Citation:** He, Y., Gan, Q., Wipf, D., Reinert, G., Yan, J., and Cucuringu, M. (2022). *GNNRank: Learning Global Rankings from Pairwise Comparisons via Directed Graph Neural Networks*. arXiv:2202.00211v3. URL: https://arxiv.org/abs/2202.00211v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 55482 lines).
**Verdict:** ADAPT — the directed-GNN strength embeddings and proximal-unfolded Fiedler solver are portable to an NFL matchup graph, but only if re-trained with time-forward held-out game validation instead of the paper's in-sample upset fitting.

## 1. Research question
Given only a directed graph of pairwise comparisons (who beat whom, with how much weight), can an unsupervised graph neural network learn a global ranking that minimizes pairwise upsets — better than classical spectral and statistical rankers (SpringRank, SerialRank, Bradley–Terry–Luce, David's Score, Rank Centrality, PageRank, etc.)? The paper answers by introducing GNNRank, the first framework that (a) embeds the directed comparison graph with a directed GNN (DIMPA or Inception Block), (b) converts embeddings into a learned similarity graph and Laplacian, (c) computes a Fiedler-style ranking vector through a differentiable proximal-gradient unrolling, and (d) trains everything end-to-end on differentiable surrogate losses for the upset ratio. It then asks whether proximal-gradient unrolling ("proximal" variants) improves the ranking, whether the learned model transfers inductively to unseen seasons/graphs, and whether the proximal refinement improves arbitrary baseline rankings used as its initialization.

## 2. Dataset / schema
Two families: real-world directed comparison graphs (78 total digraphs) and synthetic graphs from the ERO (Erdos–Renyi Outlier) model.

Real-world datasets:
- NCAA men's basketball seasons 1985–2014: "Basketball(year)" binary win/loss graphs and "Basketball finer(year)" score-based finer graphs. Team set per season; edges encode wins (binary) or point differentials (finer). 30 seasons each.
- English Premier League (labeled "Football(year)"): seasons 2009–2014, binary win/loss graphs, plus "Football finer(year)" finer variants. 6 seasons each.
- Animal: animal dominance hierarchies.
- Faculty: university faculty hiring networks for Business, CS, and History.
- HeadToHead: tennis head-to-head network.
- Finance: stock lead-lag network, 1,315 stocks, 2001–2019.
- Halo 2: game-result network.
- 78 real-world digraphs total across these sources.

Synthetic datasets (ERO model):
- n = 350 nodes.
- Sparsity p ∈ {0.05, 1} (sparse vs dense).
- Noise/outlier parameter η ∈ {0, 0.1, …, 0.8}.
- Score styles: uniform and gamma.
- Five random networks per (p, η, style) setting, each run twice.

Schema: directed adjacency/comparison matrix A with entries in {−1, 1} (win/loss direction) or real-valued weights for finer variants; node sets with known season/league provenance. Exact node counts per graph: Not stated in paper (per-season basketball ≈ 300+ teams; finance = 1,315 nodes explicitly).

## 3. Method / model
GNNRank has two heads: (a) a directed GNN producing node embeddings Z ∈ R^{n×d}; (b) a score-generation module mapping Z (or a baseline score vector) to a scalar ranking vector r ∈ R^n.

Directed GNN options:
- DIMPA (He et al. 2021): directed message passing with source/target aggregators.
- Inception Block ("IB", Tong et al. 2020): multi-scale directed convolutions. MagNet (Zhang et al. 2021) noted as an alternative but not tested.

Non-proximal variants (GNNRank-N):
- "innerproduct": scores from inner-product-style readout of embeddings.
- "dist": scores from distance-based readout of embeddings.
Both are trained directly with upset losses on the comparison matrix.

Proximal variants (GNNRank-P): the ranking is obtained by solving the Fiedler optimization through unrolled differentiable proximal/projected gradient steps:
- "proximal innerproduct", "proximal dist": proximal steps applied to inner-product/distance-based constructions.
- "proximal baseline": takes an arbitrary baseline ranking vector r′ (SpringRank, SyncRank, SerialRank, BTL, eigenvector centrality, PageRank, SVD_NRS) as the initial guess and refines it with Γ proximal steps, which the paper shows can substantially improve even weak baselines.

Learned similarity and Laplacian: from embeddings z_i,
  S_ij = exp(−‖z_j − z_i‖²_2 / (σ²d)),  L = D − S
where D is the degree matrix of S. The ranking vector solves the Fiedler problem min_r rᵀLr subject to ‖r‖²_2 = 1 and rᵀ1 = 0, handled via an orthogonal matrix Q that rotates the problem into a sphere constraint in n−1 dimensions.

The Fiedler computation is unfolded into differentiable projected/proximal gradient steps with default Γ = 5 steps, so gradients flow from the upset loss through the spectral solution into the GNN parameters.

Convergence theorem (Appendix C): if the Fiedler vector is a strict local minimizer and the step size satisfies 0 < α < 1/(4(n−1)), Algorithm 1 converges locally uniformly.

Training losses:
- L_upset,ratio (primary differentiable objective).
- L_upset,margin (optional additive margin term with default margin ε = 0.01).

Training protocol: all graph data used for training (no held-out split for real data); up to 1,000 epochs with early stopping after 200 epochs without loss decrease; 50 epochs of proximal pretraining; Adam/SGD optimizers; weight decay 5×10⁻⁴; learning rate fixed at 0.01 in the selection study; 10 repeated runs on real data; synthetic: 5 networks × 2 repeated runs. Individual runs often under five minutes. Whole study: 167,040 runs on 8 Tesla T4 GPUs, 96 Xeon Platinum 8259CL CPUs, 378 GB RAM.

## 4. Equations & assumptions
Learned similarity and Laplacian (from §3 of paper):
  S_ij = exp(−‖z_j − z_i‖²_2 / (σ²d)),  L = D − S

Fiedler-vector ranking problem:
  min_r rᵀLr,  subject to ‖r‖²_2 = 1 and rᵀ1 = 0
Orthogonal Q rotates this to a sphere constraint in n−1 dimensions; the paper unfolds projected/proximal gradient descent on this problem into the network.

Convergence guarantee (theorem in Appendix C):
  If the Fiedler vector is a strict local minimizer and 0 < α < 1/(4(n−1)), Algorithm 1 converges locally uniformly.

Differentiable upset losses used for training:
  L_upset,ratio = ‖T̃ − M‖²_F / t(M)
  L_upset,margin = Σ_ij (M_ij + |M_ij|) ReLU(r_j − r_i + ε) / t(M),  with default ε = 0.01

Stated assumptions: (1) pairwise comparisons form a single directed graph whose edge directions/weights encode relative strength; (2) minimizing upsets against the observed comparison matrix is the objective — the ranking is fitted in-sample with no explicit generative model of game outcomes; (3) the Fiedler vector of the learned Laplacian is the correct global order (spectral-ranking assumption, shared with SerialRank); (4) embeddings live in a Euclidean space where the Gaussian kernel exp(−‖z_j−z_i‖²/(σ²d)) yields a meaningful similarity graph; (5) for the convergence theorem, the Fiedler vector is a strict local minimizer. The paper states no distributional assumption on game outcomes (no Bernoulli/Poisson model as in BTL or the soccer GPs).

## 5. Features / target
Input features: the directed comparison graph itself — pairwise results encoded as a directed adjacency/comparison matrix with entries in {−1, 1} (binary win/loss) or real-valued weights (score-differential "finer" variants). No node-level covariates are used; the GNN starts from the graph structure alone (initial node features not specified in the extract — Not stated in paper).

Target variable: none in the supervised sense — the model is unsupervised. The training signal is the differentiable upset loss (L_upset,ratio, optionally plus L_upset,margin) computed against the same comparison matrix, i.e. the model is trained to reproduce the observed pairwise order with minimal upsets. On synthetic ERO data, the latent ground-truth scores (uniform or gamma draws) provide an external target for evaluation via Kendall τ, but not for training.

Prediction horizon: none — the paper ranks nodes within each observed graph; there is no future-game prediction task. Inductive transfer (apply 1985-trained model to other seasons) is evaluated but still ranks observed graphs, not future games.

## 6. Validation design
Real data: no train/test split. All edges of each graph are used for unsupervised fitting, and evaluation (upset_naive, upset_simple, upset_ratio on the same edges) is in-sample. Model/variant/hyperparameter selection (Appendix G) is done by picking the lowest in-sample L_upset,simple / L_upset,naive / L_upset,ratio within the non-proximal or proximal category. So selection, training, and evaluation all see the same edges.

Synthetic data: ground-truth latent scores are known (they generate the graph), so Kendall τ between the learned ranking and the true scores measures recovery of the truth. Still no held-out edges; evaluation is on the fitted graph.

Baselines compared (11): SpringRank, SyncRank, SerialRank, BTL (Bradley–Terry–Luce), David's Score, eigenvector centrality, PageRank, Rank Centrality, SVD_RS, SVD_NRS, and MVR (MVR frequently failed to finish after one week and is omitted from several tables).

Metrics: upset_naive, upset_simple (fraction/weighted fraction of pairwise upsets against the observed graph), upset_ratio (the training loss), Kendall τ (synthetic only). Tables report means ± one standard deviation over 10 runs (real) or 5 networks × 2 runs (synthetic).

Inductive test: the "IB proximal baseline" variant trained on the Basketball-finer 1985 graph (with "emb baseline" embeddings) is applied directly to other seasons without further training, vs. retraining per season.

## 7. Numerical results / baselines
Main real-data results (GNNRank-P = best proximal variant selected per dataset; values are means over 10 runs; §5 and Appendix E):

Average L_upset,simple:
- Basketball (1985–2014 avg): GNNRank-P 0.73; SpringRank 0.78; BTL 0.91.
- Basketball finer: GNNRank-P 0.74 vs SpringRank 0.81.
- Football (2009–2014 avg): GNNRank-P 0.78 vs SpringRank 0.91.
- Football finer: GNNRank-P 0.82 vs David's Score 0.93.
- Animal: GNNRank-P 0.25 vs David's Score 0.33.

Appendix E conclusion (paper's own words, paraphrased): "proximal baseline" with the Inception Block usually performs best among the variants; variants are comparable to and often better than baselines and are not strongly outperformed by any baseline.

Synthetic ERO results — Kendall τ for GNNRank-P (best variant; §6):
- Sparse (p=0.05), uniform scores, η=0.1: 0.79
- Sparse, gamma scores, η=0.2: 0.77
- Sparse, uniform, η=0.3: 0.70
- Sparse, gamma, η=0.4: 0.66
- Dense (p=1), uniform, η=0.5: 0.92
- Dense, gamma, η=0.6: 0.89
Performance degrades smoothly as noise η grows; dense graphs recover the truth much better than sparse ones.

Inductive learning (Basketball finer, "IB proximal baseline" trained on 1985; Appendix E.5):
- Directly applied to other seasons: L_upset,simple = 0.75 ± 0.02, L_upset,naive = 0.19 ± 0.01, L_upset,ratio = 0.01 ± 0.00.
- Season-specific retraining: 0.74 ± 0.00, 0.19 ± 0.00, 0.01 ± 0.00.
Paper's conclusion: "applying the general model produces almost the same superior performance" as retraining.

Proximal baseline as a refiner (Appendix F): starting from baseline r′ as the initial guess, average L_upset,simple improvement across all datasets is largest with SyncRank as the initial guess (1.02); average improvements for SpringRank 0.07, SerialRank 0.82, BTL 0.22, eigenvector centrality 0.19, PageRank 0.21, SVD_NRS 0.12. Average L_upset,naive improvement with SyncRank: 0.24; SpringRank 0.00, SerialRank 0.18, BTL 0.04, Eig.Cent. 0.03, PageRank 0.03, SVD_NRS 0.01.

Ablation study (§7, Tables 13–15): (a) adding the margin loss generally harms GNNRank-N but generally helps GNNRank-P (margin+ratio together); (b) pretraining and trainable proximal learning rates help; (c) Γ = 3, 5, 7 proximal steps perform similarly — 5 retained; (d) directed GNNs (DIMPA/IB) beat a two-layer MLP by about 2% on L_upset,simple, supporting the directed architecture.

Hyperparameter-selection study (Appendix G, Tables 21–26): learning rate fixed at 0.01; for real data the "proximal baseline" variant overwhelmingly selects SyncRank as its initial baseline r′ (pretrained with "proximal baseline"/dist or innerproduct similarities); the margin-loss coefficient is selected per dataset (0 or 1). All reported main-text numbers are post-selection within each category, i.e. the best of several variant×pretraining×loss-weight combinations — a selection step the paper acknowledges.

Note on baselines: MVR often could not generate results after one week of compute and is omitted from several tables.

## 8. Code / data availability
Code: https://github.com/SherylHYX/GNNRank (stated in paper). Data: real datasets are public sports/league records (NCAA basketball seasons 1985–2014, Premier League 2009–2014, tennis head-to-head, animal dominance, faculty hiring, Halo 2, finance stock data 2001–2019); synthetic data generated by the ERO model described in the paper. Exact download URLs for the processed graphs: Not stated in paper — the repo is the stated source.

## 9. Leakage & limitations
The decisive weakness for sports prediction: every real-data edge is used for unsupervised fitting AND for in-sample upset evaluation. The task is ranking reconstruction (compress the observed graph into an ordering with few upsets), not forward prediction of future games. A model can drive in-sample upsets toward zero by memorizing the graph; nothing in the real-data protocol measures generalization to unplayed games. GSE must not mistake the headline numbers (e.g. Basketball 0.73 vs SpringRank 0.78) for predictive skill.

Additional adversarial points:
- Hyperparameter/variant selection (Appendix G) picks the lowest in-sample L_upset,simple/naive/ratio among many variant×pretraining×loss-weight combos — selection on the evaluation metric with no held-out set. Reported numbers are best-of-category, inflating the apparent margin over baselines.
- The margin-loss default ε = 0.01 and Γ = 5 are ablated but the selection of loss coefficients (0/1) per dataset is itself a form of tuning on the test metric.
- NFL relevance gap: the method uses no score differentials beyond "finer" weight variants, no home-field, no injuries, no market information — and the evaluation metric (upset fraction) rewards getting the sign of the favorite right, not calibrated probabilities or ATS performance.
- Sample-size concern: Premier League seasons are ~380 games among 20 teams; basketball seasons are thousands of games among 300+ teams. Upset metrics on small dense graphs (e.g. Football 2014: GNNRank-P upset_simple 0.98–1.00 range in ablations) look near-degenerate — the loss can exceed 1.0 in the "simple" normalization, indicating the metric is not a clean fraction everywhere.
- Compute: 167,040 total runs in the study; individual runs are cheap (<5 min) but the reported results rest on a massive selection sweep, raising data-snooping concerns.
- External validity: the ERO synthetic assumes a fixed latent order with i.i.d. flip noise — NFL strength is dynamic within a season, so the synthetic recovery results (Kendall τ up to 0.92 dense) overstate applicability to a nonstationary league.
- MVR baseline failures (no results after a week) mean one competitor is effectively unmeasured.

## 10. GSE overlap
Per the existing-research map read 2026-09-21: GSE already covers Elo, Glicko, TrueSkill, Bradley–Terry, Plackett–Luce, Massey, Colley, dynamic Elo, Kalman/particle filters, nested AR(1), state-space strength models, EPA/EP, calibration, and extensive NFL metrics. The 2026-09-18 ML brief commissions learning-to-rank and state-space team strength, but implementation/results are not yet in the repo. The map's stated gaps include ranking uncertainty and genuinely new ranking machinery.

Classification: **extension with new-capability elements**. The ranking objective itself (pairwise-comparison strength from game results) is a duplicate of the problem GSE's Elo/BTL/Massey/Colley/state-space stack already solves. What is new capability is the machinery: (a) directed message-passing embeddings (DIMPA/Inception Block) that learn team representations from the matchup graph topology rather than from scalar win/loss updates; (b) an unfolded differentiable proximal-gradient Fiedler solver that refines any baseline ranking (including SyncRank, which the paper shows improves by 1.02 in upset_simple on average) — a "rank refiner" GSE does not have; (c) training directly on a differentiable upset loss rather than log-loss. No repo file implements graph-neural strength embeddings or proximal unrolled spectral refinement, so this is not a duplicate — it is a new algorithmic family (directed GNN + spectral unrolling) applied to an already-covered task, with the embeddings potentially useful as nonlinear strength features for the commissioned learning-to-rank/state-space work.

## 11. GSE implementation spec
Port only the transferable components; discard the paper's in-sample fitting protocol.

1. Data: nflverse play-by-play 2009–2025 aggregated to game-level directed edges (winner→loser), edge weights = point differential (the "finer" analogue) and optionally EPA differential. Rolling graph per season-week: nodes = 32 teams, edges = games played through week w. Node side-information (rest days, dome/outdoor, QB) is NOT in the paper's model — add as embedding inputs in the GSE port (documented deviation).
2. Embedding: implement the directed GNN (DIMPA-style source/target aggregation) over the weekly matchup graph; embedding dim d = 32–64. Readout: "dist" variant per the paper's ablations on finer graphs.
3. Rank refinement: implement the Γ = 5-step differentiable proximal gradient Fiedler solver ("proximal baseline") initialized from GSE's current best strength vector (dynamic Elo / state-space posterior mean) as r′, refining it against that week's matchup graph. Train the GNN parameters on L_upset,ratio + L_upset,margin (ε = 0.01) over past seasons.
4. Training protocol (differs from paper): time-forward walk-forward — train on seasons 2009–2021 graphs, validate ranking quality on 2022–2023, test on 2024–2025. Never train on the evaluation week's edges. Early stopping on validation upset + predictive log-loss.
5. Output: the refined 32-vector per week is used (a) as a strength feature into the learning-to-rank/state-space stack, and (b) directly for moneyline probability via a Platt-style calibration layer mapping score gaps to win probabilities (the paper has no probability output — required GSE addition).
6. Serving: refit weekly after games finalize; embeddings are tiny (32×64); inference is seconds on CPU. Estimated effort: 2–3 weeks for a first offline prototype (directed GNN + unrolled Fiedler in PyTorch), 1 week for the walk-forward harness, 1 week for calibration and ATS evaluation.

## 12. Reproducible test
Dataset: nflverse game-level results, NFL regular seasons 2022–2025, weekly matchup graphs built only from games completed before each target week (strictly time-forward).

Metric: (a) predictive log-loss and Brier score of calibrated win probabilities on held-out future games; (b) ATS cover rate vs. closing spread; (c) L_upset,simple on the held-out week's games only (reconstruction-style, for comparability with the paper).

Baselines to beat: GSE's current dynamic Elo and the state-space strength posterior mean (per the existing-research map), plus SpringRank on the same weekly graphs.

Window: train ≤2021 seasons, validate 2022–2023, test 2024–2025. The GNNRank port must beat the best baseline on test-window predictive log-loss to be retained — in-sample upset on the training graph does not count.

## 13. Acceptance / rejection gate
ADOPT the GNN embedding + proximal-refinement stack into the GSE strength pipeline if ALL hold on the 2024–2025 test window: (1) calibrated win-probability log-loss beats the better of dynamic Elo / state-space posterior by ≥ 0.005 nats per game; (2) Brier score improves by ≥ 0.002; (3) ATS cover rate ≥ 52.4% over the two-season window with n ≥ 500 picks (breakeven bar); (4) no degradation on calibration (ECE within 0.01 of baseline). REJECT (keep only the idea logged) if log-loss does not beat the baseline, if the gain comes only from in-sample upset reduction with no forward predictive gain, or if the proximal refinement is unstable across retrains (week-to-week rank correlation < 0.95 on unchanged history). The gate is evaluated once on the frozen test window — no re-tuning after seeing test results.

## 14. Improvement experiment
Go beyond the paper: replace the unsupervised upset objective with a supervised, time-forward objective — train the directed GNN + unrolled Fiedler stack to minimize predictive log-loss on next-week games directly (backprop through the Γ proximal steps into the embeddings), with edge weights from EPA differentials and node features for rest/QB status. The paper never does forward prediction; its own inductive test only transfers to other observed seasons. Hypothesis: embeddings learned to predict future games (rather than reconstruct observed upsets) will weight recent, high-leverage, and opponent-adjusted information the way the in-sample loss cannot, and the proximal refiner will act as a learned smoother over GSE's existing strength vector rather than a standalone ranker. Compare against the §12 baseline on the same 2024–2025 window; success criterion is the same log-loss gate.
