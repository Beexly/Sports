# [1489] Optimal Prize Design in Parallel Rank-order Contests (arXiv:2505.08342v1)

**Citation:** Xiaotie Deng, Ningyuan Li, Weian Li, Qi Qi (2025). *Optimal Prize Design in Parallel Rank-order Contests*. arXiv:2505.08342v1. URL: https://arxiv.org/abs/2505.08342
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via pdftotext — abstract, §§1–5, all definitions/lemmas/theorems, plus the complete appendix: Lemma 1 proofs incl. Claims 1–5, Lemma 2 sufficiency/necesity incl. Claim 6, Theorem 1 sufficiency/necesity, Corollary 1, Lemma 3 combinatorial identity, Lemma 4, Lemma 5, Theorem 2 incl. Claims 7–11, Theorem 3 single-crossing verification, Corollary 2, Theorem 4 incl. Claim 12 and cases a–c, Theorem 5 equilibrium construction).
**Verdict:** ADAPT
GSE is a contest *entrant*, not a designer, so the winner-takes-all/simple-contest designer theorems don't apply directly; adapt the contestant-equilibrium sorting result (Theorem 1 / Corollary 1) into a field-strength model for the DFS optimizer's contest-selection layer.

## 1. Research question
In a market of multiple simultaneous rank-order contests (the DraftKings/FanDuel lobby), where designers set prize structures under fixed budgets and contestants both choose which contest to enter and how much costly effort to exert: (a) what is the symmetric Bayesian Nash equilibrium of contestants (contest choice + effort)? (b) what prize structures are optimal for designers under effort-based vs participation-based objectives? (c) does disclosing the number of competitors change anything?

## 2. Dataset / schema
No dataset. Pure game-theory paper (cs.GT). All results are theorems about the model; no empirical validation, no simulations reported.

## 3. Method / model
Two-stage game: m rank-order contests, n contestants. Stage 1: each designer j announces prize structure w⃗ⱼ=(wⱼ,₁,…,wⱼ,ₙ), wⱼ,₁≥…≥wⱼ,ₙ≥0, Σₖwⱼ,ₖ≤Tⱼ (budget). Stage 2: each contestant i has private skill vᵢ>0 i.i.d. from continuous F (represented by quantile qᵢ∼U[0,1], v(q)=F⁻¹(1−q), lower q = higher skill); chooses contest Jᵢ and effort eᵢ at linear cost eᵢ/vᵢ; prizes allocated rank-by-effort (ties broken by skill); utility uᵢ=vᵢ·Wᵢ−eᵢ. Analysis via interim allocation function xⱼ(φ)=Σₖwⱼ,ₖ·C(n−1,k−1)φᵏ⁻¹(1−φ)ⁿ⁻ᵏ (expected prize when the mass of stronger competitors is φ). Key steps: Lemma 1 — in sBNE, effort is deterministic given (contest, quantile): eᵢ=βⱼ(qᵢ) with β̂ⱼ strictly decreasing; Theorem 1 — equilibrium contest choice reduces to picking argmaxⱼ xⱼ(Φⱼ(q)) (expected *prize*, not utility — effort choice separates out); Corollary 1 — closed-form cumulative choice strategy Φⱼ(q)=xⱼ⁻¹(Q⁻¹(q)) with Q(x)=Σⱼxⱼ⁻¹(x) (unique when all xⱼ strictly decreasing); §3.3 variant — disclosing competitor counts before effort choice leaves expected utilities and the choice equilibrium unchanged (Lemma 3: Eₖ[xⱼ⁽ᵏ⁾(Φⱼ(qᵢ)/Φⱼ(1))]=xⱼ(Φⱼ(qᵢ))). Designer side: effort objective Rⱼ=E[Σₖαⱼ,ₖeⱼ⁽ᵏ⁾] with weight-monotone α (Lemma 5: non-increasing non-negative α suffices — covers total effort, max effort, top-k effort); participation objective Rⱼ=expected # of entrants with qᵢ≤θⱼ.

## 4. Equations & assumptions
- Utility: uᵢ(J,e;vᵢ) = vᵢ·Wᵢ(J,e) − eᵢ; scaled form ū(Jᵢ,eᵢ;τ;qᵢ) = v(qᵢ)·x_{Jᵢ}(Ψ_{Jᵢ}(eᵢ)) − eᵢ.
- Interim allocation: x_{w⃗ⱼ}(φ) = Σₖ₌₁ⁿ wⱼ,ₖ·C(n−1,k−1)·φᵏ⁻¹(1−φ)ⁿ⁻ᵏ. Strictly decreasing in φ iff wⱼ,₁>wⱼ,ₙ; constant iff all prizes equal.
- Theorem 1 (choice equilibrium): {j : Φⱼ′(qᵢ)>0} ⊆ argmaxⱼ xⱼ(Φⱼ(qᵢ)).
- Corollary 1: Φⱼ(q) = xⱼ⁻¹(Q⁻¹(q)), Q(x)=Σⱼxⱼ⁻¹(x).
- Effort in disclosed-count variant: βⱼ,ₖ(qᵢ) = ∫_{qᵢ}¹ v(t)·(−d/dt x_{w⃗ⱼ}⁽ᵏ⁾(Φ(t)/Φ(1)))dt; Eₖ[βⱼ,ₖ(qᵢ)]=βⱼ(qᵢ) (Lemma 3).
- Theorem 3: with weight-monotone α⃗ⱼ, winner-takes-all w⃗ⱼ*=(Tⱼ,0,…,0) is a *dominant strategy* for designer j (beats every feasible structure against any rival structures). Corollary 2: SPE where all designers go winner-takes-all.
- Theorem 4: under participation objective θⱼ, the optimal structure is always a *simple contest* w⃗ⱼ=(Tⱼ/k*,…,Tⱼ/k*,0,…,0) with k*=argmaxₖ ξₖ(φ*), φ*=Φⱼ*(θⱼ;·). Theorem 5: with common θ across designers, the designer SPE is efficiently computable.
- Assumptions: (1) continuous skill distribution, i.i.d. private skills; (2) linear effort cost e/v; (3) rank-by-effort allocation, ties by skill; (4) one contest per contestant (no multi-entry); (5) symmetric strategies; (6) fixed budgets, no entry fees modeled explicitly; (7) effort is one-dimensional and perfectly rankable (no luck — the big gap vs DFS, where lineup score = skill + large variance).

