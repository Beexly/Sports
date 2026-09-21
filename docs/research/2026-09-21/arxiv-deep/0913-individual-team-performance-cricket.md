# [0913] Individual and team performance in cricket (arXiv:2401.15161v2)

## Citation / full-text source

- arXiv:2401.15161v2 — full text: https://arxiv.org/pdf/2401.15161
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Onkar Sadekar, Sandeep Chowdhary, M. S. Santhanam, Federico Battiston (2024). *Individual and team performance in cricket*. arXiv:2401.15161v2 [physics.soc-ph]. URL: https://arxiv.org/abs/2401.15161v2
**Ledger completed:** 2026-09-21. **Read:** full text (cached corpus copy, 521 wrapped lines incl. Methods, Results, Discussion).
## Verdict

**ADAPT** — four portable instruments: era normalization factor, fractional contribution, effective team size (injury-vulnerability metric), and a shuffle-null hot-streak test.

## 1. Research question
What universal patterns govern individual careers (timing of peak performance, early-career predictiveness, drop/re-entry, leadership effects, specialist value) and team success (streaks, balance of contributions) in ODI cricket?

## 2. Dataset / schema
4,418 men's ODI matches, 1971–March 2024, 2,863 players, scraped from howstat.com. Per match: date, teams, runs/wickets/overs, player batting (position, balls, 4s/6s) and bowling (overs, runs, maidens, wickets), captain and wicket-keeper metadata.

## 3. Method / model
- Era normalization: nf = ⟨Team runs⟩_all / ⟨Team runs⟩_year multiplies runs scored/conceded (borrowed from citation normalization, Radicchi et al. 2008).
- Fractional contribution: fc = ½·(runs scored/total team runs + wickets taken/total team wickets) ∈ [0,1]; specialists capped at 0.5.
- Effective team size: S_eff = 2^H, H = −Σ_c fc log₂ fc (entropy of contribution distribution).
- Null models: shuffle performance timestamps (100×) per player for individual hot streaks; shuffle match-result timestamps (10⁴×) holding win count for team streaks.
- Tests: K-S, Wilcoxon signed-rank, Mann-Whitney U, Welch's t; effect size r = U/(n₁n₂).

## 4. Equations & assumptions
- nf = ⟨Team runs⟩_all / ⟨Team runs⟩_year (II.3)
- fc = ½(runs scored/total team runs + wickets taken/total team wickets) (Eq. 1)
- S_eff = 2^H, H = −Σ fc log₂ fc (II.4.3)
- Assumptions: runs/wickets are valid performance proxies; era normalization multiplicatively separable from skill; contribution shares sum to 1 across a team.

## 5. Features / target
Runs, wickets, strike rate, batting position, captaincy status, role classification (≥25 matches thresholds); targets are career-best timing, career averages, streak lengths.

## 6. Validation design
Null-model comparisons (shuffled timestamps) with non-parametric tests; career split at first 25 matches vs full career (min 50 matches); pre/post drop windows; captaincy phases (before/during/after).

## 7. Numerical results / baselines
- Random impact rule: N*/N uniform, K-S vs null p > 0.05 — peak can occur anywhere in a career.
- Hot streaks: ΔN/N ∈ [0, 0.2) ratio > 1 (Wilcoxon p < 0.001) — best performances cluster in time.
- Early→full career: R² = 0.45 (batsmen), R² = 0.66 (bowlers); ~55% of batsmen improve on early averages vs ~45% of bowlers.
- Drop/re-entry: ~19% decline over 5 matches pre-drop; post-return +36% (batsmen) / +30% (bowlers) vs final pre-drop match; gains persist.
- Captaincy: 172 captains; captain-batsmen avg 31 vs 26 runs (+16%); captain-bowlers 0.96 vs 1.13 wickets (−18%); MWU p < 0.001. Performance rises during captaincy for batsmen, falls for bowlers; both decline post-captaincy.
- Specialists: openers 31 runs @ SR 63 vs non-openers 26 @ SR 69 (p < 0.001); mean fc: all-rounders ≈ 0.11 > bowlers ≈ 0.10 > batsmen ≈ 0.06 (K-S p < 0.001); keepers 0.7 dismissals/match vs fielders 0.3 (Welch p < 0.001).
- Team streaks: P(7+ straight wins) = 9× chance; P(7+ straight losses) = 3× chance. Winning teams' median S_eff ≈ 6.9 vs 6.6 for losers (+4%, p < 0.001, r = 0.56) — balanced contributions win.

## 8. Code / data availability
No code; data scraped from howstat.com (open-access repository).

## 9. Leakage
None material — descriptive/retrospective analysis with null models; the early-career regression uses only first-25-match data as the predictor.

## Limitations
- ODI cricket only; end-of-match aggregates, no within-match temporal dynamics.
- nf normalization assumes scoring inflation is uniform across player types.
- The Q-model confound: early↔career correlation may just reflect persistent talent differences, not development (authors acknowledge, SM4).
- Drop/re-entry comeback partly selection: only players good enough to be recalled are observed.
- Home advantage, bowler-type heterogeneity ignored (authors flag).

## 10. GSE overlap
No era-normalization formula, no contribution-concentration metrics, no shuffle-null streak tests in the existing corpus. **Zero duplication.**

## 11. GSE implementation spec
1. **Era normalization for historical comps:** apply nf = ⟨league scoring⟩_all / ⟨league scoring⟩_season to cross-era player comparisons in props/fantasy content (e.g., comparing a 2025 WR season to 2015).
2. **NFL fractional contribution:** per-game fc = ½·(player yards / team yards + player EPA / team EPA) — a single-game "how much of the team was this guy" score for player ratings and anytime-TD reasoning.
3. **Effective team size as injury-vulnerability index:** compute S_eff weekly per NFL team over the trailing 8 games from EPA shares; low S_eff = concentrated production = a star injury moves the number more. Feed into spread/total adjustments when a high-share player is Q/OUT.
4. **Hot-streak shuffle test for props:** detect genuine hot hands by comparing a player's recent big-game clustering against 1,000 timestamp-shuffled nulls; use as a feature (not a narrative) in anytime-TD and yardage-prop models.
5. **Post-bench bounce:** test the +30–36% comeback effect on NFL players returning from benching/suspension/injury for yardage and TD props.

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2025. Protocol: compute weekly S_eff and fc for all 32 teams; test (a) whether S_eff predicts the magnitude of spread movement when a team's top-fc player is declared OUT (interaction regression), (b) whether fc leaders' next-week EPA beats a yards-only baseline prediction.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the S_eff injury-vulnerability index iff the S_eff × star-OUT interaction term is significant (p < 0.05) with the correct sign (low S_eff → bigger line move) on 2023–2025 injury events; ADOPT fc ratings iff they predict next-week EPA with lower MAE than a rolling-EPA baseline. Otherwise REJECT.

## 14. Improvement experiment
Replace the entropy S_eff with a Herfindahl-style concentration measure weighted by positional replaceability (a backup RB replaces production more easily than a QB — weight shares by positional WAR-replacement curves), and validate whether replaceability-weighted concentration predicts line moves better than raw S_eff.

**Verdict: ADAPT** — era normalization, fractional contribution, effective team size (injury vulnerability), and shuffle-null streak tests, each with a hard predictive gate.
