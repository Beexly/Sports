# [0427] Transformer-Based Neural Marked Spatio Temporal Point Process Model for Football Match Events Analysis (arXiv:2302.09276v1)

**Citation:** Yeung, Sit, Fujii (2023). *Transformer-Based Neural Marked Spatio Temporal Point Process Model for Football Match Events Analysis*. arXiv:2302.09276v1. URL: https://arxiv.org/abs/2302.09276v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3370 lines).
**Verdict:** ADAPT — port the neural marked spatio-temporal point process framework (transformer-encoded history → joint forecast of time, zone, action) to NFL drive sequences, and adapt the HPUS possession metric into a drive-utilization score; this directly fills the map's named gap on Hawkes/self-exciting scoring models.

## 1. Research question
Can football match events — each with a time, a pitch zone, and an action type — be modeled jointly as a marked spatio-temporal point process with a transformer-encoded history, beating statistical and RNN baselines at forecasting the next event's timing, location, and action? And can the fitted model produce a holistic possession-utilization metric (HPUS) that reflects team quality without using goal data?

## 2. Dataset / schema
WyScout Open Access Dataset, 2017/18 season, top five European leagues (Premier League, La Liga, Ligue 1, Serie A, Bundesliga). Train/validation/test: 73/7/178 matches — but train and validation are Bundesliga-only (reduced for compute), while the test set spans all five leagues (37/37/37/37/30). For architecture search the authors further subsampled to 100,000 training rows (5%) and 10,000 validation rows. Event schema: (x,y) coordinates grouped into 20 zones (Juego de posición, numbered randomly), 21 raw action types grouped into 5 classes (pass 66.99%, dribble 8.48%, cross 3.27%, shot 1.68%, possession end 19.58%), interevent times, plus engineered continuous features (zone-to-zone distance, Δx/Δy, distance/angle to opposition goal). xG for validation from understat.com. Hardware: 2× AMD EPYC 7F72, 1× Nvidia RTX A6000. Public data and public code.

## 3. Method / model
NMSTPP: five stages. (1) Input: trailing seqlen=40 events as a (seqlen, 1+1+1+5) matrix (interevent time, zone, action, 5 continuous features). (2) History encoding: dense layer on continuous features, embeddings for zone/action, positional encoding, transformer encoder → fixed 31-d history vector, then another dense layer. (3) Forecasting: dependent neural nets NN_t(H_i) → t_i; NN_z(t_i, H_i) → 20 zone logits; NN_m(t_i, z-vector, H_i) → 5 action logits (dependence order t→z→m chosen by grid search). (4) Output: predicted time, argmax zone/action. (5) Loss L(θ) = Σ_i [10×RMSE_{t_i} + CEL_{z_i} + CEL_{m_i}], trained end-to-end with Adam. HPUS: per-action holistic action score HAS = sqrt(E(Zone|H)·E(Action|Zone,H))/t with zone weights {Area0:0, Area1:5, Area2:10} and action weights {possession loss:0, dribble/pass:5, cross/shot:10}, t floored at 1; HPUS = Σ_i φ(n+1−i)·HAS_i with φ(x) = exp(−0.3(x−1)) weighting recent actions most; HPUS++ restricts to possessions ending in attack. Class weights via sklearn compute_class_weight; dribble weight ×1.16 for the final validation.

## 4. Equations & assumptions
Stated in the paper:
- Joint factorization: f(·) = ∏_i f(t_i, z_i, m_i | H_i) = ∏_i f_t(t_i|H_i)·f_z(z_i|t_i,H_i)·f_m(m_i|t_i,z_i,H_i)
- Loss: L(θ) = Σ_i [10 × RMSE_{t_i} + CEL_{z_i} + CEL_{m_i}]
- poss-util = Σ_{i=1}^n P(Cross, Shot) (baseline metric, Eq. 6)
- HAS = sqrt(E(Zone·Action|H))/t = sqrt(E(Zone|H)·E(Action|Zone,H))/t (Eq. 7)
- E(zone|H) = 0·P(Area_0) + 5·P(Area_1) + 10·P(Area_2) (Eq. 8)
- E(Action|Zone,H) = 0·P(Possession loss) + 5·P(Dribble, Pass) + 10·P(Cross, Shot) (Eq. 9)
- t = 1 if t < 1, else t (Eq. 10)
- HPUS = Σ_{i=1}^n φ(n+1−i)·sqrt(E(Zone_i·Action_i|H_i))/E(Time|H_i) = Σ_i φ(n+1−i)·HAS_i (Eq. 11)
- φ(x) = exp(−0.3(x−1)) (Eq. 12)
- Class weight: weight_i = n_samples / (n_classes × n_samples_in_class_i) (Eq. 13)
Assumptions: (a) the t→z→m dependence order is the right factorization (grid-searched, but only 6 orders tested); (b) 20 random-numbered zones preserve enough spatial information; (c) the 0/5/10 score weights are meaningful (chosen, not learned); (d) φ's 0.3 decay rate is appropriate (chosen, not tuned); (e) dropping own-goal matches is harmless.

