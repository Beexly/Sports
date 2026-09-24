# [0324] A Machine Learning Framework for Off Ball Defensive Role and Performance Evaluation in Football (arXiv:2601.00748v1)

**Citation:** Sean Groom, Francisco Belo, Axl Rice, Liam Anderson, Shuo Wang (2026). *A Machine Learning Framework for Off Ball Defensive Role and Performance Evaluation in Football*. arXiv:2601.00748v1. URL: https://arxiv.org/abs/2601.00748v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1601 lines).
**Verdict:** ADAPT — the soccer corner-kick setting does not transfer, but the method stack (label-free covariate-dependent HMM inferring man/zone roles from tracking data + role-conditioned ghosting + Group Coverage Advantage for defensive credit attribution) ports directly to NFL pass-coverage evaluation on NGS tracking data; adapt by replacing corner-specific emissions with coverage-snap role models and the reception model with a target-probability model.

## 1. Research question
How can off-ball defensive performance be evaluated when successful defense is defined by actions that *don't* occur (prevented passes/shots)? The authors build a label-free covariate-dependent Hidden Markov Model (CDHMM) that infers time-resolved man-marking and zonal assignments from player tracking data during corner kicks (a structured, high-leverage set piece: ~10/match, 11% of 2024/25 EPL goals), then use those roles for (a) interpretable coach-facing behavioral metrics and (b) a novel role-conditioned ghosting framework for counterfactual defensive credit attribution.

