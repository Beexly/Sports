# [2029] Delta Tensor: Efficient Vector and Tensor Storage in Delta Lake (arXiv:2405.03708v3)

**Citation:** Bao, Z., Liao-Liao, L., Wu, Z., Zhou, Y., Fan, D., Aibin, M., Coady, Y., Brownsword, A. (Northeastern University / Oracle Labs) (2024). *Delta Tensor: Efficient Vector and Tensor Storage in Delta Lake*. arXiv:2405.03708v3. URL: https://arxiv.org/abs/2405.03708
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, ~8,400 words).
**Verdict:** ADAPT
**Rationale:** the only lane paper on storing sparse, high-dimensional signal arrays in the lakehouse instead of blobs; directly relevant to the mandated self-learning engine (storing discovered signals/embeddings versioned with the data).

## 1. Research question
Naive tensor serialization (numpy arrays, PyTorch PT files) wastes space on zero elements and cannot slice without full reads. Can array-database chunking and sparse encodings (COO, CSR/CSC, CSF, block-sparse) be adapted to Delta Lake tables on S3 to improve storage and read/write efficiency for ML workloads?

## 2. Dataset / schema
- Dense case: FFHQ subset — 5,000 images of 1024×1024 RGB as tensor (5000, 3, 1024, 1024), 14.6 GB serialized.
- Sparse case: NYC Uber Pickups Apr–Aug 2014 as tensor (183, 24, 1140, 1717) = 8,596,812,960 elements with 3,309,490 nonzeros → 0.038% nonzero (below their 10% sparsity rule of thumb).
- Environment: Spark cluster, 2× Intel Xeon Gold 5215, 128 GB RAM, 1 Gbps network. Timings averaged over 100 repetitions.

## 3. Method / model
Five storage methods, each a Delta Lake table layout:
1. **FTSF** (Flattened Tensor Storage Format, dense tensors): chunk the tensor along its last D_c dimensions; one row per chunk with (id, chunk BINARY, dim_count, dimensions, chunk_dim_count). Dictionary encoding on repeated metadata; schema evolution adds custom metadata.
2. **COO**: (id, layout, dense_shape, indices, value) per nonzero.
3. **CSR/CSC**: flatten tensor to 2D, three arrays (values, col/row indices, row/col pointers); record dense_shape + flattened_shape for reconstruction.
4. **CSF** (Compressed Sparse Fiber): tree-structured compression of duplicate indices per dimension; first two dimensions' fiber pointers/indices stored unchunked per tensor, remaining dimensions chunked.
5. **BSGS** (Block Sparse Generic Storage): Mode-Generic format — partition into dense blocks of any order, store non-null blocks + block indices; enables slicing without reading the whole tensor.
Design split: encoding-before-partitioning (CSR, CSF) vs partitioning-before-encoding (BSGS). BSGS allows slice-before-decode.

## 4. Equations & assumptions
- Compression ratio: C_r = S_encode / S_binary, where S_binary is the naive serialization size.
- t_en(X) = elapsed(F(X)), t_de(X_encode) = elapsed(F^-1(X_encode)).
- t_write = t_ser + t_en(X); t_read_tensor = t_des + t_de(X_encode); t_read_slice = t_des + t_de(XS_encode).
- Tensor/notation formalism: slice X[0:100,:,:,:] ≡ X_[1:100]:::, fibers as higher-order rows/columns.
- Assumptions: access patterns are chunk-local (SGD batch reads); the 10% nonzero sparsity rule of thumb; binary/PyTorch-PT serialization is the fair baseline.

## 5. Features / target
N/A (systems paper). In GSE terms, the "features" are the storage fields: id, layout, dense_shape, indices/values arrays.

## 6. Validation design
Dense: FTSF vs binary on FFHQ subset. Sparse: COO/CSR/CSF/BSGS vs PyTorch PT on Uber tensor. Operations: write tensor, read full tensor, read slice (dense: X[1:100]::: i.e. 100-image fiber; sparse: X[i]::: for i in 0..183). 100 repetitions averaged per timing.

