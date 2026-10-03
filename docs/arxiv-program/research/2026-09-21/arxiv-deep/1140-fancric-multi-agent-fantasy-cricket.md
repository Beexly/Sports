# [1140] FanCric: Multi-Agentic Framework for Crafting Fantasy 11 Cricket Teams (arXiv:2410.01307)

**Citation:** Bhatnagar, M. (2024). *FanCric: Multi-Agentic Framework for Crafting Fantasy 11 Cricket Teams*. arXiv:2410.01307. URL: https://arxiv.org/abs/2410.01307
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2410.01307v1 [cs.CY]).
**Verdict:** ADAPT

The multi-agent pipeline (research → career profile → form assessment → strategy → selection → evaluation) is a usable architecture pattern for GSE's NFL DFS optimizer, but the evidence is one IPL match, exploratory, with no statistical significance testing; adopt the architecture, not the cricket specifics.

## 1. Research question
Can a multi-agent LLM system (FanCric) generate better fantasy cricket (Dream11, IPL) teams than (a) a single-prompt LLM approach and (b) the wisdom of the crowd (12.7M real Dream11 entries), using both structured and unstructured data via specialized agents?

## 2. Dataset / schema
- One randomly chosen IPL 2023 match: Lucknow Super Giants vs Mumbai Indians, played May 16, 2023 (63rd of 72 games) at Bharat Ratna Shri Atal Bihari Vajpayee Ekana Cricket Stadium, Lucknow.
- 13.8M Dream11 contest entries scraped (14 PDF files from the Dream11 mobile app via Android emulator), 12.7M unique after dedup; schema: 11 players + captain + vice-captain per team + final fantasy points.
- Player data: IPL career stats through 2022 season + 2023 season-to-date from Kaggle and official IPL site; ESPN Cricinfo player IDs used (not names) to avoid LLM name bias.
- Weather via open-meteo.com API; pitch reports via Tavily agentic search of news; odds from oddsportal.com.
- All cricket-specific; the methodology of assembling agents is the transferable part.

## 3. Method / model
Six LLM agents orchestrated via LangGraph (LangChain): Supervisor (routes user query, collects league/tournament/season/match), Researcher (venue, home/away, weather for both innings: temp, wind, cloud cover, dew, humidity; pitch reports; win odds), Career Profiler (career stats summary + qualitative strengths/weaknesses per player, relative rating), Form Assessor (recent form rating, home/away, batting first/second splits), Strategizer (team win-loss records in conditions, strengths/weaknesses, social-media fantasy tips), Selector (Dream11 rule compliance via agentic search, generates n teams, iterative refinement loop reviewed by GPT-4o — a stronger model than the GPT-4o-mini used for all other agents — with chain-of-thought team rationales and team names), Evaluator (post-match fantasy-point scoring backtest). Prompt-engineering baseline: gpt-4o-mini, temperature=1, few-shot (2 examples), generate 10 teams.

## 4. Equations & assumptions
No equations stated (LLM-prompted system, not a statistical model). Assumptions: (1) LLMs deprived of player names (IDs only) make unbiased ratings; (2) prompt-engineered baseline is a fair comparator for "traditional" approaches; (3) one IPL match suffices for an exploratory efficacy signal; (4) percentile rank vs the crowd entry distribution measures "winning" quality; (5) top-67% of entries getting entry-fee refund defines "win" (Dream11 contest payout structure).

## 5. Features / target
Inputs per match: player career stats, recent form splits, venue/weather/pitch, team records, odds, fantasy platform rules, social-media strategy tips. Target: 11-player lineups with C/VC that maximize Dream11 fantasy points; evaluation metrics: total points, percentile rank vs crowd distribution, hit rate vs "Dream Team" (optimal ex-post lineup, 832.5 points), win rate (entry fee returned).

## 6. Validation design
Single-match retrospective backtest (LSG vs MI, May 16 2023). FanCric (n=10 teams) vs prompt-engineering (n=10) vs crowd distribution (12.7M entries). Ablation: n ∈ {1, 5, 10, 15, 20} teams for FanCric (prompt-engineering values in brackets). No live forward testing, no cross-match replication, no significance tests (n=1 match).

