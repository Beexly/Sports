# 0985 — How to design a tournament: lessons from the EHF men's handball Champions League (1811.11850v1)
**Ledger:** 0985 | **arXiv:** 1811.11850v1 (2018) | **Lane:** win_spread_total
**Title:** "How to design a tournament: lessons from the EHF men's handball Champions League" — László Csató (MTA SZTAKI / Corvinus U. Budapest)
**Replacement context:** Fresh-search replacement (query: `abs:"competitive balance" AND abs:football`) for an original-assignment duplicate already in the corpus map. Duplicate skips are not REJECTs — see wave summary.

---

## Citation / full-text source
Full citation: "How to design a tournament: lessons from the EHF men's handball Champions League" — László Csató (MTA SZTAKI / Corvinus U. Budapest). Full text: arXiv 1811.11850v1 (2018), https://arxiv.org/abs/1811.11850v1.

## Research question
A simulation study of hybrid tournament design (round-robin groups → knock-out). It compares the EHF handball Champions League's novel 2015/16 format — **D(8+6)**: 28 teams in *unequal* groups (A,B with 8 top teams; C,D with 6 weaker teams) with *asymmetric* advancement rules — against the traditional **D(4×7)**: four equally strong groups of 7. Question: can deliberately unbalanced groups raise both match quality and outcome uncertainty without sacrificing fairness?

## Dataset / schema
Fully simulated: no real match data is used (handball-specific forecasting models were deliberately avoided). Teams are pre-ranked 1..28; the match-outcome model is p_ij = 1/(1+((i+β)/(j+β))^α) with β=24, α ∈ {3,4,5}. Scale: N = **1,000,000 independent runs** per design (convergence verified: win share of strongest club and top-club H2H counts stabilize at 10^6).

## Method
1. **Match outcome model** (generalized Jackson 1993): p_ij = 1/(1+((i+β)/(j+β))^α), teams pre-ranked 1..28, β=24 (dampens top-team dominance), α ∈ {3,4,5} (highly/moderately/least competitive). No draws (handball 2017/18 had 21 group-stage draws, noted as a simplification); stationary and independent across matches. Two-legged KOs with split results resolved by a "third match" with probability p_ij (a pure coin toss would collapse to single-leg odds). Group ties broken by coin toss.
2. **Seeding variants:** /S seeded (pots by pre-tournament rank; D(8+6): pots 1–8 → A,B, pots 9–14 → C,D) and /R random (teams reranked by 44×Rnd+(28−i); strongest team still has >85% chance of top groups, weakest ~25%).
3. **Identification variants:** perfect team identification vs *erroneous* (9th-strongest misidentified as 17th — motivated by Montpellier winning the 2017/18 EHF CL from group C).
4. **Metrics:** (a) average pre-tournament ranks of Final Four finishers #1–#4; (b) expected quality of all matches = Σ of teams' pre-tournament ranks (lower = stronger); (c) expected competitive balance = rank difference (lower = more uncertain); (d) per-team matches played and win %; (e) fairness = ratio of expected prizes (5/3/2/1 for 1st–4th) between team i and team i+1 for i=1..24.

**The two formats.**
- D(8+6) (actual EHF format): groups A,B (8 teams): winner → quarter-finals directly, bottom two eliminated, rest → first knock-out phase. Groups C,D (6 teams): bottom four out, top two → play-off for two first-KO slots. First KO = 12 teams (5+5+2); 6 winners join the 2 group winners in QFs; QF winners → Final Four (Cologne). Total **200 matches**.
- D(4×7) (traditional): 4 groups of 7; winners + runners-up → Round of 16; 3rd–6th → first KO; winners → R16. Total **212 matches** — the novel format is more parsimonious.
- Under homogeneous strength, D(8+6) looks unfair: a top-group team reaches the QF with prob 1/8 + 5/8×1/2 = **7/16**, a bottom-group team with **1/12** — a 5.25× advantage for "lucky" equals (violates equal treatment of equals ex post).

**Hyperparameters.** α ∈ {3,4,5}; β=24; N=10^6; 44×Rnd+(28−i) reranking noise; prize vector (5,3,2,1); 24-team fairness window.

