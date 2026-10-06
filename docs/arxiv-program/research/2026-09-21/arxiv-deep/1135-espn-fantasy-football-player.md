# [1135] Large Scale Diverse Combinatorial Optimization: ESPN Fantasy Football Player Trades (arXiv:2111.02859)

**Citation:** Baughman, A., et al. (IBM/Disney/ESPN) (2022). *Large Scale Diverse Combinatorial Optimization: ESPN Fantasy Football Player Trades*. arXiv:2111.02859v3. URL: https://arxiv.org/abs/2111.02859
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections through deployment §7; refs from §8 onward).
**Verdict:** ADAPT — strip out the quantum theater (XGB 95.70% beats every quantum model; the simulators ran on classical hardware) and keep the three genuinely reusable pieces: boom/bust ratios as player descriptors, the value-vs-cost 0-1 knapsack for package construction, and positional-importance opportunity costing — all directly applicable to GSE's DFS lineup optimizer.

## 1. Research question
Can a diverse ensemble of computing paradigms (SME rules, classical ML, quantum ML simulators) generate high-volume, unique, fair fantasy-football trade packages via combinatorial optimization, at ESPN scale (10M users, 2.5M proposals/day)?

## 2. Dataset / schema
- 4,733 exemplars extracted from ESPN-rated trades (FEAT sessions); 146 predictors per trade (punditry sentiment, player state, roster-context descriptors, performance predictors: avg low/high score, projections, boom/bust percentages, ownership/start percentages).
- 24 ESPN/IBM experts; 10 Football Error Analysis Tool (FEAT) sessions, ~500 ratings each; ratings 1–10 from both sides' perspectives, averaged; ≥4 = good trade. Train 3,786 / test 946.
- Deployment: 2020 season — 2M trade proposals, 240M insights, 55M user interactions; 2021 — 2.5M trades/day. 525 K8s pods (2020) → 600 pods (2021) on OpenShift.
- Proprietary ESPN data; Qiskit quantum *simulators* (classical emulation) used throughout.

