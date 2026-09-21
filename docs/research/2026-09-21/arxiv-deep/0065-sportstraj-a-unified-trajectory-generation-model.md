# Deep Research Ledger — 0065

- **file_index:** 0065
- **arxiv_id:** 2405.17680v2
- **title:** Sports-Traj: A Unified Trajectory Generation Model for Multi-Agent Movement in Sports
- **authors:** Yi Xu, Yun Fu (Northeastern University — Dept. of ECE; Khoury College of Computer Science)
- **venue:** Published as conference paper at ICLR 2025
- **date read:** 2026-09-21
- **reading path:** ar5iv failed; full text read via arXiv PDF (1,678 extracted lines, all read). GitHub repo verified via web search: https://github.com/colorfulfuture/UniTraj-pytorch
- **verdict:** ADOPT

---

## 1. Problem statement and claimed contribution

The paper proposes **UniTraj**, a *unified trajectory generation* model: instead of building separate models for trajectory prediction, trajectory imputation, and spatiotemporal recovery, it treats every input format as an **arbitrary masked trajectory** and generates the complete trajectory from it. Contributions claimed (Abstract + §5):

1. A unified task formulation: "any input trajectories with arbitrary missing patterns are treated as masked trajectories" — prediction, imputation, and recovery are all subsumed by generating a complete trajectory from a masked input.
2. **Ghost Spatial Masking (GSM)** module embedded in a Transformer encoder for spatial feature extraction that also encodes the mask pattern.
3. **Bidirectional Temporal Mamba (BTM)** encoder: extends the Mamba SSM to scan bidirectionally; plus a **Bidirectional Temporal Scaled (BTS)** module that scales features through the temporal mask to preserve temporal missing-pattern relationships.
4. Three curated, benchmarked sports datasets with five masking strategies: **Basketball-U, Football-U** (built from NFL Big Data Bowl / Next Gen Stats tracking, 2017 weeks 1–6), and **Soccer-U**.
5. Winner-take-all (WTA) diversity loss to generate K=20 diverse trajectories.

## 2. Method details (architecture, features, training)

