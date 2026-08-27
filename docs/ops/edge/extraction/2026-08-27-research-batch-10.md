# 2026-08-27 OVERNIGHT RESEARCH — BATCH 10 (§4 sweep, cont. — soccer variants + NFL tracking-flags, no stop)
# Full-text verified. Verdicts: PATTERN / ATTRIBUTED-ONLY / IGNORE. Source = DATA. James Cook rule held.

## M51 — Soccer xGA / xGD / xGOT (defensive + post-shot variants)
- MATH: xGA = Σ xG of shots conceded; xGD = xG(for) − xGA; xGOT = post-shot xG (on-target only) blending pre-shot xG + shot placement in goalmouth (Opta). All Bernoulli-shot sums; xGD is team strength delta.
- SPORT/MARKET: soccer team rating. GSE: port as GSE-xGA/xGD (our xG model M4/M32 → conceded side). Independent p. xGOT = our-fit variant if shot-placement data held.
- DATA: shot events (public ESPN/StatsBomb open). GSE holds.
- VERDICT: PATTERN — direct extension of xG to defense; team-strength from xGD.
- LICENSE: wikipedia Expected_goals (cites Anzer 2021 PMC8056301, Mead 2023 PMC10075453, Ruiz-de-Alarcón 2024 Data 9:102). CITE. Full read 2026-08-27.

## M52 — NBA lineup win-probability optimizer (ensemble)
- MATH: fit per-lineup win-prob via logistic on (net rating, opponent, home) → optimize 5-man unit selection to maximize P(win). Stacked ensemble (Nature 2025 s41598) predicts outcome ~76% 5-season / ~71% out-of-season. Honors lineup RAPM (M45/M48).
- SPORT/MARKET: NBA lineup selection. GSE: port as GSE-lineupOpt (our RAPM-based). Independent p (no tracking). Note: ~76% acc is descriptive, not probability-calibrated — use as ranking.
- DATA: lineup possessions (public NBA pbp). GSE holds.
- VERDICT: PATTERN — applies M45 RAPM to selection; calibration caveat noted.
- LICENSE: PMC9764182, nature s41598-025-13657-1 (open). CITE. Full read 2026-08-27.

## M53 — NFL Pass Rush / Pass Block Win Rate (ESPN NGS — ATTRIBUTED-ONLY)
- MATH: rusher "win" when tracking chips closer to QB than blocker within 2.5s (legacy) / upgraded 2025 formula; correlates 0.34 with EPA/play (up from 0.24). Bull-rush win → +8pp sack chance. NEW: pressure probability >75% = pressure (NFL Next Gen Stats).
- SPORT/MARKET: NFL trench impact. GSE: FLAG — ESPN/NFL NGS proprietary tracking; per James Cook rule cite "ESPN reports X win rate" as attributed fact ONLY. Legal analog: our air-yac/separation truths (M28) are the re-derived public path. Do NOT ingest NGS win-rate as ours.
- VERDICT: ATTRIBUTED-ONLY / IGNORE-as-method (tracking-gated, proprietary).
- LICENSE: ESPN proprietary NGS; nfl.com Next Gen Stats. CITE attribution only. Full read 2026-08-27.

## M54 — Soccer set-piece Expected Threat (DxT) + static xT extension
- MATH: xT (M18) extended to set-pieces: DxT (Hassani 2025, MDPI 15:4151) refines move/shoot probs using an xG model incorporating off-ball positioning. Value of a set-piece pass = ΔxT(pre→post). KNN pitch-control (arXiv 2501.05870) estimates zone control via K-nearest players.
- SPORT/MARKET: soccer set-piece / pass value. GSE: port as GSE-dxt (our xT extension — public event data). Independent p. KNN pitch-control = context feature (event-data only, not full tracking).
- DATA: set-piece events + off-ball position (public ESPN). GSE holds (event-level).
- VERDICT: PATTERN — enriches M18 xT with set-pieces + positioning.
- LICENSE: arxiv 2501.05870, MDPI 15:4151 (open), soccermatics medium. CITE. Full read 2026-08-27.

## M55 — Pitch control / pitch ownership (KNN, tracking-gated analog)
- MATH: pitch control = P(ball-receiving team controls next touch at zone z) = Σ over players KNN-weighted by distance/speed (Spearman 2018). Full version needs tracking; event-data KNN (M54) is a partial analog.
- SPORT/MARKET: soccer space control. GSE: tracking-gated → DO NOT port full version (SkillCorner/PFF rights, M-proposed). Event-data KNN analog only (M54). Flag as expansion-candidate needing rights.
- VERDICT: IGNORE full / PATTERN partial (event KNN). Rights-gated.
- LICENSE: arxiv 2501.05870, tonyelhabr pitch-control (public method). CITE. Full read 2026-08-27.

---
BATCH 10 SUMMARY: 5 methods (M51-M55). TOTAL sweep = 55 methods. Soccer now DEEPEST (M4/M7/M18/M32/M42/M47/M51/M54/M55 = 9). NFL tracking-flags M43/M53 reinforce James Cook rule (legal path = our EPA/air-yac re-derivation).
PROPRIETARY/TRACKING HANDLED: M43 (DVOA/QBR), M53 (NGS win-rate), M55-full (pitch-control tracking) all attributed-only/rights-gated. NO fabricated numbers. Loop continues.
