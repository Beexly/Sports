# Next 50 repos (wave 2, rank-adjusted wave 3)

Adopt: **pattern** | **dependency** | **skill-doc** | **ignore**

1. promptfoo/promptfoo — eval CI — eval — dependency (already `eval:prompts`)
2. confident-ai/deepeval — pytest agent metrics — eval — pattern
3. BerriAI/litellm — cost routing — money — pattern
4. neeljshah/clvtrack — CLV benchmark — model — pattern
5. mberk/shin — Shin de-vig — model — pattern (we have `shin-devig.ts`)
6. agentskills/agentskills — SKILL.md standard — ops — skill-doc
7. finite-sample/calibre — CenteredIsotonic — model — pattern (**CIR in-repo**)
8. langchain-ai/agentevals — trajectory scorers — eval — pattern
9. langchain-ai/openevals — LLM-judge — eval — pattern
10. UKGovernmentBEIS/inspect_ai — formal evals — eval — pattern
11. vercel/ai — AI SDK agents — code — ignore (decision: not adopt full stack)
12. inngest/inngest — durable jobs — ops — pattern
13. anthropics/skills — reference skills — ops — skill-doc
14. growthbook/growthbook — flags — ops — pattern (LIVE_BOARD only)
15. Arize-ai/phoenix — traces→datasets — eval — pattern
16. comet-ml/opik — obs+evals — eval — pattern
17. openstarterkit/nextjs-saas-starter-kit — Stripe patterns — money — pattern
18. LeSingh1/edge-models — isotonic props — model — pattern
19. Unleash/unleash — flags — ops — pattern
20. great-expectations/great_expectations — data Expectations — ops — pattern
21. RANDCorporation/judge-reliability-harness — judge QA — eval — pattern
22. RexOwenDev/saas-billing-starter — webhook UNIQUE pattern — money — pattern
23. triggerdotdev/trigger.dev — long AI jobs — ops — pattern
24. arturwojnar/hermes — outbox pattern — ops — pattern (ours already solid)
25. Flagsmith/flagsmith — flags — ops — pattern
26. truera/trulens — agent tracking — eval — pattern
27. Adi7710/kalshiquant — settlement-tape calibration — model — pattern
28. restatedev/ai-examples — durable AI SDK — code — pattern
29. Giskard-AI/giskard — LLM testing — eval — pattern
30. agentscope-ai/OpenJudge — graders — eval — pattern
31. Reymes/football-match-prediction — honesty vs market — model — pattern
32. dunika/outbox-event-bus — Prisma outbox — ops — pattern
33. conorwalsh99/ml-for-sports-betting — calibration selection — model — pattern
34. langfuse/langfuse — LLM obs — ops — pattern
35. open-feature/js-sdk — flag abstraction — ops — pattern
36. sodadata/soda-core — light data checks — ops — pattern
37. vercel-labs/ai-sdk-gateway-demo — gateway tags — inference — pattern
38. JudgmentLabs/judgeval — judge eval — eval — pattern
39. PeteChu/idempotent-webhook-relay — pattern only — money — pattern
40. portkey-ai/gateway — alt gateway — inference — pattern
41. stanfordnlp/dspy — GEPA compile — code — pattern (`scripts/dspy-gse`)
42. resendlabs/react-email — transactional email — dist — pattern
43. upstash/qstash — HTTP jobs — ops — pattern
44. posthog/posthog — product analytics — dist — pattern
45. boat-to/harbor — e2e agent eval — eval — pattern
46. Kiln-AI/Kiln — eval+optimize — eval — pattern
47. strands-agents/evals — agent evals — eval — pattern
48. mperi1208/value-bet-model — calibration paradox lessons — model — skill-doc
49. novuhq/novu — notifications — dist — pattern
50. Flipt-io/flipt — flags GPL → ignore — ops — ignore

Hard non-goals: Multica/GPL agent platforms, GPU foundation train, Polymarket without counsel, rewrite outbox/webhook.

## Wave 4 — founder intake 2026-08-26 (queued, unreviewed)

Same lens applies at review time: **pattern** | **dependency** | **skill-doc** | **ignore**.
Descriptions fetched at queue time; adoption decided at review, founder-gated to WIRE.

