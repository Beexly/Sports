# [0244] Data-Driven Analysis for Understanding Team Sports Behaviors (arXiv:2102.07545v2)

**Citation:** Fujii, K. (2021). *Data-Driven Analysis for Understanding Team Sports Behaviors*. Nagoya University. arXiv:2102.07545v2. URL: https://arxiv.org/abs/2102.07545
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,199 lines; substantive §§1–6 fully read, remainder is the reference list).
**Verdict:** REJECT — a survey paper (no novel method, no new equations, no new empirical results). Its two candidate contributions are both already resolved in Garrett's corpus: (1) Koopman-operator/DMD multi-agent dynamics (the author's own research line) was empirically REJECTED in the MOVE-37 lane (DMD momentum p=0.89, AR(1) wins); (2) the RL planning-based section overlaps paper 0243 (Markov Cricket), which this wave already ADAPTs in concrete form. The remaining content is basketball/soccer tracking-data methodology with no NFL transfer. Keep as a bibliography pointer for the NGS-replacement lane; nothing to implement.

## 1. Research question
Survey question: what data-driven (machine-learning) approaches enable quantitative UNDERSTANDING — not just prediction — of multi-agent behaviors in invasion team sports (basketball, soccer/football)? Organized into two families: (1) extracting interpretable features/rules (visualizing learned representations, extracting mathematical structure), and (2) generating/controlling behaviors in visually-understandable ways (simulating future and counterfactual trajectories to test hypotheses). Plus a discussion of practical applications.

## 2. Dataset / schema
No new dataset. Survey of published work using: multi-agent trajectory data (player/ball positions, Fig. 1 basketball illustration [19]); discrete action sequences (dribble/pass/shot, Fig. 2 soccer [20]); relation sequences R_K (K×K agent-relation matrices per timestep, e.g., distances or Gaussian kernels). Formalism given: single-agent trajectory P=(p₁,…,pₘ), pᵢ∈ℝᵈ; multi-agent P_K with p_{K,i}∈ℝ^{K×d}; relations R_i with R_{i,k,l}=h(p_{i,k},p_{i,l}).

## 3. Method / model
No new method — a taxonomy of the literature:
- **§3.1 Rule-based:** social-force models [4,5,6,7], Voronoi control areas [38], pass networks [39], group-theoretic symmetry breaking [41], probabilistic off-ball scoring models [42].
- **§3.2 Unsupervised:** PCA/t-SNE/NMF/tensor/topic models on shots and trajectories [44–49]; DMD and Koopman-operator spectral analysis of multi-agent relation sequences, incl. DMD in RKHSs [58], tensor-train adjacency decomposition [23], Koopman spectral kernel as a permutation-invariant similarity for clustering [21,9]; trajectory clustering with Fréchet distance [67], DTW [68], scalable trie-based Fréchet search [65]; permutation problem handled by ball-proximity ordering [9,23], Hungarian-algorithm role assignment [71–76], or DMD's permutation-invariant dynamics [21,9].
- **§3.3 Supervised:** score prediction / team ID / screen-play classification / rebound prediction with LDA/logistic/SVM on hand-crafted features [77–84]; DMD-similarity + classification of defensive/offensive tactics [23]; end-to-end neural nets for offensive plays [50], team styles [86], micro-action attack outcomes [87]; interpretable matrix/tensor factor models [88–90], Poisson point processes [91]; rugby event pattern mining [92].
- **§4.1 Rule-based simulation:** social-force 3v1 possession [5], physics-based pass probabilities [6], self-propelled-particle trajectory forecasting [7].
- **§4.2 Pattern-based:** RNN/VRNN trajectory prediction [94,75,97,98,95,76], GANs [99,100], VAEs [101], imitation learning [75,19], attention-based observation [102,103,19], relational/GNN permutation-equivariant models [104,76,106,105], physically-interpretable models [22,23], defensive-evaluation-aware prediction [107,14].
- **§4.3 Planning-based:** inverse — VAEP action valuation [20], RNN Q-functions [109,110] made interpretable via linear model trees [111], expected possession value [77,113,114], Voronoi space value [115,116,38], pass/pass-reception/interception models [117–121], deep-RL ball-screen defense evaluation [122], counterfactual shot-policy season simulation [123]; forward — RoboCup [124], open-source soccer simulator [125], 3v3 basketball simulator [126], imitation+RL defensive trajectory generation [64].

