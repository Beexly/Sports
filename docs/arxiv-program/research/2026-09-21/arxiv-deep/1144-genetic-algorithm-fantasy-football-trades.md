# [1144] A Genetic Algorithm for Optimizing Fantasy Football Trades with Playoff Biasing (arXiv:2511.17535)

**Citation:** Parshall, E.; Ali, J.; Zimmerman, M. (2025). *A Genetic Algorithm for Optimizing Fantasy Football Trades with Playoff Biasing*. JAIR Vol. 4, Article 6 (August 2025). arXiv:2511.17535. URL: https://arxiv.org/abs/2511.17535
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2511.17535v1 [cs.NE], 19 pages incl. Appendix A trade lists).
**Verdict:** ADAPT

The playoff-weighted multi-objective cost function and the GA trade-search architecture (team-specific elitism, trade-combining mutations) are directly adaptable to a GSE season-long fantasy trade analyzer; the ESPN-projection dependency and single-league demo are the parts to replace.

## 1. Research question
Can a genetic algorithm automatically generate multi-player fantasy football trades that (a) improve projected point totals for both the initiator and the trade partner (so deals get accepted), while (b) secretly biasing the initiator's gains toward playoff weeks (15–17), where championships are decided?

## 2. Dataset / schema
One 12-team ESPN fantasy football league, evaluated from Week 8 of the 2025 NFL season through Week 17. Player weekly projections p_{i,w} from ESPN data sources (unofficial Python ESPN API); roster slots 1 QB / 2 RB / 2 WR / 1 TE / 1 FLEX (RB/WR/TE) / 1 K / 1 D/ST. Roster gaps (bye weeks, empty slots) filled with the best available free agent's projection per position per week.

## 3. Method / model
- Season score: S(R) = Σ_{w=w_c..17} L(R,w), where L(R,w) is the optimal weekly lineup score.
- Unweighted gains: g_a = S(T'_a) − S(T_a), g_b = S(T'_b) − S(T_b) for post-trade rosters T'.
- Playoff weighting for team A (W_p = {15,16,17}): g_aw = Σ_{w∈W_p} α_p·l_{a,w} + Σ_{w∉W_p} α_n·l_{a,w}, with playoff weight α_p = 1.2 (default) and α_n = (n_p + n_n − α_p·n_p)/n_n, chosen so g_aw = g_a when per-week gains are constant (total-points conservation — the "deceptive fairness" mechanism).
- Cost (minimize): c = −(α·g_aw + β·g_b − γ·|g_aw − g_b|), subject to g_a > 0, g_b > 0, |P_a|,|P_b| ≤ m = 3.
- GA: population 100, 5000 generations; hybrid elitism (top 15 overall + top 2 per trade partner); 6 mutation operators — keep-same (0.2), add/remove player, combine trades, exchange player, add-from-other-trade, spawn-new (0.16 each); duplicate pruning, cost-threshold filtering (0.3 probabilistic retention), truncation to 100.
- Five configurations tested: Default (α=1, β=1, γ=0.25, playoff 1.2), High Playoff Bias (playoff 1.5), User Gain Emphasis (α=1.2), Opponent De-emphasis (β=0.8, γ=0.3), Fairness Emphasis (γ=0.4). Baselines: random trades, unweighted GA (playoff weight 1.0).

