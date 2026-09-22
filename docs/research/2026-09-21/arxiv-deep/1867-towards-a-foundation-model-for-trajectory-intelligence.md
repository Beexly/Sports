# [1867] Towards A Foundation Model For Trajectory Intelligence (arXiv:2312.00076)

**Citation:** Rakuten Institute of Technology (2023). *Towards A Foundation Model For Trajectory Intelligence*. arXiv:2312.00076. URL: https://arxiv.org/abs/2312.00076
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Its three-stage spatial tokenizer (H3 → spatiotemporal clustering → hierarchical sub-hash WordPiece) is a directly reusable design for taming the vocabulary explosion of dense NFL tracking tokens; the model itself is spatially-aware-only and trained on proprietary check-in data.

## 1. Research question
Can the LLM pre-train/fine-tune paradigm be lifted to trajectories — a "large trajectory model" — given two trajectory-specific obstacles: (1) far less training data than text, (2) inflated spatial vocabularies (500k+ unique hashes for a country the size of Japan vs. LLM vocabularies)?

## 2. Dataset / schema
**Proprietary Rakuten check-in dataset** (Japan, 12 months): 6M+ users of Rakuten services, 2B+ check-ins; tuples (anonymized user ID, lat/lon, timestamp). Filtered: trajectories with <3 distinct hashes or length <10 excluded. Split 70/15/15 train/val/test. Table I compares against public check-in datasets (paper's dataset "significantly larger than all publicly accessible check-in datasets combined"). Schema: monthly user trajectories of sparse check-ins, NOT continuous movement data. Data/code not public.

## 3. Method / model
**Spatial tokenizer (the core contribution), 3 stages:**
1. *Encoding*: lat/lon → hash via Uber H3 (resolution 8).
2. *Clustering*: hash sequences (with timestamps) clustered by spatiotemporal proximity (10 minutes, one H3 hexagon) to control point density and reduce noise.
3. *Sub-hash tokenization*: hierarchical hashes split into sub-hashes; WordPiece tokenizer trained to 30k vocabulary. Example: 49 unique hashes → 15 sub-hashes; a Japan-sized country needs 500k+ raw hashes.
**Pretraining:** Hugging Face BERT, default hyperparameters; whole-hexagon pre-masking at 20% masking ratio; 40 epochs ≈ 240 hours on 2× NVIDIA Tesla V100 (data parallel); chunk size 512, batch size 64; >40B spatial tokens seen total (>1B tokens by end of epoch 1).
**Fine-tuning:** only the test split; 20k random examples per downstream task, 80/20 train/val balanced subsets, 10 epochs, batch 64.

## 4. Equations & assumptions
No equations stated (paper is empirical/engineering). Assumptions: masked-token prediction over spatial tokens learns "how humans interact with physical space"; H3 resolution 8 + 10-min/1-hex clustering preserves meaningful mobility structure; check-in sequences (sparse, event-driven) are an adequate proxy for trajectories; 30k WordPiece sub-hash vocab balances coverage and compute.

## 5. Features / target
Inputs: sub-hash spatial tokens from check-in sequences. Pretraining target: masked whole-hexagon tokens (20%). Downstream targets: (1) Next Sub-trajectory Prediction (does sub-trajectory B follow A?); (2) Destination Prediction (last hexagon given first 25% of trajectory); (3) Trajectory-User Association (same user or not).

## 6. Validation design
- Pretraining: validation perplexity curve over 40 epochs; small-data control (80M tokens → perplexity ≈ 8 by epoch 12) to explain the fast early drop.
- Fine-tuning: average F1 after 10 epochs, pretrained vs randomly-initialized weights, on 20k-example balanced subsets per task; loss curves (Figure 7).
- No external baselines compared; no time-ordered split described beyond the 70/15/15 partition (user-level split, not temporal).

## 7. Numerical results / baselines
- Validation perplexity: 2327 (random init) → 5.27 (end of epoch 1) → 3.79 (end of epoch 40).
- Downstream: pretrained model beats random-init fine-tune by 33.6% better average F1 across the three tasks after 10 epochs (Table II).
- Baselines: only random initialization — no comparison to any prior trajectory model.

## 8. Code / data availability
None stated. Dataset proprietary (Rakuten); no code link. Hugging Face BERT implementation and Uber H3 are off-the-shelf.

## 9. Leakage & limitations
- Authors explicitly admit: model is "spatially aware but does not explicitly consider the temporal dimension" — a major gap for movement data.
- Check-in data ≠ trajectory data: sparse, event-driven check-ins lack speed/direction/dwell semantics of 10Hz tracking.
- Proprietary data, no code — unreproducible as presented; baselines limited to random init (weak).
- Fine-tuning on 20k examples drawn from the same test split distribution; user-identity elimination claimed but trajectory-user association task itself shows re-identifiability tension (privacy caveat noted by authors).
- No ablation of tokenizer stages (clustering vs sub-hash contributions unseparated).

## 10. GSE overlap
GSE has no trajectory tokenizer; raw (x, y) coordinates are continuous inputs to its models. This paper's tokenizer is the NEW reusable unit: 10Hz × 22 players × 60 frames ≈ 13k position observations per play — naive discretization explodes vocabulary exactly the way this paper addresses. Complements 1862–1866 (which assume continuous/grid embeddings): sub-hash WordPiece tokenization of field cells gives a fixed, compact, hierarchical vocabulary for a tracking-language model. Distinct from HiT-JEPA's H3+node2vec (no vocabulary control mechanism).

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; quantize field to fine cells (e.g., 0.5-yd); map each (player, frame) to a hierarchical cell hash.
2. Build the 3-stage tokenizer: cell-hash encoding → spatiotemporal clustering (e.g., 0.3 s window, adjacent-cell merge to denoise jitter) → WordPiece sub-hash tokenization to a 30–50k vocab trained on 7 seasons of tracking.
3. Pretrain BERT-style masked trajectory model (whole-cell pre-masking 20%) on tokenized play sequences; chunk size matched to play length (~1.5k tokens).
4. Use token embeddings as input features for GSE prop models, or fine-tune task heads (destination prediction ≈ ball-carrier end position; trajectory-user association ≈ player-style identification).
5. Effort: ~2 engineer-weeks (tokenizer training + BERT pretraining on 1–2 GPUs).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking tokenized with the pipeline above; train tokenizer + BERT on weeks 1–12, test on weeks 13–18. Tests: (a) masked-token perplexity vs a no-clustering baseline tokenizer (vocab efficiency: tokens per play); (b) frozen token embeddings + linear head for ball-carrier end-zone prediction vs raw-coordinate baseline; metric: accuracy/F1 on held-out weeks. Run target: <48h on 1 GPU.

## 13. Acceptance / rejection gate
ADOPT if: (a) sub-hash tokenizer achieves ≥ 50% vocabulary reduction vs raw cell hashing at equal masked-token perplexity, AND (b) frozen-embedding ball-carrier destination prediction F1 ≥ 10pp above the raw-coordinate baseline on held-out weeks. REJECT if neither holds.

## 14. Improvement experiment
Beyond the paper: (1) add the temporal dimension the authors admit is missing — interleave Δt tokens and train with time-aware masking (mask bursts, not just hexagons), testing whether destination-prediction F1 improves on football where timing is everything. (2) Hierarchical sub-hashes at two field resolutions (coarse zone + fine cell) as separate token streams, letting the model learn zone-level play concepts and cell-level execution — the paper uses a single H3 resolution. Hypothesis: two-resolution tokens beat single-resolution on route-family classification with frozen embeddings.
