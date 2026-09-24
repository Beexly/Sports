# 1799 Mixed-Rank Match Prediction in MOBA Games (arXiv:1711.06498v1)

**Citation:** Victoria J. Hodge, Sam Devlin, Nick Sephton, Florian Block, Anders Drachen, Peter I. Cowling (2017). *Win Prediction in Esports: Mixed-Rank Match Prediction in Multi-player Online Battle Arena Games*. arXiv:1711.06498v1. URL: https://arxiv.org/abs/1711.06498v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Professional esports matches are scarce and the meta changes fast (patches can obsolete old data), so there is never enough pro training data. Can extremely-high-skill *public* (non-pro) match data be used as proxy training data to predict winners of *professional* matches — and which algorithm/configuration does this best?

## 2. Dataset / schema

- **1,933 DotA 2 replays** (27 Mar – 4 May 2017, no major patches in window): 270 pro matches (13.97%) + 1,663 extremely-high-skill public matches (MMR >> 6000, 99.81 percentile). Parsed with Clarity (github.com/skadistats/clarity).
- **Pre-match:** 113-dimensional tri-state hero vectors (xᵢ = 1 Radiant, −1 Dire, 0 absent).
- **In-game:** 5-minute sliding-window time-series at the 20-minute mark (~half of an average 40-min game); 30 features per timestamp (team damage, kills, last hits, net worth, tower damage, XP) each as Dire, Radiant, R−D difference, and gradient; one model M_t trained per minute t = 4..n.
- **Splits:** Mixed (66/34 chronological train/test) and tournament-only: train on all data minus the 2017 Kiev Major, test on the 113 Kiev Major matches (24–30 Apr 2017) — a strict out-of-sample elite-tier test.

## 3. Method / model

Logistic regression ("Logistic" in Weka 3.8, ridge varied) vs random forests ("RandomForest", trees varied), each run with all features, wrapper subset selection (WrapperSubsetEval + best-first), and CFS filter selection (CfsSubsetEval). Chronological splits so future data never predicts past data. LR estimates per-hero importance (ignores hero interactions); RF captures hero combinations via bagged trees. Equivalent numbers of configurations compared for fairness.

## 4. Equations & assumptions

Equations (as in paper):

- Hero vector: xᵢ = 1 if hero i in Radiant, −1 if in Dire, 0 otherwise.
- Per-minute model: M_t trained on X_{rt} = {x_{i,t−4}, x_{i,t−3}, …, x_{i,t}} for all features i; replay r, minute t.

Assumptions stated: pro players behave differently from lower ranks (cited prior work), so mixed-rank data is only a *proxy* and its adequacy must be tested; no patches in the collection window keeps the meta stable; 20-minute mark is representative mid-game state.

## 5. Features / target

Features: hero picks (pre-match); 30 in-game metrics × (D, R, R−D, gradients) in 5-minute windows. Target: binary match winner (DireWin/RadiantWin). No probabilities, no calibration reported.

## 6. Validation design

Chronological 66/34 splits within mixed data; the Kiev Major test (113 pro matches) is the key elite-generalization test — models trained on mixed data, evaluated only on pro tournament matches. WEKA framework, default params except ridge/trees.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly:

**Pre-match (hero vectors):**
| | Mixed-Hero | Pro-Hero |
|---|---|---|
| LR all / wrapper | 54.6423 / **58.7519** | 47.7876 / 50.4425 |
| RF all / wrapper | 53.1202 / 58.2953 | 50.4425 / **55.7522** |

**In-game (20-min window):**
| | Mixed-InGame | Pro-InGame |
|---|---|---|
| LR 1-attr / all / CFS | 74.1433 (Kills R−D) / 73.3645 / 74.9221 | **75.2212** (Kills R−D) / 70.7965 / 71.6814 |
| RF 1-attr / all / CFS | 67.757 / 73.053 / **76.1682** | 61.0619 / 66.3717 / 68.1416 |

