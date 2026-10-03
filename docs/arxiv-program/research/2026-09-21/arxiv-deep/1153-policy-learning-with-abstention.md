# [1153] Policy Learning with Abstention (arXiv:2510.19672)

**Citation:** Ayush Sawarni, Jikai Jin, Justin Whitehouse, Vasilis Syrgkanis (2026). *Policy Learning with Abstention*. arXiv:2510.19672v3 [cs.LG], Stanford University. URL: https://arxiv.org/abs/2510.19672
**Ledger completed:** 2026-09-21. **Read:** full text (34 pages, arXiv v3) plus appendices A–D in full (proofs A–C; experiment details D).
**Verdict:** ADAPT
The disagreement-based abstention construction (abstain exactly where near-optimal policies disagree) and the abstention-powered safe-policy-improvement protocol are both directly adaptable: the first to GSE's post/no-post decision, the second to certifying engine version upgrades before public deployment.

## 1. Research question
Policy learning (personalized medicine, advertising) forces a binary treatment decision even under high uncertainty. Can we learn policies π: X → {0, 1, ∗} that may abstain (defer to a safe default/expert), with fast statistical guarantees — and does abstention unlock other policy-learning problems (margin-free fast rates, safe policy improvement, distributional robustness)?

## 2. Dataset / schema
Purely theoretical + synthetic simulations. No real data. Abstention simulations (App. D.1): X i.i.d. standard normal, X-dependent logistic propensity clipped to [0.1, 0.9], outcomes Y = Y(D) + noise in [0,1]; three reward regimes (linear, nonlinear, complex), feature dimensions and sample sizes swept; base class = threshold policies (incl. linear-threshold with intercept); κ = 0.1, δ = 0.05, p = 0.05; abstention beats EWM in most configurations (Figs. 3–4: mean value difference and winning rate vs EWM). Safe-upgrade simulations (§4.2 / App. D.2): X ∼ U[0,1]^5, CATE τ(X) = 2(X1+X2−1), Y(0) = X3 + ε, ε ∼ N(0,σ²); noise variance swept 0.01–1.0, baseline–optimal gap swept; n ∈ {200, 500, 1000, 2000, 5000}; 500 replications per setting; policy value by IPW with known propensities; abstention-bonus grid P = {0, 0.01, 0.05, 0.10, 0.20}; significance δ = 0.05; >2,000 total repetitions. No sports data; nothing to replicate data-wise.

## 3. Method / model
**Framework:** abstention earns reward (Y(1)+Y(0))/2 + p — the value of a random guess plus a small fixed bonus p ≥ 0. Abstaining regret Reg_n^(p)(π) = V(π∗) − V^(p)(π) is measured against the best *binary* in-class policy.

**Algorithm 1 (known propensities):** (1) split data D1/D2; (2) empirical welfare maximizer π̂ = argmax_{π∈Π} V_n(π) on D1 (IPW value); (3) near-optimal set Π̂ = {π : V_n(π̂) − V_n(π) ≤ (c/κ²)(2α + α√(E_n|f_π̂ − f_π|))}; (4) project each π ∈ Π̂ to an abstaining policy π′ that **abstains exactly where π disagrees with π̂** (π′(x) = π(x) if π(x)=π̂(x), else ∗); (5) EWM with abstention on D2 over this restricted class.

**Unknown propensities (§3.2, Algorithm 4):** replace IPW with doubly-robust pseudo-outcomes φ̂(x,d,y) = ĝ(d,x) + [dD/p̂(x) + (1−d)(1−D)/(1−p̂(x))](y − ĝ(d,x)); same construction with expanded α.

**Applications:** (a) Algorithm 2 — abstain-first then refine on the abstention region, giving fast rates under a margin condition *without* realizability (Theorems 4.1, 4.2); (b) **Algorithm 3 (safe policy improvement):** grid of bonuses → abstaining policies on D_train → impute abstentions with baseline ω → one-sided LCB test V_n(π̂)−V_n(ω) − z_{1−δ/k}σ̂/√n_test > 0 with Bonferroni correction → deploy first passing candidate; (c) Proposition 4.3 — abstention bonus p = α/2 exactly equals worst-case value under a W1-ball distribution shift of radius α.

## 4. Equations & assumptions
- CATE: τ_o(x) := g_o(1,x) − g_o(0,x); propensity p_o(x) := P(D=1|X=x).
- Conditional value (eq. 1): v(π,x) = π(x)g_o(1,x) + (1−π(x))g_o(0,x).
- Abstaining value: V^(p)(π) := E[1{π(X)≠∗}v(π,X) + 1{π(X)=∗}g_o(∗,X)], g_o(∗,x) := E[(Y(1)+Y(0))/2 + p | X=x].
- Abstaining regret (eq. 2): Reg_n^(p)(π) := V(π∗) − V^(p)(π).
- **Theorem 3.1:** Reg_n^(p)(π̃) ≲ (d log(nd) + log(1/δ)) / (p n κ²) w.p. ≥ 1−δ — fast O(1/n); p acts as a "synthetic margin."
- **Proposition 3.3 (p=0):** Reg_n ≲ (1/κ)√((d log(nd)+log(1/δ))/n) — matches unimprovable ERM rate.
- **Theorem 3.4 (DR):** Reg ≲ (d log(nd)+log(1/δ))/(p n κ²) + Err_DR²/(pκ²), Err_DR = product error of nuisance estimates; negligible if nuisances converge at n^{−1/4}.
- **Proposition 4.3 (robustness):** min_{P∈P_α} V(π) = V^(α/2)(π) − α.
- Margin condition (eq. 3): P(|τ_o(X)| ≥ h) = 1. Combinatorial diameter D := max_{π1,π2} Σ_x 1{π1(x)≠π2(x)}.

