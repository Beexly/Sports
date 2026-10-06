# [0569] An analysis of the NCAA college football playoff team selections using an Elo ratings model (arXiv:2403.03862v1)

**Citation:** Benjamin Lucas (2024). *An analysis of the NCAA college football playoff team selections using an Elo ratings model*. arXiv:2403.03862v1. URL: https://arxiv.org/abs/2403.03862v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 961 lines).
**Verdict:** ADAPT — the standard-Elo mechanics (expected-outcome formula, K-factor update) port directly to NFL/nflverse power-rating work, but the paper's audit framing (CFP committee selection) has no GSE transfer; adopt only the calibration recipe as an extension of GSE's existing Elo practice.

## 1. Research question
Was the CFP selection committee's 2023 exclusion of undefeated Florida State justified, and how well does an Elo-based ranking agree with the committee's playoff-team selections across every season of the 4-team CFP (2014–2023)? The paper uses Elo as an objective, transparent benchmark to assess the subjectivity of committee selections.

## 2. Dataset / schema
- Source: all NCAA Division I (FBS) college football games, 2014–2023 seasons. The paper does not name its data vendor; schema implied: game date, home team, away team, winner (binary outcome O_A ∈ {0,1}, no ties in CFB), used to iteratively update team ratings. No public URL given; CFP selection tables (Tables 1–12 in the paper) are presented as results, not datasets.
- Sample sizes: full-season Elo rating tables for the top 10–13 teams per season, 2014–2023 (Tables 3–12); aggregate selection counts by team and by conference (Tables 1–2).
- Not replicable as stated: exact game schedule data source is unstated. College game results for 2014–2023 are, however, publicly reconstructible from CFBD (CollegeFootballData API).

## 3. Method / model
- Classic single-parameter Elo with all teams initialized at 1500.
- Expected win probability for team A: p_A = 1 / (1 + 10^((R_B − R_A)/400)) (standard Elo divisor 400).
- Post-game update: R_A* = R_A + 25·(O_A − p_A), O_A ∈ {0,1}; zero-sum update for team B.
- K-factor (called "the chosen constant") fixed at 25 for every game, every season. The paper notes the constant "can be changed in order to make the ratings more or less sensitive to the outcome of single matches," but does not tune it — no hyperparameter search performed.
- No margin-of-victory weighting, no home-field term, no preseason-prior regression, no recency decay.

## 4. Equations & assumptions
- Expected outcome: p_A = 1 / (1 + 10^((R_B − R_A)/400)); p_B = 1 − p_A.
- Update rule: R_A* = R_A + 25·(O_A − p_A); R_B* = R_B + 25·(O_B − p_B).
- Assumptions (stated): (a) all teams start at 1500 each season — the paper does not say whether ratings carry across seasons or reset (implied per-season run, not explicitly stated); (b) no draws in college football (overtime resolves ties), so binary outcomes; (c) the same K=25 applies to every game regardless of timing (early-season vs championship games), conference, or margin; (d) strength of schedule is captured implicitly by Elo's opponent-relative updates; (e) Elo's heavier weighting of recent matches makes it a "currently best" ranking — this is a claim about Elo's behavior, not an explicit recency-decay term in the model.

## 5. Features / target
- Features: pairwise game outcomes (win/loss) only; opponent identity and rating at game time. No score, margin, venue, or roster features.
- Target: team Elo rating on CFP selection day (prior to committee selection), used to rank teams 1–N and to compare the top-4 Elo teams against the committee's four selections.

## 6. Validation design
- No train/test split, no backtest in the predictive sense; the validation is retrospective agreement between Elo rankings and committee selections (Tables 3–12, one per season 2014–2023).
- "Baseline": the committee's actual selections (a consensus/status-quo reference, not a model).
- Metric: overlap/disagreement between top-4 Elo and the committee's four teams; identification of the most egregious non-selections.

## 7. Numerical results / baselines
Quoted exactly from the paper (selection-day Elo rankings):
- 2023: committee selections ranked Elo 1st (Michigan, 2174), 5th (Texas, 2050), 6th (Alabama, 2039), 13th (Washington, 1883); Florida State 11th (1951). Per the paper, "the season with the largest disagreement between the CFP selection committee and the Elo ratings." Elo's top 4: Michigan, Georgia (2111), Ohio State (2108), Penn State (2061).
- Committee never selected the Elo top four in any season; twice selected four of the top five (2021, 2016).
- The only time the Elo No. 1 team was not selected: Alabama in 2022 (Elo 2151; CFP unranked).
- Three occasions a selected team was outside the Elo top ten: Notre Dame 2020 (11th), TCU 2022 (12th), Washington 2023 (13th).
- Aggregate selections (Table 1): Alabama 8 (3 championships), Clemson 6 (2), Ohio State 5 (1), Oklahoma 4, Georgia 3 (2), Michigan 3, Notre Dame 2, Washington 2, others 1 each.
- The paper cites prior literature (refs [1], [17], [15]) for Elo's predictive power but reports no out-of-sample prediction accuracy of its own.

