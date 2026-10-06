# [0523] CoArena: Evaluating Computer-Use and Multi-Agent Systems in Real Time (arXiv:2609.14239v1)

**Citation:** Kovuru, N. and Jannu, P. (2026). *CoArena: Evaluating Computer-Use and Multi-Agent Systems in Real Time*. arXiv:2609.14239v1. URL: https://arxiv.org/abs/2609.14239v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~100,735 chars).
**Verdict:** REJECT — the paper is a design whitepaper for a computer-use agent evaluation platform whose every number is explicitly labeled illustrative or simulated (no empirical measurements exist); the one sports-adjacent element (Bradley-Terry/Elo arena rating) is already covered more usefully by paper [0522].

## 1. Research question
How do you evaluate computer-use agents (desktop/browser agents) in "real time" rather than against fixed, aging benchmarks? The paper formalizes real-time evaluation as five measurable properties (continuous task arrival, live concurrent execution, online rating updates, freshness/contamination resistance, bounded feedback latency), builds the rating machinery for a user-submitted-task arena (two agents execute the same task concurrently in identical sandboxes; blind users judge; public leaderboard refit from votes), and walks through the methodology with a fully worked illustrative example.

## 2. Dataset / schema
- None measured. The paper states explicitly: "Every number in this paper is either derived from stated inputs in the text, produced by a simulation whose generative model and seed are stated, or labeled as illustrative. None is a measurement of a deployed system." Worked inputs: illustrative 5-agent vote matrix (211 votes; cells = wins/losses/ties per row agent); simulation of one day of arrivals (homogeneous Poisson λ=12/hr, lognormal service median 6 min / σ=0.5, 4 concurrent slots, seed 11 → 280 arrivals, 279 battles completed); illustrative task set in Appendix C (6 example computer-use tasks written for the paper).

## 3. Method / model
- Arena design (§3): users submit tasks (intake: auth, consent, duplicate guard, bounded queue); matchmaker draws two agents with exposure weights (n_a + κ)^(−1/2), κ=4, preferring uncertain pairings; both runs execute concurrently in isolated sandboxed desktops with byte-identical inputs; blind judges vote (one side / tie / both unacceptable / abstain), with a redundancy sample of 3 judges for agreement statistics; failure→environment pipeline converts failures into reusable (snapshot, instruction, grader) environments.
- Rating (§5): Bradley-Terry pairwise model, ridge-penalized batch MLE (Newton, centering on settled field), streaming per-vote SGD update (shown to reduce to the Elo update), CIs from projected observed information, cluster-robust (judge-clustered) sandwich, rank bands via seeded parametric bootstrap, provisional-entry floor n_0=30.
- The five real-time properties (§4): formal definitions with equations, per-property time-horizon tiers T0–T4 (Table 1).

