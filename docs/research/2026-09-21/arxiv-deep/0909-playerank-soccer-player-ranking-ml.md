# [0909] PlayeRank: data-driven performance evaluation and player ranking in soccer via a machine learning approach (arXiv:1802.04987v3)

## Citation / full-text source

- arXiv:1802.04987v3 — full text: https://arxiv.org/pdf/1802.04987
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Luca Pappalardo, Paolo Cintia, Paolo Ferragina, Emanuele Massucco, Dino Pedreschi, Fosca Giannotti (2019, v3). *PlayeRank: data-driven performance evaluation and player ranking in soccer via a machine learning approach*. arXiv:1802.04987v3 [cs.AI / cs.LG]. URL: https://arxiv.org/abs/1802.04987v3
**Ledger completed:** 2026-09-21. **Read:** full text (cached corpus copy, 812 wrapped lines incl. appendix + references).
## Verdict

**ADAPT** — the core framework idea (no ground truth for individual quality → learn event weights from a *team-outcome* classifier, then score individuals by dot product; plus unsupervised role detection from average field position) is directly portable to an NFL "win-contribution" player rating for props/DFS form features.

## 1. Research question
Can players be evaluated and ranked in a multi-dimensional, role-aware, fully data-driven way without any ground truth for individual performance quality — and can such a system agree with professional scouts better than mono-dimensional baselines?

## 2. Dataset / schema
Wyscout soccer-logs: **31,496,332 events, 19,619 matches, 296 clubs, 21,361 players**, 18 competitions (La Liga, EPL, Serie A, Bundesliga, Ligue 1, Primeira Liga, Süper Lig, Greece, Austria, Switzerland, Russia, Eredivisie, Argentina, Brazil, UCL, UEL, Euro 2016, World Cup 2018), four seasons. Each event: id, type, timestamp, player, team, match, (x,y) in [0,100]², subtype + tags. Goalkeepers excluded. Average 1,628 events/match, ~57 events/player/match, passes ~48% of events. Proprietary (Wyscout); code promised for camera-ready (not verified here).

## 3. Method / model
Three phases: **(a) Learning** — (i) *feature weighting*: aggregate player feature vectors to team level p_T^m = Σ_{u∈T} p_u^m, train a linear SVM against binary match outcome o_T^m ∈ {1: win, 0: non-win}, extract classifier weights w as event-importance weights ("team outcome is a natural proxy for performance quality at team level"); (ii) *role detection*: k-means (k=8, Hartigan–Wong) on each player-match's **center of performance** (mean event coordinates), with soft/hybrid assignment via k-silhouette (Eq. 4, δ_s=0.1 → ~5% hybrids). **(b) Rating** — per-match performance rating r(u,m) = (1/R) Σ_i w_i x_i ∈ [0,1] (Eq. 1); optional goal-adjusted r* = α·norm_goals + (1−α)·r (Eq. 2); multi-match aggregation via EWMA r̄(u,m_g) = β·r(u,m_g) + (1−β)·r̄(u,m_{g−1}) (Eq. 3). **(c) Ranking** — role-based leaderboards; a player belongs to a role's ranking if ≥40% of his matches carry that role.

## 4. Equations & assumptions
- (1) r(u,m) = (1/R)Σ w_i x_i; (2) goal adjustment; (3) EWMA; (4) k-silhouette s_k(c) = (d̄_k − d̄_i)/max(d̄_i,d̄_k); (5) NRMSE between competition-specific and global weight vectors; (6) spatial search score z(u,M,Q) = s(u,Q)·r̄(u,M); (7) versatility V(u,M) = −(Σ_i p_i log p_i)/log k.
- Assumptions: match outcome proxies team performance quality; weights learned at team level transfer to individuals; a player's average event position identifies his role; EWMA with fixed β captures form; goals deliberately excluded from weights (they're already the outcome being predicted — would leak).

## 5. Features / target
**76 features** = type × subtype × tag combinations (pass-cross-accurate, duel-ground-defending-accurate, foul-violent-yellow, …), each counted per player-match and normalized to [0,1]. Target (learning phase only): binary match outcome.

## 6. Validation design
- SVM: 80/20 split, 5-fold CV for the cost parameter.
- Scout agreement: 3 professional Wyscout scouts judged 211 player-pairs (202 distinct players, stratified by rank gaps 1–10 / 11–20 / 21+); 8% discarded for lack of majority. Concordance metrics: c_maj (agree with ≥2 scouts), c_una (agree with unanimous scouts). Compared against Flow Centrality and PSV.

