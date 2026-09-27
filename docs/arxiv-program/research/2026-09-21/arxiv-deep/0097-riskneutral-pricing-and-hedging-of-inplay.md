# [0097] Risk-Neutral Pricing and Hedging of In-Play Football Bets (arXiv:1811.03931)

**Citation:** Peter Divos, Sebastian del Bano Rollin, Zsolt Bihari, Tomaso Aste (2018). *Risk-Neutral Pricing and Hedging of In-Play Football Bets*. arXiv:1811.03931v1. URL: https://arxiv.org/abs/1811.03931
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1163 lines).
**Verdict:** ADAPT — the compensated-Poisson risk-neutral pricing framework, implied-intensity calibration, and "next score" delta-hedging machinery port directly to NFL live totals/spreads; the constant-intensity soccer model itself needs a drive/clock-aware extension for football.

## 1. Research question
Can the Fundamental Theorems of Asset Pricing be applied to in-play football (soccer) betting — treating bets as derivatives on goal processes — to get arbitrage-free closed-form prices, a calibration procedure to market quotes, and a dynamic replication/hedging scheme? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Betfair in-play market data**, UEFA Euro 2012: best buy/sell quotes at 1-minute steps for Match Odds, Over/Under, Correct Score (31 bet types total). Showcase game: Portugal vs Netherlands, 22 June 2012 (final 2–1 Portugal; half-time 1–1).
- 10 Euro 2012 games used for calibration/replication statistics (Table 1 / Table 3 lists).
- **Access:** not shared (Betfair historical data is commercial); no download link.

## 3. Method / model
- **Score model:** two independent time-homogeneous Poisson processes N¹_t, N²_t with physical intensities μ₁, μ₂ (home/away goals).
- **Artificial underlying assets** (the score itself isn't tradable): S¹_t = N¹_t + λ₁(T−t), S²_t = N²_t + λ₂(T−t) — compensated Poisson processes; risk-free bond B_t = 1 (no interest over a match's length). λ₁, λ₂ are constants not necessarily equal to μ₁, μ₂.
- **Theorem 3.6:** unique equivalent martingale measure Q exists via Girsanov for point processes (dQ/dP = L_t, Eq. 5–6); under Q, N^i are Poisson with intensities λ₁, λ₂. Q is unique.
- **Theorem 3.8:** market is arbitrage-free AND complete (first + second fundamental theorems) → every bet replicable.
- **Pricing:** Corollary 3.9 — X_t = E^Q[X_T | F_t]; closed form for European bets (Prop. 3.15): X_t = Σ_{n₁≥N¹_t} Σ_{n₂≥N²_t} Π(n₁,n₂) P(n₁−N¹_t, λ₁(T−t)) P(n₂−N²_t, λ₂(T−t)), with P(N,Λ) the Poisson pmf.
- **Greeks (Def. 3.18):** δ₁X_t = X_t(t, N¹_t+1, N²_t) − X_t(t, N¹_t, N²_t) ("delta" = jump on a home goal); δ₂ similarly; ∂_tX_t is "theta".
- **Kolmogorov forward equation (Thm. 3.19):** ∂_tX_t = −λ₁δ₁X_t − λ₂δ₂X_t (20); delta-neutral ⟺ theta-neutral (Remark 3.20).
- **Replication (Prop. 3.12, 3.22):** any bet X_T replicated by dynamic positions in *any two linearly independent bets*; weights φ¹_t = δ₁X_t, φ²_t = δ₂X_t. **Next Goal bets are the natural hedging instruments**: their delta matrix [[1−Z^NG1, −Z^NG2],[−Z^NG1, 1−Z^NG2]] stays nonsingular even at large goal differences, whereas Match Odds deltas collapse to 0/1 (weights blow up).
- **Calibration (Sec. 4):** least squares on market mid prices weighted by bid-ask spread, minimizing the cost R(λ₁,λ₂) (Eq. 26) — the average distance of model prices from mid prices in units of bid-ask spread; 2 parameters fit 31 bet quotes per minute-step.
- **Bet value convention:** X_t = 1/Decimal_t = 1/(Fractional_t + 1) (Eq. 1).

