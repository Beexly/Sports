# jackc625/nfl-predict — Dossier

**Stars:** 1 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-09-26 (very alive) · **Created:** 2026-03-28

## 1. Vision
A solo-analyst Friday-snapshot NFL prediction system: calibrated Win Probability, ATS, and O/U for every weekly matchup. Walk-forward training, market blending in the mathematically correct space (log-odds for probabilities, point space for spreads/totals), lakehouse pipeline (Bronze/Silver/Gold Parquet + DuckDB) with Pydantic quality gates at each layer, and a FastAPI+HTMX dashboard. v3.0 "Accuracy & Profitability" ships gated re-fits and +EV bet lists.

## 2. The Ask
Python stack (DuckDB, FastAPI, Pydantic, Optuna), a Friday 18:00 ET cron discipline, and the builder's own rigor: blend weights tuned *only on pre-2018 seasons* so the 2021–2024 backtest window was never seen during weight selection — a harder constraint than the backtest itself.

## 3. Constraints
- **License: NONE declared** — study-only.
- Explicitly not in scope: automated bet placement, in-game predictions, player props, DFS, multi-user — a disciplined small surface.
- One analyst, 1 star: the ideas are validated by documentation (STATE-OF-SYSTEM.md, MODEL-DIAGNOSIS.md, ACTIVATION-READOUT.md), not by community review.

## 4. GSE lens
This is the second-sharpest mirror in the category, and it cuts in three places:
1. **Temporal safety at three levels.** A runtime-checkable `FeatureBuilder` protocol with mandatory `as_of_datetime` fencing, a `LeakageGate` that scans the feature matrix for post-game keywords, and a walk-forward splitter that hard-fails on overlapping train/val/holdout seasons. GSE's walk-forward calibration just started with no such gates — this is the exact machinery missing.
2. **The API/ML quarantine.** A pytest AST-walking import guard fails CI if `api/` ever imports from `models/`, `features/`, or `ratings/`. GSE's public/private surface doctrine (site shows projections+rankings only) has no enforcement tooling; this is a concrete, copyable enforcement mechanism.
3. **Gated re-fits with honest refusal.** When the O/U re-fit failed the non-regression gate, it was *refused and documented* (D25-14) — the v1.0 model stayed. GSE's first reasoning trace returned INVALID honestly, which is the same instinct; this repo shows how to operationalize it as policy rather than incident. The parallel is exact: **"refuse to deploy" must be a first-class gate outcome, not an accident.**
4. Blend-in-the-right-space and pre-backtest weight tuning: GSE's calibration plan should steal the "weights tuned on data that predates the backtest" discipline.

## 5. Verdict
**REBUILD** — No-license kills adoption; the methods (triple temporal safety, import-guard enforcement, gated re-fit policy, blend-space discipline) are the prize. This is the reference design for GSE's missing enforcement tooling.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/jackc625/nfl-predict
- Gitdiagram: https://gitdiagram.com/jackc625/nfl-predict
- Star history (1 star): https://star-history.com/#jackc625/nfl-predict
- github.dev: https://github.dev/jackc625/nfl-predict
