# [0240] The reaction to news in live betting (arXiv:2108.00821v2)

**Citation:** Ötting, M., Michels, R., Langrock, R., & Deutscher, C. (2021). *The reaction to news in live betting*. arXiv:2108.00821v2. URL: https://arxiv.org/abs/2108.00821
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2805 lines).
**Verdict:** ADAPT — first stake-level (not odds-level) study of live-betting response to news; the overreaction-to-surprising-news finding is directly GSE-relevant market-microstructure evidence, but the 1 Hz bookmaker stake data is proprietary, so GSE adapts the state-space design to odds-derived proxies (line movement as handle proxy) rather than replicating stakes.

## 1. Research question
How do live-betting markets react to news — specifically, how do stakes placed (money wagered) respond to goals (major news), to goal surprise level, and to general outcome uncertainty — once the market's latent activity level is accounted for? The paper is, to the authors' knowledge, the first to model stakes (rather than odds) in live betting, using bookmaker data rather than exchange data.

## 2. Dataset / schema
- **Stakes data:** high-resolution (1 Hz, aggregated to 15-second intervals) stakes placed on match-outcome bets (home/away win) during all 306 German Bundesliga 2018/19 matches, provided by a large European bookmaker. 306 matches × 2 teams = 612 time series; 274,778 intervals total; each match ≥420 intervals (90 min + 15 min halftime + injury time). 969 goals observed, avg 3.2/match. Stakes multiplied by an undisclosed constant (absolute values masked). Schema per interval t of series n: y_{n,t} (scaled stakes), open_t (market open dummy), halftime_t, int_t (remaining intervals), gini_t (Gini of bookmaker implied probabilities), ginidiff_t (gini_t − gini_1), goalteam_t (intervals since last goal), goaltype classification. Access: proprietary bookmaker data — unreplicable.
- **Static covariates:** clubelo.com Elo ratings (mean 1675, SD 104.2, range 1469–1980) for both teams; kick-off time dummies (friday 0.095, saturdayaft 0.513, saturdayeve 0.101, sunday 0.216, weekday 0.075 reference).
- **Descriptives (Table 1):** stake mean 3.755, SD 8.347, min 0, max 1027 (scaled units); open 0.908; halftime 0.149; remaining intervals int 210.1±121.7; goalteam 47.85±79.22; gini 0.544±0.297; ginidiff 0.205±0.292 (range −0.794 to 0.916).
- **Goal surprise classification** by pre-goal odds: surprising (odds >4.00, implied win prob <25%), slightly surprising (odds 2.00–4.00, 25–50%), unsurprising (odds <2.00, >50%).

## 3. Method / model
- **Baseline SSM:** observed stakes y_t ~ ZAGA(μ_t, σ, π_t) (zero-adjusted gamma = gamma + point mass at zero). μ_t = exp(α₀ + g_t); latent state g_t = φ g_{t−1} + η_t, η_t ~ i.i.d. N(0, σ_g²), |φ|<1 (stationary), g₁ ~ N(0, σ_g/√(1−φ²)). π_t = π if open_t=1, =1 if market closed (bookmakers suspend after goals/red cards).
- **Covariates in state-dependent process:** μ_t = exp(α₀ + α₁·eloteam + α₂·eloopp + Σ ω_j·kickoff_j + g_t); π_t = logit⁻¹(γ₀ + γ₁·gini_t + γ₂·gini_t² + γ₃·int_t + γ₄·gini_t·int_t + γ₅·gini_t²·int_t) (quadratic + interactions on outcome certainty).
- **Covariates in state process (final model, ARX(1)):** g_t = φ g_{t−1} + β₁·halftime_t + β₂·ginidiff_t + Σ_{j=3..5} β_j·(1/goalteam^{(j)}_t) + σ_g η_t, where j=3/4/5 = surprising/slightly/un surprising goals; 1/goalteam encodes rapid decay (effect strongest right after the goal).
- **Estimation:** Kitagawa (1987) midpoint-rule discretization of the continuous state into m=150 bins over [−4, 4] → m-state HMM; likelihood via forward algorithm ℒ_approx = δP(y₁)ΓP(y₂)…ΓP(y_T)1, O(Tm²); numerically maximized in R via nlm() with reparameterization for constraints, scaling for underflow, many random starts (local maxima); full-data likelihood = product of 612 independent series likelihoods. Approximation validated as virtually exact for m≥50 (m=100 conservative).

