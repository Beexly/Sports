# google/vizier — Blackbox Optimization Service (Open-Sourced)

**Repo:** https://github.com/google/vizier · ⭐ 1,678 (verified 2026-10-02)

## 1. Vision
The open-source Python interface to the ideas behind Google's internal Vizier service — the system that tuned hyperparameters across Google for years. Batched Bayesian optimization, evolutionary algorithms, and multi-objective blackbox optimization with a service-oriented design (study → suggest → evaluate loop, gRPC API).

## 2. The Ask
- More infrastructure than Optuna: the service model assumes a persistent optimization server.
- Best suited to expensive blackbox functions where each evaluation costs real money/time (their design center).

## 3. Constraints
- **License:** Apache-2.0 (verified). Pushed 2026-09-29, maintained by Google (52 open issues).
- Heavier operational footprint than Optuna for the same core algorithms; the marginal value over Optuna for GSE's scale is the *batched* suggestion API and Google's published algorithm research.

## 4. GSE lens
- **The idea to steal is batched, cost-aware optimization.** Vizier's design center — each evaluation is expensive, so suggest trials in batches and model the cost — matches GSE's reality: a full walk-forward retrain is our expensive evaluation. The transferable practice: when tuning, run trials in *batches* sized to available compute, and keep a persistent study database so tuning knowledge accumulates across sessions instead of restarting from scratch each time someone tunes.
- **Don't adopt the service; adopt the study log.** The durable artifact is the study history (config → walk-forward score → calibration metrics). Whether it lives in Optuna's storage or a Vizier-style service, GSE needs a permanent, queryable record of every hyperparameter experiment — this is the "audit receipts" standard applied to tuning.
- Prefer Optuna for execution; read Vizier's docs/papers for the batched blackbox methodology.

## 5. Verdict
**REBUILD** — reimplement the batched, persistent-study pattern on top of Optuna; don't take on the service infra (Apache-2.0).

## 6. The 4 tricks
- Wiki: https://codewiki.google/google/vizier
- Diagram: https://gitdiagram.com/google/vizier
- Stars: https://star-history.com/#google/vizier (1,678 ⭐)
- Code: https://github.dev/google/vizier