## Equations / assumptions
- p_ij = 1/(1+((i+β)/(j+β))^α), 1 ≤ i,j ≤ 28.
- Quality = Σ_{matches} (rank_i + rank_j); competitive balance = Σ_{matches} |rank_i − rank_j| (rank-difference form).
- QF-qualification: top group 7/16 vs bottom group 1/12 under homogeneity.
- Assumptions: no draws; stationary/independent match outcomes; fixed pre-tournament ranks; group ties by coin toss; split two-leg KOs resolved as a third match at p_ij.

## Features / target
Features: pre-tournament team ranks (1..28, treated as known truth in the perfect-identification variant; perturbed in the /R and erroneous-identification variants); format specification (group sizes, advancement rules, seeding pots). Targets: the format-performance metrics — average pre-tournament rank of Final Four finishers #1–#4 (selection efficiency), expected matchup quality, expected competitive balance (rank difference), per-team matches played and win %, and expected-prize ratios (fairness).

## Validation
The simulator is validated against p_ij=0.5 (equal chances in D(4×7), correct 16/12 split in D(8+6)) and fully deterministic p_ij matrices — sanity checks confirming the code behaves correctly at the extremes. Convergence verified at N=10^6 (win share of strongest club and top-club H2H counts stabilize). D(4×7) is the explicit traditional-design baseline. No external empirical baseline (handball-specific forecasting models were deliberately avoided).

## Exact results / baselines
**Key results (Table A.1, α=4, perfect identification).**
- **Selection efficiency:** avg rank of Final Four #1: D(8+6)/S **3.138** vs D(4×7)/S 3.332; #2: 4.163 vs 4.540; #3: 4.202 vs 4.602; #4: 5.710 vs 6.401. The novel format puts stronger teams in the Final Four despite fewer matches.
- **Quality:** expected quality 48.43 vs 55.17 (seeded); 49.92 vs 55.19 (random).
- **Uncertainty:** expected competitive balance 10.59 vs 20.11 (seeded); 16.30 vs 18.87 (random) — nearly halved under seeding.
- **Robustness:** patterns hold across α=3,4,5 and under erroneous identification (D(8+6) still "undoubtedly superior" to D(4×7)).
- **Fairness:** expected-prize ratios consistently ≥ 1 (stronger team never disadvantaged on average); the only violation: at α=5, team 17 has a better shot than team 16 in D(8+6)/S — marginal, since team 17's prize is still below team 15's; random seeding eliminates it. Erroneous identification: the misranked 9th team plays fewer matches at higher win % but earns a *lower* expected prize than the 10th (α=3) — **no incentive to tank seeding**.
- **Match-load distribution:** D(8+6) has higher variance in matches played — strong teams play more, weak teams fewer (Figure 4).
- **Application:** proposes a UCL redesign — 4 "top groups" from Pots 1+2, 4 "bottom groups" from Pots 3+4; top 3 of top groups + bottom-group winners → R16 — with a concrete 2018/19 re-draw (Figure A.4) that "significantly reduces the ratio of uneven matches."
- **Baselines.** D(4×7) is the explicit traditional-design baseline; the p_ij=0.5 and deterministic sanity checks validate the simulator. No external empirical baseline (handball-specific forecasting models were deliberately avoided).

