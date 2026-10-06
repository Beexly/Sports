# [0508] BBE: Simulating the Microstructural Dynamics of an In-Play Betting Exchange via Agent-Based Modelling (arXiv:2105.08310v1)

**Citation:** Dave Cliff (2021). *BBE: Simulating the Microstructural Dynamics of an In-Play Betting Exchange via Agent-Based Modelling*. arXiv:2105.08310v1. URL: https://arxiv.org/abs/2105.08310v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,915 lines).
**Verdict:** ADAPT — the limit-order-book-analog matching engine plus the heterogeneous bettor-agent population (rational RP(d), Linex, LW, UD, BTF, RB, ZI) is a concrete template for an NFL odds-movement simulator to study market microstructure; port the exchange mechanics and agent taxonomy, not the horse-race physics.

## 1. Research question
Can an agent-based model of a sports-betting exchange — comprising a minimal race-event simulator, a real limit-order-book-style matching engine, and a population of bettors with heterogeneous strategies — serve as a *constructive* synthetic data generator (SDG) for in-play betting markets, producing high-resolution back/lay order-book data for AI/ML strategy research where real exchange data is too expensive or nonexistent?

## 2. Dataset / schema
No real data used — this is a design paper for a simulator. Illustrative outputs: a three-competitor 2000m race lasting ~2.5 minutes; a six-horse race for visualization; an RP(100) bettor sentiment chart. Companion implementations (Cliff et al. 2021; Hawkins 2021; Keen 2021; Lau-Soto 2021) released as open-source on GitHub (exact URLs in the companion paper, not in this extract). Betfair sample data format discussed for future compatibility (historicdata.betfair.com schema).

## 3. Method / model
Three components:
- **Race simulator:** competitors move along a 1D track; per-timestep forward step S_c(t) modulated by a preference function P_c (match between race factor vector f_r and competitor preference vector p_c), a responsiveness function R_c(t, d) (pace phases, fatigue, finishing bursts), and competitor interactions — *boxing in* (blocked by slower runner ahead within threshold θ_c+) and *spurring on* (speeding up when a rival closes from behind within θ_c−).
- **Exchange matching engine:** for each competitor, back and lay bets aggregated by odds into an order book (the "market grid"/"ladder"); time-priority matching (oldest unmatched bet at a price matches first); partial matches supported; unmatched bets cancellable until in-play, then all unmatched bets cancelled at race start; ~5% commission on winnings only. The author notes the matching engine is not a simulation of an exchange but an instance of one.
- **Bettor agents:** a sophistication continuum. RP(d) — rational predictors running d i.i.d. "dry-run" race simulations to estimate win probabilities (ex ante and re-estimated in-play from the current state); Linex — linear extrapolation of each competitor's mean speed over the last N seconds; LW (Leader Wins); UD (Underdog — backs P2 while within distance D of the leader); BTF (Back The Favourite — follows the market's lowest odds); RB (Representative Bettor — encodes favorite-longshot bias and human stake clustering on multiples of 2/5/10, per Brown & Yang 2016); ZI (Zero Intelligence noise bettors). Minimum population bound: B ≥ 4DN bettors for D distinct prices on both sides across N competitors.

## 4. Equations & assumptions
Race dynamics (faithful to paper):
d_c(t + δt) = d_c(t) + S_c(t, f_r, d)

Preference-modulated step: S_c(t, f_r) = (k − |f_r − p_c|) · U(d_min, d_max), with k > 0.

Equation (1) — blocking:
S_c(t, f_r, d) = R_c(t,d)·P_c(f_r,p_c)·δ(v_c) if Δ_c(t) > θ_c+; else R_c(t,d)·δ_min,
where Δ_c(t) = d_{i+}(t) − d_c(t) is the distance to the nearest competitor ahead, i+ = argmin over competitors ahead, and δ_min = min(S_c(t−δt), S_{i+}(t−δt)).

Illustrative parameterization: race distance normalized to [0,1]; per-competitor phase boundaries p_c = U(2,4) (integer count); per-phase responsiveness drawn from U(0.7, 1.0); small per-run noise on boundaries and levels.

Assumptions: (a) bettors' dry-run ensembles approximate real opinion formation; (b) the strategy taxonomy (RP/Linex/LW/UD/BTF/RB/ZI) spans real market behavior; (c) constructive SDG validity can be established later via "stylized facts" (acknowledged as currently unknown for in-play betting); (d) race interactions (boxing/spurring) are the main source of outcome uncertainty.

## 5. Features / target
- Simulator inputs: competitor preference vectors, responsiveness phases, bettor-strategy mix, race factor vectors.
- Outputs (the SDG product): full-resolution time series of back/lay order books per competitor, bettor P&L, and event trajectories.
- No prediction target in this paper — it builds the laboratory, not the strategy.