51. AlkaiDynamics/Substrate-Mechanics — founder-org: pre-geometric tensor-field physics framework + QuTiP sims — off-domain — review as founder IP
52. AlkaiDynamics/BURGAMOTS — founder-org: PINN (DeepXDE) planetary-forcing solar/atmospheric model, TS/React — off-domain; PINN method notes only
53. AlkaiDynamics/P-li — founder-org: "Reconstruction of the Gateway Tapes" AI-Studio app — off-domain — review as founder IP
54. AlkaiDynamics/repolens — founder-org: AI repo-analysis web app (Next.js/TS, mgithub.com prefix UX) — ops — pattern (fleet repo-review tooling)
55. preset-io/agor — multiplayer agent-orchestration workspace, per-branch dev envs + MCP — ops — pattern (license gate: BSL 1.1)
56. github/gh-aw — agentic workflows in Markdown compiled to GitHub Actions, read-only defaults + validated writes — ops — pattern (strong fleet fit)
57. google/gvisor — userspace application kernel sandbox (runsc) — ops/security — pattern (agent sandboxing)
58. arXiv:2607.00164 — RL with verifiable rewards for calibrated probabilistic forecasting; label-free state-conditioned win-rate reward; 7B model matches betting-market calibration — model/calibration — pattern (HIGH: direct engine relevance)
59. arXiv:2606.18805 — reference-dependent emotions → risky post-game driving near stadiums — content/responsible-gaming — skill-doc (bias-mirror + RG content angle)
60. arXiv:2603.17866 — Bayesian multilevel step-and-turn models on NFL tracking data; simulated counterfactual movement metrics — model — pattern (player-movement → props/fantasy)
61. arXiv:2309.15253 — NN + MILP optimal DFS lineups, validated vs DraftKings field (~31st pctile) — model/fantasy — pattern (honest benchmark for the DFS optimizer)

## Wave 5 — founder paper intake 2026-08-26 (33 arXiv papers, classified)

Classified by an 11-lane fetch sweep + lens rules (pattern needs a portable method with a named GSE angle).
Note: many were "NFL" keyword collisions (No-Free-Lunch, nerve-fiber-layer, neural-feedback-loop, negative-federated-learning) — classified honestly as ignore.