## Code / data
No code released (author's father "helped code the simulations in Python" — charming, but not a repo link). One million runs per cell; no empirical dataset (fully synthetic design).

## Leakage
No leakage discussion in the paper; the study is a fully synthetic simulation (pre-tournament ranks fixed ex ante, match outcomes generated independently from the rank model), so no data-leakage structure arises. Stationarity/independence across matches ignores form, fatigue, injuries, and strategic effort allocation (dead rubbers, rotation).

## Limitations
- Deliberately uses a generic rank-based win model instead of a fitted forecasting model — results are about *relative* format efficiency, not calibrated to any real sport's score distributions; the no-draws assumption is material in football applications.
- Stationarity/independence across matches ignores form, fatigue, injuries, and strategic effort allocation (dead rubbers, rotation).
- Pre-tournament ranks are treated as known truth (with only the /R noise and one erroneous-identification scenario as robustness) — real seeding uncertainty is richer.
- Fairness is evaluated only via expected prizes; ex-post "equal treatment of equals" is conceded to fail in D(8+6) (the 5.25× figure).
- 28-team handball specifics (Final Four, asymmetric advancement) don't map 1:1 onto football/basketball formats; the UCL proposal is illustrative, not simulated at the same depth.
- One million runs per cell is expensive; no code released (author's father "helped code the simulations in Python" — charming, but not a repo link).

## GSE overlap
- None of 0980–0984 touches tournament design — this fills a genuine gap in the wave: the *supply side* of competitive balance (format engineering) vs their measurement/demand sides.
- Shares the OR-in-sports simulation tradition with the map's contest-design references but applies it to a novel asymmetric-group question no corpus paper addresses.
- The design-side complement to the balance trilogy (0980/0981/0982) and the suspense paper (0984): where those *measure* balance/entertainment, this paper shows how *tournament architecture* moves quality and uncertainty — the levers a league organizer actually controls. Cites the same OR-in-sports lineage (Scarf et al. 2009 on contest design). No map paper addresses format design.

## Implementation (GSE adaptation)
- **What to build:** a **tournament-format simulator** in GSE's toolkit: configurable group/KO structures (group sizes, asymmetric advancement, seeding pots, re-seeding rules), team-strength inputs from GSE's own ratings (replacing the rank model with calibrated win probabilities), and the paper's metric battery (selection efficiency = avg true-strength rank of semifinalists; expected matchup quality; expected uncertainty; fairness via expected-prize ratios; tanking-incentive checks via misidentification scenarios).
- **Concretely:** Python module `gse_tourney/sim.py` implementing p_ij from GSE ratings (logit/Elo-derived) or the paper's rank model as fallback; format specs as data (D(8+6), D(4×7), UCL proposal, plus GSE-custom); Monte Carlo runner with convergence diagnostics; metric reporters. Validate by replicating Table A.1's qualitative ordering (D86/S best on all three metrics at α=4) before swapping in GSE ratings.
- **Where it plugs in:** (1) content — "which playoff format gives the best teams the fairest shot?" features around real format debates (CFP expansion, NBA play-in, UCL Swiss model); (2) product — fantasy/DFS slate design: formats maximizing expected matchup quality + uncertainty are the slates users most want to play; (3) consulting-grade analysis GSE can sell or publish.

## Reproducible test
- Re-implement the rank model (β=24, α=4) and both formats; run ≥200k iterations; confirm the ordering: avg Final Four #1 rank D86/S < D86/R < D77/S ≈ D77/R; expected quality D86/S < D77/S; expected competitive balance D86/S < D77/S; total matches 200 vs 212. Tolerances: metric values within ±5% of Table A.1 (α=4, perfect identification).

## Numeric gate
- At α=4 with perfect team identification, the simulator's expected competitive balance (mean rank difference over all matches) for **D(8+6)/S must be < 13** (paper: 10.59) **and** for **D(4×7)/S must be > 17** (paper: 20.11) — i.e., the implementation must recover the paper's headline finding that the novel format roughly halves mismatch severity. Both required.

## Improvement experiment
- **GSE-ratings upgrade (the paper's deliberate gap):** replace the rank model with calibrated win probabilities from GSE's engine for a real competition (e.g., current UCL field), then simulate the actual UCL Swiss-model format vs the paper's top/bottom-group proposal. Success: the proposal shows ≥10% better expected competitive balance with no worse selection efficiency (avg true-strength rank of semifinalists) — turning the paper's illustrative UCL sketch into an empirical, GSE-powered format evaluation.
- **Tanking audit:** run the erroneous-identification battery systematically (misrank each team 1..28 by ±k slots) and map the "incentive to be misranked" surface — success if no team gains expected prize from being underrated by any margin, generalizing the paper's single-scenario check.

## Verdict
**ADAPT** — A complete, honest simulation blueprint for a question GSE will face repeatedly: does a format change help or hurt the product? The asymmetric-group insight (concentrate quality, don't dilute it) is counter-intuitive and well-evidenced, the fairness analysis is careful (including the tanking-incentive check), and the UCL proposal gives an immediate content angle. The rank-model abstraction is the gap; swapping in GSE's own calibrated probabilities is exactly the improvement experiment and a natural build.
