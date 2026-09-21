# [0910] Player Chemistry: Striving for a Perfectly Balanced Soccer Team (arXiv:2003.01712v1)

## Citation / full-text source

- arXiv:2003.01712v1 — full text: https://arxiv.org/pdf/2003.01712
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Lotte Bransen, Jan Van Haaren (2020). *Player Chemistry: Striving for a Perfectly Balanced Soccer Team*. arXiv:2003.01712v1 [cs.AI]. URL: https://arxiv.org/abs/2003.01712v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 25 pages).
## Verdict

**ADAPT** — Joint Offensive Impact is a formalized version of DFS "stacking" (QB–receiver pair chemistry), and the predict-chemistry-for-unseen-pairs setup ports directly to new QB–WR/TE combos (trades, rookie QBs, injuries). The defensive side is honest-but-weak (see §7).

## 1. Research question
How well does a team of soccer players gel together — can we (a) *measure* mutual chemistry between pairs who have played together, (b) *predict* chemistry between pairs who never have, and (c) *assemble* a maximum-chemistry eleven?

## 2. Dataset / schema
Wyscout match event data, 2015/16 → Dec 2019: **361 seasons, 106 competitions, 106,496 matches, 2,154 teams, 38,447 players**, converted to the SPADL1 action representation (socceraction package). Enriched with SciSports SciSkill/Potential, 22 Player Role scores, Physical Performance Indicators (duel strength, speed, work rate), plus player-pair metadata (same nationality/language/region, matches played together). Code: https://github.com/SciSports-Labs/player-chemistry.

## 3. Method / model
- **JOI (Joint Offensive Impact):** an *interaction* = two consecutive actions by two different players (p→q or q→p); its VAEP value = V(aᵢ^p) + V(aᵢ₊₁^q) summed over all interactions in a match, then normalized per 90 min together (JOI90). VAEP values each on-ball action by its effect on scoring/conceding probability.
- **JDI (Joint Defensive Impact):** for each opponent o, compute (expected OI − actual OI) where expected = season-to-date per-90 average with **Bayesian shrinkage to a position-specific prior below 700 minutes** (weights linear in minutes/700); distribute credit over defending pairs via a **responsibility share** = inverse Euclidean distance of default positions on a 5×5 pitch grid, averaged over the pair; weight by shared minutes.
- **Prediction:** CatBoost gradient boosting (handles categoricals natively); features = player age/position-line/height/weight/nationality/region/language, physical indicators, 22 role scores, same-culture flags, matches played together. Train 2015/16–2016/17 (355,671 pairs), val 2017/18 (185,927), test 2018/19–Dec 2019 (234,408); pairs required ≥700 min together. JOI model: 500 trees, depth 7. JDI model: 1000 trees, depth 5. Feature selection by validation RMSE.
- **Team Builder:** mixed-integer program (PuLP): max Σ_pΣ_q (α·E[JOI90] + (1−α)·E[JDI90])·x_p·x_q s.t. Σx_p=11, 1 GK, 3–5 DEF, 3–5 MID, 1–3 FWD, with α trading offense for defense.

## 4. Equations & assumptions
- JOI_m(p,q) = Σ_k V(I^k_m(p,q)) + Σ_l V(I^l_m(q,p)); JOI90 = 90·Σ_m JOI_m / Σ_m MINS_m(p,q).
- JDI_m(p,q) = Σ_o (E[OI_m(o)] − OI_m(o))·RESP_m(p,q,o)·MINS_m(p,q,o)/90; RESP_m(p,q,o) = (RESP_m(p,o)+RESP_m(q,o))/2.
- E[OI_m(p)] = per-90 season average from matches 1..m−1, shrunk toward position prior below 700 min.
- Team Builder MIP as above.
- Assumptions: high chemistry ⇒ better joint performance ceteris paribus; consecutive-action VAEP sums capture "interaction quality"; defensive credit can be distributed by positional proximity; cultural features might matter (tested, found weak).

## 5. Features / target
Pair features: both players' physical/role/profile attributes, same-nationality/language/region/subregion flags, matches played together before the season. Targets: JOI90 / JDI90 labels.

## 6. Validation design
Temporal split (train/val/test across seasons, no shuffle); RMSE vs mean-prediction baseline on the test window. Feature importance analysis on the fitted CatBoost models. Case-study use cases (Man City CB target, Real Madrid RW, Ziyech destination) as applied validation.

