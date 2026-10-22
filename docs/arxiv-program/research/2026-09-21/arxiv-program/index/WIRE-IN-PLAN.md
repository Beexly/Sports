# Wire-In Plan — Literature Implementation and Production Reachability Ledger

**Date:** 2026-09-22 (Audited & Reconciled 2026-10-21 per PR-4 / GAP-17).  
**Measured Code Coverage:** **291 / 1,442 unique arXiv IDs** have an implementing module in `packages/prediction-engine/src`.  
**Production Reachability:** **498 / 1,065 non-test modules** are reachable from production entries; **44 arXiv-derived modules** are reachable; **254 arXiv-derived modules** remain offline/unreachable inventory.

> [!IMPORTANT]
> **Definition of "Wired":** A paper or capability is defined as **WIRED** if and only if its implementing module is **imported and executed by an active production path** (e.g. `scoring.ts`, `edge-engine.ts`, `process-sport.ts`, `settlement.ts`). Being indexed in `corpus-index.jsonl` or assigned to a capability bucket is an **ingestion/cataloging status**, not code wiring.

## 1. Measured Reachability Census (Scripted via AST Graph Walk)

Run CI verification at any time:
```bash
node scripts/ops/census-engine-reachability.mjs
```

Census breakdown from `reconciliation/reachability.json` and `scripts/ops/census-engine-reachability.mjs`:
- Total non-test modules in `packages/prediction-engine/src`: **1,065**
- Reachable from production entry points: **498**
- Offline / unreachable modules: **567** (of which 437 have passing sibling unit tests)
- arXiv-derived modules reachable: **44**
- arXiv-derived modules unreachable: **254**

## 2. Triage Table: Unbuilt ADOPT Papers and Numeric Acceptance Gates

The 33 unbuilt ADOPT papers triaged with their required acceptance gates from the research ledgers:

| arXiv ID | Title / Mechanism | Capability Bucket | Numeric Acceptance Gate |
|---|---|---|---|
| `2602.21307v2` | SymTorch: Neural-Head Symbolic Distillation | `INVENT` / `MODEL` | Distilled equation $\le 10$ terms, matches neural head within $0.01$ MAE on held-out 2025 W1–W4, beats linear baseline by $\ge 20\%$ MAE. |
| `2305.01582v3` | PySR Equation Discovery on nflverse | `INVENT` / `MODEL` | Discovered closed-form formula beats passer rating/QBR by $\ge 0.05$ Pearson $r$ on held-out 2024–2025 with $\le 15$ tree nodes. |
| `1601.00991v1` | SportsAlpha 101 Formulaic Signal Miner | `INVENT` / `INGEST` | Factor zoo achieves mean out-of-sample $|\text{IC}| \ge 2\times$ hand-built baseline on 2023–2025 with pairwise $|\text{corr}| \le 0.25$. |
| `2608.05207` | Engine Residual Mining for Corrective Signals | `INVENT` / `MODEL` | $\ge 0.003$ held-out NFL log-loss improvement on 2025 games vs raw engine and covariate-only corrector. |
| `2608.23808v2` | MinervaScore Signal Validation Seal | `INVENT` / `MONITOR` | AUROC $\ge 0.95$ separating true signals from permuted-label nulls. |
| `2503.12107v1` | Chronos/Moirai TSFM Time-Series Backbone | `MODEL` | Beats baseline ARIMA/GARCH on volatility forecast by $\ge 8\%$ RMSE on 2023–2025 spreads. |
| `2211.04459v3` | flexBART: Bayesian Regression Trees with Priors | `MODEL` | Misclassification rate $\le 9\%$ on high-cardinality categorical splits (vs $18.4\%$ one-hot). |
| `2504.01781` | CRPS + Log-Score Scoring Doctrine | `CALIBRATE` | Strictly proper scoring calibration with CRPS $\le 7.099$ on expanding-window walk-forward. |
| `2006.04779v2` | Offline Distributional RL Slate Policy (CQL) | `DECIDE` | Conservative Q-Learning sizing out-returns flat Kelly by $\ge 1.5\%$ ROI at CVaR $95\%$ bound. |
| `2105.08877v2` | Bet Timing as Optimal Stopping (C51) | `DECIDE` | Expected CLV gain $\ge 0.8\%$ compared to closing-line execution across 500 wagers. |
| `2402.16300` | Conformal Selective Regression (No-Bet Gate) | `DECIDE` | Coverage guarantee $\ge 90\%$ on selected bets with abstention rate $\le 35\%$. |
| `0001-profit` | Bookmaker Profit-Bias Identity | `MARKET` | Exact hold / shading / covariance decomposition $\Pi = \text{Hold} + \mathbf{s}^\top \mathbf{p} + \text{Cov}(\mathbf{y}, \mathbf{q})$ verified on multi-book ledger. |
| `0065-sportstraj` | SportsTraj Trajectory Generation | `TRACKING` | minADE20 improvement $\ge 11\%$ on NFL tracking dataset. |
| `0122-atb` | Adaptive Token Bucket (ATB) Rate Limiter | `INGEST` | Zero 429 throttling errors on high-frequency Odds API ingestion. |
| `0126-sportsql` | SportSQL Natural Language Schema Engine | `INGEST` | $100\%$ deterministic query validation over Neon Postgres nflverse tables. |
| `0142-combine` | Counterfactual Combine: Doubly-Robust Kicker Model | `RATINGS` | Doubly-robust causal player evaluation with closed-form conformal prediction intervals. |
| `0171-kelly` | Robust Fractional Kelly Under Estimation Uncertainty | `DECIDE` | Lower drawdown by $\ge 25\%$ vs full Kelly on synthetic parameter drift simulations. |
| `0174-decorr` | Market Decorrelation Training Objective | `MODEL` | Loss $\mathcal{L} = \text{MSE} + \lambda \text{Corr}(y, p_{\text{market}})$ producing positive alpha against market consensus. |