**Assumptions:** unconfoundedness (Y(1),Y(0)) ⊥ D | X; strict overlap p_o(x) ∈ [κ, 1−κ]; finite VC dimension d; Y ∈ [0,1]; nuisance estimates independent of sample (3-fold splitting in practice).

## 5. Features / target
Not applicable — theoretical paper. In simulation: covariates X, binary treatment D, outcome Y ∈ [0,1]; target is the abstaining policy maximizing V^(p).

## 6. Validation design
Theory (high-probability regret bounds) + synthetic simulations for safe policy improvement only. Comparators: HCPI two variants (finite-sample clipped-CI and t-test LCB, Thomas et al. 2015) and Safe EWM (EWM candidate + same LCB test). Metrics: value gain, mistake rate (P(return worse-than-baseline)), improvement rate (P(return strictly better)). Finding: n ≤ 500 EWM wins; **n ≥ 1000, Algorithm 3 dominates** — highest improvement rate, largest mean value gain among accepted policies, Type-I error ≤ 0.05 across >2,000 reps, competitive mistake rates under rising noise. Proofs (App. A–C) establish the fast O(1/(pnκ²)) rate via localized Rademacher complexity (Lemma A.2), the DR extension (App. B, Algorithm 4, nuisance product-error Err_DR), and the two-phase margin-free refinement plus the W1-robustness equivalence (App. C).

## 7. Numerical results / baselines
No numeric tables in the main text — results are reported qualitatively via Figures 1–2 (value gain / mistake rate / improvement rate curves across noise variance and baseline-optimal gap). Exact claims: "once n ≥ 1000 our method dominates"; "controls the Type-I error at or below 0.05"; "achieves the highest improvement rate and the largest mean value gain among accepted policies across baseline–optimal gaps." I did not extract chart values (figures only, no tables) — treat magnitudes as paper claims, not verified numbers.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **No real data:** all guarantees are theoretical; the only empirics are synthetic. Nothing validates the disagreement-abstention construction on real decision problems.
- **Bonus p is a free parameter:** the O(1/n) rate has 1/p in the constant — tiny p (the realistic case) blows up the bound; the paper gives no data-driven p selection (Algorithm 3 grids it, but the grid {0,…,0.20} is ad hoc).
- **Abstention benchmark is weak:** regret is measured against the best *binary* policy, so abstention gets credit for the free bonus p — the "fast rate" partly reflects the benchmark choice (authors disclose this, Remark 3.2).
- **Binary treatments only** (acknowledged); decision-tree implementation left open.
- **External validity to NFL:** the policy-learning framing (treat/don't treat) does not match GSE's prediction problem directly; the transferable parts are the *mechanisms* (disagreement abstention, LCB-gated deployment), not the theorems.

## 10. GSE overlap
Existing-research map gap item 4 (learning-to-abstain, pick selection) — this paper gives two **new capabilities**: (a) a *principled* abstention rule (disagreement among near-optimal policies) vs the score-threshold rules of 1150/1151; (b) a deployment-safety protocol for engine upgrades. The repo has no certified-upgrade procedure for the GSE engine (v5.2.7 → next); this fills it. Extension, not duplicate.

## 11. GSE implementation spec
1. **Disagreement abstention for the post/no-post decision:** train K=10 near-optimal pick-selection rules (e.g., bootstrap-resampled logistic selection heads on engine features, all within ε of the best validation ROI); for each slate game, **abstain (no post) iff the rules disagree** on post/no-post. This replaces a single threshold with a committee-disagreement rule — no CATE estimation needed, exactly as the paper notes.
2. **Safe engine upgrade protocol (Algorithm 3 analogue):** when a new engine version is candidate: split recent graded picks into D_train/D_test; learn selection policy on D_train; impute abstentions with the *current* production policy; one-sided LCB on ROI improvement over production on D_test; deploy only if LCB > 0. Grid the abstention bonus p ∈ {0, 0.01, 0.05, 0.10} (bonus = forgone-post value).
3. **Robustness interpretation:** set p from the distribution-shift view (Prop. 4.3) — larger p in early season (regime uncertainty) = more abstention as a hedge.
4. **Effort:** ~3–4 days (committee training harness + LCB deployment gate).

## 12. Reproducible test
Dataset: GSE `picks` table, chronological split. Baseline: single-threshold abstention (from 1150/1151 work). Test A: disagreement-abstention (K=10 bootstrap selection heads, abstain on any disagreement) vs threshold rule at matched abstention rate — metric: selective ROI on posted picks, test = last 15% chronological. Test B: simulate an engine upgrade — candidate version vs production via the LCB gate; verify the gate blocks a known-bad candidate (e.g., uncalibrated variant) and passes a known-good one.

## 13. Acceptance / rejection gate
ADAPT the disagreement rule iff it beats the single-threshold rule by ≥ 2 selective-ROI points at matched abstention rate on the chronological test block; ADAPT the LCB upgrade gate iff it correctly blocks the known-bad candidate while passing the known-good one (a gate that never fires is decoration). REJECT the DR machinery (no treatment-assignment problem in GSE's pick data — outcomes are observed regardless of posting).

## 14. Improvement experiment
Replace "abstain on *any* disagreement" with **weighted disagreement**: abstain iff the ROI-weighted fraction of near-optimal rules voting "no post" exceeds τ, tuning τ on validation. The paper's all-or-nothing disagreement is conservative; a soft version should recover posted-pick volume at equal selective ROI. Second: make p **adaptive to season phase** (high in weeks 1–4, decaying) per the Prop. 4.3 shift-hedge interpretation, and test whether adaptive-p beats fixed-p on early-season selective ROI.
