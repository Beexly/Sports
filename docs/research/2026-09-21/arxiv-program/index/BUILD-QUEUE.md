# Build Queue — top 20 ADOPT builds

**Date:** 2026-09-22. Ranked from the 48 ADOPT verdicts in `corpus-index.jsonl`.
**Framing (Garrett's law):** every build is an engine capability or proprietary output (GSE score components,
situational intelligence, calibration honesty) — never "beat the close." Market work is BASELINE, not the goal.
**Acceptance:** each build ships only if its numeric gate (from the paper's ledger) clears on GSE data.

**Owners:** `Hermes` = phone builder (app/web code, data harness, SQL) · `Mimo` = Windows calibration agent ·
`Motif-lab` = VM execution (experiments, backtests, model training).

---

### INVENT — the machine invents our stats

**1. Neural-head symbolic distillation** — `2602.21307v2` (SymTorch)
*What:* wrap the engine's neural win-probability head with torch-symbolic + PySR; distill it into a
≤10-term closed-form equation.
*Why:* the flagship of Garrett's "machine-invented stats" — a human-readable formula the engine discovered,
publishable as a proprietary GSE metric.
*Owner:* Motif-lab. *Buckets:* INVENT/MODEL.
*Gate:* distilled equation uses ≤10 terms AND matches the neural head within 0.01 MAE on held-out 2025
Weeks 1–4 AND beats the linear baseline by ≥20% MAE.

**2. PySR equation discovery on nflverse** — `2305.01582v3`
*What:* run symbolic regression over nflverse play-by-play to discover closed-form football metrics.
*Why:* systematic machine-invented-stat pipeline; first target is a passer metric that beats passer rating/QBR.
*Owner:* Motif-lab. *Buckets:* INVENT/MODEL.
*Gate:* discovered equation beats the better of passer rating / QBR by ≥0.05 Pearson r on held-out
2024–2025 AND has ≤15 tree nodes (interpretable enough to publish).

**3. "SportsAlpha" signal miner** — `1601.00991v1` (101 Formulaic Alphas)
*What:* grammar-based miner that generates and tests thousands of formulaic signals ("factor zoo").
*Why:* automated signal discovery at machine scale — more signals than any human team could hand-build.
*Owner:* Motif-lab. *Buckets:* INVENT/INGEST.
*Gate:* mined factor zoo achieves mean out-of-sample |IC| ≥ 2× the hand-built baseline IC on the
2023–2025 test block AND mean pairwise |corr| ≤ 0.25.

**4. Engine residual mining** — `2608.05207` (corrective feature discovery)
*What:* freeze the pick engine, mine its residuals (actual minus predicted) for corrective features.
*Why:* the engine finds its own blind spots and invents the features that fix them — self-growing.
*Owner:* Motif-lab. *Buckets:* INVENT/MODEL.
*Gate:* ≥0.003 held-out NFL log-loss improvement on 2025 games vs both the RAW engine and the
covariate-only corrector, with no shipped corrector worse than "do nothing" on validation.

**5. MinervaScore signal validation** — `2608.23808v2`
*What:* statistical "seal of approval" harness that separates real signals from backtest luck.
*Why:* every invented metric/signal must pass Minerva before it touches the GSE score — the quality gate
for the whole INVENT pipeline.
*Owner:* Motif-lab. *Buckets:* INVENT/MONITOR.
*Gate:* on permuted-label nulls, MinervaScore achieves AUROC ≥ 0.95 separating null from
historically-profitable signals AND the seal's pass rate on null signals is ≤ 5%.

---

### CALIBRATE — uncertainty honesty

**6. CRPS + log-score doctrine** — `2504.01781` (Proper Scoring Rules)
*What:* adopt CRPS as the primary scoring rule for spreads/totals (closed form via Φ/φ), alongside log score.
*Why:* Brier-only evaluation can't score full margin distributions; CRPS is the correct ruler for the
GSE score's probabilistic outputs.
*Owner:* Mimo. *Buckets:* CALIBRATE.
*Gate:* model rankings by CRPS are stable across 2023/2024/2025 (Spearman ≥ 0.8 year-to-year) and
CRPS-selected models also win on realized betting utility.

**7. Uncertainty-under-shift harness** — `1906.02530`
*What:* evaluation harness that stress-tests every calibrator (Platt, isotonic, temperature, ensembles)
under temporal distribution shift.
*Why:* calibrators that look good in-sample collapse in-season; this harness proves which ones survive —
directly protects the calibration the whole company stands on.
*Owner:* Mimo. *Buckets:* CALIBRATE/MONITOR.
*Gate:* harness reproduces the paper's signature pattern on GSE data (post-hoc calibrators lose their
i.i.d. edge under temporal shift; ensembles most robust).