## 7. Numerical results / baselines
Dense FFHQ (exact quotes):
- Size: 14.6 GB → 13.3 GB (−8.90%) despite no compression, via chunking + metadata dict encoding.
- Write: 135.69s → 251.77s (+85.52% overhead; authors attribute 60.73 pts to a Python for-loop RDD construction — removable).
- Read full tensor: 379.51s → 474.51s (+25.02%, from Spark scheduling).
- Read slice: 494.33s → 49.24s (−90.04%) — the payoff case: slice reads fetch only relevant chunks.
Sparse Uber:
- Storage: all methods < 13.23% of PT size; BSGS best C_r = 4.83%.
- Write: CSF most efficient, 26.68% less time than PT; CSF ≈ BSGS.
- Read full: BSGS most efficient, 29.59% less time than PT.
- Read slice: BSGS most efficient, 55.34% less time than PT.
Authors' recommendation: CSF for write-heavy, BSGS for read/slice-heavy sparse workloads; FTSF for dense.

## 8. Code / data availability
Not published. Datasets are public (FFHQ, Uber pickups); implementation described but not released.

## 9. Leakage & limitations
- Adversarial: no statistical tests — 100 repetitions reported as averages only, no variance/confidence. The FFHQ subset is 5K of 70K images "due to hardware limitation," which biases the dense case toward one fixed workload. Spark scheduling dominates overheads (the authors' own decomposition), so gains are partially an artifact of the baseline being unoptimized Python/PT rather than a tuned system.
- The 10% sparsity threshold is admitted to be a rule of thumb; the cost/benefit crossover between sparse encoding and dense chunking is not quantified.
- No integration with actual training loops (no end-to-end model training time comparison) and no ANN/vector-index integration — acknowledged as future work.
- Block-size selection in BSGS is called "crucial" but only qualitatively discussed.

## 10. GSE overlap
No duplication. Complements 2026 (lake tables) and 2024 (KONTOGRAPH): those store tabular features; this covers the array-native side (embedding matrices, player-skill tensors, model checkpoints) in the same Delta Lake.

## 11. GSE implementation spec
Apply to the self-learning/self-growing engine mandate (the 1,250-paper wave: "more signals... statistical engineering to invent stats humans never thought of"):
1. **Discovered-signal storage format:** as GSE's engine learns dense matchup embeddings or player-skill matrices, store them in Delta with FTSF-style chunking (id, chunk, dims metadata) rather than numpy/PyTorch blobs — buys the ~90% slice-read win for batch-time feature extraction (the "fetch only this game's embeddings" pattern matches the paper's SGD-batch argument exactly).
2. **Sparse interaction features** (rare event tensors — e.g., trick plays, injuries per matchup): COO or CSF layout when nonzeros < 10%; the paper's Uber tensor at 0.038% nonzero is more extreme than anything GSE will store, so expected compression will be even better.
3. **Model checkpoint registry:** store model weights as versioned Delta tables — time travel then gives parameter history for free (pairs with 2026's rollback story).
Effort: medium — one storage-layout utility + read/write benchmarks on GSE data. No dependency on the paper's unreleased code; layouts are fully specified.

## 12. Reproducible test
Reproduce the dense-slice experiment on GSE data: build a (weeks × teams × features) tensor of seasonal team features (~5 seasons: 90 × 32 × 50), store as numpy blob vs FTSF-style Delta table, measure: write time, full read, single-week slice read. Also one sparse test: injury/outcome indicator tensor in COO vs blob.

## 13. Acceptance / rejection gate
ADOPT the layout iff: (a) FTSF slice-read latency ≤ 25% of blob read-slice latency on GSE's season tensor (paper showed 10%); (b) write overhead ≤ 2× blob write (paper's 85% was dominated by fixable Python overhead — require the optimized implementation); (c) exact numeric round-trip parity (decode(blob) == original to float32 precision). REJECT if slice reads don't beat blobs on GSE's smaller tensors — the paper's advantage scales with tensor size.

## 14. Improvement experiment
The paper's open wound: block/chunk-size selection is heuristic. Add an access-log-driven auto-chunker: log which (week, team) slices the feature pipeline actually fetches over one season, then optimize chunk shape to minimize expected bytes-fetched — a one-weekend optimization problem (bytes fetched as a function of chunk dims, greedy search) that turns FTSF from a fixed layout into a learned layout. Pairs with AutoComp (2031 planned) on the maintenance side.
