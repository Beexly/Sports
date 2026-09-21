# 0009 Fine-Tuned Large Event Models (arXiv:2402.06815v2)

**Citation:** Tiago Mendes-Neves, Luís Meireles, João Mendes-Moreira (2024). *Fine-Tuned Large Event Models for Predicting Player Performance*. arXiv:2402.06815v2. URL: https://arxiv.org/abs/2402.06815v2
**Ledger completed:** 2026-09-21. **Read:** full text (HTML/PDF via arXiv).
**Verdict:** ADAPT — the "general event model → fine-tune into team-context models" recipe is the transferable idea for GSE; do not adopt the soccer simulation results, whose validation (standings displacement, hypothetical transfers) is weak.

## 1. Research question
Can a general "Large Event Model" (LEM) trained on soccer event data be fine-tuned into team-specific contextual models that predict player performance in hypothetical scenarios — e.g., how a player would perform if transferred to a different team — better than a one-size-fits-all model?

## 2. Dataset / schema
- **WyScout event data, 2017–2018 English Premier League season.** Fine-tuning is performed on **home-game data** (per-team contextual models).
- Exact event counts, schema columns, and train/test splits: **Not stated in paper** as recoverable from this reading.
- The general (pre-fine-tune) LEM's training data: **Not stated in paper** as recoverable.
- Access: WyScout data is commercial/proprietary — not freely replicable.

## 3. Method / model
- A **general LEM** composed of three neural models (exact architectures in §4):
  - **Type model** (predicts event type), **Accuracy model** (predicts event success), **Data model** (predicts event data/details).
- Each team gets a **fine-tuned copy**: the general LEM is fine-tuned on that team's home-game events, producing a team-contextualized model.
- **Fine-tuning protocol (exact):** maximum **25 epochs**; learning rate reduced to **1/10th** of the original training learning rate; batch size set by the paper's **Equation 1** as a function of the number of fine-tuning events (exact Equation 1 not recovered: **Not stated in paper** as recoverable).
- Player-performance prediction is done by **simulation**: sample events from the fine-tuned team model with a hypothetical player inserted (e.g., "what if Cristiano Ronaldo played for team X"), and aggregate simulated performance.
- Simulation count in the paper, RNG protocol, and aggregation rules: **Not stated in paper** as recoverable. (A related public repo contains a benchmark script with `seq_len 3`, `n_sims 10000`, but that reflects the current repo state, not verified paper settings — do not attribute.)

## 4. Equations & assumptions
Model architectures (exact, from the paper):

| Model | Input dim | Output dim | Hidden layers | Learning rate | Batch size | Activation |
|---|---|---:|---:|---|---:|---|
| Type | 42 | 33 | `[256]` | `0.0010` | `32` | sigmoid |
| Accuracy | 75 | 2 | `[128]` | `0.0410` | `1024` | sigmoid |
| Data | 77 | 264 | `[64, 256, 256]` | `0.0063` | `1024` | relu |

