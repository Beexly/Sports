# 1060 — Entropy-Based Strategies for Multi-Bracket Pools

## Citation / full-text source

- arXiv:2308.14339v3 — full text: https://arxiv.org/pdf/2308.14339
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2308.14339v3
- **Full-text URL**: https://arxiv.org/pdf/2308.14339v3
- **Authors**: Ryan S. Brill, Abraham J. Wyner, Ian J. Barnett
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1406.4643v4 ("Vector Quantile Regression: An Optimal Transport Approach") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion. From the deduped candidate pool, 2308.14339v3 was selected because (a) it is the most rigorous treatment of multi-entry portfolio optimization in the candidate set, (b) it gives an actionable entropy rule with March Madness experiments, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2308.14339` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v3 PDF text via pdftotext: 40 pages — abstract, multi-bracket optimization formalism (expected maximum score, win probability, expected profit), entropy-controlled low-dimensional strategy families for bitstrings/Pick Six/March Madness, the portfolio-entropy rule, 2021 FiveThirtyEight Elo-implied probability experiments with double Monte Carlo (B1=250, B2=100), all appendices with proofs and equations, and full references. Code: https://github.com/snoopryan123/entropy_ncaa
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

When you can submit multiple entries to a bracket pool or DFS contest, how should the portfolio be constructed — is N copies of the best single entry optimal, and how does optimal diversification scale with entry count and opponent sharpness?

## Summary

When you can submit multiple entries to a bracket pool (or multiple lineups to a DFS contest), submitting your N best single entries is wrong — you want a *portfolio* that trades off expected score against coverage of the outcome space. The paper formalizes multi-entry optimization for three objectives (expected maximum score, win probability, expected profit) and shows that low-dimensional **entropy-controlled strategy families** capture the tradeoff: the central rule is to **increase portfolio entropy as your entry count and opponent entropy increase**.

Experiments on March Madness use 2021 FiveThirtyEight Elo-implied probabilities with double Monte Carlo (B1=250 outer, B2=100 inner replications). The key caveat: the paper **assumes true outcome probabilities and opponent strategy are known** — GSE must replace both with estimates. Core GSE lesson: **GSE's DFS lineup generation should optimize the portfolio, not the lineup** — entropy-targeted diversification across N lineups beats N copies of the top-EV lineup, with the entropy target rising in field size and opponent sharpness.

## Method

- March Madness instantiation: bitstring and full-bracket strategy families; 2021 538 Elo-implied \(p\); double Monte Carlo B1=250, B2=100.

## Equations / assumptions

- Objectives over a portfolio of K entries: \(E[\max_k \text{score}_k]\), \(P(\text{win})\), \(E[\text{profit}]\).

- Entropy-controlled strategy families: parametrized distributions over brackets with tunable entropy H; low-dimensional search over the entropy parameter rather than the full portfolio space.

- Rule: optimal portfolio entropy increases in (number of entries K, opponent-field entropy).

## Features / target

Inputs: number of entries K; outcome probabilities (2021 FiveThirtyEight Elo-implied p in the experiments); opponent-field entropy estimate; payout structure.

Target: the portfolio of K entries maximizing the chosen objective (expected maximum score, win probability, or expected profit) at entropy target H*.

## Validation

Synthetic bitstring and Pick Six environments for theory validation.

March Madness experiments with double Monte Carlo (B1=250 outer, B2=100 inner replications) on 2021 538 Elo-implied probabilities.

Caveat: the paper assumes true outcome probabilities and opponent strategy are known — GSE must replace both with estimates (calibrated GSE probabilities; opponent entropy from historical ownership).

## Exact results / baselines

Central rule: increase portfolio entropy as entry count and opponent entropy increase.

N best single entries is suboptimal; entropy-controlled low-dimensional strategy families capture the expected-score/coverage tradeoff.

Experimental setup: double Monte Carlo B1=250, B2=100 on 2021 538 Elo-implied probabilities.

Baselines: top-N single entries by EV (the naive strategy the portfolio approach beats).

## Code / data

The ledger records the authors' implementation as public: https://github.com/snoopryan123/entropy_ncaa (stated in the read-depth record).

## Dataset / schema

- March Madness experiments: 2021 FiveThirtyEight Elo-implied win probabilities.
- Synthetic bitstring and Pick Six environments for theory validation.

## Implementation (GSE adaptation)

1. **Portfolio-entropy DFS optimizer**: **Implementation**: (a) replace "generate top-N lineups by EV" with "generate the max-expected-maximum portfolio at entropy target H*"; (b) set H* from contest parameters (field size, payout structure, estimated opponent entropy); (c) implement the paper's low-dimensional entropy-family search over GSE's existing lineup generator — the generator proposes lineups, the portfolio layer selects the entropy-constrained subset.
2. **Calibrated inputs required**: the paper assumes known true probabilities — GSE plugs in its calibrated win/placement probabilities (with the calibration stack from the map: CQR, temperature scaling) and models opponent entropy from historical ownership data.
3. **Bracket-pool product**: the March Madness machinery ports directly to any GSE bracket-pool offering.

**Implementation difficulty** (folded in from the original standalone section):

Medium–High. The portfolio-selection layer is new optimization code on top of the existing lineup generator; opponent-entropy estimation needs historical ownership data.

## Leakage

- None in the formalism; the experiments use pre-tournament 538 probabilities — clean.
- The known-probabilities assumption is the adaptation's main estimation task, not leakage.

## Limitations

- Assumes true probabilities and opponent strategy known — both must be estimated in practice.
- March Madness-specific strategy families; DFS lineup constraints (salary cap, positions) need re-derivation.
- Double Monte Carlo is expensive; needs variance reduction for production.

## GSE overlap

None in the tracked corpus. The map's gap list explicitly flags **DFS-specific optimization literature as absent** (item 10) — this paper fills exactly that gap. The repo has deep DFS practice work (2026-09-13-dfs, Week 2 DK packet) but no academic contest-theory foundation. The entropy rule is novel for the corpus.

## Reproducible test

- Reimplement the bitstring environment and the entropy-family search; verify the optimal-entropy-increases-in-K-and-opponent-entropy rule reproduces.
- Rerun the March Madness experiment with the authors' code (https://github.com/snoopryan123/entropy_ncaa) and 2021 538 probabilities; verify double-Monte-Carlo (B1=250, B2=100) results directionally.

## Numeric gate

**ADAPT iff portfolio optimization beats top-N selection on GSE's DFS backtest: over a season of DK/NFL DFS slates, entropy-targeted portfolios must show higher realized maximum score (or simulated win rate vs historical fields) than the top-N-by-EV baseline at equal entry counts;** if diversification doesn't beat concentration, keep the current generator.

## Improvement experiment

(1) Estimate opponent entropy from real historical ownership (replacing the known-opponent assumption); (2) derive salary-cap-constrained entropy families for NFL DFS rather than importing bracket families; (3) extend the objective to expected profit with real payout structures (top-heavy vs flat). Success criterion: the full pipeline — calibrated GSE probabilities + estimated opponent entropy + entropy-targeted selection — beats both the top-N baseline and a naive diversification baseline on ROI.

## Verdict

**ADAPT** — The paper GSE's DFS lane was missing: multi-entry portfolio theory with an actionable rule (raise portfolio entropy with entry count and opponent entropy), validated on March Madness with double Monte Carlo. Adapt the entropy-targeted portfolio layer onto GSE's lineup generator, estimate the two unknowns (true probs, opponent entropy), and backtest against top-N selection. Fills the map's explicit DFS-theory gap.
