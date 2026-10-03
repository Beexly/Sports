# [0276] KellyBench: A Benchmark for Long-Horizon Sequential Decision Making (arXiv:2604.27865)

**Citation:** Thomas Grady, Kip Parker, Iliyan Zarov, Henry Course, Chengxi Taylor, Ross Taylor (General Reasoning, Inc., 2026). *KellyBench: A Benchmark for Long-Horizon Sequential Decision Making*. arXiv:2604.27865. URL: https://arxiv.org/abs/2604.27865
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3,091 lines, sequential, including appendices A–E and references).
**Verdict:** ADAPT — the benchmark is soccer-specific, but its machinery (Kelly-optimal log-wealth reward, walk-forward full-season agent simulation, expert sophistication rubric, and the failure-mode taxonomy) ports directly to evaluating and hardening GSE's own NFL models as sequential decision-makers. The headline finding — frontier models can articulate Kelly staking yet never execute it, and all lose money — is a warning about how GSE evaluates its own engine.

## 1. Research question
Can frontier language models act as competent long-horizon sequential decision-makers in sports betting markets? The authors build **KellyBench**: agents are placed in a sequential simulation of the 2023–24 English Premier League season, given rich historical data (match stats, lineups, player stats, public odds), and tasked with maximizing long-term bankroll growth via their own ML models, edge identification, and risk management under non-stationarity. A secondary question: how *sophisticated* are model strategies relative to human quant experts, measured by a process-based 52-point rubric?

