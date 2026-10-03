# [0277] Forecast Sports Outcomes under Efficient Market Hypothesis (arXiv:2604.17194)

**Citation:** Kaito Goto, Naoya Takeishi, Takehisa Yairi (Research Center for Advanced Science and Technology, The University of Tokyo, 2026). *Forecast Sports Outcomes under Efficient Market Hypothesis: Theoretical and Experimental Analysis of Odds-Only and Generalised Linear Models*. arXiv:2604.17194. URL: https://arxiv.org/abs/2604.17194
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4,024 lines, sequential, including §§6.2–6.3 discussion/future work, competition analysis, and all 28 references).
**Verdict:** ADAPT — GSE converts odds into probabilities constantly (consensus ratings, market-implied win probabilities, de-vigged lines, closing-line value). This paper's two methods are direct drop-in upgrades: (1) the OO-EPC odds-only converter, which beats naive normalization for most bookmakers with zero historical data, and (2) the one-parameter FL-GLM, which quantifies favorite-longshot bias per bookmaker/market. Beyond the methods, the paper's EMH discipline — do not fit models that re-capture relationships already priced into odds — is a guardrail GSE's feature engineering needs. Caveat: all validation is soccer 1X2; the NFL analogue (moneyline/spread/total) needs its own calibration before adoption.

## 1. Research question
How should betting odds be converted into accurate outcome probabilities, and which assumptions behind existing converters are actually supported by data? The authors propose two methods: (a) **OO-EPC (Odds-Only Equal-Profitability-Confidence)**, which converts odds to probabilities with no historical data by aligning with the bookmaker's pricing objective (equal confidence in profitability across outcomes); and (b) **FL-GLM (Favourite-Longshot-Bias-Adjusted Generalised Linear Model)**, which fits a single parameter to capture favorite-longshot bias from historical data. Both are motivated by falsifying the assumptions of existing converters (Multiplicative, Shin's two variants, Power) and existing GLMs (multinomial/ordered logistic).

## 2. Dataset / schema
- **Primary:** 90,014 football (soccer) matches, 2012–2024 seasons, five bookmakers (Bet365, Bet&Win, Interwetten, Pinnacle, William Hill), sourced from football-data.co.uk. Outcomes: home win / draw / away win. Features: pre-kickoff decimal odds per outcome per bookmaker; actual results.
- **Competition data:** six iterations (2019–2025) of Kaggle's annual NCAA basketball outcome forecasting competition (March Machine Learning Mania), where the author's OO-EPC-based solution was submitted.
- **Schema:** each record = (match, bookmaker, odds vector x = [x₁,x₂,x₃], outcome one-hot y). No player/team features — deliberately, under the EMH premise.

