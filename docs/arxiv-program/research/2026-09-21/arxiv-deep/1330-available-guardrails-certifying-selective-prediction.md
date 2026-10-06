# [1330] Available Guardrails: Certifying Selective Prediction across ML Systems (arXiv:2609.22048)

**Citation:** Parivesh Priye, Yufeng Wang, Haibin Ling, Michael Chaykowsky (2026). *Available Guardrails: Certifying Selective Prediction across ML Systems*. arXiv:2609.22048v1 [cs.LG], Rivian/VW Group Technologies, Stony Brook, Westlake Univ. URL: https://arxiv.org/abs/2609.22048
**Ledger completed:** 2026-09-21. **Read:** full main text (11 pages); appendices skimmed (proof of Prop. 1 read in full).
**Replaces:** 1155 (rejected — online/adversarial theory with no GSE-applicable mechanism). Same lane: selective prediction / abstention.
**Verdict:** ADAPT
The certificate-*availability* identity is a plannable tool GSE lacks: it computes exactly how many graded picks per market are needed before GSE can *certify* a posted-pick precision claim, and the groupwise certification contract (per-market gates at familywise δ) is the missing rigor behind any public "our picks hit X%" statement.

## 1. Research question
Selective predictors (abstain unless trustworthy) are increasingly required to have their precision *certified* per reporting unit (tool, policy label, subgroup). Prior work asks whether a granted certificate is valid; this paper asks one step earlier: **can finite calibration data produce a certificate at all** at the requested granularity? It makes "certificate availability" exactly computable and turns reporting-partition selection into an optimization problem over the safety–granularity–traffic frontier.

## 2. Dataset / schema
- Synthetic generators (frozen preregistered designs; 1,845 cell-by-J configurations for the population study).
- Intent routing: CLINC, BANKING, HWU datasets; DeBERTa and DistilRoBERTa architectures; 30 trained models, 2 granularities each, 30 resplits × 5 models per point.
- Four gating domains: LLM tool-calling (Qwen2.5-14B on BFCL), content moderation (Civil Comments), lesion classification (fine-tuned ResNet-18 on DermaMNIST), recommendation (matrix factorization on MovieLens, genre = reporting group).
- Controlled distribution-shift study (CLINC label-prior shift; conditional-outcome shift).

## 3. Method / model
**Availability identity (Prop. 1):** for a frozen candidate (unit + threshold) serving n certification examples with E errors, the one-sided Clopper–Pearson bound certifies (UCP(E,n;γ) ≤ α) iff FBin(E;n,α) ≤ γ. With true selective error r, certificate availability π(n,r;α,γ) = FBin(e*;n,r) — the probability the certificate *can be granted at all*, computable before calibration.

**Population partition planner:** fix reliability order over K groups (by planning error, then mean score); restrict to contiguous cuts; score a segment S at threshold t by v(S,t;J) = traffic × availability (eq. 6); exact DP D(j,b) = max_a {D(j−1,a)+w_{a,b−1}} in O(K²|T|)+O(JK²) (eq. 8); sweep J for the frontier.

**Held-out selection:** construct 8 candidate partitions on one planning split (plug-in, support-balanced, equal-count, 5 random-order), select the best-scoring on a *disjoint* split, refit score/thresholds on all planning labels, then certify on fresh data with fixed-sequence downward threshold walk + Bonferroni δ/J (Learn-Then-Test style) — preserves the validity contract.

**Familywise-budget reallocation:** replace δ/J with frozen γ_1..γ_J, Σγ_j ≤ δ, giving more budget to near-certifiable units; validity preserved by union bound.

