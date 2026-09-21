# [0026] Modeling Event Dynamics by Self-Exciting Processes with Random Memory (arXiv:2601.07980v1)

**Citation:** K. Ken Peng, X. Joan Hu, Tim B. Swartz (2026). *Modeling Event Dynamics by Self-Exciting Processes with Random Memory*. arXiv:2601.07980v1. URL: https://arxiv.org/abs/2601.07980v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF; ar5iv HTML unavailable — fetch failed).
**Verdict:** ADAPT — directly fills gap #14 in the existing-research map (Hawkes processes / self-exciting models for momentum/scoring bursts, mentioned only 1×); the random-memory hot/regular regime structure adapts to NFL in-game scoring-event clustering.

## 1. Research question
How can recurrent sports events (soccer corner kicks) with transient, short-lived self-excitation be modeled when the classic Hawkes process's infinite-memory decaying kernel is unrealistic — i.e., can a Hawkes extension with a *random, finite excitation duration* capture clustering where only ~10% of events form "quick" clusters, and can its parameters be estimated and simulated? Illustrated on 2019 Chinese Super League corner-kick data. (Paper: Abstract, §1.)

## 2. Dataset / schema
- **2019 Chinese Super League (CSL) corner kicks:** 16 teams, 240 scheduled matches, 7 excluded (video/logging issues, treated as MCAR) → 233 matches. Timestamped corner-kick events per team; stratified home/away; matches partitioned into 1,171 segments separated by "terminal events" (705 goals + 466 half-endings). Segment-level covariates (Table 1): X1 = second-half indicator, X2 = score difference, X3 = segment starts from goal (0/1), X4 = segment start time (minutes since half start), X4×X2 interaction.
- Data source: provided by Daniel Stenz (former Technical Director of Shandong Luneng Taishan FC) — effectively proprietary, no public URL stated.
- Schema: (match, segment, team, event times {T_ik}, covariates Z) — counting-process format.

## 3. Method / model
- **Extended Hawkes with random memory:** conditional intensity λ(t|H(t),τ,Z) switches between two regimes via a partly-hidden semi-Markov binary process S(t): λ(t|·) = λ_1(t|H(t),Z)·S(t) + λ_0(t|H(t),Z)·(1−S(t)) (eq. 1). S(t) = 1 iff t − T_{N(t−)} ≤ τ (in "hot" state for τ after an event), else 0; τ latent, segment-specific, i.i.d. ~ Gamma(shape, rate). Transitions into hot are event-triggered (observable); exits are unobserved.
- **Four nested specifications:** (a) constant baseline + Cox-style hot multiplier λ(t)=λ_00 exp{βZ + νS(t)}; (b) parametric time-varying baseline log λ_0(t;θ_λ) = θ_1 + θ_2[exp(−θ_3 t) − exp(−θ_4 t)] with the νS(t) multiplier; (c) semiparametric: λ_0(t) unspecified, piecewise-constant (8 pieces, cut points 0,3,6,9,12,15,27.5,40 min) + νS(t); (d) fully state-specific: λ(t)=λ_00(t)exp(β_0 Z)(1−S(t)) + λ_10(t)exp(β_1 Z)S(t), hot baseline 6 pieces (0,5,10,15,20,30 min).
- **Estimation:** MLE via Monte Carlo EM (Algorithm 1): E-step draws τ_i from its conditional distribution ∝ L_i(θ^{(d)}|τ_i)f_τ(τ_i;θ_τ^{(d)}), approximates Q by sample mean; M-step maximizes; standard errors via Louis (1982) observed information. Covariate selection by all-subset BIC under model (a), separately home/away.
- **Simulation:** Algorithm 2 (changepoint gap-time direct simulation for constant intensities); Algorithm 3 (Lewis–Shedler thinning for time-varying intensities, dominating rate λ̄ = sup_t max{λ_0(t),λ_1(t)}).

