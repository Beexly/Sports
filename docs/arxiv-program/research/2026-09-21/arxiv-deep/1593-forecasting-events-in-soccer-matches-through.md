# [1593] Forecasting Events in Soccer Matches Through Language (arXiv:2402.06820)

**Citation:** Mendes-Neves, T., Meireles, L., & Mendes-Moreira, J. (2024). *Forecasting Events in Soccer Matches Through Language*. arXiv:2402.06820. URL: https://arxiv.org/abs/2402.06820
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the LLM-style single-model tokenization paradigm for next-event forecasting transfers directly to NFL play-by-play simulation from nflverse; soccer-specific implementation is not directly usable.

## 1. Research question
Can a soccer match be modeled like a language-modeling problem — events as "words," the match as a "sentence" — so that a single sequential model predicts the complete chain of variables composing each next event (type, accuracy, goal flag, team, time elapsed, x/y), replacing the prior three-model Large Event Model (LEM) pipeline? The paper also tests whether the resulting model can serve as a simulation backbone for analytics pipelines: match prediction, momentum indicators, situational xG maps, and VAEP-style action valuation.

## 2. Dataset / schema
Public WyScout dataset (Wyscout V2 API), 2017/18 season of the five most valuable European leagues: England, Spain, Germany, Italy, France. Authors state the dataset is ~100 MB after preprocessing. Per-event schema (11 features): Event Type (categorical: pass, shot, take on, tackle, etc.), isGoal (binary), isAccurate (binary), isHomeTeam (binary), Period (1/2), Minute, Second, X, Y (integer pitch coordinates), Home Score, Away Score. Limitations stated in paper: no off-the-ball data (over 98% of player time missing), manual annotation imprecision on continuous variables, annotation edge-case bias. Publicly available (Wyscout open data). No team or player IDs included — explicitly excluded to avoid exploding the input/output space (2000+ players).

## 3. Method / model
Ordinal token encoding of event data into a 140-token vocabulary: numeric values 0–100 occupy encoder positions 0–100; 37 event-type categories occupy the next positions (most- to least-frequent); then `¡PERIOD_OVER¿` and `¡GAME_OVER¿` tokens; final position is a `¡NaN¿` padding token. Multi-layer perceptron (not Transformer): full models are 3 hidden layers × 512 neurons, ReLU; lite model (K=1s) is 2 layers × 256 neurons. For K=1, parameter counts stated as ~600k (full) and ~100k (lite). Training: lr 0.001 with cosine annealing schedule each epoch, 50 epochs, BCELoss, Adam optimizer. Model predicts one token at a time with the partial event tuple appended to context (NaN-padded), plus a multinomial sampler with masking restrictions so only probabilities for the current event position are sampled (hallucination guard). Period/Minute/Second collapsed into a single TimeElapsed token, deterministically re-expanded. Three models trained: K=1 (context = previous 1 event), K=1s (lite, 6× fewer params), K=3 (context = previous 3 events). Implemented in PyTorch on an NVIDIA 3060 12GB.

## 4. Equations & assumptions
Exactly three equations stated:
- (1) `S_k = [e_{-1}, e_{-2}, …, e_{-k}]` — context set of k previous events.
- (2) `S_1 = [e_{-1}]`.
- (3) `p̂ = f(S_k)` — predicted probability vector over the next token as a function of the context set.
Stated assumptions: (a) soccer can be abstracted to a Markov chain over events; (b) ordinal encoding suffices — no embeddings needed because the vocabulary is tiny (140 tokens) with no semantic content beyond sequentiality; (c) x should be predicted before y because x has higher importance; (d) scores are computed externally (deterministic), not predicted; (e) set pieces / out-of-bounds act as "reset points" that soft-reset cumulative simulation error. No other equations stated.

## 5. Features / target
Inputs: the encoded token sequence of the last k events (11 variables each: type, isGoal, isAccurate, isHomeTeam, period, minute, second, x, y, home score, away score) plus the partial tuple of the event currently being generated. Targets: the next event's variables predicted one token at a time — event type (37-way), isGoal, isAccurate, isHomeTeam, TimeElapsed (continuous), X, Y. Prediction horizon: next event; by iteration, entire matches simulated from any state.

## 6. Validation design
Train = full 2017/18 seasons of France, Germany, Italy; test = complete seasons of England and Spain — held out at the league level explicitly to enable "season-long application development … without the risk of overfitting." So splits are time-ordered by league, with zero league overlap. Baselines: majority-class/mean-value naive baseline (BL), and the prior three-stage LEM proposal [11] (labeled "LEM" in tables). Metrics: accuracy + F1 for categorical (Type, Goal, Accurate, Home); MAE + R² for continuous (Time Elapsed, X, Y). Additional qualitative validation: situational xG maps (1,000,000 simulated shots per input state), a momentum-indicator trace on Real Madrid–Barcelona (Dec 23, 2017), in-game win-probability and over/under 2.5 curves, and VAEP comparison against ST/10, LT/inf, LT*/inf valuations.

