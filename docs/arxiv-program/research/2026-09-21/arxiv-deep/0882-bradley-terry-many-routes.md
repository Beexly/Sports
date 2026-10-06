# [0882] The many routes to the ubiquitous Bradley–Terry model (arXiv:2312.13619v2)

**Citation:** Ian Hamilton, Nicholas Tawn, David Firth (2025). *The many routes to the ubiquitous Bradley–Terry model*. arXiv:2312.13619v2 [math.ST]. URL: https://arxiv.org/abs/2312.13619v2 — accepted for publication in *Statistical Science*.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-2312.13619v2.pdf, read through the final references.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the paper's derivation menu (odds transitivity, Luce choice, MaxEnt, Rasch, Mallows, hazards, Poisson scoring, network/spectral forms) plus its assumption-failure diagnostics is the principled foundation for GSE's ratings architecture; the when-BT-fails tests (ties, multi-competitor, intransitivity diagnostics) directly feed model-selection criteria for NFL ratings. Conceptual only — no new predictive experiment.
**Replacement context:** Fresh-search replacement (query: `Bradley-Terry model sports ranking arXiv 2025`) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). First verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Accepted in *Statistical Science*. Authors: Ian Hamilton, Nicholas Tawn, David Firth (U. Warwick). Version v2 dated 2025-08-07. Survey/synthesis paper assembling the many independent mathematical motivations for the Bradley–Terry model rather than proposing one new method.

## Research question
Why is the Bradley–Terry model ubiquitous? The paper assembles and explains the many independent theoretical routes that all lead to the same model — odds transitivity, Luce's choice axiom, reciprocity/sufficient-statistics arguments, maximum entropy, geometric minimization, discriminal processes (Gumbel/Weibull/Fréchet), Rasch and Mallows connections, hazard models, Poisson scoring, sudden-death processes, quasi-symmetry links (PageRank, fair bets, Wei–Kendall, RPI, Barker's algorithm), and extensions to ties and multi-competitor settings. The research question is foundational: which assumptions license the BT model, and which observable diagnostics tell you the license has expired?

## Dataset / schema
No new datasets analyzed; this is a synthesis paper. It references standard paired-comparison applications (chess, sports) illustratively. Dataset section per paper: "No equations stated" analog — no empirical dataset.

## Method
Derivation-menu methodology:
1. **Odds transitivity**: from π_i/π_j × π_j/π_k = π_i/π_k consistency conditions, derive the logistic pairwise form.
2. **Luce choice axiom**: pairwise choice probabilities consistent with a global "worth" scale imply BT.
3. **MaxEnt/ML under retrodictive criterion**: BT as the maximum-entropy distribution constrained by sufficient statistics (wins per item).
4. **Discriminal processes**: Thurstonian Gumbel errors → logistic BT; Weibull/Fréchet variants → generalized forms.
5. **Hazard/Poisson scoring**: continuous-time race models (Plackett 1975 heritage) yielding BT as the first-arrival special case.
6. **Network/spectral**: Rank Centrality-style spectral estimators and quasi-symmetry connections (PageRank, fair-bets, Wei–Kendall, RPI).
7. **Extensions**: Rao–Kupper and Davidson tie models; multi-competitor (Plackett–Luce) forms.

## Equations / math / assumptions
- BT pairwise probability: P(i beats j) = π_i / (π_i + π_j), π_i > 0 (the "worth" parameters).
- Luce choice: P(i chosen from S) = π_i / Σ_{j∈S} π_j.
- Gumbel discriminal process: Y_i = log π_i + ε_i, ε_i iid Gumbel → P(Y_i > Y_j) = π_i/(π_i+π_j).
- MaxEnt: the BT likelihood is the entropy-maximizing distribution under mean-win constraints (retrodictive criterion).
- Quasi-symmetry: win matrix W with w_ij/w_ji structure yielding BT-type stationary distributions (fair-bets/PageRank connection).
- Assumptions made explicit by the paper: pairwise outcomes independent conditional on worths; worth scale is one-dimensional and static; no order-of-comparison effects; ties excluded unless a tie model is adopted.

## Features / target
Not applicable (synthesis paper; no features or target defined).

