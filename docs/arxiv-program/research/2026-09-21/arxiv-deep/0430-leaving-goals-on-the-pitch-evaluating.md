# [0430] Leaving Goals on the Pitch: Evaluating Decision Making in Soccer (arXiv:2104.03252v2)

**Citation:** Van Roy, Robberechts, Yang, De Raedt, Davis (2021). *Leaving Goals on the Pitch: Evaluating Decision Making in Soccer*. arXiv:2104.03252v2. URL: https://arxiv.org/abs/2104.03252v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 906 lines).
**Verdict:** REJECT — soccer-specific shot-decision analysis with no NFL transfer path; the Markov-decision machinery is already covered in GSE's 4th-down literature and in-play work.

## 1. Research question
Should soccer teams take more (or fewer) long-distance shots? The paper reconciles xG evidence (long shots are low-value) with the observation that a small group of high-volume long-distance shooters converted 6.5% of 416 long-distance shots while their teams scored in only 2.1% of 4,455 non-shooting touches in the long-distance zone. It asks: given ball location, what is the chance of generating a better shot later in the possession; and what happens to season goal totals under counterfactual shooting policies (shoot ±5/10/20% more from distance)?

## 2. Dataset / schema
2017/18 and 2018/19 English Premier League event-stream data provided by StatsBomb (https://statsbomb.com/). One MDP learned per team; only the 17 teams present in both seasons (each team plays 38 matches/season → 76 matches per team). Event stream annotates every ball touch (passes, dribbles, shots) with locations. State space: 22×17 grid over the offensive half (374 field states) + 1 defensive-half state + 3 absorbing states (goal, missed shot/no-goal, loss of possession). Key columns: ball location, action type, intended move destination (inferred), shot outcome, possession id. Intended end locations of failed moves are unobserved in event data → estimated via Gradient Boosted Trees Ensembles (Appendix A.1 carries the MDP accuracy evaluation).

## 3. Method / model
Learn a per-team Markov Decision Process over possessions. Policy π(a|s) = Pr[A_t=a | S_t=s] is the probability of shooting vs moving the ball to zone s′ from zone s, estimated by raw counts: π(shoot|s) = c_s^shot / c_s; π(move_to(s′)|s) = c_{s,s′} / c_s; transition P(s, move_to(s′), s′) = c_{s,s′} / c_{s,s′}; P(s, shoot, s_goal) = c_s^goal / c_s^shot (location-based xG); reward 1 on goal transitions, 0 elsewhere. Two AI techniques: (1) probabilistic model checking (PRISM/STORM) to compute exact probabilities of scoring under action sequences (shoot now vs move-once-then-shoot vs move-twice-then-shoot vs move-to-flank-first-then-shoot) and the probability of ever generating a better shot later in the possession; (2) policy modification (scale shoot probability ±x%, rescale move probabilities proportionally to original shares) then evaluate E[goals|π] = Σ_s E[shots in s|π] · P(s, shoot, s_goal), with expected visits from the fundamental matrix N = (I − Q)⁻¹ where Q[i,j] = P(i, move_to(j), j)·π(move_to(j)|i). Frequency-efficiency trade-off handled heuristically: extra shots from increased volume get xG = P(s,shoot,s_goal) − (μ_s − μ_s^low) (μ_s = mean StatsBomb xG in s, μ_s^low = mean of below-average shots); reduced volume gets P + (μ_s^top − μ_s) (drop lowest x% of shots). Policy-modification approach adapted from Sandholtz & Bornn basketball work [14][15].

## 4. Equations & assumptions
Transition: P(s,a,s′) = Pr[S_{t+1}=s′ | S_t=s, A_t=a]; Markov property assumed.
P(s, move_to(s′), s′) per learned rates; P(s, move_to(s′), s_loss) = 1 − P(s, move_to(s′), s′); P(s, shoot, s_goal) = c_s^goal / c_s^shot; P(s, shoot, s_nogoal) = 1 − P(s, shoot, s_goal).
Policy: π(a|s) = Pr[A_t=a | S_t=s].
Expected goals: E[goals|π] = Σ_{s ∈ field states} E[shots in s|π] · P(s, shoot, s′_goal).
E[shots in s|π] = π(shoot|s) · E[visits to s|π]; N = (I − Q)⁻¹; Q[i,j] = P(i, move_to(j), j)·π(move_to(j)|i).
Policy increase: π′(shoot|s) = π(shoot|s) + (1−x)·π(shoot|s); move probabilities rescaled by total_move_prob_s = Σ_{s′} π(move_to(s′)|s) (formulas in Appendix A.2).
Policy decrease: π′(shoot|s) = (1−x)·π(shoot|s); moves rescaled by 1 − x·π(shoot|s).
Adjusted xG (increase): P′ = P(s, shoot, s′_goal) − (μ_s − μ_s^low); (decrease): P′ = P(s, shoot, s_goal) + (μ_s^top − μ_s).
MDP value function: V_π(s) = Σ_a π(a|s) Σ_{s′} P(s,a,s′)(R(s,a,s′) + γV_π(s′)), γ=1; solved by dynamic programming from zeros.
Stated assumptions: Markov property (no history); policy depends only on ball location; possession count starting per state unaffected by policy; intended-move destinations estimable from GBM model; γ=1 (all future goals equally important); the frequency-efficiency trade-off approximations above.

## 5. Features / target
Inputs: ball location (grid cell), current policy π, transition rates. Target(s): (a) probability of scoring under specific action sequences (PRISM model checking); (b) probability of ever generating a higher-xG shot later in the same possession; (c) expected season goals under modified policies. Prediction horizon: rest of the current possession (technique 1) or full season (technique 2).

## 6. Validation design
MDP fit validation (Appendix A.1): compare model value-function state values (probability of eventually scoring from s) against empirical state values from data (fraction of possessions passing through s that end in a goal), across all 17 teams. Goals-estimation check: relative error between estimated season goals under the observed policy and actual goals, averaged over teams. No train/test split on policy-change experiments (counterfactuals by construction); experiments are within-team before/after policy edits. Time-ordering: possessions are independent sequences, no temporal split reported.

## 7. Numerical results / baselines
- MDP fit: mean absolute error between model and empirical state values lies in [0.013, 0.015] (avg ± 1 std across 17 teams) — paper's claim of close fit.
- Season-goals estimation: average relative error 11.38% across teams; "given that an average team scores around 50 goals per season, this corresponds to roughly six goals."
- High-volume long-distance shooters (Eriksen, Pogba, Kane, De Bruyne, Son, Hazard, Sigurdsson): 6.5% conversion on 416 long-distance shots vs 2.1% goal rate in 4,455 non-shooting touches in the long-distance zone (footnote: likely an underestimate, rebounds not counted).
- EPL shooting trend: long-distance shots (outside the box) declined ~20% per season from 2013/14 to 2018/19; slight decline in total shots/match.
- Use case 4.1 (shoot vs move, PRISM): probability of ever generating a better shot can be as low as 5% for some locations (e.g., Chelsea, left of the penalty arc; edge of box in front of goal: 5–10%); Manchester United's left side of attack ~20%; Huddersfield very unlikely anywhere. Shooting-payoff asymmetry: "When shooting is preferred, the payoff in terms of the increase in the chance of scoring is much higher than when moving is preferred."
- Use case 4.3 (uniform ±5/10/20% long-distance shot frequency): most teams would score more by shooting MORE from distance; exceptions Burnley, Liverpool, Newcastle United (low long-distance conversion) benefit from shooting less. Biggest gainers: Chelsea, Everton, Manchester City.
- Use case 4.4 (targeted 5/10/20% increases only in zones where shooting beat moving): all teams gain; 10% → ~+0.5 goals/season; 20% → ~+1 goal/season for most teams. "Every goal scored during a season equates to roughly one point in the table" (10 EPL seasons 2010/11–2019/20). Worked example: Bournemouth 2019/20 relegation — their model says +1 goal would have flipped goal difference (−24 vs Aston Villa's −26) and saved them.

## 8. Code / data availability
Data: StatsBomb EPL event data (public release, statsbomb.com) — provided to authors by StatsBomb. No code link stated in paper ("None stated" for code). PRISM/STORM are public tools referenced.

## 9. Leakage & limitations
Adversarial read: (1) The "extra shot quality" adjustments (μ_s − μ_s^low) are heuristic, not learned — the entire counterfactual conclusion rests on a parametric guess about the frequency-efficiency curve; if the true curve is flatter/steeper, the ±1 goal/season results move. (2) GBM-estimated intended destinations for failed passes introduce model-on-model error into every transition rate; no sensitivity analysis reported. (3) Per-team MDPs trained on 76 matches; fine grid (375 states) × destination states is a huge parameter space — sparsity handled by the coarse defensive-half state and smoothing, but individual zone conclusions (5% vs 10%) sit on small samples. (4) No test of whether "better" policies computed ex-post predict out-of-sample (no temporal holdout; 2018/19 team behavior evaluated on the same data used to learn it). (5) The value-function MAE [0.013, 0.015] is small partly because scoring-from-any-state is a rare event (baseline near zero everywhere) — not a discriminating fit metric. (6) External validity to NFL: soccer possesses continuous possession flow and location-based xG; NFL has discrete plays, down/distance states, and the 4th-down decision literature (already in repo: 2309.00756, nfl4th) covers the analogous shoot/go-for-it counterfactuals. (7) Domain mismatch is total for props_player lane: long-distance shot policy ≠ any NFL prop mechanism.

## 10. GSE overlap
The map's 58-paper dossiers include soccer papers but no soccer shooting-decision MDP work; however the *analogous NFL machinery* is deeply covered: Markov drive models (Goldner [4], cited by this paper; Yam & Lopez 2019), 4th-down decision counterfactuals (2309.00756 read in depth, nfl4th correction literature, "4th-down humility" 2311.03490), in-game WP (1906.05029, iWinRNFL 1704.00197), and probabilistic game-state evaluation is the engine's core. Status: **duplicate of existing capability** (decision-counterfactual via Markov models), **new only in soccer shot policy** which GSE doesn't model. No NFL transfer path.

## 11. GSE implementation spec
REJECT verdict → no build plan. The closest NFL analogue (4th-down/punt-vs-go policy counterfactuals) is already production literature in the repo; nothing to implement from this paper.

## 12. Reproducible test
Not applicable — REJECT on domain grounds. If Garrett ever wanted the NFL analogue: compare nfl4th's go-for-it recommendation gains against actual team behavior on 2020–2025 4th downs, metric = points per drive gained vs baseline; this already exists in repo literature, not in this paper.

## 13. Acceptance / rejection gate
REJECT: soccer shot-policy counterfactuals do not transfer to NFL markets or props; the Markov counterfactual method it uses is already superseded in-repo for football by 4th-down and in-game WP literature. No adoption criteria needed.

## 14. Improvement experiment
If adapting the method's spirit to NFL (beyond the paper): build a per-team drive-state MDP (down, distance, yardline, time, score) from nflverse 2020–2025, then run the same PRISM-style counterfactual on 4th-down policies — but learn the frequency-efficiency (go-rate vs conversion-rate) trade-off empirically from cross-team variation rather than the paper's parametric μ_s − μ_s^low heuristic. Compare policy-implied points/drive vs nfl4th recommendations on 2024–2025 holdout.