## 7. Numerical results / baselines
From Table 3 (columns: BL | LEM [prior proposal] | K=1 | K=1s | K=3):
- Type ACC: 40.8% | 55.7% | 57.5% | 57.3% | 62.2%
- Type F1: 0.24 | 0.50 | 0.52 | 0.52 | 0.57
- Goal ACC: 99.7% | 99.8% | 99.8% | 99.8% | 99.8%
- Goal F1: 0 | 0.87 | 0.68 | 0.68 | 0.68
- Accurate ACC: 67.8% | 81.7% | 82.7% | 82.5% | 82.8%
- Accurate F1: 0 | 0.69 | 0.87 | 0.87 | 0.87
- Home ACC: 50.9% | 93.8% | 92.1% | 91.5% | 93.6%
- Home F1: 0 | 0.94 | 0.92 | 0.92 | 0.94
- Time Elapsed MAE: 3.1 | 1.6 | 1.6 | 1.7 | 1.7; R²: 0 | 0.55 | 0.45 | 0.39 | 0.42
- X MAE: 21.2 | 8.5 | 6.7 | 7.4 | 6.5; R²: 0 | 0.29 | 0.81 | 0.77 | 0.82
- Y MAE: 26.5 | 15.6 | 12.1 | 12.8 | 11.4; R²: 0 | 0.64 | 0.54 | 0.50 | 0.59
Paper claims: event-type accuracy up 6.5 percentage points for K=3 over prior LEM (62.2% vs 55.7%); X error down 24% and Y down 28% (MAE 6.7 vs 8.5; 12.1 vs 15.6). Inference speed: K=1s 21% faster than K=1; K=3 62% slower than K=1. Known gaps: no improvement over prior LEM on isHomeTeam or TimeElapsed; Goal F1 regresses vs the prior proposal (0.68 vs 0.87). (All numbers are the paper's claims, Table 3.)

## 8. Code / data availability
Code: https://github.com/nvsclub/LargeEventsModel (stated in Section 3.5). Data: public WyScout dataset, WyScout V2 API open data.

## 9. Leakage & limitations
- League-held-out test is honest at the league level, but France/Germany/Italy vs England/Spain in a single season means all teams share the same transfer/strategy era — cross-league style drift is the unmeasured risk, and only one season is used.
- Goal-prediction accuracy ~99.8% is driven by class imbalance (goals are rare), not discrimination — F1 0.68 vs prior 0.87 shows the single-model trade-off on the variable predicted earliest.
- Cross-labeled shots/crosses bias: "when a cross goes toward the goal, it is labeled as a shot if it ends in a goal but is still labeled as a cross if it gets claimed by the keeper" — the paper admits this inflates situational xG anomalies; the same annotation bias would corrupt any probability product built on it.
- Red-card example: the model cannot capture probability shifts from events absent from its context (the paper shows in-game probabilities failing to move on a red card) — directly relevant to NFL where injuries/ejections are the analogous missing-context events.
- 100 MB of public data was judged "insufficient to explore" Transformers — all reported gains are from a 600k-param MLP; the architecture claim does not generalize to modern LLMs.
- No player/team identity means no personnel-specific prediction — useless for prop markets as-is.

## 10. GSE overlap
Extension, not duplicate: ledger 0009-large-event-models-player-performance.md covers the original three-stage LEM proposal (the "LEM" baseline column in this paper's tables). The existing-research map's area 13 ("Text/news as features beyond the price … beat-writer text embeddings for injury news is untested") is a different lane (text-as-feature), while this paper is events-as-language — the closest conceptual neighbor is the LEM work GSE already read. Nothing in GSE's corpus currently ports the single-model tokenization trick to NFL play-by-play; GSE's engine is model v5.2.7 on picks tables, not an event simulator.

## 11. GSE implementation spec
- Data: nflverse play-by-play (2009–present), ~50k plays/season. Encode each play as a token tuple: play_type (run/pass/punt/kick/penalty), yards_gained, down, distance, yardline (100-scale), quarter/time_remaining, score_diff, timeouts, shotgun/no_huddle flag, and weather bin — a 60–90-token vocabulary, ordinal-encoded exactly like the paper.
- Model: single Transformer (not MLP — NFL has ~700k+ plays, 7× their data) predicting one token at a time with the same masked-sampler design (only sample tokens valid for the current play-slot position). Red-zone / 2-minute drill acts as the "reset point" analog for error control.
- Training: pregame-neutral contexts on 2015–2022, validate 2023, test 2024 (time-ordered, no season overlap). Loss: cross-entropy over the 140-token vocab + MAE head on yards/time.
- Serving: pregame, run ~100k simulations per game from the opening-kickoff state to produce win probability, total distribution, and any-play prop quantiles (e.g., P(any rushing TD ≥ 1.5 by RB)). In-game, re-simulate each commercial break for live edges vs sportsbook totals.
- Effort: ~2–3 weeks for one engineer (data pipeline exists via nflverse; the masked sampler is the novel piece).

## 12. Reproducible test
Dataset: nflverse pbp 2024 season (held out), trained on 2015–2023. Task: predict next-play play_type and yards_gained bin. Metrics: play-type accuracy and yards MAE vs (a) majority-class baseline and (b) a three-stage baseline analogous to the paper's old LEM (separate type model, then accuracy/yards models). Pass gate: Transformer single-model must beat both baselines on play-type accuracy on the held-out 2024 season.

## 13. Acceptance / rejection gate
ADOPT the simulator design if: next-play-type accuracy ≥ 62% on held-out 2024 NFL season (matching the paper's K=3 soccer number, adjusted for ~similar vocabulary size) AND win-probability calibration (Brier) on 2024 games ≤ GSE's current model v5.2.7 win-probability Brier on the same games. REJECT if either fails — the paper's gains do not port to football.

## 14. Improvement experiment
Hybridize with the paper's own admitted weakness: add an "injury/ejection" token drawn from a text pipeline — feed beat-reporter injury tweets through an LLM classifier into the event vocabulary as a pseudo-event type (`¡PERSONNEL_CHANGE¿`), so the simulator's context updates when a star QB exits. Then test whether in-game win-probability paths respond correctly to the Drew Brees-style exit cases — the exact failure mode the paper demonstrates with the red card.
