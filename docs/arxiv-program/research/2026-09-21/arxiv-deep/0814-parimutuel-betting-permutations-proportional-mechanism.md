# [0814] Parimutuel Betting on Permutations (arXiv:0804.2288)

**Citation:** Shipra Agrawal, Zizhuo Wang, Yinyu Ye (2008). *Parimutuel Betting on Permutations*. arXiv:0804.2288. URL: https://arxiv.org/abs/0804.2288
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache; LateXML conversion; read §§1–6 and appendix in full).
**Verdict:** REJECT — pure market-microstructure theory (parimutuel call-auction pricing over permutation outcome spaces) with no empirical results, no data, and no predictive modeling; its only GSE-relevant artifact is the max-entropy joint distribution over rankings from marginal prices, which GSE does not need since it prices from its own models, not from a betting exchange.

## 1. Research question
How can a parimutuel call-auction market let traders bet on the final ranking (permutation) of n candidates — an n! outcome space — with a tractable betting language that still aggregates beliefs about the full joint distribution? The paper proposes "Proportional Betting" (bet on any subset of the n² candidate–position pairs; payout ∝ number of pairs realized), shows the organizer's problem is a polynomial-size convex program yielding n² unique marginal prices, and reconstructs a joint distribution over all n! permutations from those marginals via maximum entropy.

## 2. Dataset / schema
No data whatsoever — pure theory/complexity paper. All results are theorems, reductions, and approximation guarantees. No empirical validation, no simulations, no market data. Illustrative examples only (horse race, election).

