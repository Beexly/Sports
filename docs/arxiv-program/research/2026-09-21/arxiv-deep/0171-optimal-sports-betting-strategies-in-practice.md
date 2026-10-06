# [0171] Optimal sports betting strategies in practice: an experimental review (arXiv:2107.08827)

**Citation:** Uhrín, M., Šourek, G., Hubáček, O., Železný, F. (2021). *Optimal sports betting strategies in practice: an experimental review*. arXiv:2107.08827 [q-fin.PM]. URL: https://arxiv.org/abs/2107.08827
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; ar5iv HTML fetch-failed, recorded).
**Verdict:** ADOPT — the first paper directly on Kelly/sizing under probability-estimation uncertainty, filling gap #1 (Kelly under estimation error) in the existing-research map; adopt the fractional-Kelly-with-tuned-fraction sizing rule and the KellyDrawdown / robust-Kelly variants as the GSE sizing protocol.

## 1. Research question
Which bankroll-management ("betting strategy") should a bettor use in practice, where the formal optimality assumptions of the two dominant strategies — Markowitz's Modern Portfolio Theory and the Kelly criterion — do not hold, principally because true outcome probabilities are unknown and only biased estimates (player's model vs. bookmaker's odds) exist? The paper formally defines strategies, reviews their practical risk-management modifications (max-bet limit, fractional approaches, drawdown constraint, distributionally robust optimization), and experimentally compares 10 strategies on 3 real datasets (horse racing, NBA basketball, football) under a strictly unified train/test protocol. (Sec. 1, Sec. 6)

## 2. Dataset / schema
Three proprietary-assembled datasets (models described only by performance; raw data not released):
- **Horse racing:** Korean horse racing market (KRA), "win pool"; **2700 races**; outcomes n ∈ [6,16] horses per race; odds ∈ [1.0, 931.3]; margin 0.2; player acc 0.512, bookmaker acc 0.503; **AKL ≈ 0.0022** (slight player advantage). Model: conditional logistic regression on horse features (inspired by Benter 2008). Parimutuel market converted to fixed-odds using last available pool state. (Sec. 6.1.1, Table 2)
- **Basketball (NBA):** box-score data, **16,000 games, 2000–2015**; moneyline; n=2; odds ∈ [1.01, 41]; margin 0.038; player acc 0.68, bookmaker acc 0.70; **AKL ≈ −0.0146** (model in KL *disadvantage* vs bookmaker). Model: CNN over player/team box-score stats (Hubacek et al. 2019a). Odds: Pinnacle closing lines. Rounds of 10 parallel matches. (Sec. 6.1.2, Table 3)
- **Football (soccer):** **32,000 matches** from world leagues; moneyline (n=3 incl. draw); odds ∈ [1.03, 66]; margin 0.03; player acc 0.523, bookmaker acc 0.537; **AKL ≈ −0.013**. Model: gradient-boosted trees on score-derived features, winner of the 2017 Soccer Prediction Challenge (Hubacek et al. 2019b). Odds: Pinnacle *opening* lines. 10 parallel games per round. (Sec. 6.1.3, Table 4)
- Key metric defined: **AKL** = KL-advantage of player vs. bookmaker (difference of cross-entropies); Kelly's theoretical growth rate is provably proportional to AKL. Access: none of the three datasets are linked in the paper; "None stated" for public access. (Sec. 6.1)

## 3. Method / model
Ten strategies evaluated (Table 1, Sec. 4–5):
- **AbsDisc** (informal): bet fraction = absolute discrepancy between player and bookmaker estimates.
- **MaxEvFrac** (informal): bet optimal fraction on max-EV outcome; hyperparameter ω ∈ [0,1].
- **Kelly**: maximize E[log(O·f)] s.t. Σfᵢ=1, fᵢ≥0 — no hyperparameters.
- **MSharpe**: maximize E[ρ·f]/√(fᵀΣf) (Sharpe ratio, risk-free rate neglected) s.t. Σfᵢ=1, fᵢ≥0.
- **KellyFrac / MSharpeFrac**: fractional — bet ω of calculated portfolio, hold (1−ω) in cash: f_ω = ω·f₁..ₙ₋₁ + (1−ω)·fₙ. ω ∈ [0,1]. Half-Kelly = ω=0.5.
- **KellyFracMax / MSharpeFracMax**: fractional + max-bet limit m ∈ [0,1].
- **KellyDrawdown**: Kelly + drawdown constraint P(Wᵗ_min < α) ≤ β, α,β ∈ [0,1]; convexified via E[(O·f)^(−λ)] ≤ 1 with λ = log(β)/log(α), reformulated as a convex program (Busseti et al. 2016 derivation). (Sec. 5.3, eqs. 5.2–5.5; PDF extraction garbled the exact reformulated forms — see §14 note)
- **KellyRobust**: distributionally robust Kelly — maximize min_{p∈Π} Σ pᵢ·log(Oᵢ·f), box ambiguity set Π = {p : ‖pᵢ − P̂ₚ(rᵢ)‖ ≤ η·P̂ₚ(rᵢ), Σpᵢ=1, pᵢ≥0}, η ∈ [0,1].
- Optimization via cvxpy; ECOS solver primary, SCS fallback. "Quadratic Kelly" (Taylor 2nd-order approx. of log utility → equals MPT with γ = 1/2) presented in Sec. 4.3.1 but NOT in the evaluated strategy list.
- Hyperparameters tuned by grid search on the training split; selection criterion: maximize median(Wf) subject to Q5 > 0.9 (≤5% of trajectories fall below 90% of final wealth) — an explicit "survival first, then profit" rule. (Sec. 6.2.1)

