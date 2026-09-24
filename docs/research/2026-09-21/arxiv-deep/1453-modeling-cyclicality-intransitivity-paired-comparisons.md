# [1453] Modeling cyclicality and intransitivity in paired comparisons data (arXiv:2406.11584)

**Citation:** Rahul Singh & Ori Davidov (2026). *Modeling cyclicality and intransitivity in paired comparisons data*. arXiv:2406.11584v3 [stat.ME]. URL: https://arxiv.org/abs/2406.11584
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 49 pages: main text sections 1–6 plus supplement A–E with all theorem proofs — read via pdftotext).
**Verdict:** ADAPT — (a) adopt the Hodge decomposition ν = ν_linear + ν_cyclic as GSE's *diagnostic* for whether a league's transitive rating model is misspecified: the paper's lack-of-fit test (Theorem 3.2) on NFL/EPL data tells GSE when pairwise results genuinely contain cyclic structure that a global ranking cannot represent; (b) adopt the FTBS (forward tick-based selection) procedure to identify the *specific* minimal cyclic triads (rock-paper-scissors triples) rather than averaging them away — these are actionable matchup signals (the paper's EPL example found TotalWin = 19.5 units/round-robin from betting cyclic miscalibrations); (c) adopt the dominance-score ranking (Borda-like, Eq. C.2) as GSE's fallback ranking when intransitivity is detected, replacing a single merit vector that cannot represent cycles.

## Research question
How to move beyond diagnosing "this data isn't transitive" to *modeling* the cyclic structure explicitly — decomposing a paired-comparison preference profile into orthogonal transitive + cyclic components, selecting a minimal (sparsest) cyclic representation, and recovering it with large-sample guarantees?

## Method
**Hodge-style decomposition:** for cardinal PCD Yᵢⱼₖ = νᵢⱼ + εᵢⱼₖ, the parameter space N = R^{K(K−1)/2} splits orthogonally into L (linear/transitive, dim K−1, spanned by merit-difference vectors b_k, Eq. 3–4) and C (cyclic, dim (K−1)(K−2)/2). Any profile: ν = ν_linear + ν_cyclic = Bμ + Cγ (Eq. 11), where C is the overcomplete dictionary of elementary cyclic triads c_(i,j,k) (Eq. 7). Cyclicality is detectable via νᵢⱼ + νⱼₖ + νₖᵢ ≠ 0. **Tick-table** (Def. 2.3): edge×triad table marking nonzero cyclic edges — triads with 3 ticks identify minimal-model members (Theorems 2.1–2.2). **FTBS** (Section 3.2): K(K−1)/2 edgewise tests of ν_cyclic,ij = 0 (FWER/FDR) → build tick-table → fit nested models S₁=L ⊂ S₂ ⊂ S₃ ⊂ S₄ (3-tick, 2-tick, 1-tick triads) → sequential lack-of-fit tests (Theorem 3.2: R_n,S → ΣλᵢZᵢ² under H₀). Theorem 3.3: FTBS spans the true cyclic component with probability → 1 (exponentially fast under sub-Gaussian errors); exact recovery when minimal model is unique and tests vanish.

## Equations
- Model: Yᵢⱼₖ = νᵢⱼ + εᵢⱼₖ (Eq. 1); transitive form νᵢⱼ = μᵢ − μⱼ (Eq. 2)
- Consistency: νᵢⱼ + νⱼₖ + νₖᵢ = 0 ⇔ ν ∈ L (Fact 2.1)
- Decomposition: ν = ν_linear + ν_cyclic, ν_linear = B(BᵀB)⁺Bᵀν, ν_cyclic = C(CᵀC)⁺Cᵀν (Eq. 10)
- Cyclic triad basis: c_(i,j,k)(s,t) = I((s,t)∈{(i,j),(j,k),(k,i)}) − I((s,t)∈{(j,i),(k,j),(i,k)}) (Eq. 7); dependent via c_(i,j,k) = c_(s,i,j) + c_(s,j,k) − c_(s,i,k) (Eq. 8)
- Intermediate-model LS (Eq. 13–15); AN of (μ̂, γ̂_s) (Theorem 3.1); lack-of-fit R_n,S (Theorem 3.2)
- Cyclicity t-test per triad: T_n = (ν̂ᵢⱼ+ν̂ⱼₖ+ν̂ₖᵢ)/√(1/nᵢⱼ+1/nⱼₖ+1/nₖᵢ) → N(0,σ²) (Prop. D.1)
- Dominance score: μᵢ** = Σⱼ I(νᵢⱼ > 0) (Eq. C.2); ranking: i above j iff μᵢ** > μⱼ**
- Betting edge: Winᵢⱼ = (τᵢⱼ−ωᵢⱼ)/ωᵢⱼ if τ>ω, (ω−τ)/(1−ω) if τ<ω (Section 5)

