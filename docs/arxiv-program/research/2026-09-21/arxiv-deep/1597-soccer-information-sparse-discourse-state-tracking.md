# [1597] SOCCER: An Information-Sparse Discourse State Tracking Collection in the Sports Commentary Domain (arXiv:2106.01972)

**Citation:** Zhang, R., & Eickhoff, C. (2021). *SOCCER: An Information-Sparse Discourse State Tracking Collection in the Sports Commentary Domain*. Brown University. arXiv:2106.01972. URL: https://arxiv.org/abs/2106.01972
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — temporally aligned commentary→event-state tracking dataset and baselines; GSE-adaptable to NFL text streams for injury/event detection.

## 1. Research question
Can systems track match-state changes (goal, assist, yellow/red card, substitution per team) from sparse, chattery sports commentary where events are rare and non-event chatter dominates — i.e., discourse state tracking at very low information density — and how do classification (BERT+GRU) vs generative (GPT-2) baselines perform at team vs player granularity?

## 2. Dataset / schema
SOCCER: 2,263 soccer matches (UCL, Europa League, Premier League, Serie A, 2016–2020) from goal.com. 135,805 timestamped English commentary paragraphs + 31,542 in-game event records; 5 event types × 2 teams (goal 6,381; assist 4,305; yellow 8,268; red 360; substitution 12,228); 3,507 unique player names; lineups included. Schema per timestamp t: commentary paragraph c_t → state s_t = {event_{i,j}(t) ∈ {yes/no} at team level, or player name/none at player level}. 70/15/15 match-level train/val/test split; templated score lines removed to block leakage; 171 ill-formed matches programmatically dropped. Dataset + collection code released.

## 3. Method / model
Two baselines. (a) GRU classifier: frozen pretrained BERT sentence embeddings of c_t → 1-layer GRU → 2 feed-forward layers; the 10 team-level event variables (5 types × 2 teams) mapped to a 10-bit joint output to model event co-occurrence rather than 10 independent binaries. (b) GPT-2 variant: commentary + event types + player names concatenated into a training sequence (event names as single tokens like `goal_home`); next-token fine-tuning on HuggingFace weights, greedy decoding at inference (beats beam search / top-k per simpleTOD findings).

## 4. Equations & assumptions
Information density ID = (# state changes) / (# turns/steps). SOCCER ID = 0.19 (state update only every ~5 timestamps) vs MultiWOZ2.1 1.05, OpenPI 3.8–4.3. Assumptions: minute-accurate commentary↔event alignment from goal.com; commentary alone suffices to recover the state; template-sentence removal removes trivial score leakage; 200-word truncation for 1.9% outliers.

## 5. Features / target
Feature: BERT embeddings of the commentary paragraph per timestamp (plus sequential context via GRU). Target: 10-bit event-state vector (team level) or generated event–player sequence (player level).

## 6. Validation design
70/15/15 split by match (no commentary-timestamp overlap between splits). Accuracy and positive recall (recall over event occurrences) on all 10 variables; per-event-type precision/recall/F1 on positives only (Table 4). Controlled sparsity ablation: 0%/20%/40%/60%/80% negative-comment replacement at constant 25,934 comments per subset.

## 7. Numerical results / baselines
Naive majority-class baseline accuracy = 0.9766 (97.66% negatives). Both models barely exceed it on accuracy (GRU 0.9775, GPT-2 0.9759 team-level; GPT-2 player-level 0.9670) — but positive recall is poor: GRU 0.3990, GPT-2 0.4855 team-level; GPT-2 player-level only 0.0775. Per-type F1 (GPT-2, home/away): goal 0.69/0.13, assist 0.58/0.09, yellow 0.64/0.11, red 0.00/0.00 (360 samples → GPT-2 detects zero), switch 0.67/0.01. Sparsity ablation: as chatter share rises 0%→80%, accuracy rises (more true negatives) while positive recall falls 0.49→0.44 (GPT-2) — sparser discourse measurably hardens event detection.

## 8. Code / data availability
Dataset + collection and experiment code released (footnote "available here" in paper).

## 9. Leakage & limitations
No human-labeled events (programmatic extraction from goal.com records); minute-level alignment noisy; guest-side performance collapses for generative model (GPT-2 guest F1 ≈ 0.01–0.13 vs home 0.58–0.69) — unexplained asymmetry; red-card completely undetected by GPT-2; accuracy meaningless under 97.7% class imbalance (positive recall is the real metric); no leakage audit of score-in-commentary beyond template removal; BERT embeddings frozen, GPT-2 fine-tuned — not an apples-to-apples encoder comparison.

## 10. GSE overlap
Aligns with the GSE event-detection-from-commentary lane (ledgers 1594/1595, same problem family) but at lower information density and with a published reusable dataset. Distinct contribution: sparsity ablation quantifying how chatter degrades detection — directly relevant to GSE ingesting real NFL news/commentary streams, which are equally chatter-heavy.

## 11. GSE implementation spec
Adapt the sparse-state-tracking protocol to NFL text streams: build a corpus of timestamped NFL beat-writer/Twitter/X commentary aligned to official play-by-play events (injuries, turnovers, lineup changes); train a classifier over rolling windows of text to flag state-changing items; evaluate with positive recall at fixed precision (not accuracy) under heavy class imbalance; apply the paper's sparsity-ablation protocol to measure how non-event chatter degrades detection; use the 10-bit joint-output trick (or multi-label head) to model correlated events (e.g., injury + substitution co-occurring).

## 12. Reproducible test
Replicate Table 3/4 on the public SOCCER release: majority-class accuracy 0.9766, GPT-2 positive recall ≈ 0.49 team-level / 0.08 player-level. For GSE: positive recall ≥ 0.5 at precision ≥ 0.6 on a held-out month of NFL news→event labels passes the gate.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): reusable public dataset + quantified sparsity effect + a concrete joint-output baseline design. The generative-model guest-side collapse and red-card zero-recall bound how far the exact models transfer; the *protocol* (sparse event tracking with positive-recall gating) transfers cleanly.

## 14. Improvement experiment
Replace frozen-BERT+GRU with a modern long-context encoder (e.g., Longformer/XLNet-style or an LLM with structured output) over multi-timestamp windows to capture cross-paragraph dependencies; add explicit negative-sampling curriculum from the sparsity ablation; test whether the guest-side collapse persists with balanced home/away sampling; extend the state ontology to NFL-relevant events (injury, ejection, weather delay, coach challenge).
