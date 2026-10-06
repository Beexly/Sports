# [2008] ConBatch-BAL: Batch Bayesian Active Learning under Budget Constraints (arXiv:2507.04929)

**Citation:** Morato, P. G., Andriotis, C. P., Khademi, S. (2025). *ConBatch-BAL: Batch Bayesian Active Learning under Budget Constraints*. Delft University of Technology. arXiv:2507.04929. URL: https://arxiv.org/abs/2507.04929
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** Two concrete budget-constrained batch acquisition heuristics (dynamic thresholding + greedy knapsack) with real-world experiments showing 20–80% fewer AL iterations than random under cost constraints; directly operationalizes ledger 2007's cost-aware theory into a weekly charting-budget rule, but the MI acquisition is Batch-BALD-expensive and their geospatial cost model must be replaced with GSE's dollar-cost model.

## 1. Research question
Can Bayesian active learning be made usable when annotation costs vary per sample and each batch has a hard budget cap — i.e., can we acquire batches that maximize information subject to c(x₁,…,xₙ) ≤ c_max, n ≤ n_max, including order-dependent (sequential) cost models?

## 2. Dataset / schema
Two new real-world datasets released (CC BY 4.0): **build6k** (~6,000 georeferenced Rotterdam building aerial images, binary energy-efficiency classes {A–E efficient, F–G inefficient}) and **nieman17k** (~17,000 building aerial images, 7 typology classes), each with predefined train/test/pool splits and DINOv2 (ViT-S/14 distilled) feature vectors; plus **mnist6k** (6,000 MNIST digits randomly geolocated). Images sourced via PDOK web service with municipality of Rotterdam open data.