## 4. Equations & assumptions
- Bet value ↔ odds: `X_t = 1/Decimal_t = 1/(Fractional_t + 1)` (1)
- Underlyings: `S¹_t = N¹_t + λ₁(T−t)`, `S²_t = N²_t + λ₂(T−t)` (2); `B_t = 1`
- Risk-neutral pricing: `X_t = E^Q[X_T | F_t]` (7)
- Replication: `X_t = X_0 + ∫₀ᵗ ψ¹_s dZ¹_s + ∫₀ᵗ ψ²_s dZ²_s` (10/28); hedge weights solve the delta-matching system (29)
- European-bet pricing (14): `X_t = Σ_{n₁=N¹_t}^∞ Σ_{n₂=N²_t}^∞ Π(n₁,n₂) P(n₁−N¹_t, λ₁(T−t)) P(n₂−N²_t, λ₂(T−t))`
- Forward equation: `∂_tX_t = −λ₁δ₁X_t − λ₂δ₂X_t` (20); sensitivity: `∂X_t/∂λ_i = (T−t)·δ_iX_t` (21)
- Replicating weights: `φ¹_t = δ₁X_t, φ²_t = δ₂X_t` (22–23)
- Next Goal values: `Z^{NG1}_t = [λ₁/(λ₁+λ₂)]·[1 − e^{−(λ₁+λ₂)(T−t)}]` (A1/30); `Z^{NG2}_t = [λ₂/(λ₁+λ₂)]·[1 − e^{−(λ₁+λ₂)(T−t)}]` (A2/31)
- Odd/Even: `X_t = exp[−(Λ₁+Λ₂)]·cosh(Λ₁+Λ₂)` (Odd), `exp[−(Λ₁+Λ₂)]·sinh(Λ₁+Λ₂)` (Even); Winning Margin K via Skellam + modified Bessel B_{|K−N¹_t+N²_t|}(2√(Λ₁Λ₂)) (Table A1; exact fraction layout garbled, standard forms)
- Implied total-intensity dynamics: `d ln(λ¹_t+λ²_t) = μ dt + σ dW_t` (27), estimated μ = 0.55 ± 0.16 (1/90min), σ = 0.51 ± 0.19 (1/√90min)
- Assumptions: goals are independent homogeneous Poisson (constant λ); frictionless continuous trading, no costs, short-selling allowed; no red cards/weather/state dependence (authors cite Vecer et al. 2009 as an extension).

## 5. Features / target
- **Inputs:** current score (N¹_t, N²_t), time t, calibrated risk-neutral intensities (λ₁, λ₂).
- **Target:** arbitrage-free price X_t ∈ [0,1] of any in-play bet (Match Odds, Over/Under, Correct Score, Next Goal, Odd/Even, Winning Margin, Half Time/Full Time), plus replicating portfolio weights.

## 6. Validation design
- **Calibration fit:** 2 parameters vs 31 simultaneous market quotes, per minute-step, 10 Euro 2012 games — goodness measured in bid-ask-spread units (Eq. 26).
- **Replication test:** jump-matching — at each goal, compare the jump in actual market contract values vs the replicating portfolio's jump (Next Goal instruments); correlation across all bet types and goals per game.

## 7. Numerical results / baselines
- **Calibration error: mean 1.57 ± 0.27 bid-ask spreads** across 10 games (Table 1; e.g., Portugal–Netherlands 1.18, Spain–Italy 2.21) — "on average, the calibrated values are outside of the bid-ask spread, but not significantly" for a 2-parameter model on 31 quotes.
- **Implied intensities are NOT constant:** clear increasing trend over the match (consistent with Dixon & Robinson 1998 on 4,012 matches); log-total-intensity drift μ = 0.55 ± 0.16 /90min, vol σ = 0.51 ± 0.19 /√90min (Table 2).
- **Replication jump correlation: mean 80%, std 19%** (Table 3; Portugal–Netherlands 89%, Germany–Italy 99%, Spain–Rep. of Ireland 98%, Italy–Croatia 47%, Sweden–England 50%).
- Authors' caveat: "hedging errors can sometimes be significant due to the fact the implied intensities are in practice not constant."

