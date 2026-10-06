# [1369] Kelly Criterion revisited: optimal bets (arXiv:physics/0607166v1)

**Citation:** Piotrowski, E. W., & Schroeder, M. (2006). *Kelly Criterion revisited: optimal bets*. arXiv:physics/0607166v1 [physics.soc-ph]. URL: https://arxiv.org/abs/physics/0607166
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 9 pages incl. Appendix with Mathematica code and references, complete).
**Verdict:** ADAPT — the parimutuel Kelly optimum (eq. 6) with its entropy decomposition of max profit (eq. 7: profit = "unpopularity profit" − Shannon entropy) gives GSE a principled faded-public-side sizing rule; the projective-geometry framing and the "no-go" hypothesis for big investors are speculative and excluded from the adapt.

## 1. Research question
Can the Kelly criterion be re-derived for parimutuel ("fair odds") bookmaker bets — where odds are set by sharing the pool among all wagers — and what does the resulting optimum reveal about the financial meaning of entropy and the limits of large-investor strategies? (Secs. 1–2, 6)

## 2. Dataset / schema
No empirical data — analytical. Set-up: binary bookmaker bet; gambler m stakes in_k on event k; pool totals IN_k = Σ_m in_k^m (eq. 1); parimutuel fair-odds condition out_k^m = α_k·in_k^m with α_k = (IN_1 + IN_2)/IN_k (eqs. 2–4); all fees/taxes ignored (full pool paid out).

## 3. Method / model
- Profit via projective geometry: profit z_k = ln|[n,u,w,m]| = ln(all_k) − ln(all_0), the cross ratio of projective points (Sec. 3).
- Expected log-profit E(z_k)(l_1,l_2) = p_1·ln(1 + (IN_2/IN_1)·l_1 − l_2) + p_2·ln(1 + (IN_1/IN_2)·l_2 − l_1) (eq. 5), where l_k = in_k/all_0 is the fraction of capital staked.
- First-order maximization over (l_1, l_2) with and without the no-short constraint (l_k ≥ 0).
- Big-gambler extension: pool grows by factor (1+δ); first-order correction to expected profit (eq. 8); optimality conditions reduce to degree-5 polynomials (eq. 9, Appendix).

## 4. Equations & assumptions
- **Kelly optimum (unconstrained):** (l̄_1 − p_1)·IN_2 = (l̄_2 − p_2)·IN_1 (eq. 6) — a line of optimal strategies in (l_1, l_2) space.
- **Max profit / entropy decomposition:** E(z_k)(l̄_1,l̄_2) = −Σ_{k=1,2} p_k·ln((IN_1+IN_2)/IN_k) − S (eq. 7), where S = −Σ_k p_k·ln p_k is the Boltzmann/Shannon entropy. Max profit = "unpopularity profit" (the seer's profit from betting against the crowd) minus entropy. Nonnegative — a rational gambler cannot lose on average; profit is zero iff p_1·IN_2 = p_2·IN_1 (crowd matches true probabilities).
- **No-short optimum:** (l_1* = p_1 − (IN_1/IN_2)·p_2, l_2* = 0) when p_1·IN_2 > p_2·IN_1 (or index-swapped); under Laplace indifference (IN_1 = IN_2) this reduces to (l_1* = p_1 − p_2, l_2* = 0) — the classic Kelly result.
- **Big-gambler correction:** ∂E_δ(z)/∂δ|_{δ=0} given by eq. 8; optimality ⇒ roots of two degree-5 polynomials (eq. 9) — no closed form (Galois), only numerical solutions; authors' "no-go" hypothesis: big investors' optimal strategies are analytically inaccessible in principle.
- Assumptions: parimutuel pool (not fixed-odds sportsbook); no fees/taxes; no short positions in the constrained version; probabilities p_k known.

## 5. Features / target
N/A (analytical). Inputs: true probabilities (p_1, p_2), pool distribution (IN_1, IN_2). Targets: optimal stake fractions (l_1*, l_2*), max expected log-profit.

## 6. Validation design
No train/test — proof-based. Appendix gives Mathematica 5.2 code generating the degree-5 polynomials for the big-gambler case; no empirical or simulated validation.

## 7. Numerical results / baselines
- No numerical results beyond the symbolic Appendix output; no baselines vs other strategies.

## 8. Code / data availability
Mathematica 5.2 code in the Appendix (symbolic generation of the degree-5 optimality polynomials); no data.

## 9. Leakage & limitations
- **Parimutuel ≠ sportsbook:** US sportsbooks are fixed-odds with vig, not pool-sharing; the fair-odds condition (eq. 2) is an idealization — the adapt below reinterprets IN_k as handle share, which is an analogy, not an identity.
- The projective-geometry machinery (cross ratios, Hilbert metrics) is decorative — eqs. 6–7 follow from standard calculus.
- The "no-go" hypothesis (Sec. 6) is philosophical: degree-5 unsolvability does not prevent numerical optimization, which the authors themselves note; it has no operational consequence for GSE.
- Profit-zero condition p_1·IN_2 = p_2·IN_1 assumes the crowd's pool shares are observable; public betting percentages are a noisy proxy.

## 10. GSE overlap
Complements, not duplicates: no other corpus ledger treats the parimutuel/crowd-pool formulation or the entropy decomposition of max profit. Ledgers 0813/1200/1366–1368 all assume fixed odds and an isolated bettor; this is the only source for the "unpopularity profit" concept — value as a function of where the *crowd's* money sits relative to true probabilities.

## 11. GSE implementation spec
1. **Faded-public-side sizing (the adapt):** for each pick, estimate the crowd's handle share h_i (public betting percentages as proxy for IN_k) and the engine's true probability p_i; add an "unpopularity premium" term to the Kelly fraction proportional to (p_i·(1−h_i) − (1−p_i)·h_i) — the discrete analog of the eq. 7 seer's-profit term — so stakes tilt toward picks where the model disagrees with the crowd's money. Skip when p_i·(1−h_i) ≈ (1−p_i)·h_i (crowd is right; no premium).
2. **Entropy gate:** compute the market-implied binary entropy S_i = −p_i·ln p_i − (1−p_i)·ln(1−p_i) from the consensus line; deprioritize picks where the entropy term dominates the unpopularity term (eq. 7) — high-entropy, low-disagreement games have no structural edge.
3. Data: public betting percentages (handle splits) + engine probabilities + odds API lines. Effort: small — a premium term on the sizing step.

## 12. Reproducible test
Dataset: GSE engine's 2024–2025 NFL picks with public betting percentages and closing odds. Backtest Kelly stakes with vs without the unpopularity premium on realized log-wealth growth; and test the entropy gate as a pick filter (drop picks where entropy dominates disagreement). Backtest window: full 2024 + 2025 seasons.

## 13. Acceptance / rejection gate
ADOPT the unpopularity premium if it improves realized log-wealth growth vs base Kelly with no worse max drawdown; REJECT if public betting percentages prove too noisy (premium sign flips on > 30% of picks between line snapshots) — in that case keep only the entropy gate as a filter.

## 14. Improvement experiment
Replace the public-percentage proxy with actual handle-share data if a feed becomes available, and re-derive eqs. 6–7 for the fixed-odds-with-vig sportsbook (replace the pool-sharing condition eq. 2 with bookmaker margin m): test whether the vig-adjusted "unpopularity profit" predicts CLV better than raw edge alone.
