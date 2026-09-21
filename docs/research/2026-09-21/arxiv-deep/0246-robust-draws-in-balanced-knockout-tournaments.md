# [0246] Robust Draws in Balanced Knockout Tournaments (arXiv:1604.05090v1)

**Citation:** Chatterjee, K., Ibsen-Jensen, R., & Tkadlec, J. (2016). *Robust Draws in Balanced Knockout Tournaments*. IST Austria. IJCAI 2016. arXiv:1604.05090v1. URL: https://arxiv.org/abs/1604.05090
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~6,600 lines through references).
**Verdict:** ADAPT (narrow) — a theoretical-CS paper on tournament draw manipulation; the NP-completeness results and draw-fixing machinery are irrelevant to GSE (the NFL playoff bracket is fixed, there is no draw to choose). But the paper's sensitivity primitive — the ε-worst drop of a tournament win probability, computed exactly via the multilinear decomposition wp = α_ij·P_ij + β_ij — is a genuinely new risk diagnostic vs the map: it identifies which pairwise matchup-probability estimates a futures/bracket position is most sensitive to. Adapt only that diagnostic; do not adopt the draw-fixing framework.

## 1. Research question
Prior work (Aziz et al. 2014; Vu et al. 2009) studied optimal draws maximizing a distinguished player's win probability assuming the pairwise comparison matrix P is known exactly (TFP/PTFP, both NP-complete). This paper asks: how ROBUST are optimal draws to small errors in P? Can slightly suboptimal draws be more robust than all optimal ones? And what is the complexity of finding draws with guaranteed winning probability under ε-perturbations (RTFP/RPTFP)?

## 2. Dataset / schema
No empirical dataset — pure theory. Formal objects: comparison matrix P (N×N, P_ij + P_ji = 1; deterministic if entries ∈ {0,1}); draws σ as permutations modulo tree isomorphism (N!/2^{N−1} draws; 128-player Grand Slam: ≥10^177 draws, ≥10^144 with standard seeding constraints); complete tournament C(P,σ); winning probability wp(i,P,σ) computable in O(N²) [13]; mwp(i,P) = max_σ wp; δ-optimal draws.

## 3. Method / model
1. **Robustness definitions:** ε-perturbation set P(P,ε) = {P′ : |P′_ij − P_ij| ≤ ε ∀i≠j}; ε-guaranteed winning probability wp_ε(i*,P,σ) = inf_{P′∈P(P,ε)} wp(i*,P′,σ); ε-worst drop d_ε = wp − wp_ε (Def. 5).
2. **Separating examples:** hard tournaments H_n (Prop. 1 — unique winning draw, drop ≈ (N−1)ε); unbalanced tournaments U_n (Prop. 2 — two winning draws with drops ≈ Nε/2 vs (2n−1)ε = (2 log N −1)ε); big-vs-small mixed-draw lemma (Lemma 1 — big-optimal draws pair big/small first round; b(P) = 0.5 + (n+1)ε/2 + ε²Q(ε) for p = 0.5+ε); Prop. 3 — a δ-suboptimal draw strictly more robust than ALL optimal draws.
3. **Drop approximation (Theorem 2):** d̂_ε (linear term of the drop polynomial) in polynomial time — deterministic: d̂_ε = c·ε where c = # crucial matches (a (0,1)-match whose single flip makes i* lose), found in O(N log N) (Lemma 6); probabilistic: d̂_ε = Σ_{i≠j} |α_ij| where wp(1,P,σ) = α_ij·P_ij + β_ij, computed in O(N⁴) (Lemmas 7–8). Worst perturbation always on the boundary (Lemma 4: each entry moved by exactly ε or pinned at {0,1}).
4. **Complexity consequences:** RTFP/RPTFP NP-complete (Cor. 3 — hardness via TFP with c = N+1; membership via the poly-time drop check); most robust winning draw poly-time in Aziz et al.'s two special cases (constant player types; linear order + constant exceptions) (Cor. 4).

## 4. Equations & assumptions
- wp_ε(i*,P,σ) = inf_{P′∈P(P,ε)} wp(i*,P′,σ); d_ε(i*,P,σ) = wp(i*,P,σ) − wp_ε(i*,P,σ).
- Deterministic: wp(1,P′,σ) = 1 − c·ε + ε²Q(ε) (Lemma 5); d̂_ε = c·ε (Cor. 2).
- Probabilistic: wp(1,P,σ) = α_ij·P_ij + β_ij; d̂_ε = Σ_{i≠j} |α_ij| (Lemma 7); Taylor: wp(1,P′,σ) = wp(1,P,σ) − εΣe_ij α_ij + ε²Q(ε), maximized by sign-matching e_ij to α_ij.
- Hard-tournament recursion: p_{k+1} = p_k·[p_k(1−ε) + (1−p_k)ε], p_1 = 1−ε → degree 2^n−1 polynomial, linear coefficient N−1 (Prop. 1).
- Example 1: 2-round tournament, σ=(1,2,3,4): wp(1) = 0.9³ = 0.729, wp(2)=0, wp(3)=0.171, wp(4)=0.1; draws (1,3,2,4),(1,4,2,3) give wp(1)=0.
**Assumptions:** N = 2^n balanced bracket; single-match win/lose with no draws; perturbations bounded uniformly by ε in ℓ∞; "sufficiently small" ε (ε < cN^{−2}) so the linear term dominates (higher-order terms ignored — the approximation guarantee is ±cε); pairwise probabilities independent across matches.

