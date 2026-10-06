# The Impact of Expert Interaction Networks on Forecast Pooling

## 1. Citation and full-text verification
- **arXiv ID:** 2406.13749 (full text fetched from ar5iv on 2026-09-22 — "The Impact of Expert Interaction Networks on Forecast Pooling", single-author econometric theory paper)
- **Full text read:** complete, 1,430 extracted lines (Abstract → §1 Introduction → §2 Literature review → §3 Model (notation, primitives, pooling rules) → §4 Main results (common correlation/variance, Lemma 1, Attention Centrality, Proposition 1, fixed networks Corollaries 1–2, Propositions 2–3 on d-regular and Poisson random graphs) → §5 Conclusion → References → Appendices)
- **Cross-reference check:** not in the ledger corpus (dedup vs `ledger-tracker-750.jsonl`, `wave4b-dedup-baseids.txt`, existing `arxiv-deep` headers: zero hits)

## 2. Problem and method
**Problem:** Forecast combination assumes independent inputs, but in practice experts talk to each other before reporting — professional forecasters exchange views before informing central banks; Yelp reviewers read other reviews. What does prior non-strategic communication do to the decision-maker's pooled forecast?
**Method:** Theoretical model with n experts whose point forecasts xᵢ=θ+ϵᵢ (common variance σ², common pairwise correlation ρ) exchange forecasts over a network G(N,A) (local averaging with neighbors, including self) before the decision-maker pools them (simple average or Bayesian). Defines **Attention Centrality** αᵢ(A)=Σ_{j∈Nᵢ}1/dⱼ−1: the net collective emphasis placed on expert i's forecast due to the network. Defines **Network Bias** 𝓑(x): difference between the pooled forecast with vs without prior communication. Analyzes E[𝓑] and Var[𝓑] for fixed classical networks (star, line, d-regular) and Poisson random graphs.

## 3. Core equations
- **Attention Centrality (Def. 4):** αᵢ(A) = Σ_{j∈Nᵢ(A)} 1/dⱼ − 1.
- **Proposition 1:** E_ϵ[𝓑(x)|A] = 0 (network communication introduces NO bias in expectation); Var[𝓑(x)|A] = (σ²/n)(n⁻¹Σᵢαᵢ² + 2ρn⁻¹Σ_{i<j}αᵢαⱼ) — variance is a function of attention centralities.
- **Corollary 1 (star, n≥3):** Var = σ²(1−ρ)(n−2)²(n−1)/(4n³), increasing in n, → σ²(1−ρ)/4 as n→∞ — star networks have the HIGHEST variance.
- **Corollary 2 (line):** Var = σ²(1−ρ)/(9n²) → 0 as n→∞.
- **Proposition 2:** αᵢ=0 ∀i ⟺ network is d-regular ⟹ E[𝓑]=Var[𝓑]=0 for ANY forecast vector — d-regular networks are the most efficient structure (zero network bias and zero network-induced variance, deterministically).
- **Proposition 3 (Poisson G(n,p(n)), n large, p small):** E_d[E_ϵ[𝓑]]=0 and E_d[Var[𝓑]]→0 both when ⟨d⟩→1 (too sparse ≈ no communication) and ⟨d⟩→∞ (too dense ≈ complete network, a d-regular case).
- **Lemma 1 (rule equivalence):** under common correlation + common variance, Bayesian pooling collapses to simple average — any pooling-rule mixture is effectively simple averaging.

## 4. Datasets and empirical results
No empirical work — fully theoretical. "Experiments" are: (a) the three-expert worked example (star/line variants producing Network Bias of +1/3, 0, −1/3 depending on network and forecast placement); (b) Poisson random-graph simulation (θ=3, σ²=1.2, ρ=0, ⟨d⟩=5) confirming variance→0 as n grows. The paper is honest that results rest on strong symmetry assumptions (common correlation, common variance, non-strategic local averaging).

## 5. GSE application
The realistic setting for GSE, not the paper's fiction: GSE's component models are "experts that communicate before pooling" in the precise sense that they share information channels — many models consume the same NGS features, the same injury reports, the same market-implied lines. The paper's verdict: such sharing introduces no bias in expectation but inflates the variance of the pooled forecast, and the inflation is governed by the **information topology**:
- The dangerous structure is the **star**: every model reading one dominant hub (e.g. the Vegas consensus line, or one flagship NGS metric). Star variance → σ²(1−ρ)/4, the maximum — a quantitative argument for GSE to limit how much of the ensemble leans on any single common input.
- The safe structure is **d-regular / decentralized**: models drawing on balanced, overlapping-but-not-identical feature sets; complete interdependence washes out the bias too.
- This is the theoretical complement to ledger 1675 (2209.01697, common factors in forecast errors): that paper *estimates and removes* shared error factors; this paper says the shared-information structure inflates ensemble variance even before estimation, so prevention (diversifying inputs) beats cure (factor adjustment).
- Practical rule: audit the ensemble's information graph — if a majority of component models ingest the same line or feature as their dominant input, you have a star; either decorrelate inputs or down-weight the hub's effective influence (e.g. deflate its weight by the redundancy it induces).

