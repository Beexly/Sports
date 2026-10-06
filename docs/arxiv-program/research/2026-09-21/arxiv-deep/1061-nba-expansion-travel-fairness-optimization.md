# 1061 — Fairness, Travel, and Market Potential: An Optimization Framework for NBA Expansion

## Citation / full-text source

- arXiv:2512.16968v1 — full text: https://arxiv.org/pdf/2512.16968
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2512.16968v1
- **Full-text URL**: https://arxiv.org/pdf/2512.16968v1
- **Authors**: Ali Hassanzadeh, Morteza Davari, Dries Goossens
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1507.00244v2 ("Expected Shortfall is jointly elicitable with Value at Risk — Implications for backtesting") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion (surviving verbatim records include `arxiv fixture congestion football prediction modeling paper`). From the deduped candidate pool, 2512.16968v1 was selected because (a) it is the only candidate formalizing travel/fixture-burden optimization with fairness constraints, (b) it reports hard travel-mileage numbers across 15 expansion scenarios, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2512.16968` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v1 PDF text via pdftotext: 34 pages, 2,306 lines — abstract, theory-distance construction, two optimization models (travel minimization, Nash bargaining), market-exposure constraint (γ=0.8), 15 expansion pairings from six candidate cities, 82/72-game × 2/4-division scenario results (Figures 5–8), discussion and managerial insights, limitations and future directions, impact statement, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

If the NBA expands to 32 teams, how should conferences/divisions be realigned to minimize travel while keeping the burden fair across teams and protecting each team's market exposure?

## Summary

How should the NBA realign if it expands to 32 teams? The paper builds two optimization models over conference/division assignment: (M1) pure **theory-travel minimization** and (M2) **Nash bargaining fairness**, where "theory distance" weights opponent distances by division/conference game frequency. Market exposure (metropolitan population as proxy) is constrained: every incumbent keeps at least **γ=0.8** of baseline exposure. Fifteen pairings from six candidate cities (Seattle, Las Vegas, Montreal, Vancouver, Tampa, Mexico City) are evaluated under 82/72-game seasons × 2/4 divisions per conference.

Headline numbers: current 30-team theory travel ≈ **2,583,763 miles**; optimized current structure **2,583,209** (pure) vs **2,583,232** (Nash) — **fairness costs essentially nothing in aggregate**. Geographically isolated pairings are expensive: Mexico City + Vancouver is the only pairing above 2.8M miles (2,802,722 in the 82-game/4-division scenario). A formulation note: the text describes Nash bargaining as product maximization, while displayed Model M2 minimizes **Σ log(w_i)** over travel-increase ratios w_i — mathematically this maximizes Π(1/w_i), pushing each team's increase ratio toward 1 with log diminishing returns, which is the fairness-inducing mechanism; GSE should verify the intended bargaining semantics before reusing M2 verbatim.

Core GSE lesson: **the theory-distance + MIP template is reusable for fixture-congestion modeling** — GSE can quantify any schedule's travel burden and its fairness distribution, then use travel burden as a fatigue covariate (linking to ledger 1059).

## Method

- Scenario grid: {82, 72} games × {2, 4} divisions/conference × 15 city pairings.

## Equations / assumptions

- Theory distance: opponent distance weighted by expected game frequency from division/conference structure; regression vs 2004–2018 actual travel gives **R² ≈ 0.34**.

- M1: minimize total theory travel (assignment MIP).

- M2: Nash bargaining — displayed as minimizing Σ_i log(w_i), w_i = team i's travel increase ratio vs baseline; constraint: market exposure ≥ 0.8 × baseline per team.

- Formulation note (from the paper's own text, also stated in the Summary above): the text describes Nash bargaining as product maximization, while displayed Model M2 minimizes Σ_i log(w_i) — mathematically maximizing Π(1/w_i), pushing each team's increase ratio toward 1 with log diminishing returns, which is the fairness-inducing mechanism; the ledger flags verifying the intended bargaining semantics before reusing M2 verbatim.

## Features / target

Inputs: NBA team geography; conference/division assignment; season length (82/72 games) and divisions per conference (2/4); candidate expansion city pairings (15 pairings from Seattle, Las Vegas, Montreal, Vancouver, Tampa, Mexico City); metropolitan populations as the market-exposure proxy.

Target: the assignment minimizing total theory travel (M1) or Nash-fair travel (M2), subject to every incumbent keeping ≥ γ=0.8 of baseline market exposure.

## Validation

Regression of theory distance vs 2004–2018 actual travel: R² ≈ 0.34 (in-sample — treat as calibration, not validation).

Scenario grid: {82, 72} games × {2, 4} divisions/conference × 15 city pairings.

## Exact results / baselines

Current 30-team theory travel ≈ 2,583,763 miles; re-optimized current structure: 2,583,209 (M1) vs 2,583,232 (M2) — fairness costs ~23 miles in 2.58M, essentially nothing in aggregate.

Mexico City + Vancouver is the only pairing above 2.8M miles: 2,802,722 in the 82-game/4-division scenario.

Baselines: the current 30-team alignment (comparator for the optimized M1/M2 totals).

## Code / data

Not stated in the paper.

## Dataset / schema

- NBA team geography; 2004–2018 actual travel (regression validation); metropolitan populations (market proxy); media-market universe estimates.

## Implementation (GSE adaptation)

1. **Fixture-congestion travel features**: **Implementation**: build the theory-distance calculator for NBA schedules (game-frequency-weighted travel); add team travel burden and travel-burden differential as features to the NBA game model, interacting with the rest/travel coefficients from ledger 1059.
2. **Schedule-fairness auditing**: the M1/M2 template lets GSE audit any released schedule for competitive fairness (who bears the travel burden) — content and modeling value.
3. **MIP template**: the division-assignment integer program is reusable machinery for any grouping/realignment problem GSE encounters.

**Implementation difficulty** (folded in from the original standalone section):

Medium. The theory-distance calculator is straightforward; the MIP needs a solver (open-source MILP is fine at this scale).

## Leakage

- Descriptive/prescriptive optimization; no predictive leakage. R²=0.34 regression is in-sample fit — treat as calibration, not validation.

## Limitations

- No back-to-back or long-road-trip modeling (authors flag this); distance ≠ fatigue (no sports-science integration).
- Metropolitan population is a crude revenue proxy (no ratings/attendance/sponsorship).
- Fairness only via Nash bargaining; max-min or CVaR alternatives unexplored.
- M2's displayed objective (min Σ log w_i) vs the text's product-maximization description needs reconciliation before reuse.

## GSE overlap

None in the tracked corpus. The map has schedule/travel only as anecdotal covariates with no verified coefficient and no optimization formalism. **Travel-burden optimization with fairness constraints is absent** — novel, and it operationalizes the fatigue features of ledger 1059.

## Reproducible test

- Reimplement theory distance for the current 30-team alignment; verify total ≈ 2,583,763 miles and that re-optimization yields ≈ 2,583,209 (M1) / 2,583,232 (M2).
- Verify the Mexico City + Vancouver pairing exceeds 2.8M miles in the 82-game/4-division scenario.

## Numeric gate

**ADAPT iff travel burden predicts outcomes: team travel-burden differential (theory distance over trailing N days) must improve GSE's NBA game model on rolling-origin log-loss beyond the ledger-1059 rest/travel features;** if distance adds nothing over rest days and direction, keep the MIP as content/schedule-analysis tooling only.

## Improvement experiment

(1) Reconcile the M2 formulation (test min-Σlog w_i against true Nash product maximization and max-min fairness on the same instances); (2) add back-to-back and road-trip-length structure the authors omitted; (3) replace population with media-market revenue estimates. Success criterion: the reconciled fairness model produces division alignments that domain experts (or historical realignment decisions) recognize as sensible, and travel-burden features clear the predictive gate.

## Verdict

**ADAPT** — A reusable optimization template (theory distance + travel-minimization/Nash-bargaining MIPs) with hard numbers: fairness costs ~23 miles in 2.58M, isolated city pairings are quantifiably expensive. GSE adapts the travel-burden calculator into NBA fatigue features and the MIP into schedule-fairness auditing, after reconciling the M2 objective formulation.
