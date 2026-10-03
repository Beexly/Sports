# [1137] G-score: Variance-Aware Fantasy Basketball Valuation (arXiv:2307.02188)

**Citation:** Authors (2023). *G-score Fantasy Basketball*. arXiv:2307.02188v5. URL: https://arxiv.org/abs/2307.02188
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections incl. simulation design and Table 5c formulas).
**Verdict:** ADAPT — the core move (add period-to-period variance κ·τ² to the valuation denominator, estimated κ≈1.04) is the single most portable idea in this wave for GSE: uncertainty-aware player valuation that demonstrably beats the industry-standard Z-score in simulation (32.5% vs 8.33% baseline win rate), and it ports directly to NFL fantasy/DFS value-over-replacement.

## 1. Research question
The standard Z-score values fantasy players by (player mean − population mean) / population SD, ignoring that a player's own week-to-week variance changes how much of that edge is actually realized. Can a "G-score" that adds period-to-period variance to the denominator produce draft rankings that win more simulated head-to-head fantasy leagues?

## 2. Dataset / schema
- Real 2022–23 NBA weekly player statistics (author-collected; distribution source not fully specified).
- Simulation: 12-team, 13-player, 20-week head-to-head leagues; 1,000 simulated seasons per draft seat; player weekly performances drawn from fitted distributions.
- No public code or data link stated.

## 3. Method / model
- Z-score (baseline): z = (μ(q) − μ) / σ, where σ is the cross-player standard deviation.
- G-score: adds the player's own period-to-period variance τ², scaled by κ, to the denominator. Counting stats: G = (μM(q) − μM) / √(σM² + κ·τM²); turnovers (bad counting stat): G = (μM − μM(q)) / √(σM² + κ·τM²); percentage stats: G = (μA/μA(p))·(μR(q) − μR) / √(σR² + κ·τR²) (Table 5c; μM/σM = population mean/SD of the counting stat, τM = player's week-to-week SD, μA = player's attempts, μR = rates).
- κ estimated ≈ 1.04 (near 1 — the player's own variance counts about as much as cross-player variance).
- Draft simulation: one drafter uses G-score rankings, eleven use Z-score (and vice versa); win rate = seasons won / 1,000 per seat.

## 4. Equations & assumptions
- The G-score formulas above (Table 5c). κ ≈ 1.04 estimated from data.
- Assumptions: player weekly performances are draws from static distributions (no form/injury dynamics); teammates are randomly assigned (no positional scarcity or category punting); all games count equally; the objective is expected categories won; rankings are static through the draft.
- Category denominator shrinkage (G-denominator as fraction of Z-denominator, real 2022–23 data): steals 44%, FG% 56%, FT% 58%, turnovers 62%, points 65%, blocks 68%, rebounds 69%, threes 72%, assists 75%.

## 5. Features / target
Inputs: player weekly means μ(q), cross-player means/SDs (μ, σ), player week-to-week SDs τ, attempt volumes μA. Target: draft rank ordering maximizing simulated league win rate (Most Categories and Each Category formats).

## 6. Validation design
- 1,000 simulated 20-week seasons per draft seat × 12 seats; G-drafter vs Z-field and Z-drafter vs G-field.
- Baseline win rate: 1/12 = 8.33%.
- Category-weight analysis on real 2022–23 data (the denominator-fraction table above).

## 7. Numerical results / baselines
- G-score drafter vs Z-score field: 32.5% Most Categories wins, 21.4% Each Category wins (vs 8.33% baseline).
- Z-score drafter vs G-score field: 0.4% Most Categories, 0.5% Each Category — near-total domination by G-score.
- κ ≈ 1.04.
- These are exact paper claims from the author's simulation; no independent replication exists.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Simulation assumptions are strong: static distributions (no injuries, form, or schedule effects), random teammates (no positional scarcity — in real drafts, replacement level varies by position), all games counting (real leagues have playoff weeks and bye/injury management).
- The win-rate domination is within the author's own simulator — the simulator's assumptions (especially static distributions) favor the variance-aware method by construction, since week-to-week variance is the only risk modeled.
- κ ≈ 1.04 is estimated on 2022–23 NBA weekly data; no confidence interval; may not transfer across sports or scoring formats.
- No real-draft validation (no actual fantasy league results).
- Category-format-specific: head-to-head categories; rotisserie/points leagues need reformulation.

## 10. GSE overlap
High-value extension. The existing-research map's DFS work (2026-09-13-dfs, 2026-09-19-dk-week2) optimizes on point projections; ledger 0492 (fantasy skill predominance) is adjacent but does not cover variance-aware valuation. Nothing in-repo adds player-level week-to-week variance to value-over-replacement. This is the cleanest "new capability" in the wave: GSE's projections are means; G-score says the denominator should include the player's own volatility.

## 11. GSE implementation spec
- Compute for every NFL fantasy-relevant player: weekly fantasy-point mean μ(q) and week-to-week SD τ(q) from nflverse 3-season rolling game logs; cross-player σ by position.
- G-value = (μ(q) − replacement_level) / √(σ² + κ·τ²), κ=1.04 as starting point, then re-estimated for NFL weekly scoring.
- Use cases: (a) DFS value tiers (value = G per $1k salary); (b) season-long draft rankings; (c) GPP lineup construction — high-τ players are *undervalued* by Z-score methods in top-heavy payouts (variance is an asset in GPPs, a cost in cash games — flip the sign of the τ term by contest type).
- Effort: 2–3 days for the G-value table; contest-type sign logic 1–2 days.

## 12. Reproducible test
Dataset: 2024–2025 NFL weekly fantasy scores + DK salaries. Backtest: draft 12-team leagues by snake draft using G-rankings vs Z-rankings vs ADP, 500 simulated seasons per method using actual weekly scores (not fitted distributions — use history directly). Metric: win rate vs 8.33% baseline. Gate: G-rankings must win ≥12% of simulated leagues (a clear, pre-registered margin over baseline) AND beat Z-rankings head-to-head by ≥5 points of win rate.

## 13. Acceptance / rejection gate
ADAPT if: the §12 backtest gate passes (G ≥12% win rate, beats Z by ≥5 pp) on actual historical weekly scores. REJECT the κ=1.04 constant for NFL — re-estimate κ per position/scoring format; if estimated κ ≈ 0, the method reduces to Z-score and adds nothing.

## 14. Improvement experiment
Contest-dependent κ: fit κ separately for cash games (expect κ>0 — variance penalized) vs GPPs (expect κ<0 — variance rewarded), i.e., G_GPP = (μ−repl)/√(σ² − |κ|·τ²). Backtest GPP lineups built with negative-κ G-values vs standard projections in realized DK tournaments. Hypothesis: the sign flip captures what the paper's framework implies but never tests — that volatility is an asset when payouts are top-heavy.