## 4. Equations & assumptions
Core mathematics, quoted faithfully:
- General SSM: y_t = a(g_t, ε_t), g_t = b(g_{t−1}, η_t) (eq. 1).
- ZAGA: y_t ~ ZAGA(μ_t, σ, π_t) with f(y_t) = π_t if y_t=0; (1−π_t)h(y_t) if y_t>0, h = gamma density parameterized by (mean μ_t, SD σ).
- State dynamics: μ_t = exp(α₀ + g_t), g_t = φ g_{t−1} + η_t, η_t ~ iid N(0, σ_g²).
- Extended mean: μ_t = exp(α₀ + α₁·eloteam + α₂·eloopp + ω₁·friday + ω₂·saturdayaft + ω₃·saturdayeve + ω₄·sunday + g_t).
- Zero probability: π_t = logit⁻¹(γ₀ + γ₁·gini_t + γ₂·gini_t² + γ₃·int_t + γ₄·gini_t·int_t + γ₅·gini_t²·int_t) if open_t=1; π_t=1 if open_t=0.
- ARX(1) state: g_t = φ g_{t−1} + β₁·halftime_t + β₂·ginidiff_t + Σ_{j=3}^{5} β_j·(1/goalteam^{(j)}_t) + σ_g η_t.
- Likelihood integral: ℒ(θ) = ∫…∫ f(g₁)f(y₁|g₁) ∏_{t=2}^T f(g_t|g_{t−1}) f(y_t|g_t) dg_T…dg₁; discretized: ℒ(θ) ≈ h^T Σ…Σ f(b⋆_{i₁})f(y₁|…)∏ f(b⋆_{i_t}|g_{t−1}=b⋆_{i_{t−1}}) f(y_t|g_t=b⋆_{i_t}).
- HMM recursion: ℒ_approx = δP(y₁)ΓP(y₂)ΓP(y₃)…ΓP(y_{T−1})ΓP(y_T)1 with δ_i = h f(b⋆_i), γ_{ij}^{(t)} = h f(b⋆_j | g_{t−1} = b⋆_i).
**Assumptions:** 612 series independent (notably: the two series per match — home-team bets and away-team bets — are modeled independently; the authors flag this and propose a bivariate/VAR extension); continuous latent market-activity level is the right granularity (no discrete regimes); Gini of implied probabilities is a valid proxy for outcome certainty; 1/goalteam decay form captures news decay; independence across matches; m=150 binning is near-exact (validated by checking stability under increased m/width).

## 5. Features / target
Target: y_{n,t} = scaled stakes placed in 15-second interval t on team n's win (n=1…612 series). Static features: eloteam, eloopp, kickoff-time dummies. Market-dynamic features: open_t, halftime_t, int_t (remaining intervals), gini_t (quadratic + interactions) — used in the zero-probability (π_t) predictor. News features in state process: halftime_t, ginidiff_t (change in Gini vs kickoff; negative = more uncertain than at start), 1/goalteam^{(j)}_t for j ∈ {surprising, slightly surprising, unsurprising} goals. No prediction horizon — contemporaneous explanatory modeling, not forecasting.

## 6. Validation design
- No train/test split; full-sample maximum likelihood on all 612 series (274,778 observations).
- Model comparison via AIC: SSM vs no-state regression (ΔAIC = 217117 in favor of the state-space formulation).
- Model checking: simulation-based posterior checks — for each goal, sum of actual stakes in the 3 minutes after the goal vs average over 500 Monte-Carlo simulated series under the final model, split by goal-surprise category (Figure 4); zero-interval check: model predicts no stakes in 7.3% of intervals vs true 7.2%; correctly predicts 96.5% of intervals where stakes were placed. Example match (Dortmund vs Schalke) visual comparison of actual vs simulated stake paths.