## 2. Dataset / schema
EPL player tracking data (25 fps) aligned with synchronized event logs, four seasons 2020/21–2023/24: 14,678 corner sequences extracted (red-card/substitution-error corners excluded); 13,752 after excluding short corners for downstream tasks. Sequences canonicalised (translated/reflected so all deliveries come from the top-right corner; origin at defending team's penalty spot); window = 1 s before the kick, truncated at 2 s after delivery or the 2nd subsequent on-ball event. Goalkeepers excluded from man-marking states. Individual CDHMMs trained per defending team × delivery type (inswinging/outswinging). Data access: proprietary — subject to third-party licensing and club confidentiality, **not shareable**. Code: proprietary club context, **not public** (authors offer implementation Q&A).

## 3. Method / model
(a) **CDHMM**: per defender j, N = K+1 latent states (K=10 man-marking states + 1 zonal state; J=K=10). Zonal emission: D_{t,j} ∼ N(μ_z, Σ_z), 10 zones per team×delivery-type, initial zone assignment via Hungarian (Kuhn-Munkres) on defender-to-zone distances. Man-marking emission: D_{t,j} ∼ N(μ^{(l)}_{t,k}, σ²^{(l)}), μ = γ_o^{(l)} O_{t,k} + γ_g^{(l)} G with γ_o+γ_g=1, per 3m×3m pitch bin l (Γ^{(l)}=[γ_o,γ_g] = marking tightness; defenders mark tighter near goal). Transitions (covariate-dependent): man-marking self-continuation p_m = σ(β_m⊤X^{(m,k)}); switch to another attacker via (1−p_m)·softmax(β_s); man→zonal **prohibited (=0**, per coach guidance); zonal self p_z = σ(β_z⊤X^{(z)}); zonal→man (1−p_z)·softmax(β_s). Covariates (Table 1, standardized): distance/inverse distance to attacker, tangential relative velocity, heading alignment cos θ, convergence metric, attacker/defender heights+weights, Mahalanobis distance to zone. Training: EM (forward-backward E-step; M-step: closed-form zone/Γ updates, L-BFGS-B ≤100 iters for β with λ_m=λ_z=100, λ_s=1000); 10 models × 15 iterations per team×delivery, best by observation likelihood.
(b) **First-contact recipient prediction**: two GNNs on the delivery-time graph (22 nodes, features: x,y,vx,vy,height,weight,corner-taker flag; edge = teammate bool) — canonicalised MLP+GATv2×4 (8 heads, dim 4) vs a D2-equivariant TacticAI reimplementation; weighted cross-entropy (√21 on negative class); Adam + early stopping on val top-3 accuracy.
(c) **Defensive credit attribution**: OBPR_j = Σ_{t,k} γ_{tjk}·(1−Pr(atk)) (expected-state-occupancy-weighted reception suppression); role-conditioned ghosts: Monte-Carlo expected-ghost baselines E_{x|k}[·] sampling defender positions from the CDHMM emission under counterfactual marking roles; counterfactual metrics (10)–(13): Reception Suppression, Recovery Gain, Threat Suppression, Counterattack Value; **Group Coverage Advantage**: GCA_j(t) = G^{opt}_{jt} − G_{jt}(d_{tj}), benchmarking observed positioning against the best feasible man-marking ghost over the attention-weighted feasible attacker set K_{jt} (Eqs. 14–15).
(d) **Coach-facing metrics**: context-aware man-marking attention CA_k, attacker evasiveness ES(k) = φ_goal(t_c)·Δd (separation gain weighted by goal proximity), effective number of initial attackers exp(H) (entropy-based), switch rate.

## 4. Equations & assumptions
Paper's stated equations, copied faithfully:

(1)/(18) Group Coverage Advantage: GCA_{tj} = min_{k′∈K_{jt}} E_{x|k′}[Σ_{k∈K_{jt}} Pr(atk|x)] − Σ_{k∈K_{jt}} Pr(atk|d_{tj}); equivalently GCA_j(t) = G^{opt}_{jt} − G_{jt}(d_{tj}).

(2) Convergence_{t,j,k} = (v_{t,k}−v_{t,j})⊤(p_{t,k}−p_{t,j}) / (‖p_{t,k}−p_{t,j}‖ + ε).

(3) Tangential relative velocity: v^⊥_{t,j,k} = ‖(v_{t,k}−v_{t,j}) − [(v_{t,k}−v_{t,j})·r̂_{t,j,k}] r̂_{t,j,k}‖, r̂ = (p_{t,k}−p_{t,j})/(‖·‖+ε).

(4) Heading alignment: cos θ_{t,j,k} = v_{t,j}⊤ v_{t,k} / (‖v_{t,j}‖‖v_{t,k}‖ + ε).

(5) Transition Q-function (with L2 penalties λ_m‖β_m‖² + λ_z‖β_z‖² + λ_s‖β_s‖²); (6–8) its gradients w.r.t. β_m, β_z, β_s.

(9) OBPR_j = Σ_{t,k} γ_{tjk}·(1 − Pr(atk)).

(10) Reception Suppression Δ^{(r)}_{tjk} = E_{x|k}[Pr(atk|x)] − Pr(atk|d_{tj}); (11) Recovery Gain Δ^{(rec)}_{tjk} = Pr(d_{tj}) − E_{x|k}[Pr(x)]; (12) Threat Suppression Δ^{(th)}_{tjk} = E_{x|k}[P_threat(atk|x)] − P_threat(atk|d_{tj}); (13) Counterattack Value Δ^{(ca)}_{tjk} = P_threat(d_{tj}) − E_{x|k}[P_threat(x)].

(14) w_{tjk} = exp(γ_{tjk}/τ) / Σ_ℓ exp(γ_{tℓk}/τ); (15) K_{jt} = {k : w_{tjk} ≥ θ}; (16) G_{jt}(x) = Σ_{k∈K_{jt}} f_{tk}(x); (17) G^{opt}_{jt} = min_{k′∈K_{jt}} E_{x|k′}[G_{jt}(x)].

Emissions: D_{t,j} ∼ N(μ_z, Σ_z) (zonal); D_{t,j} ∼ N(γ_o^{(l)} O_{t,k} + γ_g^{(l)} G, σ²^{(l)}) (man-marking, bin l). Transitions: P(s_{t,j}=q_k|s_{t−1,j}=q_k) = σ(β_m⊤X^{(m,k)}_{t−1,j}) ≡ p_{m,j,k}; P(s_{t,j}=q_N|s_{t−1,j}=q_k) = 0; P(s_{t,j}=q_N|s_{t−1,j}=q_N) = σ(β_z⊤X^{(z)}_{t−1,j}) ≡ p_{z,j}.

Stated assumptions: (a) defenders act independently (except initial zone assignment); (b) man→zonal transitions never occur (coach-imposed); (c) zonal emissions are bivariate Gaussian (symmetric — authors note defenders may skew toward goal); (d) state durations are geometric (standard HMM — may understate assignment stability); (e) expected state occupancy (full-sequence smoothing) used in OBPR introduces future-information leakage — authors flag forward probabilities as the causally-safe alternative; (f) no "uninvolved" state (forced assignments for distant defenders).

## 5. Features / target
CDHMM inputs: per-frame defender/attacker positions and velocities (25 Hz tracking), heights, weights. Targets: latent role sequences (unsupervised); downstream: first-contact recipient (22-way classification at delivery), reception probabilities Pr(atk|x), expected threat P_threat, and the derived metrics (OBPR, GCA, attention, evasiveness, switch rate).

## 6. Validation design
No labeled role data exists — validation is indirect: (a) qualitative alignment with coaching intuition (zonal structures differ inswing vs outswing; bottom-right quadrant of Figure 7 matches coaches' identification of zonal players); (b) human analyst baseline: 8 Nottingham Forest analysts, 30 routines, top-3 first-contact accuracy 23.75% ± 4.52% from delivery snapshot; (c) GNN top-3 accuracy on fixed 20% test set at 50%/75%/100% training data, paired t-tests between architectures; (d) GCA distributional analysis (Cohen's d, KS, MWU across delivery types and |K|); (e) appendix sensitivity analysis: chronological 10-sequence batches, 10 seeds, tracking zonal-structure disagreement (Hungarian + 2-Wasserstein), transition-weight ℓ2 disagreement, normalized log-likelihood vs sample size. No held-out-team generalization test; no comparison of GCA against simpler baselines (e.g., raw reception probability).

## 7. Numerical results / baselines
All numbers quoted from the paper (paper's claims):
- Human baseline: 23.75% ± 4.52% top-3 first-contact accuracy.
- GNN (100% data): canonicalised 48.07% vs TacticAI reimplementation 47.43% top-3 (paired t-test p=0.0088) — 202% and 200% of human baseline; 75% data: 47.00% vs 46.71% (p=0.0740); 50% data: 44.81% vs 45.22% (p=0.2472). (Original TacticAI paper reported ~75% — authors attribute the gap to event-alignment/annotation differences, not architecture.)
- Corners: ~10 per match; 11% of 2024/25 EPL goals (from StatsBomb event data).
- GCA analysis: Cohen's d < 0.11 for inswing vs outswing (negligible mean difference); KS p = 1.24×10⁻⁴³ vs MWU p = 8.96×10⁻¹⁷ for |K|=1 — delivery type changes the *shape/volatility* of GCA, not its mean; outswinging deliveries produce higher-entropy situations (more elite plays and more severe lapses); GCA variance expands with |K| (1→5).
- Sensitivity: β_m, β_z converge quickly with sample size; β_s (switching) stays variable (rare events); inswing models achieve higher normalized likelihood than outswing.

## 8. Code / data availability
Code: not publicly available (proprietary club context; authors offer implementation Q&A). Data: EPL tracking + event data under third-party licensing and club confidentiality — **not shareable**. Nothing reproducible from the paper's artifacts alone.

## 9. Leakage & limitations
- **Future leakage in OBPR**: uses full-sequence expected state occupancy γ_{tjk} (smoothed posteriors see the future) — authors explicitly flag this; forward probabilities are the causally-safe variant.
- **No uninvolved state, geometric durations, Gaussian zones, no velocity in emissions** — all acknowledged by authors; forced assignments and symmetry assumptions bias role estimates.
- **Coach-imposed zero**: man→zonal transitions prohibited by fiat, not learned — if real defenses do this, the model misattributes.
- **TacticAI replication gap** (47% vs original 75%): attributed to annotation/alignment differences; undermines the architecture comparison's external validity.
- **Proprietary data + code**: independent replication impossible; all quantitative results are trust-me.
- **Set-piece specificity**: corner emissions (fixed zones, goal-line reference frame) do not generalize to open play — authors state this; the NFL analog needs a full redesign of the emission model.
- **No held-out-team test**: models are team-specific; cross-team transfer untested (matters for NFL: 32 teams, can't fit 32 bespoke models cheaply).
- NFL external validity: corner kicks are the most structured play in soccer; NFL coverage has analogous structure (pre-snap alignment → man/zone roles), but the emission model must be rebuilt around route stems and landmarks, not penalty-box bins.

## 10. GSE overlap
Existing map coverage: 2026-09-20 full-tables include **CoverageIQ Ravens cards** and **Statyx coverage/run-type matchups**; the 2026-09-21 NGS glossary includes **coverage-matchup splits**; the paper itself cites **Yurko et al. "NFL Ghosts" (2024)** — NFL ghosting for defender positioning already exists in the literature. What is **absent**: unsupervised *role* inference (man vs zone assignments from tracking) and **role-conditioned** ghosting — i.e., counterfactual baselines drawn from the same tactical role rather than average behavior or defender-absence. DEFCON-style credit attribution (Kim et al., cited) evaluates within fixed structure; this paper's contribution is evaluating *across* alternative role assignments. **Verdict: extension** — the role-conditioned ghosting + GCA pattern extends the coverage-evaluation lane beyond the existing coverage-matchup tables and vanilla NFL ghosting.

## 11. GSE implementation spec
Build an NFL "Coverage Role Ghosting" module on NGS tracking data:
- **Data**: NGS tracking (10 Hz) for passing plays, 2022–2025; pre-snap → 3 s post-snap windows (the NFL analog of the corner sequence); defender/route-runner positions + velocities.
- **CDHMM port**: per-team (or league-pooled with team random effects) CDHMM over coverage snaps; latent states = {man vs receiver k} ∪ {zone landmarks}; zonal emissions = Gaussians over field zones (redesigned: hook/curl, flat, deep third landmarks — not penalty-box bins); man-marking emissions = defender position relative to receiver + QB/ball (replace goal-line G with ball position); transitions allow zone→man and man→zone (drop the soccer-specific prohibition); covariates from the paper's Table 1 translate directly (distance, convergence, heading alignment, tangential velocity).
- **Role-conditioned ghosts**: for each coverage defender, sample counterfactual positions from the emission of the feasible role set (Eqs. 14–15 ported), run through a target-probability model (replace Pr(atk) with P(target|receiver, defender position) — trainable from nflverse + tracking), compute GCA analog = min over role-ghosts of expected group target probability − observed.
- **Product**: per-DB coverage value-added metric ("this corner's positioning suppressed target probability X% more than the best role-ghost") — a differentiated GSE defensive metric for content and the engine's opponent-adjustment; coach-facing profiles (switch rate, effective assignments) for matchup previews.
- **Effort**: 2–3 engineer-weeks (EM implementation exists in pattern from paper 0323's TASC work; the GNN target model is the bigger lift). Start with one team-season as proof of concept.

## 12. Reproducible test
Dataset: publicly released NFL Big Data Bowl tracking data (2025: coverage-focused weeks) or the 2023 BDB line-of-scrimmage set. Protocol: fit a league-pooled CDHMM on weeks 1–8 coverage snaps; on held-out weeks 9–18, compute the GCA analog per defender per play and test whether season-aggregated GCA correlates with out-of-sample (next-season or second-half) opponent passer rating when targeted, beyond PFF coverage grade. Metric: incremental R² of GCA over PFF grade in predicting targeted passer rating. Baseline to beat: PFF coverage grade alone (the "raw rating" analog). Must use forward (filtered, not smoothed) role probabilities to avoid the paper's leakage flaw.

## 13. Acceptance / rejection gate
**Adopt** if, on held-out BDB/NFL tracking data, (a) the CDHMM's Viterbi role assignments agree with a hand-labeled sample of 200 coverage snaps (man vs zone) at ≥ 85% frame accuracy (validates the unsupervised roles are real), AND (b) aggregated GCA adds ≥ 0.05 incremental R² over PFF coverage grade in predicting out-of-sample targeted passer rating. **Reject** if role agreement < 85% (roles are statistical artifacts, not football concepts) or if GCA adds nothing beyond existing coverage grades — then it's a fancier way to restate known evaluations.

## 14. Improvement experiment
Beyond the paper: fix its two structural weaknesses and add the missing NFL piece — (a) add an **"uninvolved"/pattern-match state** and replace geometric durations with a **hidden semi-Markov model** (explicit duration distributions for how long defenders hold assignments — directly addresses the paper's acknowledged duration-model flaw); (b) condition the ghost baseline not on the same team's average role execution but on **opponent-adjusted role execution** (the repo's existing opponent-adjustment conventions), so GCA measures the defender against what *this week's opponent* typically extracts from that role. If pattern-match states emerge unsupervised from NFL data, that alone is a publishable finding and a new coverage taxonomy for GSE content.