**8. Conformal selective prediction (no-bet gate)** — `2603.24704`
*What:* conformal *selection* layer — the engine publishes a pick only when the risk-controlled gate passes.
*Why:* honest abstention with guaranteed risk control; extends the cqr.ts repair into a full publish/no-publish
system.
*Owner:* Mimo. *Buckets:* DECIDE/CALIBRATE/MONITOR.
*Gate:* walk-forward realized average loss stays within ±0.03 units of nominal across all four test seasons
AND posts ≥ 70% as many picks as the baseline gate at matched realized loss.

**9. Conformalized selective regression** — `2402.16300`
*What:* 90%-coverage intervals with a learned reject option for props/margins.
*Why:* tighter honest intervals on the picks we publish; mathematically grounded "pass" decisions.
*Owner:* Mimo. *Buckets:* DECIDE/CALIBRATE.
*Gate:* on held-out weeks 15–18, CSR's 90%-coverage MAE is ≥ 5% lower than the conditional-variance
reject baseline at the same coverage, with empirical coverage holding.

**10. In-play calibration evaluation** — `2010.00781v1`
*What:* end-to-end pipeline for evaluating real-time probabilistic forecasts as games unfold.
*Why:* the corpus is pre-game heavy; this is the foundation of live GSE products and live calibration alarms.
*Owner:* Mimo. *Buckets:* CALIBRATE/MONITOR.
*Gate:* on 2024–2025 pooled games the pipeline runs end-to-end and the functional test significantly
separates GSE live forecasts from coin-flip/HomeWP baselines.

**11. Weather-aware conformal coverage** — `2606.19642`
*What:* rigorous uncertainty quantification for the weather inputs (temperature, wind per stadium) feeding the engine.
*Why:* weather is a SITUATIONAL signal we already ingest — this makes its uncertainty honest instead of silent.
*Owner:* Mimo. *Buckets:* CALIBRATE/SITUATIONAL.
*Gate:* within 30 days of simulated burn-in, empirical 90% coverage lands within ±0.02 of nominal for
temperature and wind across ≥ 25/30 stadiums, with CRPS no worse than raw.

---

### DECIDE — sizing, timing, selection

**12. Offline RL for the bet slate** — `2006.04779v2` (Conservative Q-Learning)
*What:* train a CQL policy on logged (slate context, action, reward) data to select and size the daily slate.
*Why:* sequential decision-making the Kelly formula can't do — slate-aware, drawdown-aware, learned from
the engine's own history.
*Owner:* Motif-lab. *Buckets:* DECIDE/MODEL.
*Gate:* on 2024 holdout the CQL policy beats the fractional-Kelly baseline by ≥2pp ROI with max drawdown
no worse than baseline (within 0.5u), with the empirical lower-bound diagnostic holding.

**13. Bet timing as optimal stopping** — `2105.08877v2`
*What:* C51 distributional-RL policy for WHEN to place each bet (open vs later, line-movement velocity).
*Why:* timing is a second, uncorrelated edge on top of selection — same pick, better price.
*Owner:* Motif-lab (Hermes for the serving path). *Buckets:* DECIDE.
*Gate:* on the strictly-future test window the stopping policy beats the best timing benchmark by ≥1.5pp
of CLV per bet with realized ROI no worse than the "bet at open" baseline.

---

### MODEL — prediction machinery