## 3. Method / model
- Player valuation: three parallel pipelines — (a) SME rules (tiered expert features, boom/bust ratios, positional decay, injury/COVID/IR penalties, momentum weighting by week); (b) classical XGB classifier on 146 predictors (feature importance → player valuation); (c) quantum: QSVC-PI, QSVC-ALE, VQC-PI, HQNN-PI on 14-feature tiers (qubit-limited), feature importance via permutation importance / ALE, accuracy-weighted ensemble.
- Player cost (opportunity cost): average of positional importance, projection ratio vs rostered players at the position, projection ratio vs all rostered players, positional rank; positional decay (e.g., 4 rostered QBs with 1 starter slot → value reduced by 0.75).
- Team pairing: cosine *dissimilarity* of concatenated importance+strength vectors; most dissimilar (90°) pairs trade first.
- Trade construction: 0-1 knapsack — maximize Σ norm_pval·x s.t. Σ norm_pcost·x ≤ α·C_opp^max (α = user risk parameter × opponent's max release cost); run twice swapping sides; personalization weights (watchlist boost w1, trade-away cost reduction w2, untradable cost inflation w3, position booster w4).
- Filtering: parity, pain, impact metrics + 15 rule-based filters + 4 learned thresholds + 11-layer DNN upside predictor.

## 4. Equations & assumptions
- Boom ratio: fraction of games with scoring above the 85th percentile of the position (Eq. 2). Bust ratio: fraction below the 15th percentile (Eq. 3).
- Season-long projection valuation PV = CDF_normal(ESPN per-position mean µ, SD σ; player projection x) (Eq. 4).
- SME decay: v = α1·tier1 + α2·tier2 + α3·tier3 + e^(−weeks/D)·tier4 (Eq. 5, brand/ADP decay).
- Classical valuation: v = norm_SME(p_penalty · Σ w·features) (Eq. 8).
- Tradability cost pre_pc = mean(position importance, projection ratio at position, projection ratio overall, positional rank) (Eq. 17), normalized to [0,1].
- Team dissimilarity: θ = cos⁻¹(t1·t2 / ‖t1‖‖t2‖) (Eq. 18); sorted descending from 90°.
- Knapsack: maximize Σ norm_pval·x, x ∈ {0,1}; Σ norm_pcost·x ≤ α·C_opp^max (Eqs. 19–22).
- Parity/pain/impact metrics (Eqs. 23–25). Assumptions: expert ratings are ground truth for trade quality; quantum feature importance adds diversity beyond classical (claimed, weakly evidenced).

## 5. Features / target
Inputs: 146 trade predictors in 4 groups (punditry sentiment, player state, roster context, performance). Targets: (a) binary good/bad trade (rating ≥4); (b) per-player valuation; (c) trade package (knapsack output).

## 6. Validation design
- Model: 3,786 train / 946 test; accuracy + diversity metrics (quantum diversity qd = qa ⊗ qrank_diff ⊗ qvar).
- Human: 10 FEAT sessions, blinded compute type (A/B/C), kappa 70% inter-rater agreement.
- Deployment A/B implied by 2020→2021 iteration (76.9% → 97.3% high-quality trades).

## 7. Numerical results / baselines
- Model accuracy: XGB 95.70%; Hybrid QNN CNN-PI 94.30%; QSVM-PI 85.50%; QSVM-ALE 85.50%; VQC-PI 57.3%. (Classical XGB wins outright — the quantum contribution is diversity, not accuracy.)
- Diversity: Hybrid QNN had the highest % rank difference (79.96%) vs classical/SME.
- Trade quality: 2020 deployment 76.9% high-quality; 2021 (all three paradigms + filters) 97.3%.
- Per-paradigm 2021 accuracy: quantum-classical 98.2%, classical 96.9%; mean ratings classical 6.24, quantum 6.22, SME 6.11.
- Scale: 239M proposals/55M interactions (2020); 2.5M trades/day (2021); 200 req/s at <1s latency.

## 8. Code / data availability
None stated (IBM/ESPN proprietary; Qiskit simulators noted at qiskit.org). No public repo.

## 9. Leakage & limitations
- Quantum models ran on classical simulators with 14-feature tiers (21 features took 22 hrs/tier) — there is no quantum advantage demonstrated; the "quantum diversity" framing is marketing over a classical ensemble with extra feature-importance views.
- FEAT ratings are expert opinions, not outcomes — "97.3% high-quality" means experts liked the trades, not that they won leagues.
- 146 predictors on 4,733 exemplars with XGB at 95.7% accuracy smells of overfitting to rater idiosyncrasies; no out-of-time validation reported.
- Blinding compute type as A/B/C is good, but raters knew they were rating machine trades (demand effects).
- Personalization weights (w1–w4) "experimentally determined" — values not reported.

## 10. GSE overlap
Strong extension. The existing-research map shows deep DFS practice work (2026-09-13-dfs, 2026-09-19-dk-week2 optimizer pool JSON) but the optimizer is projection-maximizing; nothing in-repo uses boom/bust ratios, opportunity-cost pricing, or knapsack-with-cost-constraint formulation. Repo greps for "knapsack" hit only assignment files. The 146-predictor valuation pipeline overlaps GSE's feature engineering conceptually but GSE has no trade/package construction layer.

## 11. GSE implementation spec
- Add boom ratio (P(weekly score > 85th pct of position)) and bust ratio (P(< 15th pct)) as standard player descriptors in GSE's DFS feature set, computed from nflverse 3-season rolling game logs.
- Reformulate the DK optimizer: 0-1 knapsack maximizing Σ (projection·x) subject to Σ (salary·x) ≤ cap AND a bust-risk constraint Σ (bust_ratio·x) ≤ τ — the paper's value-vs-cost knapsack with GSE's quantities.
- Positional-importance costing for GPP vs cash: weight ceiling (boom) vs floor (1−bust) in the objective per contest type.
- Effort: 1 week (boom/bust tables 1–2 days; optimizer constraint extension 3 days).

## 12. Reproducible test
Dataset: 2025 DK main slates (salaries, nflverse projections, actuals). Metric: realized lineup score distribution of boom/bust-constrained optimizer vs current projection-max optimizer, 100 simulated entries per slate. Baselines to beat: current optimizer mean and, critically, top-1% tail rate (GPP relevance). Gate: bust-constrained lineups must match mean score within 2% AND improve top-1% hit rate by ≥15% relative on a 6-week holdout.

## 13. Acceptance / rejection gate
ADAPT the boom/bust descriptors + cost-constrained knapsack if: the §12 gate passes (mean within 2%, tail rate +15% relative). REJECT the quantum ensemble and the expert-rating training paradigm — GSE optimizes against realized scores, not opinions.

## 14. Improvement experiment
Learn the knapsack's risk parameter α per contest type: treat α (the paper's user-risk scalar on the cost constraint) as a learned function of contest payout structure (top-heavy GPP → higher α, more boom exposure; cash → lower α). Backtest α(contest) vs fixed α; hypothesis: contest-adaptive risk beats any single α on realized ROI.
