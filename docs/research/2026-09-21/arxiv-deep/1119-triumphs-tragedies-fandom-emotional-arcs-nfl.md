# [1119] The triumphs and tragedies of fandom: Emotional arcs in NFL tweets (arXiv:2607.18461v1)

**Citation:** Elisabeth Kollrack, Michael V. Arnold, Peter Sheridan Dodds, Christopher M. Danforth (2026). *The triumphs and tragedies of fandom: Emotional arcs in NFL tweets*. arXiv:2607.18461v1. URL: https://arxiv.org/abs/2607.18461
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; entire main paper plus tables/appendix material read).
**Verdict:** ADAPT — the fandom-radius geography method and game-window sentiment-arc features are portable inputs to GSE's engagement prediction and fanbase-targeting work; the paper's lexicon sentiment engine should be replaced, not adopted.

## 1. Research question
What is the geographic shape of NFL fandom, and how do fans' collective emotions arc before, during, and after games? The paper maps team fandom radii from geotagged tweets and traces sentiment arcs across game windows.

## 2. Dataset / schema
- **Twitter Decahose** (random **10%** sample), **2011–2014 regular seasons**, **geotagged tweets** only.
- **Seven-day windows** per game: three days before through three days after.
- **19,174 team-season-metro observations** for the scaling analysis.

## 3. Method / model
- Activity: **A(M_i) = Tweets(M_i) / Population(M_i) × 100,000** per metro area.
- Core/baseline threshold: cumulative **70%** of population; **fandom radius** = first distance from the stadium where normalized activity falls below background.
- Sentiment: **lexicon-based** scoring (hedonometer-style; scores in the ~6.0 range); pregame/halftime/end-of-game windows compared for winners vs losers.

## 4. Equations & assumptions
- A(M_i) = Tweets(M_i)/Population(M_i) × 100,000. Scaling result: activity ∝ (population)^α with **α = 0.53, R² = 0.64**. Assumptions: (a) geotagged tweet volume ∝ fan presence; (b) the 70% cumulative-population threshold separates core from baseline; (c) lexicon sentiment captures fan emotion (weakest assumption — sarcasm/context failure acknowledged).

## 5. Features / target
- Features: geotagged tweet counts, lexicon sentiment by time window. Targets: (a) fandom radius per team-season; (b) sentiment arcs (pregame/halftime/end) conditioned on game outcome.

## 6. Validation design
- Observational/descriptive — no predictive validation. Corroboration: inside-fandom vs overall sentiment Spearman **ρ = 0.85, p < 0.001**; win percentage vs sentiment Pearson **0.33**.

## 7. Numerical results / baselines
- Fandom radius range: **Ravens 121 km** to **Seahawks 782 km**.
- Sentiment (winner/loser): pregame **6.14 / 6.09**; halftime **5.86 / 5.80**; end of game **6.12 / 5.77** — winners rebound, losers stay depressed.
- Scaling: α = 0.53, R² = 0.64 across 19,174 observations.
- Paper's claim: fandom has measurable geographic footprint scaling sublinearly with population; emotional arcs are asymmetric (losses linger).

## 8. Code / data availability
- None stated in paper (Decahose is proprietary Twitter data).

## 9. Leakage & limitations
- **2011–2014 data** — a decade old; Twitter's user base, geotagging rates, and the NFL media landscape have all changed. (b) Geotagged tweets are a self-selected subset. (c) **Hashtag-based team assignment** risks misclassification; **matchup tweets counted for both teams** double-counts the most emotional content. (d) Lexicon sentiment fails on sarcasm — endemic in sports Twitter. (e) Purely descriptive; no test that these features predict anything.

## 10. GSE overlap
- Related: `0306-predicting-the-nfl-using-twitter.md` and `0841-using-twitter-to-predict-football-outcomes.md` (both Twitter→outcome prediction — this paper is geography + emotion arcs, a distinct object of study); `0264-twawler-a-lightweight-twitter-crawler.md` (data collection tooling). The map's "text/news as features" gap is about prediction, not fan geography. **Extension**, not a duplicate.

## 11. GSE implementation spec
- **Use case 1 — content targeting:** rebuild fandom radii with 2024–2026 X data to geo-target GSE clips/posts (e.g., Seahawks' 782 km radius vs Ravens' 121 km implies very different geo-fencing).
- **Use case 2 — engagement features:** pregame/halftime fan-sentiment arcs as features for viewership and betting-handle models (the paper's winner/loser asymmetry is a ready-made feature: post-loss sentiment depression).
- **Method fix:** replace the lexicon with a transformer sentiment model fine-tuned on sports text (handles sarcasm); entity-resolve team mentions instead of hashtags.
- **Effort:** ~2 engineer-weeks (X API costs are the constraint).

## 12. Reproducible test
- Dataset: 2024 NFL season X data, 7-day game windows. Test A: replicate the radius estimation for 5 teams; sanity-check against known fanbase surveys. Test B: add pregame sentiment-arc features to a viewership model (Elo + market-size baseline). Metric: out-of-sample R² gain.

## 13. Acceptance / rejection gate
- **Adopt** the features if they add ≥2pp of out-of-sample R² to the viewership baseline on 2024 data; **adopt** the geography if replicated radii rank-correlate (Spearman ≥0.7) with an independent fanbase measure; **reject** otherwise.

## 14. Improvement experiment
- **Playoff and rivalry extension:** the paper covers regular seasons only. Test whether rivalry games show compressed fandom-radius overlap (both fanbases tweeting in the same metros) and amplified sentiment arcs — and whether a rivalry indicator built this way predicts handle/viewership spikes better than the base model. Rivalry is where emotion→money should be strongest.
