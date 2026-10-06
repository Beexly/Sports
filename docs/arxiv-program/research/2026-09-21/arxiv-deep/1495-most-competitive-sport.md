# [1495] What is the most competitive sport? (arXiv:physics/0512143v1)

**Citation:** E. Ben-Naim, F. Vazquez, S. Redner (Los Alamos / Boston University, 2005). *What is the most competitive sport?* arXiv:physics/0512143v1. URL: https://arxiv.org/abs/physics/0512143
**Ledger completed:** 2026-09-21. **Read:** full text (PDF — complete 4-page letter: abstract, analysis, model, figures, table, references).
**Lane:** win_spread_total.
**Verdict:** ADAPT
the upset-frequency q as a league-parity/predictability index and the σ↔q model link are directly usable as season-level priors for GSE's NFL moneyline calibration.

## 1. Research question
Which sport is most competitive? Characterize parity via the variance σ of season-end winning fractions and predictability via the measured upset frequency q (fraction of games where the team with the worse record on game day wins), and build a model linking the two.

## 2. Dataset / schema
All regular-season games in 5 leagues, complete seasons only: FA 1888–2005 (43,350 games), MLB 1901–2005 (163,720), NHL 1917–2004 (39,563), NBA 1946–2005 (43,254), NFL 1922–2004 incl. AFL (11,770). 300,000+ games over a century. Sources: shrpsports.com, the-english-football-archive.com. Standings reconstructed chronologically to determine favorite/underdog per game (equal/no records excluded; ties = half-win each; location and margin ignored).

## 3. Method / model
Mock-league Monte Carlo: teams start equal, are paired at random, play a fixed (sport-specific) number of games; the team with the better record is the favorite; the underdog wins with fixed upset probability q < 1/2. Nonlinear master equations for the win/loss-record distribution show σ decreases with season length and with q. Infinite-season limit: winning-fraction distribution uniform on (q, 1−q), so σ = (1/2 − q)/√3. q_model fit by matching simulated F(x) to observed winning-fraction CDFs. Empirical q measured directly from chronological game results.

## 4. Equations & assumptions
σ = sqrt(⟨x²⟩ − ⟨x⟩²), x = winning fraction. Infinite-season: F uniform on (q,1−q) ⇒ σ = (1/2−q)/√3. Finite seasons: random-walk scaling σ ∝ 1/√(games) for pure chance; model interpolates. Assumptions: (1) all teams equal at season start (no innate strength — disparity emerges spontaneously); (2) fixed q across teams and season; (3) random pairing; (4) favorite = better record to date; (5) ties as half-wins (verified: ignoring ties changes q by ≤0.02).

## 5. Features / target
Features: season-end standings (for σ), chronological records (for q). Target: league competitiveness ranking via q.

## 6. Validation design
Two independent estimates of q per league: directly measured from game results vs q_model from fitting the standings distribution — agreement is the validation (Table I). No out-of-sample test; historical descriptive study.

## 7. Numerical results / baselines
Measured q: FA 0.452, MLB 0.441, NHL 0.414, NBA 0.365, NFL 0.364. q_model: FA 0.459, MLB 0.413, NHL 0.383, NBA 0.316, NFL 0.309 (good agreement, slight systematic underestimation). σ: MLB 0.084 (narrowest), NFL 0.210 (widest — largely short-season artifact). Conclusion: soccer and baseball most competitive; basketball and football least (nearly identical q). Trends: NFL and MLB becoming more competitive over time; FA less so over 60 years. Note: measured NFL q=0.364 means the worse-record team wins over a third of the time — a hard empirical floor on moneyline favorite pricing.

## 8. Code / data availability
No code. Data from public archives (shrpsports.com, the-english-football-archive.com). Reproducible from standings data.

## 9. Leakage & limitations
Stated: model has no innate team strength; game location ignored; margin ignored; ties approximated. Added: data end 2004–2005 (pre-modern NFL: no 17-game season, different overtime/CBA regimes); q_model systematically underestimates measured q by 0.03–0.06; favorite defined by record only (not market odds) — a market-based favorite would change q; short paper, no uncertainty quantification on q.

## 10. GSE overlap
The existing-research map shows GSE has team-strength and moneyline-adjacent work but no documented league-parity index or upset-frequency prior for calibration. No duplication. Directly on-lane for win_spread_total (moneyline calibration).

## 11. GSE implementation spec
Adapt q as a season-level calibration prior and parity tracker:
1. Recompute measured q for the modern NFL (2005–2025, nflverse): favorite = worse record on game day (paper's definition) AND, separately, favorite = closing-line favorite. The two q's bracket the "record-based" and "market-based" upset frequencies; the market-based q is the direct prior for moneyline calibration.
2. Use the current-season q as a shrinkage prior for moneyline probabilities: no calibrated NFL moneyline model should imply an underdog win rate far from the empirical ~0.36 (record-based) — flag any model whose implied underdog win frequency deviates persistently from q, as a calibration canary.
3. Use the σ↔q relationship as a cheap parity nowcast: estimate q_model from current standings' σ mid-season (no game-by-game reconstruction needed), tracking whether the season is running hot/cold on parity vs the historical baseline — a regime input for spread/total adjustments.
4. Refresh annually; the paper's trend finding (NFL competitiveness rising through 2004) needs a 2005–2025 update before it informs any prior.

## 12. Reproducible test
Compute both q definitions (record-based, market-based) for NFL 2005–2025 from nflverse + closing lines; verify record-based q ≈ 0.36 (paper replication) and record the market-based q. Pass criterion: replication within ±0.02 of the paper's NFL q on the overlapping definition, then install the market-based q as a standing calibration check on the engine's moneyline outputs (fail loudly if implied underdog win rate diverges by >0.03 over a rolling 3-season window).

## 13. Acceptance / rejection gate
ADAPT: q is a single, interpretable, empirically grounded number with a direct moneyline-calibration use and a cheap standings-based estimator. Not ADOPT: the 2005-vintage data and record-based (not market-based) favorite definition require the modern refresh in section 12 before any number enters the engine.

## 14. Improvement experiment
Beyond the paper: decompose the record-based upset frequency q by *cause* — model the season-level q as a function of structural changes (salary-cap era, free-agency rules, schedule expansion, draft order changes) across 2005–2025 using the paper's standings-based estimator each season. The paper stops at 2004 and never attributes parity changes to institutions. If cap-era dummies explain the rising-NFL-competitiveness trend the paper reports, GSE gets an institutional parity model that predicts how rule changes (e.g., schedule expansion) shift future upset rates — a prior for long-horizon futures and season-win markets that neither the paper nor GSE's current calibration has.