## 4. Equations & assumptions
S(R) = Σ_{w=w_c}^{17} L(R,w); l_{a,w} = L(T'_a,w) − L(T_a,w); g_aw as above with α_p = 1.2, α_n preserving the total; c = −(α·g_aw + β·g_b − γ·|g_aw − g_b|). Assumptions: ESPN projections are the ground truth for trade value (no uncertainty); all owners evaluate trades on unweighted season totals (so the playoff bias stays hidden); trades of ≤3 players per side are realistic; opponents accept any trade with g_b > 0 (no veto behavior modeled); bye-week gaps solvable via best free agent.

## 5. Features / target
Weekly projected points per player per position (ESPN), roster composition, playoff-week indicator (15–17). Target optimized: the multi-objective cost c balancing initiator gain, partner gain, and fairness.

## 6. Validation design
Single-league case study (12 teams, weeks 8–17 of 2025 season) across 5 configurations + random-trade and unweighted-GA baselines. Metrics: cost, projected gains g_a/g_b, diversity (unique trades across opponents). Full trade lists in Appendix A (60 top trades across configs). No out-of-sample validation (projections are the evaluation), no multi-league replication.

## 7. Numerical results / baselines
- Default: top trade cost −30.55 → +14.32 pts initiator / +15.06 opponent (Gainwell, Vidal, Bowers for Drake Maye, Tyler Warren).
- High Playoff Bias: best cost −38.68, +20.01 initiator (Pollard, Vidal, Bowers for Maye, Dak Prescott, Warren).
- User Gain Emphasis (α=1.2): best cost −41.55, +17.95 vs +20.69 opponent (Vidal, Harvey, Pollard for Maye, Texans D/ST, Prescott).
- Opponent De-emphasis (β=0.8): single best initiator gain +22.44 vs +10.82 opponent (Gadsden II, Skattebo, Gainwell for Josh Downs, Ricky Pearsall, Saquon Barkley); average g_a 10.51 (lower because it permits highly asymmetric deals).
- Fairness Emphasis (γ=0.4): best cost −38.52, +20.01 vs +18.94 (Vidal, Bowers, Pollard for Maye, Njoku, Texans D/ST).
- All runs: g_a ∈ [0.01, 25.35], g_b ∈ [0.01, 29.38]; multi-player trades dominated single-player swaps in cost efficiency; QBs (Maye, Prescott), RBs (Pollard, Barkley), D/ST (Texans) were frequent leverage points.

## 8. Code / data availability
Code + scripts + full results: https://github.com/epparshall/Fantasy_Trade_Genetic_Optimizer. Data: ESPN projections via unofficial Python ESPN API (public-ish, unofficial; rate-limited, no SLA).

## 9. Leakage & limitations
- **Projections are both the optimizer input and the evaluation metric** — the paper never checks whether recommended trades actually won weeks; it's optimizing against ESPN's projections, not against reality (no backtest on realized scores).
- **Single league, single season, author as initiator** — overfitting to one roster context; leverage points (Drake Maye, Texans D/ST) are artifacts of that league's rosters.
- **No uncertainty modeling** — acknowledged as future work (Monte Carlo over projection variance); a trade that gains +14.32 projected points with high variance is riskier than the paper admits.
- **Opponent acceptance model is naive** (g_b > 0 ⇒ accept); ignores vetoes, league politics, counteroffers.
- **ESPN dependency** is unofficial API scraping — fragile for a production GSE feature.

## 10. GSE overlap
GSE's corpus covers DFS lineup optimization (incl. GA-based approaches) and season-long fantasy content, but has no **trade analyzer / trade recommender** machinery — this fills a genuine product gap (a "trade analyzer with playoff bias" is a classic season-long fantasy content feature). The playoff-weighting trick (conserved-total temporal reweighting) is a novel mechanism not present in the corpus: it formalizes "win the trade where it matters." Complements 1141 (rotisserie win-probability objective for roster construction) — 1141 is about who to roster, this is about how to get them via trades.

## 11. GSE implementation spec
Build a **GSE Trade Analyzer** for season-long NFL fantasy:
1. Inputs: user's league roster + league-mate rosters (manual import or Sleeper/ESPN/Yahoo API), weekly projections from GSE's own projection system (NOT ESPN — replaces the paper's weakest dependency), weeks remaining → playoffs.
2. Engine: port the GA (population 100, 5000 generations is overkill for interactive use — profile down to ~200 generations / population 50 for sub-5s response; the cost function is cheap since lineup optimization per week is a small assignment problem).
3. Upgrades over the paper: (a) Monte Carlo over projection uncertainty — report P(g_a > 0) and the distribution of playoff-week gains, not just point estimates; (b) target GSE's actual playoff weeks per league settings; (c) a "fairness dial" (γ slider) exposed in the UI from "shark mode" (β=0.8) to "commissioner mode" (γ=0.4).
4. Output: ranked trade proposals with per-team gain, playoff-week gain split, and acceptance-likelihood heuristic (based on historical trade-accept data if available, else the paper's g_b>0 rule).
Effort: ~2–3 weeks (projection feed wiring + GA port + UI).

## 12. Reproducible test
Reproduce the GA on a synthetic 12-team league with public projections (FantasyPros consensus or nflverse-based projections for 2024 weeks 8–17). Success: the ported optimizer reproduces the paper's qualitative findings — (a) best costs negative with g_a, g_b > 0, (b) playoff-bias config shifts acquired players toward strong weeks-15–17 schedules (measure: average playoff-week SOS of acquired vs traded-away players improves by ≥0.5 projected points), (c) multi-player trades dominate single-player swaps on cost. Then backtest: do recommended trades' projected gains correlate with realized gains (weeks 8–17 actuals)? Require r ≥ 0.5.

## 13. Acceptance / rejection gate
ADOPT the trade analyzer as a GSE season-long product feature only if: (a) the backtest shows recommended-trade projected gains correlate with realized gains at r ≥ 0.5, (b) interactive runtime < 10s per league, and (c) the Monte Carlo upgrade shows ≥70% of recommended trades keep g_a > 0 under projection noise (robust recommendations, not projection artifacts). Otherwise keep the playoff-weighting cost function as a design pattern in the research notes.

## 14. Improvement experiment
Replace the fixed playoff weights with **learned temporal weights from playoff-leverage data**: estimate, from historical fantasy leagues, the marginal win-probability contribution of a point scored in each remaining week given the user's current record (a "playoff leverage index"), and set α_w proportional to it. Hypothesis: for a 7-1 team, regular-season weeks are nearly worthless (playoff spot locked) so the optimizer should go all-in on weeks 15–17; for a 4-4 team, immediate weeks dominate. This turns the paper's one-size-fits-all 1.2× playoff multiplier into a record-aware dynamic weighting — test whether record-aware weights produce higher simulated playoff-advance rates than fixed 1.2× in a Monte Carlo league simulation.

---

**Notes for tracker:** arXiv:2511.17535v1 [cs.NE]. Primary ledger #1144 in reader-05 wave-3 set. Full text read.
