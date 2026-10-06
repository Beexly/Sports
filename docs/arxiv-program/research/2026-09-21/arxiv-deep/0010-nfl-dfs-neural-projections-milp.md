# 0010 NFL DFS Neural Projections + MILP (arXiv:2309.15253v2)

**Citation:** Joseph M. Mahoney, Tomasz B. Paniak (2023). *Method and Validation for Optimal Lineup Creation for Daily Fantasy Football Using Machine Learning and Linear Programming*. arXiv:2309.15253v2. URL: https://arxiv.org/abs/2309.15253v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, v2, 28 September 2023; 32 pages, 12 figures).
**Verdict:** REJECT as a production approach — maximizing point-estimate projected FPTS under salary constraints is the exact thing Garrett's real Week 2 practice already supersedes; retain only its MILP skeleton as a sanity-check baseline.

## 1. Research question
Can a supervised neural network that forecasts NFL player fantasy points (FPTS) from past performance, combined with a mixed-integer linear program (MILP) that selects the FPTS-maximizing lineup under DraftKings salary/roster constraints, produce lineups that beat random lineups and compete with real DraftKings users?

## 2. Dataset / schema
- **2018 NFL regular season** player performance data, scraped from internet sources (exact sources: **Not stated in paper** as recoverable — the paper says data was "gathered and scraped from a variety of sources across the internet").
- Per-player, per-week fantasy-relevant statistics feeding a neural network that projects *upcoming-week* DraftKings FPTS from *past* performance.
- Real-world DraftKings user lineups used as the competitive benchmark (source/method of collection: **Not stated in paper** as recoverable).
- Schema (exact columns), sample sizes (players × weeks), and access: **Not stated in paper** as recoverable.