- **Architecture (CVAE-based, §2):** UniTraj is a conditional VAE. The observed masked trajectory is encoded in two stages: (a) a **spatial Transformer** encoder over agents at each timestep (includes the GSM module), then (b) a **Bidirectional Temporal Mamba (BTM)** encoder over time, with the BTS module scaling temporal features with the mask. A latent variable **Z** is sampled from a posterior conditioned on the full trajectory (training) and prior (inference); an **MLP decoder** outputs the reconstructed/predicted complete trajectory from Z plus conditional features.
- **Input features per timestep (§2.1):** For agent n at time t: (1) **positions** (x, y); (2) **relative velocities** = first-order difference of positions; (3) **visibility mask** (binary observed/missing); (4) **category one-hot** (ball / offense / defense).
- **GSM (§2.2):** Takes the agent embedding and the mask embedding; the ghost mask embedding is created by applying **max-pooling over the agent dimension of the mask** (ablation: mean/sum also work; max slightly best), elementwise-combined with the agent embedding so spatial attention sees which positions are missing.
- **BTM/BTS (§2.3):** Two Mamba blocks scan the sequence forward and backward; their outputs are combined. The BTS module scales temporal features with the mask pattern to preserve missingness structure.
- **Diversity loss (§2.4, Eq. 11):** weighted sum of three losses, λ1=λ2=λ3=1 (stated in Appendix D): MSE reconstruction term, a KL-type latent term, and a **winner-take-all** term — only the generated trajectory closest to ground truth (min over K=20) is backpropagated, encouraging diversity. (Equation 11's exact printed form is partially garbled; the λ weights and WTA mechanism are stated verbally.)
- **K = 20** generated trajectories per input; evaluation metric minADE20 uses the best of 20.
- **Training:** Adam, initial lr 0.001 decayed by 0.9 every 20 epochs, 100 epochs, batch size 128, seed 2024, PyTorch on NVIDIA A100. Transformer: dim 64, 8 heads, l=1 layer. Mamba: state dim 64, conv kernel 4, expansion 2, depth L=4. Latent Z dim 128. Projection dim 64. Total params at chosen config ≈ 1.77M (L=4) — a small model.

## 3. Math / equations (quote exactly; flag reconstructions)

- **Eq. 2 (CVAE prior/posterior structure):** PRINTED FORM GARBLED in PDF extraction — layout columns interleaved. The text describes it as the standard conditional-VAE objective: posterior q(Z|X_full) conditioned on the complete trajectory vs. prior p(Z|X_masked) from the masked input. **UNCERTAIN — reconstruction from garbled extraction; do not reuse the exact printed formula.**
- **Eq. 4 (ghost mask embedding):** Garbled; described verbally: max-pool the mask over the agent dimension to produce the ghost mask embedding, elementwise combined with the agent embedding. **UNCERTAIN.**
- **Eq. 6–8 (BTM forward/backward scan + BTS scaling):** Garbled in extraction. Described verbally as bidirectional Mamba scans fused with a mask-scaled temporal feature. **UNCERTAIN.**
- **Eq. 11 (total loss):** Garbled, but Appendix D states λ1 = λ2 = λ3 = 1 balancing the three loss terms, and §2.4 describes the winner-take-all selection of the closest of K=20 generated trajectories. **Partially uncertain.**
- No closed-form predictive equations are quoted anywhere; all claims are model-based.

## 4. Data and experimental setup

- **Three datasets (§3.1, Appendix C):** All sequences are length T=50 with 5 masking strategies applied (see below). Coordinate systems and splits:
  - **Basketball-U:** Stats Perform base (104,003 train / 13,464 test raw, 6.25 Hz, 8 s, 50 frames, in feet; 94×50 ft court). After cleaning out-of-boundary sequences: **93,490 train / 11,543 test.** Agents: 1 ball + 5 offense + 5 defense.
  - **Football-U:** NFL Next Gen Stats, **Big Data Bowl tracking files, first six weeks of the 2017 season** (91 games: 73 train / 18 test files). XY in **yards**, unnormalized, (0,0) bottom-left, field 120×53.3 yards. After cleaning: the paper's main text states **10,762 train / 2,624 test** sequences; Appendix Table 6 breaks down mask splits summing to the same totals. Agents: **1 ball + 11 offense + 11 defense.** Note: Appendix text (L1439) contains an obvious copy-paste slip reading "9,882 training and 2,448 testing" for Football-U, but Table 6's per-mask rows sum to 10,762/2,624, so the table values are authoritative.
  - **Soccer-U:** SoccerTrack top-view (60 files; 48 train / 12 test; sliding window size 4): **9,882 train / 2,448 test**, pixel coords, field 3,840×2,160. 1 ball + 11 + 11.
- **Five masking strategies (Appendix C, ~50% masked rate each):**
  1. *Prediction Mask:* observe up to t∈{25,30,35,40}, predict to end (split 25/30/35/40 of 50 frames).
  2. *Random Consecutive Mask:* 1–5 random consecutive holes, each length 3, 4, or 5.
  3. *Random Discrete Mask:* each location masked with probability 50–80%.
  4. *Center Consecutive Mask:* one centered hole of length 25–40.
  5. *Random Agent Mask:* 5 random agents fully masked per sequence.
  Each sequence gets one randomly chosen strategy.
- **Baselines (§3.2):** Mean, Median (fill), Linear Fit, Vanilla LSTM (1997), Transformer (2017), MAT (2018), Naomi (2019), INAM (2020), SSSD (2022), GC-VRNN (2023b).
- **Metrics (§3.2):** (1) **minADE20** — min average displacement error over 20 generated trajectories (lower better); (2) **OOB** — % of generated locations outside field boundaries (lower better); (3) **Step** — mean change in step size (closer to GT better); (4) **Path-L** — mean trajectory length per agent (closer to GT better); (5) **Path-D** — max inter-agent trajectory-length difference (closer to GT better).

## 5. Results (exact numbers, with table/section cites)

- **Table 1 (Basketball-U, feet; Football-U, yards) minADE20:** UniTraj **4.77** (Basketball) and **3.55** (Football). Second-best GC-VRNN: 5.81 / 4.95. Claimed improvements over GC-VRNN: **17.9%** (Basketball), **28.3%** (Football).
- **Table 2 (Soccer-U, pixels) minADE20:** UniTraj **94.59** vs GC-VRNN 105.87 — **10.7%** improvement. (Next best non-UniTraj: SSSD 118.71.)
- **OOB:** UniTraj 6.12e-04 (Basketball), 1.12e-04 (Football), 3.31e-06 (Soccer) — lowest among non-trivial methods (Mean/Median fillers get 0 by construction but have far worse ADE).
- **Ablations (Tables 3–4):** Removing GSM (w/o GSM) → minADE20 4.86/3.92/119.43 (worse than full 4.77/3.55/94.59). Unidirectional Mamba variants (uni w/ BTS) → 5.86/4.09/106.22; removing backward Mamba costs the most. BTS removal (w/o BTS) → 4.86/3.60/105.47. Ghost mask pooling: max (ours) 4.77/3.55/94.59 vs mean 4.80/3.64/100.84, sum 4.79/3.56/102.99, global 4.86/3.74/106.77, learnable 4.92/3.63/107.50.
- **Depth (Table 5 / Appendix Table 7):** Mamba depth L=4 chosen: Basketball minADE20 4.77 at 1.77M params (L=5: 4.81; L=3: 4.85). Transformer depth l=1 best: 4.77 at 1.77M (l=4: 4.89 at 2.75M).
- **Temporal-architecture swap (Table 9):** replacing the Mamba encoder with LSTM → 5.32, VRNN → 5.29, Transformer → 4.99, Mamba w/o BTS → 4.86, full Mamba → 4.77 — Mamba wins even without BTS.
- **Generalization (Appendix E):** ETH-UCY pedestrian: UniTraj avg 0.23/0.36 minADE20/minFDE20 — beats FlowChain (0.29/0.52), slightly worse than MemoNet/EqMotion (0.21/0.35). SDD: 8.68/12.78 vs MemoNet 8.56/12.66. Traffic-Guangzhou imputation: RMSE 3.942 / MAE 2.784 vs BayOTIDE 3.820/2.687 (comparable, slightly worse) and better than CSBI.
- **No held-out NFL predictive validation beyond the Football-U test split; no betting/game-outcome claims.**

## 6. Limitations and risks (as stated + reviewer view)

- **Stated (§5):** MLP decoder is "simple" — authors suggest a more powerful decoder could improve results; fixed agent count (11+11+ball) — varying numbers of agents is future work; no negative societal impacts observed.
- **Reviewer view:**
  - **Garbled equations:** Eqs. 2, 4, 6–8, 11 are not recoverable from the PDF text extraction; the implementation must come from the open-source code, not the printed math.
  - **NFL data age:** Football-U uses 2017 Big Data Bowl tracking (weeks 1–6), a small, dated slice; modern NGS (2020–2025, 10 Hz) differs in schema and cadence.
  - **No uncertainty calibration or real-time claims;** K=20 sampling is offline-friendly but heavier for live use.
  - **Step/Path-L/Path-D metrics favor Linear Fit** (authors admit these measure length information, not location quality) — minADE20 and OOB are the discriminative metrics.
  - Appendix copy-paste inconsistency on Football-U split numbers (resolved via Table 6).

## 7. Reproducibility and artifacts

- **Code:** https://github.com/colorfulfuture/UniTraj-pytorch (also mirrored as https://github.com/chen-dracon/unitraj-pytorch). Appendix states "We have provided the GitHub link in the abstract to our datasets, code, and trained checkpoints. The README.md file includes detailed instructions for downloading the datasets and running the code."
- **Datasets + weights:** raw and preprocessed datasets linked via Google Drive in the README; preprocessing scripts included (`UniTraj/preprocess/{basketball,football,soccer}`, `generatedataset.py` with the five masking strategies).
- **Environment:** conda, Python 3.11.8, PyTorch 2.2.1, mamba-ssm (causal-conv1d≥1.2.0); seed 2024 fixed; full hyperparameters in Appendix D (all quoted in §2 above).
- **Raw sources:** NFL Big Data Bowl tracking via https://github.com/nflfootballops/Big-Data-Bowl and https://github.com/nfl-football-ops/Big-Data-Bowl; nextgenstats.nfl.com; Stats Perform; SoccerTrack (AtomScott/SportsLabKit).

## 8. GSE application

- **Primary use: trajectory imputation + prediction on NFL Next Gen Stats tracking data.** UniTraj handles exactly the failure modes GSE hits in production: partial tracking (occluded/ missing frames), short-history rollout prediction (25–40 of 50 frames observed), and fully-missing agents (e.g., a dropped receiver ID) — all as one model instead of separate imputation and prediction pipelines.
- **Concrete applications:**
  1. **Route/defender trajectory forecasting** for EPA-added / separation features: generate 20 plausible continuations of all 22 players + ball from the first ~0.5 s of a play, derive distributions of expected separation, YAC, tackle probability.
  2. **Counterfactual play simulation:** mask the ball-carrier's future, generate completions under different defensive masks — a generative complement to GSE's existing EPA models.
  3. **Tracking-data QA:** the OOB + Step metrics give an automatic quality gate for incoming NGS feeds (out-of-boundary/velocity-jump detection).
- **Fit with existing GSE stack:** GSE already runs Kalman/particle filters on tracking data (existing-research map). UniTraj is the *generative multi-agent* upgrade: where Kalman gives single-track smoothing, UniTraj gives joint, interaction-aware, multi-hypothesis generation for all 23 entities. It also directly complements the MambaTrack ADAPT (0063): MambaTrack for online association, UniTraj for offline/ batch trajectory generation and imputation.

## 9. Implementation spec for GSE

1. **Phase 0 — reproduce:** Clone https://github.com/colorfulfuture/UniTraj-pytorch; build the conda env (PyTorch 2.2.1, mamba-ssm); download the authors' preprocessed Football-U; run their eval to reproduce minADE20 ≈ 3.55 yards (sanity gate: within 5%).
2. **Phase 1 — data adapter:** Build an NGS modern-schema adapter: map current 10 Hz NGS tracking (x, y, speed, orientation, dir, event tags) to the UniTraj input tuple (position, relative velocity, visibility mask, category one-hot). Standardize field to 120×53.3-yard unnormalized coords; handle variable play lengths by sliding T=50 windows.
3. **Phase 2 — retrain/fine-tune:** Fine-tune the Football-U checkpoint on 2023–2025 NGS regular-season plays with the same five masking strategies (implemented in their `generatedataset.py`); evaluate minADE20 vs. a GSE Kalman rollout baseline on a *time-ordered* held-out month.
4. **Phase 3 — feature extraction:** Wrap the K=20 sampler in a batch service: given a play's first N frames, emit trajectory distributions → downstream features (expected separation at catch point, P(tackle within d yards), route-type classification confidence).
5. **Phase 4 — decoder upgrade (paper's own suggestion):** swap the MLP decoder for a small diffusion/GNN decoder if Phase 2 error concentrates on sharp cuts.

## 10. Test protocol

- **Reproduction gate:** minADE20 on authors' Football-U test ≤ 3.73 (3.55 + 5%) and OOB ≤ 2e-04.
- **GSE gate (time-ordered, no leakage):** train on NGS 2023–2024, test on 2025 weeks 1–4; metric = minADE20 in yards on prediction masks (t=25,30,35,40) vs. Kalman-filter rollout baseline. **Adopt if UniTraj beats Kalman by ≥ 15% on minADE20 with OOB < 1e-03;** adapt (keep imputation-only use) if it wins only on imputation masks.
- **Ablation check:** confirm removing BTS and backward Mamba degrades NGS minADE20 (validates the paper's claimed mechanisms on modern data).
- **Latency check:** measure K=20 sampling time per play on GSE's inference hardware; if > 2 s/play, move to batch/offline feature pipeline rather than live.

## 11. Improvement paths

- Variable agent counts (injured/flagged plays, special teams with different formations) — the paper's stated limitation; a Perceiver-style latent bottleneck or padding-with-mask scheme would remove the fixed-23 constraint.
- Replace the MLP decoder with a diffusion decoder (paper's own suggestion) for sharper cuts and better uncertainty calibration.
- Add contextual conditioning the paper omits: down, distance, score differential, personnel grouping, weather — all available in NGS and likely to cut minADE20 substantially.
- Extend from 50-frame windows to full-play generation for drive-level simulation.
- Explore the Drive-58 dossier diffusion trajectory paper (2503.18589) head-to-head against UniTraj on the same NGS split — pick the better generative backbone rather than assuming Mamba wins.

## 12b. Acceptance gate

1. **Reproduction criterion:** run the authors' code on Football-U and recover Table 1: minADE20 ≤ 3.73 yards (paper: 3.55, +5% tolerance) with OOB ≤ 2e-04 (paper: 1.12e-04), per §10.
2. **Comparison to run:** head-to-head on time-ordered NGS (train 2023–2024, test 2025 weeks 1–4) over the paper's prediction masks (observe t=25,30,35,40 of 50 frames): UniTraj vs. GSE's Kalman-filter rollout baseline — metric = minADE20 in yards plus OOB rate.
3. **Decision rule:** ADOPT only if UniTraj beats Kalman by ≥ 15% on minADE20 with OOB < 1e-03; ADAPT (imputation-only use) if it wins only on imputation masks; otherwise REJECT.

## 12. Verdict

**ADOPT** — UniTraj is the strongest trajectory-generation paper in the batch for GSE: it directly targets NFL tracking data (Football-U is literally Big Data Bowl/NGS), open-sources code + datasets + checkpoints with a full hyperparameter spec, beats 9 baselines by 11–28% on minADE20, and unifies prediction, imputation, and recovery into one model that maps cleanly onto GSE's tracking pipeline.

## 13. Related work / overlap

- **Drive 58-paper dossiers:** diffusion trajectory modeling paper 2503.18589 was already read — head-to-head comparison against UniTraj is the natural next experiment (see §11).
- **This batch:** 0063 (MambaTrack, ADAPT) — same Mamba lineage; MambaTrack handles online multi-object tracking/association, UniTraj handles generative trajectory modeling. Complementary, not duplicative: track with MambaTrack, generate/impute with UniTraj.
- **Existing GSE stack:** Kalman/particle filters (tracking), STRAIN (2305.10262), 27 NGS metric families. UniTraj upgrades the generative side; no overlap with the momentum lane (Garrett's momentum discovery is outcome-momentum, not trajectory).
- **Other trajectory literature:** Social-LSTM, Trajectron++, MotionDiffuser, Traj-MAE — the paper positions against these in §4; UniTraj's differentiator is the unified masked formulation rather than prediction-only.

## 14. Extraction notes

- PDF text extraction garbles several equation layouts (Eqs. 2, 4, 6–8, 11) — flagged UNCERTAIN in §3; the GitHub code is the reliable implementation source. Table layouts interleaved columns in places (Table 6, masking-strategy list) but all quoted numbers were cross-checked against the appendix tables.
- The abstract's "available here" code hyperlink URL is not recoverable from PDF extraction; the repo was located via web search (ICLR poster page lists https://github.com/colorfulfuture/UniTraj-pytorch; README confirms datasets, checkpoints, and preprocessing scripts).
- Appendix Football-U text-vs-table split inconsistency noted in §4; table values used.
- No equations in this paper are directly quotable for reuse beyond the stated hyperparameter values; the math to trust is the code.
