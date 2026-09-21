# [0303] Beating the House: Identifying Inefficiencies in Sports Betting Markets (arXiv:1910.08858)

**Citation:** Sathya Ramesh, Ragib Mostofa, Marco Bornstein, John Dobelman (2019). *Beating the House: Identifying Inefficiencies in Sports Betting Markets*. arXiv:1910.08858v2. URL: https://arxiv.org/abs/1910.08858
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2601 lines).
**Verdict:** ADAPT — the historical-spread→win-probability non-parametric mapping plus max-payout EV screen is a portable market-mispricing detector, but the hyperparameter grid-search and the best-line-since-no-NBBO assumption both need GSE-grade hardening before it becomes a signal.

## 1. Research question
Can a betting algorithm that uses only observable bookmaker prices (point spreads + moneyline odds from a panel of Las Vegas casinos) systematically generate positive returns — i.e., are sports betting markets inefficient — across NFL, NBA, NCAAF, NCAAB, and WNBA moneyline markets? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Spread/moneyline panel:** 16 Las Vegas casino sportsbooks via vegasinsider.com; for each game, the range of point spreads and moneyline payouts (best/last update used; authors' analysis found bookmakers' last update generally occurred within an hour of the game).
- **Historical spread→result data:** 1990–2017 historical spreads and game outcomes from "a variety of sites" (not individually named).
- **Sample sizes (Table 1, total games):** NFL 922, NBA 4019, NCAAF 951, NCAAB 1140, WNBA 255. Years bet 2009–2017 (data excludes early 2000s, 2008, 2018).
- **Coverage:** college games restricted to Power-Five members (ACC, Big Ten, Big 12, Pac-12, SEC); preseason/exhibition excluded; postseason included.
- **Access:** vegasinsider.com (current-year data only; older line movements scraped from archive.org/web); no public download link stated.

## 3. Method / model
- **Core engine (Eq. 2):** non-parametric win probability `P(Win | PS) = Historical Win % of Teams with Point Spread = PS` — a team at spread PS is assumed to win at the historical win rate of teams at that exact spread (only games concluded before the game being priced). Unlike Stern (1991), no normality assumption, prices any spread size.
- **Two probability aggregation strategies over the casino spread panel:** "Simple" (Algorithm 1) = average of π over the *unique* spreads offered; "Weighted" (Algorithm 2) = average weighted by the frequency of each spread in the panel.
- **EV computation (Eq. 3):** `Expected Value = [P(Winning) × Payout] − P(Losing)` on a $1 bet, using the **maximum** moneyline payout across the 16-casino panel.
- **Two hyperparameters:** the "Epsilon Threshold" — bet only when one team's win probability falls inside the symmetric band (0.5 − ε, 0.5 + ε) (outside the band, always take the favorite); and the "Expected Value Threshold" τ — bet only if EV > τ.
- **Betting algorithm (Algorithm 3):** if both sides' EV < 0 → no bet; if π_f ≥ 0.5 + ε → take the side with higher probability; otherwise take whichever side has higher EV above τ. One-sided $1 bets; ROI = 100 × (Σ winnings) / N_bets.
- **Model selection:** ε and τ chosen per sport to maximize Total Return = ROI × N.

## 4. Equations & assumptions
- Point Spread = Projected Final Score_favorite − Projected Final Score_underdog (1)
- `P(Win | PS) = Historical Win % of Teams with Point Spread = PS` (2)
- `Expected Value = [P(Winning) × Payout] − P(Losing)` (3)
- Simple: `(1/|σ|) Σ_{s∈σ} π_s` (Algorithm 1); Weighted: `Σ_{s∈σ} π_s φ_s / Σ_{s∈σ} φ_s` (Algorithm 2), σ = unique spreads, φ = spread frequency.
- Assumptions: bookmakers are the most skilled predictors and the last (closest-to-game-time) quote is the most accurate; historical spread-conditional win rates are stationary; bettors can access the maximum payout across all 16 casinos on every game (no NBBO enforcement in sports betting, per Sec. 1).

