# [0914] Data-Driven Team Selection in Fantasy Premier League Using Integer Programming and Predictive Modeling Approach (arXiv:2505.02170v3)

## Citation / full-text source

- arXiv:2505.02170v3 — full text: https://arxiv.org/pdf/2505.02170
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Danial Ramezani (2025). *Data-Driven Team Selection in Fantasy Premier League Using Integer Programming and Predictive Modeling Approach*. arXiv:2505.02170v3 [cs.AI]. URL: https://arxiv.org/abs/2505.02170v3
**Ledger completed:** 2026-09-21. **Read:** full text (cached corpus copy, 361 wrapped lines incl. model, estimators, results).
## Verdict

**ADAPT** — a complete integer-programming blueprint for salary-cap lineup optimization that ports directly to NFL DFS (DraftKings/FanDuel), GSE's weekly-DFS-packet lane.

## 1. Research question
Can a deterministic/robust integer program with well-estimated cost vectors (expected points) select fantasy lineups that beat naive selection out of sample?

## 2. Dataset / schema
FPL 2023/24 season, all 38 gameweeks (vaastav/FPL GitHub dataset). Per player per gameweek: total points, value (price), position, team, plus underlying features (BPS, ICT index, starts, cards).

## 3. Method / model
- IP: max Z = Σⱼ cⱼxⱼ + Σⱼ cⱼyⱼ (captain doubles); constraints: Σx = 11, Σvⱼxⱼ ≤ 83.5 (budget net of reserves), Σy = 1, y ≤ x, position min/max, ≤3 players per real team.
- Robust: box uncertainty U = {cⱼ ∈ [c̄ⱼ−dⱼ, c̄ⱼ+dⱼ]}; max_{x,y} min_{c∈U} Σ cⱼ(xⱼ+yⱼ).
- Cost estimators compared: simple average; linear-weighted average (wᵢ = i/Σj); Holt-Winters additive trend; empirical bootstrap; Monte Carlo; ARIMA(p,d,q); linear trend regression; hybrid (Ridge on non-scoring features via SHAP, blended 2:1 actual:predicted); alternative objectives (ICT index, EGI − EGC).

## 4. Equations & assumptions
- (1–8) IP formulation; (9) robust min-max; (10) box set; (11) robust objective.
- (12–14) averages; (15–18) Holt-Winters; (19–21) ARIMA; (22–23) linear trend; (24–26) Ridge + hybrid blend; (27–28) ICT / EGI−EGC objectives.
- Assumptions: expected points suffice as cost vector (no covariance/stacking); budget 83.5 leaves room for 4 reserves; missing-data weeks excludable without bias.

## 5. Features / target
Historical weekly points only (4.1–4.3); hybrid adds non-scoring underlying features (SHAP-selected). Target: out-of-sample weekly team score.

## 6. Validation design
Train on GW1–26, evaluate GW27–38 of 2023/24. Best variant per method compared head-to-head on weekly scores.

## 7. Numerical results / baselines
- Hybrid scored the single best week: **83 pts (GW27)**; Monte Carlo 82 (GW27) and best in GW30, GW33.
- **Weighted average most consistent** — top score in 5 gameweeks, more than any other method.
- Robust versions did NOT beat deterministic (except robust ICT, roughly tied) — box robustness added nothing.
- ICT objective ≫ EGI−EGC; ARIMA(0,1,1) most stable of ARIMAs; linear regression and ARIMA weakest overall.
- Emergent behavior: all strong methods chose **3-5-2**; Ollie Watkins in every team; keepers picked from weak defenses (save volume); expensive chalk (Salah, Haaland) mostly excluded on value.

## 8. Code / data availability
No code; data from the public vaastav/FPL dataset.

## 9. Leakage
None in estimation (all estimators use only pre-break data). Evaluation flaw: weeks with any missing player data were dropped entirely — selection bias in reported scores.

## Limitations
- No covariance/stacking — each player's points estimated independently; the optimizer can't value correlated stacks.
- No transfers, chips, or dynamic captaincy (author flags as future work).
- Single season, one league; budget 83.5 heuristic, not optimized.
- Robust box formulation empirically useless here — worst-case thinking over-penalized upside in a max-points game.
- Missing-data week exclusion biases the comparison.

## 10. GSE overlap
Garrett runs a **standing weekly DFS packet** (2026-09-20 rule) and GSE is building a props/DFS optimizer lane; the corpus has no integer-programming lineup optimizer with a captain/multiplier slot. **Method import, zero duplication.**

## 11. GSE implementation spec
1. **DK/FD Classic optimizer:** port the IP directly — max Σ projⱼxⱼ subject to Σ salary ≤ 50k, roster-slot constraints (QB/RB×2/WR×3/TE/FLEX/DST), ≤ team-stacking optional constraints. Cost vectors from GSE's existing projections.
2. **Showdown captain slot:** the paper's captain-doubling maps to DK Showdown's 1.5× captain — add y ≤ x, Σy = 1 with 1.5× multiplier.
3. **Projection estimation bake-off:** replicate their estimator comparison (weighted average vs Holt-Winters vs Monte Carlo vs hybrid) on NFL weekly fantasy points 2020–2025 to pick GSE's default projection smoother.
4. **Add the missing covariance:** extend beyond the paper — stack constraints (QB+WR correlation bonus) and robust-vs-deterministic retest on NFL data, since their robust result may not transfer.

## 12. Reproducible test
Dataset: DraftKings NFL Classic slates 2022–2025 (salaries + actual scores). Protocol: for each slate, generate the IP-optimal lineup under (a) weighted-average projections, (b) current GSE projections, (c) a naive top-projection-value greedy baseline; compare realized lineup scores and top-1% hit rate.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the IP optimizer into the weekly DFS packet iff it beats the greedy baseline's realized score in ≥ 60% of 2022–2025 slates AND the weighted-average-vs-current-projection bake-off winner is documented with a ≥ 3% mean-score edge. Otherwise REJECT.

## 14. Improvement experiment
Add stacking directly into the objective: bonus term λ·Σ_{(qb,wr)} corr_{qb,wr}·x_qb·x_wr (linearized with auxiliary binaries), tuned on 2022–2023, tested on 2024–2025 — the correlation-aware extension the paper omitted, which DFS theory says is the actual edge in tournaments.

**Verdict: ADAPT** — a full IP + captain + estimator bake-off blueprint for the GSE DFS optimizer, with a slate-win-rate gate before it touches the weekly packet.