## 7. Numerical results / baselines
- **Baseline model (Table 2):** φ̂ = 0.985, 95% CI [0.984, 0.986] — very strong serial correlation in latent market activity; σ̂_g = 0.227 [0.223, 0.230]; α̂₀ = 0.642 [0.590, 0.693]; σ̂ = 0.872 [0.870, 0.873]; π̂ = 0.074 [0.072, 0.075] matching empirical zero proportion 0.072.
- **State-dependent covariates (Table 3):** α̂₁ (eloteam) = 0.439 [0.393, 0.485] (better teams attract more money); α̂₂ (eloopp) = −0.255 [−0.300, −0.211]; ω̂₂ (saturdayaft) = −0.260 [−0.431, −0.088] (stakes higher when no parallel matches). Zero-probability: γ̂₁ (gini) = −10.054, γ̂₂ (gini²) = 14.605, γ̂₃ (int) = −0.542, γ̂₄ = 3.638, γ̂₅ = −4.291 — bettors prefer uncertain matches; P(zero stake) rises with Gini, especially late in matches.
- **Final model (Table 4, news in state process):** φ̂ = 0.968 [0.967, 0.970]; σ̂_g = 0.202 [0.198, 0.207]; β̂₁ (halftime) = 0.002 [0.000, 0.005] — slightly elevated halftime activity (agrees with Croxson & Reade 2014); β̂₂ (ginidiff) = −0.094 [−0.099, −0.089] — activity rises when the match becomes MORE uncertain than at kickoff; β̂₃ (surprising goal) = 0.531 [0.494, 0.567]; β̂₄ (slightly surprising) = 0.218 [0.176, 0.261]; β̂₅ (unsurprising) = 0.034 [0.001, 0.067]. Paper's interpretation: bettors overreact to surprising news — activity on the scoring team jumps even though odds have already shortened, consistent with overconfidence/overreaction biases (De Bondt & Thaler 1985; cited NFL-specific analogue: Durand et al. 2021 "Behavioral biases in the NFL gambling market").
- **Key directional claims:** surprisingly, unsurprising goals barely move activity; the overreaction is concentrated in surprising goals (more than 15× the unsurprising effect: 0.531 vs 0.034).
- **Model checks:** 3-minute post-goal stake sums match simulated expectations well across goal categories; only notable mismatch: actual stakes slightly BELOW model expectation for slightly surprising goals.

## 8. Code / data availability
None stated. No code links, no data links. Data is proprietary (European bookmaker, 1 Hz stakes); states "not allowed to provide any information on the actual stakes."

