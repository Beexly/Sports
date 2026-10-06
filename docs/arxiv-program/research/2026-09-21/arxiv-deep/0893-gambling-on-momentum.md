# [0893] Gambling on Momentum (arXiv:2211.06052v1)

**Citation:** Marius Ötting, Christian Deutscher, Luca De Angelis, Carl Singleton (2022). *Gambling on Momentum*. arXiv:2211.06052v1 [econ.GN] — Bielefeld University / University of Bologna / University of Reading.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2211.06052.pdf, read in full (1,018 lines through the conclusion and limitations; references scanned).
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the cleanest behavioral-bias evidence in this wave: with second-by-second bookmaker odds + staked volumes (612 Bundesliga matches, 2017/18–18/19), bettors stake ~40% more on teams with apparent momentum (equalizer-scorers: +12.7pp relative stakes, p<0.01) while momentum has zero effect on outcomes (logit β₂=0.115, SE 0.286) and zero effect on bookmaker odds (β₂=−0.017, SE 0.128) — and always betting the momentum loses substantially (−7.4% to −23.3% ROI across subgroups). The adaptation is a fade-the-narrative feature for GSE's in-play models, not a momentum-following system.
**Replacement context:** Fresh-search replacement (corrected fielded arXiv API search, 2026-09-21: Kelly + betting vertical) for fresh candidate 2001.04226v2, which at finalization was found to already have an ADAPT ledger (0601, phase 1) and to be present in done-ids.txt — duplicate discovered at ledger time, replaced rather than double-counted. Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: Marius Ötting, Christian Deutscher (Bielefeld), Luca De Angelis (Bologna), Carl Singleton (Reading). arXiv v1 dated 2022-11-11. Empirical behavioral-finance paper using proprietary bookmaker data.

## Research question
Do bettors believe in momentum — specifically, does the sequence of goals (who scored the 1–1 equalizer) change (a) actual match outcomes, (b) bookmaker odds, (c) bettors' staking behavior — and can betting on perceived momentum be profitable?

## Dataset / schema
- Major European bookmaker's second-by-second odds + staked volumes for all 612 German Bundesliga matches, 2017/18 and 2018/19 seasons, including in-play event timing (goals, red cards).
- Analysis sample: 212 matches reaching 1–1 with the equalizer before the 85th minute.
- Stakes rescaled by an undisclosed constant (relative comparisons valid, absolute euros hidden).
- Schema: per second — decimal odds (home/draw/away), staked volumes per outcome; per match — goal times, red cards, kickoff odds.
- Access: proprietary (bookmaker); not public.

## Method
- Three regressions on the 1–1 equalizer event, each match appearing twice (equalizer-scorer perspective + conceder perspective), SEs clustered at match level:
  1. **Outcome**: logit Pr(win_i,m=1) = β₀ + β₁·impprob + β₂·equaliser + β₃·minute + β₄·redcard (eq. 1).
  2. **Bookmaker odds**: linear odds_i,m = β₀ + β₁·impprob + β₂·equaliser + β₃·minute + β₄·redcard + u (eq. 2).
  3. **Bettor stakes**: linear relstake_i,m = β₀ + β₁·startodds + β₂·equaliser + β₃·minute + β₄·prerelstake + β₅·redcard + u (eq. 3).
- Controls: kickoff odds-implied probability, minute of equalizer (mean 47), red-card difference, pre-equalizer relative stakes.
- Robustness: squared minute terms, interactions (minute×redcard, impprob×equaliser, equaliser×minute), 3-minutes-after stakes as alternative response, implied-probability response for odds.

## Equations / math / assumptions
- Eq. 1 (outcome logit), eq. 2 (odds linear), eq. 3 (stakes linear) as above.
- Headline estimates: outcome β₂(equaliser) = 0.115 (0.286), n.s.; odds β₂ = −0.017 (0.128), n.s.; stakes β₂ = 0.127*** (0.028) — 12.7pp higher relative stakes on the equalizer-scorer; +35.7% at covariate means (46.5% in the prerelstake-controlled spec).
- Assumptions: 1–1 equalizer is the clean momentum event; relative stakes proxy bettor belief; clustered SEs handle the doubled observations; no selection on which matches reach 1–1 beyond the controls.

## Features / target
- Features: equalizer indicator, kickoff implied prob / start odds, minute, red-card difference, pre-event stakes.
- Targets: (1) win indicator, (2) post-event decimal odds, (3) post-event relative stakes.