**14. DID + synthetic-control causal toolkit** — `2411.15075v1`
*What:* install difference-in-differences + synthetic control as the standard quasi-experimental toolkit
(kickoff-rule replication as the template).
*Why:* honest causal answers to "what did the injury / coaching change / rule change actually cost" —
the core of situational intelligence.
*Owner:* Motif-lab. *Buckets:* MODEL/SITUATIONAL.
*Gate:* the kickoff replication passes its placebo gates; method adopted as the standard toolkit.

**15. Causal SOP (estimand-first protocol)** — `2505.11841v2`
*What:* every causal question starts with a written estimand, balance checks, and bootstrap SEs.
*Why:* process moat — stops the engine from publishing confounded "insights."
*Owner:* Motif-lab. *Buckets:* MODEL.
*Gate:* the QB-injury replication passes its balance gate (all SMDs < 10%) with ATT stable across two
independent season-blocks.

**16. Hybrid season simulation** — `2304.09918v2`
*What:* per-predictor simulation windows + incentive modifiers for season-long forecasting.
*Why:* powers win totals, playoff brackets, and futures — with the methodological template the nlp
ADOPT (`2608.03416`) extends.
*Owner:* Motif-lab (Hermes for product surfacing). *Buckets:* MODEL.
*Gate:* pre-registered: swept window improves pooled held-out log-loss by ≥ 0.003 over the fixed window
on 2019–2024, with gains in ≥ 4 of 6 seasons.

**17. Chronos/Moirai TSFM backbone** — `2503.12107v1` (ChronosX)
*What:* fine-tuned time-series foundation model with exogenous-variable adapters for team/player trajectories.
*Why:* foundation-model leverage on 32-teams × weekly panel data — the modern baseline for all
trajectory forecasting in the engine.
*Owner:* Motif-lab. *Buckets:* MODEL.
*Gate:* adapters beat the covariate-free fine-tuned backbone by ≥0.01 WQL on 2022–2024 AND the shuffled-
covariate ablation shows no gain (proving real signal, not capacity).

**18. flexBART tabular learner** — `2211.04459v3`
*What:* benchmark flexBART (Bayesian trees, native categorical handling) as a drop-in replacement for
XGBoost on the engine's tabular game data.
*Why:* 5–30% benchmark gains on categorical-heavy data in the paper; plus honest posterior intervals.
*Owner:* Motif-lab. *Buckets:* MODEL/CALIBRATE.
*Gate:* out-of-sample RMSE on 2024 improves ≥3% over one-hot XGBoost AND 80%/90% posterior intervals
achieve nominal coverage.

---

### INFRA / INGEST — the engine's plumbing

**19. SportSQL NL-query layer** — `2508.17157v1`
*What:* natural-language-to-SQL over GSE's Neon Postgres (read-only role, statement timeout, row limits).
*Why:* every analyst question answerable in seconds — research velocity for the whole operation.
*Owner:* Hermes. *Buckets:* INGEST/INFRA.
*Gate:* ≥75% overall correctness on the NFL benchmark with zero write queries escaping the read-only
guard (deterministic SELECT-only allowlist check).

**20. ATB adaptive retry for the data-fetch harness** — `2510.04516v3`
*What:* client-side adaptive token-bucket retry/backoff policy for all API ingestion.
*Why:* the "ingest every signal on earth" engine lives or dies on fetch reliability; fewer 429s, faster completion.
*Owner:* Hermes. *Buckets:* INFRA/INGEST.
*Gate:* 429s drop ≥50% vs the fixed-sleep baseline with completion-time increase ≤30% over the 1-week test.

---

## How to work the queue

1. Owner picks up the top unbuilt item in their lane; the ledger (path in `corpus-index.jsonl`) is the spec.
2. Build against the numeric gate as the acceptance test — gate fails, build doesn't ship.
3. Record the outcome (shipped / failed gate / blocked) against the paper's `arxiv_id` so the index stays
   the source of truth for what's actually in the engine.
4. Remaining 28 ADOPTs are ranked next; query them with:
   `jq -r 'select(.verdict=="ADOPT") | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl`
