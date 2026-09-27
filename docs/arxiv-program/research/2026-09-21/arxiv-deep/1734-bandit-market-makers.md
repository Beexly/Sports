# [1734] Bandit Market Makers (arXiv:1112.0076)

**Citation:** Nicolás Della Penna, Mark D. Reid (2012; ANU/NICTA). *Bandit Market Makers*. arXiv:1112.0076. URL: https://arxiv.org/abs/1112.0076
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 8,829 words).
**Verdict:** ADAPT — the bandit-over-overround-cost-functions framework (EXP3 over overround LMSR arms 1.05–1.8; regret O(T^{(α+1)/(2α+1)} log^{α/(2α+1)} T); simulation: EXP3 captures 2/5 of max profit vs 2/3 for best fixed overround) gives GSE a formal model of how books learn the profit-maximizing margin by exploration, plus a reward axiomatization (R0–R2) for scoring margin policies; adapt as a model of bookmaker behavior for CLV/margin forecasting, not as a GSE-operated market maker.

## 1. Research question
How should a profit-driven market maker set its overround (the "price of liquidity" — the sum of quoted prices, i.e., 1 + margin) when trader demand at each overround level is unknown? The paper decomposes market making into two sub-problems: (i) price discovery with bounded loss (handled by cost-function AMMs), and (ii) finding the profit-maximizing overround — an explore/exploit tradeoff solved by treating overround levels as bandit arms, with the change in worst-case profit as the bandit reward. It asks for distribution-free regret guarantees relative to the best fixed overround in hindsight.

## 2. Dataset / schema
No real dataset. **Simulations:** discrete bandit market maker with overround-LMSR cost function and EXP3; b = 10 liquidity; unit trader budgets, one trader per period; overround arms 1.05–1.8 (doubling intervals); 400 periods; IID uniform-belief traders in [0,1]; binary outcomes; zero starting asset vector. A second "adapting to a shock" simulation shifts trader beliefs mid-run.

