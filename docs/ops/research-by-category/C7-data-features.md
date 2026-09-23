# C7-data-features: Data integrity & sport features

## Mission (code this)

Source-bias detection, opponent-adjust, park/defense, xG/event features when feeds exist.

## Code focus

- `data-ingestion`
- `feature-store`
- `workers/data-refresh`

## Done when

Bias/QA checks or feature PR with tests; no private competitor scrape.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `2206.09083` — Universal Behavior of Opponent Statistics and Applications to the MLB — **[C2][C7]** for MLB feature construction — always opponent-adjust. Cheap, should already be in the pipeline.
- `2301.13052` — A Machine Learning Approach for Player and Position Adjusted Expected  — **[C7][C1]** MLS feature. Player-adjusted xG differentials are a better pre-game input than raw goals.
- `1602.08754` (see High dossiers)

## Medium priority (implement from these first)

- `2603.21163` (score 13) Simultaneous Estimation of Ballpark Effects and Team Defense Using Tot — Build a park-and-defense-adjusted feature layer into GSE's MLB model so forecasts stop losing to the naive baseline on park-sensitive stats.
- `2505.15859` (score 13) AutoData: A Multi-Agent System for Open Web Data Collection — Deploy AutoData's multi-agent, natural-language-instructed scraping architecture as a template for GSE's own agents (Jarvis/Hermes) to autonomously add new free data sources when Pro-Football-Referenc
- `1602.08754` (score 13) Adjusting for Scorekeeper Bias in NBA Box Scores — Build an automated 'source bias' detector across GSE's multi-source scraped data (comparing the same event as reported by different providers) to flag and correct systematic recording biases before in
- `2301.13052` — listed priority; confirm in NEXT_WAVE_MEDIUM.json

## Full Medium assigned to this category (20)

| arxiv_id | score | title | GSE action |
|----------|------:|-------|------------|
| `2505.15859` | 13 | AutoData: A Multi-Agent System for Open Web Data Collection | Deploy AutoData's multi-agent, natural-language-instructed scraping architecture as a template for GSE's own agents (Jarvis/Hermes) to autonomously add new free |
| `2312.09466` | 10 | Enhancing Trajectory Prediction through Self-Supervised Wayp | Apply noise-prediction self-supervision to GSE's data pipeline to make the core forecaster more robust to noisy scraped stats, potentially helping close the MAE |
| `2507.10334` | 10 | MoCap-Impute: A Comprehensive Benchmark and Comparative Anal | Adopt the paper's benchmarking methodology to systematically choose an imputation strategy for GSE's own gappy scraped data (e.g., missing play-by-play events), |
| `1806.10412` | 9 | Filtering Procedures for Sensor Data in Basketball | Adapt the inactive-moment detection logic as an anomaly filter inside the ETL pipeline to auto-flag corrupted or stale scraped play-by-play feeds before they re |
| `2608.14776` | 9 | NRCD: An Open Database of Collegiate Running with Unified Pe | Adopt the course/weather-standardization methodology as a template for normalizing GSE's own scraped sports data across venues/conditions before entering the pr |
| `1706.02884` | 8 | Learning to Learn from Noisy Web Videos | Train an analogous RL-based data-quality policy to automatically triage and down-weight unreliable scraped data sources (e.g. inconsistent Pro-Football-Referenc |
| `1607.03895` | 7 | Tie-breaker: Using language models to quantify gender bias i | Repurpose this bias-quantification methodology as an internal audit tool checking GSE's own automated content/commentary for unintended systematic framing bias |
| `1904.05557` | 7 | Searching News Articles Using an Event Knowledge Graph Lever | Use this Wikidata-linked annotation approach as the backbone for GSE's Intelligence Graph, automatically tying scraped news/injury reports to typed event/player |
| `1904.13178` | 7 | Fine-grained Entity Recognition with Reduced False Negatives | Use the HAnDS-style distant-supervision pipeline to auto-populate GSE's planned Intelligence Graph with typed player/team/event entities mined from scraped spor |
| `2209.13846` | 7 | VREN: Volleyball Rally Dataset with Expression Notation Lang | Borrow the descriptive-language approach to standardize GSE's internal event taxonomy across NFL/MLB/MLS so per-sport models share a common feature schema. |
| `physics/0608228` | 7 | Predicting Baseball Home Run Records Using Exponential Frequ | Use this exponential record-forecasting approach to generate auto-published 'record watch' probability content for MLB, feeding both prediction accuracy and aut |
| `1612.00148` | 6 | Domain Adaptation for Named Entity Recognition in Online Med | Use domain-adapted NER to more reliably parse player/team entities out of messy scraped sources like Pro-Football-Reference or news feeds, reducing pipeline bre |
| `1703.02391` | 6 | Learning from Noisy Labels with Distillation | Use knowledge-graph label relations (analogous to GSE's future Intelligence Graph) plus a small verified dataset to distill cleaner labels out of noisy multi-so |
| `1802.04687` | 6 | Neural Relational Inference for Interacting Systems | Use NRI-style unsupervised interaction-graph inference to auto-populate parts of the Intelligence Graph's typed relationships (e.g. which players/teams interact |
| `2206.02562` | 6 | floodlight — A High-Level, Data-Driven Sports Analytics Fram | Evaluate floodlight (or its architectural patterns) as a foundation/reference implementation for standardizing GSE's own multi-source, multi-sport ingestion lay |
| `2302.09276` | 6 | Transformer-Based Neural Marked Spatio Temporal Point Proces | Adopt NMSTPP as an alternative core-architecture experiment to beat the naive baseline (current MAE 5.31 vs 4.91), since point processes natively handle irregul |
| `2406.12084` | 6 | When Reasoning Meets Information Aggregation: A Case Study w | Adapt the SportsGen synthetic-narrative methodology as an internal stress-test suite for GSE's content-generation LLM, catching numeric hallucination bugs befor |
| `2504.08764` | 6 | Evaluation of the phi-3-mini SLM for identification of texts | Use this paper's human-correlation evaluation methodology to audit whichever LLM GSE uses to auto-tag scraped injury/news text for its feature pipeline, before |
| `2506.05866` | 6 | Analysis of points outcome in ATP Grand Slam Tennis using bi | Use this paper's negative result as a diagnostic checklist: audit whether GSE's baseline-losing model suffers the same root cause (data granularity/quality ceil |
| `2510.15983` | 6 | Ontologies in Motion: A BFO-Based Approach to Knowledge Grap | Adopt a BFO-style upper ontology as the formal schema backbone for GSE's Intelligence Graph, ensuring picks/stats/events are typed consistently enough to suppor |