## 5. Features / target
- **Inputs:** per-game cross-casino panel of point spreads + moneyline payouts; historical spread→outcome table (1990–2017).
- **Target:** +EV moneyline side per game (or abstain).

## 6. Validation design
- In-sample backtest (2009–2017 games) with two randomization benchmarks (Table 1): equal 50/50 spread betting, equal 50/50 moneyline, 67/33 favorite-weighted moneyline; 95th-percentile CIs per panel.
- No walk-forward or out-of-sample split: ε and τ are selected by maximizing Total Return on the full sample (in-sample tuning).
- **Bootstrap (Algorithm 6, Sec. 4.1):** 10,000 resamples with replacement per sport (N = sample games), grid-searching ε and τ (ε step 0.01, EV-threshold step 0.001) in each resample; 95% percentile + high-density CIs (Table 5) and one-sided 99% CIs with Bonferroni correction across the five sports (Table 6).

## 7. Numerical results / baselines
All numbers quoted exactly as printed (Tables 1–6).
- **Randomization baselines (Table 1):** spread 50/50 mean ROI ≈ −4.4% for all sports (NFL −4.35, NBA −4.39, NCAAF −4.41, NCAAB −4.39, WNBA −4.39); 50/50 moneyline mean ROI near 0% (NFL 0.75, NBA 0.54, NCAAF 0.30, NCAAB −6.44, WNBA −0.18); 67/33 moneyline (NFL 0.72, NBA −1.04, NCAAF −1.52, NCAAB −3.78, WNBA −1.39). All 95% CIs (except NBA spread) contain 0.
- **Pure +EV bets (Table 2, no thresholds):** Simple — NFL 10.81%, NBA 3.42%, NCAAF −2.49%, NCAAB −1.10%, WNBA 4.38% (742/2386/667/709/226 games bet); Weighted — NFL 5.73%, NBA 0.66%, NCAAF 1.60%, NCAAB 0.94%, WNBA 4.55%.
- **With optimal ε:** Simple — NFL 11.55% (ε=0.34), NBA 4.02% (0.38), NCAAF 2.97% (0.25), NCAAB 1.39% (0.17), WNBA 7.42% (0.20); Weighted — NFL 8.69% (0.12), NBA 1.57% (0.35), NCAAF 6.06% (0.25), NCAAB 2.67% (0.37), WNBA 9.70% (0.16).
- **With optimal ε + EV threshold:** Simple — NFL 16.57% (τ=0.013, 567 bets), NBA 9.04% (0.010), NCAAF 7.29% (0.083), NCAAB 4.07% (0.007), WNBA 17.01% (0.084); Weighted — NFL 9.26% (τ=0.022, 662 bets), NBA 11.18% (0.040), NCAAF 8.04% (0.010), NCAAB 13.02% (0.030), WNBA 12.98% (0.023).
- **Year-by-year (Table 3):** highly variable — e.g., NFL Simple 2011 +76.03% vs 2013 −15.16%; All-leagues Simple weighted ROI peaked at 29.09% (2015); many negative years per sport.
- **Bootstrap (Tables 5–6):** all ROI and ε 95% CIs exclude zero; one-sided 99% CIs exclude zero → Bonferroni-corrected rejection of H₀: optimal ROI = 0 for all sports. E.g., NFL Simple ROI (8.11, 82.85) one-sided 99%; WNBA Simple ROI (7.69, 145.12).
- **Paper's claims:** first single theory finding positive returns across sports; recommends future work on compounding and Kelly sizing (explicitly not used).

## 8. Code / data availability
None stated. Algorithms 1–6 pseudocode printed in the appendix; data sources named (vegasinsider.com, archive.org/web snapshots) but no download/code repository link.