## 5. Features / target
Inputs per event: interevent time, zone (1–20), action (5 classes), 5 engineered continuous features (zone_s, zone_deltax, zone_deltay, zone_sg, zone_thetag). History: prior 40 events. Targets: next event's interevent time (regression), zone (20-way), action (5-way). HPUS inputs: the model's predicted zone/action distributions per event in a possession.

## 6. Validation design
Baselines: AR(2)+transition-probability statistical model; modified Seq2Event with transformer encoder; with unidirectional LSTM; and a fine-tuned Seq2Event (transformer feedforward dim 8→2048). Metrics on validation set: total loss, RMSE_t, CEL_zone, CEL_action, training time, parameter count. Ablations: dependent vs. independent forecasting heads (Table 2), zone vs. (x,y) features (Table 3), forecast order (Table 6). HPUS validated by team-level correlations with final league ranking, goals, and xG on the 2017/18 Premier League (test set). Grid search: seqlen ∈ {1,10,40,100}, dim_feedforward up to 16384, orders, num_layers, activations, dropout (best values bolded in Table 5; seqlen 40 selected). Splits are by match, not strictly time-ordered within season.

## 7. Numerical results / baselines
Table 1 — validation set (exact):
- AR(2)-Trans-prob: total loss 6.98, RMSE_t 0.12, CEL_zone 2.34, CEL_action 3.40
- Modified Seq2Event (Transformer): 4.57, 0.11, 2.11, 1.39, 47 min, 13K params
- Modified Seq2Event (Uni-LSTM): 4.51, 0.10, 2.11, 1.37, 129 min, 4K params
- Fine-tuned Seq2Event (Transformer): 4.48, 0.10, 2.09, 1.36, 79 min, 137K params
- NMSTPP: 4.40, 0.10, 2.04, 1.33, 49 min, 79K params
Paper's claim: NMSTPP is the most effective (best total loss, zone and action CEL; tied best RMSE_t) and relatively efficient (+2 min vs. fastest baseline, −0.17 total loss).
Table 2 — dependent vs. independent heads: dependent 4.40 total loss vs. independent 4.44 (difference from action CEL 1.33 vs. 1.37). Table 3 — zone vs. (x,y): identical (RMSE_t 0.10, CEL_action 1.33 both) — zones lose nothing and gain explainability. Table 6 — order t/z/m best (4.40); order affects action CEL by up to 0.11.
HPUS verification (2017/18 Premier League): correlations with final ranking — average goal −0.84, xG −0.81, HPUS −0.78, HPUS++ −0.74 (negative = better teams rank higher numerically); HPUS correlates 0.92 with goals and 0.92 with xG; HPUS++ 0.91 with goals, 0.90 with xG. Paper's claim: HPUS reflects final ranking and attacking performance without ever using goal data. Case studies: Man City vs. Newcastle (2018-01-21, 3–1) and Chelsea vs. Newcastle (2017-12-02, 3–1) cumulative HPUS/HPUS++ curves distinguish "created chances" (HPUS) from "converted to attack" (HPUS++).
My interpretation: the HPUS correlations are computed on 20 teams (n=20) — directionally supportive, not precise. The model-vs-baseline wins are real but modest; the fine-tuned Seq2Event baseline is close (4.48 vs. 4.40).

## 8. Code / data availability
Code: https://github.com/calvinyeungck/Football-Match-Event-Forecast. Data: WyScout Open Access Dataset (public); xG from understat.com.

