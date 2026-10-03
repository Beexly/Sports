# [1611] When Do Markets Fully Process Public Information? Evidence from Real-Time Prediction Markets (arXiv:2606.07811)

**Citation:** Giovanni Angelini, Luca De Angelis (2026). *When Do Markets Fully Process Public Information? Evidence from Real-Time Prediction Markets*. arXiv:2606.07811. URL: https://arxiv.org/abs/2606.07811
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 12,023 words).
**Verdict:** ADAPT — the benchmark-relative updating framework (0.64-for-one impact coefficient, updating-gap → drift regressions, salience × illiquidity interaction) ports directly to NFL in-play markets as a drift-prediction signal and as a liquidity-gated rule for weighting market prices vs. GSE's own win probability; the executable-arb result (negative net of spreads) cautions that midpoint drift is not a free bet.

## 1. Research question
Do real-time prediction markets incorporate public information fully on impact, or only gradually? Using live NBA winner contracts on Kalshi merged with timestamped play-by-play data, the paper distinguishes *directional responsiveness* (prices move the right way) from *efficient updating* (prices move the right amount). It asks: (i) are pre-game prices calibrated; (ii) do live prices move one-for-one with a public-information benchmark win probability; (iii) does the residual "updating gap" predict future drift; (iv) does the completeness of updating depend on signal salience and market liquidity?

## 2. Dataset / schema
- **Market data:** Kalshi NBA winner contracts (binary, pay $1 if referenced team wins). One-minute observations: best YES bid, best YES ask, trading volume, open interest. Main price = midpoint (bid+ask)/2. Liquidity = bid–ask spread, minute volume, open interest.
- **Play-by-play:** timestamped NBA events (scores, turnovers, fouls, timeouts, rebounds, substitutions, clock) merged at contract-minute level; all signals oriented toward the referenced team (positive = favorable to YES).
- **Sample:** 1,438 games, 2,876 team-level contracts, 409,512 contract-minutes, 2025-04-15 to 2026-05-25. Pre-game 24h sample: 2,839 contracts / 1,421 games. 69 overtime games; median game duration 138.6 real minutes.
- **Benchmark win probability:** logit of final payoff on pre-game close, score margin, |margin|, clock, period indicators, home status, recent net scoring, margin×clock interactions — estimated out-of-sample via five-fold cross-fitting at game level; excludes contemporaneous Kalshi price. Benchmark Brier 0.164 vs. Kalshi live midpoint 0.164 vs. pre-game close 0.211.
- Access: Kalshi exchange data (regulated venue; authors obtained trade feed). No public replication link stated.

## 3. Method / model
Six hypotheses tested with minute-level panel regressions, SEs clustered by game:
- (H1) Pre-game calibration: Y_i on p_{i,−24h}, p_{i,0}, and the 24h revision.
- (H2) Directional updating: Δp_it on signed signals (net points, made 3pt/2pt, turnover, lead change, 8–0/10–0 runs, salience index).
- (H3) Efficient updating: Δp_it = α + βΔq_it + ΓX_it + η_it; efficient ⇒ β = 1. X includes lagged midpoint, lagged benchmark, score margin, |margin|, minutes remaining, spread, recent volume, open interest.
- (H4) Gradual correction: Gap_it = Δq_it − Δp_it predicts (p_{i,t+h} − p_it) for h = 1,2,5,10,15 min, raw and net of future benchmark changes (q_{i,t+h} − q_it).
- (H5/H6) Directional underreaction UR_it = sign(Δq_it)(Δq_it − Δp_it) on standardized salience index, illiquidity index, and salience×illiquidity (|Δq| ≥ 0.0025 threshold); drift regressions augmented with Gap×Salience and Gap×Illiquidity interactions.
- Robustness: alternative benchmarks (parsimonious, flexible, no-recent-scoring, chronological holdout); microstructure subsamples (positive volume, narrow spreads, non-stale quotes, high-quality quotes); game-phase heterogeneity.

## 4. Equations & assumptions
- p_it = (bid_it + ask_it)/2; spread_it = ask_it − bid_it.
- q_it = Pr(Y_i = 1 | ℐ_it) — public-information benchmark (Eq. 1).
- Efficient benchmark: p_it = q_it + ε_it; Δp_it = Δq_it + η_it (Eq. 3); estimated Δp_it = α + βΔq_it + ΓX_it + η_it, H0: β = 1 (Eq. 8).
- Updating equation: Δp_it = λ_it Δq_it + ρ m_{i,t−1} + η_it, m_it = p_it − q_it; λ_it = 1 + α_S Salience + α_L Illiquidity + α_SL Salience·Illiquidity (Eqs. 4–7).
- Gap_it = Δq_it − Δp_it (Eq. 9); drift: p_{i,t+h} − p_it = α_i + δ_t + ρ Gap_it + ε_{i,t+h} (Eq. 10); net-of-benchmark: (p_{i,t+h} − p_it) − (q_{i,t+h} − q_it) = α_i + δ_t + ρ Gap_it + ε_{i,t+h} (Eq. 11).
- UR_it = sign(Δq_it)(Δq_it − Δp_it); marginal salience effect ∂UR/∂Salience = β + θ·Illiquidity (Eq. 14).
- Assumptions: midpoint ≈ market-implied probability (caveats: heterogeneous beliefs, risk preferences, fees, spreads, microstructure); benchmark logit captures the public component; minute alignment between play-by-play timestamps and quotes is exact; game-level clustering handles within-game dependence.

