# Galaxy Genesis — Primary Research Source Ledger

This ledger records the primary technical and scientific foundations used to expand Galaxy Genesis. It is not a dependency list. Every candidate still requires stack-fit, license, security, rights, cost and empirical review before adoption.

## 1. Meta-compilation and equivalent plans

- **Substrait** — portable, language-neutral compute-plan representation.  
  Source: https://substrait.io/  
  Genesis use: informs a stable Plan IR whose execution engine may change without changing contract semantics.
- **egg / egglog / e-graphs** — represent many equivalent expressions and select optimized forms; egglog joins equality reasoning with Datalog-like analysis.  
  Source: https://egraphs-good.github.io/  
  Genesis use: future Metacortex plan rewriting after semantic and policy rules are proven.

## 2. Incremental computation

- **DBSP** — general incremental view maintenance over rich computations.  
  Paper: https://arxiv.org/abs/2203.16684
- **Materialize incremental views** — continuously maintained derived state.  
  Source: https://materialize.com/docs/overview/key-concepts/

Genesis use: one changed observation should invalidate only affected conclusions, contracts, simulations and interfaces.

## 3. Semantic provenance, rights and authenticity

- **W3C PROV-O** — entities, activities and agents in a shared provenance grammar.  
  https://www.w3.org/TR/prov-o/
- **W3C ODRL 2.2** — permissions, prohibitions, duties and constraints.  
  https://www.w3.org/TR/odrl-model/
- **W3C SHACL** — semantic shape and constraint validation.  
  https://www.w3.org/TR/shacl/
- **C2PA** — media provenance and transformation credentials.  
  https://c2pa.org/specifications/specifications/2.2/index.html

Genesis use: permitted purpose and provenance travel with observations, transformations, models, media and outputs.

## 4. Policy and formal verification

- **Open Policy Agent** — policy decisions separated from enforcement.  
  https://www.openpolicyagent.org/docs
- **Cedar** — fine-grained subject/action/resource/context authorization.  
  https://www.cedarpolicy.com/
- **Dafny** — specification-driven verified programming.  
  https://dafny.org/
- **Verification-aware IR research / AxDafny** — verifier-guided program generation.  
  https://arxiv.org/abs/2501.06283  
  https://arxiv.org/abs/2606.32007

Genesis use: selected trust-critical invariants become machine-checkable; this supplements rather than replaces tests and specification review.

## 5. Robust uncertainty and experiment selection

- **Conformal prediction** — prediction sets with coverage guarantees under declared assumptions.  
  https://arxiv.org/abs/2107.07511
- **Conformal risk control** — calibrates sets against a declared loss.  
  https://people.eecs.berkeley.edu/~angelopoulos/blog/posts/rcps/
- **Distributionally robust optimization / credal sets** — decisions across ambiguity sets rather than one forced probability law.
- **Bayesian optimal experimental design / expected information gain** — select the observation or intervention expected to resolve the most decision-relevant uncertainty.  
  https://arxiv.org/abs/1910.03962

Genesis use: No-Bet, Watch, wait and acquire-more-information become robust decision states rather than vague confidence labels.

## 6. Scientific discovery and interpretable dynamics

- **SINDy** — sparse discovery of governing dynamical equations.  
  https://arxiv.org/abs/1509.03580
- **PySR** — symbolic regression with complexity-aware equation search.  
  https://astroautomata.com/PySR/
- **Tigramite** — causal discovery and causal-effect analysis for time series.  
  https://jakobrunge.github.io/tigramite/
- **PM4Py** — process discovery, conformance and object-centric process mining.  
  https://processintelligence.solutions/pm4py
- **Topological data analysis / persistent homology** — shape and regime structure that survive ordinary coordinate changes.

Genesis use: convert residual patterns into falsifiable, inspectable scientific instruments instead of only larger black-box models.

## 7. Codebase intelligence

- **SCIP** — language-neutral code-intelligence indexing.  
  https://github.com/sourcegraph/scip
- **CodeQL** — semantic code queries over program structure and data flow.  
  https://codeql.github.com/
- **Tree-sitter** — incremental concrete syntax trees.  
  https://tree-sitter.github.io/tree-sitter/

Genesis use: the Codebase Twin maps ownership, dependencies, protected zones, duplicate systems, tests and stranded branch assets before agents edit.

## 8. Data value and model influence

- **Data Shapley** — estimates marginal contribution of training examples or datasets.
- **TracIn** — traces influential training examples through gradients and checkpoints.  
  https://arxiv.org/abs/2002.08484
- **Influence-function and data-attribution research** — candidate methods for source, sample, modality and correction value.

Genesis use: evidence volume is not mistaken for decision value; harmful and redundant data remain visible.

## 9. Model mechanisms and behavioral evaluation

- **Anthropic Scaling Monosemanticity** — sparse feature analysis at larger model scales.  
  https://transformer-circuits.pub/2024/scaling-monosemanticity/
- **Crosscoder/model-diffing research** — compare shared and differential representations across models.
- **Bloom behavioral evaluation framework** — generate targeted evaluations for model behaviors.  
  https://alignment.anthropic.com/2025/bloom-auto-evals/

Genesis use: explain model disagreement and generate fresh behavior-focused tests without presenting interpretability as perfect mind reading.

## 10. Capability isolation

- **WebAssembly Component Model and WASI** — typed, composable components with capability-oriented host access.  
  https://component-model.bytecodealliance.org/  
  https://wasi.dev/

