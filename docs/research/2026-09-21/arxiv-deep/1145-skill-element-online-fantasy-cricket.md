# [1145] Analyzing Skill Element in Online Fantasy Cricket (arXiv:2512.22254)

**Citation:** Sarkar, S.; Das, S.; Saha, P.; Mukherjee, D.; Mukherjee, T. (2025). *Analyzing Skill Element in Online Fantasy Cricket*. arXiv:2512.22254. URL: https://arxiv.org/abs/2512.22254
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2512.22254v1 [cs.GT]).
**Verdict:** ADAPT

The paper's core legal finding (fantasy = skill, not chance) doesn't port, but its contest-structure-dependent strategy results do: high-variance "variable" strategies are optimal for top-heavy Mega contests while consistent deterministic strategies (MA5 form-based) dominate flat-payout contests — a directly actionable principle for GSE's NFL DFS lineup construction (GPP vs cash-game strategy split).

## 1. Research question
Is online fantasy cricket a game of skill or chance? The authors test whether systematic team-selection strategies consistently beat random selection across IPL 2024, under two realistic contest payoff structures (top-heavy Mega vs flat 4x-or-Nothing), and model how strategy populations evolve when agents adapt.

## 2. Dataset / schema
IPL 2024: 74 scheduled matches, 71 completed (3 abandoned for weather), 22 Mar–22 May 2024; scorecards via CricBuzz API (RapidAPI); career stats via ESPNcricinfo. Selection pool: playing XI + impact players only (lineups known ~30 min before match). 15 strategies × 100 agents per match; entry fees 500 (Mega) / 100 (4x) in simulation.

## 3. Method / model
- 15 strategies in 3 families: **Variable** (randomized each match: Random 1, Random 2, Fav Team, Allrounder Select All, Career Averages, Tournament Stats, Popularity Selection), **Deterministic** (fixed rule: Career Points, TOPSIS×3, Mean-Var Optimization), **Learning/Deterministic** (form-based: MA5 = avg points last 5 matches, MA1 = last match, Allrounder Pref).
- 8 metrics (Win% Best Rank, Win% Average Rank, mean/median of average points, average rank, best rank), normalized to (0,1), composite "Average 4" = mean of 4 key metrics. Subset competitions (4 homogeneous groups) to find "uniformly better" strategies.
- **Money game:** Mega Contest (1,500 agents, entry 500; prize pool 5.3 lakh ≈ 70% of 7.5 lakh collected; top 60% paid; 1st prize 50,000, steep drop-off) and 4x-or-Nothing (entry 100; flat 400 prize = 4× entry to top 20%; pool 80%). Player-specific and strategy-specific payoff aggregation over the tournament.
- **Dynamic tournament:** 100 iterations × bootstrap-sampled 71 matches; agent counts reweighted by softmax w_i = e^{x_i/25}/Σ_j e^{x_j/25} where x_i = number of agents with positive total payoff using strategy i; 6 repetitions averaged per iteration.

## 4. Equations & assumptions
Metric normalization: x'_ij = (x_ij − (min_i x_ij − 1))/(max_i x_ij − min_i x_ij + 2); rank-based metrics flipped via 1 − x'. Reweighting: w_i = e^{x_i/25}/Σ_j e^{x_j/25}, agents_i = round(w_i × 1500). Assumptions: ties broken by earlier entry; player pool = announced XI + actual impact players; credit-price constraint non-binding (max price 9, so 11 players always fit under 100); no in-match substitutions modeled; run-out points simplified; payoff structures are one of many real variants.

## 5. Features / target
Per-player: career batting average, wickets, strike/economy rates (career points = per-innings normalized fantasy points); recent form (MA1/MA5 points); tournament totals (runs, wickets, boundaries); TOPSIS multi-criteria composite scores (weights via AHP/Shannon/Synthesis). Target: fantasy points, rank, monetary payoff.

## 6. Validation design
All 71 completed IPL 2024 matches as the simulation universe; 100 agents/strategy/match. Deterministic strategies replicated identically across agents (equal representation). Variable-strategy subset results aggregated over 6 runs. No out-of-tournament validation (single IPL season); no real-platform data — all payoffs are simulated.

