# 1714 Using social networks to improve group transition prediction in professional sports (arXiv:2009.00550v1)

**Citation:** Emily J. Evans, E. C. Williams, Andrew C. Thomas (2020). *Using Social Networks to Improve Group Transition Prediction in Professional Sports*. arXiv:2009.00550v1. URL: https://arxiv.org/abs/2009.00550v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, all sections and references).
**Verdict:** ADAPT — the social-affinity-as-transition-signal idea is genuinely useful for GSE's free-agency/trade-prophet module, but the paper's social graph is scraped in July 2020 with no edge timestamps and used to predict transitions back to 2001/2002, so only the timestamped-graph recipe survives: use point-in-time social signals, never a current-snapshot graph.

## 1. Research question

Do social ties between players, observable on Twitter, predict which team a free agent or traded player joins better than performance/value features alone? The paper frames a player's transition as a "group transition" problem and asks whether the player's social network (whom he follows, who his teammates and potential teammates are) contains residual signal about his destination beyond salary, team quality, and rank. Empirically it tests whether adding Twitter-derived affinity features improves destination classification accuracy over a features-only baseline.

## 2. Dataset / schema

- MLB transitions 2002–2018: 4,207 unique players who switched teams, of whom 702 have identified Twitter handles. NBA transitions 2001–2018/2019: 1,847 unique switchers, 784 with handles. (Only players with Twitter handles enter the social features.)
- Twitter follow graph scraped in July 2020: for each tracked player, the set of accounts he follows.
- Per (player, candidate destination team) pair, features include: number of followed players currently on that team (social affinity), total Twitter reach, prior-team indicator, plus non-social features (salary, team performance/rank, player value metrics).
- Destination choice set: all possible teams in the league (MLB ~30, NBA ~30); random-guess accuracy 1/29 ≈ 3.45%.

## 3. Method / model

- For each observed transition, build a training row per candidate destination team with the features above; label = 1 for the actual destination, 0 otherwise. This is a multi-class destination classification problem.
- Classifiers tried: Random Forest, ExtraTrees, AdaBoost, XGBoost, logistic regression, K-Nearest Neighbors. Ten runs of a 70/30 random train/test split; results averaged.
- Feature sets compared: non-social only (team ID, salary, rank, value), social only (Twitter affinity and related), all features, and combinations (e.g., team ID + social).

## 4. Equations & assumptions

- Social affinity for player p and destination team t is operationalized as a count: affinity(p,t) = |{q : p follows q and q is on team t}|. No edge weighting, no recency, no directionality beyond follow-out.
- The core modeling assumption is that follow-graph structure at scrape time (July 2020) reflects social relationships that existed before the transition — the paper never models when a follow edge was created, so "affinity" mixes pre-transition friendships with post-transition follower accumulation.
- Implicit independence: each (player, team) row is treated as an independent observation; no team-capacity or roster-slot constraints (multiple players could all be predicted to the same team).
- Evaluation assumes the test split is exchangeable with the train split across 18 seasons of league structure.

## 5. Features / target

- Target: the team the player transitioned to (categorical destination).
- Social features: Twitter affinity counts per candidate team, total follows, follower counts, verified status, team roster overlap with followees.
- Non-social features: player salary, team win/loss rank, team value/quality metrics, current-team indicator.
- Feature importance (reported informally): Twitter affinity and current-team identity are the strongest predictors; salary/rank add modestly.

## 6. Validation design

- 70/30 random split of transition events, repeated ten times; mean accuracy reported. No season-based or walk-forward split — transitions from 2018 can be in training while 2005 transitions are in test, and vice versa.
- Baselines: random destination (3.45%) and non-social feature sets; comparison is always relative accuracy gain from adding social features.
- No cross-validation across time, no out-of-league holdout (MLB-trained model tested on NBA), no calibration analysis.

## 7. Numerical results / baselines

- MLB: social-only features 16.880% destination accuracy; all features 19.402%; team ID + social 19.955% (best reported). Non-social baseline (team ID etc.) sits below the social-only figure.
- NBA: Twitter-only 26.104%; all-social 26.667%; all features 29.740%; rank/value + social 30.238% (best reported).
- All figures are ~5–9x random (3.45%), so social affinity carries real signal; the gain of social over non-social is roughly +3–6 pp in both leagues.
- Reported as point means over ten 70/30 runs; no standard errors or significance tests given.

