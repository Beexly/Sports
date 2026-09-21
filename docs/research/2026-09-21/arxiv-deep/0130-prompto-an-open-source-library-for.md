# [0130] Prompto: An open source library for asynchronous querying of LLM endpoints (arXiv:2408.11847)

**Citation:** Ryan Sze-Yin Chan, Federico Nanni, Angus R. Williams, Edwin Brown, Liam Burke-Moore, Ed Chapman, Kate Onslow, Tvesha Sippy, Jonathan Bright, Evelina Gabasova — Research Engineering Group & Public Policy Programme, The Alan Turing Institute; Research Software Engineering Team, University of Sheffield (2024). *Prompto: An open source library for asynchronous querying of LLM endpoints*. arXiv:2408.11847v1. URL: https://arxiv.org/abs/2408.11847v1
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML.
**Verdict:** ADOPT — a concrete MIT-licensed library for async, rate-limit-aware querying across multiple LLM endpoints with measured 9–36× speedups; directly applicable to GSE's multi-model research harness (arXiv sweep querying, engine-benchmark model comparisons) and to Garrett's multi-provider routing (OmniRoute/OpenRouter).

## 1. Research question
How can researchers run large-scale comparative studies across multiple LLM endpoints (proprietary APIs + self-hosted) without writing per-endpoint code and without idling on rate limits — while keeping experiments reproducible from a single input file?

## 2. Dataset / schema
No ML dataset. Experiments (Appendix A) use 100 prompts sampled from the Stanford Alpaca instruction-following data (tatsu-lab/stanford_alpaca alpaca_data.json), run on a 2021 MacBook Pro (M1 Pro, 32 GB). Compared endpoints: OpenAI API (gpt-3.5-turbo, gpt-4, gpt-4o), Gemini API (gemini-1.5-flash), Ollama (Llama 3, local). Rate settings: 500 queries/min for OpenAI/Gemini; 50 QPM for Ollama (local-machine-limited).

## 3. Method / model
(a) Experiment spec: a single JSONL file where each line (prompt_dict) carries prompt, api, model_name, plus optional parameters (temperature etc., passed through un-unified — OpenAI max_tokens vs Gemini max_output_tokens are NOT normalized), group (for parallel queue grouping), and multimodal inputs via the media folder. CSV inputs auto-convert to JSONL. (b) Execution: prompto_run_experiment CLI (or Python Settings/Experiment API) sends requests asynchronously; --max-queries sets per-minute pacing (e.g., 50 QPM → one request every 1.2 s); --max-attempts sets retries with failed prompts re-queued at the back; --parallel (-p) runs per-API/per-model queues concurrently in a single thread (async, not multiprocessing), each queue with its own rate limit. (c) Pipeline mode: prompto_run_pipeline watches the input folder and processes new experiment files in last-modified order. (d) Outputs: timestamped output folder with the completed JSONL (each prompt_dict gains a "response" key), the original input copy, and a run log. (e) Evaluation: built-in scorers (match, includes; --scorers flag) plus LLM-as-judge via judge prompt templates; rephrasing pipelines for prompt-robustness studies. (f) Extensibility: new APIs subclass AsyncAPI and implement async query().

## 4. Equations & assumptions
No numbered equations ("Not stated in paper" — the paper is a systems/library paper). The one quantitative relationship stated: with --max-queries = 10, requests are sent every 60/10 = 6 seconds (Section 3.2). Assumptions: API keys via environment/.env; per-endpoint QPM limits are known and set by the user; retry-on-error is safe (idempotent reads); async single-thread concurrency is sufficient (no CPU-bound work in the client).

## 5. Features / target
Input features: prompt_dict (prompt text or chat-history list, api, model_name, parameters, group). Target: collected model responses + optional scores, written to the completed JSONL. Prediction horizon: per-experiment batch; pipeline mode is continuous.

## 6. Validation design
Appendix A: three timing experiments, each 100 prompts per endpoint/model, synchronous baseline vs prompto — (A.1) async vs sync per endpoint; (A.2) parallel multi-endpoint vs sync; (A.3) parallel multi-model on one endpoint vs sync. Single-machine (M1 Pro MacBook), single-run timings reported (no variance — "Not stated in paper").