## 6. Implementation notes
- No code or data — adaption is conceptual. The actionable artifact is an ensemble-design audit: map each component model's top information sources; compute a concentration diagnostic (fraction of total weight attributable to the single most-shared input — a star-topology proxy); diversify where concentration is high.
- Lemma 1's rule-equivalence is a caution: when component errors are symmetric in precision and correlation, fancy Bayesian pooling adds nothing over simple average — spend effort on diversification (topology), not on the pooling rule.
- Do NOT apply the zero-bias result naively: "unbiased in expectation" is over random forecast placement on the network; for a fixed realized season the Network Bias can be ±1/3-scale (the worked example) — the variance result is the operative one.

## 7. Tests and evaluation
Empirical translation of the theory on GSE backtests: (a) construct two ensembles — one where all components share a dominant common input (star-like) vs one with diversified inputs (regular-like) — and test whether the star ensemble's combined-forecast variance is higher at equal average component accuracy; (b) measure whether removing the shared hub input reduces realized ensemble variance without increasing bias; (c) estimate the effective "attention centrality" of shared inputs (how much implicit weight the pooling gives each) and compare against the paper's variance formula. Pass criterion: diversified-input ensembles show lower realized pooling variance, consistent with the theoretical ordering star > line > d-regular.

## 8. Strengths
- First clean decomposition of network-communication effects into zero-mean bias + topology-driven variance, with a novel, interpretable centrality measure (Attention Centrality).
- Sharp, provable orderings (star worst, d-regular best) under stated assumptions; random-graph extension shows the effect vanishes in large sparse/dense networks — useful boundary conditions.
- Bridges forecast-combination and social-learning literatures; explains why Bayesian pooling may add nothing (Lemma 1) under symmetry.
- Honest about limits: strategic interaction, domain application, and decision-maker preferences all flagged as future work.

## 9. Limitations and risks
- Fully theoretical — no empirical validation on any real forecaster panel; GSE value is a design lens, not a tested tool.
- Strong symmetry assumptions (equal precision, common positive correlation, non-strategic local averaging) are unrealistic for sports models with genuinely heterogeneous skill.
- Proposition 2's "only if" direction is noted as "proof under review" — the d-regular characterization is one-sided as published.
- Zero-bias result is in expectation over forecast placement; realized bias for a fixed network + fixed season can be large (the ±1/3 example).
- Doesn't handle strategic herding (forecasters gaming the pool) or time-varying networks.

## 10. Comparison to prior art
vs **classical combination (Bates–Granger; Winkler 1981 Bayesian; Timmermann 2006)**: assumes independent experts; this paper relaxes independence via an explicit pre-pooling communication graph.
vs **dependence-robust aggregation (Arieli et al. 2018; Levy & Razin 2021–22)**: those handle uncertainty about correlation for the decision-maker; this paper models where the dependence *comes from* (network structure) and which structures are worst.
vs **social learning (DeGroot 1974; Golub–Jackson 2010)**: those study consensus formation; this studies the pooled-decision consequences of one round of local averaging.
vs **2209.01697 (ledger 1675)**: empirical factor-removal for common error components; this paper is its theoretical prequel — topology of shared information determines the variance inflation that factor models then estimate. Pair them.

## 11. Novelty
Introduces Attention Centrality and the Network Bias decomposition; first provable ranking of communication topologies (star worst → d-regular zero) for forecast pooling, plus the rule-equivalence lemma showing Bayesian pooling reduces to simple averaging under symmetry.

## 12. Reading difficulty
Medium-high: econometric theory with network notation; the core results (Props 1–3, Corollaries) are readable once Attention Centrality is internalized. Appendices carry the heavy proofs.

## 13. Related papers
- Bates & Granger (1969); Winkler (1981); Clemen & Winkler (1985, 1986): classical/Bayesian pooling foundations.
- DeGroot (1974); Golub & Jackson (2010); Golub & Sadler (2017): social learning/naive learning in networks.
- Arieli et al. (2018); Levy & Razin (2021, 2022): robust aggregation under correlation uncertainty.
- Lee & Seregina (2023, ledger 1675): factor structure in forecast errors — the empirical counterpart.

## 14. GSE value
Gives GSE a provable design principle for ensemble construction: shared information channels between component models inflate pooled-forecast variance with zero compensating bias reduction, and star topologies (every model leaning on one hub input) are the worst case — so diversify models' information inputs rather than just model classes, and treat the single most-shared input as a variance risk to be audited and capped.

**Verdict:** ADAPT
