# [0040] Match Chat: Real Time Generative AI and Generative Computing for Tennis (arXiv:2509.12592v1)

**Citation:** Aaron Baughman, Gozde Akay, Eduardo Morales, Rahul Agarwal, Preetika Srivastava (2025). *Match Chat: Real Time Generative AI and Generative Computing for Tennis*. arXiv:2509.12592v1. URL: https://arxiv.org/abs/2509.12592
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 808 lines).
**Verdict:** ADAPT — the live Likelihood-to-Win design (pre-match XGBoost blended with exponentially-decayed momentum, weighted by closeness to victory) is a portable in-play modeling recipe for NFL live spread/total surfaces; the tennis chatbot stack itself is not transferable to GSE.

## 1. Research question
How to deploy a real-time, agent-driven GenAI assistant that answers live tennis match queries accurately at Grand-Slam scale, and what design patterns make consumer-facing agentic systems fast, precise, and usable? The paper's two substantive technical contributions: (1) a live Likelihood-to-Win prediction engine for professional tennis (§3.3), and (2) a "Generative AI shielding" architecture that offloads >50% of traffic from LLM inference (§5.1). Match Chat debuted at the **2025 Wimbledon Championships** and the **2025 US Open** (127 matches per main singles draw × men's and women's draws × two tournaments = 508 matches total; §5 references 254 singles matches per tournament).

## 2. Dataset / schema
Not a research dataset but a production data architecture: **streaming match data + static data** (§3). Live feeds: 300+ statistical measures accumulated per match (aces, first/second serve success rates, break points won, unforced errors, serve/return/rally/directional patterns, distance run, tiebreak/set/game scores, point-by-point durations, point-by-point feed with break points, unforced errors, serve speeds, rally lengths), updated "within seconds of the live event" and streamed via MQTT pub-sub into a JSON Live Likelihood to Win feed distributed through a CDN. Static data held constant per tournament: player profiles (seed, ranking, nationality, gender, height, weight, DOB), head-to-head records (match win counts + location/date metadata), cumulative career win-loss, current-year stats to event start, Grand Slam titles, prior-year result at the same Slam, plus curated GenAI summaries. Dynamically accumulated: total court time after each match, in-match player stats. Evaluation data: 544 gold-standard questions from two human annotators (Table 2/6.1), 627 manually annotated user questions augmented with WordNet to 1379 exemplars for classifier training, a 2,664-term slur/profanity database for HAP testing, and a 33-user usability study across both Slams.

