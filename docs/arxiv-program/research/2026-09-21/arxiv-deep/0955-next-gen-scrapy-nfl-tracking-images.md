# [0955] next-gen-scraPy: Extracting NFL Tracking Data from Images (arXiv:1906.03339)

## Citation / full-text source

- arXiv:1906.03339 — full text: https://arxiv.org/pdf/1906.03339
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Sarah Mallepalle, Ronald Yurko, Konstantinos Pelechrinis, Samuel L. Ventura (2019). *next-gen-scraPy: Extracting NFL Tracking Data from Images to Evaluate Quarterbacks and Pass Defenses*. arXiv:1906.03339. URL: https://arxiv.org/abs/1906.03339
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv conversion).
**Verdict:** ADOPT — the CPAE pipeline (GAM league completion surface + empirical-Bayes Naive Bayes shrinkage + spatial-density-weighted integral) reproduces the NFL's proprietary CPAE (ρ = 0.91 in 2018) from public data; directly implementable on nflverse pass data.

## 1. Research question
Can public data close the gap with the NFL's private tracking data? (1) Build an image-processing tool that recovers raw pass locations from the NFL's Next Gen Stats pass charts; (2) model league-wide, QB-level, and team-defense completion-percentage surfaces by field location; (3) define a one-number summary — completion percentage above expectation (CPAE) — and show it matches the NFL's proprietary CPAE.

## 2. Dataset / schema
- Source: NGS pass-chart images scraped from nextgenstats.nfl.com (2017–2018 NFL seasons, regular + postseason; 500+ games). Recovered via computer-vision pipeline: pass outcome (COMPLETE/INCOMPLETE/TOUCHDOWN/INTERCEPTION), coordinates x (downfield of LOS, yards), y (lateral, yards), plus metadata (game_id, team, week, name, pass_type, home/away, season).
- League-wide modeling set: **>27,000 passes**; typical team 400–700 attempts/season; individual QBs fewer.
- Validation set: NFL Big Data Bowl tracking data (first six weeks of 2017 only) — linked to scraped passes via a greedy record-linkage algorithm (incompletion locations absent from tracking data; no play IDs/timestamps in scraped set).
- Access: the scraped dataset is made public by the authors; code at https://github.com/ryurko/next-gen-scrapy.

## 3. Method / model
1. **next-gen-scraPy image pipeline:** computer-vision module processes NGS pass-chart images → K-Means++ clustering to identify passes and field locations (relative to LOS) → DBSCAN to remove noise from segmented images.
2. **League-wide completion model:** generalized additive model (GAM) for P(Complete | x, y) with smooth functions of distance from LOS and distance from field center; league-wide pass-location density via 2-D kernel density estimation.
3. **Individual/team surfaces:** 2-D Naive Bayes estimate that shrinks group surfaces toward the league surface. Notation: f̂_g = KDE of group g's pass locations; P̂_g = group raw completion surface; f̂_NFL, P̂_NFL = league versions; N_g = group attempts; N_Median = median attempts (empirical-Bayes scaling factor). The group estimate at each location is a precision-style weighted average of the group and league surfaces.
4. **CPAE_g:** spatial-density-weighted integral of the group's above-league-average completion surface (equation (1) in paper; see §4).
5. Greedy record linkage (Section 2.4.1–2.4.2) to validate coordinates against Big Data Bowl tracking.

## 4. Equations & assumptions
Shrinkage (2-D Naive Bayes) surface:
P̂*_G(Complete|x,y) = [N_g · f̂_g(x,y) · P̂_g(Complete|x,y) + N_Median · f̂_NFL(x,y) · P̂_NFL(Complete|x,y)] / [N_g · f̂_g(x,y) + N_Median · f̂_NFL(x,y)]
i.e., weight shifts from prior (league) to data as N_g grows.

CPAE (equation (1)):
CPAE_g = ∫_X ∫_Y P̂*_{g,league}(Complete|x,y) · f̂_g(x,y) dx dy,
where P̂*_{g,league} is the group's above-league-average completion surface, weighted by the group's spatial attempt density f̂_g.

Assumptions: (a) GAM smooths adequately capture completion-by-location; (b) pass locations are i.i.d. given (x,y) — no play-context (down, distance, pressure) conditioning; (c) median-deviation shrinkage weight N_Median is a fixed static prior strength; (d) scraped chart coordinates are unbiased for true target locations; (e) greedy linkage correctly pairs passes.

## 5. Features / target
- Inputs: x = yards downfield of line of scrimmage, y = yards lateral from field center; group identifier (QB or defense).
- Target: binary pass completion; derived surfaces P̂(Complete|x,y) and density f̂(x,y); final target CPAE_g (percentage points above expectation).

## 6. Validation design
- Coordinate accuracy: greedy record linkage of scraped completions to Big Data Bowl tracking (6 weeks 2017); distance and angular deviation distributions (Figures 11–13).
- Model sanity: league-wide GAM surfaces compared across 2017 vs 2018; team surfaces compared to Football Outsiders Defensive DVOA and PFR Expected Points Contributed by Defense; QB surfaces compared to ESPN Total QBR.
- CPAE: correlation with official NFL NGS CPAE for all qualifying QBs (≥100 passes/season) in 2017 and 2018; year-over-year stability correlation.

