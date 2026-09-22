# [1202] A Path Guessing Game with Wagering (arXiv:0907.2196v1)

**Citation:** Pendergrass, M. (2009). *A Path Guessing Game with Wagering*. arXiv:0907.2196v1 [math.PR]. URL: https://arxiv.org/abs/0907.2196
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, complete through references).
**Verdict:** REJECT — adversarial graph-guessing game theory (generalization of the Lying Oracle Game) with elegant optimal-strategy results but no sports-prediction, calibration, or fixed-odds bet-sizing content applicable to GSE.

## 1. Research question
In a two-player zero-sum game where a Guesser predicts, edge-by-edge, the path a Chooser takes through a directed graph and wagers on each guess (payoff (n_i−1)·wager if correct at out-degree n_i ≥ 2, −wager if wrong), what are the optimal strategies for both players on fans, trees, terminating graphs, and strongly connected graphs — and what does this imply for the infinite-duration Lying Oracle Game? (Sec. 1)

## 2. Dataset / schema
None — pure game theory. Two worked examples: G_{n,1} (oracle lies ≤1 per block of n, infinite horizon) and the stoppable variant with explicit optimal probabilities.

## 3. Method / model
- Fan (Theorem 1): Chooser's optimal p(j) = v_j^{−1}/Σ_k v_k^{−1} (eq. 2); Guesser's one-parameter optimal family q(j|w) = (np(j)−1+w)/(nw), w = 1−nβp_min (eqs. 3–4); value E[F] = n/Σv_j^{−1} (harmonic mean H, eq. 5).
- Trees (Theorem 2): propagate values up via v_i = n_i^{−1}Σ_{i→j}v_j^{−1} (eq. 20); n_i=1 nodes get 2v_ℓ.
- Terminating graphs (Theorems 3–6): propagation matrix M (eq. 25); limiting reciprocal values u = lim M^s u_0 = (I−A)^{−1}Bu_t (Lemma 1, eq. 31); P = VMV^{−1} (eq. 37); stopping-time distributions q_t = V_nt A^{t−1}BV_t^{−1}1, terminal probs ρ = V_nt(I−A)^{−1}BV_t^{−1} (Theorem 4); optimality (Theorem 5); fairness ⟺ all terminal values 1 and all out-degrees ≥ 2 (Theorem 6).
- Strongly connected aperiodic graphs (Theorems 7–10): discount by maximal eigenvalue r of M (Lemma 2–3, Perron-Frobenius); P = r^{−1}VMV^{−1} (eq. 51); lim r^t E[F_t|X_0=i] = c·v_i (eq. 52); invariant measure μ = (x_iy_i)/(x^Ty) (eq. 57); fairness ⟺ every vertex out-degree ≥ 2 (Theorem 10).
- Lying Oracle: G_{n,1} solved — oracle tells truth with prob λ^{−1} where λ solves λ^n − λ^{n−1} − 1 = 0 (Example 1); stoppable variant with explicit stop probabilities p_{i,n+1} (Example 2).

## 4. Equations & assumptions
- Payoff rule (eq. 1): new fortune = current + (n_i−1)·wager (correct, n_i≥2); +wager (correct, n_i=1); −wager (incorrect).
- Chooser: p(j) = v_j^{−1}/Σv_k^{−1}; Guesser: q(j) = (p(j)−βp_min)/(1−nβp_min), w = 1−nβp_min, β∈[0,1] (minimum-risk β=1, maximum-risk β=0).
- Value propagation: u_{s} = M^s u_0; limiting u = (I−A)^{−1}Bu_t.
- Assumptions: both players know terminal values; Chooser's choice may depend on announced wager; Guesser maximizes expected fortune, Chooser minimizes; terminating graphs require every node to reach a terminal; strong-connectivity section requires aperiodicity.

## 5. Features / target
N/A — game theory. Inputs: directed graph, terminal values v_j. Target: optimal strategies (p, q, w), game value, Markov-chain dynamics.

## 6. Validation design
None — theorems with proofs; two closed-form worked examples.

## 7. Numerical results / baselines
No empirical numbers. Example 1: oracle lies with probability λ^{−n} (→ truth prob 1 as n→∞); optimal lie fraction μ_2 = 1/(λ^n+n−1) → 1/n. Example 2: p_{1,n+1} → 4/9 as n→∞. No baselines.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Zero-sum game vs an adversary who observes your wager — the opposite of GSE's setting (betting against fixed bookmaker odds with no adversarial response to stake size, ignoring limits).
- Results depend on the artificial odds-weighted payoff rule (payoff ∝ out-degree − 1); nothing maps to decimal-odds sports markets.
- No estimation, no data, no calibration — pure equilibrium analysis.

## 10. GSE overlap
None. GSE's sizing lane (ledgers 0171/0626/0813/1200) concerns Kelly growth-optimal staking against fixed odds under estimation uncertainty — a single-agent decision problem, not an adversarial game. The min-risk/max-risk β family is a curiosity with no mapping to bookmaker markets.

## 11. GSE implementation spec
None.

## 12. Reproducible test
N/A.

## 13. Acceptance / rejection gate
Reject — see verdict.

## 14. Improvement experiment
None warranted; the harmonic-mean value propagation is mathematically neat but answers a question GSE never asks.
