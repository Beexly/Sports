# 1054 — The efficacy of tournament designs

## Citation / full-text source

- arXiv:2103.06023v4 — full text: https://arxiv.org/pdf/2103.06023
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2103.06023v4
- **Full-text URL**: https://arxiv.org/pdf/2103.06023v4
- **Authors**: Balázs R. Sziklai, Péter Biró, László Csató
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1103.1303v3 ("On the visualisation, verification and recalibration of ternary probabilistic forecasts") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion (surviving verbatim records include `arxiv sports scheduling round robin tournament optimization paper` and `arxiv tournament design fairness sports optimization`). From the deduped candidate pool, 2103.06023v4 was selected because (a) it gives the most complete simulation comparison of tournament formats (Swiss vs knockout vs round-robin) with numeric efficacy results, (b) it quantifies the (small) value of seeding, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2103.06023` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v4 PDF text via pdftotext: 26 pages, 1,618 lines — abstract, tournament-design taxonomy, six win-probability models, one-million-simulation methodology, efficacy metrics (inversion counts, ranking recovery), Swiss/knockout/round-robin comparisons, seeding analysis, all appendices and appendix tables, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

Which tournament format — Swiss system, knockout, or round-robin — best identifies the strongest competitors, i.e., best recovers the true strength ranking?

## Summary

Which tournament format best identifies the strongest competitors? The authors simulate **one million tournaments** under six different win-probability models and compare designs on efficacy — how well the final ranking recovers the true strength ranking (measured by inversion counts). Two headline results:

1. **Swiss-system tournaments generally outperform equal-match-count alternatives** at recovering the full ranking.
2. **Realistic seeding improves efficacy by at most ~3%** — much less than intuition suggests.

Sharp numbers: a five-round Swiss beats a knockout on inversion count with probability **0.6350 (skill=1), 0.9044 (skill=5), 0.9379 (skill=10)**, and **0.5598 (chess), 0.6676 (soccer), 0.7095 (tennis)** under the three empirical models. Core GSE lesson: **when GSE simulates tournaments (World Cup, Champions League, playoffs), the format choice dominates seeding choice for ranking fidelity** — and the paper's simulation harness is a reusable template for format-aware Monte Carlo pricing of futures and qualification markets.

## Method

- One million replications per (design, model) cell; designs: knockout, round-robin, Swiss (various rounds), with/without seeding.

## Equations / assumptions

- True strengths \(s_1 > s_2 > \dots > s_n\); win probability models: parametric in skill gap (skill = 1, 5, 10) plus empirical chess/soccer/tennis calibrations.

- Efficacy metrics: inversion count between true ranking and tournament-produced ranking; probability that the design beats an alternative on inversions.

## Features / target

Inputs: tournament design (format, number of rounds, seeding on/off); true team strengths; win-probability model (parametric skill gap or empirical calibration).

Target: the tournament-produced ranking; efficacy is the inversion count vs the true ranking (lower is better), plus the probability that one design beats another on inversions.

## Validation

Pure simulation study: one million replications per (design, model) cell.

Six win-probability models: three parametric skill-gap levels (skill = 1, 5, 10) plus three empirical calibrations (chess, soccer, tennis).

Full comparison matrices reported in the paper's appendices.

## Exact results / baselines

Five-round Swiss beats knockout on inversion count with probability 0.6350 (skill=1), 0.9044 (skill=5), 0.9379 (skill=10).

Under the empirical models: 0.5598 (chess), 0.6676 (soccer), 0.7095 (tennis).

Realistic seeding improves efficacy by at most ~3%.

Baselines: knockout and round-robin designs at equal match counts (the comparators Swiss beats).

## Code / data

Not stated in the paper.

## Dataset / schema

- Pure simulation study (no empirical match data beyond the three calibrated probability models).
- Results reported as full comparison matrices in appendices.

## Implementation (GSE adaptation)

1. **Futures/qualification pricing harness**: GSE's tournament outright and qualification probabilities should be simulated with format-faithful brackets, not generic Monte Carlo. **Implementation**: port the paper's design taxonomy (knockout/Swiss/round-robin generators + seeding rules) into the simulation module; validate that format choice moves outright prices by the magnitudes the paper implies.
2. **Seeding-value quantification**: the ≤3% seeding result means GSE should not overweight draw/seed news in futures — a citable prior for the content desk and a regularization target for the model.
3. **Swiss-format expertise**: with chess, esports, and the new UCL formats using Swiss systems, the paper's Swiss-vs-knockout numbers (e.g., 0.9044 at skill=5) give GSE a head start on modeling formats competitors treat as black boxes.

**Implementation difficulty** (folded in from the original standalone section):

Low. Tournament simulators are standard code; the paper contributes the design taxonomy and the seeding-value quantification.

## Leakage

- Simulation study with known ground truth — no leakage possible by construction.
- Empirical probability models are pre-calibrated; applying them to new tournaments assumes transportability.

## Limitations

- No real tournament data used for validation — purely simulation.
- Six probability models may not span real upset dynamics (no favorite-longshot bias modeling).
- Inversion count weights all rank errors equally; GSE cares more about top ranks (winner, qualification cutoffs).

## GSE overlap

None in the tracked corpus. The map's tournament coverage is limited to market/futures mentions; **no existing research compares format efficacy by simulation**. The gap list's contest-theory item (DFS ownership equilibrium) is adjacent but different. Novel methodology for the corpus.

## Reproducible test

- Reimplement the five-round Swiss vs knockout comparison under the skill=5 model; verify P(Swiss fewer inversions) ≈ 0.9044.
- Verify the seeding result: seeded vs unseeded designs differ by ≤ ~3% on the efficacy metric across models.

## Numeric gate

**ADAPT iff format-faithful simulation moves GSE's own futures prices: reprice a recent tournament outright market (e.g., a World Cup or UCL field) with format-faithful vs naive simulation; the format-faithful version must differ materially on at least one team's price and backtest better against the realized outcome distribution;** if format detail doesn't move prices, keep the naive simulator.

## Improvement experiment

(1) Weight the efficacy metric toward top-k ranks (winner, semifinalists, qualification line) instead of full inversion count; (2) add favorite-longshot upset dynamics to the probability models; (3) apply the harness to NFL playoffs vs a hypothetical Swiss alternative as a content/research piece. Success criterion: top-k-weighted efficacy reverses or sharpens at least one format ranking vs the paper's full-ranking metric, giving GSE a differentiated futures edge.

## Verdict

**ADAPT** — The definitive simulation comparison of tournament formats: Swiss beats knockout for ranking recovery (0.9044 at skill=5), seeding is worth ≤3%. GSE ports the format-faithful simulation harness into futures/qualification pricing and uses the seeding result as a regularization prior.