## 4. Equations & assumptions
- Regime intensity: λ(t|H(t),τ,Z) = λ_1(t|H(t),Z) if S(t)=1; λ_0(t|H(t),Z) if S(t)=0 (eq. 1).
- Hidden state: S(t) = 1{t − T_{N(t−)} ≤ τ}; S(t)=0 otherwise.
- Simple constant case: λ(t|H(t),τ) = λ_1 S(t) + λ_0(1−S(t)) (eq. 2).
- Gap-time changepoint density: f(y|τ) = I(y≤τ) λ_1 e^{−λ_1 y} + I(y>τ) λ_0 e^{−(λ_1−λ_0)τ} e^{−λ_0 y} (eq. 3). (Notation cleaned from extraction; structure as stated — flag: integral/limit symbols were noisy.)
- Model (a): λ(t|H(t),τ,Z) = λ_00 exp{βZ + νS(t)} (eq. 4a); (b): λ(t;θ_λ) exp{βZ + νS(t)} (4b); (c): λ_00(t) exp{βZ + νS(t)} (4c); (d): λ_00(t)e^{β_0 Z}(1−S(t)) + λ_10(t)e^{β_1 Z}S(t) (4d).
- Full likelihood (eqs. 5–7): L(θ) = ∏_i ∫ L_i(θ|τ_i) f_τ(τ_i; θ_τ) dτ_i with L_i the counting-process likelihood (product of intensities at event times × exp(−∫intensity)).
- Parametric baseline: log λ_0(t;θ_λ) = θ_1 + θ_2[exp(−θ_3 t) − exp(−θ_4 t)].
- **Assumptions:** (i) segment-level processes independent across segments/matches (restart at goals/halftime); (ii) home/away processes independent (stratified); (iii) τ_i i.i.d. Gamma across segments; (iv) outside-option/terminal events exogenous; (v) hot-state entry triggered deterministically by events; (vi) piecewise-constant cut points chosen by exploratory analysis; (vii) Model (a)–(c) proportionality: hot intensity = e^ν × regular intensity (relaxed in (d)).

## 5. Features / target
- **Input features:** segment-level covariates X1–X4 (half indicator, score diff, starts-from-goal, segment start time, interaction) + event history (most recent event time, hidden state).
- **Target:** conditional intensity λ(t|·) of the next corner kick; implied quantities: mean time to next event, dynamic in-match intensity curves, cluster-size distributions.
- Prediction is real-time/forward within a match (dynamic prediction illustration, §3.1.5).

## 6. Validation design
- **Fit, not prediction-contest:** four nested model specifications compared by BIC-based covariate selection + parameter stability across (a)–(c); baseline shapes compared to an Andersen–Gill Cox reference (Breslow estimator).
- **Simulation validation:** 200 replicated seasons (233 matches each) under fitted Model (b); compared against empirical CSL summaries: mean corners/match, first-10-minutes frequency, and cluster-size distributions (consecutive events within thresholds) — Figure 4.
- No out-of-sample likelihood comparison vs. classic Hawkes or vs. Peng et al. (2024) independent-gap model reported as a formal test; robustness argued via cross-model parameter stability.
- Not time-ordered train/test; segments treated as exchangeable replicates.

## 7. Numerical results / baselines
(Paper §3.1.3–3.2.2, Tables 2–3; quoted exactly:)
- Hot-state duration: "the estimated mean duration of the hot state is close to two minutes, with comparable standard deviations" — Table 2: e.g. home Model (a) Γ(8.76, 4.43), mean 1.98, sd 0.67; away Γ(8.49, 4.25), mean 2.00, sd 0.69; stable across (a)–(c) and teams ("the temporal scale of such shortterm excitation is largely teaminvariant").
- "the estimated hot state multiplicative effects ν̂ indicate that the corner kick intensity during the hot state is approximately twice that of the regular state" (Models a–c).
- Home team: lower corner rate when leading (X2: −0.122, SE 0.057) and when segment starts after a goal (X3: −0.090, SE 0.022) — significant across specs. Away: higher rates in 2nd half (X1: 0.090, SE 0.061), lower when leading (X2: −0.122/−0.111), negative X4×X2 interaction (−0.006, SE 0.002).
- Model (d): "none of the candidate covariates exhibit statistically significant effects in the hot state for either team" — excitation dominates covariates post-corner.
- Cox reference: "systematically slightly higher" than their regular-state baseline (absorbs transient excitation → mild upward bias).
- Simulation check (200 replicates): home corners/match 5.21 observed vs. (4.95, 5.56) simulated [2.5/97.5 percentiles]; away 4.72 vs. (4.36, 4.94); first-10-min home 0.98 vs. (0.86, 1.15); away 0.92 vs. (0.76, 0.99). Cluster-size distributions (Fig. 4): "close agreement between the simulated and observed distributions."
- Only ~10% of corner kicks form "quick" clusters (motivating stat, §1).
- Dynamic prediction demo: Shenzhen vs. Shanghai, Mar 1, 2019 (Fig. 2). All paper claims; no independent replication (proprietary data).

## 8. Code / data availability
None stated — no code link, no data URL. Data acknowledged as provided by Daniel Stenz.

## 9. Leakage & limitations
- **Proprietary data, no code** — the headline "close to two minutes / ~2× intensity" cannot be independently verified; MCEM implementation details (M draws, convergence) unstated.
- Segment construction assumes goals/halftime fully "reset" excitation — cross-segment carryover ruled out by construction; cross-team dependence dodged by stratification ("extensions … to jointly model multiple interacting event processes … represent a natural next step").
- Cut points for piecewise baselines chosen by exploratory analysis on the same data (data-snooping risk for baseline shape).
- Proportionality assumption (a)–(c) rejected by their own model (d) — the paper's headline multiplicative effects rest on a rejected structure.
- Gamma distributional assumption for τ untested (identifiability/sensitivity flagged by authors as future work).
- **External validity to NFL: moderate-to-strong conceptually.** NFL in-game scoring events (TDs, turnovers) exhibit clustering/momentum; the hot/regular regime with random finite memory is arguably *more* appropriate for football than soccer (discrete drives, TV timeouts naturally bound excitation windows). But: the paper models one event type in one league; nothing about win probability, spreads, or calibration.