## 5. Features / target
Benchmark model inputs: pre-game closing price, score margin, |margin|, clock, period dummies, home status, recent net scoring, margin×clock interactions. Updating regressions target: one-minute midpoint change Δp_it. Gap/drift target: h-minute future price change, raw and net of benchmark changes. Mechanism features: standardized salience index (made 3pt, lead changes, scoring runs, event salience score), standardized illiquidity index (↑ spread, ↓ volume, ↓ open interest), |Δq_it|, state controls, close-game/clutch indicators.

## 6. Validation design
No train/test split in the ML sense; identification comes from high-frequency panel structure with game-clustered SEs. The benchmark is strictly out-of-sample (five-fold game-level cross-fitting) so market-vs-benchmark comparisons are not mechanical. Robustness across four benchmark specifications, six quote-quality subsamples, and game phases (Appendix C: clutch situations). The "executable" check (buy ask / sell bid) serves as the economic-significance gate. No stated holdout of recent games for the drift claim.

## 7. Numerical results / baselines
- **Pre-game:** Brier falls 0.204 → 0.199 over final 24h (improvement 0.0046***, SE 0.0013); MAE 0.406 → 0.397 (0.0086***). Calibration slopes ≈ 1 (0.977 24h, 0.985 close), intercepts ≈ 0. Revision coefficient 1.292*** (SE 0.217): a 10pp revision ⇒ ~13pp higher payoff probability.
- **Directional:** net points 1-min +0.0281 / −0.0284; made 3pt +0.0370 / −0.0377; lead change +0.0451 / −0.0455; 8–0 run ±0.025, 10–0 run ±0.028. One net point ⇒ +1.22pp midpoint (Table 4, col. 1).
- **Efficient updating:** β on Δq_it = 0.630 (no controls), 0.638 (controls); H0: β = 1 rejected, p < 0.001. A 10pp benchmark change ⇒ ≈6.4pp market move. Quote-quality subsamples: β 0.656–0.663. Appendix C: clutch situations β ≈ 0.51.
- **Drift (Gap → future):** raw ρ = 0.150/0.164/0.195/0.196/0.236 at h = 1/2/5/10/15 min; net-of-benchmark ρ = 0.379/0.414/0.459/0.458/0.484 — all ***. A 10pp gap ⇒ 2.0pp drift at 5 min, 4.6pp net of benchmark; 2.4pp / 4.8pp at 15 min.
- **Salience × liquidity (Table 7):** Salience −0.0026***, Illiquidity +0.0015*** (col. 1) / +0.0008*** (col. 2), Salience×Illiquidity +0.0014***. Event-specific: 3pt −0.0055***, turnover −0.0064***, lead change −0.0060***, 8–0 run −0.0102***; interactions 3pt×illiq +0.0027***, lead change×illiq +0.0043***, run×illiq +0.0021**. |Δq| coefficient 0.4057***/0.4122***.
- **Drift interactions (Table 8):** Gap ρ = 0.502/0.514/0.549 (5/10/15 min); Gap×Salience +0.023***/+0.013**/+0.025***; Gap×Illiquidity −0.022/−0.032/−0.037** (frictions slow convergence too).
- **Economic:** executable-style returns (buy at ask, sell at bid) are negative — midpoint drift is absorbed by trading costs. Not a frictionless arbitrage.