## 5. Features / target
Not applicable — theory paper. The "targets" are equilibrium strategies (contest-choice distribution Φ, effort functions β) and optimal prize structures.

## 6. Validation design
No empirical validation — proof-based only. No datasets, no simulations, no calibration to real contest data. The "test" of the theorems is the appendix proofs.

## 7. Numerical results / baselines
No numerical results reported. Quantitative claims are the closed forms above (equilibrium characterization, winner-takes-all dominance, simple-contest optimality, tractable SPE under common θ).

## 8. Code / data availability
None stated. No code, no data.

## 9. Leakage & limitations
- No-luck assumption: DFS outcomes have huge variance (lineup score ≠ effort rank); the rank-by-effort mapping overstates how deterministically skill converts to prizes. In real DFS, weaker players win GPPs regularly — the sorting prediction (skilled players concentrate where expected prize is highest) is directionally right but overstated.
- One-entry-per-contestant assumption contradicts DFS reality (multi-entry, up to 150 lineups; pros flood GPPs with entries — the "effort" margin in DFS is number of entries, not modeled).
- No entry fees / rake in the model; DK/FD take ~10–15% rake, which changes the participation calculus.
- Designer results are for operators (DK/FD), not for GSE — GSE cannot set prize structures.
- The participation-objective result (flat "simple" contests attract the most above-threshold participants) cuts against naive DFS intuition and rests on the no-luck, costly-effort structure; treat as hypothesis, not fact, for real lobbies.
- No empirical test against any real contest data (TopCoder, DK, etc.).

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md, Garrett's corpus has deep DFS work (2026-09-13-dfs, 2026-09-19-dk-week2: matchup-scheme, stacks, ownership, optimizer pool JSON) but it is all *lineup-construction* — there is no contest-selection layer (which contests/slates to enter given bankroll and field). The weekly DFS packet format (2026-09-20) covers write-ups, not lobby selection. This paper is a NEW capability: equilibrium-based field-strength modeling for contest selection. Extension, not duplicate. Note the companion question it does NOT answer: optimal multi-entry portfolio construction (explicitly listed as future work).

## 11. GSE implementation spec
1. Build a `contest-selection` module for the DFS optimizer: input = DK/FD lobby snapshot (contest list with entry fee, field size, payout structure — top-heavy vs flat — all scrapable from the public lobby).
2. Implement the Theorem 1 sorting heuristic: for each contest, compute its interim-allocation curve x(φ) from the published payout table; simulate the Corollary-1 quantile sorting (assume a skill distribution, e.g., lognormal fitted to historical GPP vs cash-game ROI data) to estimate the skilled-player share per contest.
3. Routing rule (the inversion of Theorem 4): prefer contests the model flags as soft-field — flat-payout multipliers/small-field contests where high-skill concentration is predicted lowest; deprioritize large-field top-heavy GPPs unless overlay or a specific edge (ownership leverage) justifies it.
4. Use disclosed entrant counts (Lemma 3: they don't distort equilibrium) as a live input — entrants/filled-rate is public in the DK lobby and can update the field-size prior without worrying about strategic distortion.
5. Effort: ~3–4 days (lobby scraper + sorting simulation + routing rules); validate against one season of DK contest results if obtainable, else paper-trade.

## 12. Reproducible test
Dataset: DK/FD public lobby snapshots for 4 NFL weeks (contest name, fee, max entries, payout table, entrants) + GSE lineup pool scores. Metric: realized ROI of the optimizer's lineups entered per the routing rule vs the same lineups entered uniformly across the slate's GPPs. Baseline to beat: uniform-GPP entry — accept if the routed portfolio's ROI is ≥5 pp better over the 4-week window. Time window: 4 consecutive NFL weeks (time-ordered; no lookahead — lobby data is public pre-lock).

## 13. Acceptance / rejection gate
ADAPT if the offline replay shows routed contest selection beating uniform GPP entry by ≥5 pp ROI over 4 weeks AND the x(φ) sorting simulation reproduces the known qualitative pattern (top-heavy large-field GPPs concentrate the highest estimated skill share). Reject the routing layer if the skill-distribution assumption drives everything (results flip under plausible alternative skill priors) — then keep the module as a descriptive dashboard, not a router.

## 14. Improvement experiment
Beyond the paper: add the missing multi-entry margin. Extend the simulation so each "contestant" chooses (contest, #entries) with convex entry costs, and compute how the equilibrium field-strength ranking changes when pros can buy 150 entries in top-heavy GPPs. Hypothesis: multi-entry *reverses* part of the soft-field ranking — large-field GPPs become softer per-entry than the single-entry model predicts because pros dilute each other's edge across entries, opening a quantitative case for selective GPP shots with duplicated-core/leveraged lineups rather than blanket avoidance.
