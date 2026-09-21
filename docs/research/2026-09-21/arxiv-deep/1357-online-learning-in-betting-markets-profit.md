# [1357] Online Learning in Betting Markets: Profit versus Prediction (arXiv:2406.04062v1)

**Citation:** Zhu, H., Soen, A., Cheung, Y. K., & Xie, L. (2024). *Online Learning in Betting Markets: Profit versus Prediction*. arXiv:2406.04062v1 [cs.GT]. URL: https://arxiv.org/abs/2406.04062
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 32 pages incl. appendices, complete).
**Verdict:** ADAPT — the binary-market model with Kelly bettors yields two directly reusable results for GSE: (1) the closed-form fair-odds price a⋆ = √(g·E[p_t])/(√(g·E[p_t]) + √((1−g)(1−E[p_t]))) plus an FTL algorithm with O(√(T log T)) high-probability regret, which models how prediction-market prices converge and gives GSE a benchmark for its own probability estimates; (2) the "heavier tails in bettor beliefs → higher bookmaker profit" theorem, which tells GSE exactly when books will shade lines against informed flow — but the paper's bookmaker-side framing must be inverted since GSE is the bettor/information platform, not the house.

## 1. Research question
In a binary betting market with Kelly bettors arriving sequentially, how should a bookmaker set prices (a, b) online — updating after each bet with almost no knowledge of the bettor-belief distribution — and what is the fundamental tension between maximizing bookmaker profit (unfair odds) versus eliciting information (fair odds, as in prediction markets)? The paper proves that profit-maximization and information-elicitation are fundamentally incompatible, and gives online pricing algorithms with regret guarantees for both regimes. (Secs. 1–2)

## 2. Dataset / schema
No real-world data — theory plus simulations. Simulations (Sec. 6): 10^5 = 100,000 Kelly bettors with mixture beliefs p_t = sigmoid(s_t), s_t ∼ 0.25·N(2,1) + 0.75·N(−1,1) (bimodal, one mode each side of bookmaker belief g = 0.5, asymmetric); learning rate η_{t+1} = 300/(t+5000); four price initializations ((0.9,0.9), (0.6,0.6), (0.9,0.6), (0.6,0.9)); baseline = risk-balancing heuristic (Levitt 2004: equalize dollars wagered per outcome, Appendix F.I). Code/data to reproduce: https://github.com/haiqingzhu543/Betting-Market-Simulation-2024.

## 3. Method / model
- **Bettors:** Kelly bettors (Kelly 1956) arriving one per round with belief p_t; bet amount v_t maximizes Kelly utility given prices (a, b); p̄_t is an unbiased estimator of E[p_t] (eq. 2).
- **Bookmaker** holds belief g about the event; sets prices (a, b) with a+b ≥ 1 (unfair) or a+b = 1 (fair); profit function u_t(a, b) (eq. 3); key quantity Υ^R(x) = x + G(x) − E[p_t | p_t ≥ x] whose roots are the critical points.
- **Algorithm 1 (unfair odds, Sec. 4):** stochastic approximation a_{t+1} = a_t + η_t(p̄_t − a_t − G(a_t)) (similarly b_t); shown to stay in [g, 1]; converges to a local maximizer of profit w.p. 1 (Thm. 4.3) — local minimizers avoided via Pemantle (1990, Thm. K.5), boundary points {0,1} avoided via Renlund (2010, Thm. K.6) with Lemma K.7/K.8 verification.
- **Algorithm 2 (fair odds, Sec. 5):** Follow-the-Leader-type (after Frongillo et al. 2012); fair-odds profit u(a, 1−a) is concave in a with closed-form maximizer a⋆ = √(g·E[p_t]) / (√(g·E[p_t]) + √((1−g)(1−E[p_t]))) (eq. 27); empirical mean p̄_T plugged in, with clipping to (τ, 1−τ).
- **Regret analysis:** descent lemma (L.2), Chung (1954) recurrence lemma (L.3), noise-control via Mertikopoulos et al. (2020) machinery (Appendix M), Azuma–Hoeffding for the fair-odds martingale (Appendix N).

## 4. Equations & assumptions
- SA update: a_{t+1} = a_t + η_t(p̄_t − a_t − G(a_t)) (Alg. 1); h(a) = a + G(a) − E[p_t | p_t ≥ a].
- **Thm. 4.4 (unfair):** E[u_T(a_T,b_T)] ≥ u_t(a♯,b♯) − 7L_u·T^{−1/2}, where (a♯,b♯) is the worst local maximizer — O(√T) regret vs the worst local max.
- **Thm. 5.1 (fair):** u_t(a_T,b_T) ≥ u_t(a⋆,b⋆) − L·T^{−1/2}·√log(1/δ) with probability ≥ 1−δ; **Cor. 5.2:** REGRET(T, a⋆, b⋆) = O(√(T log T)).
- Closed form: a⋆ = √(g·E[p_t]) / (√(g·E[p_t]) + √((1−g)(1−E[p_t]))) (27).
- Core economic insight: bookmaker profit hinges on the deviation between bettor-belief distribution and true beliefs; heavier tails in the bettor belief distribution ⇒ higher profit (abstract, Sec. 2.2).
- Assumptions: bettors are exact Kelly optimizers with independent beliefs; one bettor per round; bookmaker knows its own belief g; fair-odds analysis needs g, E[p_t] ∈ (τ, 1−τ) and bounded importance weights w_t; Thm. 4.3 needs Υ^R to have finitely many roots and no saddle points.