## 6. Validation design
Illustrative only: space-time plots of example races (Figures 3–7), an RP(100) bettor's evolving win-probability estimates through a race (Figure 8). No statistical validation against real exchange data in this paper — calibration to real Betfair data is explicitly listed as future work, gated on discovering the "stylized facts" of in-play betting markets.

## 7. Numerical results / baselines
No quantitative results beyond illustrations: the paper reports no accuracy, profit, or calibration numbers. Key structural numbers: B ≥ 4DN minimum bettor bound (e.g., N=5 → nonempty-market probability under random one-bet bettors is 0.038; N=10 → ≈0.0004); commission ~5%; three independent implementations with a ~100× speed spread (most accessible vs most engineered).

## 8. Code / data availability
Three independent open-source implementations on GitHub, documented in the companion paper (Cliff et al. 2021; theses: Hawkins 2021; Keen 2021; Lau-Soto 2021). Exact URLs not printed in this paper's extract.

## 9. Leakage & limitations
- **No validation against real markets.** The paper is explicit: without known stylized facts for in-play betting, BBE cannot be calibrated, and strategies trained on it risk adapting to simulator artifacts.
- Bettor strategies are hand-designed and unvalidated against human behavior (the author admits in-play human betting data barely exists).
- Race physics is deliberately minimal — fine for an SDG proof of concept, but any "edge" discovered in BBE is an edge against BBE's own assumptions.
- The RP(d) mechanism (hundreds of dry-run simulations per bettor per timestep) is computationally brutal; the paper leans on parallelism without costing it.
- External validity to NFL: the exchange mechanics transfer directly (a market is a market); the race-event model does not — an NFL game is not a 1D race, and pre-game NFL markets are far more liquid and informed than the paper's toy in-play books.

## 10. GSE overlap
Per the existing-research map (2026-09-21): gap list item 3 is "Market microstructure in sports betting — only 1211.4000 + PLOS ONE 2023. Order flow, steam-move predictability, limit-order-book analogues... thin." BBE is squarely in that gap: it provides the LOB-analog mechanics and a heterogeneous-agent taxonomy that no repo doc currently contains. The map also notes prediction-market tooling (Polymarket/Kalshi) and CLV/steam-move tracking as *observed* phenomena — BBE offers a *generative* laboratory for them. **New capability** (simulator), complementing the observational microstructure work.

## 11. GSE implementation spec
Build "GSE-LOB": an NFL pre-game odds-movement simulator reusing BBE's exchange mechanics with an NFL event model swapped in.
- Exchange: implement the BBE matching engine (price-time priority, partial fills, back/lay ladders) for point-spread and total markets; seed the book from real opening lines (Odds API / consensus).
- Event model: replace the race with a game simulator — GSE's existing play/drive simulator or a simple scoring-process model — that emits score/time states; in-play extension optional (start with pre-game line movement).
- Agents: port the taxonomy — RP(d) sharps (run the game simulator d times), Linex-style steam chasers, BTF (follow the move), RB (public bias: favorite-longshot, round-number stakes), ZI noise; calibrate the mix so simulated line movement reproduces observed steam-move statistics (frequency, magnitude distribution).
- Use cases: (a) stress-test Kelly/staking rules under realistic line-movement dynamics; (b) estimate the cost of slow execution (CLV decay); (c) generate synthetic order-flow data for ML features.
- Effort: ~4–6 weeks (engine 2 weeks, agents + calibration 2–4 weeks). Start from the BBE GitHub implementations rather than from scratch.

## 12. Reproducible test
- Dataset: 2024 NFL season opening→closing lines for spreads and totals (Odds API or consensus captures already in repo), plus GSE's game simulator.
- Metric: distributional match between simulated and real line movement — (a) Kolmogorov–Smirnov distance on closing-line-move magnitudes, (b) steam-move (>1 point in <30 min... adapt to daily granularity: >0.5 point day-over-day) frequency within ±20%.
- Baseline: a random-walk line model with matched volatility (must beat it on both metrics).

## 13. Acceptance / rejection gate
ADOPT the simulator for staking research if, pre-registered: KS distance on move magnitudes < 0.10 AND simulated steam-move frequency within ±20% of observed, on the 2024 season holdout. REJECT for production staking use if either fails — an uncalibrated simulator teaches the staking optimizer to exploit artifacts. Even on rejection, keep the matching-engine code: it is the correct primitive if real order-flow data ever becomes available.

## 14. Improvement experiment
Go beyond the paper: close the calibration loop the author left open — use the simulator as the *fitness function* in an evolutionary search over staking strategies (the paper's own proposed future work), but with a twist: co-evolve the bettor-agent mix against real 2024 line-movement data (adversarial calibration), so the market itself gets harder as the staking strategy improves. If the evolved staking rule survives the adversarial market, it has earned a paper-trading trial.