## Validation
- Outcome: no momentum effect in full sample, first half, or second half (all β₂ insignificant; McFadden R² 0.132).
- Odds: bookmaker does not price momentum (β₂ insignificant in all specs; R² 0.563).
- Stakes: strong, robust momentum-chasing — +12.7pp (any time), +19.4pp second half; R² 0.621 with prerelstake control; robust to all interaction/squared-term extensions.
- Profitability: always-back-the-equalizer ROI = −20.1% (moderate favorites, 70 bets), −7.4% (moderate longshots, 50 bets), −23.3% (strong longshots, 72 bets); +0.6% for strong favorites (20 bets, 13 won) — vs 7.9% average overround.

## Exact results with baselines
- Descriptives (minute after equalizer): 47.0% of stakes on the equalizer-scorer, 37.2% on the conceder, 18.6% on the draw — while the draw is the most likely outcome (39.3%), then conceder win (33.2%), then scorer win (27.5%).
- Stakes β₂ = 0.127*** (0.028); second-half β₂ = 0.194*** (0.027).
- ROI of momentum-following: −7.4% to −23.3% (subgroups above); bookmaker overround 7.9%.
- Absolute activity doubles in the minute after the equalizer (60/min vs 30/min in the 3 minutes before).

## Code / data availability
Proprietary bookmaker data; no public code or data. Method is fully specified and reimplementable.

## Leakage
- Ex-post event definition (1–1 known); the staking analysis is descriptive of bettor behavior, not a predictive model — no leakage in the causal claim, but the ROI computations assume execution at observed post-event odds.

## Limitations
- Bettor-level panel absent: cannot distinguish hedging/rebalancing by the same bettors from genuine momentum-chasing (authors argue the bias direction makes this second-order).
- In-play statistics beyond goals/red cards (shots, xG, substitutions) not linked — momentum perception may load on omitted events.
- No cross-match momentum (teams' prior equalizer experiences) modeled.
- Bundesliga-only, 1–1 event only; generalization to other momentum narratives (red cards, NFL scoring runs) untested.

## GSE overlap vs existing-research-map
Existing-research-map.md lists "Hawkes processes / self-exciting models — momentum/scoring-burst modeling absent" as gap #14, and the betting-market lane has no in-play behavioral-bias paper. This is the corpus's first paper with actual staked-volume data (not just odds) and the first clean test of a momentum narrative. Directly fills gap #14's behavioral half.

## Implementation spec (GSE adaptation)
- **What to build:** a GSE "narrative-fade" feature for in-play models: (a) detect salient narrative events (equalizers, scoring runs, red cards, NFL turnovers/big plays); (b) measure the market's overreaction via odds-move vs model-WP-move divergence in the minutes after; (c) fade the overreaction — shade GSE's live probabilities against the narrative-driven steam. The paper's +12.7pp/40% overbetting figure calibrates the expected edge size.
- **Content use:** the "bettors believe in momentum, momentum doesn't exist" result is a ready-made GSE content/analytics piece for in-play betting education.
- **Effort:** 2 weeks for the event-detection + divergence-measurement pipeline on GSE's odds feed.

## Reproducible test
- On any league with timestamped odds (GSE's Pinnacle archive or public soccer odds): replicate eq. 3 around goals — test whether post-goal odds-implied stake proxies (via odds moves) overweight the scoring team relative to a no-momentum model.

## Numeric gate
- ADAPT confirmed if, in GSE's odds data, post-goal odds moves systematically exceed model-implied WP moves in the narrative direction (overreaction) in at least one league with p<0.05. If no overreaction is found, the Bundesliga finding is market-specific — record that boundary.

## Improvement experiment
- **Cross-sport momentum audit:** run the equalizer-style event study on NFL scoring plays (does the market overreact to a pick-six vs a methodical TD drive?) and NBA runs (12–0 run); test whether narrative-salience (not just score change) predicts the overreaction size. Success: salience-ranked events show monotonic overreaction — a general "narrative premium" model.

## Verdict
**ADAPT** — The paper's value is the clean identification: real staked money (not just odds) chasing a narrative that doesn't exist, with the bookmaker correctly ignoring it and the chasers losing 7–23%. For GSE that is both a model feature (fade narrative steam in-play) and a content asset. Proprietary data is the limit; the method ports to any timestamped odds feed.
