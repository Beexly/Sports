# [0023] Experimental Assortments for Choice Estimation and Nest Identification (arXiv:2602.16137v2)

**Citation:** Xintong Yu, Will Ma, Michael Zhao (2026). *Experimental Assortments for Choice Estimation and Nest Identification*. arXiv:2602.16137v2 (preliminary version appeared in EC 2026 proceedings). URL: https://arxiv.org/abs/2602.16137v2
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF; ar5iv HTML unavailable — fetch failed).
**Verdict:** ADAPT — the O(log n) combinatorial assortment design and boost-factor nest-identification machinery is the strongest "choice among contest types" methodology seen; adapt the pairwise-separation design to DFS lineup/contest selection and pick-em menu modeling.

## 1. Research question
How should one deliberately design a small number of product assortments (subsets of items offered) to collect data for estimating a choice model — and how can the unknown nest partition of a Nested Logit model (which items are close substitutes) be identified from that data instead of fixed ex ante? The paper answers both: a nonadaptive combinatorial design using only O(log n) distinct assortments, and a logical-deduction nest-identification algorithm that is information-theoretically optimal. Deployed live at Dream11 (Indian fantasy-sports platform) over 21 days / 70M users. (Paper: Abstract, §1.)

## 2. Dataset / schema
- **Synthetic benchmark:** 1,440 estimation instances replicating the Berbeglia et al. (2022) framework: n = 10 items, ranked-list ground truth (all estimated models misspecified), data sizes N ∈ {300, 750, 3000, 6000} (360 instances each). Well-specified settings: n = 16, 500 random Markov Chain / Exponomial / MNL ground truths, N ∈ {270, …, 9000}. Nest-ID synthetics: 500 random Nested Logit ground truths (n = 16), N ∈ {9,000, …, 450,000}.
- **SFWork dataset** (public; Koppelman & Bhat 2006): 6 commute-mode options, N = 5,000 observed choices, 12 distinct assortments — fixed (non-deliberate) design used as a real-data check.
- **Dream11 field deployment** (proprietary; management-gated): 72 contest types, 14 experimental assortments (binary encoding, ~half removed each), 70M users split 50/50 control/treatment, May 20 → June 10, 2025 (21 days). Contest features: Entry Fee, Prize Pool, # Contestants, # Winners; derived: Winner Ratio, Prize Ratio.
- Schema: (assortment, customer, chosen item) triples; assortments defined as subsets of [n]. No public row-level Dream11 data; synthetic code is "the code of Berbeglia et al. (2022)" (paper §5.1 — exact repo link not stated in the text read).

## 3. Method / model
**Experiment design (§3):** give each of n items a unique encoding in base b ≥ 2 with d = ⌈log_b n⌉ digits; for each position ℓ and digit value c, include assortment S_{ℓ,c} = {i : digit ℓ of i ≠ c} — i.e., 2d binary experiments of size ≈ n/2, plus the control assortment [n]. Guarantees: for every ordered pair (i,j) there exists an assortment containing i but not j. Numerical work uses a **balanced-exposure** variant (randomized encodings with each item in ~half the assortments).
**Nest identification (§4):** for each item i and assortment S, define boost factor BF(i,S) = P(i,S)/P(i,[n]) (sales vs. full-offer control). Under Nested Logit, items in the same nest see identical boost factors; a nest fully inside S sees BF = BF(0,S) (same as outside option); a nest split by S sees strictly larger, distinct multipliers. Algorithm 1 builds an n×n adjacency matrix with deductions (equal boost > outside-option boost → same nest; unequal → different nests; no-boost items separated from items outside S), then closes it with one-hop transitivity and missing-pair identification. Algorithm 2 handles the no-outside-option case via min-boost deductions. Finite-sample version replaces boost-factor equality tests with a pooled two-proportion z-statistic Z(i≻j,S) compared against ±√(3 log(2/δ)) thresholds.
**Estimation:** nested logit fit with data-driven nests (their Algorithm 3 variant + community detection to resolve inconsistencies, §6/E.1); parameters via Berbeglia et al. (2022) code.