## 4. Equations & assumptions
Problem setup: player allocates fractions fᵢ ∈ [0,1], Σfᵢ ≤ 1 of bankroll W over outcomes rᵢ with odds oᵢ ≥ 1. Net profit per outcome:
- wᵢ = (oᵢ − 1)·fᵢ·W with prob. Pr(rᵢ); wᵢ = −fᵢ·W with prob. 1 − Pr(rᵢ). (2.1)
- E[wi] = Pr(rᵢ)·(oᵢfᵢW − fᵢW) + (1−Pr(rᵢ))·(−fᵢW). (2.2)
- Strategy: g: (p̂, o) ↦ f, where p̂ = player estimate, o = odds. (2.4)
- Excess odds ρ = O − 1, O the odds matrix incl. cash asset c; strategy allocates Σfᵢ = 1 across n−1 risky assets + cash. (2.16–2.19)
- Additive vs multiplicative dynamics: Wₜ = wₜ·1 + W_{t−δt} (additive, rejected) vs Wₜ = wₜ·W_{t−δt} (multiplicative, used). (2.20–2.21)
- Bookmaker margin: m = (Σ 1/oⱼ − 1)/(Σ 1/oⱼ). (2.10)
- MPT: maximize_{f} E[ρ·f] − γ·Var[ρ·f], Σfᵢ=1, fᵢ≥0; Var[ρ·f] = fᵀΣf; for independent outcomes Σ(i,i) = P̂(rᵢ)(1−P̂(rᵢ))ρ_{i,i}². (4.3–4.4) [garbled in PDF extraction; standard form]
- MaxSharpe: maximize E[ρ·f]/√(fᵀΣf), Σfᵢ=1, fᵢ≥0. (4.6)
- Kelly: maximize E[log(O·f)], Σfᵢ=1, fᵢ≥0. (4.7–4.11 incl. quadratic approximation: E[ρ·f − (ρ·f)²/2])
- Fractional: f_ω = ω·f₁..ₙ₋₁ + (1−ω)·fₙ. (5.1)
- Drawdown: P(Wᵗ_min < α) ≤ β (5.2); convexified as E[(O·f)^(−λ)] ≤ 1, λ = log(β)/log(α) (5.3). [Eqs. 5.4–5.5 garbled in PDF extraction — flagged uncertain.]
- Robust Kelly: max_{f} min_{p∈Π} Σᵢ pᵢ·log(Oᵢ·f); Π box set (5.6).
- **Assumptions (stated):** fixed-odds setting; market-taker role only; multiplicative reinvestment; exclusive outcomes within a match (generalized to parallel games with non-exclusive outcomes); Kelly assumes true probability distribution known, same game repeated, infinite horizon — paper explicitly flags these as unrealistic; ruin = wealth falling below 0.01% of initial W₀ at least once (deliberate departure from Kelly's original zero-threshold). (Secs. 2, 4.3, 6.2.2)

## 5. Features / target
Not a prediction paper — no features/target of its own. Inputs to strategies: player's probabilistic estimates p̂ (from the domain models described in §2), bookmaker odds o. Output: portfolio fractions f over outcomes (+cash). Prediction horizon: per match/race (sequential + 10-parallel-games rounds for NBA/soccer).

## 6. Validation design
- Predictive models trained in natural time order; estimates are out-of-sample test outputs. (Sec. 6.2)
- Each dataset split into train/test; hyperparameters tuned on train only, evaluated fixed on test ("strictly unified evaluation protocol").
- **1000 runs** per subset: game order randomly reshuffled and 10% of games removed per run; train/test split respected. Strategy statistics computed over 1000 wealth trajectories W(t) through unseen games.
- Metrics: median(Wf), mean(Wf), min(Wi), max(Wi), σ(Wf), ruin% (ruin = W < 0.01% of W₀ at least once). (Sec. 6.2.2)
- Baselines compared: two informal heuristics (AbsDisc, MaxEvFrac); plain Kelly and MSharpe as formal baselines for the modified variants.

## 7. Numerical results / baselines
Key numbers quoted EXACTLY from Tables 5–7 (final wealth stats; W₀ = 1 implied):
- **Horse racing (Table 5; AKL ≈ +0.0022):** best = **KellyFracMax: median(Wf)=3.49, mean=13.8, min=0.0057, max=168.1, σ=29.3, ruin%=0**. Informal heuristics: AbsDisc ruin 85.2%, median 0.0019; MaxEvFrac ruin 36.1%, median 0.86. Kelly: median 4.11, mean 15.6, max 2167.8, ruin 0.6%; MSharpe: median 3.92, mean 17.8, ruin 12.1%. KellyRobust: lowest wealth (median 2.97, mean 4.1) but most stable (min(Wi)=0.08, σ=7.2, ruin 0). KellyDrawdown: median 3.3, mean 13.7, min 0.009, ruin 0.
- **Basketball (Table 6; AKL ≈ −0.0146, model worse than bookmaker):** plain Kelly: median **9.1e-6**, ruin **100%**; MSharpe: median 1.3e-06, ruin 100%. Fractional versions profitable: **KellyFrac median 2.4, mean 2.7, ruin 0%**; KellyDrawdown median 2.21, mean 2.9, ruin 0; KellyRobust median 1.39, mean 1.46, min 0.23 (highest minimum), ruin 0.
- **Football (Table 7; AKL ≈ −0.013):** Kelly ruin **100%**, median 2.3e-09; MSharpe ruin 100%. **KellyDrawdown best: median 10.25, mean 12.4, min 0.09, max 122, σ 9.3, ruin 0**. KellyFrac median 10.05; MSharpeFracMax median 10.1; KellyRobust median 6.2, mean 7.3, min 0.28 (highest minimum again), ruin 0.
- **Paper's headline findings (Sec. 6.3, 7):** informal heuristics clearly inferior; plain Kelly/MSharpe led to *ruin* (100% in both AKL<0 scenarios) instead of maximal profit under uncertain estimates; fractional Kelly achieved best or near-best on chosen metrics across experiments and is the recommended practical default "given that the fraction hyperparameter has been properly tuned to reflect the amount of uncertainty in each particular problem setting"; Kelly drawdown performed very similarly to fractional Kelly; robust Kelly was the safest (highest minimal final wealth) but lowest-wealth; max-bet limit was inconclusive (helped in horse racing, hurt in basketball); Kelly strategies gave higher *median* final wealth, MPT strategies higher *mean* final wealth (EV motivation). A smart strategy modification can generate profits even in AKL-disadvantageous scenarios. Hyperparameter selection noted as possibly "slightly biased in favour of the Kelly approaches."

## 8. Code / data availability
None stated. No code/data links in the paper. (Solver: cvxpy/ECOS/SCS named; models: Hubacek et al. 2019a/b, Benter 2008.)

## 9. Leakage & limitations
- Authors disclose the hyperparameter selection criterion (maximize median Wf subject to Q5>0.9) may be "slightly biased in favour of the Kelly approaches" (Sec. 6.3) — verdict-relevant caveat, self-flagged.
- Dataset availability: none of the three datasets are released; KRA racing data proprietary; the NBA/soccer predictive models are from the authors' own prior work and not released — replication requires rebuilding models (acc values given as targets: NBA accp=0.68, soccer accp=0.523).
- Pinnacle odds used; KRA parimutuel-to-fixed-odds conversion via last pool state introduces modeling noise (acknowledged, Sec. 6.1.1).
- Reshuffling + 10% removal per run destroys strict temporal structure in strategy evaluation (trajectories are iid-scrambled, though models' predictions were time-ordered); variance across runs may be understated.
- Football dataset used Pinnacle *opening* lines (not closing) — more favorable than realistically attainable; basketball used closing lines. Inconsistent across datasets.
- External validity to NFL: basketball (n=2, moneyline) closest analog to NFL moneyline; soccer (n=3, 10 parallel games) closest to multi-game weekly NFL slates. Horse racing (n up to 16, high margin 0.2) least analogous. No spread/total markets studied — moneyline only.
- PDF-extraction garbling on equations 5.4–5.5 (drawdown convex reformulation) — reconstruction uncertain; consult Busseti et al. 2016 ("Risk-constrained Kelly gambling," arXiv:1603.06183) for the clean derivation.

## 10. GSE overlap
- **Fills existing-research-map GAP #1 (top priority): "Kelly criterion / optimal bet sizing under uncertainty — mentioned 12× in repo, zero papers read."** Direct hit: fractional Kelly with tuned fraction, Kelly-with-drawdown-constraint, and distributionally robust Kelly are exactly the fractional-Kelly/estimation-error techniques the gap list asks for.
- Repo mentions Kelly 12× but has no sizing protocol; the prediction-market lane mentions Wang Transform (oracle3) — this paper provides the complementary portfolio-of-bets sizing machinery under probability uncertainty, including parallel-games (multi-bet slate) portfolios via the odds-matrix O formulation (Sec. 2.4–2.4.1) — relevant to GSE's daily multi-pick cards.
- No overlap/duplication: repo has no MPT/Kelly sizing study; the 1211.4000 and PLOS ONE 2023 papers are on market efficiency, not sizing. Extension, not duplicate.
- Note for CEPT lane: AKL (KL-advantage of model vs bookmaker) as the driver of Kelly growth is a metric worth adopting alongside CLV in the engine's sizing calibration.

## 11. GSE implementation spec
- **Sizing module spec:** implement strategy g:(p̂,o)↦f for GSE's daily pick slate (NFL moneyline/spread/total legs as n-outcome assets, 10+ parallel games = the parallel-games formulation). Components: (a) fractional-Kelly core with fraction ω tuned on walk-forward backtest (grid ω ∈ [0,1], selection rule = maximize median bankroll growth s.t. ≤5% of trajectories draw down below 90% — the paper's "survival first" criterion, Sec. 6.2.1); (b) drawdown-constraint variant (Busseti et al. 2016 convex program via cvxpy) as the production safety rail; (c) robust-Kelly box variant as the conservative mode for low-confidence slates. Reuse GSE's existing pick probabilities p̂ (engine model v5.2.7) and Odds API consensus odds.
- **Effort:** ~2–3 days (cvxpy portfolios, grid search, 1000-run bootstrap eval harness mirroring Sec. 6.2).

## 12. Reproducible test
- Dataset: GSE engine pick history 2024–2025 NFL seasons (picks table in Neon Postgres) with recorded model probabilities and closing odds; treat as the "player/bookmaker" pair.
- Metric: median final wealth and ruin% over 1000 bootstrap runs (reshuffled slates, 10% removal), exactly per Sec. 6.2.2.
- Baselines: (i) flat betting (current GSE default), (ii) plain full Kelly, (iii) fractional Kelly ω=0.5 fixed.
- Window: full 2024 + 2025 NFL seasons; AKL of engine vs. closing-line-implied probabilities computed first and reported.

## 13. Acceptance / rejection gate
**Adopt fractional/drawdown-Kelly as the GSE sizing protocol iff** on the 2024–2025 NFL backtest the tuned-fraction Kelly (or KellyDrawdown) achieves (a) ruin% ≤ 1%, (b) median final wealth ≥ 110% of the flat-betting baseline's median, and (c) beats fixed half-Kelly (ω=0.5) on median wealth. **Reject** (keep flat/uniform sizing) if ruin% > 1% or median ≤ flat-betting baseline.

## 14. Improvement experiment
**Adaptive fraction ωₜ driven by live AKL estimates:** instead of grid-searching a fixed ω, estimate the engine's rolling KL-advantage vs. the bookmaker on a trailing 8-week window and set ωₜ ∝ clipped(AKL_rolling)/AKL_target, floored at 0 (no-bet) — a dynamic "fraction reflects current uncertainty" rule that operationalizes the paper's own recommendation ("fraction hyperparameter has been properly tuned to reflect the amount of uncertainty in each particular problem setting") and extends the paper's static-grid approach. Expected to beat fixed-ω during regime changes (e.g., engine recalibration periods). Second experiment: extend the drawdown constraint to a *portfolio-level* daily loss limit across the whole slate rather than per-bet, which the parallel-games formulation (Sec. 2.4.1) supports but the paper didn't test.

---
*Equation-uncertainty note: eqs. 5.4–5.5 (Busseti drawdown convex reformulation) garbled in PDF extraction — reconstruction uncertain; Busseti et al. 2016 is the clean reference. Eqs. 4.3/4.4/4.6/4.11 MPT–Sharpe forms partially garbled but standard; verified against Markowitz forms. Table 5–7 numbers quoted verbatim from PDF text.*