## 9. Leakage & limitations
Adversarial: (a) Train/validation are Bundesliga-only while the test set spans five leagues — a domain shift the paper does not discuss; the HPUS correlations are Premier League test data, i.e., out-of-domain from training. (b) Architecture search on a 5% subsample (100,000 rows) then reported as the final architecture — the search may not transfer to full data. (c) The 0/5/10 HAS weights and the 0.3 decay in φ are hand-chosen, not tuned — HPUS's good correlations may be fragile to these choices. (d) Self-attention heatmap "validation" (weights 0.01–0.06, "no trend") is a non-result presented as confirmation that seqlen=40 is fine. (e) Slicing disregards team possession — sequences mix both teams' events, muddying the "possession utilization" story. (f) Own-goal matches dropped — rare but high-leverage events excluded. (g) The dribble class weight ×1.16 tweak was applied post-hoc for the final validation. External validity to NFL: high — drives are the natural possession analogue, plays are discrete marked events with time/location/type, and the NFL's fixed structure (downs, field zones) maps cleanly onto the zone/action factorization.

## 10. GSE overlap
New capability filling a named gap. The existing-research-map lists gap 14: "Hawkes processes / self-exciting models — mentioned 1×; momentum/scoring-burst modeling absent." This paper is the program's first complete neural point-process template for sequential game events, and its HPUS metric is the first possession-utilization score built on a joint time–space–action forecast. Related map content: the TabTransformer event-representation paper (2606.09327) and diffusion trajectory modeling (2503.18589) cover representation, not point processes; the 2026-09-13 discovery lane's DMD/AR(1) momentum work is the negative result this paper's framework could supersede with a proper excitation model. Nothing in the NGS taxonomy or props docs covers marked point processes on play sequences.

## 11. GSE implementation spec
NFL neural drive point process: (1) Data: nflverse play-by-play 2018–2025. (2) Marks: discretize each play into (time-since-last-play bucket or continuous seconds, field zone (20 zones: 5 downfield bands × 4 lateral thirds, mirroring the paper), play type (run/short pass/deep pass/screen/turnover/penalty/kick — 6–8 classes)). (3) History: trailing 40 plays within the game (truncate at drive boundaries for the drive-score variant; keep cross-drive for the game-flow variant). (4) Model: transformer encoder → history vector → dependent heads t→zone→play-type, same loss structure (scaled RMSE on seconds + cross-entropies). Start in PyTorch; the paper's full pipeline is public code to crib from. (5) Derive "drive utilization score" (DUS): adapt HAS with NFL weights (explosive play = 10, successful play = 5, failed play = 0; red-zone area weight 10) and the same exponential recency decay — a drive-level efficiency metric that uses no scoring data, for content ("most efficient drives that didn't score") and as a feature in the WP model. Effort: 5–8 days (data plumbing 2, model 3, DUS + validation 2).

## 12. Reproducible test
Dataset: nflverse 2018–2023 train, 2024 test (strict season holdout; Bundesliga-only-style shortcut NOT allowed — train on all teams). Baselines: AR(2)+transition-probability statistical model and a unidirectional LSTM Seq2Event analogue, mirroring the paper's Table 1. Metric: total loss (scaled time-RMSE + zone CEL + play-type CEL) on the 2024 test; secondary: DUS correlation with team offensive EPA/play and with final standings (the paper's Table 8 analogue, n=32). The model must beat both baselines on total loss to proceed.

## 13. Acceptance / rejection gate
ADOPT the NFL point-process model if it beats the AR(2) baseline by ≥ 0.10 total loss AND the LSTM baseline by ≥ 0.03 on the 2024 season holdout (the paper's margins were 2.58 and 0.11 — scale expectations down for football's noisier sequences, but demand a win on both). ADOPT the DUS metric for content/features if its team-level correlation with offensive EPA/play is ≥ 0.70 on 2024 (the paper's HPUS hit 0.92 vs. goals on n=20; 0.70 on n=32 is the honest bar). REJECT the whole approach if the transformer fails to beat the LSTM baseline — the paper's core claim is the architecture win, and without it there is no reason to carry the complexity.

## 14. Improvement experiment
Go beyond the paper in two ways it flags as future work: (1) Train on the full multi-season data instead of the paper's subsampled single-league shortcut, and test whether performance scales — the paper explicitly predicts improvement with more data; verify it. (2) Replace the hand-chosen HAS weights (0/5/10) and φ decay (0.3) with learned parameters: fit the weights by maximizing DUS's correlation with held-out team offensive efficiency under cross-validation. If learned weights beat the paper's hand weights on the §12 correlation gate, GSE has a strictly better-than-paper metric; if the hand weights win, the paper's choices are validated and the experiment cost a day. Either way, run the learned-excitation-kernel variant from ledger 0420 §14 on the same harness — the two "momentum" formalisms (point process vs. neural Hawkes) should be compared head-to-head rather than pursued in parallel.