## 7. Numerical results / baselines
- Crowd: mean 501.54, std 89.02, median 512, min 0, max 811.5; Dream Team 832.5. Distribution left-skewed, KS statistic 0.14, p=0.0 (non-normal).
- Prompt engineering (n=10): mean 512.9 (50.4 percentile), win rate 70%; best team 634 (95.1 percentile).
- FanCric (n=10): mean 528.55 (58.6 percentile), win rate 80%; best team 644 (96.3 percentile), "Strategic Strikers" with Marcus Stoinis (C), 6/11 Dream Team players.
- Ablation — n=20: FanCric avg points 528.5 (prompt 481.6), avg rank 56.9 (42.9), win% 75% (50%), highest rank 99.9 percentile with 722 points (prompt 95.9). n=15: FanCric 517.9/54.1/66.7%/99.1 vs prompt 498.4/49.1/66.7%/99.3. n=5: FanCric 507.7/53.0/60%/86.3 vs prompt 501.7/55.1/80%/86.1. n=1: FanCric 522.5/55.6/100%/55.6 vs prompt 535.5/61.9/100%/61.9 (only n where prompt engineering won).
- FanCric beat crowd mean (501.5) and median (512) at every n except n=5.
All results are from ONE match — treat as exploratory, not as established effect sizes.

## 8. Code / data availability
None stated. Framework: LangGraph/LangChain, GPT-4o-mini + GPT-4o, Tavily search, open-meteo API, pyspark + pdfplumber for parsing entries.

## 9. Leakage & limitations
- **n = 1 match**: no basis for generalization; no confidence intervals; no multiple-comparison correction across the 6 agents and 5 ablation settings.
- **Selector used GPT-4o for refinement vs GPT-4o-mini for the baseline** — model-strength confound, not a pure architecture effect.
- **Temperature = 1** for both methods — high variance; results could differ run to run; no repeats reported.
- **Retrospective**: teams "generated" with knowledge of the season up to match day, but pitch/weather/news availability at generation time vs match time is not rigorously controlled.
- **Dream Team comparison is ex-post optimal** — hit-rate metric is harsh but also uninformative about expected value.
- **DFS-relevant but cricket**: salary-cap optimization (the core of NFL DFS) is absent — Dream11's constraint is credit-based quotas, not dollar salary; the MILP optimizer GSE already uses (see 0010-nfl-dfs-neural-projections-milp.md) addresses the harder constrained problem directly.

## 10. GSE overlap
DIRECT overlap with GSE's DFS lane: ledger 0010 (nfl-dfs-neural-projections-milp.md) covers neural projections + MILP lineup optimization — the quantitative core. FanCric's contribution beyond 0010 is the *qualitative-context agent pipeline*: Researcher (weather/news), Form Assessor (recent-form splits), Strategizer (narrative + matchup strategy). GSE does not currently have an LLM-agent front-end for DFS context ingestion. This is an extension (qualitative layer), not a duplicate of the optimizer core.

## 11. GSE implementation spec
Add a "DFS context agent" layer in front of GSE's existing MILP DFS optimizer (per 0010):
1. Agents (LangGraph or simple scripted pipeline, one LLM): GameContext (weather from open-meteo, injury news, vegas lines/totals, referee crew), FormProfiler (last-4-week fantasy points, target share trends, snap counts from nflverse), NarrativeStrategist (matchup write-ups: shadow coverage, pace, OL/DL mismatches — from GSE's own charting tables, NOT social media), ConstraintChecker (DraftKings/FanDuel salary + roster rules, late-swap eligibility).
2. Agents output structured JSON: player-level boost/penalty multipliers (e.g., "WR vs bottom-5 shadow corner: −8% projection") and game-level notes, fed as adjustments into the projection vector before MILP optimization.
3. Run the weekly DFS packet (standing format) generation off the Strategist outputs.
Effort: ~1 week to wire the context pipeline to the existing optimizer; the MILP core stays untouched.

## 12. Reproducible test
Dataset: 2024 NFL regular-season DFS slates (DraftKings classic), weeks 1–17. Protocol: GSE MILP optimizer with projections alone (baseline) vs projections × agent-context multipliers, generate 20 lineups per week per the existing 0010 setup, score with actual results. Metric: mean lineup score percentile vs field (use public contest data or GSE's existing simulation) and ROI proxy. Success: context-agent lineups beat baseline by ≥ 3 percentile points on average over the 17-week window.

## 13. Acceptance / rejection gate
ADOPT the context-agent layer into the weekly DFS pipeline only if it beats the projection-only MILP baseline by ≥ 3 percentile points over a full 17-week backtest AND the per-player multiplier JSON is auditable (every multiplier traceable to a cited data source — no LLM-invented "narratives"). If the lift is < 3 points, keep as a write-up assistant only (weekly packet narrative), not as a projection input.

## 14. Improvement experiment
Replace the flat multiplier scheme with a Bayesian layer: treat each agent's qualitative signal as a prior with an explicit uncertainty (calibrated from 2024 backtest hit rates), and shrink the projection adjustment by the agent's historical reliability. Hypothesis: LLM narrative signals are high-variance; reliability-weighted shrinkage should capture the useful 20% of context signals while damping the hallucinated 80%, beating the paper's unweighted approach.
