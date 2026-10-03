# [1102] A Bayesian framework for analyzing alleged cheating in sports through hidden codes (arXiv:2409.08172v4)

**Citation:** Aafko Boonstra and Ronald Meester (2024). *A Bayesian framework for analyzing alleged cheating in sports through hidden codes, with a...*. arXiv:2409.08172v4. URL: https://arxiv.org/abs/2409.08172v4
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a competing-hypotheses likelihood-ratio machine for testing anomaly/cheating claims in sports, directly reusable as GSE's integrity/anomaly-monitoring detector.

## 1. Research question
Can allegations that athletes or teams cheated via a hidden signaling code (a bridge bidding-code system; the Houston Astros' trash-can banging) be tested quantitatively, weighing the "they cheated" hypothesis against the "nothing unusual happened" hypothesis in a Bayesian framework?

## 2. Dataset / schema
Two case studies as read. Bridge case: n=85, m=83, h=45, p=0.9 (deals/hands under scrutiny, coded signals, matches, signal success probability). Astros case: n=267, m=201, b=85, p=0.8 (at-bats/pitches examined, bang-signal counts, base-rate). Additional Astros series analyzed: vs Minnesota (order 10^9), vs Toronto (order 10^23), vs White Sox (order 10^12). Source data: publicly reported play records; exact URLs not recorded in this read — "Not stated in paper" for schema detail beyond the case-study parameters.

## 3. Method / model
Models each alleged cheating episode as a sequence of Bernoulli-like trials. Under the honest hypothesis (H0), events follow base-rate chance; under the cheating hypothesis (H1), the team acts on a hidden code with known/estimated success probability p per trial. Computes the Bayes factor / likelihood ratio P(data | H1) / P(data | H0) and updates prior odds to posterior odds.

## 4. Equations & assumptions
Likelihood ratio LR = P(observed signal sequence | cheating model with signal probability p) / P(same sequence | honest base-rate model). Reported values: bridge LR ≈ 4 × 10^19; Astros LR ≈ 3.4 × 10^30; Minnesota ~10^9; Toronto ~10^23; White Sox ~10^12 (orders of magnitude as read; sign conventions and exact conditioning set were recorded in the full text and are summarized here rather than re-derived — re-derive from PDF before implementation). Assumptions as stated: trials are conditionally independent given the hypothesis; the signaling probability p (0.9 bridge, 0.8 Astros) is known or estimable; the hidden code's usage is per-episode binary (cheated this episode or not).

## 5. Features / target
Inputs: per-episode counts (n total episodes, m signal-eligible trials, h/b observed signal matches). Target: posterior odds of cheating vs no-cheating for the episode under scrutiny.

## 6. Validation design
Case-study validation, not a train/test protocol: two independent real scandals plus three additional series. No held-out design — "Not stated in paper" for cross-validation; the strength of evidence comes from LR magnitudes, not a benchmark suite.

## 7. Numerical results / baselines
Bridge: n=85, m=83, h=45, p=0.9 → LR ≈ 4 × 10^19. Astros: n=267, m=201, b=85, p=0.8 → LR ≈ 3.4 × 10^30. Astros vs Minnesota: order 10^9; vs Toronto: order 10^23; vs White Sox: order 10^12. No baseline model comparison reported.

## 8. Code / data availability
None stated in paper (no code/data links recorded in this read).

## 9. Leakage & limitations
Retrospective selection: both scandals were selected *because* suspicion already existed — the LR answers "how strongly does this data favor cheating" but not "what fraction of unscandalized teams would look similar" (multiple-comparisons / lookahead selection bias). p values (0.9/0.8) are assumed or estimated with unstated uncertainty; results are extremely sensitive to them. Trials treated as independent; real game contexts have dependence (score, situation). External validity to NFL requires re-derivation for football data-generating processes.

## 10. GSE overlap
New capability for GSE: GSE's corpus covers prediction, calibration, and benchmark work, but nothing on integrity/anomaly detection of officials, line movement, or event-timing anomalies. Not duplicative of any repo lane per the existing-research map — cite `~/workspace/arxiv-sweep/existing-research-map.md` gap area around market integrity / anomalies (thin).

## 11. GSE implementation spec
Build an anomaly monitor: (a) define honest H0 baselines per monitored stream (referee penalty flags per game vs crew-season rate; odds movement vs closing-line consensus; whistle-to-whistle timing); (b) define H1 as a hidden-code/alternative-DGP model with per-trial signal probability estimated from labeled integrity cases; (c) compute rolling LRs and posterior odds per game/week; (d) alerting threshold calibrated on historical clean seasons. Effort: ~2-3 engineer-days for a first sports-book line-move monitor using The Odds API history.

## 12. Reproducible test
Dataset: 2024 NFL season, every game, opening-to-closing spread movement from GSE's odds data. H0: line moves symmetric random walk with estimated variance; H1: informed-money directional drift with signal probability p=0.65. Metric: log-LR per game; test on 2025 weeks 1–3. Baseline to beat: naive flag rate of a z-score>3 detector (compare false-positive rate at equal detection rate).

## 13. Acceptance / rejection gate
ADOPT the monitor if the LR detector catches at least as many labeled anomalous games as the z-score baseline with no more than 1/2 the false-positive rate on the 2025 weeks 1–3 window; REJECT otherwise.

## 14. Improvement experiment
Extend to a *hierarchical* model over referees/crews with partial pooling, so the signal probability p and honest baseline are learned jointly across crews rather than fixed — addresses the paper's fixed-p sensitivity and handles crews with little history, which the paper's per-case analysis cannot do.
