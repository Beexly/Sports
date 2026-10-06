# [0435] Wages of wins: could an amateur make money from match outcome predictions? (arXiv:1702.05982v1)

**Citation:** Zimmermann (2017). *Wages of wins: could an amateur make money from match outcome predictions?* arXiv:1702.05982v1. URL: https://arxiv.org/abs/1702.05982v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 578 lines).
**Verdict:** ADAPT — adopt the paper's core lesson (optimize for pay-out on underdogs/pick'ems, not raw accuracy) as a training objective for GSE's pick-selection layer; the specific classifiers and money-line data are stale and not directly reusable.

## 1. Research question
Can an amateur with simple ML classifiers actually make money betting match outcomes, and does predictive accuracy translate into betting pay-out? The paper evaluates NCAAB post-season, NBA 2016 season, and NFL season with flat $100 bets on every game against Vegas money-lines, and shows that high accuracy ≠ high pay-out: what matters is *which* games you get right (underdogs and pick'ems pay).

## 2. Dataset / schema
- Money-lines for all games from vegasinsider.com (most conservative line per game chosen to avoid optimism), time-varying lines (open→close movement ignored; single conservative line used).
- Team representations: NCAAB/NBA — Ken Pomeroy adjusted efficiencies (weighted season average) + win%, MOV, point differential (see [10]); NFL — box-score "Basic Averages" normalized to 65 possessions + opponent averages + "Adjusted Averages" (Pomeroy-style opponent adjustment) + SRS; NB used Basic+Opponents' Averages, ANN/RF used Adjusted Averages.
- Seasons: NCAAB post-season tournament (67 games), NBA 2016 regular+postseason (~1200 games; first 2 days skipped), NFL season (regular+postseason; week 1 skipped).
- Classifiers: Naïve Bayes (Weka, default, kernel estimator true), MLP/ANN (Weka default), Random Forest, simplified Ken Pomeroy Pythagorean predictor (KP). Flat $100 stakes; pay-out rules: favorite win → $10000/FAV-Line; underdog win → $DOG-Line; pick'em → $90.90; loss → −$100.

## 3. Method / model
Weka implementations with default parameters (NB with kernel estimator; ANN default MLP; RF). KP = simplified Pomeroy predictor from blog coefficients (not re-estimated). Evaluation protocol: bet $100 on the model's predicted winner of every game; tally daily. Baseline: "Vegas" = always bet the money-line favorite, with pick'ems handled as best/expected (50% coin flip)/worst cases. Diagnostics: break down correct predictions by money-line class (favorites / underdogs / pick'ems) to explain pay-out divergence; plot cumulative winnings curves over the season. No staking optimization (flat stakes), no line shopping, no closing-line timing — deliberately naive "amateur" execution.

## 4. Equations & assumptions
Pay-out rules: favorite correct → $10000/FAV-Line; underdog correct → $DOG-Line; pick'em correct → $10000/110 = $90.90; incorrect → −$100. Pick'em swing per game: $190.90 (lost gain + stake).
Stated assumptions: flat $100 stakes; most-conservative line used; lines from vegasinsider Las Vegas books; pick'em coin-flip expectation for the Vegas baseline; no transaction costs, limits, or bankroll constraints.

## 5. Features / target
Inputs: team-level season statistics (adjusted efficiencies, MOV, win%, SRS, box-score averages, opponent-adjusted variants). Target: binary match winner (money-line bet). No spread/total modeling ("we ignore the over-under... for now").

## 6. Validation design
Single-season, bet-every-game backtests per sport. NCAAB: 67-game tournament. NBA 2016: full season minus first 2 days. NFL: full season minus week 1. Baselines: always-favorite "Vegas" with best/expected/worst pick'em handling. No train/test split described for classifiers (statistics are season-to-date weighted averages — effectively expanding-window). No cross-validation; one season each. Pay-out computed at conservative lines.

## 7. Numerical results / baselines
- NCAAB (Table 3): NB accuracy 0.6865, pay-out +$293.52; ANN 0.6417, −$605.92; KP 0.7014, −$231.34. Vegas baseline: 0.7419 acc / +$30.26 (no pick'ems); with 5 pick'ems: best 0.7611/+$484.76, expected 0.7313/+$7.51, worst 0.6865/−$469.73. NB got 39 favorites + 5 underdogs + 2/5 pick'ems right; KP got 43 favorites + 0 underdogs + 4/5 pick'ems — accuracy higher, pay-out worse. Lesson stated: "NB gets five upsets right... this makes all the financial difference."
- NBA 2016 (Tables 4–5): Vegas 0.7121 acc / −$2,374.16 (no pick'ems); with 115 pick'ems: best +$9,125.84, expected −$1,857.30, worst −$12,828.81. No classifier ended net positive; all dipped deeply mid-season then partially recovered — "one could win money if one could determine when to start betting." Correct-pick breakdown: KP dominates favorites (725 reg-season) but gets only 12/109 pick'ems; NB gets 48/109 pick'ems (0.44).
- NFL (Tables 6–7): Vegas 0.6441 acc / −$1,215.69; with 29 pick'ems best +$1,420.68, expected −$1,251.92, worst −$4,115.42. NB: accuracy comparable to Vegas with pay-out better than even best-case Vegas in the regular season; ANN lower accuracy but good pay-out (98 favs, 29 dogs, 15/28 pick'ems vs SRS 111 favs, 18 dogs, 14/28 — "trades off accuracy on favorites against accuracy on underdogs"). All models peaked before season end; following NB to end of regular season forfeited >$600; postseason losses for all.
- Conclusion: "Maybe!" — NCAAB volatile (few games); NBA winnable only with entry timing; NFL straight-forward use could pay "decently (admittedly, not attractive to professional gamblers)" especially stopping early. "In all cases, the safest model seems to be a Naïve Bayes predictor."

## 8. Code / data availability
Money-lines: vegasinsider.com. NFL representation details at the author's blog (scientificdm.wordpress.com); basketball details in [10] (forthcoming at publication). No code link stated.

## 9. Leakage & limitations
Adversarial read: (1) Single-season backtests per sport — NCAAB n=67 is noise-dominated; no multi-season validation, no confidence intervals on pay-outs. (2) No train/test discipline for classifier fitting; "weighted averages" construction is hand-wavy and not reproducible. (3) Line choice ("most conservative") and ignoring line movement/timing injects both optimism and pessimism in unknown directions; no closing-line-value accounting. (4) Flat $100 staking on every game is a strawman — no Kelly, no confidence thresholding, no abstention; the paper's own conclusion gestures at this but the numbers presented use the naive scheme. (5) Weka default hyperparameters; ANN/RF likely underfit or overfit — model comparison is weak. (6) "When to start/stop betting" observations are pure hindsight — identifying troughs ex-post is not a strategy. (7) The KP model is a "simplified" reimplementation, not Pomeroy's actual predictor — mislabeled baseline. (8) Vegas baseline ignores the vig structure properly (pick'em pay $90.90 implies 9% book margin, noted). (9) External validity to 2026 NFL: markets far more efficient now; 2016-era money-lines and simple classifiers won't replicate. But the structural lesson (accuracy vs pay-out decomposition) is timeless.

## 10. GSE overlap
Directly relevant to GSE's product: the map's calibration lane (CQR, grouping loss, temperature scaling), market microstructure (CLV, beat-the-close), and bet-sizing lane (Kelly mentioned 12×, gap #1) all touch this paper's themes, but no repo work has formalized the accuracy-vs-pay-out decomposition or the favorite/dog/pick'em correct-pick breakdown as a model-selection criterion. The engine posts picks and tracks results; the "which games you get right" pay-out attribution is not a standard diagnostic in-repo. Status: **extension** — new evaluation/selection doctrine (pay-out-weighted model selection; underdog-hit-rate as a feature of model quality), adjacent to calibration and bet-sizing lanes.

## 11. GSE implementation spec
1. Adopt the paper's diagnostic, not its models: for every GSE model version, report the correct-pick breakdown by market class (favorite / underdog / pick'em) and the implied flat-stake pay-out at closing lines, alongside accuracy/log-loss.
2. Training objective: shift the pick-selection layer from accuracy to expected pay-out — weight training samples by market-implied pay-out (or optimize a pay-out-weighted log-loss), i.e., "getting border-line cases right instead of easy ones" (the paper's stated future goal).
3. Abstention/entry-exit rules: implement the paper's hindsight observation properly — confidence-thresholded betting (bet only when model edge > threshold) with pre-registered rules, backtested on 2020–2025.
4. Data: The Odds API closing money-lines (already in GSE's stack); nflverse for team features.
Estimated effort: 3–4 days (diagnostic harness + pay-out-weighted objective + threshold backtest).

## 12. Reproducible test
Dataset: NFL 2020–2025 regular seasons; closing money-lines from The Odds API archive (or repo's existing line captures); GSE engine win probabilities (or a baseline Elo as stand-in). Metric: flat-$100 pay-out and ROI by market class vs raw accuracy; baseline = always-favorite at closing lines. Test: does pay-out-weighting the training objective (or confidence-thresholded betting) beat the accuracy-optimized model on 2024–2025 holdout pay-out? Pre-register thresholds before running.

## 13. Acceptance / rejection gate
ADOPT the pay-out-weighted selection doctrine if on 2024–2025 holdout the pay-out-optimized variant beats the accuracy-optimized variant by ≥$500 per season at flat $100 stakes (or ≥2 pp ROI) with the gain concentrated in underdog/pick'em hits; REJECT the doctrine change if pay-out-weighting doesn't beat accuracy-optimization out-of-sample (market efficiency already prices the decomposition).

## 14. Improvement experiment
Beyond the paper: (1) replace flat stakes with fractional-Kelly sized by model edge vs closing line (attacks the paper's "how much to bet" future direction; connects to map gap #1); (2) add CLV as a co-objective — select models that both beat the close and hit underdogs, testing whether the two objectives agree or conflict on 2024–2025; (3) extend the favorite/dog/pick'em breakdown to spread and total markets, where the pay-out structure is symmetric and the paper's asymmetry lesson needs re-derivation.
