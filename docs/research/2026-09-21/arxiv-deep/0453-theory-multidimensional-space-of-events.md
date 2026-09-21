# [0453] Theory: Multidimensional Space of Events (arXiv:2505.11566v1)

**Citation:** Kavun, S. (2025). *Theory: Multidimensional Space of Events*. arXiv:2505.11566v1. URL: https://arxiv.org/abs/2505.11566v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2614 lines).
**Verdict:** REJECT — restates standard Bayesian-network concepts under idiosyncratic notation with no new mathematics; all "empirical" results are unverifiable toy arithmetic on invented numbers, with internally inconsistent improvement claims (11%, 12%, 18%, "15–20%", "42%").

## 1. Research question
Can classical Bayesian theory be extended to model mutual influences between sets of events and sets of hypotheses in "multidimensional" spaces, where traditional approaches allegedly assume conditional independence? The paper proposes the "multidimensional space of events" (MDSE) theory: a pseudo-bipartite graph with event vertices and hypothesis vertices, edges weighted by conditional probabilities, plus prior estimation and Bayesian updating. In substance, this is a Bayesian network with renamed parts.

## 2. Dataset / schema
No real dataset is used anywhere. The "validation" consists of four worked arithmetic examples with author-invented numbers:
- Ex. 1 (corporate default): 3 hypotheses (P(B1)=0.4, P(B2)=0.25, P(B3)=0.35), P(A|Bi) ∈ {0.7, 0.6, 0.4}.
- Ex. 2 (energy consumption): "5 key dynamic factors," 4 scenarios each.
- Ex. 3 (disease outbreaks): 4 diseases, 16 hypothesis combinations; diabetes/hypertension joint example with P(B1)=0.6, P(B2)=0.4.
- Ex. 4 (flood/drought): P(A1|B1)=0.6, P(A2|B2)=0.3, uniform priors.
No data source, no sample sizes, no access information — the numbers are stipulated, not measured. No sports data.

