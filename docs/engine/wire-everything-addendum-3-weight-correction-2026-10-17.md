# ADDENDUM 3 — WEIGHT CORRECTION (2026-10-17, 04:04 CT) — OVERRIDES THE FROZEN-WEIGHT DISPOSITION EVERYWHERE IT APPEARS
Garrett's order, verbatim in substance: we have more than 500 games — why is anything frozen, why is nothing weighed?

THE ERROR: the corpus-evaluator backtest was scoped to 79 games (2026 Weeks 1–5) and its result froze the production weight at 0.0 against a 500-game minimum. The data to clear that minimum already sits in the warehouse, all of it legal under the training fence: the locked-filter universe is 2,462 games (REG 2017 W1 – 2026 W5) and the line archive holds 14,251 fixtures (1999–2025). Testing on 79 games when thousands of legal games are on disk, then freezing, is the exact failure this correction removes.

THE CORRECTION — RUN THE MEASUREMENT AT FULL LEGAL SCALE:
1. Build the backtest set from every settled game BEFORE Week 6, 2026 for which game context is derivable — at minimum the locked 2,462-game universe; extend toward the 14,251 fixtures wherever context coverage allows. Derive context from data already held: rest and travel from schedules, altitude from the venue table, wind/temperature from the weather archives, market and ticket fields where present, trench/turnover from play-by-play. Any field that cannot be derived for a game is logged as a coverage count per field per season — never silently dropped, never invented.
2. Walk-forward by season: fit the evaluator's coefficients on earlier seasons, evaluate on later pre-Week-6 seasons. No lookahead; the cutoff fence is absolute.
3. Report the full delta table on the complete sample: ΔBrier, Δlog-loss, and CLV per tested weight, with the sample size and coverage printed next to every number.
4. SET THE WEIGHT FROM THE MEASUREMENT. CORPUS_EVALUATOR_DEFAULT_WEIGHT becomes the measured value that clears the contract bars (ΔBrier ≤ −0.002, CLV non-inferiority) on the full sample. If no weight clears the bars at full scale, the report publishes the full-scale table and the weight goes to the least-harm measured value — a number earned on thousands of games, not a freeze inherited from 79.
5. Same treatment for the mind v2 literature deltas the moment Mutation Test 2.0 passes: measured at full legal scale, weighted by the result.

Nothing else in Addendum 2 (revised) changes. The promotion contract's bars stay exactly as written — they are measurement bars, and this correction exists because a measurement bar must be measured on the data that exists, not used as a place to park.