## 3. Method / model
MC-dropout BNN classifier (2 hidden layers) on frozen DINOv2 embeddings; only the classifier is retrained each AL iteration (fine-tuning DINOv2's last two layers gained only 1–2%). Acquisition function: greedy Batch-BALD mutual information 𝕀(y₁:ₙ; ω | x₁:ₙ, D_train) (joint predictive entropy − expected conditional entropy).
Two budget heuristics:
- **Dynamic thresholding ConBatch-BAL** (Alg. 1): at batch step i, only candidates with c(x) ≤ c_th,i = c_max,i/(n_max−(i−1)) are considered; c_th adapts as remaining budget shrinks. Redistributes the budget evenly across remaining batch slots.
- **Greedy ConBatch-BAL** (Alg. 2): at each step pick the top-ranked candidate among those with c(x) ≤ remaining c_max — no per-step threshold, so fewer, costlier, more informative items can be taken.
Cost models (three geospatial configs): `distance` (travel distance from first selected point per batch), `distance_return` (includes return trip), `area_cost` (non-sequential; per-area costs 1–100 units, crowded Rotterdam areas pricier). Paper notes the knapsack constraint is NP-hard and breaks Batch-BALD's submodularity guarantee, hence heuristics. Complexity dominated by MI: O(|D_pool|·T·n_sim·K·n_max) with sampled joint entropy. Code as supplementary material; 6–12 h per experiment on a Xeon/4-CPU/10GB node.

## 4. Equations & assumptions
- Constrained batch objective: argmax_{x₁:ₙ⊆D_pool} a({x₁,…,xₙ}, p(ω|D_train)) s.t. c(x₁,…,xₙ) ≤ c_max, n ≤ n_max (Eq. 2).
- Batch-BALD acquisition: a_BatchBALD = 𝕀(y₁:ₙ; ω | x₁:ₙ, D_train) = ℍ(y₁:ₙ|x₁:ₙ,D_train) − 𝔼_{p(ω|D_train)}[ℍ(y₁:ₙ|x₁:ₙ,ω,D_train)] (Eq. 4).
- Dynamic threshold: c_th,i = c_max,i/(n_max − (i−1)), c_max,i = c_max,i−1 − c(x*_{i−1}).
- In the infinite-budget limit, both strategies ≡ greedy Batch-BALD.
- Assumptions: per-sample costs known before selection (c(x) computable); order-dependent costs allowed; pool-based; MC-dropout gives usable epistemic uncertainty.

## 5. Features / target
Features: DINOv2 embeddings of aerial images. Targets: energy-efficiency class / building typology / MNIST digit (classification).

## 6. Validation design
Benchmark vs. random selection baseline across datasets × cost configs × budget constraints; 5 random seeds, 800 AL iterations each; metric = number of AL iterations (equivalently, completed "tours") to reach target test accuracy; curves also shown as functions of acquired samples and cost (App. C.3); batch-size robustness (App. C.5).

## 7. Numerical results / baselines
- `distance` config: ConBatch-BAL strategies reach accuracy targets with 20–43% fewer AL iterations than random on build6k and 50–80% fewer on nieman17k; under the 100-m batch constraint the random baseline fails to reach 71% accuracy on nieman17k within 800 iterations; on mnist6k both strategies hit 97% in <400 iterations vs. >600 for random under 100-m budget.
- Striking: ConBatch-BAL under the 2-km constraint outperforms the *unconstrained* random baseline on all datasets (average unconstrained batch travel ≈ 25 km).
- `area_cost` config: greedy beats dynamic thresholding on build6k/nieman17k (thresholding starves the expensive-but-informative area: informative buildings concentrate in the priciest area); opposite on mnist6k (diversity across areas lets thresholding win).
- `distance_return` ≈ `distance` (minor variations). Baseline: random selection; unconstrained greedy Batch-BALD also reported (beats random, consistent with literature).

## 8. Code / data availability
Code as supplementary material on the submission platform; datasets (build6k, nieman17k) + result JSONs via a public link; hyperparameter configs and seeds included.

## 9. Leakage & limitations
- Acknowledged: MC-dropout variational approximation introduces noise into uncertainty estimates (suggests SG-MCMC); no DINOv2 fine-tuning; aerial-only features.
- Only baseline is random selection — no comparison against cost-aware competitors (e.g., multi-fidelity BAL [28], value-per-cost greedy from ledger 2007) and no cost-blind Batch-BALD *under the same dollar budget*, so the gain is "vs. random under constraints," not "vs. best cost-aware method."
- Dynamic thresholding has a documented failure mode: when informative samples concentrate in high-cost regions, the per-step threshold locks them out for the whole batch (Fig. 7).
- Geospatial cost models are a proxy; per-sample costs assumed known and deterministic. No calibration/error analysis of the BNN.

## 10. GSE overlap
New: the first paper in this wave with an implemented dollar-style budget constraint on batch acquisition — ledgers 2002–2006 assume uniform/count budgets and ledger 2007 is pure theory. Directly operationalizes 2007's Δ/c rule into a deployable weekly procedure, with the dynamic-thresholding failure mode (expensive-but-informative items starved) being exactly the failure to design against in GSE's charting budget.

## 11. GSE implementation spec
- Replace their geospatial cost model with GSE's dollar cost model: c(x) = charting cost per game (nflverse-only ≈ $0, FTN charting per-game price, manual all-22 labor $/game); batch = one week's charting queue with a fixed dollar cap c_max and slot cap n_max (analyst hours).
- Weekly rule (dynamic thresholding adapted): at queue slot i, admit only games with c(game) ≤ remaining_budget/(slots_left); score admissible games by existing acquisition (BADGE/BatchBALD/ACS-FW from ledgers 2002–2004).
- Greedy variant as the challenger: admit any game within remaining budget, top acquisition score first — expect it to win in weeks where the most informative games are the expensive all-22 ones (mirrors their area_cost result).
- Sequential-cost analog: "distance" → context-switch cost — charting a second game from the same team/week is cheaper (shared film context); model c as order-dependent and let greedy exploit it.
- Effort: ~3 days (cost model + two queue rules on top of ledgers 2002–2004 scorers).

## 12. Reproducible test
Simulate 8 weeks of 2024 season: each week, pool = that week's games, c_max = fixed weekly charting dollars, acquisition scores from the BADGE regression adaptation (ledger 2002). Compare dynamic-thresholding vs. greedy ConBatch-BAL vs. cost-blind top-k vs. random on end-of-season held-out log-loss per dollar spent. Baselines to beat: random (their baseline) and cost-blind top-k (the missing control in their paper).

## 13. Acceptance / rejection gate
ADOPT the better of the two rules iff it beats cost-blind top-k at equal weekly dollar budget by ≥ 0.005 held-out log-loss on the 2024 season simulation AND does not collapse in any single week (no week with >2× the average per-dollar regret — guards against the threshold-starvation failure mode of Fig. 7). REJECT if neither rule beats cost-blind top-k (their gains were vs. random only), or if the greedy variant systematically burns the budget on ≤3 games/week with worse per-dollar log-loss than thresholding.

## 14. Improvement experiment
Hybrid rule with a learned "expensiveness prior": predict per-game informativeness-per-dollar from preseason features (market handle, total, spread movement) and set the threshold schedule adaptively — loose (greedy-like) when predicted Δ/c of expensive games is high, tight (threshold-like) otherwise. Test whether the hybrid beats both fixed rules on log-loss-per-dollar — hypothesis: the paper's config-dependent winner (greedy on area_cost, thresholding on mnist6k) becomes a learnable function of the week's cost-informativeness correlation.