62. arXiv:2405.07226 — Separable Power of Classical and Quantum Learning Protocols Through the Lens of No-Free-Lunch T — ignore — none — quantum learning theory; keyword collision on 'NFL' (No-Free-Lunch, not football)
63. arXiv:2403.04146 — FL-GUARD: A Holistic Framework for Run-Time Detection and Recovery of Negative Federated Learni — ignore — none — federated learning systems work; 'NFL' here means Negative Federated Learning, no GSE fit
64. arXiv:2306.03481 — Transition Role of Entangled Data in Quantum Machine Learning — ignore — none — quantum machine learning theory, no portable method for GSE
65. arXiv:2303.05774 — NFL Career Success as Predicted by NFL Scouting Combine — skill-doc (medium) — Reference for fantasy projections: cautions agents against weighting Combine/athletic-testing features for long-horizon player value; useful prior on which rookie signals carry projection information
66. arXiv:2510.07297 — Agentic generative AI for media content discovery at the National Football League — skill-doc (low) — Ops-side reference: query decomposition plus semantic caching pattern for agent fleets querying GSE's historical picks/odds database; no modeling content
67. arXiv:2603.03613 — Empirical Evaluation of No Free Lunch Violations in Permutation-Based Optimization — skill-doc (low) — Cautionary reference for GSE eval harness design: model/algorithm rankings can be artifacts of benchmark construction, so backtests and agent evals should vary objective formulation before trusting rankings. No directly portable method.
68. arXiv:2603.25901 — Decoding Defensive Coverage Responsibilities in American Football Using Factorized Attention Ba — pattern (medium) — Directly portable to GSE fantasy player tracking/movement models: factorized attention over multi-agent trajectories for matchup/coverage inference, feeding WR/CB matchup features into projections and DFS optimization; contingent on tracking-data access.
69. arXiv:2503.04638 — No Forgetting Learning: Buffer-free Continual Learning Classification — ignore — none — 'NFL' here means No Forgetting Learning; vision continual-learning method with no sports or prediction-market fit.
70. arXiv:2410.00145 — Constraint-Aware Refinement for Safety Verification of Neural Feedback Loops — ignore — none — 'NFL' is neural feedback loops; control-systems safety verification, no GSE fit.
71. arXiv:2406.03663 — A Hybrid Deep Learning Classification of Perimetric Glaucoma Using Peripapillary Nerve Fiber La — ignore — none — 'NFL' is nerve fiber layer; ophthalmology diagnostics, no GSE fit.
72. arXiv:2402.10979 — SportsMetrics: Blending Text and Numerical Data to Understand Information Fusion in LLMs — skill-doc (medium) — Reference for ops/evals: GSE's Claude content layer must not fabricate stats; SportsMetrics-style adversarial tasks inform eval harness design for LLM numeric fidelity on game data.
73. arXiv:1905.03710 — Bilinear discriminant feature line analysis for image feature extraction — ignore — no fit
74. arXiv:1805.01271 — NFL Injuries Before and After the 2011 Collective Bargaining Agreement (CBA) — skill-doc (low) — Background note for fantasy projections/content: cautions against naive causal claims about league rule changes and injury rates; no portable method.
75. arXiv:2206.13222 — ML-Based Approach for NFL Defensive Pass Interference Prediction Using GPS Tracking Data — skill-doc (low) — Reference for player tracking/movement modeling: documents limits of positional data for rare-event penalty prediction and the recall-first filter pipeline idea; GSE lacks the GPS data to port it directly.
76. arXiv:1906.03339 — next-gen-scraPy: Extracting NFL Tracking Data from Images to Evaluate Quarterbacks and Pass Def — pattern (medium) — Port the CPAE-style above-expectation modeling (GAM expected-completion surfaces) into fantasy QB/defense projections and factor trails; the image-scraping component itself must go through the Scraping Clearance Engine and is likely rights-gated.
77. arXiv:1906.11373 — Unsupervised Methods for Identifying Pass Coverage Among Defensive Backs with NFL Player Tracki — pattern (medium) — Portable to the fantasy domain's player tracking/movement models: unsupervised GMM clustering with soft probabilistic assignments could auto-label defensive schemes and roles as features for projections and matchup-adjusted DFS optimization.
78. arXiv:2606.24443 — Verifiable Auto-Formalization of Mathematics Using a Relaxed Natural Formal Language — ignore — no fit
79. arXiv:2505.23703 — Let's Reason Formally: Natural-Formal Hybrid Reasoning Enhances LLM's Math Capability — ignore — no fit
80. arXiv:2406.17947 — Do they mean 'us'? Interpreting Referring Expressions in Intergroup Bias — skill-doc (low) — Reference note for content/responsible-gaming agents: the finding that LLMs handle linguistic descriptions of win probabilities better than raw numbers is relevant to how GSE content prompts phrase confidence/probability, and fan-bias framing informs tone guidelines.
81. arXiv:2504.08747 — GridMind: A Multi-Agent NLP Framework for Unified, Cross-Modal NFL Data Insights — skill-doc (low) — Architecture reference for GSE ops agent fleets: agent-role decomposition for cross-modal sports data querying, but no concrete algorithm to port and GSE's content layer already keeps structured data as source of truth.
82. arXiv:2606.28570 — Digitizing Coaching Intelligence: An Agentic Framework for Holistic Athlete Profiling using VLM — skill-doc (low) — LLM-as-judge self-correction and RAG persistence patterns are loosely relevant to GSE agent-fleet eval design, but the athlete-profiling domain itself has no product fit.
83. arXiv:2405.20681 — No Free Lunch Theorem for Privacy-Preserving LLM Inference — ignore — no fit
84. arXiv:2602.03157 — Human-in-the-loop Adaptation in Group Activity Feature Learning for Team Sports Video Retrieval — ignore — none — GSE ingests odds/stat data, not video; no video-retrieval surface exists.
85. arXiv:2508.17157 — SPORTSQL: An Interactive System for Real-Time Sports Reasoning and Visualization — pattern (medium) — Portable NL-to-SQL-over-live-fantasy-data method for GSE's fantasy suite (Trend Lab conversational querying); DSQABENCH's snapshot-annotated eval design fits ops eval harness for freshness-sensitive queries.
86. arXiv:2410.17619 — From PDFs to Structured Data: Utilizing LLM Analysis in Sports Database Management — skill-doc (low) — Reference note for data-ingestion-agent on LLM PDF-to-structured extraction with human review; only marginal since GSE's sources are structured APIs, and any use must pass clearance-engine rights gating.
87. arXiv:2403.12977 — SportsNGEN: Sustained Generation of Realistic Multi-player Sports Gameplay — skill-doc (medium) — Relevant to fantasy player-tracking/movement models and sim-based projections, but requires tracking-data pipelines GSE does not ingest (odds-first stack); keep as reference for a future sim-based projection layer rather than a direct port.
88. arXiv:2607.12089 — Cross-Cutting Security Analysis of LLM-Generated Code via Metamorphic Testing and Association R — skill-doc (low) — Ops: prompt-level security checks for agent-fleet code generation and eval harnesses; no prediction/fantasy relevance.
89. arXiv:2604.24186 — MultiDx: A Multi-Source Knowledge Integration Framework towards Diagnostic Reasoning — ignore — no fit
90. arXiv:2601.11528 — Knowledge Graph Construction for Stock Markets with LLM-Based Explainable Reasoning — ignore — none — case-study KG+LLM for equities offers no concrete portable method beyond generic RAG; GSE's factor-trail explanations are already data-backed and a sports KG would be speculative scope.
91. arXiv:2608.18430 — Multi-Level Bayesian Calibration of a Multi-Component Dynamic System Model — pattern (medium) — Prediction engine calibration pipeline: multi-level fusion maps to calibrating per-sport/per-market components under a system-level model with Bayesian shrinkage, and the online iterative variant suggests streaming recalibration alongside the isotonic+beta layer.
92. arXiv:2601.00216 — From Evidence-Based Medicine to Knowledge Graph: Retrieval-Augmented Generation for Sports Reha — skill-doc (low) — Evidence-tier-aware reranking is a loose reference for grounding GSE content-generation agents in sourced data, but the medical-rehab domain and KG pipeline don't port concretely.
93. arXiv:1906.05029 — A Bayesian Approach to In-Game Win Probability in Soccer — pattern (high) — Directly portable to the prediction engine: Bayesian in-game win/tie/loss probability with calibration fits GSE's calibrated-probability stack (isotonic+beta calibration, Bayesian shrinkage) and enables live-line value/CLV comparisons for soccer markets.
94. arXiv:1312.4699 — piBUSS: a parallel BEAST/BEAGLE utility for sequence simulation under complex evolutionary scen — ignore — no fit