## 7. Numerical results / baselines
- Coordinate accuracy: **median deviation of 1.7 yards** between scraped and Big Data Bowl coordinates; deviation distribution heavily right-skewed (linkage errors at tails). Angular analysis: middle-of-field passes show no systematic angular difference; left/right-side passes suggest Big Data Bowl marks the receiver's shoulder-pad chip while scraped charts mark the ball.
- League-wide (from scraped data): 2017 — 68.5% of targets within 10 yards of LOS, 88.8% within 20; only 2.96% of 20+ yard targets in middle of field (−13.33 ≤ x ≤ 13.33). 2018 — 66.5% within 10, 89.2% within 20; 3.11% of 20+ yard targets middle. Median predicted completion: 73.3% (2017) / 76.8% (2018) within 10 yards; 65.4% / 69.7% within 20; 28.4% / 28.0% beyond 20; deep middle 30.4% / 30.5%, deep sidelines 26.5% / 22.7%.
- Defense surfaces agree with DVOA: 2018 Bears (−26.9% DVOA) and Ravens (−14.2% DVOA) show below-average allowed completion across the field; Raiders (12.3%) and Bengals (9.0%) above average, especially down the middle.
- CPAE leaders 2018 QBs: Drew Brees +6.14%, Ryan Fitzpatrick +3.42%, Nick Foles +3.42%, Russell Wilson +3.39%, Matt Ryan +3.22%, Carson Wentz +3.08%; worst: Blake Bortles −5.04%, Jeff Driskel −4.83%, Josh Rosen −4.54%, C.J. Beathard −4.37%.
- CPAE pass defenses 2018 (negative = better): Baltimore −5.24%, Chicago −2.43%, LA Rams −2.35%, Oakland −2.12%, Kansas City −1.98%; worst: Tampa Bay +6.89%, Atlanta +4.31%, New Orleans +4.07%. 4 of top 5 CPAE defenses made the 2018 playoffs (all but Oakland).
- Stability: corr(CPAE_2017, CPAE_2018) = **0.41 (p < 0.05)** across qualifying QBs.
- vs official NGS CPAE: ρ_2017 = **0.81**, ρ_2018 = **0.91**. Authors note their version shows no temporal trend while NGS CPAE rose in 2018 (suggesting more cross-season consistency).

## 8. Code / data availability
Code: https://github.com/ryurko/next-gen-scrapy (image pipeline + models; authors invite variants). Dataset: authors state the scraped dataset is made publicly available (no direct URL in text besides repo).

## 9. Leakage
- Dataset incomplete: "does not include every game played throughout 2017 and 2018" — missing pass charts bias toward charted games/QBs; play-calling and decision-making biases acknowledged as retrospective-only.

## Limitations
- No play context: completion surfaces ignore down, distance, pressure, coverage, receiver separation — the NFL's own CPAE conditions on receiver/defender locations, sideline distance, etc. The 0.81–0.91 correlation is achieved with a strictly weaker model; adding context would be the real test.
- Naive Bayes + KDE + GAM are each tuned rather than jointly optimized; hierarchical GAMs (Pedersen et al. 2018) noted as a better alternative for group surfaces.
- Greedy linkage validated on only six weeks of 2017 tracking; error characterization may not generalize.
- CPAE stability 0.41 is "medium" — partly real instability, partly selection bias (below-average QBs lose jobs), which the authors acknowledge.

## 10. GSE overlap
Existing-research-map: NGS 27-family taxonomy inventoried 2026-09-21 (completion probability is one family) and the @NextGenStats profile deep-dive — but no one has replicated CPAE in-repo, and the map shows no GAM/KDE spatial completion-surface work. gse-lab has QB aggressiveness and unit matchups from nflverse but nothing at the pass-location surface level. This is a **new capability**: an open-data CPAE benchmark and QB/defense matchup surfaces. Directly relevant to the engine-benchmark lane (props: pass-location-based completion probability by route area).

## 11. GSE implementation spec
- Data: nflverse play-by-play (pass_location/air yards not directly in nflverse; derive target coordinates from Big Data Bowl-style data or use the authors' public scraped set as a seed; alternatively approximate (x,y) from air_yards + pass_location fields).
- Steps: (a) build league GAM (mgcv or pyGAM) of completion on (air yards, lateral offset) per season; (b) 2-D KDE of attempt density; (c) Naive Bayes shrinkage per QB/team with N_Median prior; (d) CPAE integral on a field grid; (e) publish QB and defense CPAE tables weekly; (f) cross-check vs official NGS CPAE published weekly.
- Effort: ~1 day for the core pipeline; the repo (ryurko/next-gen-scrapy) is the reference implementation.

## 12. Reproducible test
Dataset: authors' public scraped set (2017–2018) or nflverse 2023–2024 passing plays with derived target coordinates. Baseline: raw completion% ranking of QBs. Test: compute CPAE via the §4 formulas and correlate with official NGS CPAE published for the same seasons; report Pearson ρ and mean absolute error vs official.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if ρ(scraped/computed CPAE, official NGS CPAE) ≥ 0.80 on a full season (2017 and/or 2018) AND median coordinate deviation ≤ 2.0 yards on any linked tracking sample. Otherwise reject the extraction approach and keep only the CPAE formula.

## 14. Improvement experiment
Condition the GAM on play context available in nflverse (down, ydstogo, shotgun, pass_location, air_yards, qb_hit/pressure proxies) and add receiver-separation features from tracking; test whether context-conditioned CPAE (a) raises year-over-year stability above 0.41 and (b) predicts next-season EPA/dropback better than raw CPAE in an out-of-sample regression.

## Verdict

**ADOPT** — verdict per wave-2 reader-15 report (full-read ledger; the acceptance criterion is stated in the numeric-gate section above).