## 3. Method / model
Built on the Convex Parimutuel Call Auction Model (CPCAM, Peters et al.): organizer maximizes worst-case profit max_{x,s,r} π'x − r + μΣθ_i log(s_i) s.t. Σ_k a_ik x_k + s_i = r, 0≤x≤q, s≥0; parimutuel prices = dual variables; starting orders θ>0 make the dual strictly convex → unique prices (minimizes KL distance to prior θ).
Two mechanisms: (a) Fixed Reward Betting (payout $1 if ANY bid pair matches) — organizer's LP has exponential constraints; Theorem 3.1: NP-hard even with 2 non-zero entries per bidding matrix (reduction from MAX-2-SAT). (b) Proportional Betting (payout = Frobenius inner product A_k·M_σ, i.e., $1 per matching pair) — separation = max-weight bipartite matching → polynomial via ellipsoid; then reformulated as compact LP (4) with only n²+2m constraints using matching-polytope integrality and LP duality (r = min_{v,w} e'v+e'w s.t. v_i+w_j ≥ Σ_k(x_k A_k)_{ij}).
Pricing: with n² starting orders θ_ij>0, convex program (5)/(6) yields UNIQUE dual marginal-price matrix Q (doubly stochastic: Qe=e, Q'e=e) satisfying price-consistency (Def. 4.2) and parimutuel funding (Theorem 4.4).
Joint distribution: max-entropy over permutations s.t. Σ_σ p_σ M_σ = Q → parametric form p_σ = e^{Y·M_σ − 1} with only n² parameters Y (KKT of (8)); Y is also the MLE of exponential-family parameter η under f_η ∝ e^{η·M_σ}. Exact computation is #P-hard (Theorem 5.2, reduction from (0,1)-matrix permanent since Σ_σ e^{Y·M_σ} = perm(e^Y)); approximation via ellipsoid + Sinclair Jerrum-Vigoda FPTAS for the permanent: Theorem 5.9 gives (1−ε)Q ≤ Σ_σ p_σ M_σ ≤ Q and entropy within (1−ε) of optimal in poly(n, 1/ε, 1/q_min) time.

## 4. Equations & assumptions
CPCAM primal (1): max π'x − r + μΣθ_i log s_i s.t. Σ_k a_ik x_k + s_i = r; dual: min q'y − μΣθ_i log p_i s.t. Σp_i=1, Σ_i a_ik p_i + y_k ≥ π_k.
Proportional betting LP (3): max π'x − r s.t. r ≥ Σ_k(A_k·M_σ)x_k ∀σ∈S_n, 0≤x≤q. Compact form (4): max π'x − e'v − e'w s.t. v_i+w_j ≥ Σ_k(x_k A_k)_{ij}. With starting orders (5)/(6) and dual Q unique (Lemma 4.1).
Max-entropy (8): min Σ_σ p_σ log p_σ s.t. Σ_σ p_σ M_σ = Q → p_σ = e^{Y·M_σ−1}; dual (10): max_Y Q·Y − Σ_σ e^{Y·M_σ−1}. Approx dual (12)/(13) with bounds 0 ≥ OPT ≥ −n log n − 1, 0 ≥ Y_ij ≥ −n log n/q_min.
Assumptions (stated): divisible (fractional) orders; call-auction (all orders batched); risk-neutral organizer maximizing worst-case profit; starting orders θ_ij>0 (can be driven to 0 with unique limit, Lemma 4.3); p_σ>0 for the parametric form; q_min>0 (tiny Q_ij thresholded to 0 with δ-approximation).

## 5. Features / target
No features/targets — mechanism design. Inputs: traders' bidding matrices A_k (n×n 0/1), limit prices π_k, limit quantities q_k. Outputs: accepted quantities x_k, marginal price matrix Q, joint permutation distribution p_σ.

## 6. Validation design
None — no experiments, no simulations, no data. Validation is by proof: NP-hardness reduction (Theorem 3.1), polynomial-time pricing (Theorem 4.4), #P-hardness of exact max-entropy parameters (Theorem 5.2), and the FPTAS approximation guarantee (Theorem 5.9). No baselines, no metrics, no time splits.

## 7. Numerical results / baselines
No numerical results of any kind. The "results" are complexity-theoretic: fixed-reward matching NP-hard; proportional-betting organizer problem polynomial (O(n²+m) variables/constraints); marginal prices unique and parimutuel; max-entropy joint distribution has n²-parameter exponential-family form; (1±ε)-approximation in poly(n,1/ε,1/q_min). There is nothing to quote as a performance number — the paper makes no empirical claims.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Adversarial: zero empirical content — the mechanism is never tested on real or simulated betting data; price-consistency and parimutuel properties are proven, but information-aggregation quality (do the prices actually reflect beliefs?) is assumed from cited literature, not demonstrated.
- The call-auction setting has "delayed decision" (traders don't know acceptance until close) — the authors note SCPM (sequential extension) as future applicability but don't develop it.
- Max-entropy reconstruction assumes the marginals Q are sufficient statistics; any higher-order belief structure (e.g., "A beats B AND C beats D" correlations) is discarded by construction.
- The approximation's runtime depends on 1/q_min — near-zero marginal prices blow up the bound; the δ-thresholding fix introduces approximation error the paper doesn't quantify end-to-end.
- External validity to GSE: GSE is a pick publisher, not an exchange operator — it never runs a parimutuel market, collects bids, or needs to price permutation bets. The transfer surface is essentially nil.

## 10. GSE overlap
Existing-research map: prediction-market lane exists (Polymarket/Kalshi tooling, oracle3 Wang Transform + Kelly, TurbineFi backtests — map line 28), but nothing on market microstructure, parimutuel pricing, or permutation betting. No duplication — but also no demand: GSE consumes market prices (odds APIs) as inputs; it does not operate a market. The max-entropy-from-marginals machinery is the closest potentially reusable piece (see §14), but GSE's joint-outcome needs (correlated picks) are served by its own models, not by exchange prices.

## 11. GSE implementation spec
No build recommended. The only salvageable component — max-entropy joint distribution over rankings from marginal probabilities (p_σ ∝ e^{Y·M_σ}) — could in principle convert GSE's per-team ranking marginals (e.g., division-finish probabilities) into a joint distribution over full standings for futures pricing, but: (a) GSE's engine already produces joint outcomes via simulation; (b) implementing the ellipsoid+FPTAS-permanent machinery is weeks of work for a result Monte Carlo gives in minutes. If ever needed, the practical path is NOT this paper's algorithm — it's fitting the exponential-family form p_σ ∝ exp(Σ_ij Y_ij (M_σ)_ij) by simple gradient ascent on simulated marginals, which is a few hours' work. Effort if pursued: 2–4 weeks for the paper-faithful version; not justified.

## 12. Reproducible test
Not applicable as a predictive method. The only testable artifact: implement the proportional-betting convex program (5)/(6) on synthetic bid data and verify (a) Q is doubly stochastic, (b) price-consistency holds (accepted bids priced ≤ limit), (c) worst-case organizer profit ≥ 0. This tests the mechanism, not a GSE capability — it has no baseline to beat and no GSE metric attached. Numeric gate: N/A — REJECT stands regardless, since passing this test would not create GSE value.

## 13. Acceptance / rejection gate
REJECT. Numeric gate it failed: there is no predictive performance number to clear — the paper reports zero empirical results, and its domain (operating a parimutuel permutation-betting exchange) has no mapping to GSE's pick-publishing operation. It would be reconsidered only if GSE ever operates a market (e.g., a subscriber prediction contest with parimutuel payouts), at which point Theorem 4.4's polynomial pricing becomes the design reference.

## 14. Improvement experiment
If the market-operation premise ever materializes: extend proportional betting to the sequential SCPM setting with the max-entropy joint distribution updated online as bids arrive, and test information aggregation on real Polymarket/Kalshi order-book data — do the n² marginal prices predict outcomes better than the raw last-trade prices? That would be the empirical paper this one isn't. For GSE's actual roadmap, the relevant "ranking distribution" problem (division/conference finish probabilities for futures) is better attacked with the engine's existing Monte Carlo simulation, not this machinery.
