# [1500] The optimal betting wealth growth rate (arXiv:2604.25280v1)

**Citation:** Ram, A., & Ramdas, A. (2026). *The optimal betting wealth growth rate*. Carnegie Mellon University. arXiv:2604.25280v1 [math.ST]. URL: https://arxiv.org/abs/2604.25280
**Ledger completed:** 2026-09-21. **Read:** full text (PDF) — Sections 1–6 (growth theorem, w.l.s.c. conditions, counterexamples, composite-Q GROW rates, test-supermartingale achievability); proofs appendix skimmed.
**Verdict:** ADAPT — the assumption-free characterization of the maximal Kelly growth rate as the asymptotic inf-KL rate to the bipolar of the null class (Theorem 3.5), with the KLinf identity restored under weak lower semicontinuity / weak compactness (Theorem 4.1, Prop. 4.5), gives GSE the information-theoretic ceiling on growth as a function of edge separation — and, critically, quantifies how much growth rate is lost to model-class uncertainty (the inf-KL vs KLinf gap). Use as the theoretical backbone for sizing conservatism, not as a betting algorithm.

## 1. Research question
In a Kelly betting game where a skeptic bets sequentially against a composite null hypothesis class P while data come i.i.d. from an alternative Q, what is the best possible asymptotic wealth growth rate — with no assumptions on P or Q? When does the popular KLinf(Q, P) = inf_{P∈P} KL(Q‖P) actually govern the rate, and what replaces it when it doesn't?

## 2. Dataset / schema
Pure theory; no datasets. Illustrative counterexamples are constructed analytically (e.g., Prop. 5.4: a case with KLinf > 0 but every e-process growing at rate ≤ 0).

## 3. Method / model
- **Polar/bipolar:** S° = {E ≥ 0 : sup_{P∈S} E_P[E] ≤ 1} (all valid e-variables); S°° = {R : E_R[E] ≤ 1 ∀E ∈ S°} (the "effective null," a TV-closed convex enlargement of S).
- **inf-KL:** a_n(Q, P) = inf_{R∈(Pⁿ)°°} KL(Qⁿ‖R); the sequence is superadditive, so d_inf-KL = lim (1/n)·a_n exists (Fekete).
- **Theorem 3.5 (main):** sup over all wealth processes (e-processes, incl. blockwise) of limsup (1/n)E_Q[log W_n] = d_inf-KL — achievable by repeating a near-optimal m-block e-variable (Prop. 3.4, SLLN gives a.s. convergence too).
- **Power-one testing:** Qⁿ ∈ (Pⁿ)°° for all n ⟹ no level-α power-one sequential test exists (Lemma 3.9); non-membership ⟹ strictly positive KL gap (Prop. 5.3, via Pinsker). Theorem 3.14: equivalence between power-one testability and positive rate.
- **When KLinf is correct:** Theorem 4.1 — if Φ(R) = inf_{P∈P} KL(R‖P) is weakly lower semicontinuous at Q, then lim (1/n)·inf-KL(Qⁿ, Pⁿ) = KLinf(Q, P). Weak compactness of P suffices. Prop. 4.5: weak compactness + convexity ⟹ one-step identity inf-KL(Q,P) = KLinf(Q,P).
- **Composite Q:** maximal uniform growth rate = sequential GROW value d_rob = limsup (1/n)·b_n(Q,P), b_n = sup_{E∈(Pⁿ)°} inf_{Q∈Q} E_{Qⁿ}[log E] (Theorem 6.5); d_rob ≤ d_wc (pointwise) with equality for finite Q or sub-exponential covering (Prop. 6.7, Thm. 6.8).
- **Test supermartingales suffice:** for i.i.d. problems the full e-process envelope is attained by test supermartingales on reduced (block) filtrations (Sec. 7) — no exotic e-processes needed.

