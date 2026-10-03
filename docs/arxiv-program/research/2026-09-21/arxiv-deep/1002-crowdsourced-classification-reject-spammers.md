# [1002] Optimal Crowdsourced Classification with a Reject Option in the Presence of Spammers (arXiv:1710.09901)

## Citation / full-text source

- arXiv:1710.09901 — full text: https://arxiv.org/pdf/1710.09901
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Qunwei Li, Pramod K. Varshney (2017). *Optimal Crowdsourced Classification with a Reject Option in the Presence of Spammers*. arXiv:1710.09901v1. URL: https://arxiv.org/abs/1710.09901
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/1710.09901.txt` (arXiv PDF conversion; formulas legible, figures referenced as Fig. 1 / Fig. 2 without rendered images — curves described in text).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — spammer-robust reliability-weighted voting is a portable weighting rule for GSE's pick ensembles: downweight members that "always answer" (never abstain), upweight abstaining reliable members.

## 1. Research question
How should a crowdsourcing task manager aggregate binary microtask answers into an M-ary classification when (a) workers may SKIP (reject option, answer λ) when unsure, and (b) an unknown number of spammers (M of W workers) answer randomly just to collect payment — without knowing any individual worker's reliability in advance?

## 2. Dataset / schema
Pure simulation study — no real dataset. Parameters: W=50 workers, N=3 microtasks, G=3 gold-standard questions; skip probability p drawn from F_P = U(0,1) (so mean m=E[p]); correctness-given-definitive-answer ρ from F_ρ = U(x,1), 0≤x≤1, so crowd quality μ=E[ρ] ranges 0.5→1.0. Spammer mix in Fig. 1: 14 spammers in 50 workers (7 completing all microtasks with random guesses, 7 skipping everything). Fig. 2: varies total spammers with M_0=M_A and μ fixed at 0.75. All results are Monte Carlo; no sample-size statement beyond the parameter grid.

## 3. Method / model
Independent microtask design: N=⌈log₂M⌉ binary questions of equal difficulty; worker w's answers form an N-bit word a_w ∈ {0,1,λ}^N. Manager maximizes the crowd's expected weight contribution to the CORRECT class subject to expected total weight = K (Eq. 1). Key design choice: spammers split into two behaviors induced by a payment mechanism (Shah & Zhou "double or nothing"): M_A spammers complete ALL microtasks (random guesses), M_0 skip ALL. Optimal weights (Prop. 1, Cauchy–Schwarz equality):

W_w = [(W−M)·μⁿ + (M_A / (2^N (1−m)^N))·δ(n−N)]⁻¹,

where n = number of definitive answers worker w submitted, δ = Dirac delta. Workers submitting nothing get weight 0. The second term discounts exactly the "answered everything" cohort, which is where completing-spammers concentrate. Parameters μ, m estimated by training/majority-vote and skip-rate; M_A, M_0 jointly via MLE over counts (W_{N+G} = workers answering all N+G questions, W_0 = workers skipping all), with the binomial likelihood of Eq. (6). Prop. 2 gives a closed-form P(correct classification) as [1/2 + (1/2)Σ_S + (1/4)Σ_{S′}]^N over partition space ℚ (Eq. 7), where S/S′ are strict-tie regions of the weighted majority comparison.

## 4. Equations & assumptions
- Optimization: maximize E_C[𝕎] s.t. E_O[𝕎]=K (Eq. 1).
- Optimal weight: W_w = [(W−M)μⁿ + (M_A/(2^N(1−m)^N)) δ(n−N)]⁻¹ (Eq. 2 / Prop. 1).
- P(correct) = [1/2 + (1/2)Σ_S (W choose ℚ)(F(ℚ)−F′(ℚ)) + (1/4)Σ_{S′} (W choose ℚ)(F(ℚ)−F′(ℚ))]^N (Eq. 7), with F(ℚ), F′(ℚ) the probability masses of answer partitions under H_0/H_1.
- Assumptions: microtasks independent, equal difficulty; H_0/H_1 equiprobable per microtask; p_w,i, ρ_w,i are i.i.d. draws from population distributions F_P, F_ρ; spammers are exactly two types (complete-all vs skip-all); overall correct classification requires ALL N bits correct (multiplicative across bits).

## 5. Features / target
Features: per-worker answer vectors (N bits each in {0,1,λ}); summary stats n (definitive-answer count), W_{N+G}, W_0; gold-standard question responses. Target: correct M-ary class label, equivalently per-microtask binary hypothesis H_0/H_1.

## 6. Validation design
Simulation-only. Compared three rules: (i) proposed spammer-robust weights, (ii) honest-crowd optimal weights W_w=μ^(−n) (from [18]), (iii) simple majority voting without reject option. Curves: P(correct) vs crowd quality μ (Fig. 1, 14 spammers of 50), and vs number of spammers at fixed μ=0.75 (Fig. 2). No real-data validation, no train/test split (all parameters known-simulated, estimated via MLE on the same simulated crowd).

## 7. Numerical results / baselines
Exact numbers are chart-read, not tabulated: with 14/50 spammers (Fig. 1), the spammer-robust rule dominates the other two across μ∈(0.5,1); at μ=0.5 all three curves merge (random guessing — weights cannot help). In Fig. 2 (μ=0.75, M_0=M_A varying), spammer-robust is best; the honest-crowd rule beats majority vote at few spammers but degrades sharply as M_A grows (it upweights large-n workers, i.e., exactly the completing spammers). No numeric table, CIs, or p-values reported.

## 8. Code / data availability
None stated.

## 9. Leakage
N/A (simulation). External validity concerns: two-type spammer model is a strong behavioral assumption; equal-difficulty independent microtasks; equiprobable hypotheses (rare in sports where base rates are skewed); requires ALL bits correct — brittle for multi-class decisions; MLE of M_A/M_0 depends on gold questions that spammers can detect.

## Limitations
- Simulation-only; zero empirical data (no MTurk experiment), so the spammer behavior model is untested.
- Key results are curves without numeric tables — cannot quote exact P(correct) values.
- Equiprobable-H_0/H_1 and equal-difficulty assumptions break in sports contexts.
- The "must get all N bits right" success criterion overstates brittleness relative to direct M-ary prediction.
- No comparison to modern crowd-aggregation baselines (Dawid–Skene EM, GLAD) — only to majority vote and their own prior rule.

## 10. GSE overlap
Abstention lane: phase-1 already deep-read SelectiveNet (0692), controlled-abstention NNs (0694/0695), selective ensembles (0696), Deep Gamblers (0618), and combating label noise via abstention (0693) — all neural selective-classification. This paper is different: it is about AGGREGATING multiple voters with heterogeneous reliability + explicit spammer handling, not about a single model learning to abstain. The existing-research-map's ensemble lane (CEPT, averaging) has no reliability/spammer-aware vote weighting; no repo file implements worker-reliability weighted majority. Extends rather than duplicates.

## 11. GSE implementation spec
Adapt as the **ensemble vote-weighting rule for the GSE pick board**: treat each ensemble member (engine model, analyst signal, market-derived signal) as a "worker" producing pick/no-pick (definitive) or skip (abstain) per game. (1) Log per-member abstention rate m̂ and hit-rate-given-pick μ̂ over the 3,411-pick Neon DB history. (2) Flag "spammer-like" members: always-pick members with μ̂≈0.5 get the completing-spammer discount via the δ(n−N) term — implement as a multiplicative penalty on members whose abstention rate ≈ 0 and historical edge ≈ 0. (3) Aggregate board picks with weights W_w=[(W−M)μ̂ⁿ]⁻¹ analog (n = picks made this slate), renormalized. Effort: ~1 day, pure Python over existing picks DB; no new data needed.

## 12. Reproducible test
Dataset: GSE picks DB (3,411 SPREAD/MONEYLINE/TOTAL picks, v5.2.7 history). Build member-level (n, μ̂, m̂) stats through Week 3 2026; apply the adapted weights to Weeks 4–8 board aggregation; metric: hit rate and CLV on aggregated picks vs simple majority of member picks over the same window. Baseline to beat: existing board aggregation (majority/average). Test window fixed before running.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT the weighting into the board pipeline if the reliability-weighted aggregation beats the baseline by ≥2.0 percentage points of hit rate on the fixed Weeks 4–8 window (n≈400+ picks) with a one-sided binomial p<0.05; otherwise REJECT. The single decisive number: **hit-rate delta ≥ +2.0 pp vs baseline, p<0.05**.

## 14. Improvement experiment
Replace the two-type spammer assumption with a continuous "spamminess" posterior: fit a per-member Beta(μ) reliability + abstention-rate model hierarchically (partial pooling across members), and use the posterior mean of "P(member is noise)" as the discount — no gold questions needed, and it handles partial spammers (members that are only sometimes noise, e.g., a model that is sharp on totals but coin-flip on spreads). Test whether hierarchical shrinkage beats the paper's hard two-type MLE on the same Weeks 4–8 window.
