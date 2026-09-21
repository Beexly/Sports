# [0121] Multi-Objective Adaptive Rate Limiting in Microservices Using Deep Reinforcement Learning (arXiv:2511.03279)

**Citation:** Ning Lyu, Yuxi Wang, Ziyu Cheng, Qingyuan Zhang, Feng Chen (2025). *Multi-Objective Adaptive Rate Limiting in Microservices Using Deep Reinforcement Learning*. arXiv:2511.03279v1. URL: https://arxiv.org/abs/2511.03279v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via pdftotext; ar5iv had no HTML conversion — abs page only).
**Verdict:** ADAPT — the constrained-MDP formulation of rate limiting is a directly reusable blueprint for adaptive throttling of GSE's odds-API fetch harness, but the full DQN-A3C training apparatus (48h GPU) is overkill at GSE scale and the paper's headline numbers are internally inconsistent.

## 1. Research question
Can deep reinforcement learning replace fixed-threshold rate limiting in microservices with an adaptive policy that jointly optimizes throughput, latency, and stability under dynamic traffic? The paper formalizes rate limiting as a constrained MDP and proposes a hybrid DQN-A3C agent that adjusts per-service rate-limit thresholds in real time (Section I).

## 2. Dataset / schema
No public dataset. Workload generation used the DeathStarBench benchmark suite (Social Network and Media Service applications, 30+ interconnected microservices) with Locust traffic generation in three patterns: periodic (5:1 peak-to-valley daily cycles), burst (random 30-120 s bursts on baseline), mixed (periodic + bursts + Gaussian noise) (Section V-A). "Production deployment" claim: 90 days, 500 million daily requests — proprietary, unreplicable, and the provenance is not described beyond the claim.

## 3. Method / model
Hybrid DQN-A3C. DQN: input 8-dim state → FC 128-256-128 (ReLU) → 7 Q-values; Huber loss on TD error; replay buffer 100,000, batch 64; target network sync every 1,000 steps; epsilon-greedy decay 1.0→0.05 over 50,000 steps. A3C: shared 2-layer (128, 256) extractor + separate actor (softmax) and critic heads; n-step returns with n=20 (per Section III-B; Table 1 lists n-step returns = 5 — paper is internally inconsistent here); 16 async workers updating every 20 steps; loss L_total = -log π(a|s) A(s,a) + βV(V(s)-V_target)² - βH H(π), βV=0.5, βH=0.01. Fusion: weighted probabilistic choice between DQN and A3C action candidates, α scheduled 0.3→0.7 over training. Reward: r = 0.5·R_throughput + 0.4·R_latency + 0.1·R_stability. Training: 100,000 steps, ~48 h. Decision latency 2-5 ms CPU, <1 ms GPU (Section III).

## 4. Equations & assumptions
Quoted as in paper (transcribed from PDF; notation like γ, ε rendered faithfully where readable):

(1) State vector: s_t = [r_t, c_t, m_t, θ_t, τ_t, q_t, e_t, f_t] — request rate, CPU util, memory util, current threshold, avg response time (ms), queue length, error rate, temporal features.

(2) Discrete action space: A = {-50%, -20%, -10%, 0, +10%, +20%, +50%} (percentage change of current threshold).

(3) Reward: r_t = w1·R_throughput + w2·R_latency + w3·R_stability, with R_throughput = N_success/N_total; R_latency = 1 if τ_t ≤ τ_target else exp(-α(τ_t - τ_target)); R_stability = -|θ_{t+1} - θ_t|/θ_t; weights w1=0.5, w2=0.4, w3=0.1.

(5) Objective: π* = argmax_π E_{τ~π}[Σ_{t=0}^T γ^t r_t], γ=0.99.

