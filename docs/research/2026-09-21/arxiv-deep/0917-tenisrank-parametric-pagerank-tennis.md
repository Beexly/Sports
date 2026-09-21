# [0917] "TenisRank": A new ranking of tennis players based on PageRank (arXiv:1711.11122v1)

## Citation / full-text source

- arXiv:1711.11122v1 — full text: https://arxiv.org/pdf/1711.11122
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Alex Aronson (thesis; Univ. of Buenos Aires, 2015). *"TenisRank": A new ranking of tennis players based on PageRank*. arXiv:1711.11122v1 [cs.SI]. URL: https://arxiv.org/abs/1711.11122v1
**Ledger completed:** 2026-09-21. **Read:** full text (fetched PDF conversion, 1,884 wrapped lines incl. model, parameter search, P(victory), appendix with algorithms).
## Verdict

**ADAPT** — parametric edge-weighted PageRank (recency × surface × match-importance) plus a rating-difference → win-probability logistic map; both port directly to NFL power ratings and moneyline calibration.

## 1. Research question
Can a PageRank with per-edge weights (match age, surface similarity, tournament/round importance) beat both the ATP ranking and plain PageRank at predicting tennis matches, and can ranking differences be mapped to win probabilities?

## 2. Dataset / schema
923 tournaments 2000–2013, ~40,000 matches (tennis-data.co.uk): surface (hard/clay/grass), date, tournament type (ATP250/500/Masters1000/Grand Slam/Masters Cup), round, set scores, pre-match ATP ranks, and bookmaker odds (collected but never used in evaluation). MySQL tables: Players, Tournaments, Matches.

## 3. Method / model
- Directed multigraph: edge loser→winner per match; PageRank (scipy) on the multigraph.
- **Parametric edge weight:** W_edge = W_aging × W_surface × W_instance.
  - Aging: exponential decay N(t) in years-back; window 3–5 years tested.
  - Surface: weight 1 if match surface = target tournament surface, else tuned constant.
  - Instance: ATP-style round/tournament importance weight with tuned λ.
- Parameters tuned by greedy coordinate search on 90 tournaments (10/year).
- P(victory): logistic regression of hit-rate on ranking difference (a = 45.321); decision-tree variants by surface × tournament type; AUROC comparison.

## 4. Equations & assumptions
- W_edge = W_aging × W_surface × W_instance (multiplicative separability assumed).
- Exponential decay N(t); logistic P(victory) curve on rank difference.
- Assumptions: attributes combine multiplicatively; 4-year window sufficient; greedy search finds a good optimum; new players manually assigned an extreme rank (hack).

## 5. Features / target
Match age, surface match/mismatch, tournament type + round reached. Target: hit = higher-ranked player won.

## 6. Validation design
Per-tournament ranking generation, then hit/miss scoring on that tournament's completed matches; yearly aggregation; ANOVA on method differences; AUROC on P(victory) scores.

## 7. Numerical results / baselines
- ATP baseline predictive accuracy 2005–2013: **66.849%**; plain PageRank beat ATP at US Open 2013 (72.72% vs 70.25%).
- Aging alone (3yr, λ=−5): +1.3pp vs ATP, +0.8pp vs PageRank. Surface alone (0.5): +1.7pp vs ATP, +1pp vs PageRank.
- Combined (4yr, aging −5, surface 0.3, instance λ=1.7): **~70% hits**, +3pp vs ATP, +2.2pp vs PageRank.
- ANOVA: ATP vs PageRank p=0.14 (n.s.); ATP vs parametric p=0.000024; PageRank vs parametric p=0.00079.
- Itemized: wins on every surface (grass best, ~+2pp vs ATP), top-10 matchups (+3pp), all 5 tournament types (Grand Slams ~74%).
- P(victory): parametric curve more "optimistic" than ATP/PageRank with better AUROC (exact AUROC values only in figures).

## 8. Code / data availability
No public code; Python + scipy pagerank scripts described in appendix; data from tennis-data.co.uk.

## 9. Leakage
Ranking for a tournament uses only matches before it (age window) — no leakage by construction.

## Limitations
- Bachelor's thesis; greedy coordinate search finds a local optimum, no global search or CV.
- AUROC values reported only in figures, not text.
- New-player handling is a manual hack (assigned an extreme rank).
- **Bookmaker odds were collected and never used** — no market-efficiency comparison, the most interesting test.
- Multiplicative weight separability untested; tennis-only validation.

## 10. GSE overlap
No parametric edge-weighted PageRank in the corpus; complements 0915 (dynamic win-lose) with situational weighting. **Zero duplication.**

## 11. GSE implementation spec
1. **NFL parametric PageRank:** 32 team nodes, edge loser→winner per game, W_edge = W_recency × W_situation × W_importance. NFL analogs: recency = exponential decay in weeks; "surface" = dome/outdoor and turf/grass match/mismatch (real NFL splits!); importance = playoff vs regular season, rest differential.
2. **Tune like the thesis:** greedy coordinate search on 2015–2019, maximizing walk-forward hit rate.
3. **P(victory) mapping:** logistic fit of win rate on rating difference → direct moneyline-probability converter for the calibration lane; decision-tree variants by dome/outdoor × playoff.
4. **Do the test the thesis skipped:** compare the rating-implied probabilities against closing moneylines (CLV-style) — the market test they collected data for but never ran.

## 12. Reproducible test
Dataset: NFL 2015–2025. Protocol: walk-forward weekly parametric PageRank (tune 2015–2019, test 2020–2025); predict SU winners; fit P(win) logistic on rating diffs; compare log-loss vs Elo and vs closing moneyline-implied probabilities.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT iff the parametric PageRank beats Elo by ≥ 1pp SU accuracy or ≥ 2% log-loss on 2020–2025 (paired bootstrap p < 0.05), or its P(win) mapping is better calibrated (ECE lower) than the moneyline-implied baseline. Otherwise REJECT.

## 14. Improvement experiment
Replace greedy coordinate search with Bayesian optimization over the weight parameters (including margin-of-victory scaling inside W_edge), and add the head-to-head market test: does the rating edge survive against closing lines, i.e., is there CLV in fading/playing the parametric rating's disagreements?

**Verdict: ADAPT** — situational edge-weighted PageRank plus a rating→win-probability map, with the market-efficiency test the thesis never ran.