## 5. Features / target
Not an ML paper. "Inputs": the stream of bettor beliefs/actions (p̄_t) and the bookmaker's belief g; "output": the price sequence (a_t, b_t) and its regret against the optimal fixed prices.

## 6. Validation design
Simulations only (Sec. 6): 100,000 sequential Kelly bettors from the stated bimodal belief mixture; four initializations; regret vs the hindsight-optimal price per Definition 4.6; risk-balancing (Levitt 2004) as the industry-heuristic baseline; contour plots of the profit gap δ(a,b) = u_{1:T}(a⋆,b⋆) − u_{1:T}(a,b). No real sportsbook data, no out-of-sample test in the statistical sense.

## 7. Numerical results / baselines
- Algorithm 1: under all four initializations, regret stays ≤ 10² over 10^5 iterations; risk-balancing regret is larger by more than an order of magnitude and keeps increasing (Fig. 2 middle, log-scale y-axis).
- All SA price trajectories converge to the global maximizer when it is unique; for t ≥ 10⁴ trajectories stay within the innermost profit contour (Fig. 2 right) — verifying Thms. 4.3/4.5 empirically.
- FTL (Algorithm 2) converges to a point between the bookmaker's belief g = 0.5 and the crowd's average belief; LMSR price dynamics approximately converge to the crowd's average belief — "the bookmaker exploits the bias of bettors to maximise the profit."
- Authors note: with multiple modes on each side of g, Algorithm 1 can get stuck at local maximizers (the Thm. 4.4 "worst local maximizer" guarantee bites).

## 8. Code / data availability
Code and data to reproduce results: https://github.com/haiqingzhu543/Betting-Market-Simulation-2024. No real market data used.

## 9. Leakage & limitations
- Bettors are modeled as exact Kelly optimizers — real bettors are noisier, stake-constrained, and heterogeneous in skill; the profit theorems may overstate bookmaker power against real flow.
- One-bettor-per-round sequential model ignores simultaneous correlated flow (steam moves, syndicate action) that dominates real line movement.
- The "heavier tails ⇒ higher profit" result is distributional and qualitative; no mapping to observable order-flow statistics a bettor-side platform could measure.
- Simulations use a single synthetic belief mixture; no sensitivity analysis over tail thickness is reported numerically despite it being the headline insight.
- GSE is not a bookmaker: the algorithms optimize the house's profit, which is the opposite side of GSE's objective — direct deployment would mean building a sportsbook, not a prediction product.

## 10. GSE overlap
Garrett's corpus has market-microstructure and CLV work but nothing modeling the bookmaker's online pricing problem against Kelly flow — the bookmaker's-eye view is new. It complements GSE's bettor-side edge work: where GSE's engine asks "what is the true probability?", this paper asks "how will the book shade its price given the flow it sees?" — the two together bracket the line-movement game. The fair-odds FTL analysis also connects to prediction-market price formation, adjacent to GSE's interest in market-implied probabilities (existing-research-map.md: market microstructure/CLV entries, no bookmaker-pricing entries).

## 11. GSE implementation spec
- **Defensive (primary):** build a "book-shading monitor": given GSE's own released picks flow as a proxy for informed-bettor beliefs, use the paper's profit-decomposition (profit ∝ deviation between bettor beliefs and truth, amplified by tail heaviness) to predict when books will move lines against GSE-style positions — i.e., time GSE's releases/picks to precede anticipated shading, or flag markets where the book's margin already prices in the informed flow (no edge left).
- **Benchmark:** implement the fair-odds FTL price a⋆ (eq. 27) as a "market-consensus" baseline: compare GSE's model probabilities against the FTL-implied consensus from a simulated crowd; persistent deviations indicate either GSE edge or model bias.
- **Simulation lab:** reuse the authors' repo to simulate how a book would price against a population of GSE-like Kelly bettors; stress-test GSE's staking plan against adversarial pricing dynamics.
- Effort: 1–2 weeks to replicate the simulation harness; the shading monitor needs GSE's pick-release timestamps joined to line-movement data (already in the odds pipeline per the engine-benchmark lane).

## 12. Reproducible test
Dataset: GSE's historical pick releases with timestamps + Pinnacle/opening/closing lines for the same games. Test the paper's qualitative prediction: markets where pre-release line movement shows heavy-tailed flow imbalance should exhibit larger bookmaker margins (wider effective vig / more shading) than balanced-flow markets. Metric: correlation between flow-imbalance tail statistics and closing-line value captured by the house; gate on a statistically significant positive relationship.

## 13. Acceptance / rejection gate
ADAPT the shading-monitor if, on one full NFL season, games flagged "book already shaded against informed flow" show GSE's realized CLV ≥2 points worse than unflagged games (i.e., the flag correctly identifies dead-edge spots); otherwise REJECT the defensive application and keep only the FTL-consensus benchmark.

## 14. Improvement experiment
Invert the model: instead of the bookmaker learning prices from bettor flow, have GSE learn the *bookmaker's belief g* from the observed price path (inverse SA) — estimate g per market from opening→closing line movement, then compare implied g against GSE's model probability; systematic gaps between book-implied g and GSE probabilities, conditioned on the paper's tail-heaviness profit theory, become a direct edge-detection signal.