## 3. Method / model
- **OO-EPC (§4.1, Algorithm 5):** assume the amount of independent bets placed on outcome i is linearly related to inverse odds xᵢ⁻¹ (Proposition 3 proves this follows from the bookmaker's objective of equal profit regardless of outcome). Compute per-outcome standard errors σᵢ = √[xᵢ⁻¹(1−xᵢ⁻¹)/xᵢ⁻¹], the common SE-reduction z = (Σᵢxᵢ⁻¹ − t)/Σᵢσᵢ (t = number of successful outcomes), and output ŷ = x⁻¹ − zσ. Constraint z < xᵢ⁻¹/σᵢ ∀i (booksum slightly > 1); satisfied >99.9% of the time; falls back to multiplicative conversion otherwise.
- **FL-GLM (§4.2, Algorithm 6):** one parameter β fit by gradient ascent on log-likelihood: temporary probabilities Ŷ = X^{−β}, then row-normalized Ŷ̄ᵢⱼ = Ŷᵢⱼ/ΣⱼŶᵢⱼ. Equivalent to power-law regression with an adaptive intercept (Proposition 4), to multiplicative conversion when β = 1 (Property 5), and to power conversion when the normalizer equals 1 (Property 6).
- **Baselines:** odds-only — Multiplicative, numerical Shin, analytical Shin, Power; GLMs — multinomial logistic, ordered logistic regression.
- **Evaluation:** mean log-loss (natural log) per bookmaker; two-tailed bootstrap significance tests at 0.05; Poisson tests for draw-bias counts; booksum–accuracy correlations with p-values; binomial tests for competition results.

## 4. Equations & assumptions
Equations (numbers as in paper):
- **OO-EPC:** σᵢ = √[xᵢ⁻¹(1−xᵢ⁻¹)/xᵢ⁻¹]; z = [(Σᵢ₌₁ᵏ xᵢ⁻¹) − t] / Σᵢ₌₁ᵏ σᵢ; ŷ = x⁻¹ − zσ.
- **Proposition 3:** equal bookmaker profit ∀ outcomes ⇒ bᵢxᵢ constant ⇒ bᵢ ∝ xᵢ⁻¹ (independent bet volume linear in inverse odds).
- **FL-GLM:** ln L = ΣᵢΣⱼ Yᵢⱼ ln Ŷ̄ᵢⱼ; Ŷ = X^{−β}; Ŷ̄ᵢⱼ = Ŷᵢⱼ/ΣⱼŶᵢⱼ; update β ← β + α∇_βL.
- **Proposition 4:** FL-GLM ≡ power-law regression when exp(β₀) = 1/ΣⱼXᵢⱼ^{−β} (adaptive intercept).
- **Property 5:** FL-GLM ≡ multiplicative conversion when β = 1. **Property 6:** FL-GLM ≡ power conversion when the normalizer = 1.
- **Propositions 1–2:** both Shin variants imply that as insider proportion z → 0, booksum s → 1 (t) — i.e., smaller booksums should mean less accurate odds.
- **Proposition 7:** log-loss difference between bookmakers derives the payout ratio: u = exp(−v), v = −ln(x_B⁻¹)+ln(x_A⁻¹) — so log-loss simultaneously measures accuracy and bookmaker profitability.
- **Log-loss:** L(y,ŷ) = −(1/N)ΣᵢΣⱼ₌₁³ yᵢⱼ ln(ŷᵢⱼ).
- Assumptions: EMH (all relevant information in odds); bookmakers target equal profit per outcome; independent bet volume ∝ inverse odds; favorite-longshot bias uniform across outcomes (later shown to fail for draws).

## 5. Features / target
- Features: decimal odds vectors only (odds-only method) or historical (odds, outcome) pairs (FL-GLM). Target: outcome probability vector over home/draw/away.
- Derived quantities: booksum s = (1/t)Σxᵢ⁻¹; inverse odds; fitted β as a per-bookmaker measure of favorite-longshot bias strength.

## 6. Validation design
- **Odds-only comparison (Table 1):** mean log-loss per method per bookmaker over the full 90,014-match history; two-tailed bootstrap tests at 0.05.
- **GLM comparison (Table 2):** same protocol for multinomial logistic, ordered logistic, FL-GLM.
- **Assumption tests (§5.2):** (a) correlation between per-(bookmaker, season) mean log-loss and average booksum (Table 3) — tests Shin's insider assumption; (b) fitted FL-GLM β vs. 1 and mean normalizer vs. 1 (Table 4) — tests multiplicative/power assumptions.
- **Draw bias (§5.3):** expected vs. actual draw counts per method per bookmaker (Figures 1–2), two-tailed Poisson tests.
- **Real-world competition (§6.3):** six Kaggle March Mania iterations using OO-EPC; binomial tests on top-10% finishes and medal rates vs. a uniform-placement null.

## 7. Numerical results / baselines
- **OO-EPC (Table 1):** significantly best mean log-loss for the majority of bookmakers — e.g., Bet&Win 1.00349, Interwetten 1.00449, Pinnacle 1.00428 vs. all existing methods. Exceptions: numerical Shin (1.00336) and Power (1.00334) significantly beat OO-EPC (1.00341) on Bet365; Power (1.00349) significantly beat OO-EPC (1.00359) on William Hill.
- **FL-GLM (Table 2):** significantly superior log-loss to both multinomial and ordered logistic for **all five bookmakers** — e.g., Pinnacle 1.00306 vs. 1.00557/1.00680; William Hill 1.00239 vs. 1.00473/1.00637.
- **Fitted β (Table 4):** 1.06 (Pinnacle) to 1.15 (Interwetten) — above 1 for every bookmaker, confirming favorite-longshot bias; mean normalizer 0.95–0.98 — below 1 everywhere, falsifying the power conversion's implicit normalizer=1 assumption.
- **Shin assumption falsified (Table 3):** booksum–log-loss correlations 0.066–0.109 with p-values 0.41–0.62 — no significant relationship; no evidence that smaller booksums mean less accurate odds.
- **Draw bias (§5.3):** all favorite-longshot-adjusted methods (both Shin variants, Power, OO-EPC, FL-GLM) significantly underestimate draws for most bookmakers (draws are longshots, but the bias is weaker for draws); multiplicative conversion's draw counts do not significantly differ from actuals. Proposed fix: fit separate β_draw < β_decisive (§6.2 likelihood given explicitly).
- **Kaggle results (Tables 5–6):** 5/9 top-10% finishes (binomial p ≈ 0.0009); 5/9 medals (p = 0.0038); 3/9 silver (p = 0.0229); gold 1/9 (p = 0.1225, n.s.). Method acknowledged by 10+ gold-medal and 100+ medal-winning solutions. Women's tournaments more predictable than men's (Table 7: lower medal log-loss thresholds every year).

## 8. Code / data availability
- OO-EPC open-source repo: "Gambling Odds To Outcome probabilities Conversion (goto_conversion)" [12]; author's Kaggle profile [13]. Data: football-data.co.uk (public), Kaggle competitions (public).

## 9. Leakage & limitations
- **Soccer 1X2 only** — no spread/moneyline/total markets; the NFL mapping (especially totals and the push possibility) is unvalidated.
- **Pre-kickoff closing odds only** — no line-movement dynamics, no opening lines, no exchange data; the OO-EPC theory assumes a single bookmaker's balanced-book objective, which may not hold for sharp books or exchanges.
- **Draw-bias defect:** every bias-adjusted method in the paper underestimates draws; the two-β fix is proposed but not empirically tested.
- **Competition analysis is informal:** the author explicitly disclaims causal attribution of Kaggle results to OO-EPC (additional data processing was applied per competition format).
- **One dataset, one sport, five bookmakers:** no test of whether fitted β is stable over time or transfers across leagues.
- For GSE: FL-GLM's single global β would need NFL-specific fitting and possibly separate parameters for moneyline vs. spread vs. total markets.

## 10. GSE overlap
- **Direct upgrade to existing GSE infrastructure.** The existing-research-map already covers de-vigged consensus, market-implied ratings, and CLV — all of which begin with an odds→probability conversion, and all of which (per the map) currently rest on the naive multiplicative normalization this paper shows is dominated. OO-EPC is a zero-data drop-in replacement; FL-GLM gives GSE a one-number-per-market diagnostic (β) for how badly each book/market suffers favorite-longshot bias.
- **New theoretical content:** Propositions 1–2 (Shin limits), Proposition 3 (equal-profit ⇒ linear bet volume), Properties 5–6 (multiplicative/power as special cases of FL-GLM), Proposition 7 (log-loss ≡ payout ratio) — none in the existing corpus.
- **EMH feature-engineering discipline is new to the corpus:** the argument that multinomial/ordered logistic on odds re-capture relationships already priced in (and lose to a one-parameter bias correction) should be applied to GSE's own models wherever odds-derived features are fed back into predictors.
- Adjacent: paper 8's KellyBench uses the divergence edge decomposition g(p;p*,q) = D_KL(p*‖q) − D_KL(p*‖p), which depends on a clean market-implied q — this paper supplies the better q.

## 11. GSE implementation spec
- **Swap GSE's odds→probability normalization to OO-EPC** wherever a no-history conversion is needed (live consensus, closing-line value computation, market-implied win probability feeds). It is parameter-free, analytic, and strictly generalizes the current multiplicative step (fallback included).
- **Fit FL-GLM β per market and per book** on GSE's historical odds: one β for NFL moneylines, one for spreads, one for totals; per sportsbook. Use β as a standing diagnostic — books/markets with β farthest above 1 are where GSE's model edge over the market is largest, and where stake sizing should be most aggressive (KellyBench's edge decomposition makes this actionable).
- **Test the two-β extension for NFL draws/ties and pushes:** the paper's draw-bias finding maps to NFL ties (moneyline) and pushes (spread/total); fit separate bias parameters for these outcomes rather than a global β.
- **EMH guardrail in model review:** any GSE model that takes odds-derived features (consensus, line movement, steam) as inputs must demonstrate, via the paper's §5.2-style test, that it is not merely re-fitting the market — benchmark it against the one-parameter FL-GLM baseline before accepting added complexity.
- **Effort estimate:** 1–2 weeks — OO-EPC is a few lines; FL-GLM is a one-parameter gradient fit; the work is in backfilling GSE's historical odds store and running the per-market calibration.

## 12. Reproducible test
- **Dataset:** GSE's historical NFL odds (2020–2025), at least two sportsbooks + a consensus feed; outcomes: moneyline winner, spread cover, total over/under.
- **Protocol:** (a) convert odds→probabilities with multiplicative, OO-EPC, and FL-GLM (fit per market per book on seasons 2020–2023); (b) score mean log-loss on 2024–2025 holdout; two-tailed bootstrap tests at 0.05 per the paper's Table 1–2 protocol; (c) replicate Table 4: report fitted β and mean normalizer per market per book.
- **Baselines:** current GSE normalization; the paper's soccer numbers as sanity bounds (β ∈ [1.06, 1.15]).

## 13. Acceptance / rejection gate
- **Adopt OO-EPC as the default converter** if it significantly beats multiplicative normalization on holdout log-loss for a majority of (market, book) pairs with no pair significantly worse — mirroring the paper's "majority of bookmakers" criterion.
- **Adopt FL-GLM per-market β fitting** if FL-GLM significantly beats both the current baseline and a one-parameter-free check on holdout, and fitted β is stable year-over-year within ±0.05 (else the bias estimate is noise and the complexity is unjustified).
- **Reject** if OO-EPC fails to beat multiplicative on NFL markets (the bookmaker-objective theory may not transfer from soccer 1X2), or if fitted β ≈ 1 across markets (no favorite-longshot bias to correct — keep the simpler converter).

## 14. Improvement experiment
The paper's own future work (§6.2) proposes a two-parameter FL-GLM with separate β_draw and β_decisive to fix draw underestimation. Run the NFL analogue as the improvement experiment: fit a **three-regime FL-GLM** on spread/total markets with separate bias parameters for (a) favorites, (b) underdogs, and (c) tie/push-adjacent outcomes, and test whether regime-specific β's beat the global β on holdout log-loss. The hypothesis, drawn from the paper's draw-bias finding, is that the favorite-longshot bias is asymmetric in NFL markets (public money overvalues favorites and overs, per GSE's existing market-microstructure notes) — a regime-split correction should capture the edge the global β averages away. If the split wins significantly, promote it to the production converter; if not, the global-β model stands and the asymmetry hypothesis is rejected with evidence.