## 5. Features / target
N/A (theory). Target concept: a draw σ for distinguished player i* with (a) wp(i*,P,σ) ≥ q and (b) d̂_ε ≤ s·ε. No prediction horizon.

## 6. Validation design
Proofs, not experiments. Numerical illustrations (Examples 2–4) are computed instantiations of the propositions, not empirical validation.

## 7. Numerical results / baselines
- **Example 2** (6-round hard tournament, N=64, unique winning draw): wp(1,P′,σ) = 1 − 63ε + … − 2147483648ε^63; wp_0.01 < 0.54, wp_0.05 < 0.07, wp_0.1 < 0.02 — a "guaranteed" win collapses under 1% probability error.
- **Example 3** (unbalanced 6-round): both draws give wp=1 exactly, but wp_0.01: <0.73 vs >0.89; wp_0.05: <0.23 vs >0.56; wp_0.1: <0.08 vs >0.31. Robust draw: wp_ε ≥ (1−ε)^11.
- **Example 4** (6-round, small/medium/big): mwp(1,P) = wp(1,P,σ) > 0.506 (optimal); suboptimal σ′: wp = 0.502; but wp_0.02: <0.429 (optimal) vs >0.432 (suboptimal) — the suboptimal draw guarantees more.
- **Complexity:** RTFP/RPTFP NP-complete; robust-draw approximation O(N log N) deterministic / O(N⁴) probabilistic.

## 8. Code / data availability
None (theory paper).

## 9. Leakage & limitations
- **No draw exists to fix in the NFL:** playoff seeding/bracket is fixed by league rules — the paper's central computational problem has no GSE instantiation. The results are worst-case complexity, not an empirical finding.
- **Linear-term approximation only:** d̂_ε ignores ε²+ terms; Example 2's polynomial shows higher-order terms dominate quickly (−2.1×10^9·ε^63) — the "sufficiently small ε" regime (ε < cN^{−2}) is extremely restrictive for N=64 (ε ≪ 0.0002).
- **ℓ∞ perturbation model** (every pairwise probability simultaneously adversarially wrong by ε) is a paranoid worst case, not a calibrated uncertainty model — no distributional treatment of estimation error.
- **Balanced-bracket assumption** (N = 2^n, no byes) doesn't match the NFL's 14-team bracket with byes.

## 10. GSE overlap
- **Novel vs map:** nothing in the map covers tournament-draw robustness, bracket sensitivity, or futures-position sensitivity to matchup-probability error. The closest relatives (playoff sims, tournament Monte Carlo in 0242) compute win probabilities but never their sensitivities.
- **Non-overlapping by construction:** the draw-fixing problem itself is absent from GSE's universe (fixed NFL bracket). The transferable piece is purely the sensitivity diagnostic.

## 11. GSE implementation spec
Adapt the multilinear sensitivity diagnostic to futures/bracket risk:
1. From GSE's playoff simulator, write each team's championship probability as an explicit multilinear function of the pairwise game-win probabilities P_ij (the simulator already evaluates wp; extend it to also accumulate the α_ij coefficients as in Lemma 7/8 — one extra linear-function evaluation per (i,j) pair, or adjoint-style accumulation).
2. For any Super Bowl futures position, report the top-k (i,j) pairs by |α_ij| — i.e., "this ticket's value hinges most on the estimated probability that team i beats team j."
3. Report the worst-case drop Σ|α_ij|·ε for a chosen ε (e.g., ε = 0.03 as a calibration-error scale) alongside the point-estimate edge — a risk-averse overlay for sizing futures bets (Kelly with uncertainty).
4. Use the deterministic "crucial matches" variant (O(N log N)) on the modal bracket: which single game outcomes flip the most likely champion — a sanity check on bracket-concentration risk.
Estimated effort: small — the simulator change is mechanical; the hard part (calibrating ε) is a judgment call.

## 12. Reproducible test
- **Data:** GSE's existing playoff simulator + 2024 season pairwise estimates.
- **Test 1:** compute α_ij for the 2024 playoff field; verify the top-|α| pairs correspond to the actual pivotal matchups (e.g., conference championship games) — face validity.
- **Test 2:** perturb each P_ij by ±0.03 one at a time in the simulator and confirm the induced championship-probability changes match the α_ij predictions (linearity check) — validates the implementation.
- **Test 3 (decision value):** backtest — do futures bets sized with the Σ|α_ij|ε penalty show better risk-adjusted returns than point-estimate Kelly over 5 seasons? If no, the diagnostic is informative but not decision-relevant.

## 13. Acceptance / rejection gate
ADAPT gate (narrow): (a) Test 2 must confirm the α_ij coefficients predict simulated perturbation effects (linearity holds at ε ≈ 0.03); (b) Test 3 or analyst judgment must show the sensitivity ranking changes at least some futures sizing decisions vs the status quo. If the simulator's wp is not cleanly multilinear in a usable P_ij parameterization (e.g., probabilities come from a joint model, not independent pairwise inputs), the diagnostic doesn't apply → REJECT. The draw-fixing complexity theory is not adopted under any gate.

## 14. Improvement experiment
- Replace the adversarial ℓ∞ perturbation with a Bayesian treatment: posterior over P_ij → posterior distribution of wp (not just the infimum) — strictly more informative for sizing and subsumes the paper's worst-case bound.
- Extend to the NFL's actual 14-team bracket with byes (the paper's N=2^n assumption fails) — test whether the crucial-match concept still yields clean diagnostics with byes and reseeding.
- Apply the same sensitivity decomposition to the season-win-total market: ∂P(over)/∂(per-game win prob) per game — identifies which weeks' estimates drive a win-total bet.