Genesis use: external tools, generated code, Spaces and plugins execute without ambient filesystem, network, secret or database authority.

## 11. Local-first personal intelligence

- **Local-first software principles** — user ownership, offline operation and collaboration.  
  https://www.inkandswitch.com/local-first/
- **Automerge** — conflict-free replicated data for local-first applications.  
  https://automerge.org/

Genesis use: Decision Twin, journals, watchlists and selected media indexes can remain user-owned and functional offline.

## 12. Human performance and biomechanical twins

- **OpenSim** — musculoskeletal modeling and simulation.  
  https://opensim.stanford.edu/
- **OpenSim Moco** — optimal control of musculoskeletal simulations.
- **OpenSense** — inertial-sensor motion analysis.
- **OpenCap** — smartphone-video movement analysis.  
  https://www.opencap.ai/

Genesis use: a separately governed Human Performance Twin spanning movement, workload, coaching and rehabilitation-support research—not a consumer betting shortcut.

## 13. Complex sports systems

- **Temporal hypergraphs** — higher-order interactions changing through time.
- **Marked point processes / Hawkes processes** — event timing, excitation and cascades.
- **Optimal transport** — compare and align distributions, formations and spatial mass.

Genesis use: lineup chemistry, pressure cascades, possession transitions, narrative contagion and market-response topology.

## 14. Autonomous science and self-improving agents

- **AI Scientist** — automated experiment and paper-generation loops.  
  https://sakana.ai/ai-scientist-first-publication/
- **AlphaEvolve** — evolutionary search over algorithm proposals with automated evaluators.
- **Darwin Gödel Machine** — archived lineages of self-improving coding agents.  
  https://arxiv.org/abs/2505.22954
- **Qiushi / autonomous discovery research** — multi-agent scientific discovery and verification.

Genesis use: the Red Queen Laboratory evolves hypotheses, experiments, agents and evaluators in branches; production never self-mutates directly.

## 15. Truth maintenance and argumentation

- **Assumption-Based Truth Maintenance Systems** — conclusions linked to minimal support sets and contradictions.
- **Dung-style abstract argumentation** — formal support/attack relationships among arguments.
- **AGM belief revision** — principled updates when new information conflicts with prior beliefs.

Genesis use: the Signal Courtroom becomes a machine-readable argument graph with explicit assumptions, attacks, source-origin dependence and reversal conditions.

## 16. Open-endedness and strategic populations

- **MAP-Elites / Quality Diversity** — preserve high-performing diversity across behavioral niches.
- **POET** — co-evolve environments and solutions while retaining stepping stones.
- **PSRO / counterfactual regret methods** — maintain strategy populations and best responses.

Genesis use: Academy, Dynasty, agents, models and benchmarks continue growing without collapsing onto one static test or opponent population.

## 17. Program synthesis and counterexamples

- **Syntax-Guided Synthesis (SyGuS)** — synthesize programs within a constrained grammar.
- **Counterexample-Guided Inductive Synthesis (CEGIS)** — candidate generation followed by counterexample-driven refinement.

Genesis use: a discovered metric can arrive with an executable formula, constraints, counterexample history, tests and receipt semantics.

## 18. Sequential decisions and shadow-policy evaluation

- **Off-policy evaluation and confidence sequences** — evaluate policies from historical logs with uncertainty that remains valid under sequential monitoring.
- **Distributionally robust sequential optimization** — policies that remain useful under plausible shift.

Genesis use: the Metacortex selects policies—observe, wait, act, escalate or abstain—not only one-shot outputs.

## 19. Revocation and machine unlearning

- **NeurIPS Machine Unlearning Competition** — realistic evaluation of forgetting requests and model utility.  
  https://unlearning-challenge.github.io/
- **Certified and practical unlearning research** — exact, sharded, approximate and auditable removal strategies.

Genesis use: rights, consent and security changes propagate through a lineage graph without claiming stronger erasure than Galaxy can prove.

## 20. Adversarial ML and model supply-chain integrity

- **NIST adversarial machine-learning taxonomy** — poisoning, evasion, privacy and abuse threat classes.
- **OpenSSF model-signing work** — signed lineage across model artifacts and transformations.
- **SLSA / Sigstore / in-toto** — artifact provenance and supply-chain attestations.

Genesis use: the Capability Firewall becomes an adaptive immune system spanning discovery, conversion, training, quantization, deployment, quarantine and rollback.

## 21. Runtime verification

- **TeSSLa** — specification and monitoring over timed event streams.
- **Out-of-order runtime-monitoring research** — explicit uncertainty when event gaps prevent a definitive verdict.

Genesis use: temporal cutoff, publication order, settlement finality, entitlement and receipt-order rules can be observed during real execution, not only in CI.

## 22. Benchmark contamination

- Research on direct, indirect and rephrased benchmark contamination.
- Fresh hidden cases, one-time exams, canaries, post-freeze examples and counterfactual variants.

Genesis use: distinguish memorization from transfer and prevent agents from learning one repeated promotion test.

## 23. Source-use rules

1. A paper, library or standard is a candidate—not an architectural mandate.
2. Prefer primary papers, official specifications and official documentation.
3. Record exact versions, licenses, revisions and evaluation windows before adoption.
4. Distinguish author-reported results from Galaxy reproduction.
5. New dependencies require a measurable advantage over existing repository capability.
6. No source in this ledger authorizes production use, training rights, public claims or external actions by itself.