## 7. Numerical results / baselines
- Team-outcome SVM: **AUC 0.89, F1 0.81, accuracy 0.82** vs majority baseline (AUC 0.50, F1 0.48, acc 0.62). Ternary (win/draw/loss) and alternative binary labelings give no significant weight change.
- Top weights: assists, key passes, shot accuracy; strong negative weights for red/yellow cards, especially hand/violent fouls.
- Weight stability across competitions: mean NRMSE ~6%; 16/18 competitions <7%; Euro 2016 17%, World Cup 2018 20% (national teams, few matches). Role-specific NRMSE 8–15%.
- Role detection: k=8 best, **silhouette 0.43** (stable across initializations); scouts validated the 8 roles (right/left fielder, central forward, central fielder, right/left forward, right/left central back).
- Ratings: μ=0.39, ~94% within μ±2σ; excellent performances (r>μ+2σ) = 5% of all; only **11% of players** achieve excellence ≥ once; among those, excellence in ≤21% (Neymar) / 9% average of performances. Average rating correlates with rating variance — top players aren't always excellent, they're excellent *more often*.
- Role-based top-10s put Messi (right forward), Suárez (central forward), Neymar (left forward), Marcelo (left fielder) on top without ever seeing goals.
- Scout concordance: **c_maj = 68%, c_una = 74%** (random = 50%); for rank gap ≥20: c_maj=86%, c_una=91%. PlayeRank improves over PSV by **+16% relative / +13% absolute** and over Flow Centrality by **+30% relative / +21% absolute** on the same pairs.
- Versatility (role entropy): Sergi Roberto 0.45 (most), Neymar 0.016 (least).
- Search demo: z-score ranking over 100-zone field queries; Messi tops an attacking-right query (s=0.60, r̄=0.46) over Robben (s=0.61, r̄=0.43).

## 8. Code / data availability
Source code promised "in the camera-ready version"; Wyscout logs proprietary. No artifact URL verified in this read.

## 9. Leakage
Goals deliberately excluded from features (they are the outcome being classified) — correct. Team-vector aggregation means the same player's features appear once in training and once in rating, but that's the intended transfer, not leakage. Minor inconsistency: §3.3 says two examples per match (T1, T2) but §4.4 reports "19,619 examples" (= the match count, not 2×). The two per-match vectors are also not independent (zero-sum), which inflates effective sample size for the SVM.

## Limitations
- Soccer only; no NFL validation of any kind.
- NFL games have ~150 plays vs ~1,628 soccer events — the linear-SVM weighting has far less signal per game; per-game ratings will be noisier.
- Linear dot-product rating ignores feature interactions (paper tried zone/time features — "no significant difference," but that's soccer logs, not NFL).
- No off-ball actions (tracking data has them for NFL — actually an opportunity).
- Role detection by average event position conflates alignment with role; in NFL, motion/pre-snap shifts make this noisy (NGS tracking can fix: use route/assignment clusters instead).
- Scout gold standard is weak (3 scouts, 211 pairs, 8% discarded) — agreement tops out at 91% only for far-apart pairs.
- Assumes role distributions are stable; free agency/injuries shift NFL team vectors faster than soccer's.

## 10. GSE overlap
GSE's engine (v5.2.7) has no per-player "win-contribution" rating; props rely on projections and matchup features, not an individual quality score learned from team outcomes. Existing-research-map has EPA-based ratings but nothing that learns event weights from win outcomes and ports them to individuals with role-aware ranking. This is a **new feature family**, not a duplicate.

## 11. GSE implementation spec
1. Build per-player-per-game feature vectors from nflverse: targets, receptions, air yards, YAC, carries, rushing yards, TDs, pressures allowed, sacks taken/allowed, tackles, INTs, PBUs, missed tackles, penalties, etc. (all normalized [0,1]).
2. Aggregate to team vectors; train logistic regression (or linear SVM) on binary win vs the same vector — 2020–2025 seasons; extract weights w.
3. Rate each player-game r(u,m) = w·x; EWMA over the season → weekly form rating r̄.
4. Role detection: k-means on players' average (x,y) at snap from NGS/tracking (or nflverse formation/position data) → role-based leaderboards (e.g., slot vs outside WR, box vs deep safety).
5. Feed r̄ and role-relative rating into the prop model as matchup-adjusted quality features; role leaderboards feed the weekly DFS packet write-ups (GSE's standing format).

## 12. Reproducible test
Dataset: nflverse 2020–2025 play-by-play + player stats. Protocol: (a) team-outcome classifier — train on 2020–2023, test 2024–2025, require AUC ≥ 0.80; (b) incremental value — regress next-game fantasy points on existing GSE features vs existing + r̄, per position; report ΔR² and Spearman ρ of r̄ vs actual.

## 13. Acceptance / rejection gate
**Numeric gate:** ADAPT into the prop feature store iff (a) the team-outcome model reaches AUC ≥ 0.80 on 2024–2025, AND (b) r̄ adds statistically significant incremental explanatory power (p < 0.05, ΔR² ≥ 0.01) for next-game fantasy points in at least 3 of 5 skill positions. Otherwise REJECT.

## 14. Improvement experiment
Replace the linear SVM with a gradient-boosted classifier and use SHAP values as the feature weights — captures the interactions the paper's zone/time features hinted at; then add tracking-data off-ball features (separation, cushion, pass-rush get-off) which the paper explicitly flags as missing. If tracking-based weights beat log-based weights on the gate, the upgrade becomes the default.

**Verdict: ADAPT** — port PlayeRank's learn-weights-from-wins + dot-product rating + role clustering to NFL events; cheap to prototype on nflverse, plugs straight into prop features and DFS write-ups.