(6) DQN loss: L(θ) = E_{(s,a,r,s')~D}[L_δ(δ)], δ = r + γ max_a' Q(s',a';θ⁻) - Q(s,a;θ) (Huber loss of TD error).

(7) ε-greedy schedule: ε_t = max(ε_min, ε_0 - (t/T_decay)(ε_0 - ε_min)).

(8) Advantage: A(s_t,a_t) = Σ_{i=0}^{n-1} γ^i r_{t+i} + γ^n V(s_{t+n};θ_V) - V(s_t;θ_V).

(9) A3C total loss: L_total = -log π(a_t|s_t;θ_π)·A(s_t,a_t) + β_V(V(s_t;θ_V) - V_target)² - β_H H(π), H(π) = -Σ_a π(a|s) log π(a|s).

Stated assumptions (Section II-B): token-bucket limiter assumed but "specific algorithm immaterial"; fixed weights w1-w3; frozen-period none stated; constraints P(τ_t > τ_max) ≤ ε_latency, E[e_t] ≤ ε_error, max(c_t,m_t) ≤ ρ_max, θ_min ≤ θ_t ≤ θ_max — constraint thresholds τ_max, ε_latency, ε_error, ρ_max, θ_min, θ_max values not given ("Not stated in paper").

## 5. Features / target
Input features (exact, Eq. 1): request rate r_t (req/s), CPU utilization c_t ∈ [0,1], memory utilization m_t ∈ [0,1], current rate-limit threshold θ_t, average response time τ_t (ms), request queue length q_t, error rate e_t, temporal features f_t (sinusoidal hour-of-day encoding + EWMA β=0.9 of metrics). Target: optimal threshold-adjustment action from the 7-class discrete set. Prediction horizon: single control step (~10 s metric scrape interval; rate-limit updates ≥30 s apart to prevent thrashing).

## 6. Validation design
No train/val/test split of a dataset — RL policy trained 100,000 steps on simulated DeathStarBench workloads; compared against 5 baselines: fixed threshold, CPU-based dynamic limiting, AIMD, PID controller, simple DQN (Section V-A). Metrics: throughput (req/s), latency distributions (P50/P90/P99 ms), availability, CPU/memory utilization, SLA compliance (500 ms latency threshold). Not time-ordered split — not applicable (simulator-based).

## 7. Numerical results / baselines
Paper's claims (note internal inconsistency): Abstract claims **23.7% throughput improvement and 31.4% P99 latency reduction** vs fixed-threshold under high load; Introduction claims **30.9% throughput, 38.2% P99 latency reduction, 98.7% SLA compliance, 2-5 ms decision latency**; Conclusion claims 30.9% average throughput improvement and 38.2% P99 latency reduction "across diverse traffic patterns". Per-pattern (Section V-B): throughput 10,850 / 9,110 / 9,580 req/s for periodic/burst/mixed = +30.9% / +31.7% / +31.0% over fixed thresholds; P99 latency 410 / 710 / 550 ms. Production claim: 82% reduction in service degradation incidents, 68% decrease in manual interventions over 90 days at 500M daily requests. Ablation (Section V-B, Figure 6): removing experience replay -9.7%, target network -6.3%, A3C component -4.8%, temporal features -3.9%; hybrid beats DQN-only by 5%. Training: reward from ~-50 to >120, convergence near step 80,000. These are the paper's claims; the abstract-vs-body number mismatch is an interpretation risk flagged here.

## 8. Code / data availability
"Not stated in paper" — no repository link, no data link given.

## 9. Leakage & limitations
Adversarial read: (a) headline numbers inconsistent across abstract/introduction/conclusion (23.7% vs 30.9% throughput) — suggests sloppy or cherry-picked reporting; (b) the 90-day, 500M-request "production deployment" by a 5-student team with no named company or infrastructure detail is implausible and unverifiable; (c) A3C n-step horizon stated as n=20 in text but n=5 in Table 1 — inconsistent; (d) baselines are weak (fixed threshold, naive CPU-proportional, AIMD, PID) — no comparison against modern adaptive limiters or model-based RL; (e) no statistical significance, no confidence intervals on the headline numbers despite Figure 3's shaded CI; (f) external validity to NFL: none directly — this is infra research; the GSE application is the API-fetch harness, not the engine model. Reward weights (0.5/0.4/0.1) asserted, not ablated.

## 10. GSE overlap
From existing-research-map.md: no prior infra rate-limiting research in the corpus — the API-consumption work is practical (2026-09-18-props-reverse-engineering/firecrawl = API deep-dives: OddsPapi, APIVault, FreePublicAPIs, TheSportsDB, historical-odds/stats-apis link lists), not algorithmic. GSE consumes many rate-limited APIs (Odds API 20K credits/month plan at $30/mo; APIVault; FreePublicAPIs; TheSportsDB; nflverse pulls). This is a NEW capability in the research corpus — no duplication.

## 11. GSE implementation spec
Adapt the constrained-MDP idea to GSE's data-fetch harness, NOT the full DQN-A3C: (a) define state = per-API [remaining quota, time-to-reset, recent 429 rate, EWMA request latency, queue depth of pending fetches]; (b) action = throttle interval adjustment from {-50%,-10%,0,+10%,+50%}; (c) reward = w1·successful-fetches + w2·(1 if no 429 else exp penalty) + w3·(-|Δinterval|/interval), adapting Eq. 3-4. Start with a tabular/bandit-free rule-based controller (e.g., AIMD on 429s — the paper's own weak baseline) before any RL; RL is justified only if fetch volume exceeds ~1M calls/day, which GSE is nowhere near. Estimated effort: 1 day for the rule-based adaptive throttler in the fetch harness; 2+ weeks wasted if we chase the DQN-A3C. Do NOT build the neural policy.

## 12. Reproducible test
Dataset: GSE's own fetch logs (The Odds API + nflverse + FreePublicAPIs calls over 2026-09-21 → 2026-09-28). Metric: 429 rate per 1,000 requests and median time-to-complete a full data pull. Baseline: current fixed sleep interval between requests. Test window: one week of daily pulls. Gate criteria in §13.

## 13. Acceptance / rejection gate
ADOPT the rule-based adaptive throttler iff 429 errors drop ≥50% vs the fixed-interval baseline AND median full-pull completion time does not increase >20% on the 1-week test window; reject the neural-RL component unconditionally (insufficient call volume to justify training).

## 14. Improvement experiment
One follow-up: replace the hand-set reward weights with a contextual-bandit over (API, time-of-day) that learns the throttle interval online from 429 feedback alone — simpler than full DQN, converges with GSE's actual low call volume, and directly optimizes the real cost (wasted credits on 429s count toward quotas on some providers, e.g., OpenAI-style).
