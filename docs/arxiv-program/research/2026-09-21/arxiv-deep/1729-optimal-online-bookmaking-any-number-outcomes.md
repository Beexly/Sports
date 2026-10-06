# [1729] Optimal Online Bookmaking for Any Number of Outcomes (arXiv:2506.16253)

**Citation:** Hadar Tal, Oron Sabag (2025). *Optimal Online Bookmaking for Any Number of Outcomes*. arXiv:2506.16253. URL: https://arxiv.org/abs/2506.16253
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 34,408 words).
**Verdict:** ADAPT — the optimal worst-case bookmaking-loss characterization via the largest root of an explicit polynomial family gives GSE a computable, adversarial stress-test for dynamic vig/exposure policies; it is a bookmaker-side theory (not a probability forecaster), so adapt it as a margin-setting and worst-case loss diagnostic.

## 1. Research question
What is the minimum worst-case loss a bookmaker can guarantee when posting odds repeatedly over T rounds on K mutually exclusive outcomes, against an adversarially chosen sequence of bets and realized outcomes? The paper treats bookmaking as a repeated zero-sum online game: each round the bookmaker posts odds (equivalently, an overround), bettors place bets, and the true outcome is revealed. It asks (i) what the exact minimax value of this game is for general K; (ii) how it scales in T and K; and (iii) whether an efficient (polynomial-time) strategy achieves it.

## 2. Dataset / schema
No empirical dataset — a pure theory paper. All claims are analytic minimax results for the repeated bookmaking game; no market data, no backtest, no train/test split. The "experiments" are closed-form evaluations of the characterizing polynomial and its roots for small (T, K).

## 3. Method / model
Model: T rounds, K outcomes; each round the bookmaker posts odds γ_t(k) and accepts bets; the adversary chooses both the bet distribution across rounds and the realized outcome sequence. Bookmaker loss is the payout on the realized outcome minus collected stakes. Method: reduction of the game to a single-agent optimization via a "sensing-constrained" minimax argument; the minimax value is shown to equal T plus the largest root of a family of polynomials P_{T,K}(x), where P_{T,K}(x) = Σ_{m=0}^{K} C(K,m) (−T)^{\overline{K−m}} x^m and the overline denotes the rising factorial. The optimal strategy is opportunistic: it recomputes the largest root after every suboptimal or non-decisive bet, and otherwise posts the static optimal odds. The paper gives an efficient (polynomial in T, K) algorithm for the strategy.

## 4. Equations & assumptions
- Overround: Γ_t = Σ_k 1/γ_t(k) (sum of implied probabilities); normalized offered probability r_t(k) = 1/(Γ_t γ_t(k)).
- Characterizing polynomial: P_{T,K}(x) = Σ_{m=0}^{K} binom(K,m) (−T)^{\overline{K−m}} x^m, where (−T)^{\overline{j}} = (−T)(−T+1)...(−T+j−1) is the rising factorial.
- Optimal worst-case loss: L*_T,K = T + (largest root of P_{T,K}).
- Binary case (K=2): L*_{T,2} = T + √T. Regret relative to an oracle that knows the outcome in advance is exactly √T.
- Three-outcome case (K=3): L*_{T,3} = T + 2√T cos[(1/3) arccos(T^{−1/2})].
- Asymptotics: regret R_{T,K} = L*_T,K − T scales as √T; the K-dependent limiting factor is the largest root of the K-th Hermite polynomial, asymptotically 2√K + o(√K).
- The largest root of P_{T,K} can be computed to precision ε in O(K log(1/ε)) time.
- Assumptions: adversarial (worst-case) bettor sequence and outcome sequence; bookmaker posts odds before seeing bets each round; zero-sum transfer between bookmaker and bettors; no fees, no limits, no correlated outcomes across rounds; the adversary is non-adaptive to randomness only in the randomized-strategy upper bound construction.

## 5. Features / target
Features: round index t, remaining horizon T−t, number of outcomes K, current odds/overround vector. Target: the minimax guaranteed loss L*_T,K and the optimal odds-setting rule (the "arm" is the overround/odds vector posted each round). This is a game-theoretic control target, not a statistical prediction target.

## 6. Validation design
No empirical validation. The "validation" is mathematical: lower bounds (adversarial bettor strategies achieving the bound) matched with upper bounds (explicit bookmaker strategies achieving the bound). Numerical sanity checks of closed forms for K=2, 3 and root computations for larger K.

