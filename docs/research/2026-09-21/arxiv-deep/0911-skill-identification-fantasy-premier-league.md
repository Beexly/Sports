# [0911] Identification of skill in an online game: The case of Fantasy Premier League (arXiv:2009.01206v1)

## Citation / full-text source

- arXiv:2009.01206v1 — full text: https://arxiv.org/pdf/2009.01206
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Joseph D. O'Brien, James P. Gleeson, David J. P. O'Sullivan (2020). *Identification of skill in an online game: The case of Fantasy Premier League*. arXiv:2009.01206v1 [physics.soc-ph]. URL: https://arxiv.org/abs/2009.01206v1
**Ledger completed:** 2026-09-21. **Read:** full text (cached corpus copy, 787 wrapped lines incl. supplements).
## Verdict

**ADAPT** — three portable instruments: (1) template-team detection via co-occurrence clustering = formal DFS chalk measurement; (2) the "fraction of better transfers possible" metric = a decision-quality audit for GSE's own optimizer/waiver logic; (3) skill-persistence correlations to calibrate how much of DFS ROI is real edge vs noise.

## 1. Research question
Is success in fantasy sports skill or luck? What decisions distinguish consistently top-ranked managers, and does collective behavior (herding into a "template team") emerge?

## 2. Dataset / schema
FPL 2018/19: **901,912 managers** with full-season data (from ~1M top-ranked; ~50M API calls to fantasy.premierleague.com endpoints: entry/event/picks, bootstrap-static, history). Historical: ~6M managers in 2019/20, ~3.8M with ≥1 prior season, 13 seasons of pairwise overlap. Game rules: £100M budget, 15-man squad, 11 starters + captain (2×), 1 free transfer/week (−4 pts per extra), 4 chips (Bench Boost, Free Hit, Triple Captain, 2× Wildcard), blank/double gameweeks from rescheduling.