## 3. Method / model
- Cost-function AMM (overround LMSR: a·C₀ with a ∈ [1, A]) handles within-round pricing with bounded worst-case loss.
- Bandit layer: each round the maker commits to one overround cost function C^t ∈ C; the reward r_q(C; s) = min_p V_{q+s}(C,p) − min_p V_q(C,p) (worst-case-profit improvement) is fed to a bandit algorithm (EXP3 for finite arms; CAB — continuous adaptive bandits — for the continuous overround interval).
- Reward axioms: R0 zero-calibrated (r_q(C;0)=0), R1 path-independent (order of trades doesn't matter), R2 overround-compatible (on outcome-independent bundles, reward = k′·α exactly the overround).
- Theory: Lipschitz reward class over overround-scaled cost functions → CAB regret bound vs adaptive adversaries.
- Simulations compare the bandit maker against each fixed-overround comparator on the same trader sequence.

## 4. Equations & assumptions
- Cost function C: Q → ℝ₊; price of bundle s at position q: C(q+s) − C(q); instantaneous prices π(q) = ∇C(q).
- Overround LMSR: {a·C₀ : a ∈ [1, A]}, overround α with C(k·1) = k(1+α).
- Reward: r_q(C; s) = min_p V_{q+s}(C,p) − min_p V_q(C,p), V_q(C,p) = C(q) − ⟨q,p⟩.
- Lipschitz bound: |r_q(C;s) − r_q(C′;s′)| ≤ 2d_∞(C,C′) + (A·P·n + 1)‖s − s′‖.
- Regret (Theorem 4.1, via CAB): O(T^{(α+1)/(2α+1)} log^{α/(2α+1)} T) against adaptive adversaries for uniformly-locally-Lipschitz rewards.
- Assumptions: myopic (non-strategic) traders buying optimal bundles given beliefs/budget; fully adversarial reward sequences allowed; path-dependence handled by the adversarial bandit framing; finite or Lipschitz-continuous overround set.

## 5. Features / target
Features: current obligation vector q^t, candidate overround arm a ∈ [1.05, 1.8], trader arrival/belief distribution. Target: cumulative worst-case-profit reward; the policy target is the overround arm maximizing long-run profit (explore/exploit).

## 6. Validation design
Simulations only: (i) IID uniform beliefs, 400 traders — compare bandit maker vs each fixed-overround maker vs the theoretical max (fixed prices 0.75/0.75, overround 1.5, no price response); (ii) belief-shock adaptation. No real data, no statistical tests beyond the reported fractions.

## 7. Numerical results / baselines
- Max achievable profit (omniscient fixed 1.5 overround, infinite liquidity): 100.
- Best fixed-overround maker in the considered set: 2/3 of max (≈66.7).
- EXP3 bandit maker: 2/5 of max (≈40) — learns a profitable overround but pays substantial exploration cost vs the best fixed arm.
- Shock simulation: bandit maker adapts the overround after the belief shift (qualitative; exact numbers not quoted in extracted text).
- No predictive-accuracy metrics.

## 8. Code / data availability
None stated — no public code or data artifact identified.

## 9. Leakage & limitations
- Simulations use IID uniform beliefs — no informed traders, no adverse selection, no strategic behavior; the "traders" are demand curves, not agents.
- GSE is not a market maker: it publishes picks, it doesn't post two-sided odds. The framework applies to GSE only as a *model of the books it bets against/into*.
- The 2/5-vs-2/3 gap shows exploration is expensive; the regret bound's exponent depends on the Lipschitz constant α which is not estimated from data.
- Overround LMSR is a specific parametric family; real books use idiosyncratic shading, not LMSR curves.
- 2012 paper; predates modern CLOB prediction markets.

## 10. GSE overlap
Existing map: market microstructure lane tracks book behavior implicitly (steam, line moves) but has no formal model of *why* books set the margins they do (existing-research-map.md). GSE's devig work (docs/ops/2026-08-21-BUILD-SPECS-devig-parlay.md) inverts margins; this paper models margin-setting as the primal problem. The R0–R2 reward axioms also give GSE a principled way to score its own "margin policies" if it ever publishes fair-odds lines. New capability (book-behavior model), not duplicate.

## 11. GSE implementation spec
- **Book-margin forecaster:** treat each book's weekly overround (from The Odds API snapshots) as the observable arm; fit a bandit-style model where the book explores margin levels and exploits the profit-maximizing one. Use it to predict *when* a book will widen/tighten margin (e.g., before high-uncertainty games) — an input to GSE's line-shopping timing (bet now vs wait).
- **R0–R2 margin-policy scorer:** if GSE publishes its own fair odds, score candidate margin schedules with the paper's reward axioms (zero-calibrated, path-independent, overround-compatible) as a sanity filter.
- Effort: ~3–5 days for the descriptive bandit fit on historical book margins; the scorer is half a day.

## 12. Reproducible test
Dataset: The Odds API NFL moneyline overrounds per book, weekly, 2024 season. Metric: does a book's margin path look like bandit exploitation (margin converges after early-season exploration) vs random walk? Test: fit EXP3-style arm-selection to each book's margin history; compare one-step-ahead margin prediction vs a naive "last margin" baseline. Pass if the bandit model reduces MAE by ≥10% on the 2025 holdout.

## 13. Acceptance / rejection gate
ADAPT is confirmed if the bandit model of book margins predicts next-week per-book overround with ≥10% lower MAE than the naive baseline on the 2025 holdout (i.e., books' margin-setting is learnably exploitative, not noise). REJECT the book-behavior model if the gain is <5% — then book margins are better modeled as static + noise, and GSE should not spend effort predicting them.

## 14. Improvement experiment
Add a contextual bandit: condition the book's margin arm on game features (spread size, total, prime-time flag, injury uncertainty). Test whether context explains margin variation better than the paper's context-free bandit — expect prime-time/high-uncertainty games to carry systematically higher learned margins (recreational-flow exploitation). This turns the paper's abstract explore/exploit into a testable "which games do books tax most" map for GSE's line-shopping.

**Verdict:** ADAPT — the bandit-over-overround framework with its reward axioms gives GSE a formal model of bookmaker margin-setting behavior; adapt as a margin-forecasting and line-shopping-timing input.