## 8. Code / data availability
Not stated (no code; Betfair data commercial).

## 9. Leakage & limitations
- Constant-intensity assumption is empirically false *within* the paper (implied λ trends upward) — the pricing is exact only under the assumed model; the authors point to stochastic-intensity (Jottreau 2009, CIR-driven Cox) as the fix.
- No transaction costs, no market impact, continuous rebalancing assumed — real hedging degrades.
- Replication tested only on jump-matching at goals, not full P&L of a hedged book.
- Two weak games (Italy–Croatia 47%, Sweden–England 50%) show the model misfires when intensities shift abruptly (state changes like red cards are unmodeled).

## 10. GSE overlap
Poisson/Dixon-Coles/Skellam are inventoried (existing-research map, Section 1 — metrics inventoried list) **Nothing in the repo covers in-play risk-neutral pricing, implied-intensity calibration to live markets, or delta-hedging of live positions** — the research map flags in-play spread/total modeling as a thin lane. No duplicate; this is the lane's theoretical foundation paper.

## 11. GSE implementation spec
1. **Port to NFL live totals:** replace goal-Poisson with a **drive-level scoring process** — each drive is a "jump" with points {0,2,3,6,7,8}; model drive outcomes as a marked point process with time-varying intensity λ(t, score-diff, field-position regime).
2. Define tradable underlyings as compensated drive-point processes (same construction as S¹_t, S²_t); calibrate λ to live market totals (consensus books) by the same bid-ask-weighted least squares — this yields **implied scoring intensities** per team per game state.
3. Compute in-play "deltas": ΔX on next score for each team; hedge live total exposure with "next score" props (the direct analogue of Next Goal bets, which books actually offer).
4. Start with the constant-intensity closed forms (Poisson sums, Eq. 14) as the baseline pricer; upgrade to CIR-stochastic intensity per Jottreau 2009 once the desk needs it.
5. Effort: ~2–3 weeks for the baseline pricer + calibration harness against one season of live odds (Odds API account exists — 20K credits/month).

## 12. Reproducible test
Dataset: 2024 NFL season, 1-minute live total/moneyline quotes (Odds API snapshots) for 50 games + nflverse drive data. Calibrate constant-intensity Poisson pricer per game; evaluate: (a) calibration error in units of live bid-ask spread vs the paper's 1.57 benchmark; (b) jump-matching — at each scoring play, correlation between model-implied total jump and market total jump (paper's 80% benchmark). Success = calibration error ≤ 2.0 spreads AND jump correlation ≥ 0.70.

## 13. Acceptance / rejection gate
**Adopt** the risk-neutral in-play pricer as GSE's live-totals engine if the reproducibility test hits calibration error ≤ 2.0 bid-ask spreads with jump correlation ≥ 0.70 on 2024 holdout games; **reject** if intensities must be re-fit so often that the "constant λ" closed forms add nothing over a direct empirical jump model — then keep only the implied-intensity calibration idea.

## 14. Improvement experiment
The paper's own data rejects constant intensities (drift μ = 0.55/90min). Build the **state-dependent intensity** the authors defer: λ_i(t) = λ_i^0 · f(score differential, time remaining, red-zone rate) — for NFL, λ(drive outcome) conditioned on (down, distance, field position, clock, score diff) from nflverse EPA tables. This is exactly Dixon & Robinson (1998)'s state-dependent Poisson, ported to football drives, and it converts the paper's theoretical hedge into a calibrated trading desk: price = E^Q under the *state-dependent* intensities, hedge ratios = state-dependent deltas.
