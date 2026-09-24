# [0551] ProSkill: Segment-Level Skill Assessment in Procedural Videos (arXiv:2601.20661v1)

**Citation:** Michele Mazzamuto, Daniele Di Mauro, Gianpiero Francesca, Giovanni Maria Farinella, Antonino Furnari (2026). *ProSkill: Segment-Level Skill Assessment in Procedural Videos*. arXiv:2601.20661v1. URL: https://arxiv.org/abs/2601.20661v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3164 lines).
**Verdict:** REJECT — a computer-vision dataset paper for procedural (assembly/furniture/tent) videos with no sports data, no sports method, and no transfer path to GSE's NFL engine.

## 1. Research question
How to benchmark action-level skill assessment in procedural (non-sports) videos: the authors build ProSkill, the first dataset with both pairwise and absolute skill annotations for procedural tasks, via a scalable Swiss-tournament + Elo annotation protocol, and benchmark state-of-the-art skill-assessment algorithms (pairwise and global ranking) on it.

## 2. Dataset / schema
ProSkill: segment-level skill annotations over video segments drawn from five existing procedural video datasets — Assembly101, IKEA (furniture assembly), EgoExo4D, Epic-Tents, Meccano. Annotation scale: 16,372 unique pairwise comparisons labeled by 551 qualified Amazon Mechanical Turk workers (each pair judged by 5 independent workers, majority vote; low-agreement pairs re-assigned to 3 more). Worker qualification: >90% historical approval + gold-standard qualification tests. Annotator mean agreement rates: IKEA 0.724, EgoExo4D 0.716, Assembly101 0.705, Epic-Tents 0.699, Meccano 0.666. All data and code at https://fpv-iplab.github.io/ProSkill/. No sports content; the source domains are manufacturing/assembly/daily procedural tasks.

## 3. Method / model
Annotation protocol (the paper's main methodological contribution): Stage 1 — pair video segments of the same action following a Swiss-tournament scheme (segments paired against similar current scores; no repeat matchups; all segments compete every round); Stage 2 — crowdsourced pairwise "which performer is more skilled" labels; Stage 3 — aggregate pairwise outcomes into continuous absolute scores using an Elo rating system (expected score E_A = 1/(1+10^{(R_B−R_A)/400}), standard update), iterated over R rounds until rankings stabilize (rankings stable around round 6; continuing toward round-robin gives moderate Kendall's τ gains). Benchmarked algorithms: global ranking — USDL (uncertainty-aware score distribution learning), DAE-AQA, CoFInAl; pairwise ranking — RAAN (true test-test generalization), AQA-TPT, CoRe (reference-based: test video compared against a training example). Features: I3D and VideoMAE embeddings. Hyperparameter search per model: score normalization, noise augmentation, learning rate.

## 4. Equations & assumptions
No equations stated (beyond the standard Elo expected-score/update formulas, which the paper cites rather than derives). Stated assumptions: pairwise "higher skill" judgments are transitive enough for Elo to produce a consistent global ranking; Swiss pairing of similarly-scored segments yields maximally informative comparisons; majority vote of 5 (up to 8) crowd workers approximates expert judgment; Elo scores aggregated from noisy pairwise labels are a valid continuous ground truth for regression.

## 5. Features / target
Inputs: video clips of procedural actions, featurized as I3D or VideoMAE embeddings (single [1,1024] aggregated vector per clip for USDL/DAE-AQA; multiple temporal representations for CoFInAl). Targets: (a) global ranking — continuous Elo-derived absolute skill scores (Spearman's ρ vs ground truth); (b) pairwise ranking — binary winner labels (accuracy).

## 6. Validation design
Train/validation/test splits per source dataset (splits not dated — video datasets, not time series). Metrics: Spearman's ρ for global ranking; pairwise winner-prediction accuracy for pairwise methods. No baselines beyond the six benchmarked methods; no comparison to simpler non-deep baselines reported.

## 7. Numerical results / baselines
Paper's stated claims: Global ranking — CoFInAl achieves the highest Spearman correlations overall, notably ρ = 0.59 on Meccano (also best on IKEA and Epic-Tents); USDL I3D ranges 0.12–0.38 across datasets (VideoMAE 0.19–0.43); DAE-AQA less stable. VideoMAE features generally beat I3D except on Assembly101. Meccano is easiest (controlled setting); Assembly101 hardest (high variability, noisy annotations). Pairwise ranking — best overall: AQA-TPT with VideoMAE on EgoExo4D at 0.79 accuracy; worst: RAAN with I3D on IKEA at 0.45; Assembly101 averages 0.60 (just above chance); Meccano averages 0.63/0.60 depending on features. Authors' conclusion: "existing state-of-the-art methods... tend to underperform on ProSkill, particularly in global ranking tasks" — the problem remains largely unsolved.

## 8. Code / data availability
"All data and code are available at https://fpv-iplab.github.io/ProSkill/." Dataset and annotation-protocol code promised public; code not verified in this read.

## 9. Leakage & limitations
Be adversarial: (a) Domain mismatch is total — procedural assembly videos have no analog in GSE's NFL data products; skill cues (hand technique, tool use) don't transfer to sports analytics. (b) The "absolute" scores are themselves derived from the same pairwise labels via Elo — regression targets are circular with the annotation process, and ranking-stability analysis (§5.3) shows scores keep drifting past round 6. (c) Majority-vote crowd labels with mean agreement ~0.7 inject substantial label noise; annotator feedback showed "skill, technique, confidence" were indistinguishable, so the target is ill-defined. (d) No expert-labeled gold standard — reliability is crowd-consensus only. (e) Benchmarks are all heavy video models (I3D/VideoMAE) with no lightweight or non-deep baselines, so the "SOTA underperforms" claim has no floor. (f) Sample of segments and the segment-selection criteria per source dataset are under-described; survivorship of "annotatable" clips may bias toward clean examples.

## 10. GSE overlap
No overlap. The existing-research-map contains no computer-vision, video-understanding, or skill-assessment work; GSE's corpus is tabular/charting/tracking-odds modeling. This paper is not in the 64-ID dedup list. It is a new domain (CV procedural video), not a duplicate — but also not an extension of anything GSE does. One faintly reusable idea: the Swiss-tournament + Elo protocol for converting cheap pairwise crowd judgments into continuous absolute ratings — but GSE has no crowd-labeling pipeline and no use case for subjective video ratings.

## 11. GSE implementation spec
No implementation warranted. The only salvageable artifact — the Swiss-tournament/Elo crowd-annotation protocol — could be noted in one line of a future labeling-playbook doc if GSE ever crowdsources subjective labels (e.g., film-grade charting). No data sources, no model build, no effort justified. Estimated effort: 0 (document-only).

## 12. Reproducible test
Not applicable — no GSE-relevant claim to test. The closest GSE-analogous check (whether pairwise-to-Elo aggregation stabilizes on noisy judges) has no GSE dataset to run on.

## 13. Acceptance / rejection gate
REJECT: no test to pass. Revisit only if GSE builds a crowd-labeled subjective-rating pipeline, in which case adopt the Swiss-pairing + Elo-aggregation protocol and validate ranking stability (Kendall's τ across rounds) before trusting absolute scores.

## 14. Improvement experiment
If the protocol were ever reused: replace majority-vote aggregation with a Bradley-Terry model that jointly estimates per-annotator reliability (a la Dawid-Skene) inside the Swiss-tournament loop, so low-agreement pairs get down-weighted rather than re-annotated — likely cheaper than the paper's "3 extra workers" fallback and yielding calibrated uncertainty on the absolute scores.
