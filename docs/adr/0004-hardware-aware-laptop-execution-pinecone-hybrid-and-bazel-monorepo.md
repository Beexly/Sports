# ADR-0004: Hardware-Aware Laptop Execution (`i7-1255U` + `Iris Xe`), Pinecone Hybrid Index & Bazel Monorepo Build Optimization

## Status

Accepted (`2026-11-06`)

## Context

Our primary Windows development and orchestration host runs a **12th Gen Intel Core i7-1255U** (`10 Cores / 12 Logical Processors`), **32 GB RAM**, and **Intel Iris Xe Graphics** (`2 GB` shared adapter configuration, `Driver 32.0.101.7088`, no local NVIDIA CUDA dGPU), with tight local SSD free-space margins on `C:` and `G:`. Meanwhile, we have `372` wired repositories/URLs, `210` cataloged books (`6.18 GB` across `395` Google Drive PDFs), and a multi-language (`TypeScript` + `Python 3.13`) monorepo.

## Decision Drivers

* **Prevent Local OOM & Disk Exhaustion**: Never run heavy Docker Desktop WSL2 VMs or attempt to compile NVIDIA-only CUDA kernels (`nvcc` / `Megatron-LM` / `TensorRT-LLM`) locally, and never hydrate all `6.18 GB` of DriveFS PDFs simultaneously into a `1.7 GB` free disk buffer.
* **Sub-25MB Local RAM Corpus Retrieval**: Offload dense + sparse BM25 vector retrieval of the `210`-book / `12,304`-equation corpus to Pinecone Serverless (`2025-04` API, `gse-200-book-hybrid-index`) so local Python workers use `< 25 MB` RAM.
* **Exploit Intel Iris Xe iGPU Native Acceleration**: Route local GPU compute through `DirectML` (`torch-directml` / `onnxruntime-directml`), `Vulkan` (`Kompute`), `OpenCL FP16S` (`FluidX3D`), and `Taichi` (`ti.vulkan`).
* **Deterministic Incremental Builds**: Use Bazel (`WORKSPACE.bazel`, `.bazelrc`, fine-grained `BUILD.bazel` targets) with `--local_cpu_resources=HOST_CPUS*.75` and `--local_ram_resources=HOST_RAM*.75`.

## Considered Options

### Option 1: Uniform Local Execution of All Repos & Local In-Memory Vector Indexes
- **Pros**: No external cloud dependencies.
- **Cons**: Crashes the laptop via RAM/disk exhaustion and fails on CUDA-specific repositories.

### Option 2: 4-Tier Hardware Execution Routing (`Tier A..D`) + Pinecone Hybrid Serverless Offload + PostHog Cloud (`516325`) + Bazel Resource Governors
- **Pros**: 100% of all `372` repos/URLs and `210` books are actively ingested and wired (`skipped = 0`), while each workload executes on its optimal substrate (`Tier A` vectorized CPU, `Tier B` Iris Xe DirectML/Vulkan, `Tier C` Cloud API/PostHog/Pinecone, `Tier D` Corpus Math Ingestion + Remote GPU Worker Offload).
- **Cons**: Requires explicit tier classification metadata in `mega_sweep_2026_11_06_wired_manifest.json`.

## Decision

We adopt **Option 2**: Enforce the 4-Tier Hardware Execution Classifier (`Tier A`: `243`, `Tier B`: `9`, `Tier C`: `87`, `Tier D`: `33`), Pinecone Hybrid Serverless offload (`intelligence/corpus/pinecone_hybrid_corpus.py`), PostHog Cloud Project `516325` telemetry (`intelligence/telemetry/posthog_cloud_context.py`), and Bazel monorepo build optimization (`WORKSPACE.bazel`, `.bazelrc`, `BUILD.bazel`).

## Rationale

1. **Zero Skips, Zero Crashes**: Every single repository and textbook is 100% ingested into the mind and engine without starving the `i7-1255U` CPU or overflowing disk cache.
2. **Bazel Action Caching**: Fine-grained `ts_project` and `py_library` targets ensure only modified sub-packages re-typecheck or re-test.

## Consequences

### Positive
- Local memory footprint for corpus retrieval drops below `25 MB` via Pinecone `2025-04` hybrid search.
- Bazel governors cap build concurrency at 75% host CPU/RAM.

### Negative
- Cloud offload (`Tier C` / `Tier D`) requires environment credentials in `.env.local` (with deterministic local fallbacks when offline).

## Implementation Notes

- Hardware & URL Tier Audit: `data/audits/laptop_hardware_and_url_tier_audit_2026_11_06.json`
- Pinecone Hybrid Client: `intelligence/corpus/pinecone_hybrid_corpus.py`
- PostHog Cloud Context Client: `intelligence/telemetry/posthog_cloud_context.py`
- Bazel Workspace & Rules: `WORKSPACE.bazel`, `.bazelrc`, `packages/prediction-engine/BUILD.bazel`, `intelligence/BUILD.bazel`, `apps/web/BUILD.bazel`

## Related Decisions

- [ADR-0001](0001-uncompressed-ingest-and-learn-coupled-5api-omniscience.md): Uncompressed Ingest-and-Learn Doctrine
- [ADR-0006](0006-multi-channel-video-social-follower-growth-and-ad-affiliate-revenue-engine.md): Multi-Channel Video, Social & Revenue Engine

## References

- `docs/engine/research/2026-11-06/BAZEL_MONOREPO_BUILD_OPTIMIZATION_ARCHITECTURE.md`
- `tests/python/test_bazel_monorepo_build_optimization.py`
