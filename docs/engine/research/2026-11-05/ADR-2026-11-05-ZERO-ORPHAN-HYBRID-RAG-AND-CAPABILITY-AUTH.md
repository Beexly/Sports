# Architecture Decision Records (ADR-0001 .. ADR-0006) — 2026-11-05

**Date:** 2026-11-05  
**Status:** ACCEPTED & WIRED  
**Branch:** `hermes/overnight-2026-11-03-corpus`

---

## ADR-0001: Zero-Orphan Runtime Graph & Single-Writer Mind Feed Contract
- **Context:** Standalone mathematical modules in `packages/prediction-engine/src/expected-metrics/` and `packages/prediction-engine/src/nfl/` risk becoming dead code if not explicitly bound to the runtime overlay and verified by filesystem test gates. Simultaneously, concurrent writes to `brain/mind.jsonl` risk corrupting the training corpus.
- **Decision:** Every non-test `.ts` module in `expected-metrics/` (17 modules, including `batch3-sports-physics-bridge.ts`) and `nfl/` (60 modules) is registered in `REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES`, executed through `evaluateZeroOrphanExpectedMetricsOverlay` $\to$ `runMasterSituationalReasoningOverlay`, and enforced by `zero-orphan-engine-audit.test.ts` and `scripts/ops/verify_manifest.py` (77/77 modules, 0 missing, 0 extra). All new corpus ingestion is staged as trainer-ready JSONL in `data/mind_staging/` for the single-writer Windows trainer.

## ADR-0002: Hybrid Multi-Stream `BM25F` + `MatQuant` + Weller (2025) Sign-Rank RAG
- **Context:** Weller et al. (2025, `arXiv:2508.21038`) prove that single-vector inner-product retrieval is bounded by the sign-rank of the relevance matrix and fails on multi-constraint boolean/atomic conjunctions. Meanwhile, full FP32 embeddings create memory pressure during high-throughput routing.
- **Decision:** Combine (1) 288-bit `Uint32Array` bitwise context mask (`stageA`), (2) Robertson & Zaragoza (2009) multi-stream `BM25F` weighted by Spärck Jones (1972) IDF and Page et al. (1999) PageRank citation authority (`rankDocumentsBm25fWithPageRank`), (3) Matryoshka Quantization (`MatQuant`, `arXiv:2502.06786`) nested `int2 -> int4 -> int8` slicing (`quantizeMatryoshkaMultiPrecision`), and (4) `detectWellerSignRankOverflow` to force exact lexical + bitmask conjunction whenever atomic constraints $\ge 3$.

## ADR-0003: `PEERS` Product-Key + `Edge0` Prerouter + FP32 Router Z-Loss + CORP Isotonic Calibration
- **Context:** Scaling the corpus past 1,000 equations requires sub-linear routing without BF16 router logit collapse (`@miyashita_03`, `2026-11-05-AM (1).md` `B5`), confirmation bias (Heuer 1999 `ACH`), or finite-sample correlation noise (`arXiv:1605.00690v2`). Post-reasoning probabilities also require parameter-free monotone calibration (`arXiv:2008.03033`).
- **Decision:** Wire `routePeerProductKeyAndPrerouter` (`2407.04153` + `Edge0` `AM-02`), `denoiseMarchenkoPasturEffectiveRankShrinkage` (`1605.00690v2`), `softThresholdSparseLasso` (`SLS` 2015), `computeFp32RouterZLossStabilizedSoftmax` (`B5`), `computeHeuerAchDiagnosticityScore` (Heuer 1999), and `computeDimitriadisCorpIsotonicCalibration` (Dimitriadis, Gneiting & Jordan 2021 CORP PAV + Walsh & Joshi 2023 $\text{MCB} \le 0.025$ gate).

## ADR-0004: `OntoSmith` Jev-Gated Knowledge Graph & `SwaT` KV-Cache Fleet Roadmap
- **Context:** From `2026-11-05-AM (1).md` (`F1`–`F3`), unstructured sweep claims need ontology gating before entering the graph, and time-series player/team forecasts benefit from conformalized foundation-model benchmarks.
- **Decision:** Enforce `gateOntoSmithKnowledgeFact` (`apps/web/lib/seo/geo-agent-discovery.ts`) requiring an approved flat ontology relation, verbatim `evidenceSpanQuote`, `sourceDocId`, and `jevJudgeConfidence >= 0.80`. Adopt `FoundationForecast` (`ConformalIntervals`) as a challenger benchmark on weekly scoring/usage series, and track MIT CSAIL `SwaT` (`arXiv:2610.15095`) for open-weight KV-cache handoffs.

## ADR-0005: `SAPPER v2` + `AgentShield` Zero-Trust Capability Auth & Responsible-Gaming Harm-Cap
- **Context:** Public storefront and MCP/A2A agent endpoints face prompt-injection and credential-reuse risks (`AM-04`, `AM-09`), while bettors face longshot misperception (Snowberg & Wolfers 2010) and loss-chasing harm (Syvertsen 2022; Heirene 2021).
- **Decision:** Enforce `mintZeroTrustCapabilityToken` / `verifyZeroTrustCapabilityToken`, `sanitizeUntrustedIngestText`, `evaluateSnowbergWolfersLongshotGuard` (blocking SGP legs $< 18\%$ true prob without $> +4.5\%$ de-vigged EV), and `evaluateResponsibleGamingHarmCap` (suppressing urgency upsells and capping Kelly when EMA harm score $\ge 0.35$).

## ADR-0006: NVIDIA Inception Program + $5,000 Sentry Observability & GPU Compute Stack
- **Context:** Galaxy Sports Edge has been officially **approved for the NVIDIA Inception Program** (Nov 5, 2026) and awarded **$5,000 in Sentry Credits**, alongside requested **$5,000 Microsoft Azure Cloud Credits** (submitted 11/5/26 by Garrett Baxley) and eligible Inception benefits ($10K Crusoe Inference Credits + 1:1 support, 10B DeepInfra Nemotron tokens, $5K Modal Serverless GPU credits, $1K Lambda Cloud credits, €40K Scaleway credits, up to $100K AWS / $350K GCP credits, 50% off Weights & Biases Pro & Lightning AI, and 20 free NVIDIA DLI course codes).
- **Decision:**
  1. **Inference & Simulation Routing:** Route bulk `10B Nemotron Tokens` (DeepInfra) and `$10,000 Crusoe Inference Credits` into Hermes corpus distillation, `OntoSmith` fact extraction, and `10,000-world` PBP Monte Carlo sweeps so frontier Claude/GPT seats remain at $0 burn for bulk jobs.
  2. **NVIDIA Enterprise Reference Architecture (`Run:ai` + `NIM` + `TensorRT-LLM` + `RAPIDS XGBoost` + `Merlin HugeCTR`):** Use GPU fractioning (`Run:ai` control plane + `NIM-Service` / `NIM-Cache` pods over `nvcr.io`) and post-training quantization (`TensorRT-LLM` FP8/INT4 + `MatQuant`) on Modal ($5K) / Azure ($5K) / Lambda ($1K) GPUs, and accelerate tabular feature sweeps with `Spark 3.0 + RAPIDS XGBoost` and `NVIDIA Merlin HugeCTR`.
  3. **Production Error & Latency Observability ($5,000 Sentry Credits):** Instrument `apps/web`, `apps/mobile`, `workers/twitter-bot`, and the Python/C++ GSI & JEV simulation pipelines with Sentry transaction tracing and Conformal Drift alerting while strictly redacting PII and secrets.