## 7. Numerical results / baselines
Exact (Appendix A tables): A.1 — sync vs prompto seconds for 100 prompts: OpenAI 126.31 → 13.92 (9.07×); Gemini 163.49 → 14.09 (11.60×); Ollama 271.45 → 268.59 (1.01× — Ollama serializes async requests server-side, disclosed honestly). A.2 (300 prompts, 3 endpoints in parallel): sync 558.74 → prompto 269.06 (2.08×; bottlenecked by Ollama). A.3 (OpenAI, 3 models in parallel): GPT-3.5 130.73 → 14.29 (9.15×); GPT-4 392.21 → 19.79 (19.82×); GPT-4o 241.24 → 18.11; overall 705.38 → 19.30, described as "approximately 35 times speedup." No accuracy/quality metrics — this is a throughput library, correctly scoped.

## 8. Code / data availability
Yes — MIT license: https://github.com/alan-turing-institute/prompto; PyPI: prompto; docs + Jupyter tutorial notebooks at https://alan-turing-institute.github.io/prompto/; intro video linked. Appendix notebooks reproduce the timing experiments.

## 9. Leakage & limitations
Adversarial read: (a) timings are single-run on one laptop — cloud API latency variance isn't characterized; (b) generation parameters are deliberately NOT unified across APIs (footnoted as a design choice) — a footgun for comparative studies (temperature/top-p semantics differ); (c) scorers are applied per-output without batching (authors disclose this as future work); (d) no cost tracking (spend per experiment) — a real concern at 500 QPM; (e) 2024 vintage: model list (gpt-3.5-turbo, gemini-1.5-flash) is dated, but the architecture is model-agnostic. None of these block adoption for GSE's use.

## 10. GSE overlap
From existing-research-map.md: no LLM-querying infrastructure research in the corpus. Directly relevant existing assets: Garrett's model-routing preference (OmniRoute fork + OpenRouter per MEMORY.md), the NVIDIA NIM key used transiently for TASK-012, and the ongoing arXiv deep-research program itself — which is exactly the "comparative multi-model study" workload Prompto was built for. No duplication. High synergy: the sweep's screeners currently hand-roll per-model querying code, which is the pain Prompto eliminates.

## 11. GSE implementation spec
Adopt Prompto as the query harness for GSE's multi-model research work: (a) pip install prompto on the VM; (b) add AsyncAPI subclasses for Garrett's routers (OmniRoute/OpenRouter-compatible OpenAI-style endpoints — likely a few hours, subclassing AsyncAPI with an async query()); (c) convert the arXiv-sweep screening prompts into one JSONL experiment file per wave (prompts × models), replacing the hand-rolled per-model scripts; (d) use --parallel queues with per-endpoint QPM set from each provider's published limits; (e) keep the timestamped output folders as the experiment record (aligns with the repo-corpus rule: docs/research/<date>/). Effort: 1 day including the router adapters.

## 12. Reproducible test
Dataset: wave-4 abstract-triage prompts (already in the sweep) × 2 models (one OpenAI-style, one Gemini-style). Metric: wall-clock time for 100 prompts vs the current synchronous screening script; plus response-completeness (no dropped/empty responses). Baseline: current hand-rolled scripts.

## 13. Acceptance / rejection gate
ADOPT Prompto as the standard multi-model query harness iff it completes the 100-prompt × 2-model test ≥5× faster than the synchronous baseline with zero dropped responses and per-endpoint QPM respected (no 429s); reject if the AsyncAPI adapter for Garrett's routers proves unstable (any dropped responses or rate-limit violations across 3 consecutive runs).

## 14. Improvement experiment
One follow-up: add spend tracking to the harness — wrap each queue to log tokens-in/tokens-out per model and emit a per-experiment cost line in the run log (the paper's disclosed gap: no cost visibility at 500 QPM). Dataset: the wave-4 triage run. Metric: estimated $ cost per 100 prompts per model, reconciled against provider invoices. Gate: tracking overhead <1% of runtime and cost estimates within 10% of invoiced amounts.