## Datasets
- **Simulations:** 1,000 runs; K ∈ {6,10,20,50}, m ∈ {10,20,30} comparisons/pair; three scenarios (I: unique minimal model; II: unique + a spurious 3-tick triad; III: non-unique minimal model); error metrics M\SE and ranking error RE_d.
- **EPL 2022–23:** 20 teams, 380 matches (double round-robin); outcome = xG difference per match; LASSO shrinks all cyclic parameters to 0 (m=2 too small); pruned FTBS selects exactly 3 edge-disjoint cyclic triads: (Aston Villa, Brighton, West Ham) γ̂=1.18, (Chelsea, Liverpool, Man Utd) γ̂=1.1, (Leeds, Leicester, Man City) γ̂=1.07.

## Exact results / baselines
- **Table 2 (K=20, m=30):** M\SE — true model 0.69, FTBS 0.72 (+7%), LASSO 1.29, full model 6.35 (**~1000% worse**), reduced transitive model 6.63 (**~1000% worse**). RE_d: true 0.72, FTBS 0.74, full 8.08, reduced 3.76. FTBS ≈ oracle, and both naive alternatives are catastrophic under cyclic truth.
- LASSO selects ≈3× too many triads (E(|Ŝ|/|S|) ≈ 4.2 at K=10, m=30, Scenario I); FTBS parsimony ≈ 1.0 but low selection probability at small m; LASSO+FTBS hybrid balances moderate-m cases (Summary 4.1).
- **EPL:** reduced-model lack-of-fit p < 10⁻³; selected 3-triad model AIC 1101.39 vs transitive 1118.56, BIC 1192.02 vs 1197.37 — the only model passing lack-of-fit; dominance-score ranking differs from merit ranking (Newcastle merit-rank 2 → dominance 4; Bournemouth merit 20 → dominance 19).
- **Betting illustration:** assuming books price with the transitive model (ω) while truth is cyclic (τ): TotalWin = **19.5 monetary units per round-robin** from exploiting cyclic miscalibrations alone; Winᵢⱼ > 0 only on edges in support(C_{γs}).

## Leakage assessment
Clean. Simulations are synthetic; EPL is in-sample descriptive + illustrative wagering math (no actual bets placed, no forward testing — acknowledged as illustrative). Theorem B.1/KL-divergence result shows the transitive-fit limit depends on comparison-graph topology (complete vs path graph give very different merits for the same ν ∉ L — a caution for GSE's unbalanced schedules).

## GSE overlap / corpus position
- Complements [1449] (LS paired comparisons) and [1446] (ordinal models): this paper answers "what if the transitive assumption itself is wrong?" — GSE's ratings assume global transitivity; the lack-of-fit test (Theorem 3.2) is a deployable check on every league-week.
- Connects to [1451]'s covariate-BT: cyclicality is a *different* misspecification than omitted covariates; GSE should test both (covariate model vs cyclic model) rather than assuming one.
- The dominance score (Eq. C.2) gives GSE a principled ranking fallback when intransitivity is significant — better than a merit vector that mathematically cannot represent the observed cycles.
- Theorem B.1's topology-dependence warning matters for GSE's unbalanced NFL schedules: transitive-fit merits shift with who-played-whom, even holding results fixed.

## Implementation plan (GSE)
1. Add the cyclic lack-of-fit test (Theorem 3.2) as a weekly diagnostic on GSE's NFL/EPL spread-xG pairwise data; flag weeks/leagues where p < 0.01.
2. When flagged, run FTBS to identify the minimal cyclic triads; surface them as matchup intel ("Team A dominates B, B dominates C, but C dominates A") for the picks desk — these are the games where the market's transitive pricing is most likely wrong.
3. Implement the dominance-score ranking as the published power ranking in flagged regimes (with a "cyclicality detected" annotation), keeping merit ranks as the transitive baseline.
4. Quantify the betting edge: replicate the paper's Winᵢⱼ/TotalWin calculation using GSE's model (τ) vs market-implied (ω) on cyclic edges; size positions only where the cyclic model passes lack-of-fit on walk-forward data.

## Reproducible test
On EPL 2019–2024 xG data: (i) run the Theorem-3.2 lack-of-fit test per season; (ii) in flagged seasons, fit FTBS vs transitive model and compare out-of-sample log-loss on next-season match outcomes; (iii) compute realized TotalWin-style edge on cyclic edges vs market odds. NFL: same pipeline on margin-of-victory data (m small → expect detection only in strong-signal cases, per Summary 4.1).

## Numeric gate
Deploy the cyclic pipeline to production only if, on EPL 2022–2024 walk-forward: (i) lack-of-fit flags ≥ 1 season at p < 0.01; (ii) FTBS-augmented model beats the transitive baseline by ≥ 0.005 log-loss on flagged-season holdout; (iii) the cyclic-edge betting simulation shows positive expected gain net of vig. Otherwise keep the test as a monitoring diagnostic (cheap) without acting on it.

## Improvement experiment
The paper restricts to *complete* comparison graphs and length-3 cycles. GSE experiment: extend FTBS to incomplete graphs (NFL: 17 games/team, not round-robin) — the tick-table machinery needs the incidence-matrix generalization the authors defer — and test detection power on simulated NFL-like schedules with planted cycles. Secondary: longer cycles (r ≥ 4) as first-class dictionary entries for interpretability ("A beats B beats C beats D beats A" narratives for content).