## 3. Method / model
Two stages:
1. **Projection:** a supervised-learning neural network predicts each player's upcoming-week DraftKings FPTS from past player performance (2018 regular season). Network topology (layers, nodes, activations), feature list, optimizer, loss, epochs, regularization: **Not stated in paper** as recoverable from the indexed text — the paper describes it only as "a supervised learning neural network ... created and used to project FPTS based on past player performance." Do not invent an architecture.
2. **Optimization:** the projected FPTS feed a **mixed-integer linear program** that selects the FPTS-maximizing lineup subject to DraftKings salary-cap and roster constraints. Exact objective formulation and constraint set: **Not stated in paper** as recoverable (standard form would be max Σ proj_u · x_u s.t. Σ salary_u · x_u ≤ cap, positional counts, x_u ∈ {0,1} — but the paper's exact statement was not recovered, so this is GSE inference, not a paper claim).
3. **Evaluation:** optimized lineups vs. randomly-created lineups (random construction method: **Not stated in paper** as recoverable), then vs. real DraftKings user lineups by percentile finish.

## 4. Equations & assumptions
- **No equations recovered** from the indexed text for the neural network, the FPTS projection, or the MILP. Per the rules: not restated here, never invented.
- Assumptions (paper's, from the abstract): (a) past player performance predicts upcoming-week FPTS well enough for lineup optimization; (b) maximizing projected FPTS under salary constraints is the right objective; (c) random lineups and real-user lineups are informative benchmarks.
- Unstated assumptions (GSE adversarial read): (d) point estimates of FPTS are sufficient — no uncertainty, ownership, correlation, or contest-payout structure; (e) the 2018 season's scraped data is clean and correctly aligned to DraftKings scoring/salaries.

## 5. Features / target
- **Inputs:** past player performance statistics (exact feature list: **Not stated in paper** as recoverable).
- **Target:** upcoming-week DraftKings fantasy points (FPTS) per player.
- **Prediction horizon:** one week ahead, re-run weekly through the 2018 regular season.

## 6. Validation design
- Week-ahead projection through the 2018 NFL regular season; train/test split protocol and whether splits are time-ordered: **Not stated in paper** as recoverable.
- Baselines: (1) randomly-created lineups; (2) real-world DraftKings user lineups (percentile comparison).
- Metrics: average FPTS vs. random lineups; percentile finish vs. real users.
- Projection accuracy metrics (MAE/RMSE of the neural network's FPTS forecasts): **Not stated in paper** as recoverable — the paper evaluates *lineup outcomes*, not projection quality, which is itself a design weakness (a bad projector can still beat random lineups).

## 7. Numerical results / baselines
Quoted exactly from the paper (paper claims):
- Optimized lineups **outperformed randomly-created lineups on average** (exact margin: **Not stated in paper** as recoverable).
- Against real DraftKings users, the generated lineups **"generally fell in approximately the 31st percentile (median)"**.
- The authors frame the work as a **baseline** for future improvement ("can be further improved using this study as a baseline comparison") — the paper's own conclusion, and the correct one.
- *GSE interpretation:* 31st percentile against real users means the method loses to ~69% of the field. Beating random lineups is a near-zero bar (random lineups routinely violate basic DFS construction). The paper's honest contribution is documenting that point-estimate maximization is not competitive — a negative result worth keeping.

## 8. Code / data availability
**Not stated in paper** as recoverable from this reading. (A related Penn State honors thesis by overlapping authors describes a similar XGBoost-based DFS project on the 2017 season that lost $11,086 in simulated DraftKings Double-Up contests — related work by the same group, not this paper's code.)

## 9. Leakage & limitations
- **The objective is wrong for the game:** maximizing mean projected FPTS ignores everything that determines DFS profitability — ownership (chalk vs. leverage), player correlation (stacking), ceiling/floor asymmetry, contest payout structure (top-heavy GPP vs. cash), lineup portfolios, and field duplication. A 31st-percentile finish is the predictable consequence.
- **No uncertainty modeling:** point projections with no variance/covariance estimates cannot do risk-aware construction; the paper's title promises "performance under uncertainty" but the recoverable method contains no uncertainty quantification.
- **Weak baselines:** "beats random lineups" demonstrates almost nothing; real-user percentile is the only honest benchmark and it fails.
- **Stale single season:** 2018 data, one season, no regime analysis; salaries, scoring meta, and optimizer sophistication have all moved on.
- **Undocumented pipeline:** no feature list, no architecture, no split protocol, no projection-accuracy metrics — the result is not reproducible from the paper as recovered.
- **Survivorship/selection in user comparison:** the real-user lineup sample's construction is undocumented; percentile claims depend entirely on which contests/users were sampled.

## 10. GSE overlap
- **Comparison with Garrett's actual Week 2 DFS practice (required):** the existing corpus (`docs/research/2026-09-19-dk-week2/dk-week2-2026-main-research.md`, `LANE-BRIEFING.md`) shows GSE practice already operating far above this paper's level:
  - The repo's **exact DFS optimizer** was run on a **131-player pool** (per 2026-09-20 method repair), with **live gates**: lobby salaries (DK draft-group API returned Akamai denials, so salaries were corroborated second-party, not endpoint-verified), **Sunday 11:30 CT inactives**, and **SNF/MNF ownership**.
  - Slate definition is handled explicitly (13-game main slate; SNF excluded; IND@KC entirely out of the pool).
  - Position-by-position research lanes with pts/$1K, leverage, CB-liability mapping, game-environment stack tiers, and adversarial overturns (Etienne thesis dead, Bowers doubtful, Purdy out/Mac Jones starting).
  - The authoritative build came from Garrett's uploaded `GSE-Week2-Lineup-Card.pdf` (Lineup A: Jayden Daniels + Washington stack vs. Dallas; Lineup B: Dak five-man Dallas stack); two contradictory lineup builds were refused, and the unverifiable 40,000-run Monte Carlo numbers (6.97% P(win) etc.) were stripped from all public copy.
  - Existing-research-map review: the map already records "deep Week 2 DFS practice" and flags "DFS academic optimization/ownership equilibrium" as a *gap* — this paper fills none of it, because it has no ownership, equilibrium, or portfolio content.
- Verdict on overlap: the paper is a **strictly dominated baseline** relative to current GSE practice. Its only residual value is the MILP skeleton as a regression-test floor ("never do worse than naive point-max").

## 11. GSE implementation spec
1. **Do not implement this paper's pipeline as a product.** Implement its MILP skeleton (max Σ proj·x s.t. salary cap + positional constraints) as a **baseline module** in the existing optimizer codebase, run weekly on the same 131-player-scale pool and projections.
2. **Keep everything Garrett's practice already has** and the paper lacks: live salary ingestion with verification status labeled, inactive gates, ownership projections (even sparse public ones like Schultz ~5.5% pOWN), stacking/correlation rules, contest-type-aware portfolio construction.
3. **Add the paper's missing piece properly:** replace point projections with distributional projections (mean + variance + within-game correlation) and optimize expected payout, not expected points — the standard industry correction the paper never attempts.
4. **Effort:** GSE inference only — no estimate stated as fact. The MILP baseline itself is a small build against the existing optimizer.

## 12. Reproducible test
- **Dataset:** a completed NFL week from nflverse (player stats) + archived DraftKings salaries for that week's main slate + archived contest results/percentiles if obtainable.
- **Metric:** percentile finish of the MILP-max lineups vs. the actual contest field.
- **Baseline to beat:** Garrett's current optimizer output on the same slate — the paper's method must *not* be adopted unless it beats the existing practice, which the paper's own 31st-percentile result suggests it will not.
- **Window:** 4+ completed weeks, to average out single-week noise; report median percentile and interquartile range.

## 13. Acceptance / rejection gate
- **ADOPT** (as baseline module only) if: the MILP-skeleton reproduces within ±2 percentile points of the paper's ~31st-percentile result on modern slates (validating it as a faithful floor), AND it runs inside the existing optimizer's live-gate pipeline without modification to salary/inactive handling.
- **REJECT** the paper's approach as any kind of upgrade if: median percentile finish is below the 40th percentile on the 4-week window, or if adding the existing optimizer's ownership/stacking constraints to the MILP changes lineup composition substantially (proving the paper's unconstrained point-max is the wrong objective — the expected outcome). Either way, the paper's projection-then-maximize paradigm is not promoted beyond baseline status.

## 14. Improvement experiment
Beyond the paper: **payout-aware stochastic optimization.** Replace the deterministic MILP with: (1) distributional FPTS projections per player (quantile regression or ensemble for mean/variance, plus a learned within-game correlation matrix for stacking); (2) Monte Carlo simulation of the slate under ownership projections; (3) optimization of *expected payout* over a lineup portfolio with a duplication penalty against projected field ownership — i.e., maximize expected ROI, not expected points. Why it might win: the paper's negative result (31st percentile) diagnoses exactly this gap — in top-heavy GPPs, the winning lineup is a high-ceiling, low-duplication tail event, and no point-estimate maximizer can find tail events. This is the experiment the paper's own "baseline for future work" framing invites, and it is the direction Garrett's live-gate, ownership-aware practice already points.