## 4. Equations & assumptions
(PDF extraction mangled subscripts/superscripts; the structural forms below are my cleaned reconstruction — **flagged as uncertain, not exact quotes**.)
- Nested Logit decomposition: P(i,S) = P(n(i)|S) · P(i | n(i), S)  (eq. 1)
- Nest choice probability: P(n|S) = u_n·V_n(S) / (1 + Σ_{m∈N} u_m·V_m(S)), where V_n(S) = (Σ_{i∈n∩S} v_i^{1/γ_n})^{γ_n}·1(n∩S≠∅) is the nest preference weight (eq. 2; u_n = nest-level preference weight, γ_n ∈ [0,1] dissimilarity parameter, v_i item preference weights)
- Within-nest probability: P(i|n,S) = v_i^{1/γ_n} / Σ_{j∈n∩S} v_j^{1/γ_n} (eq. 3)
- Boost factor: BF(i,S) := P(i,S)/P(i,[n]) (Definition 3); key factorization BF(i,S) = Mult(n(i),S)·BF(0,S) with item-independent nest multiplier Mult(n,S); if n(i) ⊆ S then Mult = 1; else Mult > 1 (under γ_n < 1)
- Boost-factor comparisons recast as two-proportion tests: BF(i,S) ≥ BF(j,S) ⟺ q(i,j,S) ≥ q(i,j,[n]) (eq. 4), where q is the conditional choice probability of i given {i,j} chosen; pooled z-statistic Z(i≻j,S) in eq. (5)
- Soft RMSE: RMSE_soft(π,π̂) = sqrt( Σ_{S⊆[n]} Σ_{i∈S∪{0}} (π(i,S)−π̂(i,S))² / Σ_{S⊆[n]} (|S|+1) ) (eq. 7)
- **Assumptions:** (A1 Identifiability) γ_n = 1 iff |n| = 1 (singleton nests); (A4 General Position) boost multipliers of distinct non-contained nests never coincide; noiseless theory assumes exact market shares observed; outside option weight normalized to 1 and always available (relaxed in §4.4); finite-sample theorem needs P(i,[n]) ≥ ε for all items and separation |BF difference| ≥ Δ (condition numbers ε, Δ ∈ (0,1)).
- **Theorems:** Theorem 7 — Algorithm 1 exactly recovers the nest partition with O(log n) nonadaptive assortments; matching lower bound (App. A.2): Ω(log n) assortments necessary even adaptively. Theorem 8 (finite sample): with N ≥ (3/Δ²)·log(2/δ)-type sample condition (exact constants garbled — flagged uncertain), all boost comparisons correct with probability ≥ 1−δ. Theorem 10 — Algorithm 2 correct without outside option (except singleton/singleton pairs, which don't affect the choice function).

## 5. Features / target
- **Input features:** experimental assortment S ⊆ [n] offered to each customer; the "features" are set-membership indicators of the n items (deliberate, not observational covariates).
- **Target:** choice probability function π(i,S) for all items i and assortments S; secondary target: the nest partition N (discrete structure) of a Nested Logit ground truth.
- No temporal prediction horizon; cross-sectional choice estimation.

## 6. Validation design
- **Misspecified (§5.2):** 1,440 instances from Berbeglia et al. (2022) verbatim ground truths + their randomized-design numbers pulled verbatim from their paper; own random seeds for other designs. 5 estimation families (Exponomial, Latent-Class MNL, Markov Chain, MNL, Nested Logit w/ arbitrary 2-nest split) + 6th: Nested Logit with their nest-ID algorithm. Metric: RMSE_soft; reported with averages over 720 instances per data-size bucket.
- **Well-specified (§5.3):** fresh random ground truths; 95% confidence intervals on mean RMSE_soft (intervals separated); single design-run per instance, new instances preferred over re-runs.
- **Nest ID (§6):** 500 random Nested Logit ground truths × 5 data sizes; metrics RMSE_soft + Rand index vs. true partition; vs. Benson et al. (2016) pipeline; SFWork real-data check (train/test split, empirical test-set probabilities as pseudo-truth, 10,000 shuffled orders).
- **Dream11 (§7):** chronological (non-shuffled) train/test splits per day over 21 days; RMSE_soft normalized by the point-estimate baseline (absolute numbers masked); baselines: MNL, k-means-on-features Nested Logit (k=4), Markov Chain, empirical point estimate.
- Not time-ordered in synthetic settings (IID); the Dream11 split is chronological. Baselines: randomized assortments (same count, n/10, and N), leave-one-out, incremental, Benson et al. (2016) design+algorithm.

## 7. Numerical results / baselines
(Paper §1.3, §5–§7; quoted exactly as stated — absolute RMSE_soft magnitudes shown only in figures, not text:)
- Misspecified, 10 items: "our design consistently lowers RMSE_soft, with reductions up to **5.5%**, generally for smaller data sizes" (N ∈ {300,750}); at N ∈ {3000,6000} beaten by Berbeglia et al.'s original N/10-randomized design. "the design with N individual randomized assortments is generally best under misspecified choice models."
- Well-specified Markov Chain (n=16, 500 ground truths): "reducing the soft RMSE compared to 9 randomized assortments by **as much as 16.9%**, and even beating designs that can draw N/10 or N (i.e., individualized) randomized assortments. The 95% confidence intervals are also separated."
- Nest-ID pipelines vs. Benson et al. (2016): "our pipeline reduces RMSE_soft by **as much as 46%**, mainly because our assortments have size approximately n/2 and reveal richer substitution information than Benson et al. (2016)'s size-2 or size-3 assortments." When Benson's algorithm is paired with the authors' design, it performs comparably at small N (aggregation reduces variance) but worse at large N (aggregation bias).
- SFWork (n=6, N=5,000, 12 assortments): authors' nest-ID "comparable to that of Benson et al. (2016)"; Nested Logit "no better than the simpler model of MNL"; Markov Chain "much worse" — wait, correction: "All three of these models are much worse than Markov Chain at fitting the realworld data" — i.e., Markov Chain best on SFWork.
- Dream11 (72 contests, 70M users, May 20–Jun 10 2025): data-driven nests "achieves the lowest outofsample RMSE_soft during the first half of the horizon, before too much data is accumulated (in which case the point estimate is unbeatable)"; both Nested Logit variants "consistently outperform the simpler MNL model"; Markov Chain "performs nowhere near as well as in Figure 7; its performance tracks very closely the point estimate baseline." Identified nests were economically interpretable (e.g., contests with Winner Ratio 0.50 and Prize Ratio 0.83 grouped despite different entry fees; winner-take-all contests grouped).
- All numbers are paper claims; synthetic results reproducible in principle via Berbeglia et al. (2022) code; Dream11 data proprietary.

## 8. Code / data availability
None stated in the text read — no code URL, no data link (SFWork is a cited public dataset; Berbeglia et al. (2022) code is referenced but no link given; Dream11 data proprietary and masked).

## 9. Leakage & limitations
- The headline synthetic wins use **replicated ground truths from Berbeglia et al. (2022)** and their estimation code — a fair ablation of the design component, but the ground-truth family is one the authors chose; generalization of the 16.9% claim to other model families rests on two additional spot checks (Exponomial, MNL, "weaker findings").
- Dream11 results are **relative RMSE ratios against a point-estimate baseline with absolute numbers masked** — cannot judge economic magnitude; and the "wins in first half of horizon" pattern is exactly what you'd expect from any regularized model vs. an empirical estimator (shrinkage wins at small N).
- The "46% reduction" vs. Benson et al. is driven mostly by the **experiment design** (size-n/2 vs. size-2/3 assortments), not the identification algorithm — the authors admit this; and with the authors' design, Benson's algorithm is "hard to beat."
- Assumptions A1/A4 (identifiability, general position) are knife-edge: near-coincident multipliers (plausible in real choice data, cf. SFWork where no nest structure helped) break the noiseless guarantees; the finite-sample Δ-separation constant is unknowable ex ante.
- Nests found are only as good as the Nested Logit assumption; on SFWork the ground truth "is not Nested Logit" and Markov Chain dominated — the method explains substitution when the world is nested, and misleads otherwise.
- **External validity to NFL: moderate.** GSE doesn't control contest menus, but the design logic transfers to controlled experiments (survey/A-B testing of product variants, content slate experiments) and the nest-ID boost-factor logic transfers to discovering substitution clusters among bet types / DFS contest types / sportsbook offerings from observational menu variation.

## 10. GSE overlap
- **Directly relevant, not duplicate.** The existing-research map shows: Bradley-Terry / Plackett-Luce / Elo / Glicko / TrueSkill inventoried (26-metric catalog); learning-to-rank and contextual bandits are ML-brief topics (results pending); **no choice-modeling (MNL/nested logit/Markov chain) work, no assortment-experiment design, no contest-substitution analysis** anywhere in the repo. The Dream11 deployment is the closest real-world analogue to GSE's world (fantasy contest choice), and nothing in the corpus covers it.
- Complements: could sit under the ML brief's bandits/ranking lanes; the "size ≈ n/2 maximizes information per observation" principle is a portable experimental-design heuristic.
- Not a duplicate of Dixon-Coles/Skellam/Poisson score-modeling work — this is about *which options agents choose from menus*, not match outcomes.

## 11. GSE implementation spec
- **Data:** GSE cannot run assortment experiments on sportsbooks, but CAN use the machinery in two places: (a) **DFS contest-type substitution**: cluster DK/FD contest types (single-entry, 3-max, 20-max, multipliers, showdown, tiers) by substitution patterns using observed entry-share shifts when contest menus change (e.g., slate-size variation, contest sell-outs = natural "assortment removal"); (b) **pick-em / content slate experiments**: Motif controls the X content slate and kit-preview variants — apply the binary-encoding design to A/B content variants (n variants, 2⌈log2 n⌉ test cells of size n/2) to detect substitution between content types.
- **Build:** (1) implement balanced binary-encoding assortment generator (b=2, d=⌈log2 n⌉, ~n/2-sized assortments); (2) boost-factor nest-ID (Algorithm 1 + pooled z-test version, scipy community detection for inconsistency resolution); (3) nested-logit fitter with data-driven nests; (4) benchmark vs. MNL and vs. k-means-on-features nests on RMSE_soft computed over observed (menu, choice-share) pairs.
- **Serving:** offline batch analysis; re-run weekly as contest menus shift. Effort: ~1–2 weeks for a competent engineer (algorithms are fully pseudocoded; estimation code must be written or ported).

## 12. Reproducible test
- **Dataset:** DK contest entry-share data is not public — use the **public SFWork dataset** (Koppelman & Bhat 2006; 6 options, 5,000 choices, 12 assortments) as the paper did, PLUS a GSE-native proxy: nflverse-derived weekly "which bet type" menu variation is unavailable, so instead test on **synthetic nested-logit ground truths** generated exactly per §6.1 (n=16, N=90,000, 500 instances): implement their design + Algorithm 1 vs. Benson et al. (2016) size-2/3 design; metric = Rand index of recovered partition and RMSE_soft.
- **Gate:** reproduce the paper's directional claim — authors' pipeline achieves higher mean Rand index than Benson's at N=90,000; reject if it doesn't beat the size-2/3 baseline. Then extend to a GSE real-data case (DFS contest substitution from natural menu variation) before any production use.

## 13. Acceptance / rejection gate
- **ADAPT gate (synthetic replication):** implement the binary design + Algorithm 1 on fresh nested-logit ground truths (n=16, N=90,000, ≥200 instances); ACCEPT for GSE use if mean Rand index ≥ Benson-et-al.-2016 baseline + 0.05 absolute (matching the paper's "best at all data sizes" claim directionally); REJECT the replication if not.
- **ADAPT gate (GSE data):** apply to DFS contest-type substitution; ACCEPT only if data-driven nests beat k-means-on-features nests on out-of-sample RMSE_soft over chronological splits in ≥2 of 3 slate windows; otherwise park.

## 14. Improvement experiment
Go beyond the paper by **dropping the symmetry assumption**: the authors note ( §8) their design treats items as symmetric ex ante and can't use domain knowledge. Experiment: weight the binary encoding by prior market shares (Huffman-style: popular items get encodings that place them in more assortments) so that boost factors are estimated with precision proportional to economic importance — then test whether share-weighted designs beat balanced designs on *share-weighted* RMSE_soft (weighting assortment errors by handle/entry volume). This directly targets the paper's stated open question and matches GSE's reality (a few contest types dominate handle).

---
*Flags: (a) PDF math extraction garbled subscripts in eqs. (1)–(5); equation forms above are cleaned reconstructions flagged uncertain — consult the PDF directly before implementing. (b) ar5iv HTML failed; full text from arXiv PDF only. (c) No code/data links stated in paper.*
