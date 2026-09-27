# [1747] Optimal Blackjack Betting Strategies Through Dynamic Programming and Expected Utility Theory (arXiv:2505.00724)

## 1. Citation and full-text-read statement
**Citation:** Lucas Bordeu, Javier Castro (Blackjack Theorem SpA / Universidad de Chile) (2025). *Optimal Blackjack Betting Strategies Through Dynamic Programming and Expected Utility Theory*. arXiv:2505.00724. URL: https://arxiv.org/abs/2505.00724
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections including Theorems 1–2 and proofs, Tables 1–2; appendices skimmed).
**Verdict:** ADAPT — one sentence: the MDP/CRRA staking theorems (wealth-independent optimal bet fractions; linear-in-edge policy form) transfer directly to GSE's per-pick stake sizing, but the blackjack transition model must be replaced with a sports-bet outcome model and the discretization coarseness re-validated.

## 2. Research question
What is the optimal betting policy (stake as a function of state) in blackjack when the objective is maximizing expected utility of wealth over a session — for CRRA and CARA risk preferences — and how do optimized round-play and betting policies compare against basic strategy and Hi-Lo counting?

## 3. Method / model
Splits play into a round policy (hit/stand/double/split decisions, optimized by dynamic programming with vectorized algorithms) and a betting policy (stake fraction). Betting policy formulated as an MDP with state ψ = (deck composition d, wealth w, round number n), action b ∈ [0, 0.5] (bet as fraction of wealth), transition over deck compositions and round returns X_θ^d. Solved by dynamic programming on a discretized state space with simplified transitions. Two information regimes: Hi-Lo true-count state vs full deck composition. Risk profiles: CRRA u_1(w;α) and CARA. Partial policies estimated as linear functions of true count; complete policies as 200×10,001×100 lookup matrices (auxiliary mass × wealth × round) for β ∈ {0.15, 0.25, 0.35} × 2 round policies.

