# C6-pick-lifecycle-live: Pick lifecycle & live WP (lock ≠ settle)

## Mission (code this)

Timestamp lock line; live confidence updates after lock; in-play models are not pre-game pick models.

## Code focus

- `pick state machine`
- `live WP adapters`
- `board lock timestamps`

## Done when

Lock/close fields documented; live WP path separate from published pre-game pick.

## Do not

- Re-run web/arXiv search for this category
- Flip gates / env / Stripe catalogue
- Implement withdrawn `2312.11067`
- Frame engine as AI

## High anchors (PDF-verified set preferred)

- `1704.00197` — iWinRNFL: A Simple, Interpretable & Well-Calibrated In-Game Win Probab — **[C1][C6][C2]**. This is the cleanest “math you can read” in-game WP template for NFL. Do *not* use it as the pre-game published-pick model — it is an in-play state model. Use it  **NEXTWAVE-YES**
- `1906.05029` — A Bayesian Approach to In-Game Win Probability in Soccer — **[C1][C2][C5][C7]** for **MLS**. This is the template for “independent per-sport probability model” in soccer: generative remaining-score model, not a global classifier. Also the 
- `1710.02824` — Beating the bookies with their own numbers — and how the online sports — **[C4][C6]**. CLV protocol paper. GSE’s public standard is *closing-line value*, not “we found +EV at open.” Also: pick lifecycle should timestamp the line at **lock** and compare  **NEXTWAVE-YES**

## Medium priority (implement from these first)

- `2609.07617` (score 11) Forecasting the Winner of a Live Tennis Match — Adopt the hybrid pre-match-plus-live-update architecture as a template for GSE's in-play confidence updates, directly addressing the backtest-losing-to-baseline problem.
- `2404.13300` (score 11) Capturing Momentum: Tennis Match Analysis Using Machine Learning and T — Build an HMM-based 'momentum state' layer feeding into live win-probability updates, giving GSE a defensible, transparent mathematical basis (not 'AI hype') for in-play confidence adjustments during a
- `2303.17863` (score 13) Can the hot hand phenomenon be modelled? A Bayesian hidden Markov appr — Add a hidden hot/cold-state layer to GSE's player-level features so the ensemble can dynamically adjust confidence based on inferred streakiness.

## Full Medium assigned to this category (8)

| arxiv_id | score | title | GSE action |
|----------|------:|-------|------------|
| `2405.13995` | 11 | Leveraging World Events to Predict E-Commerce Consumer Deman | Build a 'world events' embedding layer capturing injuries, weather, rivalries, and travel/rest anomalies to feed as exogenous features into GSE's per-sport pred |
| `2609.07617` | 11 | Forecasting the Winner of a Live Tennis Match | Adopt the hybrid pre-match-plus-live-update architecture as a template for GSE's in-play confidence updates, directly addressing the backtest-losing-to-baseline |
| `1812.05804` | 8 | Data Provenance for Sport | Build GSE's pick lifecycle (proposed→modeled→published→graded→settled) as a domain-specific provenance graph modeled on this notation, giving auditable, sport-n |
| `1808.00198` | 7 | Towards Machine Learning on data from Professional Cyclists | Repurpose the LSTM approach as a template for forecasting in-game fatigue/performance decline curves for covered sports, feeding a fatigue-adjusted confidence s |
| `2002.01193` | 7 | A copula-based multivariate hidden Markov model for modellin | Build a 'momentum state' layer into live win-probability picks so confidence scores adjust dynamically as the HMM detects a team entering a high-control regime, |
| `2402.11191` | 7 | Knowledge Graph Assisted Automatic Sports News Writing | Build GSE's Intelligence Graph using this paper's entity/relation schema as a starting template, then reuse the same graph for both content generation and featu |
| `2406.17947` | 7 | Do they mean 'us'? Interpreting Referring Expressions in Int | Apply the finding that LLMs handle linguistic probability framing better than raw numbers to redesign GSE's automated content generator's prompt templates, impr |
| `2503.14190` | 6 | Inferring Events from Time Series using Language Models | Use this event-inference-from-time-series capability to auto-generate plain-language explanations of why a pick's probability moved (e.g., inferring 'injury' or |
