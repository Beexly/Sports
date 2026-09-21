# [0257] Hyperparameter Optimization as a Service on INFN Cloud (arXiv:2301.05522v3)

**Citation:** Barbetti, M. & Anderlini, L. (2023). *Hyperparameter Optimization as a Service on INFN Cloud*. arXiv:2301.05522v3. URL: https://arxiv.org/abs/2301.05522
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 778 lines).
**Verdict:** REJECT — domain tooling paper (HEP hyperparameter-optimization-as-a-service). It wraps Optuna's Bayesian optimization in REST APIs for multi-site HPC coordination; it contains no novel optimization method, no sports data, and nothing GSE's model-tuning workflow lacks.

## 1. Research question
How can hyperparameter-optimization campaigns be coordinated across heterogeneous, opportunistic compute resources (private, INFN Cloud, CINECA, GCP, AWS) that cannot share a common database, using the thinnest possible integration layer — a minimal set of REST APIs?

## 2. Dataset / schema
No dataset: this is a systems paper. The demonstration application is tuning GAN parameterizations for Lamarr, the LHCb ultra-fast simulation framework — dozens of optimization studies with hundreds of trials each, run from 20+ concurrent diverse computing nodes (mostly CINECA Marconi 100).

## 3. Method / model
Hopaas (Hyperparameter OPtimization As A Service): three REST APIs — `ask` (POST /api/ask/token; body identifies the study, returns hyperparameters to test), `tell` (POST /api/tell/token; returns final trial score to the backend optimizer), `should_prune` (POST /api/should_prune/token; intermediate score + step → boolean continue/terminate). Optimization algorithms: Optuna's Bayesian methods (surrogate model + acquisition over the hyperparameter space); pruning via Optuna pruners. Reference implementation: FastAPI/Uvicorn behind NGINX (HTTPS), PostgreSQL shared state, docker-compose orchestration, on INFN Cloud (live at https://hopaas.cloud.infn.it); Python client wraps the REST APIs (Zenodo DOI 10.5281/zenodo.7528502); HTML/CSS/JS web UI with Chartist loss-evolution plots; OAuth2 auth via INFN GitLab.

## 4. Equations & assumptions
No equations. The Bayesian-optimization machinery is cited (Bergstra et al. 2011/2013; Golovin et al. 2017 Vizier; Akiba et al. 2019 Optuna) rather than derived. Assumptions: objective function is a noisy black box (SGD randomness), gradient unavailable/expensive; surrogate-model-driven search beats grid/random; workers need only HTTPS to the central server; pruning from intermediate scores saves compute.

## 5. Features / target
Input per trial: hyperparameter configuration (architecture/training choices of the GAN parameterizations). Target: objective-function score (e.g., GAN distributional fidelity metrics for LHCb simulation).

## 6. Validation design
Operational deployment report, not an experiment: Hopaas coordinated real LHCb Lamarr tuning campaigns across INFN/CERN/CINECA/commercial clouds and "outperformed the previous results," yielding GAN models that parameterize the LHCb high-level detector response. No controlled comparison of Hopaas vs. alternatives; no ablation of the service layer.

## 7. Numerical results / baselines
Qualitative-operational: dozens of studies, hundreds of trials each, 20+ concurrent heterogeneous nodes coordinated successfully; resulting GAN parameterizations beat the prior Lamarr tuning baseline (no numeric deltas reported). No new algorithm, so no algorithmic benchmarks. All claims are the authors' operational report.

## 8. Code / data availability
Partial: Python client reference implementation on Zenodo (DOI 10.5281/zenodo.7528502); live server instance at https://hopaas.cloud.infn.it; no dataset (N/A — systems paper).

## 9. Leakage & limitations
- The "research contribution" is an integration pattern (Optuna + FastAPI + Postgres + NGINX), not a method; anyone can replicate it from the cited components.
- No quantitative evidence that the service layer improves optimization outcomes vs. running Optuna locally or via existing services (Vizier, Ray Tune) — the demonstrated value is purely operational (cross-site coordination).
- The motivating constraint (opportunistic multi-provider HPC with no shared database) does not exist at GSE: GSE's compute is a single VM + occasional cloud, where Optuna's built-in storage backends suffice.
- Zero sports content; the application (LHCb GAN simulation tuning) has no analogue in GSE's modeling stack.

## 10. GSE overlap
None. The existing-research map has no HPO-infrastructure lane and does not need one from this paper: GSE's hyperparameter tuning, to the extent it exists, runs on a single machine where Optuna (the actual optimizer inside Hopaas) can be used directly. Adopting a hosted Italian-physics-cloud service would add a dependency while contributing nothing over `optuna` + a Postgres backend — which GSE already has access to via its Neon Postgres.

## 11. GSE implementation spec
None warranted. If GSE ever needs distributed HPO, the correct action is `pip install optuna` with a shared storage backend (Optuna supports PostgreSQL/RDB storage natively, multi-objective studies, and pruning) — Hopaas's REST wrapper solves a multi-institution HPC coordination problem GSE does not have.

## 12. Reproducible test
Not applicable — there is no GSE decision hinging on this paper. The only falsifiable claim (Hopaas coordinates cross-site studies) was demonstrated on INFN/CERN/CINECA infrastructure GSE cannot and need not replicate.

## 13. Acceptance / rejection gate
REJECTED outright. Reconsider only if GSE's compute ever spans mutually untrusted providers with no shared database — at which point re-read the paper's Table 1 API spec as a design reference, not as research to build on.

## 14. Improvement experiment
None for GSE. The paper's own stated future work (better web UI, multi-objective support) is product development on their service, not research.