## 3. Bucket Classification (Ingested Catalog vs. Code Implementation)

| Bucket | Papers | Owns in the engine |
|---|---|---|
| `MODEL` | 1,083 | Prediction machinery: ratings, win/spread/total models, tracking models, ensembles, RL policies, world models, TSFM backbones |
| `INGEST` | 566 | Signal pipelines: what to collect, schemas, APIs, tracking data, news parsing, feature stores |
| `CALIBRATE` | 494 | Uncertainty honesty: Brier/ECE, isotonic/Platt/temperature, conformal/CQR, Venn-Abers, CRPS doctrine |
| `DECIDE` | 274 | Sizing (Kelly), abstention, selective prediction, pick selection, bet timing |
| `MONITOR` | 219 | Drift detection, calibration alarms, regime change, continual-learning triggers |
| `INVENT` | 185 | Metric/signal invention: symbolic regression, feature discovery, alpha mining, residual mining |

Papers carry multiple buckets where they genuinely span layers (e.g., a conformal-selection paper is
CALIBRATE + DECIDE + MONITOR). Doctrine split across the wired corpus: 881 PROPRIETARY_EDGE,
152 SITUATIONAL, 118 INFRA, 100 BASELINE (market work — the mathematical starting point, never the goal).

## Per-bucket entry points (strongest papers to start building from)

**MODEL** — start: `2602.21307v2` (distill neural win-prob head into ≤10-term equations),
`2211.04459v3` (flexBART drop-in for XGBoost), `2503.12107v1` (Chronos/Moirai TSFM backbone),
`1301.2954v1` (fused/grouped-ability team ratings).
```bash
jq -r 'select(.buckets|index("MODEL")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**INGEST** — start: `2508.17157v1` (SportSQL NL-query over the Neon Postgres),
`2510.04516v3` (ATB retry policy for the data-fetch harness), `2111.12429v2` (tsflex time-series features).
```bash
jq -r 'select(.buckets|index("INGEST")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**CALIBRATE** — start: `2504.01781` (CRPS + log-score doctrine), `1906.02530` (uncertainty-under-shift harness),
`2603.24704` (conformal selective prediction), `2010.00781v1` (in-play calibration evaluation).
```bash
jq -r 'select(.buckets|index("CALIBRATE")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**DECIDE** — start: `2006.04779v2` (offline RL for the bet slate), `2105.08877v2` (bet timing as optimal stopping),
`2402.16300` (conformalized selective regression / no-bet).
```bash
jq -r 'select(.buckets|index("DECIDE")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**MONITOR** — start: `2608.23808v2` (MinervaScore signal validation), `2603.24704` (walk-forward loss control),
`2606.19642` (coverage burn-in protocol).
```bash
jq -r 'select(.buckets|index("MONITOR")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**INVENT** — start: `2305.01582v3` (PySR equation discovery on nflverse), `1601.00991v1` ("SportsAlpha" miner),
`2608.05207` (engine residual mining), `2503.14434` (LLM feature-discovery harness).
```bash
jq -r 'select(.buckets|index("INVENT")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

## The wire-in loop (standing process)

1. **New paper read → ledger → tracker row → index record** (same 14-key schema). The merge script rejects
   any index missing a tracker id.
2. **New build → cite the index ids** it implements in the build's design doc, so capability → paper is traceable.
3. **New signal gap → SIGNAL-GAPS.md** gets a dated entry; the next research wave targets it.
4. **Ledger QA backlog:** the 64 `experimental` + 24 `mixed` lanes are intentionally broad; `suggested_lane`
   already subdivides many — a future pass can promote the best subdivisions to first-class lanes.