## 10. GSE overlap
- **Fills a documented gap.** Existing-research map, gap #14: "Hawkes processes / self-exciting models — mentioned 1×; momentum/scoring-burst modeling absent." Repo has Koopman/DMD momentum REJECTED (p=0.89, MOVE-37 lane) and "rhythm-of-opinion-a-hawkesgraph-framework" ledger (000... — opinion dynamics, not scoring). No in-game event-intensity modeling exists in the corpus. Not a duplicate of iWinRNFL (in-game WP) — this is event *intensity* dynamics, complementary.
- Relevant to: live/in-game modeling lane (gap #7: "In-play / live NFL spread & total modeling — iWinRNFL covers in-game WP; live spread/total probability surfaces are thin") — a hot/regular intensity model for scoring events is a building block for live totals.

## 11. GSE implementation spec
- **Data:** nflverse play-by-play 2020–2025; define scoring-relevant event streams per game: touchdowns, field goals, turnovers, sacks (segment = drive or quarter/half, analogous to their goal/halftime segments). Covariates: score differential, quarter, time remaining, down/distance context, pregame spread (team strength), pace.
- **Model:** port their Model (c): piecewise-constant regular-state baseline (cut points by game clock, e.g., 0–5, 5–10, 10–15 min quarters) + hot-state multiplier ν, segment-level random τ ~ Gamma. Fit home/away (offense/defense) stratified; estimate via MCEM (implement from Algorithm 1 pseudocode) or via Bayesian equivalent (NumPyro: latent τ per segment, NUTS).
- **Use:** (a) live-totals intensity surface: dynamic P(next score within t minutes) updated after each event — feeds in-play total probability; (b) "momentum" quantification: posterior P(S(t)=1) as a real-time hot-state indicator for content/X posts; (c) simulate game scripts (their Algorithm 2/3) for Monte-Carlo game simulation with realistic scoring bursts instead of IID Poisson.
- **Serving:** offline fit per season (segments ~ 40k drives); inference = closed-form intensity given (history, τ posterior mean) — cheap, real-time capable. Effort: ~2 weeks (reimplementation + validation on nflverse).

## 12. Reproducible test
- **Dataset:** nflverse pbp 2021–2024; event stream = offensive touchdowns per game; segments = halves (terminal events = halftime/end of game, mirroring their design); covariates: score diff, half indicator, pregame spread.
- **Test 1 (clustering):** fit their Model (a) vs. a homogeneous Poisson (ν=0 restriction) — likelihood-ratio test; ACCEPT clustering model if ΔBIC > 10 in favor (reproduces the paper's core claim on NFL data).
- **Test 2 (simulation fidelity):** simulate 200 seasons of TD times under fitted model; compare cluster-size distribution (TDs within 3 minutes) vs. empirical; ACCEPT if observed cluster PMF lies within simulated 95% bands (their Figure 4 check).
- **Baseline to beat:** homogeneous Poisson / Andersen–Gill Cox; the paper's own comparison target.

## 13. Acceptance / rejection gate
- **ADAPT gate:** implement Models (a)+(c) on nflverse TD data (2021–2024, halves as segments). ACCEPT for the live-modeling lane iff (i) hot-state multiplier ν̂ significantly > 0 (Wald p < 0.01) with τ̂ mean in a plausible 1–6 minute range, AND (ii) ΔBIC vs. homogeneous Poisson > 10, AND (iii) simulated cluster-size PMF matches empirical within 95% bands. REJECT (park) if no significant excitation found in NFL TD data — the soccer result may not transfer.
- Pre-registered before fitting; no peeking at τ̂ before the gate.

## 14. Improvement experiment
Go beyond the paper in two ways they flag as future work: (1) **jointly model competing event types** — extend to a multivariate hot/regular model where a defensive "hot" state (turnover burst) *inhibits* the offensive scoring intensity (mutual excitation/inhibition matrix between TD, FG, turnover streams), which their univariate model cannot do and which maps directly to NFL game dynamics; (2) **make τ team-specific and hierarchical** (partial pooling across teams) to estimate which teams/coaches systematically sustain pressure longer — a "sustained-pressure" team metric with betting-market relevance for live totals.

---
*Flags: (a) ar5iv HTML failed; full text from arXiv PDF. (b) Equation subscripts/superscripts garbled in extraction — structural forms verified against the paper's prose but consult PDF before implementing. (c) No code or data released — all numerical results are paper claims on proprietary data.*