## 4. Mathematics / equations / assumptions
- CRRA utility: u_1(w;α) = w^α/α if α>0; ln(w) if α=0 (α=0 is log utility = Kelly).
- Theorem 1: optimal policy under CRRA is independent of wealth: π*_{θ,u_1,H}(d,w,n) = π*_{θ,u_1,H}(d,w',n) ∀w,w' — stake as a fraction of bankroll doesn't depend on bankroll size.
- Theorem 2: with infinite horizon (H→∞), optimal policy independent of rounds played n.
- Value recursion: V*(ψ_n=ψ) = w^α/α · U*(ψ) (α>0); ln(w) + U*(ψ) (α=0), with U*(ψ) = max_{b∈[0,0.5]} Σ_{x∈R} Σ_{d'} P(d_{n+1}=d', X_θ^d = x | d_n = d)·(1+b·x)^α·U*(ψ') (α>0), and ln(1+b·x) + U*(ψ') for α=0.
- Partial policy linear form: ω̃(c) ≈ m_j·c + k_j for true count c, per risk level α_j; Table 2: e.g., α=0.5 → m=0.0064326, k=−0.0095757, μ≈0, σ²=0.0000377; α=0.9 → m=0.0318662, k=−0.0468364; α=1 → m=0, k=0.5 (bet the max 50% regardless of count).
- Assumptions: single player vs dealer; round policy maximizes expected return of the individual round while betting policy maximizes expected utility of the session; discretized wealth/round state space; simplified deck-transition function; fixed rule configuration.

## 5. Dataset / schema
No external dataset. The "data" are computed: probability mass functions of per-round returns under basic strategy and the semi-optimal round policy (derived by DP over deck compositions), then Monte Carlo simulations of sessions producing histograms of final wealth. Game configuration: single player vs dealer, fixed rule set (penetration, splitting simplified).
## 6. Features and target
Features (MDP state): deck composition (or Hi-Lo true count), current wealth (discretized), round index. Target: none supervised — the objective is expected utility of terminal wealth; the output is the optimal bet-fraction policy π*(state).

## 7. Validation design
Simulation-based: session Monte Carlo under optimized vs baseline (basic strategy / Hi-Lo) policies; histograms of final returns; lognormal fits (μ, σ²) to wealth-over-time per α (Table 2). No train/test split (model-based, not learned from data).

## 8. Exact results and baselines with numbers
- Optimized round policy beats basic strategy only slightly ("highlighting the efficiency of the last one" — basic strategy is near-optimal).
- Betting on exact deck composition slightly outperforms Hi-Lo true-count betting.
- Partial-policy fits (Table 2, basic strategy): (α, m, k, μ, σ²): (0, 0.0032125, −0.0047781, 0.0000047, 0.0000094); (0.5, 0.0064326, −0.0095757, −0.0000000, 0.0000377); (0.9, 0.0318662, −0.0468364, −0.0003771, 0.0009485); (0.95, 0.0598706, −0.0817353, −0.0016756, 0.0039103); (1, 0, 0.5, −, −).
- Complete policies: six 200×10,001×100 matrices (β ∈ {0.15,0.25,0.35} × 2 round policies).
- Authors conjecture results are "close to the theoretical optimum under the assumed simplifications."

## 9. Code / data availability
None stated in the extracted text.

## 10. Leakage and limitations
Blackjack-specific transition model (deck composition dynamics) has no sports analogue — the transferable part is the utility/MDP scaffolding, not the numbers; heavy state discretization (200×10,001×100) is computationally brutal and its coarseness is unvalidated; single rule configuration only; no multi-player/deep-penetration; "Kelly" never appears by name (the α→0 log case is Kelly but the Kelly connection and its estimation-error fragility are undiscussed); simulation-only validation.

## 11. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, GSE has no utility-based staking layer and no MDP framing of the betting session. The wealth-independence theorem (Theorem 1) is the formal justification GSE needs for bankroll-fraction staking rules (stake % doesn't depend on bankroll size under CRRA) — currently GSE has no stated staking rule at all. The linear-in-edge policy form ω̃ ≈ m·c + k mirrors the Kelly linear-in-edge formula f* = edge/odds, giving a principled generalization: fit (m,k) per risk-aversion level α instead of fixing Kelly. Complements ledgers 1745 (β-family, mutually exclusive) and 1746 (diversification×leverage): this is the sequential-session, per-state staking policy.

## 12. Implementation specification
Build "GSE stake MDP": (a) state = (edge estimate e from engine, bankroll w, week n, remaining slate); action = stake fraction b ∈ [0, b_max]; (b) transition: pick outcome Bernoulli(engine p) → wealth update; (c) solve finite-horizon DP backward from season end under CRRA utility with α ∈ {0 (Kelly), 0.25, 0.5}; (d) distill the policy into the linear form b*(e) ≈ m·e + k per α (following the paper's partial-policy distillation); (e) deploy the linear rule per pick, with b_max cap. Effort: ~2 days (DP solver + distillation + backtest harness).

## 13. Reproducible test
Dataset: 2023–2025 NFL picks with engine win probabilities and odds. Solve the stake MDP per season on first-half data (or on simulated outcome distributions from engine p), distill linear rules, and backtest on second-half slates. Baselines: flat 1u, half-Kelly, 1745 β-family stakes. Metrics: terminal log growth, max drawdown, and the fitted (m,k) per α — check the DP-distilled slope against the analytic Kelly slope edge/odds.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the DP-distilled linear staking rule if it beats half-Kelly on terminal log growth with max drawdown ≤ half-Kelly's across the 2023–2025 second-half windows, and the distilled slope m is within 25% of the Kelly slope (sanity: the DP isn't exploiting discretization artifacts); REJECT otherwise. Improvement experiment: replace the point-estimate edge e with the engine's posterior over e (calibration-aware) and re-solve the DP on expected utility under that posterior — testing whether internalizing edge uncertainty flattens the policy (smaller m) the way the paper's α-dial does, which would give GSE a single calibration-driven staking rule instead of a hand-picked α.

**Verdict:** ADAPT — the CRRA/MDP staking theorems and linear-in-edge distillation are directly portable to GSE's per-pick stakes, but the blackjack transition model must be swapped for a sports-outcome model and the discretization validated.