## 3. Method / model
- **Skill persistence:** pairwise Pearson correlations of season points totals across 13 seasons; OLS of 2018/19 points on number of prior seasons played.
- **Tier analysis:** disjoint tiers by final rank (top 10³ / 10⁴ / 10⁵ / 10⁶); per-gameweek mean-point deltas vs overall average.
- **Transfer quality:** net points of transfer (points of player-in minus player-out next GW); "fraction of better transfers possible" y_G(x_i,x_j) = share of players priced ≤ q_G(x_i) who outscored the chosen player — a perfect-foresight regret metric; CCDF compared across tiers.
- **Financial cognizance:** OLS of final points on team value at each GW (team value = supply/demand-driven player prices).
- **Chip strategy:** timing distributions + point returns by tier.
- **Template team:** player co-occurrence matrix A^G_ij (# teams containing both i and j); hierarchical clustering (k=4, elbow on WSS); Jaccard similarity J^G(i,j) = |T_i∩T_j|/|T_i∪T_j| between manager squads, sampled 100 teams × 10,000 resamples per tier-pair per GW.

## 4. Equations & assumptions
- y_G(x_i,x_j) = Σ_k 1[q_G(x_k)≤q_G(x_i)]·1[p_G(x_k)>p_G(x_j)] / Σ_l 1[q_G(x_l)≤q_G(x_i)] (transfer regret).
- J^G(i,j) Jaccard; A^G_ij co-occurrence counts.
- Assumptions: top-1M managers are engaged enough that inactivity doesn't dominate; chip non-use ≈ churn proxy (acknowledged biased); co-occurrence reflects consensus belief, not just correlated fixtures.

## 5. Features / target
Manager decisions (transfers, captaincy, chip timing, team value trajectory, squad sets) as features; target = season points total / final rank.

## 6. Validation design
Observational, tier-comparative; no predictive model. Historical correlations are the skill evidence; tier gaps are the mechanism evidence.

## 7. Numerical results / baselines
- Season-to-season points correlation **0.42** (2018/19 vs 2017/18, n≈3M); 13-season matrix ranges 0.13–0.47, decaying with gap — persistent skill over a decade.
- +1 year of experience = **+22.1 points/season** (R²=0.082); winner scored 2659.
- Top tiers beat lower tiers *every* GW, not just a few; largest gaps: GW1 (preparation before a ball is kicked: top-10³ averaged 88.16 vs 63.17), DGW35, BGW33.
- Transfer quality: top tiers' net transfer points higher; their "better-transfer-possible" CCDF decays faster (consistently pick nearer-optimal replacements).
- Captaincy points distributions shift right with tier.
- Team value: +£1M at GW19 → **+21.8 final points** (R²=0.169); top-10k team values diverge upward from GW1.
- Chips: **79.4% of top-10k** played Bench Boost in DGW35 vs 28.9% of the rest; returns **23.2 vs 13.8** points. Dominant top-manager sequence: Free Hit DGW32 → Wildcard GW34 → Bench Boost DGW35 (long-horizon planning).
- Template team: 3 smallest clusters contain only **5.13% (32/624)** of players yet anchor most squads; Jaccard similarity rises with tier and oscillates — consensus forms then dissolves; GW1 already shows high similarity among top managers (shared pre-season information).
- Retention proxy: 85.05% used all chips (top-manager-biased).

## 8. Code / data availability
None. Data via public FPL API endpoints (documented in Methods).

## 9. Leakage
None relevant — retrospective behavioral analysis. Transfer-regret metric uses next-GW points (perfect foresight) as a *measurement* of decision quality, not a predictive feature — correct usage.

## Limitations
- FPL, not NFL DFS: salary-cap dynamics, chips, and blank/double GWs have no exact NFL analogs (closest: bye weeks, late-season rest, showdown slates).
- Top-1M sample is engagement-biased; churn estimates don't generalize.
- Tier analysis is correlational — can't separate "skill causes good decisions" from "good decisions' survivors."
- Co-occurrence clustering can't distinguish consensus belief from correlated optimal responses to fixtures.

## 10. GSE overlap
GSE publishes a weekly DFS packet and runs lineup optimization, but has no formal chalk-measurement or decision-audit instrumentation. The existing-research-map has nothing on fantasy-manager behavior or template/chalk detection. This paper supplies **measurement instruments for GSE's own game**, not a duplicate.

## 11. GSE implementation spec
1. **Chalk index:** each slate, build the player co-occurrence matrix from projected-ownership-weighted lineup fields (or from the optimizer's candidate pool); hierarchical cluster; report the ownership share of the top-3 clusters = template concentration. Publish in the weekly DFS packet as the "chalk meter."
2. **Contrarian trigger:** when template concentration is in the top quartile historically, tilt GPP lineups to low-Jaccard-similarity constructions vs the template core (systematic leverage, not gut fades).
3. **Transfer-regret audit:** adapt y_G to GSE's optimizer — for every lineup swap/waiver recommendation, compute the fraction of same-salary-or-cheaper alternatives that outscored the pick; track the CCDF weekly as a decision-quality KPI (the paper's exact metric, ported).
4. **Skill calibration:** compute season-to-season correlation of GSE's contest ROI (or of public leaderboard regulars) to size the real edge before scaling stakes.

## 12. Reproducible test
Dataset: 2023–2025 DraftKings NFL main slates (salaries, actuals, projected ownership from a public source or GSE's own). Protocol: (a) compute template concentration per slate; (b) split slates into concentration quartiles; (c) compare ROI of template-following vs template-fading lineup constructions within each quartile.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the chalk-meter + contrarian tilt iff, on 2023–2025 backtest, template-fading lineups achieve ≥ 10% higher ROI than template-following lineups on top-quartile-concentration slates (paired by slate, p < 0.05), with no significant ROI loss on bottom-quartile slates. Otherwise REJECT.

## 14. Improvement experiment
Replace static co-occurrence with a **temporal** template tracker: EWMA-smoothed ownership vectors across the week (Tue→Sun) to detect *when* consensus crystallizes — the paper shows templates form and dissolve; fading early-crystallizing chalk vs late-breaking news-chalk should have different payoffs. If crystallization-timing predicts contrarian ROI better than the static index, it becomes the trigger.

**Verdict: ADAPT** — a chalk-measurement instrument, a decision-quality audit metric, and a skill-calibration method, all directly usable in GSE's DFS operation.