## 9. Leakage & limitations
- **In-sample hyperparameter tuning:** ε and τ are chosen to maximize Total Return on the same 2009–2017 sample used to report ROI; the bootstrap re-runs the *tuning inside each resample*, which tests stability of the arg-max, not out-of-sample validity — there is no true holdout. Year-by-year variance (NFL −15% in 2013, +76% in 2011) shows the headline ROIs are fragile.
- **Best-payout assumption:** the EV uses the *maximum* payout across 16 casinos, but no bettor can simultaneously get the best line on every game with real limits; real-world ROI is lower (authors themselves note no NBBO analogue exists in sportsbooks — this cuts both ways, but bettors routinely face account limits at sharp outliers).
- **Stationarity assumption:** 1990–2017 spread→win-rate table applied to 2009–2017; the model underprices fat tails (their own "Epsilon Threshold" is an ad-hoc patch for this); WNBA and NCAAB samples are thin (255 and 1140 games).
- **NCAAB spread-history and WNBA samples sparse** — authors flag sparsity for WNBA.
- No spread/commission dynamics, no bankroll sizing (explicitly flat $1), no market impact; the "inefficiency" is really cross-book line dispersion (gap list item: market microstructure), not mispricing of fundamentals.

## 10. GSE overlap
The existing-research map (Section 1) lists CLV as a training label, de-vigged consensus, and beat-the-close in the market-microstructure inventory — this paper's cross-casino dispersion→EV pipeline is **new capability** (repo has no win-probability-from-spread-panel model; Stern 1991 is cited by the paper but the repo's map does not list any spread-to-win-probability implementation). The gap list's market-microstructure item (#3) calls for exactly this: when public models beat liquid closes. Not duplicate — extension of the odds lane.

## 11. GSE implementation spec
1. **Build the spread-panel→win-probability table:** using The Odds API (Garrett's existing account, 20K credits/mo) + GSE's backtest odds archive, construct per-book spread→outcome histories for NFL; compute empirical `P(Win|PS)` tables by half-point bucket (and by spread magnitude tail binning to fix the paper's fat-tail problem).
2. **EV screen:** de-vig consensus moneyline across books, compare each book's moneyline against model win probability; flag +EV deviations > threshold.
3. **Harden what the paper skips:** (a) walk-forward hyperparameter selection (tune ε/τ on 2019–2022, report on 2023–2025) instead of full-sample arg-max; (b) achievable-line realism — use consensus or second-best line, not the panel maximum, and log account-limit friction; (c) fractional-Kelly sizing (gap list item #1) instead of flat $1.
4. Data: The Odds API + nflverse scores. Effort: ~1–2 weeks for the NFL prototype.

## 12. Reproducible test
Dataset: NFL 2015–2025 (The Odds API archive + nflverse scores). Build empirical spread→win-rate table on 2015–2018 only; for 2019–2025, apply the Weighted algorithm with ε and τ fixed from a 2019–2021 tuning window, then evaluate ROI on a locked 2022–2025 holdout vs a flat random moneyline baseline. Metric: holdout ROI with 95% CI; secondary: calibration of `P(Win|PS)` (ECE by spread bucket). Success = holdout ROI > 0 with CI excluding 0, or simply well-calibrated `P(Win|PS)` regardless of ROI (the table itself is the asset).

## 13. Acceptance / rejection gate
**Adopt** the empirical `P(Win|PS)` mapping as a GSE odds-lane feature if the locked 2022–2025 holdout shows calibration error (ECE) ≤ 2pp on the spread→win-rate table; **adopt the full +EV screen as a signal** only if holdout ROI is positive with a 95% CI excluding 0 at achievable lines (second-best consensus, not panel max); **reject** the in-sample tuned ROI numbers (Table 2–3) as evidence of edge — they are tuning artifacts until walk-forward confirms them.

## 14. Improvement experiment
Replace the paper's flat per-spread lookup with a **monotonic smooth fit** (isotonic regression of win rate on |spread|, plus asymmetric favorite/dog handling) trained only on pre-tune data, and add a **line-movement overlay**: compute `P(Win|PS)` separately for opening vs closing spreads — the gap between the two is a direct measure of book movement information (steam). If closing-spread-based EV screens beat opening-spread ones, the edge source is book skill; if the reverse, it's stale lines — that distinction is exactly what GSE's market-microstructure lane needs.