## 4. Equations & assumptions
- inf-KL(Qⁿ, Pⁿ) = inf_{R∈(Pⁿ)°°} KL(Qⁿ‖R); (1/n)·inf-KL(Qⁿ,Pⁿ) ≤ KLinf(Q,P) always, strict in general.
- d_inf-KL = limsup_n (1/n)·a_n(Q,P) = sup_W R_Q(W), R_Q(W) = limsup_k (1/t_k)E_{Q∞}[log W_{t_k}].
- Binary KL: D(p‖q) = p·log(p/q) + (1−p)·log((1−p)/(1−q)).
- Composite: d_rob = limsup_n (1/n)·sup_{E∈(Pⁿ)°} inf_{Q∈Q} E_{Qⁿ}[log E].
- Assumptions: i.i.d. sampling under both P and Q; that's it — no dominating measure, no compactness, no convexity for the main theorem. (This assumption-free stance is the paper's contribution.)

## 5. Features / target
N/A (theory). The "target" is the maximal asymptotic per-round expected log-growth rate.

## 6. Validation design
Mathematical proofs; counterexamples in Section 5 delineate exactly which regularity conditions are needed (e.g., weak compactness alone without convexity is insufficient — Prop. 5.6).

## 7. Numerical results / baselines
No numerics — the results are identities and inequalities: d_inf-KL ≤ KLinf always; equality under w.l.s.c.; Prop. 5.4's counterexample (KLinf > 0, achievable rate 0) is the headline warning.

## 8. Code / data availability
None stated (theory paper).

## 9. Leakage & limitations
- Asymptotic (n → ∞) rates; finite-horizon behavior can differ substantially — GSE bets finite sequences.
- i.i.d. assumption: sports outcomes are not i.i.d. (matchup dependence, nonstationarity) — the identities are guiding, not literal.
- The bipolar enlargement is uncomputable in practice; the paper gives no algorithm for finite-sample e-variable construction beyond the GRO program it generalizes.
- No prescription for choosing the null class P in an applied setting.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, the Kelly/sizing lane is now well-stocked: ledger 1368 (Kelly-OU dynamic fractions), fractional-Kelly ledgers from wave 3 (1222–1225), and the map notes Kelly was "mentioned 12× but no paper read" before today. No existing ledger covers the information-theoretic growth-rate ceiling or the model-uncertainty gap. This is an extension: 1368 gives the optimal fraction given known parameters; this paper bounds what's achievable when the outcome model itself is only known to lie in a class — the exact situation of an engine with estimation error.

## 11. GSE implementation spec
- Translate to a sizing rule: (a) estimate the engine's edge as D(p̂‖q) per bet (binary KL between model probability p̂ and market-implied q); (b) treat the "null class" P as the set of outcome distributions consistent with estimation error (e.g., p̂ ± calibration error bars); (c) the paper's gap (KLinf vs inf-KL over the enlarged class) becomes a principled haircut on the Kelly growth rate — implement as a fractional-Kelly multiplier derived from the width of the uncertainty class rather than an arbitrary 0.25/0.5 fraction; (d) block-betting analogue: size in blocks (weekly slates) rather than per-game, mirroring the blockwise test supermartingale construction.
- Effort: ~1 week (the math reduces to: Kelly fraction × shrinkage factor from calibration-error width).

## 12. Reproducible test
Dataset: 2022–2024 GSE pick logs with model probabilities and closing lines. Metric: realized log-bankroll growth of (a) full Kelly on D(p̂‖q), (b) uncertainty-haircut Kelly from the bipolar-gap rule, (c) fixed 0.25-fraction Kelly. Baseline: (c). Window: fit calibration-error bars on 2022–2023, test on 2024.

## 13. Acceptance / rejection gate
ADOPT the uncertainty-haircut fraction if, on 2024, it achieves ≥90% of full Kelly's log-growth with ≤70% of its maximum drawdown — i.e., it captures the paper's promised robustness without giving up the growth rate. Reject if the haircut is indistinguishable from a fixed 0.25 fraction (then the theory adds no practical value over the rule of thumb).

## 14. Improvement experiment
Drop the i.i.d. assumption empirically: estimate the growth-rate gap on bootstrapped game sequences that preserve the actual autocorrelation structure of GSE's edge (hot/cold stretches), and test whether a regime-aware (two-state) null class gives a tighter, still-safe haircut — extending the paper's framework toward the non-i.i.d. reality of sports betting.
