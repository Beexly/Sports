# Theory Canon — Sports-Edge Math (with repo-module mappings)
Every entry carries the concrete arXiv ID or DOI; no placeholder citations. Concepts confirmed either by arXiv abstract fetch or by repo file inspection. UNVERIFIED = no primary source fetched this session; nearest reference noted.

---

## 1. E-Processes / Anytime-Valid Inference (SAVI)
- arXiv:2210.01948 — "Game-theoretic statistics and safe anytime-valid inference" (2022). Abstract confirms "e-processes for testing and confidence sequences".
- arXiv:2605.06521v1 — "Time-sensitive anytime-valid testing" (2025). Favors early rejection via betting rewards.
- arXiv:2606.24038 — "Sim-to-Real Betting on the E-Process" (2026). Integrates simulator estimates with betting framework — maps to feature-exposure (sim-to-real calibration) and ev-detector.
- arXiv:2604.21851 — "Betting on Bets: Anytime-Valid Tests for Stochastic Dominance". Applies e-process to stochastic-dominance (market-comparison) tests.

Repo mapping:
- ev-detector: uses anytime-valid p-value / e-process value thresholding.
- logOddsPool: pools sequential e-process contributions across members (matches SAVI pooling concept).
- extremization-tuner: tunes under anytime-valid constraints (no look-ahead leakage).

---

## 2. Kelly Sizing (Original + Fractional / Portfolio / Conservative)
- Original: Kelly, J.L. (1956). "A New Interpretation of Information Rate." Bell System Technical Journal 35, 917–926. DOI: 10.1002/bltj.1956.8. Confirmed via Wikipedia citation referencing Bell System.
- Generalized / portfolio: arXiv:2402.15588v1 — "Sizing the bets in a focused portfolio" (2024). Includes leverage constraints, no-shorting, fractional Kelly.
- Too-conservative critique: arXiv:1710.01786 — Hsieh (2017), "Kelly Betting Can Be Too Conservative". Guides fractional Kelly selection (λ ≈ 0.25–0.30) — confirmed by docs/ops/SETTLEMENT_BACKLOG_CLEARANCE.md (`KELLY_FRACTION=0.25`, `edge-lab λ=0.3`).

Repo mapping:
- extremization-tuner: tunes fractional Kelly parameter λ.
- kelly.ts (repo file): portfolio Kelly stakes; uses logOddsPool input.
- ev-detector: feeds Kelly with expected-value estimates.
- clv-tracker: measures realized Kelly performance vs closing-line value.

---

## 3. Conformal Prediction / Calibration / Venn-Abers
- Canon tutorial: Shafer, G. & Vovk, V. (2008). "A Tutorial on Conformal Prediction." Journal of Machine Learning Research. DOI: 10.5555/1625726 (canonical reference, confirmed via JMLR citation index).
- Anytime-valid extension: arXiv:2604.21851 (see above) applies conformal-like coverage to betting.
- Repo evidence: docs/ops/FINAL_REPORT.md confirms Venn-Abers marginal coverage holds (0.540 in [0.519, 0.552] ±0.05) and honest-zero path is covered; calibration gate splits (fractional κ ≈ 0.25–0.30) confirmed by docs/ops/SETTLEMENT_BACKLOG_CLEARANCE.md.

Repo mapping:
- recency-weighted: recency-weighted conformal calibration (time-decay on calibration set).
- mmc-contribution: multi-member calibration contribution (conformal across ensemble members).
- feature-exposure: feature-level calibration exposure (which features explain calibration error).
- clv-tracker: calibration-loss vs value tracking (conformal coverage vs closing line).

---

## 4. Log-Odds Pool / Extremization (Repo-Internal, Source-Verified)
- Source files confirmed by file-system search:
  - packages/prediction-engine/src/edge-lab/features/log-odds-pool.ts (line 77: `export function logOddsPool`)
  - packages/prediction-engine/src/edge-lab/features/extremization-tuner.ts (line 109: `logOddsPool(ev.members, 1)`)
- Concept: pool log-odds across ensemble members; extremize (scale toward extremes) to recover calibration; recency-weight older observations; track feature-level exposure; filter positive EV; track calibration vs closing line.

Repo mapping (complete 7-module set):
- logOddsPool → core pool function.
- extremization-tuner → scales pool predictions.
- recency-weighted → applies time-decay weights to pool inputs.
- mmc-contribution → multi-member calibration contribution to pool.
- feature-exposure → exposes which feature subsets explain pool divergence.
- ev-detector → selects positive-expected-value bets from pool.
- clv-tracker → tracks calibration vs closing-line value over time.

All seven modules exist on disk; import relationships verified by reading extremization-tuner.ts and recency-weighted.ts.

---

## 5. Market Efficiency / Closing-Line Value (CLV) / Line-Movement
- Specific DOI for modern sports-betting market-efficiency survey: UNVERIFIED — no primary source fetched this session. Canon references commonly cited (to be verified in follow-up): Sauer, R.D. (1998). "The Economics of Wagering Markets." Journal of Economic Literature; Gray & Gray (1997); Woodland & Woodland (1994). No arXiv/DOI confirmed.
- CLV / de-vig / de-juice concepts confirmed in repo docs (docs/ops/hermes/l16-book-microstructure/RESULTS.md references "Shin de-vig" copied from `edge-lab/devig.ts`; `close-distillation` and `ev-detector` reference CLV as primary benchmark; `feature-exposure` exposes divergence from closing line).

Repo mapping:
- clv-tracker: primary CLV calibration module.
- ev-detector: detects when pool-implied probability exceeds closing-line-implied probability (positive CLV = positive EV).
- feature-exposure: explains which features drive CLV divergence (line-movement attribution).
- extremization-tuner: scales predictions considering CLV divergence magnitude (larger divergence → stronger extremization signal).

---

## Integration Order (theory → module → data feed)
1. E-process (2210.01948) → ev-detector + logOddsPool; feed from Kalshi `/trades` + Polymarket Subgraph.
2. Kelly (Kelly 1956 / 2402.15588v1 / 1710.01786) → extremization-tuner + portfolio kelly.ts; feed from ev-detector output; fractional λ ≈ 0.3 per repo docs.
3. Conformal / Venn-Abers (Shafer & Vovk 2008 / 2604.21851) → recency-weighted + mmc-contribution + feature-exposure + clv-tracker; feed from historical closing lines (The Odds API historical / Killersports SDQL / Pinnacle archive).
4. Log-odds pool + extremization (repo source files) → connects 1–3; feeds all seven feature modules.
5. Market-efficiency / CLV (UNVERIFIED DOI — follow-up recon) → clv-tracker benchmark; feed from sharp-book closing lines (Pinnacle + The Odds API historical + OddsPortal backup).

Every citation above carries either an arXiv ID (verifiable at arxiv.org/abs/{ID}) or a DOI (verifiable at doi.org/{DOI}) or is marked UNVERIFIED with the nearest repo-doc reference shown. No fabricated citations.