## 4. Equations & assumptions
- Selective error (eq. 1): R(t) = P(C=0 | A_t=1), R(t) ≤ α = 1−τ.
- Groupwise contract (eq. 2): P_Dcal(∀j certified: R_j(t_j) ≤ α) ≥ 1−δ, over a fresh IID certification sample.
- Binomial tail (eq. 3): FBin(k;n,p) = Σ_{i=0}^k C(n,i)p^i(1−p)^{n−i}.
- **Inversion identity (eq. 4):** UCP(E,n;γ) ≤ α ⟺ FBin(E;n,α) ≤ γ.
- **Availability (eq. 5):** π(n,r;α,γ) = FBin(e*;n,r); e* = max{k: FBin(k;n,α) ≤ γ}; π=0 if no k certifies.
- Segment score (eq. 6): v(S,t;J) = q_S(t)·π(⌊Nq_S(t)⌋, r_S(t); 1−τ, δ/J).
- Planning objective (eq. 7): U_J(P_J) = Σ_{S∈P_J} max_{t∈T} v(S,t;J).
- DP recurrence (eq. 8): D(j,b) = max_{a} {D(j−1,a) + w_{a,b−1}}, D(0,0)=0.
- **Assumptions:** certification sample is fresh IID from the deployment distribution; candidates/scores/thresholds frozen before certification; fixed reliability order; contiguous partitions.

## 5. Features / target
Features: frozen score s(X) (model confidence), reporting map G(X). Target: correctness indicator C = 1{Ŷ=Y}; per-unit selective error R_j(t_j).

## 6. Validation design
Defaults: precision target τ=0.90, familywise δ=0.10. Synthetic studies frozen/preregistered; intent-routing and domain studies exploratory (reuse existing traces). Comparators: support-balanced, equal-count, random-order support-balanced partitions; direct plug-in planner; population oracle (nondeployable). Metrics: certified coverage (traffic-weighted), availability, direction replication across model effects.

## 7. Numerical results / baselines
- **Identity verified:** predicted vs simulated certification frequency across 432 untouched binomial cells: MAE **0.00067**.
- **Sample-size arithmetic (the planning numbers):** τ=0.90, δ familywise 0.05, true error 0.05, 80% availability → **179** served calibration examples for 1 group; **450 each** for 50 groups; raising true error 0.05→0.09 → **13,407** per group. Multiplicity costs ~log J; the *error margin* dominates.
- **Population opportunity:** oracle planner +**0.1568** mean coverage over support balancing (wins 1,366 / ties 446 / losses 33 of 1,845). Naive plug-in recovers only +**0.0050** (median 0, 5th pct −0.3263; −0.0659 at K=500).
- **Held-out selection:** +**0.0601** mean coverage over support balancing across 1,340 configurations; direction reproduced in **59/60** model effects (3 datasets × 2 architectures); gains 0.0045 (DistilRoBERTa BANKING) to 0.2128 (DeBERTa CLINC). Mechanism study: held-out vs construction-data selection contributes +0.0480; structured candidates over random groupings only +0.0027 — the gain is from *independent selection*, not structured search.
- **Budget reallocation:** +0.038 mean coverage at population level (up to 0.115 in hardest regimes); deployable allocator +0.011, positive in 68%, never exceeds nominal familywise level.
- **Score quality gates everything:** oracle score +0.1217, strong learned +0.1144, weak +0.0072, uninformative +0.0004.
- **Shift:** 30% label-prior shift — stale precision 0.753 → 0.935 with exact reweighting (coverage to 0.455); conditional-outcome shift at 10% → recalibration abstains entirely; monitoring detects only 11.3% of a 2.5% conditional shift within 2,000 probes.
- **Four domains:** held-out planner +0.176 (moderation), +0.051 (tool-calling) vs support balancing at chosen operating points; trails random-only on shared pools — no planner dominates everywhere.
- **Semantic constraints cost:** HWU hierarchy restriction −0.246/−0.167 (DeBERTa), −0.229/−0.225 (DistilRoBERTa); 6 of 18 scenarios uncertifiable on average.

## 8. Code / data availability
Paper states code + aggregate/seed-level results + an automated number-recomputing check are in the supplementary material (Appendix L). I did not extract a URL.