## 8. Code / data availability
None stated. No GitHub link, no data URL.

## 9. Leakage & limitations
- No K-factor tuning, no validation of predictive accuracy — Elo is used descriptively, not backtested. There is no out-of-sample accuracy reported anywhere in the paper.
- Zero-sum constant-K Elo systematically punishes late-season championship-game losers vs undefeated weaker-schedule teams (the FSU 2023 result is arguably an artifact of FSU's weak schedule — Elo embeds SOS implicitly, but with K=25 and no preseason prior, early-season ratings of 1500 for all teams make early results disproportionately noisy).
- Ignores player availability entirely — precisely the criterion the committee used to exclude FSU (Jordan Travis injury). The paper acknowledges this ("Other relevant factors such as unavailability of key players") but Elo cannot incorporate it; the paper's "justified" claim is conditional on an information set the committee did not use.
- Margin of victory discarded; a 1-point win over Louisville counts the same as a blowout, understating dominant teams (notably Washington at Elo 13th with 1883 despite being committee #2).
- Cross-season rating carryover unstated — if ratings reset to 1500 each season, September Elo is mostly noise, contaminating "selection-day" rankings less for December but still embedding early-season noise with K=25.
- External validity to NFL: Elo with binary outcomes is directly transferable, but NFL needs spread/total modeling, not just win/loss ranking; a K=25 binary Elo has been tested extensively elsewhere (cf. nfelounits in the repo).
- Adversarial note: the paper's thesis ("ratings model should replace the committee") is a normative opinion resting on the assumption that the Elo ranking is the ground truth of "best team" — circular where the model and the committee use different information sets.

## 10. GSE overlap
Extension, not duplicate. Per existing-research-map.md §1: Elo, nfelo/nfelounits, and Massey/Sagarin/Colley ratings are already "inventoried (26-metric catalog + sweeps)" and computed in-repo (2026-09-17 gse-lab), and the ML brief covers learning-to-rank. What this paper adds is thin — it is an application/audit of textbook Elo, not a methods advance. No repo file currently contains a CFB-specific Elo audit, but the CFP-selection framing is not in GSE's scope. The useful carry is the clean, minimal Elo calibration recipe (1500 init, K=25, divisor 400) as a documented baseline for team-strength ratings on nflverse game results.

## 11. GSE implementation spec
- Build a standard-Elo baseline on nflverse 2000–2025: all 32 teams init 1500, K-factor tuned (grid 10–60) against log-loss of implied win probability on out-of-sample games, instead of the paper's fixed 25; expected-outcome formula with the 400 divisor.
- Add NFL-relevant extensions the paper lacks: home-field offset (~55 Elo points, tuned), margin-of-victory multiplier (e.g., scaled by log margin / expected-margin), preseason prior regression toward 1500 (≈60–70% carryover tuned).
- Features: game result only — feed from nflverse schedules; no charting needed.
- Effort: ~1 day (single script, grid search over K, HFA, MOV multiplier, regression weight; log-loss + Brier on 2015–2025 held-out seasons).

## 12. Reproducible test
- Dataset: nflverse schedules 2015–2025, all regular-season + playoff games (n ≈ 4,700).
- Metric: mean log-loss of implied win probability vs actual outcomes, seasons 2020–2025 held out (train 2015–2019).
- Baseline: fixed-K=25 plain Elo exactly as in the paper (recomputed on the NFL schedule).

## 13. Acceptance / rejection gate
- ADOPT the tuned-Elo spec if grid-tuned K + HFA + regression-to-mean beats the paper's fixed recipe (init 1500, K=25, no HFA) by ≥0.005 mean log-loss on 2020–2025, with a Brier-score improvement in the same direction.
- REJECT if the tuned variant fails to beat the fixed recipe — the paper's recipe is already the near-optimal simple form.

## 14. Improvement experiment
- Try a per-season Bayesian Elo with team-specific K drawn from a hierarchical prior (strong teams learn faster; early-season games get lower effective K via time-decay), fit by maximizing out-of-sample log-loss. The paper's constant K ignores that September CFB/NFL information is noisier than December; a time-varying K is the natural extension, and NFL's 17-game season makes the schedule-length sensitivity sharper than CFB's 12–15.