## 9. Leakage & limitations
- **Data unreplicable by design:** proprietary bookmaker stake feed at 1 Hz; stakes masked by scaling constant; no public path to equivalent data. The finding rests on one bookmaker's clientele in one league-season (Bundesliga 2018/19) — single book, single season, 306 matches.
- **No out-of-sample test:** full-sample fit; validation is in-sample simulation checks only. AIC comparison only against the no-state variant.
- **Endogeneity concern (paper's own framing):** the model explains stakes contemporaneously with covariates derived from odds (gini, ginidiff, surprise) — odds and stakes co-evolve; the direction of causation (news → stakes vs stakes → bookmaker odds adjustment) is not identified.
- **Independence across the two series of the same match** is the acknowledged weakness: bets on home and away in the same match surely interact (substitution); authors propose a bivariate VAR extension but don't fit it.
- **External validity to NFL:** soccer live betting is 55%+ of European handle with 1 Hz data; NFL in-play betting structure differs (commercial breaks, fewer/lumpier scoring events, US books vs European bookmaker). The behavioral mechanism (overreaction to surprising in-game news) is claimed to be general — and there is a direct NFL citation in the paper (Durand et al. 2021) — but the magnitudes (0.531 on scaled stakes) don't transfer.

## 10. GSE overlap
- **Gap-filling:** the existing-research-map §4 GAP LIST item 3 reads: "Market microstructure in sports betting — only 1211.4000 + PLOS ONE 2023. Order flow, steam-move predictability, limit-order-book analogues, when public models beat liquid closes: thin." This paper is squarely in that gap — stake-level (order-flow-like) live-market microstructure with a latent activity state. Repo currently tracks CLV, de-vigged consensus, beat-the-close, steam, benbbaldwin market-implied tiers (§1: "Market microstructure"), but nothing on bettor reaction to in-game news or overreaction dynamics.
- **Related but not duplicate:** references cite Choi & Hui (2014) in-play soccer overreaction, Durand et al. (2021) NFL overreaction — neither is in the repo's read list. GSE's current microstructure work is pregame/closing-line focused; live in-play response to news is NEW capability territory.

## 11. GSE implementation spec
1. **Translate "stakes" to what GSE can observe:** GSE has no bookmaker stake feed. Proxies: (a) 1-minute odds-change velocity from The Odds API / oddsPapi / APIVault (existing accounts per 2026-09-18 memory: baxley.garrett@gmail.com accounts on oddspapi.io, apivault.uk, etc.); (b) public betting-split data (tickets/handle percentages) from freepublicapis.com-class sources; (c) steam-move alerts (existing repo coverage: line movement/steam).
2. **Adapted SSM:** fit the paper's ARX(1)+ZAGA design on NFL in-play spreads/totals using odds-velocity as the observable, with news covariates: touchdowns/turnovers classified by surprise (pre-play win probability from nflfastR's wp, thresholds at <25% / 25–50% / >50% exactly as the paper's odds bins), ginidiff-style uncertainty change (Δ in de-vigged no-vig win probability vs kickoff). ZAGA handles the zero-inflation (many 1-minute windows with no line move).
3. **Product use:** the overreaction finding becomes a *timing rule* for GSE content/betting ops: after a surprising in-game event (e.g., underdog TD), the public overreacts → lines move too far → contrarian value emerges on the other side within the next few minutes. Validate as a signal for the engine's live lane (GAP LIST item 7: "In-play / live NFL spread & total modeling — iWinRNFL covers in-game WP; live spread/total probability surfaces are thin").
4. **Effort:** ~3–4 days (in-play odds capture pipeline + ARX-ZAGA fitting harness + surprise classification from nflfastR wp). The estimation recipe (Kitagawa binning → HMM forward algorithm) is fully specified and reusable for any continuous-latent-state problem in the engine.

## 12. Reproducible test
- **Dataset:** NFL 2022–2024 regular seasons. Per-game 1-minute in-play spread series from The Odds API (captured prospectively or reconstructed from archived odds where available); nflfastR play-by-play for event times and pre-play wp.
- **Metric:** fit the ARX(1) state model with surprise-classified news covariates on 2022–2023; on 2024 holdout, test whether the fitted β_surprising > 0 with 95% CI excluding zero (replication of the paper's headline: overreaction to surprising news) AND whether post-surprising-event line moves predict subsequent 15-minute line reversion (mean-reversion regression: Δline_{t+1..t+15} on event surprise class; expect negative coefficient for surprising events).
- **Baseline:** constant-mean (no news covariate) model — require ΔAIC-equivalent likelihood-ratio p<0.01 on 2024 holdout for the news-augmented model.

## 13. Acceptance / rejection gate
ADOPT the adapted design if BOTH hold on the 2024 holdout: (1) the surprising-news coefficient β̂_surprising > 0 with 95% CI excluding zero (behavioral replication); (2) a contrarian rule (fade the line move after surprising events, take the pre-event fair price side) shows positive mean CLV per event at ≥ +0.5% average with a two-sided p<0.05 on ≥100 surprising events; REJECT if either fails or if <100 surprising events are observed in the window (insufficient data to claim the effect).

## 14. Improvement experiment
Go beyond the paper with **bettor-heterogeneity via ticket-vs-handle splits**: the paper can't see individual bettors and models aggregate stakes. GSE can decompose the observable into ticket count (number of bets) vs handle share (money) where public split data exists, fitting the ARX state to each separately — testing whether the overreaction is driven by many small tickets (retail overreaction, consistent with the paper's cognitive-bias story) or a few large ones (sharp repositioning). If retail tickets drive the post-surprise spike while handle stays flat, the contrarian fade is even cleaner (dumb money moves the number without information). This directly extends the paper's Discussion section, which explicitly flags individual-bettor heterogeneity as the key limitation.