## 3. Method / model
1. **Formalism (§3–5):** hypothesis set B=B1∪…∪Bm ("m-dimensional space"), event set A=A1∪…∪An; new notation A(B) = dependence, A)B( = independence (reversed parentheses). Law of total probability P(A)=Σ_i P(A|Bi)P(Bi) (eqs. 1–2); Bayes' rule P(Bm|A)=P(Bm)P(A|Bm)/P(A) (eq. 3) — both standard. MDSE-graph: pseudo-bipartite directed graph, Definition 1 (union of mutually exclusive/exhaustive hypothesis and event sets); edges E(Ai,Bj)=P(Ai|Bj) with weights (e.g., W(A1,B1)=0.9); prior estimation via expert knowledge/frequentist/subjective/uniform/empirical-Bayes (all textbook); posterior updating via Bayes' theorem.
2. **Graph properties (Table 3):** directed, no loops/multi-edges, non-planar, no Eulerian/Hamiltonian paths, irregular — generic graph-theory boilerplate with no bearing on inference.
3. **"Empirical validation methodology" (§10):** claims benchmarking on "AWS c6i.32xlarge, 128 vCPUs" at d=1000 variables against Bayesian networks, Markov logic networks, neural-symbolic models, "following IEEE 829-2024" — no code, no data, no reproducible artifact; the "42% scalability gain" is computed from a normalized composite score with arbitrary weights w=[0.4,0.3,0.3].
No training procedure; no hyperparameters beyond invented example numbers.

## 4. Equations & assumptions
- P(A) = Σ_{i=1}^m P(A|Bi)·P(Bi). (eqs. 1–2; law of total probability)
- P(Bm|A) = P(Bm)·P(A|Bm)/P(A). (eq. 3; Bayes' theorem)
- Edge: E(Ai,Bj) = P(Ai|Bj); weight example W(A1,B1)=0.9.
- Graph size: E = lim_{n,m→∞}(n+m)(n+m+1)/2 ≡ max E, E_min=3; V = lim(n+m) ≡ max V, V_min=4. (eqs. 6–7; mathematically vacuous — limits of unbounded expressions)
- Joint example: P(A1∩A2) = P(A1|B1,B2)·P(A2|B1,B2)·P(B1,B2) = 0.5·0.7·0.24 = 0.084 — the chain rule with an unstated conditional-independence assumption, presented as an MDSE result.
- "Partition gain" and "posterior concentration" formulas in §10 are garbled/not derived (e.g., P(Ĝ≠G*) ≤ exp(−n/3·p²/8) quoted from Niu et al. 2021 without connection to MDSE).
Assumptions: mutually exclusive and exhaustive hypothesis sets; the paper's "novelty" claims rest on notation, not on new assumptions.

## 5. Features / target
Not applicable — no learning task. Illustrative features: interest rate/inflation/volatility (Ex. 1); weather/equipment/schedules (Ex. 2); hygiene/vaccination/season (Ex. 3).

## 6. Validation design
No validation design. The four "examples" stipulate both inputs and outputs arithmetically (e.g., traditional P(A)=0.57 computed from the same invented numbers, then "MDSE" 72% asserted by adding unquantified "interdependencies"). The §10 benchmarking section reports no experimental protocol that could be rerun — no code, no dataset, no random seeds, no baseline implementations.

## 7. Numerical results / baselines
All numbers are author-stipulated, not measured:
- Abstract: "15–20% improved prediction accuracy" vs. standard Bayesian methods; "over 50 interrelated variables" where traditional methods show "exponential" complexity vs. MDSE "polynomial scaling" — no evidence given.
- Ex. 1: traditional 78% → MDSE 89% (+11%); second variant 57% → 72% (+18%).
- Ex. 2: MAE 15% → 7%.
- Ex. 3: 73% → 85% (+12%); joint-disease 8.4%.
- §10: "42% scalability gain," O(d^2.5)→O(d^1.8), memory 2.4×10^6→9.8×10^5 MB, throughput 1.2×10^4→2.1×10^4 ops/sec, "170% higher marginal performance per memory unit" — composite-score arithmetic on unreported experiments.
- These figures are mutually inconsistent (11% vs. 15–20% vs. 42%) and none is reproducible. No confidence intervals, no sample sizes.

## 8. Code / data availability
None stated. (References a "Supplementary Material" that is not included; DOI https://dx.doi.org/10.2139/ssrn.4944538 is an SSRN preprint record, and the manuscript carries a "FOR PEER REVIEW" watermark.)

## 9. Leakage & limitations
- **No real contribution:** the MDSE-graph is a Bayesian network with renamed vertices; edges-as-conditional-probabilities, priors, and Bayes updating are all standard. The paper's central claim of novelty is notational.
- **Fabricated empirics:** every "result" is arithmetic on invented numbers; the benchmarking section's hardware claims and complexity exponents are asserted without artifacts. This is the irreproducible-claims REJECT case.
- Internal inconsistencies: improvement figures disagree across sections; the "exponential vs. polynomial" complexity claim contradicts the paper's own O(d^1.8) polynomial claim for baselines.
- Heavy self-citation to the author's own "theoretical and methodological fundamentals (TMF)" framework (Kavun [32,33], Kavun & Zhosan [34]); reference list mixes real citations (Gelman, Bernardo & Smith) with padding.
- The joint-probability "result" (0.084) smuggles in a conditional-independence assumption while claiming to model dependence — the exact limitation the paper attributes to classical methods.
- Zero external validity to NFL: no data, no domain, no transfer path.

## 10. GSE overlap
**Duplicate of textbook material, adding nothing.** Per the existing-research map: Bayesian networks, Bayesian consistency, and probabilistic graphical modeling are standard background across GSE's corpus (ML brief, state-space/Bayesian topics); nothing in MDSE goes beyond a first-year Bayes-net lecture. No overlap with Garrett's CEPT/MOVE-37 lanes. The paper's claimed application areas (risk assessment, forecasting) are the map's already-covered territory, and the paper contributes no method GSE could implement that isn't already standard practice.

## 11. GSE implementation spec
No build recommended (REJECT). There is nothing to implement: "construct a bipartite graph with P(Ai|Bj) edges and apply Bayes' rule" is already how any probabilistic model works. If GSE ever wants explicit event–hypothesis dependency graphs, standard Bayesian-network libraries (pgmpy, Pyro) implement this with actual inference algorithms — ~1 day, no paper needed.

## 12. Reproducible test
Not applicable — no empirical claim in the paper is stated with enough specificity (data, protocol, code) to reproduce. The toy examples reproduce trivially (they're arithmetic) but test nothing.

## 13. Acceptance / rejection gate
REJECT confirmed: (a) no novel mathematics — the formalism reduces to the law of total probability and Bayes' theorem with renamed notation; (b) all quantitative claims are unverifiable stipulations, mutually inconsistent, with no data, code, or protocol; (c) no sports-domain content or transfer path. No acceptance test is constructible because there is no method distinct from standard Bayesian networks to accept.

## 14. Improvement experiment
None warranted on this paper. The legitimate research direction it gestures at — scalable inference in dense discrete Bayesian networks — is already covered by the variational/BP/MCMC literature; a GSE-relevant follow-up would be benchmarking approximate inference for a hierarchical team-strength Bayes net on nflverse data, which needs no input from this paper.
