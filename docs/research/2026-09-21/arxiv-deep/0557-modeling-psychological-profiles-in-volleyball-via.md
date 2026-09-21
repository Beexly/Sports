# [0557] Modeling Psychological Profiles in Volleyball via Mixed-Type Bayesian Networks (arXiv:2509.22111v1)

**Citation:** Maria Iannario, Dae-Jin Lee, Manuele Leonelli (2026). *Modeling Psychological Profiles in Volleyball via Mixed-Type Bayesian Networks*. arXiv:2509.22111v1. URL: https://arxiv.org/abs/2509.22111v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4104 lines).
**Verdict:** REJECT — sports-psychology questionnaire modeling on 164 amateur volleyball players; the latent-MMHC structure learner is a real methodological contribution, but GSE has no psychometric or mixed-type questionnaire data and no decision surface that needs a psychological-trait DAG.

## 1. Research question
How to learn directed conditional-dependence networks among mixed-type variables (ordinal questionnaire scores, categorical demographics, continuous indicators): the authors introduce latent MMHC, a hybrid structure learner coupling a latent Gaussian copula with a constraint-based (MMPC) skeleton and a constrained score-based (hill-climbing) refinement, plus a bootstrap-aggregated stable variant. Applied to psychological profiling of volleyball players.

## 2. Dataset / schema
New dataset: 164 female volleyball players from Italy's C and D leagues, combining standardized psychological profiling (mental-skills questionnaires, Big-Five personality traits) with background/demographic information. Mixed types: ordinal questionnaire scores, categorical demographics, continuous indicators. Simulations: synthetic DAGs with p ∈ {10, 30} variables, varying sample size and sparsity. Data availability: the paper does not state a public release for the player dataset (no link found); the method is open-source.

## 3. Method / model
Latent MMHC: (1) map mixed-type variables to a latent Gaussian copula space; (2) constraint-based skeleton learning via Max-Min Parents-and-Children (MMPC) with conditional-independence tests at threshold α ∈ {0.01, 0.05}; (3) constrained score-based hill-climbing refinement restricted to the skeleton, using either a SEM/BIC-style score; returns a single DAG. Stable variant: bootstrap aggregation over resamples, keeping edges that recur. Inference/scenario analysis uses the fitted DAG for probabilistic reasoning (do-style scenario conditioning, not formal causal identification). Baselines: copula PC, latent PC, SEM score-based learners.

## 4. Equations & assumptions
No closed-form equations stated in the extract beyond the standard BN factorization P(X) = ∏_i P(X_i | Pa(X_i)) and the latent Gaussian copula construction (observed mixed-type variables as monotone transformations of latent Gaussians). Stated assumptions: (i) mixed-type dependencies are faithfully represented by a latent Gaussian copula; (ii) the true structure is a DAG (acyclicity enforced); (iii) faithfulness of conditional-independence tests in the latent space; (iv) questionnaire scores measure the intended latent traits (no measurement-model validation shown); (v) scenario analyses are associational propagations through the DAG, not causal interventions (no confounding adjustment claimed).

## 5. Features / target
Inputs: ordinal mental-skill questionnaire scores (goal setting, self-confidence, motivation, anxiety, emotional arousal, preparation, self-esteem), Big-Five traits (neuroticism, extraversion, etc.), categorical demographics, continuous background indicators. No supervised target — unsupervised structure learning; outputs are the DAG, hub/connector nodes, and scenario-conditional distributions.

## 6. Validation design
Simulations: structural recovery measured by Structural Hamming Distance (SHD: edge insertions + deletions + reversals vs true DAG), edge recall (sensitivity), and specificity across sample-size × sparsity × dimension settings. Real data: descriptive — learned network interpreted substantively (mental skills organized around goal setting and self-confidence; emotional arousal bridging motivation and anxiety; neuroticism/extraversion upstream of skill clusters); six illustrative intervention scenarios show distributional shifts in self-confidence/preparation/self-esteem. No held-out validation, no predictive baseline.

## 7. Numerical results / baselines
Paper's stated claims: latent MMHC (SEM, α=0.01) achieves the lowest median SHD in 7 of 8 settings for p=30 graphs (Table 1); for p=10, SEM variants best with α=0.01 at small n, α=0.05 at larger n. Edge recall: hybrid/score-based methods substantially beat copula PC and latent PC; α=0.05 improves sensitivity especially at p=30. Specificity: all MMHC variants maintain high specificity, often matching/exceeding copula PC and latent PC. Bootstrap-aggregated stable latent MMHC gives only modest gains (slightly lower medians / reduced variability). Runtime: "acceptable" (no hard numbers quoted in the extracted text). Volleyball findings are qualitative (network topology, scenario shifts) with no effect-size numbers stated.

## 8. Code / data availability
Open-source R implementation: https://github.com/manueleleonelli/latent_mmhc (integrates with bnlearn). Player dataset: no public link stated.

## 9. Leakage & limitations
Be adversarial: (a) n=164 with dozens of mixed-type variables — structure learning is severely underpowered; the learned DAG is one of many statistically indistinguishable structures, and the paper's substantive claims (neuroticism "upstream") rest on edge orientations that constraint-based methods cannot reliably identify at this n. (b) Questionnaire self-reports from amateur athletes: measurement validity, social-desirability bias, and the gap to on-court performance are unaddressed — no performance outcome is modeled. (c) Scenario analyses are presented as decision support but are purely associational; intervening on "goal setting" will not produce the modeled shifts without causal identification. (d) Simulations generate from the same latent-Gaussian-copula family the method assumes — home-field advantage over the baselines. (e) External validity to GSE: zero — GSE has no psychological, questionnaire, or mixed-type trait data; NFL-relevant "intangibles" (coaching, morale) are not measured in any dataset GSE holds.

## 10. GSE overlap
No overlap. The existing-research-map contains no Bayesian networks, no structure learning, no sports-psychology work. Not in the 64-ID dedup list. The latent-MMHC method is a genuine contribution to mixed-type structure learning, but there is no GSE data surface for it — GSE's variables are continuous tracking/charting/odds metrics, not ordinal questionnaires.

## 11. GSE implementation spec
None warranted. The only conceivable future use: if GSE ever collects structured expert/coach charting labels as ordinal variables (e.g., film-grade ordinal assessments), latent MMHC could learn their dependence structure — but that data does not exist. Note the GitHub repo (manueleleonelli/latent_mmhc) in a methods-watchlist line; do not build.

## 12. Reproducible test
Not applicable — no GSE-relevant claim to test.

## 13. Acceptance / rejection gate
REJECT: no test to pass. Revisit only if GSE acquires ordinal expert-label data (e.g., crowdsourced film grades), in which case benchmark latent MMHC against plain MMHC on a held-out likelihood gate before using any learned DAG for decisions.

## 14. Improvement experiment
If the data ever existed: replace the associational scenario analysis with a proper causal DAG workflow — orient edges with interventional or temporal data (e.g., traits measured pre-season, skills mid-season, performance post-season gives natural time-ordering constraints), then estimate causal effects of intervenable nodes via do-calculus. Without time ordering, the current output should not guide any real intervention.