## 7. Numerical results / baselines
- **Points/ranks:** Variable strategies took rank 1 in ~95% of matches but had Win%(Average Rank) ≈ 0 (Random 1: Win% Best Rank 23.944%, Win% Average Rank 0.000%). Deterministic strategies had the best average rank in ~89% of matches. MA5: Win%(Average Rank) 21.127% (highest). Average-4 ranking: Career Averages 1st, then Tournament Stats, MA5 — all beating Random 1.
- **Mega Contest payoffs:** MA5 consistently high across all metrics; Random 1 had the highest maximum payoff but strongly negative mean/median (high-risk). MA1, Mean-Var, Allrounder Pref, Career Points, TOPSIS Synthesis, Popularity Selection: maximum payoff NEGATIVE (every agent lost money). Dynamic tournament: population dominated by variable strategies + MA5 as the only strong deterministic survivor; periodic fluctuations.
- **4x-or-Nothing:** MA5's MINIMUM payoff was positive — every MA5 agent profited over the tournament. Career Averages/Tournament Stats risky (large negative minimums) but competitive means. Dynamic tournament converged in 3–5 iterations to a single dominant strategy, most often MA5 or MA1.
- **Popularity Selection** performed poorly in both contests (popularity driven by weak strategies' picks — a cautionary result about ownership-based selection).

## 8. Code / data availability
No code link stated. Data from CricBuzz API (RapidAPI, commercial) + ESPNcricinfo (public). Simulation is custom; not released.

## 9. Leakage & limitations
- **Single tournament, simulated payoffs** — no real Dream11/My11Circle data; results are about the simulation, and the authors admit the payoff structures are one of many variants.
- **Selection pool restricted** to announced XIs (realistic for timing, but real platforms allow full-squad selection with late swaps).
- **Tie-breaking by entry order** is arbitrary and affects rank-based metrics at the margins.
- **Equal strategy representation** (100 agents each) distorts the Popularity Selection result — acknowledged by authors.
- **"Skill" conclusion is overstated by design**: beating a random benchmark in a simulation proves strategies differ, not the legal skill-vs-chance question; the dynamic-tournament temperature (25) is arbitrary.
- **Cricket-specific**: player roles, credit constraints, and scoring don't transfer to NFL DFS.

## 10. GSE overlap
GSE's DFS lane covers lineup optimization and contest selection, but the corpus lacks an explicit **contest-structure → lineup-variance doctrine**: this paper provides the empirical scaffolding for "build high-variance lineups for top-heavy GPPs, consistent lineups for flat-payout/double-up contests" — the exact split GSE's DFS content needs. The MA5 result (recent-form strategies dominate flat contests) supports GSE's form-weighted projection inputs. Complements 1141 (rotisserie variance logic: "variance is upside" in tournaments) — this paper is the contest-format evidence base for that claim. The softmax population dynamics are a novel lens on ownership: as a contest's population adapts, popular picks converge to the strategies of past winners.

## 11. GSE implementation spec
Codify a **contest-aware DFS lineup doctrine** for NFL:
1. Classify each slate's contests: top-heavy (GPP, payout concentrated top 1–5%) vs flat (double-ups, 4x-or-nothing equivalents).
2. GPP lineups: maximize ceiling — stack-heavy, low-ownership pivots, high-variance player selections (the paper's "variable strategies" role); generate N diverse lineups via the optimizer with a ceiling objective.
3. Flat contests: maximize floor/median — high-floor players, form-weighted (MA5 analogue = last-5-game fantasy average), minimize lineup variance; single or few lineups.
4. Validate the doctrine on historical DraftKings NFL data: compare ceiling-optimized vs median-optimized lineup sets' ROI in GPPs vs double-ups over 2023–2024 seasons.
Effort: ~1 week to formalize + backtest on DK contest data.

## 12. Reproducible test
Dataset: DraftKings NFL 2023 season contest results (or simulated equivalent with public prize structures). Build two lineup generators: (a) ceiling-maximizing (high-variance, stacked), (b) median-maximizing (high-floor, form-weighted). Enter both into simulated GPP (top-heavy) and double-up (flat) payout structures over a full season. Success: ceiling lineups show positive ROI in GPPs while median lineups lose; median lineups show positive ROI in double-ups while ceiling lineups lose — reproducing the paper's variable/deterministic split in an NFL setting.

## 13. Acceptance / rejection gate
ADOPT the contest-aware doctrine into GSE's DFS product only if: (a) the backtest reproduces the predicted crossover (ceiling wins GPPs, median wins flat) with statistical significance over ≥1 full season, and (b) the effect size is material (≥10% ROI difference between matched and mismatched strategy-contest pairs). Otherwise keep as editorial guidance, not product logic.

## 14. Improvement experiment
Add the paper's **dynamic population adaptation**: model opponent lineups as a softmax-weighted mixture over archetypes (chalk, stack-heavy, contrarian) that updates weekly based on which archetype cashed, then optimize GSE lineups game-theoretically against the predicted population (ownership-aware leverage). Hypothesis: in large-field GPPs, adapting to the population's drift (e.g., overcorrection to last week's winning archetype) yields higher ROI than static contrarianism — test by simulating the dynamic tournament on NFL DFS data with the population mixture re-estimated each week.

---

**Notes for tracker:** arXiv:2512.22254v1 [cs.GT]. Primary ledger #1145 in reader-05 wave-3 set. Full text read.