## 4. Equations & assumptions
- Arrival counting: N(t) = #{i : s_i ≤ t} (Eq. 1); Property 1: λ = lim_{t→∞} N(t)/t > 0 (Eq. 4); G_max(T) = max(s_{i+1} − s_i) (Eq. 5); P{no arrival in w} = e^(−λw) (Eq. 6).
- Latency decomposition: Lq_b = q_b−s_b, Lp_b = δ_b, Le_b = e_b−(q_b+δ_b), J_b = h_b−e_b, Lr_b = r_b−h_b, Ls_b = ℓ_b−r_b (Eq. 2); machine latency M_b = Lq_b + Lp_b + Le_b + Lr_b + Ls_b (Eq. 3).
- Property 2: (Lq + Lp + Le)_p ≤ H_exec (Eq. 7); offered load ρ = λE[S]/C (Eq. 8); Little's law: E[in system] = λ(E[Lq] + E[S]) (Eq. 9).
- Property 3: staleness ς(t) = t − min{h_b : h_b ≤ t, b not yet reflected} (Eq. 10); refit bound ς(t) ≤ Δ + c (Eq. 11).
- Property 4: contamination indicator c_b = 1{s_b ≤ max_{a∈{a_b,a'_b}} t_cut^a} (Eq. 12); freshness share F(α;t) = Σ_{t−s_b≤α} w_b / Σ_b w_b (Eq. 13); duplicate rate D(θ) = (1/|B|)Σ_b 1{max_{b':s_b'<s_b} sim(τ_b,τ_b') ≥ θ} (Eq. 14).
- Property 5: T^env_u = T^cap + T^red + T^syn + T^val + T^pub (Eq. 15).
- BT model: p_ij = e^θi/(e^θi + e^θj) = σ(θ_i − θ_j), σ(x) = 1/(1+e^−x) (Eq. 16); R_a = R_0 + (400/ln 10)θ_a ≈ R_0 + 173.72θ_a (Eq. 17).
- Log-likelihood: L(θ) = Σ_b w_b[y_b log σ(θ_ib−θ_jb) + (1−y_b)log(1−σ(θ_ib−θ_jb))] (Eq. 18); penalized objective θ̂ = argmax_θ L(θ) − (r/2)‖θ‖²_2, r=10^−3 (Eq. 19); gradient g(θ) = Σ_b w_b(y_b−μ_b)x_b − rθ, neg-Hessian H(θ) = Σ_b w_b μ_b(1−μ_b) x_b x_b^⊤ + rI (Eq. 20).
- Streaming update: θ_ib ← θ_ib + η_ib w_b(y_b − μ_b); on Elo scale R_ib ← R_ib + K_ib w_b(y_b − μ_b), μ_b = 1/(1+10^((R_jb−R_ib)/400)) (Eqs. 21–22); K(n_a) = K_min + (K_max − K_min)n_0/(n_0 + n_a), K_max=48, K_min=12, n_0=30 (Eq. 23).
- Evidence weight: w_b = γ_b·ω̄_b, γ_b ∈ {γ_cal=0.25, 1}, ω̄_b = (1/|V_b|)Σ_{v∈V_b} ω_v ∈ [ω_min=0.1, 1] (Eq. 24).
- CIs: Cov(θ̂) = PH(θ̂)^−1P, P = I − 11^⊤/m; SE(R_a) = (400/ln 10)√Cov_aa; CI95 = R̂_a ± 1.96·SE (Eq. 25); cluster-robust sandwich on judge clusters (Eq. 26).
- Convergence: SE(θ̂_i − θ̂_j) = 1/√(np(1−p)) ≥ 2/√n (Eq. 27); Elo 95% half-width ≥ 681/√n.
- Inter-judge agreement: Fleiss' κ = (P̄ − P̄_e)/(1 − P̄_e) with P̄, P̄_e definitions (Eq. 28).
- Stated assumptions: Poisson submissions; ford condition (strongly connected win/loss graph) for MLE existence; ties as half-wins (acknowledged approximation); shift invariance removed by projection/centering; blind judging; task stream arrives faster than training cutoffs (contamination resistance by construction).

## 5. Features / target
- No predictive target; the arena estimates latent strengths θ_a (one per agent) from pairwise blind-preference outcomes y_b ∈ {1, ½, 0} with evidence weights w_b. The formal contribution is the definition of real-time (five properties) and the rating-estimation algorithms (Algorithms 1–4).

## 6. Validation design
- No empirical validation: all demonstrations are simulations with stated generative models/seeds or worked illustrative examples (convergence of Newton in 5 iterations on the 211-vote example; rating convergence simulation with Bradley-Terry strengths from Table 2, seed 7; one-day arrival simulation, seed 11; the end-to-end battle walkthrough in Appendix C.6). Methodological validation is mathematical (convergence guarantees, concavity, Ford's condition) plus face validity of the worked example.

## 7. Numerical results / baselines
- All numbers illustrative (paper's own caveat): 5-agent worked example ratings — A 1140 (95% CI 1073–1206), B 1050 (988–1111), C 992 (931–1053), D 941 (877–1005), E 877 (809–945); rank bands A: 1–2 (P{first}=0.973), B: 1–3, C: 2–4, D: 3–5, E: 4–5; Newton converged in 5 iterations at tolerance 10^−10.
- Convergence simulation: interval half-width 112 Elo at 100 votes, 52 at 300, 41 at 600; ~68 points after 100 games, ~22 after 1000 (from Eq. 27).
- Simulation worked values (illustrative inputs, stated): λ=12/hr → mean gap 5 min, e^−6 ≈ 0.0025 empty-30min probability, 288 arrivals/day; load ρ = 0.2×6.8/4 = 0.34, mean queue wait 0.09 min, max 2.87 min; freshness share F(7d) = 288×7/20,000 ≈ 0.10; refit staleness ≤ 31 s vs. weekly benchmark 604,800 s (ratio ~2×10^4); feedback latency example T^env = 1,330 s ≈ 22 min ≤ 1 h horizon; end-to-end battle walkthrough: streaming update moved RA 1139.7→1147.7, refit 1142.6.

## 8. Code / data availability
- No code repository stated (Algorithms 1–4 given in pseudocode in Appendix B; platform at CoArena.ai referenced via author affiliation). No real datasets — all examples illustrative by design.

## 9. Leakage & limitations
- The paper itself declares it contains zero empirical measurements of a deployed system — this is a formalism/design paper; there is nothing to falsify or replicate numerically, and any "result" is a worked example, not evidence.
- Acknowledged limitations (§7): human judging latency unbounded by the system; self-judging concentration and task-selection effects uncorrected (rankings don't transfer across workloads); ties-as-half-wins approximation unquantified; rank bands ignore off-diagonal covariance.
- Adversarial notes (mine): the five real-time properties are formalizations of operational requirements, not testable claims; the "contamination resistance by construction" argument (cb = 0) assumes no agent was trained after the task was written — violated by continuous-training pipelines, which the paper doesn't address; the tier table (T0–T4) is a labeling scheme, not an empirical classification.
- NFL external validity: none. The domain is computer-use agent benchmarking; the BT/Elo machinery is domain-general but the arena design (sandboxed desktops, blind judges, failure→environment) has no sports transfer.

## 10. GSE overlap
- Duplicate of the rating machinery; novel formalism only. The Bradley-Terry/Elo components (Eqs. 16–27, streaming Elo, CIs, rank bands) are substantially the same family as [0522]'s Elo-per-token framework — that ledger's §11–13 already specify the GSE model-arena implementation. Existing research map: Elo/TrueSkill/Glicko already inventoried. The real-time evaluation formalism (arrival processes, latency tiers) has no GSE analogue and no sports application. Rated as duplicate-not-new on the useful part, novel-but-irrelevant on the rest.

## 11. GSE implementation spec
- Not recommended for implementation (REJECT). The only salvageable elements are already specified in ledger [0522] (Bradley-Terry arena rating for GSE model versions; per-battle CIs via projected observed information; provisional-entry floors for new models; rank bands instead of point rankings). No separate CoArena-style build is warranted: GSE does not need blind judges, sandboxed execution, or failure→environment pipelines.

## 12. Reproducible test
- Same test as ledger [0522] §12 (the arena-rating experiment); this paper adds nothing testable of its own since all its numbers are illustrative. Any GSE arena should, however, adopt this paper's honest reporting practice: publish intervals and rank bands, not point ranks.

## 13. Acceptance / rejection gate
- REJECT for standalone adoption: there are no empirical claims to verify (all numbers illustrative by the authors' own declaration), the domain (computer-use agent arenas) has no GSE transfer, and the rating methodology duplicates [0522]'s framework. Adopt only the reporting discipline (intervals + rank bands on any GSE model leaderboard), which has no numeric gate.

## 14. Improvement experiment
- If GSE ever runs a blind human-evaluation lane (e.g., judging which of two write-ups/cards reads more like the account voice), apply this paper's vote-quality machinery: graded judge-trust weights (position lean + speed checks), redundant judging with Fleiss' κ, submitter-vote precedence rules, and cluster-robust intervals — the one part of the paper with no equivalent in [0522] and genuinely applicable to human preference data.