## 4. Equations & assumptions
The survey's own formalism (§2): P=(p₁,…,pₘ), pᵢ∈ℝᵈ; P_K=(p_{K,1},…,p_{K,m}), p_{K,i}=[p_{i,1},…,p_{i,K}]∈ℝ^{K×d}; R_K=(R₁,…,R_m), R_i∈ℝ^{K×K}, R_{i,k,l}=h(p_{i,k},p_{i,l}). No new equations, theorems, or derivations — all methods are cited, not developed. (Assumptions discussed are those of the cited works.)

## 5. Features / target
N/A (survey). Discussed feature types: static hand-crafted (distances, relative phases, speeds, action frequencies/angles), learned representations (DMD modes/frequencies/growth rates, embeddings), and discrete actions (dribble/pass/shot). Discussed targets: play classification, scoring probability, trajectory prediction, action valuation.

## 6. Validation design
N/A (survey). Notes explicitly that unsupervised methods "do not use objective variables (labeled data), it is sometimes difficult to validate them quantitatively" and suggests combining with supervised methods for quantitative evaluation.

## 7. Numerical results / baselines
None of its own. Cited results are summarized qualitatively (e.g., basketball screen-play defense role-switching frequencies [8]; DMD-based tactic classification [23]) without reproducing numbers.

## 8. Code / data availability
None (survey). References point to cited works; some cited simulators are open-source [125].

## 9. Leakage & limitations
- As a survey: no results to leak; but also no falsifiable claim — nothing can be validated or refuted from it.
- Sport and data mismatch: essentially all concrete methods are basketball/soccer tracking-data; NFL relevance is asserted only in passing ("team sports such as basketball and football" in the abstract).
- The most NFL-relevant data regime (NGS tracking) is exactly where Garrett's corpus is already deepest (27-family taxonomy, STRAIN read); the survey adds no tracking method not already covered.
- Cost-of-tracking discussion (§5) is dated pragmatics, not method.

## 10. GSE overlap
- **Koopman/DMD: already evaluated and REJECTED.** The survey's signature method family (Fujii's own DMD/Koopman line [9,21,22,23,58,59]) is the same DMD momentum approach the MOVE-37 lane falsified (p=0.89, AR(1) beats DMD). Re-reading it via this survey adds nothing.
- **RL planning (§4.3):** overlaps paper 0243 (Markov Cricket, ADAPTed this wave) which gives a concrete IRL implementation; the survey's treatment is strictly less actionable.
- **Action valuation (VAEP [20], EPV [77,113,114]):** the EPA-family inventory in the map covers the NFL analogue; VAEP-for-NFL would be a new paper, not this survey.
- **Permutation/role-assignment (Hungarian [71–76]):** not in the map, but it's a tracking-data preprocessing trick for basketball/soccer with no GSE product surface.

## 11. GSE implementation spec
None — REJECT. If the NGS-replacement lane ever needs a bibliography of tracking-data representation methods, this survey is a reasonable starting pointer (especially [19] partial-observation policy learning, [23] physically-interpretable network dynamics, [104–106] permutation-equivariant GNNs) — but that is a literature-search task, not an implementation.

## 12. Reproducible test
N/A (REJECT). No claim to test.

## 13. Acceptance / rejection gate
REJECT, decided on read: (1) survey with zero novel methods/results — nothing to adopt; (2) its most distinctive method family (Koopman/DMD) already falsified in-repo; (3) its RL content is strictly dominated by paper 0243's concrete treatment; (4) basketball/soccer tracking focus with no NFL transfer path. No gate salvages it — the value, if any, is as a citation list, which does not meet the ADAPT bar of an adaptable mechanism.

## 14. Improvement experiment
None warranted. The one experiment the survey implicitly invites — testing Koopman spectral kernels for NFL play-classification similarity — is pre-empted by MOVE-37's DMD rejection; re-running it would need new justification (e.g., a different observable than momentum) that this survey does not provide.