- Fine-tuning learning rate = original / 10; max 25 epochs; batch size from Equation 1 (not recovered).
- **No further equations stated** in the recoverable text.
- Assumptions (paper's): event sequences are sufficiently Markovian at the chosen sequence length for next-event prediction to capture team style; a player's event distributions transfer across teams up to a team-context shift that fine-tuning captures; home games are representative of team context (away-game effects ignored); simulated event aggregates map to real performance.

## 5. Features / target
- **Inputs:** event-sequence features — input dimensions 42 (Type), 75 (Accuracy), 77 (Data); exact feature names: **Not stated in paper** as recoverable.
- **Targets:** next-event type (33 classes), event accuracy/success (binary), event data details (264-dim output).
- **Prediction horizon:** next event in the sequence; player-performance questions answered by multi-step simulation.

## 6. Validation design
- **Team standings validation:** simulate a full season with the fine-tuned team models and compare simulated final standings to actual 2017–2018 EPL standings via average table displacement.
- **Player-replacement table:** per-team replacement-player experiments (exact list in §7).
- **Hypothetical transfers:** Cristiano Ronaldo / Lionel Messi transfer scenarios are framed qualitatively; the paper notes that team context narrows apparent player-quality gaps.
- No held-out-season test, no comparison against a non-fine-tuned baseline's standings error, no statistical uncertainty on simulated quantities: none recovered — **Not stated in paper** as recoverable.

## 7. Numerical results / baselines
Quoted exactly from the paper (paper claims; GSE interpretation separated):

**Simulated vs. actual standings (average displacement):**
- Full table: **3.4** positions
- Home table: **3.3** positions
- Top six: **1.3** positions (both full and home)

**Largest team errors (expected → actual):**
- Manchester City: expected 1st, actual 1st
- Burnley: expected 17th, actual 7th (up **10**)
- Crystal Palace: expected 19th, actual 11th (up **8**)
- West Ham: expected 20th, actual 13th (up **7**)
- Huddersfield: expected 8th, actual 16th (down **8**)

**Player-replacement experiments** cover one replacement player for each EPL team, including: Manchester City / L. Sané; Liverpool / S. Mané; Tottenham / Son Heung-Min; Arsenal / A. Iwobi; Manchester United / R. Lukaku; Chelsea / V. Moses.

- *GSE interpretation:* an average displacement of 3.4 positions with multiple 7–10-position misses is a weak validation of a simulation engine — roughly the accuracy of a naive prior, and no baseline (e.g., Elo-based simulation) is compared. The Ronaldo/Messi transfer outputs are framed qualitatively, not as testable numeric predictions.

## 8. Code / data availability
- Code: `https://github.com/nvsclub/largeeventsmodel` (public GitHub; search-indexed as AGPL-licensed). Whether the repo reproduces the paper's exact experiments is unverified — treat as "code exists, paper-fidelity unconfirmed."
- Data: WyScout 2017–2018 EPL (commercial; not freely replicable).

## 9. Leakage & limitations
- **In-sample validation:** the fine-tuned models are trained on 2017–2018 home games and validated by simulating the *same season's* standings — this is not a prediction test, it is a fit check. No future-season holdout exists.
- **Weak baselineing:** no comparison of the 3.4-position displacement against trivial baselines (prior-season standings, Elo simulation); the number is uninterpretable in isolation.
- **Transfer scenarios are unfalsifiable:** hypothetical Ronaldo/Messi transfers produce no testable predictions; "context narrows quality gaps" is a qualitative reading of simulation output, not a result.
- **Home-games-only fine-tuning:** away context, cup competitions, and within-season tactical evolution are excluded; team "context" is a thin slice.
- **No uncertainty:** simulated quantities are reported without confidence intervals or simulation-error bars.
- **Soccer → NFL transfer gap:** soccer events are sparse and low-scoring; the NFL's dense, highly structured play sequences with 22 interacting agents are a different modeling regime. The recipe transfers; the architecture does not, directly.
- **Proprietary data:** WyScout is commercial; GSE cannot replicate the data pipeline, only the method on nflverse/tracking data.

## 10. GSE overlap
- Existing-research-map review: GSE's existing work covers state-space ratings, EPA/CPOE, calibration, and player-performance modeling — but nothing in the map is a **general event-sequence model fine-tuned into team-context simulators**. This ID is not among the 64 deeply covered papers. The fine-tune-into-context recipe is a genuine gap: GSE's team-strength and player-projection work is currently built as bespoke models per task, not as adaptations of one general sequence model.
- Partial conceptual overlap with state-space rating work (team strength as latent state), but the method (generative event model + fine-tuning + simulation) is new to the corpus.

## 11. GSE implementation spec
1. **General NFL event model:** train a next-play event model on nflverse play-by-play 2020–2025 (all teams): inputs = pre-play state (down, distance, yardline, score, time, personnel groupings, motion indicators); targets = play type, yards gained bucket, success — the football analogue of the paper's Type/Accuracy/Data heads.
2. **Team-context fine-tuning:** copy the general model per team, fine-tune on that team's recent games (e.g., last 2 seasons, home+away — do not repeat the paper's home-only restriction) with reduced LR and early stopping; this yields 32 team-contextualized simulators.
3. **Player-what-if queries:** answer "how would player X perform in team Y's context" by conditioning the team-Y model on player-X's historical event distributions (the transferable piece of the paper's idea) — with the outputs treated as *scenario explorations*, never as predictions, given the paper's weak validation.
4. **Validation discipline GSE must add (the paper lacks it):** hold out the most recent season entirely; compare simulated season win totals against actuals AND against an Elo baseline; report displacement with confidence intervals.
5. **Serving:** offline simulator for matchup/scenario analysis feeding the research desk; not a user-facing pick product.

## 12. Reproducible test
- **Dataset:** nflverse play-by-play 2020–2024; train general model on 2020–2023, fine-tune team models on 2023–2024, simulate the 2024 season.
- **Metric:** mean absolute error of simulated vs. actual team win totals; average standings displacement within conference.
- **Baseline to beat:** a simple Elo-based season simulation (the baseline the paper never runs).
- **Window:** the held-out 2024 season only; report per-team errors and displacement distribution.

## 13. Acceptance / rejection gate
- **ADOPT the fine-tuning recipe** only if: the fine-tuned team-context models beat the Elo simulation baseline by ≥ 1.0 win MAE on the held-out season AND beat the *un-fine-tuned* general model by ≥ 0.5 wins MAE (proving the team-context fine-tuning, not just the general model, carries the gain).
- **REJECT** if fine-tuned models do not beat Elo, or if the general-vs-fine-tuned gap is nil — either outcome means the paper's recipe adds complexity without predictive value, mirroring its weak soccer validation.

## 14. Improvement experiment
Beyond the paper: **opponent-conditioned fine-tuning with a proper predictive holdout.** Instead of fine-tuning one model per team on its own games, fine-tune *matchup-conditioned* models (team A's offense vs. team B's defense using both teams' histories), validate strictly on future seasons, and benchmark against Elo *and* against GSE's existing state-space ratings. Why it might win: the paper's team-context models ignore *who the opponent is* — in the NFL, opponent adjustment is most of the signal (a model's view of an offense is meaningless without the defenses it faced). Matchup conditioning plus a real holdout would test whether the LEM recipe has predictive content the paper never demonstrated.