## 7. Numerical results / baselines
- L*_{T,2} = T + √T exactly (binary bookmaking regret √T).
- L*_{T,3} = T + 2√T cos[(1/3) arccos(1/√T)] exactly.
- Regret scaling: Θ(√T) in T with Hermite-polynomial constant in K (→ 2√K asymptotically).
- Computation: largest root to precision ε in O(K log(1/ε)).
- Baseline comparison: static (non-adaptive) odds posting is strictly suboptimal vs the opportunistic recompute-after-decisive-bet strategy; the paper quantifies the gap via the polynomial roots.
- No predictive accuracy numbers (no data).

## 8. Code / data availability
None stated — no public code or data artifact identified in the paper.

## 9. Leakage & limitations
- Pure theory: no contact with real betting data; adversarial sequence may be far more pessimistic than real bettor flow (real bettors are not perfectly adversarial, and outcomes have fixed unknown probabilities rather than adversarial sequences).
- Zero-sum framing ignores the bookmaker's revenue model (fees, limits, account restriction) and ignores that real books compete across books (this paper is single-book).
- No in-game dynamics: one-shot outcome per round, no odds movement within a round.
- NFL transfer: K is small for moneylines (K=2) and totals/spreads reduce to binary-vs-line, so the K=2 closed form T + √T is the directly usable one; the Hermite scaling in K matters only for multi-way props.

## 10. GSE overlap
Existing map: market microstructure lane already tracks CLV, de-vigged consensus, beat-the-close, steam (existing-research-map.md). GSE does not currently have a formal model of worst-case exposure or of how large an overround is "enough" to guarantee bounded loss against adversarial flow. Repo has devig/parlay build specs (docs/ops/2026-08-21-BUILD-SPECS-devig-parlay.md) and CLV slices (docs/ops/calibration/2026-08-19-l9-clv-slices) — this paper's overround machinery (Γ, r_t(k)) is the same object GSE's devig work manipulates, but the paper answers the inverse question: what margin guarantees bounded worst-case loss. Extension, not duplicate.

## 11. GSE implementation spec
- Build an "adversarial exposure" module: inputs = GSE's posted fair probabilities per market (2- and 3-outcome), planned holdout/limit schedule across T "rounds" (e.g., days before kickoff); compute the K=2 bound T + √T and K=3 bound in closed form to get a worst-case-loss envelope for a given vig path.
- Use the bound as a diagnostic: for GSE's published picks, compare realized CLV/pick-PnL against the minimax envelope — persistent losses inside the envelope are "explained" by adversarial flow; losses breaching it signal model misspecification rather than bad luck.
- Effort: ~2-3 days (closed forms are trivial to implement; the work is wiring GSE probability streams into the T-round framing and building the envelope dashboard).

## 12. Reproducible test
Dataset: GSE's historical posted probabilities for NFL moneylines (K=2) across the 2025 season (or current season-to-date), bucketed into T=20 pre-kickoff price snapshots per game. Metric: cumulative realized loss of a hypothetical bookmaker posting GSE's probabilities with a fixed overround vs the T + √T minimax envelope. Baseline: compare against the envelope computed with GSE's actual average overround. Pass if observed losses stay within 1.1× the envelope (i.e., GSE's margin covers adversarial flow at its current vig).

## 13. Acceptance / rejection gate
ADAPT is confirmed if the closed-form envelopes compute cleanly on GSE data and the diagnostic separates "within-adversarial-envelope" losses from "model-error" losses on at least 80% of game-weeks (i.e., the bound is informative, not vacuous). REJECT the module if the envelope is so loose (e.g., >3× realized loss in all windows) that it never binds — then the adversarial model is too pessimistic to be a useful diagnostic for GSE's real bettor flow.

## 14. Improvement experiment
Replace the worst-case adversary with a calibrated bettor-flow model fit from GSE's observed line-movement data (e.g., The Odds API line history): solve the "Bayesian bookmaking" game where the adversary draws bets from the fitted flow distribution. Compare the resulting Bayesian loss envelope to the paper's worst-case envelope — expect a 30–60% tighter bound, which would give GSE a usable per-market dynamic-vig rule (shrink margin when flow is benign, widen when flow looks adversarial) rather than a pure stress test.

**Verdict:** ADAPT — the optimal worst-case bookmaking-loss characterization via the largest root of an explicit polynomial family gives GSE a computable, adversarial stress-test for dynamic vig/exposure policies; adapt as a margin-setting diagnostic, not a forecaster.
