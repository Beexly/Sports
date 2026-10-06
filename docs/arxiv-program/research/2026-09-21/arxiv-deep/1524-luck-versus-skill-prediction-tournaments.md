# [1524] Who Has the Best Probabilities? Luck Versus Skill in Prediction Tournaments (arXiv:2509.08744)

**Citation:** Niall MacKay (2026). *Who Has the Best Probabilities? Luck Versus Skill in Prediction Tournaments*. arXiv:2509.08744v1 [stat.AP] (extended from Significance 22:3(2025):16). URL: https://arxiv.org/abs/2509.08744
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv; all sections + appendix).
**Verdict:** ADAPT — this paper gives GSE the exact statistical test for "is our edge real or luck?", which is the question every public pick record on X must answer.

## 1. Research question
When forecasters compete in a prediction tournament (or a public pick record), how do we score probabilities properly, decompose what drives the scores, design the tournament so winners are rewarded for true beliefs, and — the central question — distinguish the winner's skill from luck?

## 2. Dataset / schema
Worked example: 6 forecasters × 1 match (Brazil–Ghana, win/draw/loss); York maths department World Cup/Euros prediction tournaments, 64 matches (2010 World Cup: winner −0.298, margin 0.002); no formal dataset beyond tournament records.

## 3. Method / model
Expository + analytic. Savage representation of proper scores via entropy functions and Bregman divergences; Brier score decomposition (Murphy 1973); a novel "epsilon-refinement" decomposition for forecasters starting from historical frequency f with adjustments ε_i=Rγ_i (optimal stake R=Σγ_i(X_i−f)); asymmetric proper scores (e.g., X·log q+1−q for rare events); luck-vs-skill decomposition of the Brier score; a two-forecaster significance test; tournament-design prescriptions; a novel "elliptical score" (appendix).

## 4. Equations & assumptions
- S_B=−½Σ(outcome−forecast)²; S_L=log q_realized (local; only local score for non-binary).
- Brier decomposition: S_B = −f(1−f) + N⁻¹ΣN_μ(f−f_μ)² − N⁻¹ΣN_μ(q_μ−f_μ)² = −uncertainty + resolution − reliability.
- Refinement: S_B = −f(1−f) + (2/N)Σε_i(X_i−f) − (1/N)Σε_i²; optimal R=Σγ_i(X_i−f); if Σγ_i(X_i−f)<0, just forecast f.
- Luck/skill: S_B(q) = −p(1−p) + (2q−1)(X−p) − (p−q)² = entropy + exposure − penalty = uncertainty + luck + skill; exposure variance (2q−1)²p(1−p).
- Forecaster comparison: Δ=N⁻¹Σ(q'_i−q_i)(q'_i+q_i−2X) approx normal, σ²≤N⁻²Σ(q'_i−q_i)²; RMS forecast difference δ → sd(Δ)<δ/√N.
- Elliptical score (novel): E_α(p)=r/√(α(1−α)), r²=(1−α)p²+α(1−p)²; penalty √[α(1−α)]/r³, most sensitive near α; spherical score is α=½.
- Assumptions: large-N normality of Δ; bound uses 4p_i(1−p_i)≤1; tournament examples assume binary/trinomial outcomes.

## 5. Features / target
Probability forecasts for match outcomes; forecaster-vs-forecaster score differences.

## 6. Validation design
Analytic identities plus the 2010 World Cup tournament as a worked case study (64 matches, trinomial forecasts, Figure 2 score-evolution plot).

## 7. Numerical results / baselines
- Table 1: for Brazil win, Brier ranks A(0)>C(−0.19)>D(−0.20)>B(−0.25)>E(−0.33)>F(−1.00) while log ranks A(0)>D(−0.60)>B=C(−0.69)>E(−1.10)>F(−∞) — Brier penalizes D despite D's higher probability on the realized outcome, because it scores unrealized outcomes too.
- 10%-off forecaster at p=0.5: penalty −0.01 vs exposure σ=0.1 (10× larger); 100 questions needed for luck to shrink to 1σ (16% chance of beating the savant), 400 for 2σ (2%).
- Rule of thumb: over 100 questions with typical forecast RMS difference δ≈0.1, a mean Brier-score gap >0.02 is ~2σ (≥95% confidence of a real skill difference) against typical scores ≈−0.25.
- 2010 World Cup: winner's margin 0.002 — "probably got lucky"; top 15–20 separated by <0.1; rankings confident only within ±3–5 places.
- Tournament design: winner-takes-all makes rewards a nonlinear function of a proper score → improper (leaders hedge, trailers gamble); even with proper scoring, all forecasts must be submitted in advance (author hedged his lead with bookmaker probabilities); switched to log score after 2014 (with −∞ bankruptcies as a feature).

## 8. Code / data availability
No code or data; expository paper with fully stated formulas.

## 9. Leakage & limitations
- No empirical validation beyond one tournament's records; the 0.02 rule is a 2σ bound, not a calibrated p-value; assumes the δ≈0.1 RMS forecast-difference regime.
- Informal tone; several results are classical (Murphy, Savage, Kelly) repackaged — the novel contributions are the elliptical score, the ε-refinement/staking decomposition, and the applied luck-vs-skill arithmetic.

## 10. GSE overlap
Existing research map covers scoring rules (CRPS, log-loss) for *training* but nothing on *evaluating whether the engine's published edge over the market is statistically real* — this fills that slot. Complements ledger 1521/1520 (calibration machinery) by answering the outer question Garrett's X mandate requires: "our record says we're good — prove it isn't luck."

## 11. GSE implementation spec
- Add a "skill-vs-luck" panel to the engine's weekly report: for engine vs. market-implied probabilities, compute Δ (mean Brier/log-score difference) and its δ/√N bound; report the implied σ and whether |Δ|>2σ.
- Adopt the 0.02-over-100-games rule as the public standard: no "we're sharper than the market" claim until the score gap clears 2σ; no hit-streak promo post until the streak's luck probability is computed.
- Never run winner-takes-all internal contests on raw PnL; score analyst/model variants on proper scores with all "forecasts" timestamped in advance.
- Effort: 0.5 day.

## 12. Reproducible test
Dataset: engine's published moneyline probabilities vs. closing-line-implied probabilities, 2022–2024 (~800 games). Compute per-game Brier and log scores for both, Δ series, δ (RMS prob difference), σ bound; check whether the engine's mean edge clears 2σ. Expected: informative either way — a clear pass licenses the marketing claim, a fail enforces honest "within noise" framing.

## 13. Acceptance / rejection gate
ADOPT the panel if the 2022–2024 backtest reproduces the paper's arithmetic cleanly (σ bound behaves, Δ approx normal under shuffle); the gate for *claims* is the paper's own: public skill claims only when |Δ|>2σ.

## 14. Improvement experiment
Go beyond the paper: extend the Δ test to the *Kelly-weighted* log-score difference (the paper's Box 1 shows log-score gap = log bank multiplier), producing a "luck-adjusted bankroll curve" that shows GSE's public record with a 2σ luck envelope — a publishable trust asset no tout service offers.
