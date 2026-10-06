# [1132] Chain-Reaction Causal Discovery via Blocking Interventions (arXiv:2603.22620)

**Citation:** Authors (2026). *Chain-Reaction Causal Discovery*. arXiv:2603.22620v2. URL: https://arxiv.org/abs/2603.22620
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the blocking-intervention trick (do(Xᵢ=0) reveals all descendants at once) is a sharp, cheap protocol for mapping dependency structure in controlled systems, directly reusable for GSE's engine sandbox: controlled feature perturbations that reveal downstream dependency chains in the prediction pipeline.

## 1. Research question
In a system of binary variables connected by a directed tree with monotone activation, can the full causal graph be recovered with far fewer interventions than one-per-edge? The paper shows a single blocking intervention do(Xᵢ=0) zeroes out exactly the descendants of i, so ~1–2 interventions per node suffice.

## 2. Dataset / schema
- Synthetic chain-reaction environments in Pymunk (2D physics): 6 environments, N = 4–24 objects/nodes, 100 random seeds.
- Variables: binary activation states; interventions: blocking (do(Xᵢ=0)) vs observational rollouts. Noiseless labels.
- Code: https://github.com/panispani/chain-reaction-causal-discovery (stated).

## 3. Method / model
- Assume: directed tree (each node has exactly one direct parent), monotone binary activation (activation propagates deterministically down the tree), noiseless observations.
- Intervention protocol: for each node i, apply blocking intervention do(Xᵢ=0) nᵢ times; estimate pᵢⱼ = P(Xⱼ=1 | do(Xᵢ=0)). Decision rule: Â(i,j)=1 (j is a descendant of i) iff p̂ᵢⱼ = 0 — under the assumptions, pᵢⱼ = 0 exactly when j is a descendant of i.
- Assemble the descendant relation into the full tree. Only 1–2 interventions per object required.

## 4. Equations & assumptions
- Blocking semantics: under do(Xᵢ=0), Xⱼ = 0 for all descendants j of i (monotone propagation), so pᵢⱼ := P(Xⱼ=1 | do(Xᵢ=0)) = 0 ⟺ j ∈ descendants(i).
- False-positive bound: Pr(Â(i,j)=1) ≤ exp(−q_min · nᵢ), where q_min is the minimum activation probability margin.
- Full-matrix recovery guarantee: ≥ 1 − N(N−1)·exp(−q_min · n_min).
- Assumptions (all strong): directed tree (single parent per node), monotone binary activation, noiseless labels, interventions are perfectly blocking.

## 5. Features / target
Inputs: node activation states under observational and interventional regimes. Target: the directed tree adjacency (ancestor/descendant relation for all pairs).

## 6. Validation design
- 6 Pymunk environments, N=4–24, 100 seeds; exact-recovery rate of the full tree.
- Baselines: observational causal discovery methods (best observational F1 0.686–0.825).
- Metric: exact graph recovery rate; F1 of recovered edges.

## 7. Numerical results / baselines
- Exact recovery ≥95% across environments (100 seeds each).
- Only 1–2 interventions per object required.
- At maximal displacement, the method's F1 = 0.963–0.999 vs best observational baseline F1 = 0.686–0.825.
- These are exact paper claims on synthetic physics environments.

## 8. Code / data availability
Code: https://github.com/panispani/chain-reaction-causal-discovery (stated). Data: synthetic Pymunk environments (regenerable).

## 9. Leakage & limitations
- The assumptions are extremely strong: real systems are rarely trees (single parent), monotone, binary, and noiseless. NFL/engine systems violate all four.
- Noiseless labels are doing heavy lifting — the p̂ᵢⱼ = 0 decision rule has no tolerance for measurement error; the exponential bound assumes clean Bernoulli trials.
- Pymunk physics is a friendly testbed (deterministic, fully observed); no real-world validation.
- "Intervention" in GSE's engine is a code/config change, not a physical block — the analogy needs care (see §11).

## 10. GSE overlap
New capability. The existing-research map has causal-inference topics (ML brief area 10, FineCausal, CEPT) but nothing on intervention-based dependency mapping of the engine itself. GSE's engine is a pipeline (data → features → model → calibration → sizing); nobody has mapped which upstream changes propagate to which downstream outputs. This paper's protocol is the cheapest known way to do that in a controlled sandbox.

## 11. GSE implementation spec
- Build an engine sandbox: run the GSE pipeline on frozen historical slates with one feature/source "blocked" (zeroed or set to missing) at a time — the do(Xᵢ=0) analogue — and record which downstream outputs change (picks, edges, Kelly sizes).
- Assemble the empirical dependency DAG of the engine: which features actually move the outputs vs which are decorative. Cost: one sandbox run per feature family (~30 runs), each a batch job.
- Use the DAG for (a) incident triage (a broken upstream source → exactly which outputs to distrust), (b) feature pruning (features with no downstream effect are dead weight), (c) the 1128 MATS hypothesis list (test LLM-proposed orders against the interventional DAG).
- Effort: 2–4 days for the sandbox harness + DAG assembler.

## 12. Reproducible test
Dataset: frozen 2025 NFL slates, GSE pipeline in sandbox. Metric: for 5 known engine dependencies (e.g., weather feed → total edge; injury report → player props availability), the blocking protocol must recover the correct downstream-affected set with zero false negatives before the DAG is used for triage. Baseline: the current (undocumented) mental model of dependencies.

## 13. Acceptance / rejection gate
ADOPT the sandbox protocol if: it recovers all 5 known dependencies with no false negatives AND identifies ≥3 features with zero downstream effect (pruning candidates). REJECT the tree assumption for the engine — expect and allow multi-parent DAG structure; use the descendant-recovery idea, not the exact tree algorithm.

## 14. Improvement experiment
Noisy blocking: extend the protocol to stochastic interventions (feature dropout at 50% rather than full blocking) and estimate graded descendant influence via the paper's exponential-bound machinery. Hypothesis: graded influence ranks features by downstream leverage, turning the binary DAG into a weighted dependency map that directly prioritizes monitoring alerts.