## 3. Method / model
Three separable subsystems:
- **Likelihood-to-Win prediction engine (§3.3, Figure 2):** Pre-match probability from XGBoost decision-tree models: without head-to-head history, P^pre_match(p₁=wins, p₂=losses | e^pre) = dt^pre(e^pre) with features player age, proprietary Watson Power Index, recent form, surface preference, historical win ratios; with H2H, dt^h2h(e^h2h) adds number of matches, sets won, game ratios. In play, the system transitions to a point-by-point live model: match state S(t) = (sets_p1, sets_p2, games_p1, games_p2, points_p1, points_p2), updated by transition function S(t+1) = f(S(t)) encoding tennis rules; per-point momentum M_x(t) updated recursively with context-weighted deltas, decayed exponentially by match completion percentage, scaled relative to both players, then blended with the pre-match probability using a weight w(t) depending on remaining points needed; a final set-booster scales by sets won (see §4).
- **Match Chat agentic architecture (§5, eqs 13–17):** MC = {S_d, A_J, K_L, H_l, C_I, F', D_s} — Data Synthesizer S_d (135 pre-defined data synthesis patterns), agent bank A_J (LangGraph graphs; agents: A_I initialization, A_L tools/data-extractor selection, A_M fact generation using LLaMA 3-3 70B Instruct, A_N judge, A_O corrective), knowledge base K_L, HAP pipeline H_l, question classifier C_I, feeds F' = {H2H, MStats, Sc, L2W, WPI, PStats, Draw, MLog, Slam}. Akamai caching layer with 2-second TTL; Middleware application MW (30 replicas/region × 3 regions, 2 CPU/4GB RAM) does intent routing and classification; Custom Extension application CE (60 replicas/region, 4 CPU/12GB RAM) hosts agent graphs. **GenAI shielding (§5.1):** queries answerable from structured feeds bypass the LLM entirely (>50% of traffic); a heavyweight synthesizer fallback uses MiniLM-L6-v2 cosine similarity over 600 generated sentences when the LLM exceeds a 6-second timeout.
- **Question classifier (§5.3):** keyword features + all-MiniLM-L6-v2 embeddings (22M params, ~100MB) into a Random Forest (100 trees); low-confidence queries (z-score threshold 1.2) route to the knowledge base. HAP pipeline (§5.2): 5 stages (proper-noun disambiguation, profanity detection, custom slur detection, suspicious-pattern/injection detection, pronoun correction) on a distilled distilbert-base-uncased POS model.

## 4. Equations & assumptions
Likelihood-to-Win (§3.3), quoted faithfully from the paper:
- (1) P^pre_match(p₁=wins, p₂=losses | e^pre) = dt^pre(e^pre), where e^pre = {player age, Watson Power Index, recent form, surface preference, historical win ratios}
- (2) P^pre_match,h2h(p₁=wins, p₂=losses | e^h2h) = dt^h2h(e^h2h), e^h2h extends e^pre with H2H matches, sets won, game ratios
- (3) P_live,cond(p₁=wins, p₂=losses | e_live,t)
- (4) S(t) = (sets_p1, sets_p2, games_p1, games_p2, points_p1, points_p2)
- (5) S(t+1) = f(S(t))
- (6) ΔM_x(t) = α·g(S(t)) on a point won by x (context weight g emphasizing high-pressure scenarios like break points)
- (7) ΔM_x(t) = −β·g(S(t)) on a point lost
- (8) M_x(t) = M_x(t−1) + ΔM_x(t)
- (9) M^decayed_x(t) = M_x(t)·e^{−λ·c(t)}, c(t) = match completion percentage
- (10) M^scaled_x(t) = M^decayed_x / (M^decayed_x + M^decayed_y)
- (11) P_live(t) = P^pre_match·(1 − w(t)) + M^scaled_x(t)·w(t), w(t) depends on number of remaining points needed by each player
- (12) P^final_live(t) = P_live(t)·(1 + s_x/S), s_x = sets won by x, S = sets required to win
Architecture equations: (13) MC = {S_d, A_J, K_L, H_l, C_I, F', D_s}; (14) F' = {H2H, MStats, Sc, L2W, WPI, PStats, Draw, MLog, Slam}; (15)–(17) the MW → CE → POST pipeline; (18) H_l = {E_l,1 … E_l,5}; (19)–(21) the agent graph G = (V, E), V = A_J = {A_I, A_L, A_M, A_N, A_O}.
**Assumptions:** momentum can be modeled as an additive, context-weighted, exponentially-decayed quantity; blending momentum with the static pre-match probability by remaining-points weight is a valid probability combination (no calibration analysis is offered); XGBoost on historical matches generalizes across men's and women's singles; factual Q&A accuracy is the right success metric for a fan assistant. Hyperparameter values for α, β, λ, w(t), and the XGBoost configs are **not stated**.

## 5. Features / target
For the pre-match model: player age, proprietary Watson Power Index, recent form, surface preference, historical win ratios (+ H2H matches, sets won, game ratios when available). Target: P(player 1 wins match). For the live model: current score state, point outcomes, momentum, fatigue decays, advantage factors. Target: live P(player 1 wins | state at time t). For the Q&A system: user queries (100-character limit) → factual answers from feeds; success measured by the 0–100 judge scores on factualness and relevance (threshold 80/80).

## 6. Validation design
Production deployment evaluation, not a research experiment: two Grand Slam deployments under real load. 544 gold-standard questions from two independent annotators used to measure response time (Table 2) and judge-pass accuracy (Table: Tool-to-LLM avg 6.42s, SD 3.02, max 25.42s; Synthesizer-to-LLM 1.24s; Synthesizer-only 0.21s). Stress test: 600 concurrent users at 490 RPS without GenAI Shield → 20.10s average response; with shield + horizontally scaled LLM infra at 120 RPS across 4 regions → ≤6s per query. Design requirement: peak 900 RPS, sustain 450 RPS (vs. ~17 RPS default limits on Bedrock/Azure OpenAI). Question classifier: trained on 1,263 questions, tested on 116 samples → precision 84%, recall 85.7%, accuracy 85.7% (macro-average precision 84% reported separately). HAP: tested against a 2,664-term slur database + standard Python derogatory-term libraries across ten user sessions (>1,000 questions) → zero false negatives; a small number of false positives (player names) fixed by an allowlist → zero false positives after. Distilled POS model: 93.7% recall / 93.3% precision / 94.7% accuracy on UD English Web Treebank (12,543 train / 2,000 val / 2,077 test), 3 epochs, lr 2e-5, weight decay 0.01. **No baselines, no ablations, and no calibration/accuracy evaluation of the Likelihood-to-Win model itself** — the paper never reports Brier score, log-loss, or reliability of the win probabilities.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Abstract deployment numbers: "answer accuracy of 92.83% with an average response time of 6.25 seconds under loads of up to 120 requests per second (RPS)"; "Over 96.08% of all queries were guided using interactive prompt design"; "maintained 100% uptime and supported nearly 1 million unique users" across both Slams.
- 92.83% is the **judge pass rate** at the 0.8 threshold across both judge dimensions (factualness, relevance); the other 7.17% fell back to knowledge base / synthesizer answers.
- Token stats (Table 3): average prompt tokens 1,226.65 (SD 31.73, max 1,327); completion 34.97 (SD 16.25, max 207); total 1,261.61.
- Factual thresholding (Table 4, precision/recall cosine-similarity thresholds): Match Statistics 0.69/0.4; Player Statistics 0.65/0.4; Predictions 0.56/0.4; Biographics 0.66/0.45; Logistics 0.48/0.4; Live Point-by-Point 0.80/0.4.
- Usability study (33 users): 81% found Match Chat helpful for contextualizing matches; 69% found the interface low-friction; 63% called the design intuitive; 19% were uncertain about information sources; 38% did not understand how match predictions were generated.
- Engagement: double-digit increase in average session duration and unique page views across both tournaments; 65% of interactions occurred during live matches.
- No comparative baselines for any metric.

## 8. Code / data availability
None stated. Proprietary IBM stack (watsonx, LLaMA 3-3 70B on IBM-hosted hardware, watsonx Orchestrate); no code, no data, no model weights. The Watson Power Index feature is proprietary. Funding: IBM Corporate Marketing/Project Support; property partners USTA and Wimbledon.

## 9. Leakage & limitations
- The Likelihood-to-Win model — the one piece directly relevant to GSE — is specified only to a conceptual level: the XGBoost features are named but not defined (WPI is proprietary), α, β, λ, w(t), tree configs, and training windows are all unstated, and the paper reports **no predictive-accuracy evaluation at all** (no Brier, log-loss, or reliability curve). It is a deployed product feature, not a validated model.
- Tennis-only features (H2H, surface preference, break points, set booster) have no direct NFL analogues; porting requires redesigning the feature layer entirely.
- The 92.83% "accuracy" is a chatbot Q&A judge-pass rate, not a model benchmark; the draft's characterization of it as a product QA metric is correct.
- 6.25 s average response is slow for interactive use; the paper frames it as acceptable for this domain.
- Agent architecture is generic consumer-product RAG/agentic practice (LangGraph, intent classification, HAP filtering) with no novel research contribution; IBM-proprietary deployment.
- 33-user usability study is too small for strong UX claims.

## 10. GSE overlap
Partial, and specifically additive. The existing-research map §4 gap list item 7: **"In-play / live NFL spread & total modeling — iWinRNFL covers in-game WP; live *spread/total* probability surfaces are thin."** The paper's live-likelihood design — a pre-game win-probability model blended with an exponentially-decayed momentum term, weighted by closeness to game end (eqs 6–12) — is a concrete in-play modeling recipe that maps to this gap: pre-game P(win) from GSE's engine, momentum from in-game EPA/win-probability deltas, blend weight increasing as the game progresses. GSE has no momentum-blend live model in the repo (iWinRNFL is a different approach; the ML brief's state-space topics don't include this). The chatbot/Q&A architecture is product tooling, not engine research — worth nothing more than the two product design notes (GenAI shielding to offload LLM inference; 96.08% guided-prompt design) filed for any future GSE fan-facing surface. **Extension**, not duplicate.

## 11. GSE implementation spec
Port only the live-likelihood design pattern to an NFL live-model experiment:
1. **Pre-game anchor:** GSE engine's pre-game win probability P_pre (already produced for the daily card; model v5.2.7).
2. **NFL momentum term:** per-drive in-game performance vs. pre-game expectation — e.g., cumulative EPA delta vs. expected EPA/play through drive t, signed; compute ΔM per drive with context weight g(S(t)) = leverage (score differential × time remaining), replacing the paper's α/β constants with calibrated scales.
3. **Decay and scaling:** M_decayed(t) = M(t)·e^{−λ·c(t)}, c(t) = fraction of game elapsed (drives completed / expected total); scale vs. opponent symmetric momentum.
4. **Blend:** P_live(t) = P_pre·(1−w(t)) + M_scaled(t)·w(t), w(t) rising with game completion; replace the paper's set-booster with a score-differential/possession booster.
5. **Calibration:** fit λ, w(t) shape, and context weights by minimizing log-loss on 2020–2024 nflverse play-by-play in-play data; baseline to beat: nflfastR's in-game WP (vegas-adjusted) and a naive P_pre-only model.
6. Data: nflverse (in hand); serving: batch-recompute per drive during live games for the X/content operation; latency requirements far looser than the paper's 6-second SLA.
7. Effort: ~3–5 days (feature engineering + calibration; no LLM components needed).
The shielding/Q&A architecture needs no build — it is filed as product notes only.

## 12. Reproducible test
nflverse play-by-play 2020–2024 (reg + playoffs), excluding the paper's tennis model entirely: implement the momentum-blend live model (§11 steps 1–5) and evaluate in-play win-probability forecasts at each drive start. Metric: mean log-loss and Brier score vs. baselines: (a) GSE pre-game P_pre held constant, (b) nflfastR in-game WP, (c) the paper-analogue momentum model with λ=0 (no decay). Time window: 2022–2024 seasons as test, 2020–2021 as calibration fit. Success = the momentum-blend model beats nflfastR in-game WP on log-loss over the test window by a margin exceeding calibration noise.

## 13. Acceptance / rejection gate
**Adopt** the momentum-blend live model as GSE's in-play WP/spread engine component if, on the 2022–2024 test window, it beats nflfastR in-game WP on mean log-loss by ≥ 0.005 **and** the fitted λ > 0 (decay is actually doing work, not degenerate). If it does not beat nflfastR WP, or λ collapses to 0, **reject** and keep the existing iWinRNFL/nflfastR in-play references. The chatbot architecture itself is rejected for the research ledger — no engine value.

## 14. Improvement experiment
Replace the paper's hand-specified exponential decay and remaining-points blend weight with a **learned temporal kernel**: parameterize w(t) and the momentum decay as functions of (score differential, time remaining, timeouts, field position) via a small neural net trained jointly with the blend on log-loss, keeping the paper's additive-momentum structure. Test whether the learned kernel beats the paper's fixed e^{−λ·c(t)} form — the paper hard-codes the dynamics, and NFL game scripts (comeback leverage, garbage time) are exactly where a learned kernel should dominate a fixed decay.