## 7. Numerical results / baselines
- JOI prediction: **RMSE 0.04464 vs baseline 0.05448** (~18% reduction) — real signal.
- JDI prediction: **RMSE 0.88906 vs baseline 0.89075** — essentially no improvement; the defensive chemistry model is barely better than predicting the mean. Treat the JDI *prediction* as unproven (the JDI *measurement* is still usable descriptively).
- Top JOI90: Salah–Firmino (Liverpool, 2017/18 UCL) 0.7077 — highest in dataset; Suárez–Messi (2015/16) 0.6497; Nagasato–Kerr (2019 NWSL) 0.6096.
- Feature importance: Player Role scores dominate (Mobile Striker, Deep-Lying Playmaker, Ball-Playing Defender for JOI; Holding Midfielder, Ball-Winning Defender for JDI); matches-played-together matters most early, diminishing after ~50; cultural features (same nationality/language) have **limited predictive power** — "communicate with their feet," not passports.
- Applied: Özil's JOI collapsed after Sánchez's 2018 departure; Team Builder picks Bayern Munich as Ziyech's best chemistry fit; Alderweireld > Koulibaly for City's *offensive* chemistry due to long passing (+ 41 shared Belgium caps inflating the pair).

## 8. Code / data availability
Code: https://github.com/SciSports-Labs/player-chemistry (linked in paper). Wyscout data proprietary; socceraction package is public.

## 9. Leakage
Expected-OI uses only matches *before* match m (causal) — good. The 41-shared-caps effect (Alderweireld–De Bruyne) shows "matches played together" can dominate predictions for national-team pairs — a confound to handle, not leakage per se. No shuffle-split; temporal design is sound.

## Limitations
- Soccer event data only; "interaction" = consecutive actions maps awkwardly to football (plays are discrete; consecutive *plays* rarely involve the same pair twice in a row the way soccer touches do — need drive-level or route-level redefinition).
- JDI prediction is a null result dressed as a model (ΔRMSE 0.0017) — do not build on predicted JDI.
- Responsibility shares from static 5×5 default positions ignore actual tracking geometry (authors flag this as future work).
- Cultural/communication features tested and found weak — the interesting hypothesis died.
- Use cases are retrospective storytelling, not prospective bets.

## 10. GSE overlap
GSE stacks QBs with receivers in DFS (standing practice) but has no *measured* pair-chemistry metric — stacking is by correlation intuition, not by joint-impact estimation. The existing-research-map has no pair-interaction/chemistry work. This formalizes an existing GSE heuristic into a measurable, predictable quantity: **new capability, not duplication**.

## 11. GSE implementation spec
1. **NFL JOI:** define a pair interaction at the drive level — for each QB–pass-catcher pair, sum EPA of consecutive-play sequences where both touch the ball (pass attempt → reception; also scramble-drill extensions), plus drive-level co-production; normalize per dropback together → JOI/dropback.
2. **NFL JDI (descriptive only):** for each defensive pair (e.g., CB+safety), compute opponent-receiver EPA below expectation (expectation = trailing-4-week per-route average, shrunk toward positional prior below ~100 routes — mirroring the paper's 700-min Bayesian rule); responsibility share from pre-snap alignment distance (NGS tracking) instead of the 5×5 grid.
3. **Predict unseen pairs:** gradient boosting on pair features (QB: aDOT, aggressiveness, time-to-throw; receiver: route mix, separation, contested-catch; shared snaps; scheme similarity) → predict JOI for new combos (traded WRs, rookie QBs, post-injury lineups) for the prop model and DFS stacking.
4. **Team Builder analog:** constrained lineup optimizer maximizing Σ predicted pair JOI under salary cap — a chemistry-aware DFS optimizer variant.

## 12. Reproducible test
Dataset: nflverse 2020–2025. Protocol: (a) compute QB–receiver JOI/dropback per season; (b) train the unseen-pair predictor on 2020–2023, test on 2024–2025 new pairs (≥100 shared dropbacks); report Spearman ρ between predicted and actual JOI; (c) DFS backtest: stacks from top-decile predicted JOI vs correlation-baseline stacks, 2023–2025 slates, paired difference in lineup points.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the JOI stack metric iff (a) predicted JOI achieves Spearman ρ ≥ 0.40 vs actual next-season JOI/dropback on unseen pairs, AND (b) top-decile-JOI stacks outscore baseline stacks by ≥ 5% in the DFS backtest (paired t, p < 0.05). The JDI *prediction* path is REJECTED unless it beats the mean baseline by ≥ 5% RMSE — the paper's own result says don't bother.

## 14. Improvement experiment
Replace consecutive-play interactions with **drive-level Shapley attribution**: each drive's EPA is split among the skill players who touched the ball via Shapley values over the drive's play sequence — handles the discreteness problem of football vs soccer and credits blockers/screen-setters the paper's framework misses. If Shapley-JOI beats consecutive-play JOI on the gate, it becomes the default.

**Verdict: ADAPT** — measured + predicted QB–receiver joint impact for stacking and props; descriptive defensive-pair impact; skip predicted JDI per the paper's own near-null result.
