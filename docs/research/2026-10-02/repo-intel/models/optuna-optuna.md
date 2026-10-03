# optuna/optuna — Hyperparameter Optimization Framework (with Pruning)

**Repo:** https://github.com/optuna/optuna · ⭐ 14,873 (verified 2026-10-02)

## 1. Vision
The standard open-source HPO framework: define-by-run search spaces, state-of-the-art samplers (TPE Bayesian optimization, NSGA-II/III for multi-objective), and *pruners* that kill unpromising trials early (MedianPruner, Hyperband/ASHA-style SuccessiveHalving). Distributed, storage-backed, dashboard included.

## 2. The Ask
- An objective function (train → evaluate → return score); Optuna handles the rest.
- A pruner configured with warmup steps so early-stopping decisions aren't made on noise.
- For GSE: the objective must be *walk-forward* validation score, never in-sample fit.

## 3. Constraints
- **License:** MIT (verified). Pushed 2026-09-30, mature and maintained (19 open issues — remarkably low).
- HPO multiplies compute cost by the trial count; without pruning it's a budget fire.

## 4. GSE lens
- **Pruners ARE early stopping, formalized.** Optuna's MedianPruner/Hyperband stop trials that fall below the median of completed trials at the same step. GSE transfer, two levels: (1) hyperparameter search over model configs (learning rates, tree depths, regularization, signal-weight priors) should run under Optuna with ASHA pruning — this is the disciplined version of "try a bunch of configs"; (2) the *concept* generalizes to our training discipline: any experiment (new signal, new weighting) gets a pre-registered early-stop rule on walk-forward validation — kill it at the first checkpoint where it's below the incumbent, don't let sunk cost run it to completion. That's early stopping as organizational policy, not just a callback.
- **Multi-objective tuning maps to our real objective.** We don't just maximize accuracy — we need calibration (reliability) *and* sharpness *and* stability across seasons. Optuna's NSGA-II multi-objective mode can search the Pareto frontier of (walk-forward log-loss, calibration error, season-to-season variance) instead of collapsing to a single metric that Goodharts.
- **Define-by-run search spaces** beat static grids for our use: conditional hyperparameters (e.g., "if using signal X, tune its decay half-life") are expressible, which static grid search can't do.

## 5. Verdict
**ADOPT** — the HPO + pruning standard; run all model-config search under it with walk-forward objectives and multi-objective calibration targets (MIT).

## 6. The 4 tricks
- Wiki: https://codewiki.google/optuna/optuna
- Diagram: https://gitdiagram.com/optuna/optuna
- Stars: https://star-history.com/#optuna/optuna (14,873 ⭐)
- Code: https://github.dev/optuna/optuna