## 8. Code / data availability

- No public code repository link and no dataset download link found in the paper. Twitter handles were matched manually; the follow graph was scraped in July 2020 (a one-off snapshot). Reproducibility requires re-scraping Twitter and re-matching handles, which is not scripted in the paper.

## 9. Leakage & limitations

- **Fatal look-ahead leakage:** the follow graph was scraped in July 2020 with no edge timestamps, then used as a feature to predict transitions from 2001/2002 onward. Follows created after the transition (new teammates followed post-signing) leak the label directly into the features. The paper's social accuracy gains are therefore an upper bound contaminated by post-event follows, not a prospective forecast.
- No temporal train/test split; 70/30 random mixing across 18 seasons means the model sees future league structure when predicting past transitions.
- Handle identification is manual and only covers 16.7% of MLB switchers and 42.4% of NBA switchers — selection bias toward younger, more online players.
- No roster-capacity constraints; the classifier can assign every player to the same destination.
- No standard errors on the ten-run means; small differences between feature sets (e.g., 19.402% vs 19.955%) may not be significant.

## 10. GSE overlap

- GSE's offseason module needs a free-agency/trade destination prior (for player-prop and team-win-total adjustments after roster moves). Social affinity is an untested signal in GSE's existing research map — the beat-writer/social lane is listed as untested.
- Directly relevant to NFL free agency: players follow teammates/position coaches; "hometown/team ties" narratives move betting markets. A point-in-time-correct version of this signal could sharpen GSE's roster-move priors and detect market overreaction to social-media-driven rumors.
- No overlap with existing ledgers: the dedup set contains no social-network transition paper (checked against 1,093 base IDs).

## 11. GSE implementation spec

- Build `gse/offseason/social_affinity.py`: (a) ingest timestamped follow-graph snapshots (X API or archived snapshots, e.g., quarterly pulls) — never a single current snapshot; (b) for each pending NFL free agent, compute per-team affinity = count of followed accounts currently rostered on that team, using only follows created before the tampering window opens; (c) combine with GSE's existing transition features (cap space, team need, prior-team link, agent representation) in a gradient-boosted destination classifier; (d) output a destination probability distribution over 32 teams, used as a prior in the player-value and team-total adjustment pipeline.
- Guardrail: any follow edge without a creation timestamp is excluded from features (the paper's failure mode).
- Evaluate with walk-forward splits by league year (train ≤ year t, test year t+1), reporting log-loss and top-3 destination accuracy against a no-social baseline.

## 12. Reproducible test

- Backtest on NFL free agency 2021–2025: collect timestamped follow data (or, if unavailable, document the gap and use only pre-deadline beat-writer relationship mentions as a proxy); train destination classifier per year with walk-forward splits; success criterion: top-3 destination accuracy ≥ 2x random (9.4%) and log-loss improvement ≥ 0.05 nats over the no-social baseline, with the social feature's permutation importance > 0 in ≥ 4 of 5 years.

## 13. Acceptance / rejection gate

ADAPT (not adopt): the paper's headline accuracy gains are contaminated by July-2020 snapshot leakage, so nothing in its numerical results transfers directly. ADAPT only the recipe — timestamped per-team social-affinity features inside a walk-forward destination classifier — if the reproducible test above shows ≥ 2x-random top-3 accuracy on NFL data with strictly pre-tampering-window features. REJECT the paper's numbers outright if timestamped follow data is unobtainable: without edge timestamps the feature is definitionally leaky and must not enter GSE's pipeline.

## 14. Improvement experiment

Go beyond the paper in the direction it never attempts: make the graph temporal and weighted. (1) Weight follow edges by interaction (replies/mentions/likes) rather than raw follow counts — a follow is cheap, a mention thread is a relationship; test whether interaction-weighted affinity beats count affinity on the same walk-forward backtest. (2) Add the agent/coach network: players follow position coaches and trainers, and coach moves precede player moves; add coach-destination affinity as a feature and measure its incremental log-loss. (3) Run an ablation that quantifies exactly how much of the paper's reported gain is leakage: rebuild their snapshot-style (no timestamps) classifier on NFL data and compare against the timestamped version — the gap is a publishable measure of social-graph look-ahead bias in sports prediction, and it tells GSE exactly how much to discount any vendor signal built on current-snapshot social data.
