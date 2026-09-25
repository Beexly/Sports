# HANDOFF — @ethandojo NFL builds → GSE engine

Date: 2026-09-25. From: Motif. For: the coding agent.
Source: full Instagram profile sweep of **@ethandojo** (Ethan Do, https://www.instagram.com/ethandojo) — every post Sept 2026 back to April, all NFL videos watched in full.

## The kernel worth stealing

He runs a real, public-track-record NFL model. This is the recipe, as stated in his own videos:

- **Data:** NFLverse, 2018–present
- **Model:** XGBoost (decision-tree ensemble)
- **Features:** QB efficiency, explosive play rate, turnover margin, pass rush, recent point differential, player availability; explicitly adjusts for roster changes
- **Season sim:** Monte Carlo, 10,000 iterations
- **Posted record:** Week 1: 10-6, Week 2: 11-5 (2026 season). Week 3 picks posted 2026-09-24.
- **Example output:** NFC West 2026 — Seahawks 12-5 (88% playoffs), Rams 11-6 (85%), 49ers 10-7 (70%), Cardinals 6-11 (4%)

No public repo of his was found (web search 2026-09-25). The stealable part is the methodology + the build list below, not his code. Exact feature engineering and XGBoost hyperparameters are unknown — treat the recipe as a spec to implement and beat, not a clone.

## Build list — 10 items, each becomes a real callable engine module

1. **Game outcome predictor** — the model above. XGBoost on NFLverse-style features (QB efficiency, explosive play rate, turnover margin, pass rush, point differential, availability, roster-change adjustments) + Monte Carlo sims. His stack: Python/Pandas/scikit-learn. GSE home: prediction-engine.
2. **Highlight reel detector** — auto-detect TDs/INTs from game footage using crowd-noise spikes + commentary cues. His stack: Python/OpenCV/Whisper/FFmpeg.
3. **Defensive coverage analyzer** — pre/post-snap alignment → coverage classification + team tendency tracking. His stack: Python/OpenCV/YOLOv8/PyTorch.
4. **Contract value analyzer** — production-per-dollar: who is worth their contract vs overpaid. His stack: Python/Pandas/Streamlit.
5. **4th-down decision grader** — grade every punt/FG/go call against analytical models and win-probability. His stack adds scikit-learn.
6. **Fantasy trade analyzer** — value buckets comparing overall value, disparity, matchup-adjusted performance, PPR-aware. Python/Pandas/Streamlit.
7. **AI offensive coordinator** — train on opponent defensive personnel, alignment, tendencies → recommend formations and plays. His stack: Python/PyTorch.
8. **Game film splitter** — auto-cut raw footage into individual plays via visual (player stillness) + audio (snap cadence) cues, optional per-play processing. Python/PySceneDetect/OpenCV.
9. **Opponent exploit finder** — film + data → statistical outliers and weaknesses, attackable areas. Python/Pandas/Streamlit.
10. **Draft copilot** — conversational fantasy draft advisor (his demo: debated Achane vs Lamb at 1.09, took Jefferson at 2.11). Agent-layer build.

## Rules

- New files only. Never modify existing files or live code paths. No regression.
- Every module gets a test.
- Work on your own branch, commit as you go.
- Follow the repo's existing module layout (prediction-engine, data-ingestion, calibration) and AGENTS.md — that governs everything else.
- Log each wired item in `docs/research/2026-09-21/wiring/IMPLEMENTED.md` so nothing gets built twice.

## Gaps (do not invent)

- His weekly pick images didn't parse — only captions + stated records captured.
- Exact feature definitions, hyperparameters, and training split are his and unknown.
- Story highlights weren't accessible; the "10+ extra ideas" he DMs to commenters are gated.