## Validation
No empirical validation performed; the "validation" is logical — each derivation is shown to terminate at the BT model under stated conditions. The paper's diagnostic contribution: explicit assumption-failure tests (when independence, transitivity, or one-dimensionality fail in real data).

## Exact results with baselines
No numeric results or baselines; the results are the derivations themselves. The paper does state the unifying claim exactly: multiple historically independent routes (Thurstone–Mosteller, Bradley–Terry 1952, Zermelo 1929, Luce 1959, Plackett 1975) converge on the same functional form, which explains the model's robustness across domains.

## Code / data availability
None stated.

## Leakage
Not applicable (no empirical exercise). Conceptual risk: treating the BT form as "true" rather than "the MaxEnt choice under its assumptions" — the paper itself warns against this.

## Limitations
- Survey/synthesis: no new predictive experiment, no sports dataset analyzed, no odds-market test.
- Several derivations (hazards, discriminal processes) require distributional assumptions that are untestable from win/loss data alone.
- The failure diagnostics are discussed in principle but not demonstrated on a real sports dataset with a worked remediation.
- Heavy mathematical density; the practitioner translation (what to change when a diagnostic fails) is left to the reader.

## GSE overlap vs existing-research-map
Existing-research-map.md mentions Bradley–Terry only in the inventoried metric catalog ("Bradley-Terry, Plackett-Luce … mentioned, not deeply researched") — BT is listed alongside Elo/Glicko/TrueSkill as catalog entries, not as deeply researched papers. No BT-foundations paper exists in the corpus (the map's 64-ID dedup set contains no BT derivation paper). This ledger fills that gap: it is the corpus's first principled BT reference. Complements (does not duplicate) the applied BT papers elsewhere in this wave (0889 PlackettLuce package, 0890 MaxEnt multi-outcome BT, 0891 luck+depth BT, 0892 dynamic BTL).

## Implementation spec (GSE adaptation)
- **What to build:** a "ratings license checklist" inside GSE's ratings pipeline: before promoting any pairwise rating model to production, run the paper's assumption diagnostics — (a) transitivity/intransitivity test on the win matrix; (b) quasi-symmetry residual check (PageRank/fair-bets comparison); (c) tie-model comparison (Davidson vs Rao–Kupper vs ignore); (d) MaxEnt-vs-MLE comparison of the fitted worths. Encode each as a gate in the ratings build.
- **Model selection:** use the derivation menu to choose the right BT variant per market: Gumbel-discriminal BT for moneyline win probabilities; Poisson-scoring formulation for totals/margins; Davidson-tie BT for markets with meaningful draw probability (soccer, some props); multi-competitor PL for tournament/field markets.
- **Effort:** 2–3 days to implement the four diagnostics as scheduled checks against GSE's existing NFL ratings data.

## Reproducible test
- On GSE's 2024–2025 NFL game results: fit standard BT (MLE) and Davidson-tie BT; compute the quasi-symmetry residuals and intransitivity index; test whether the Davidson variant's held-out log-likelihood beats plain BT on the 2025 season.

## Numeric gate
- ADAPT confirmed if, on the 2025 NFL season held-out set, the tie-aware or multi-outcome BT variant selected by the diagnostics beats the plain-BT baseline log-likelihood by ≥0.005 per game with a McNemar-style paired test p<0.05. If no variant beats plain BT, the diagnostics still stand as guardrails (gate passes on diagnostic implementation, not on finding a violation).

## Improvement experiment
- **Failure-diagnostic dashboard:** track the intransitivity index and quasi-symmetry residuals weekly across the season; when the index crosses a threshold, trigger automatic re-selection among BT variants (plain / Davidson / Poisson-scoring) — a regime-aware rating model. Success: the regime-aware model beats static BT on rolling 4-week log-likelihood over a full season.

## Verdict
**ADAPT** — Conceptual rather than empirical, but it is the only BT-foundations paper in the corpus and its derivation menu + assumption diagnostics give GSE a principled way to choose among the many BT variants (ties, multi-competitor, Poisson-scoring) instead of guessing. The value is architectural: it tells you which BT to use when, and how to know when BT itself is the wrong tool.