## 2. Dataset / schema
- **Environment dynamics (§3.1):** each episode = one full EPL season (~100–150 matchdays). Per matchday: (1) observe fixtures + closing decimal odds from real bookmakers; (2) develop models in a sandboxed compute env (4 CPUs, 16 GB RAM, Python DS stack, 7 Claude-Code-style CLI tools); (3) place bets on 5 bet types — home win, draw, away win, over 2.5, under 2.5 total goals — stakes from current bankroll; (4) settle against actual outcomes; (5) receive latest results + player stats (progressive disclosure, mirroring a quant fund's information structure). At least one bet per matchday required (penny bets allowed).
- **Match-level data (§3.2.1):** EPL 1993–94 through start of evaluation season; fields widen over time: half-time scores (1995–96+), shots/fouls/corners/cards/referee (2000–01+), pre-kickoff decimal odds incl. O/U and Asian handicap (2002–03+).
- **Player-level data (§3.2.2):** per-match player stats from major European leagues + cups, 2008+, with lineups, goals/assists/minutes/shots/cards/tackles/interceptions/xG, age/height/position.
- **Scenarios (Table 1):** five full-season episodes — New Millennium 2000/01 (train, £100), Post-Crash 2010/11 (train, £150), Covid Season 2020/21 (train, £200), Recent Season 2023/24 (test, £220), Recent Season (Lit.) 2023/24 (test + 30+ curated papers). Principal results on the 2023/24 test; bankroll normalized to £100,000 for display.
- **Odds note:** bookmaker closing odds with ~5.3% overround ("vig"), which the authors admit makes the task significantly harder; exchange ("sharp") odds planned for a future version. Only 1X2 and O/U markets used (not Asian handicap, which real funds would use).
- **Leakage controls (§3.6):** network blocked; agents instructed to use rules-based strategies only (violations = bankroll elimination); weight-memory leakage (models know 2023/24 outcomes, cutoffs before season end) policed by auditing trajectories — a striking example: a GPT-5.4 seed wrote "I know the actual result of Burnley vs Man City was 0-3 away" but then used its model's recommendation. A subtler risk: silently omitting draw-inflation after knowing 2023/24 was high-scoring (3.28 goals/match vs 2.67 historical; 82 draws vs 97 average).

## 3. Method / model
- **Kelly reward (§3.4):** dense per-matchday reward r_t = log W_{t+1} − log W_t (eq. 1); cumulative R = Σ r_t = log(W_{T+1}/W_1) (eq. 2) — the Kelly-optimal strategy maximizes expected log-wealth, i.e., long-run geometric growth.
- **Agent setup:** ReSum harness (firehorse library) via OpenReward; models run at max reasoning budget; 500–1,000 tool calls and ~100K–1.7M unique tokens per episode.
- **Theory recap (§2.1):** W(b) = Σ_{x,y} p(x,y) log(b(x|y)o(x)); optimal b*(x|y) = p(x|y); under fair odds W* = H(X) − H(X|Y) = I(X;Y). Divergence form: **g(p;p*,q) = D_KL(p*‖q) − D_KL(p*‖p)** — growth is positive iff the agent's model is closer to truth than market-implied. Binary Kelly fraction: **f* = (rp − (1−p))/r**. Benter's operationalization: logit handicapping model blended with public implied probabilities + **fractional Kelly** + market-impact limits.
- **Sophistication rubric (§4.2):** 52-point expert rubric (45 criteria, not fully published to preserve benchmark lifetime), e.g., #2 Kelly use (0/1/2), #4 dynamic team-ability models (0/1/2), #12 promoted-team handling (0/1), #43 false-positive correction e.g. Bonferroni (0/1). Scored per seed by human experts.
- **Statistical tests:** two-sided Mann-Whitney U on pooled per-matchday log returns, Holm–Bonferroni corrected (Table 3); hierarchical bootstrap for return distributions (50K simulations, §4.3); logistic regression of ruin on sophistication (p < 0.001).

## 4. Equations & assumptions
Equations (numbers as in paper):
- **(1) Per-matchday reward:** r_t = log W_{t+1} − log W_t = log(W_{t+1}/W_t).
- **(2) Cumulative:** R = Σ_{t=1..T} r_t = log(W_{T+1}/W_1).
- **Kelly growth:** W(b) = Σ_{x,y} p(x,y) log(b(x|y)o(x)); optimal b*(x|y) = p(x|y); W* = I(X;Y).
- **Edge decomposition:** g(p;p*,q) = Σ_x p*(x) log(p(x)/q(x)) = D_KL(p*‖q) − D_KL(p*‖p).
- **Binary Kelly fraction:** f* = (rp − (1−p))/r; paper's reference implementation uses fractional Kelly with fraction = 0.25 (Figure 3).
- Stated assumptions: (a) closing-line bookmaker odds are the market to beat; (b) agents comply with rules-based-strategy instructions (audited, not enforced programmatically); (c) pooled per-matchday log returns across seeds are treated as independent for the Mann-Whitney tests — the authors flag this overstates significance since seeds share one schedule (single-season limitation).

## 5. Features / target
- Agent-facing inputs: fixtures, closing odds, historical match/player data (progressive), lineup and stat updates per matchday, curated literature (Lit. variant), the sophistication rubric (ablation).
- Target: final bankroll / ROI after one full season; auxiliary targets: sophistication score, ruin avoidance, Δ log-loss vs. market on bets placed.
- What agents actually used: Elo, rolling form, gradient boosting/RF ensembles, Poisson/xG models, Bradley–Terry, walk-forward logistic regression; rich player-level data was "almost universally ignored" in favor of team-level features.

## 6. Validation design
- No train/val/test in the ML sense for the benchmark itself — the five scenarios are the split (3 train eras, 1 test season + literature variant). Headline results: 5 frontier models × 5 seeds on the 2023/24 test scenario.
- Human baselines: Favourites-Only (5% on favourite), Dixon-Coles (seminal 2000s model), Human Quant (2 yrs football-model experience, 1 week), AI Researcher (5 yrs DL, no betting experience, 1 week).
- Ablations: literature access + Claude Code harness swap (3 seeds each, Opus 4.6); rubric-access ablation (3 seeds).
- Variance analysis: hierarchical bootstrap (50K sims) for Opus 4.6; per-matchday log-return Mann-Whitney U tests.

## 7. Numerical results / baselines
- **Headline (Table 2): every model loses money on average across 5 seeds.** GPT-5.4: avg ROI **−7.9%** (best +34.1%, worst −32.9%, no ruin, 115 bets, ΔLL +0.016, final £92,063). Claude Opus 4.6: **−11.2%** (best +21.5%, worst −44.7%, no ruin, 202 bets, ΔLL +0.016, final £88,771). GLM-5: **−51.6%** (ruin, £48,395). Gemini 3.1 Pro: **−66.0%** (ruin, £34,029). Kimi K2.5: **−89.6%** (ruin, £10,421). Only 3/25 seeds positive; all positive-seed models negative on average. ΔLL (model log-loss minus market log-loss on placed bets) is positive for all five — the fundamental driver is predictive underperformance vs. the market, compounded by staking failures.
- **Failure-mode prevalence (Table 4, 25 seeds):** bankroll ruin 6/25; no Kelly/principled sizing at execution 9/25; Kelly code written but never invoked 7/25; no handling of promoted teams 22/25; never retrained after initial fit 7/25; declared task complete while season running 8/25; tool-invocation failures 13/25; label leakage 7/25; draw/longshot miscalibration 22/25.
- **Adaptivity pays:** fully adaptive seeds averaged **−11.1% ROI** vs. −70.0% for fully static seeds (partially adaptive −49.6%). Only Opus 4.6 and GPT-5.4 avoided ruin; both retrained/adjusted and preserved capital when no edge was found (GPT-5.4 retreated to penny bets; Opus cut Kelly fraction 0.25→0.15 after drawdowns).
- **Sophistication (Table 6):** Opus 4.6 26.5%, GPT-5.4 22.3%, GLM-5 17.3%, Kimi K2.5 12.7%, Gemini 3.1 Pro 8.8% (of 52). Human quant: **73.1%**. Sophistication correlates positively with ROI (Figure 4); seeds scoring 11–18/52 went bankrupt at ~8% vs. ~55% for 0–5/52 (logistic regression p < 0.001). Giving agents the rubric raised sophistication to 55.0% and mean ROI to −0.7% (3 seeds).
- **Human baselines (Table 7):** Human Quant **+5.1% ROI** (39 bets, Sharpe 0.96, £105,118) — the only profitable strategy; AI Researcher −4.3%; Dixon-Coles −15.4% yet beats 3/5 frontier models. The human quant designed ~260 features, retained <10 ("stringent inclusion criteria"), and called the 5% vig "very unforgiving."
- **Ablations:** literature access and Claude Code harness did not improve Opus 4.6 (mean bankroll declined; models used Dixon-Coles more, which the authors call outdated — "poor taste" in literature). Hierarchical bootstrap: ~33% of Opus 4.6 simulations end profitable.
- **Cost note:** one GPT-5.4-level seed costs ≈ $2,000 to run — the authors flag that iterative/multi-agent ablations are out of reach for most researchers.

## 8. Code / data availability
- **Benchmark open-access API:** https://openreward.ai/GeneralReasoning/KellyBench. Harness: https://github.com/GeneralReasoning/firehorse. The 52-point sophistication rubric is deliberately not published in full.

## 9. Leakage & limitations
- **Soccer-only, EPL-only, one season.** The authors' own limitation (§5.1.2): a single season cannot strongly separate models; the Mann-Whitney pooling overstates significance.
- **EPL is among the world's most efficient markets** (§5.1.1), and agents got closing bookmaker odds with 5.3% vig, no tracking data, no set-piece data, no in-play data, and no lineup/injury news that the closing line already reflects — a recipe for estimation error. Counter-argument offered: blend fundamentals with market-implied probabilities (Benter-style) to find overlays.
- **Knowledge contamination:** the 2023/24 season ended before all models' cutoffs; results are likely in training corpora. Policed only by instructions + trajectory audits; a live version is the planned fix.
- **Single-agent harnesses only** — multi-agent/iterative scaffolds (AlphaEvolve-style) untested, partly for cost reasons.
- **The rubric measures process, not profit:** sophistication correlates with ROI, but the rubric-access ablation shows you can raise the score without reaching profitability (−0.7%).
- For GSE: the 5-bet-type structure (1X2 + totals) and bookmaker odds do not match NFL market structure (spreads, moneylines, props, exchange/sharp odds); the non-stationarity sources differ (promoted teams ↔ rookie QBs/coaching changes/scheme shifts).

## 10. GSE overlap
- **Kelly/sizing lane: previously thin, now filled in principle.** The existing-research-map flagged Kelly/fractional-Kelly as "mentioned, but no dedicated paper previously deep-read" — this is now the first Kelly paper deep-read in the corpus (Kelly 1956, Thorp, Benter all summarized inside). The divergence-form edge equation g(p;p*,q) = D_KL(p*‖q) − D_KL(p*‖p) is new to the corpus as an operational formula.
- **New capability — no existing coverage:** a walk-forward, full-season, log-wealth-reward simulation harness for evaluating GSE's own models as *sequential decision-makers* rather than as probability predictors. GSE's current evaluation culture (per the map: calibration, CLV, market-implied ratings) scores predictions, not the closed loop of model → stake → bankroll. KellyBench is the missing evaluation layer.
- Adjacent but distinct: paper 6's (0274) Polymarket-vs-model benchmarking compares probability accuracy; KellyBench would compare *compounded execution*. The failure-mode taxonomy (Kelly-never-invoked, no-retraining, promoted-team blindness, draw/longshot miscalibration) maps onto NFL analogues GSE should check in its own pipeline: fractional-Kelly actually wired into sizing, walk-forward retraining, rookie-QB/new-coach distributional shifts, favorite/longshot calibration.

## 11. GSE implementation spec
- **Build "GSEBench": a KellyBench-style season simulator for the NFL engine.** Per game-week: (1) observe slate + consensus/sharp odds (spread, moneyline, total); (2) the engine under test produces probabilities; (3) a staking module sizes bets (fractional Kelly, configurable fraction); (4) settle against actual outcomes; (5) update bankroll; reward = log-wealth change. Run the full season walk-forward with progressive data disclosure (no future leakage — KellyBench's contamination lesson).
- **Staking contract:** the single most portable lesson is the knowledge–action gap — require that the Kelly function actually invoked at bet time is unit-tested (Kimi wrote correct Kelly code and never called it; GPT-5.4 discussed Kelly and shipped flat percentages). GSE's sizing path should have an integration test asserting stake = f(kelly_fraction, bankroll) on every placed bet.
- **Adaptivity requirements:** mandate walk-forward retraining triggers (the adaptive-vs-static gap was −11.1% vs −70.0% ROI) and a distributional-shift playbook for the NFL analogues of promoted teams: rookie starting QBs, mid-season coaching changes, major scheme/trade shifts — KellyBench's 22/25 failure rate on promoted teams is the warning.
- **Sophistication rubric for GSE:** adapt the 45-criteria/52-point structure to NFL (fractional Kelly use, dynamic team-strength state-space, shift handling, multiple-testing correction, calibration checks, market-blend discipline) and score each engine release; the paper's p < 0.001 ruin-vs-sophistication link justifies gating releases on it.
- **Human baseline:** replicate the paper's human-quant protocol — give a quant one week and the same data to build an NFL model; the EPL result (+5.1% vs. −7.9% best model) suggests GSE's human-built models remain the benchmark to beat.
- **Effort estimate:** 2–4 weeks for the simulator + staking contract + rubric (odds ingestion and settlement already exist in GSE's stack per the map); the expensive part is compute for repeated full-season sims, not code.

## 12. Reproducible test
- **Dataset:** 2022–2024 NFL seasons, weekly closing consensus odds (spread/ML/total) + GSE engine probabilities, walk-forward.
- **Protocol:** simulate the season exactly per §3.1: each week the engine emits probabilities, the staking module places fractional-Kelly (0.25) bets where model edge > threshold, bankroll starts at $100K, reward = Σ log-wealth changes.
- **Baselines:** (a) flat 1%-of-bankroll staking on the same picks; (b) full-Kelly; (c) no-bet weeks allowed. Metric: final log-wealth R, max drawdown, ruin rate across 3 seasons.
- **Ablation:** run the engine with retraining disabled (static preseason model) vs. walk-forward retraining — expect the KellyBench-style adaptivity gap to replicate.

## 13. Acceptance / rejection gate
- **Adopt the GSEBench harness + staking contract** if, across the 2022–2024 walk-forward sims: (a) fractional-Kelly staking beats flat staking on final log-wealth in ≥ 2 of 3 seasons with no ruin in any season; (b) the walk-forward-retrained engine beats the static engine on R in ≥ 2 of 3 seasons; (c) the integration test proves the invoked sizing function equals the specified Kelly function on 100% of placed bets.
- **Reject** if fractional Kelly underperforms flat staking (estimation error dominates — the paper's own ΔLL > 0 warning), or if the adaptivity gap fails to replicate — then the harness adds ceremony without signal, and GSE should stay with its existing per-pick CLV evaluation.

## 14. Improvement experiment
The paper's agents failed hardest on non-stationarity (22/25 no promoted-team handling) and never learned to blend market-implied probabilities with fundamentals the Benter way. Run a controlled experiment inside GSEBench: arm the engine with a **market-blend + regime gate** — model probability p blended with market-implied q (weight by historical calibration), plus a hard gate that halves Kelly fraction when the slate contains a distributional-shift trigger (rookie QB first start, new head coach, QB injury replacement). Compare against the unblended, ungated engine over the 3-season sim. The hypothesis, drawn from the paper's two strongest findings, is that the blend+gate engine shows both higher R and lower ruin probability — importing the human quant's winning formula (market-aware, conservative, few bets: 39 bets, +5.1%) rather than the models' losing one (many bets, static models, sizing divorced from theory).