- Mixed training data predicts pro matches with only slightly lower accuracy than mixed-on-mixed (in-game: 75.22 vs 76.17).
- **The optimal algorithm differs by target tier:** pro in-game is best predicted by LR with a *single* feature (kill differential, 75.22), while mixed in-game prefers RF+CFS (76.17); pro hero data prefers RF+wrapper (55.75), mixed hero prefers LR+wrapper (58.75).
- Feature selector interacts with data type: wrapper beats CFS on hero data; CFS beats wrapper on in-game data (correlated features like XP and kills favor the redundancy-penalizing filter).
- Pro matches last longer (100% ≥ 20 min vs 97.6% overall), consistent with longer = less predictable.
- Hero-only data is far weaker than in-game state (≤58.75 vs ≤76.17); which player plays which hero (not modeled) is known to matter.

## 8. Code / data availability

Clarity parser linked; WEKA 3.8 used (reproducible configs). Replay corpus from Valve's site.

## 9. Leakage & limitations

- **Accuracy only — no probabilities, no calibration:** win-probability quality is never evaluated; nothing here directly transfers to calibrated probability modeling.
- **DotA 2, 2017 meta:** single game, single 5-week window; meta-specificity is the paper's own caveat about esports data.
- **The pro-data algorithm flip (LR single-feature winning) may be overfitting/small-sample noise** — the authors flag possible over-fitting; 113 pro test matches is a small test set.
- **Hero data conclusion is weak:** ignoring player×hero identity leaves the biggest known signal on the table (authors admit).
- **No spread/total analogue:** binary outcome only.

## 10. GSE overlap

The corpus has no treatment of the **scarce-elite-tier training problem**: GSE's playoff models, prime-time-only models, or matchup-subtype models all face exactly this — too few elite observations to train on. The corpus's transfer work (1798's cross-league GCN) is about *leagues*, not *tiers within a sport*. The per-minute in-game models M_t with sliding windows are also the closest corpus analogue to GSE's live in-play win-probability product, though no other ledger details a minute-by-minute MOBA-style in-game design. The finding that *different tiers need different algorithms* (simple LR on pro, RF on mixed) is new to the corpus and cautions against GSE's default of one model class everywhere.

## 11. GSE implementation spec

1. **Playoff model with regular-season augmentation:** train GSE's playoff win-probability model on all games with playoff games up-weighted (the paper's mixed-data trick), test strictly on held-out playoffs (Kiev-Major-style elite test). Compare vs playoff-only training on Brier/log-loss.
2. **Tier-specific model selection:** re-run algorithm selection (logistic/GBM/RF) separately on the playoff holdout — the paper predicts the best model class may flip on elite data (regularization-heavy simple models may win on small elite samples).
3. **In-game analogue:** per-minute (or per-drive) in-game models with 5-minute sliding windows of state differentials (score diff, EPA diff, time) — the M_t design maps directly to GSE's live product.
4. Cost: ~3–5 days (data exists; mostly experiment design).

## 12. Reproducible test

Dataset: NFL 2010–2024 (regular season + playoffs) from nflverse. Experiment A: model trained on all games (playoffs up-weighted 1×/3×/10×) vs playoffs-only, evaluated on 2020–2024 playoffs Brier. Experiment B: algorithm bake-off (logistic, GBM, RF) on the playoff holdout vs the same bake-off on regular-season data — does the winner change? Success: mixed training matches or beats elite-only training on the elite holdout.

## 13. Acceptance / rejection gate

**Adopt mixed-tier training if** playoff-holdout Brier with regular-season augmentation beats playoff-only training by ≥0.002; **adopt tier-specific model selection if** the playoff bake-off winner differs from the regular-season winner (the paper's algorithm-flip finding). **Reject** if augmented training degrades playoff Brier — then elite games are distributionally distinct and GSE must accept small-sample elite models with heavier regularization instead.

## 14. Improvement experiment

**Hierarchical tier model:** instead of the paper's flat mixing, fit a two-level model — a base win-probability model on all games plus a learned playoff-tier correction (team-experience and pressure features: prior playoff games, QB playoff starts, rest differential). This tests the hypothesis that pro/elite difference is *systematic* (capturable as a tier effect) rather than noise. Success = the hierarchical model beats both flat-mixed and elite-only on the playoff holdout; it also gives GSE a principled way to extend the trick to other scarce tiers (Thursday games, international games, rookie-QB games).

**Verdict:** ADAPT