## 9. Leakage & limitations
- **All guarantees are for the certification distribution only.** Under deployment shift the certificate can look valid while being wrong — the shift study (§4.5) is a warning, not a fix. GSE's regime (new season, roster churn) is exactly the drift case.
- The mean-support approximation in the planning objective is optimistic (0.500 projected → 0.2761 exact in one small example); the DP is exact only over an *approximate* objective on contiguous cuts of a fixed order.
- Magnitude varies by orders of magnitude across architectures/datasets; direction replicates, size doesn't.
- Merging groups by reliability can fuse categories a deployment must keep distinct (their ethics section; §4.4) — GSE must not merge e.g. "NFL spread" with "NCAAF spread" purely on statistics if the products are sold separately.
- No comparison against conformal risk control / Learn-Then-Test on a shared leaderboard (authors explicitly decline; different contracts).

## 10. GSE overlap
New capability — nothing in the existing corpus or in ledgers 1150–1154, 1156–1158 computes *whether a selective-prediction claim is certifiable* from finite data. Those ledgers decide *when to abstain*; this paper decides *when you're allowed to claim the abstention policy works*, per reporting unit, with a sample-size formula. It is the missing certification layer above GSE's pick-selection work and directly serves the "most calibrated prediction company" goal: a public hit-rate claim should be a certificate, not a point estimate.

## 11. GSE implementation spec
1. **Per-market certification contract:** define reporting units = (sport × market) pairs GSE posts (e.g., NFL-spread, NFL-total, NCAAF-moneyline). Fix τ (e.g., 0.55 hit rate for −110 picks → but use the paper's error framing: α = 1−τ on *posted* picks) and familywise δ = 0.10 across units. Use the availability identity (eq. 5) to compute, per unit, the graded-pick count needed for 80% availability — this becomes the **"certified" badge rule**: a market is only advertised with a track record once its availability crosses the bar (the 179/450/13,407 arithmetic, recomputed with GSE's true per-market error).
2. **Posting-gate DP:** order markets by historical posted-pick error; run the contiguous-partition DP (eq. 8) over candidate market groupings to maximize certified traffic at fixed granularity J — e.g., decide whether "NFL totals" and "NCAAF totals" should be reported as one unit or two.
3. **Held-out policy selection protocol:** split graded history into plan-A (construct candidate posting policies) / plan-B (select among them) / certification (freshest weeks, fixed-sequence threshold walk, Bonferroni δ/J). This replaces "pick the backtest winner" with a validity-preserving selection — directly addresses the selection-bias problem in GSE's engine iteration.
4. **Budget reallocation:** give more familywise budget to near-certifiable markets (γ_j ∝ closeness to certification) instead of flat δ/J; the paper's +0.038 population / +0.011 deployable gains suggest free certified-traffic.
5. **Effort:** ~3 days (availability calculator + per-market certification dashboard); +2 days for the DP grouping; +2 days for the held-out protocol.

## 12. Reproducible test
Dataset: GSE `picks` table, graded, by (sport × market). For each unit: compute e*(n,α,γ) and π(n,r;α,γ) from historical posted-pick hit rates; check which markets clear 80% availability at τ = posted-pick target. Baseline: current practice (advertise all markets equally). Success = the availability ranking correctly predicts which markets' forward hit rates stay within the certified bound on the next 4 weeks (certificate holds), and at least one currently-advertised market is flagged as uncertifiable (the method has teeth).

## 13. Acceptance / rejection gate
ADAPT the availability calculator iff ≥80% of per-market certificates granted on historical data hold on the forward 4-week window (validity), and the method flags ≥1 market as uncertifiable that indeed underperforms (it must bite, not rubber-stamp). ADAPT the held-out selection protocol iff it selects a different posting policy than naive backtest-winner in ≥1 engine iteration with equal-or-better forward performance. REJECT the contiguous-partition DP if GSE's market taxonomy is fixed by product requirements (semantic constraints, §4.4 analogue) — don't merge what the brand sells separately.

## 14. Improvement experiment
Replace the paper's fixed reliability order with a **shrinkage-ordered** partition search: order markets by empirical-Bayes-shrunk error estimates instead of raw planning errors, which should recover part of the oracle gap the paper loses to ordering noise (their §4.2 attributes part of the gap to order error). Test: shrunk-order DP vs raw-order DP on certified forward coverage. Second: make τ **market-adaptive** (tighter τ for high-volume markets where availability is cheap, looser for thin markets) and trace the resulting safety–granularity–traffic frontier for GSE's actual slate mix.
