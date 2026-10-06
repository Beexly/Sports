# 0007 Neural Sabermetrics World Model (arXiv:2602.07030v1)

**Citation:** Young Jin Ahn, Yiyang Du, Zheyuan Zhang, Haisen Kang (2026). *Neural Sabermetrics with World Model*. arXiv:2602.07030v1. URL: https://arxiv.org/abs/2602.07030v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, dated 2 February 2026).
**Verdict:** ADAPT — the "treat the sport as text and pretrain" paradigm is directly transferable to NFL play-by-play/tracking; GSE should prototype a much smaller structured event-sequence model with explicit calibration rather than adopt a 3B-parameter MLB world model as-is.

## 1. Research question
Can a pretrained large language model, continuously pretrained on serialized baseball games, learn the latent dynamics of the sport well enough to outperform task-specific models on concrete prediction tasks (next-pitch type, batter swing decisions) — i.e., does "neural sabermetrics" emerge from next-token prediction over game text, analogous to world models in language?

## 2. Dataset / schema
- **More than ten years of MLB tracking data**, serialized into chronological text: **more than 7 million pitch sequences, approximately 3 billion tokens**.
- **Training:** regular-season games. **Evaluation:** postseason games, used explicitly as an out-of-distribution (OOD) test.
- Per-game scale: games average **over 120K tokens per game**; long games are segmented because of context-length constraints.
- Schema (serialized, not tabular): game context (score, inning, count, base state — inferred from "game context" description), pitch information (release point, RPM, speed, plate coordinates, spin direction — exact field list per the paper's text serialization; swing speed for batter-side data), batter decisions and pitch outcomes.
- Exact seasons covered, exact train/test game counts, and access (public Statcast vs. proprietary tracking): **Not stated in paper** as recoverable from this reading.

## 3. Method / model
- Take a **pretrained Llama-family model** and continue pretraining it on the serialized baseball corpus with the standard **next-token prediction** objective. GSE inference from the paper's framing: this is continuous/domain-adaptive pretraining, not a from-scratch train.
- **Backbone: Llama 3B** (exact parameter count as stated).
- **Training config (exact):** non-overlapping sliding/fixed windows of **3072 tokens**; batch size **1024**; sequence length **3072**; hardware **TPUv4-64**.
- Optimizer, learning rate, and loss beyond next-token prediction: **Not stated in paper** as recoverable.
- Evaluation is done on downstream tasks (pitch type prediction; batter swing decision) presumably via prompting or probing the continued-pretrained model; the exact evaluation protocol (few-shot vs. fine-tuned heads) was not recovered: **Not stated in paper** as recoverable.

## 4. Equations & assumptions
- **No equations stated** in the recoverable text beyond the standard next-token prediction training objective (implied, not written out). The paper's contribution is empirical/systems, not mathematical.
- Stated assumptions: (a) chronological text serialization preserves the game's causal structure well enough for a language model to learn it; (b) the postseason is a valid OOD evaluation (different pitcher/batter populations, higher leverage); (c) segmenting long games into fixed 3072-token windows does not destroy the dependencies the model needs — the authors themselves flag this as a limitation (§9).
- Open question the authors state explicitly: whether token-level representations or explicit latent game-state abstractions are the better substrate for long-horizon modeling.

## 5. Features / target
- **Inputs:** serialized text of game events in chronological order — game context, per-pitch measurements (release point, RPM, speed, plate coordinates, spin direction, swing speed where applicable), batter decisions, and outcomes.
- **Targets (downstream tasks):** (1) next-pitch type (binary: Fastball vs. Non-fastball); (2) batter swing decision (swing vs. take), evaluated in-zone (IZ) and out-of-zone (OZ).
- Exact class definitions and label construction rules: **Not stated in paper** as recoverable.

## 6. Validation design
- Train on regular-season games; evaluate on postseason games as the OOD split. Exact season list and game counts: **Not stated in paper** as recoverable.
- Baselines compared: **Pi (2018)** for pitch-type prediction; **Gopal et al. (2024)** for the swing-decision task.
- Metrics: accuracy, recall, F1 for pitch type; accuracy in-zone and out-of-zone for swing decisions.
- Whether splits are strictly time-ordered (no pitcher/batter leakage across the regular/postseason boundary) is not discussed in the recoverable text; postseason rostering largely changes the population, but same-season pitcher arsenals may carry over — an unaddressed leakage surface.

## 7. Numerical results / baselines
Quoted exactly as in the paper's tables (paper claims; GSE interpretation is separated):

**Pitch-type prediction (Fastball vs. Non-fastball):**
- Pi (2018): Accuracy **0.633**, Recall **0.792**, F1 **0.720**
- Ours (world model): Accuracy **0.637**, Recall **0.792**, F1 **0.722**
- *GSE interpretation:* the gain is **+0.004 accuracy / +0.002 F1** — essentially nil. This task does not justify the compute; the headline result is elsewhere.

**Batter swing-decision task:**
- Gopal et al. (2024): IZ accuracy **0.325**, OZ accuracy **0.704**
- Ours: IZ accuracy **0.766**, OZ accuracy **0.792**
- *GSE interpretation:* large improvements, but check task comparability (the 0.325 IZ baseline for Gopal et al. looks anomalous and may reflect a different task framing or label definition) before claiming dominance.

**Abstract-level summary:** approximately **64%** next-pitch accuracy and **78%** swing-decision accuracy.
- No sportsbook, calibration, or ROI evaluation is reported anywhere in the recoverable text.

## 8. Code / data availability
**Not stated in paper** as recoverable from this reading.

## 9. Leakage & limitations
- **Marginal headline task:** the pitch-type result is a +0.004 accuracy improvement over a 2018 baseline — a 3B-parameter TPUv4-64 training run for that gain is not a result; it is a warning about where the method's value actually lies (sequential context tasks, not next-token marginals).
- **Baseline anomaly:** Gopal et al. (2024) IZ accuracy of 0.325 is suspiciously low and unexplained; if the swing-decision task framing differs between baseline and model, the comparison is invalid. The paper does not adjudicate this in the recoverable text.
- **Context segmentation:** games average >120K tokens but training windows are 3072 tokens — long-range dependencies (pitcher fatigue, lineup turnover, game script) are explicitly broken by segmentation; the authors flag this.
- **No calibration:** predicted probabilities are never evaluated for calibration or betting value; a world model that is directionally right but miscalibrated is useless to GSE.
- **Tokenization opacity:** how continuous measurements (release point, RPM, plate coordinates) are tokenized is not described in the recoverable text — this is the single most important implementation detail and it is missing.
- **OOD claim is weak:** postseason-as-OOD changes leverage and population but not the physics; true distribution shift (rule changes, new pitch types) is untested.
- External validity to NFL: baseball is a discrete, turn-based sport — near-ideal for text serialization. Football has 22 simultaneous agents and continuous space; the serialization will be lossier and the context problem an order of magnitude worse.

## 10. GSE overlap
- Existing-research-map review: GSE's existing work covers EPA/CPOE, calibration (CQR, stats export via the Mimo agent), state-space ratings, tracking metrics, STRAIN, and event-adjacent modeling — but nothing in the map is a **generative world model** trained by next-token prediction over serialized game sequences. This ID is not among the 64 deeply covered papers. The paradigm (not the MLB artifact) is a genuine gap.
- Direct competition with existing GSE lanes is low: this would sit *underneath* the current predictive stack as a representation/feature learner, not replace the calibrated pick engine.

## 11. GSE implementation spec
1. **Do not replicate the 3B model.** Build a small structured alternative: a transformer or state-space model (tens of millions of parameters, not billions) over a compact event vocabulary.
2. **Data:** nflverse play-by-play 2020–2025 serialized chronologically per game: down/distance/field position/score/time pre-snap state, play call descriptors, personnel, results; optionally tracking-derived features (motion, alignment) as discrete tokens.
3. **Tokenization (the missing detail to solve first):** discretize continuous fields into quantile bins; run a tokenization ablation (raw binned tokens vs. learned embeddings vs. latent state bottleneck) before any scale-up — the paper leaves this open and it is where the experiment lives or dies.
4. **Training:** next-event prediction on regular-season games; hold out playoffs as OOD, mirroring the paper's protocol.
5. **Calibration requirement:** any probability the model emits (e.g., next-play type, success probability) must pass a calibration audit (reliability curves, ECE) before touching the GSE stack — the paper's missing evaluation is GSE's mandatory one.
6. **Serving:** offline representation learner; emit per-game-state embeddings consumed as features by the existing calibrated models. Never serve raw world-model probabilities to users.

## 12. Reproducible test
- **Dataset:** nflverse play-by-play, 2020–2024 regular seasons for training; 2024 postseason + 2025 regular season for evaluation.
- **Metric:** next-play run/pass prediction accuracy and log-loss, plus calibration (ECE) — mirroring the paper's next-pitch task in football terms.
- **Baseline to beat:** a logistic regression on (down, distance, yardline, score differential, time remaining, timeouts) — the football equivalent of Pi (2018).
- **Window:** fixed seasons as above; report accuracy, log-loss, and ECE; the world-model-features model must beat the baseline on log-loss AND be no worse calibrated.

## 13. Acceptance / rejection gate
- **ADOPT the paradigm** (small structured event model as a feature learner) only if: it beats the logistic baseline by ≥ 0.02 log-loss on the held-out window, ECE ≤ 0.03 on next-play-type probabilities, and an ablation shows the sequence history (not just the current game state) carries the gain.
- **REJECT** if the gain is within noise of the baseline (as the paper's own pitch-type result was), if calibration fails, or if removing history beyond the current play state loses nothing — any of which means the "world model" is expensive theater over a Markov state.

## 14. Improvement experiment
Beyond the paper: **latent game-state bottleneck with explicit calibration.** Instead of pure next-token prediction over raw serialized text, train an encoder that compresses the game history into a fixed-dimensional latent game state (score, momentum proxies, personnel, fatigue), predicts the next event *from the bottleneck*, and is jointly trained with a calibration loss on the predicted probabilities. Why it might win: the paper's open question is exactly token-vs-latent representations, and its failure mode is context segmentation — a bottleneck state is carryable across segments (solving the >120K-token game problem), is inspectable, and can be calibrated directly, which is the one property GSE actually needs from a world model.