## 8. Code / data availability
None stated in paper. Kalshi one-minute quote/volume/open-interest data is exchange-sourced (regulated venue; retrievable via Kalshi's market-data API); NBA play-by-play is public (e.g., stats.nba.com / nba_api).

## 9. Leakage & limitations
- Benchmark-model attenuation: any noise in q_it biases β downward (authors' own caveat; the net-of-benchmark drift result is the stronger evidence, since it survives future q changes).
- Midpoint vs. executable: predictable midpoint drift does not survive bid–ask costs; GSE cannot bet the drift naively.
- NBA/Kalshi specifics: dense, discrete public signals and a regulated CLOB. NFL sportsbook markets have no public CLOB mid and wider effective spreads; the 0.64 coefficient will not transfer numerically, only the functional form (underreaction → drift; salience × illiquidity).
- The benchmark excludes the market price by construction, which understates the true public-information set (market prices aggregate private info the logit can't see) — β < 1 partly reflects benchmark completeness, not only market slowness.
- One-minute clock alignment between play-by-play and quotes; timestamp jitter could inflate the apparent "gap" if quotes lag events mechanically.
- No out-of-sample holdout for the drift trading implication; 2025-04 to 2026-05 sample is one NBA season+playoffs.
- NFL external validity: continuous-flow football with sparse scoring vs. basketball's dense signals; salience events differ (turnovers, 4th-down stops, big plays), liquidity differs (books post limits, no visible book).

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` (line 47, line 143), GSE tracks line movement/steam, beat-the-close, and CLV as a training label, but sports-market *in-play* microstructure is thin in the corpus and the map's open gap #3 is exactly "market microstructure in sports betting — order flow, steam-move predictability… when public models beat liquid closes." GSE's pre-game line-move lane is adjacent; the in-play updating-gap → drift machinery and the liquidity-gated salience interaction are **new capabilities**, not duplicates.

## 11. GSE implementation spec
1. **In-play benchmark for NFL:** build GSE's own out-of-sample win-probability model on play-by-play (nflverse): logit of win on pre-game spread-implied prob, score margin, |margin|, time remaining, down/distance/yardline, timeouts, weather — cross-fit by game, excluding any market input. This is GSE's q_it.
2. **Market input:** in-play moneyline/spread series from a liquid book or exchange (Pinnacle in-play API or Kalshi NFL contracts) at 1-minute resolution, with spread/volume proxies for illiquidity.
3. **Updating audit:** estimate Δp = α + βΔq + controls on 2024–2025 NFL; read off β (the NFL analog of 0.64) and test Gap → drift at 5/10/15 min. This calibrates how far NFL in-play markets lag GSE's model.
4. **Live signal (drift-follow):** when |Δq| is large (model moved, market lagged) and the game is liquid (narrow spread, recent volume), take the drift side for the next 5–15 minutes — the paper's ρ ≈ 0.46–0.48 net-of-benchmark says the lagging side keeps moving that way. In illiquid books, invert the rule: fade the model's own move or abstain, since illiquidity slows convergence (Gap×Illiquidity negative in drift).
5. **Blending rule for GSE's published in-play edge:** weight = f(liquidity): in liquid states weight the market more (it incorporates salient info fast), in illiquid states weight GSE's model more (market underreacts; β falls toward ~0.5 in clutch/thin states).
6. **Effort:** ~1 week: nflverse benchmark + one season of in-play odds; second week for the drift-signal backtest and the liquidity-gated blender.

## 12. Reproducible test
Dataset: 2024–2025 NFL regular season, GSE's in-play odds captures + nflverse play-by-play. Metric: (a) updating β on Δq (replicate the <1 finding); (b) Gap → 5-min drift ρ, net of future benchmark changes. Baseline to beat: the paper's 0.638 and ρ = 0.459 (5-min net). GSE passes the replication if β < 1 (p < 0.01) and drift ρ > 0 (p < 0.01) in NFL data — exact magnitudes need not match (different sport, different venue). Then the economic test: paper-mid drift-follow strategy evaluated at executable prices with spread costs.

## 13. Acceptance / rejection gate
**Adapt** the updating-gap framework into GSE's in-play product if, on 2024–2025 NFL: (i) β is significantly below 1 and drift ρ significantly positive net of benchmark changes (replication gate); and (ii) the drift-follow signal survives bid–ask costs with positive expected value over ≥500 in-play events, OR the liquidity-gated blender beats a fixed 50/50 market/model blend on Brier score by ≥0.002. **Reject** as a betting signal (keep only as a descriptive audit) if drift is fully absorbed by spreads in NFL books as in Kalshi — i.e., midpoint drift exists but executable returns ≤ 0 — or if β ≈ 1 (NFL books already update fully).

## 14. Improvement experiment
The paper's drift is midpoint-only and dies at the spread. GSE's edge: restrict the drift-follow to *cross-book* opportunities — when the lagging book is a soft retail book and a sharp book (Pinnacle) has already moved, the "drift" is the soft book catching up, and it is executable because you're taking the stale price, not crossing the lagging book's spread. Backtest: GSE model Δq vs. soft-book in-play line lag; bet the stale side only when Pinnacle confirms the direction. The paper never tests cross-venue catch-up; if soft books underreact more than Kalshi (likely — no market-maker competition), the executable edge could be an order of magnitude larger than the paper's negative within-venue result.
