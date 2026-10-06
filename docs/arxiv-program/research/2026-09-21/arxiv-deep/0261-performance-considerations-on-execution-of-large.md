# 0261 Performance considerations on execution of large scale workflow applications on cloud functions (arXiv:1909.03555v1)

**Citation:** Maciej Pawlik, Kamil Figiela, Maciej Malawski (2019). *Performance considerations on execution of large scale workflow applications on cloud functions*. arXiv:1909.03555v1. URL: https://arxiv.org/abs/1909.03555v1
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 463 lines, including references).
**Verdict:** ADAPT — not as numerical conclusions (the 2019 vendor environments are long obsolete), but as a benchmark methodology for measuring the burst-parallel limits of serverless platforms, which is directly reusable if GSE ever bursts its batch pipelines onto cloud functions.

## 1. Research question

The paper asks how well commercial Function-as-a-Service (FaaS) platforms execute large-scale scientific-workflow style workloads — specifically "bag-of-tasks" workflows with thousands of simultaneous short tasks — and what performance pathologies appear: cold starts, noisy-neighbor CPU throttling, API rate limiting, billing-granularity effects, and parallelism ceilings. It benchmarks AWS Lambda, Google Cloud Functions, and IBM Cloud Functions with an identical Linpack payload to quantify achievable parallelism and per-task performance variability.

## 2. Dataset / schema

- **Workload:** HyperFlow bag-of-tasks workflow; 5,120 simultaneous tasks, each running Linpack at matrix size 3408×3408. Each function invocation reports its achieved GFlops and timestamps.
- **Platforms:** AWS Lambda (region eu-west-1), Google Cloud Functions (us-central1), IBM Cloud Functions (United Kingdom). Requests launched from Krakow, Poland.
- **Memory configurations:** AWS 256/512/1024/1536/2048/3008 MB; Google Cloud Functions 256/512/1024/2048 MB; IBM 256/512 MB.
- **Schema (per invocation):** configured memory, achieved GFlops, start/end timestamps, plus API-call latency samples (separately measured outliers up to 1,000 ms).
- **Access:** the benchmark harness is described but no public dataset or download link is given; the workload is reproducible in principle (HyperFlow + Linpack), but the measured numbers are a snapshot of 2019 vendor infrastructure.

## 3. Method / model

Bag-of-tasks benchmark design: launch 5,120 concurrent function invocations of an identical compute payload (Linpack 3408×3408), record per-invocation GFlops and wall-clock behavior, and aggregate mean/SD per memory configuration. Analysis dimensions: (a) achieved parallelism over time (detecting stepped/rate-limited ramp-up); (b) performance vs allocated memory; (c) API overhead (request latency outliers); (d) billing granularity (100 ms rounding) and its interaction with short tasks. No model is trained; this is measurement methodology. Hyperparameter analogues: the memory-size sweep is the "tuning" dimension, and the 5,120-task scale is chosen to exceed documented concurrency limits and expose platform throttles.

## 4. Equations & assumptions

No equations stated. The paper presents no mathematical model — it is an empirical measurement study reported through tables, distributions, and parallelism time-series. The implicit assumptions are: Linpack GFlops is a valid proxy for general task throughput; 5,120 concurrent invocations are sufficient to saturate platform concurrency controls; and measurements from Krakow to the three regions are comparable (network latency to the function endpoint is treated as negligible relative to task runtime).

## 5. Features / target

Not a prediction paper. The "inputs" are: platform (AWS/GCF/IBM), configured memory, and task index/time. The measured "targets" are: achieved GFlops per invocation (mean and SD per configuration) and the effective parallelism curve over the workflow's execution window. There is no label definition or prediction horizon.

## 6. Validation design

No train/test split — this is a systems benchmark. Validation consists of repeated runs at each memory configuration with reported mean and standard deviation (the SDs are large, e.g., AWS 2048 MB: mean 27.26, SD 8.40 GFlops), plus cross-platform comparison under the same payload and cross-region consistency checks. Baselines compared: the three vendors against each other and against ideal linear scale-up. The authors document where behavior deviates from ideal (stepped parallelism on AWS/IBM around 1,000 concurrent executions; apparent rate limiting on Google Cloud Functions).

## 7. Numerical results / baselines

Table I mean GFlops (SD), quoted exactly:

- **AWS:** 256 MB: 2.95 (1.38); 512 MB: 4.62 (1.40); 1024 MB: 10.10 (4.27); 1536 MB: 14.04 (7.18); 2048 MB: 27.26 (8.37); 3008 MB: 27.05 (8.40).
- **Google Cloud Functions:** 256 MB: 6.92 (6.23); 512 MB: 9.54 (3.03); 1024 MB: 16.11 (1.60); 2048 MB: 20.23 (2.03).
- **IBM:** 256 MB: 7.35 (3.47); 512 MB: 7.15 (3.50).

Key findings (authors' claims): performance scales with memory on AWS and GCF but saturates (AWS 2048→3008 MB flat; IBM flat across its two settings); AWS and IBM exhibit stepped parallelism around ~1,000 concurrent executions; GCF appears rate-limited rather than parallelism-stepped; function-API call latency outliers reached 1,000 ms; 100 ms billing granularity materially affects cost for short tasks; per-task performance variability is high (SDs of 30–90% of the mean at low memory settings). The authors conclude FaaS is viable for bursty workflow stages but that hidden throttles and variance must be measured, not assumed.

## 8. Code / data availability

None stated as a link. The HyperFlow workflow system is a known open-source project of the authors' group, but the paper gives no repository URL, no dataset download, and no artifact for the measurement harness itself.

## 9. Leakage & limitations

- **Vendor environments are from 2019 and obsolete.** AWS Lambda, GCF, and IBM Cloud Functions have all changed concurrency models, CPU allocation, and pricing since; every absolute number (GFlops, throttle thresholds, the ~1,000-step) is stale. Only the *methodology* transfers.
- **Linpack is a narrow proxy.** Dense linear algebra at 3408×3408 says little about GSE's actual batch workloads (pandas/nflverse-style tabular crunching, model inference), which are memory- and I/O-bound rather than FLOP-bound.
- **Single client geography.** All invocations were launched from Krakow; API-latency and routing behavior from a US-based GSE pipeline would differ.
- **No cold-start isolation.** The paper discusses cold starts but the headline numbers blend cold and warm invocations; a GSE burst pipeline would need its own cold-start measurement.
- **100 ms billing granularity** was a 2019 AWS pricing detail; current per-ms billing changes the cost math.
- **External validity to GSE modeling: none.** This is infrastructure research, not predictive methodology.

## 10. GSE overlap

**New capability (infrastructure, not modeling).** Nothing in the existing-research map covers serverless/FaaS benchmarking, burst-parallel batch design, or cloud cost-performance measurement — the map's infrastructure surface is essentially empty (the closest items are repo CI workflows and Hermes's opp-adj-EPA build). GSE's batch pipelines (nightly nflverse pulls, the 29-CSV gse-lab recomputation, DFS packet builds) currently run on fixed VMs/crons. If GSE ever needs elastic burst capacity — e.g., recomputing a full-season metric suite across many parameter settings, or running the Monte Carlo simulations the DFS lane uses — this paper's measurement protocol (concurrency ramp detection, per-task GFlops/latency distribution, billing-granularity cost analysis) is the right template. It fills an infra gap, not a modeling gap, so it should not be scored against the ML research brief.

## 11. GSE implementation spec

1. **Trigger condition:** only if a GSE batch job exceeds comfortable single-VM runtime (rule of thumb: > 2 hours wall-clock or > 8 vCPU-hours) — e.g., full-history backtests across the 26-metric catalog or large Monte Carlo slates.
2. **Port the benchmark harness:** replicate the paper's design with a GSE-representative payload instead of Linpack — one worker = recompute one weekly metric CSV from nflverse parquet, or run N Monte Carlo simulations of a slate. Sweep memory 512 MB–4 GB and concurrency 100–5,000 on the current AWS Lambda / Cloud Run functions.
3. **Measure what the paper measured:** achieved-parallelism curve (detect the modern throttle step), per-task wall-clock mean/SD, cold-start rate, API overhead, and cost per completed unit of work at current per-ms billing.
4. **Decision output:** a one-page "burst playbook" — max economical concurrency, memory sweet spot, expected cost per full-season recompute — checked into the repo next to the pipeline it serves.
5. **Effort:** 1–2 days to port the harness; the measurement runs themselves cost tens of dollars.

## 12. Reproducible test

Reproduce the paper's *method*, not its numbers: on the current AWS Lambda (or GSE's actual serverless target), launch 1,000 concurrent invocations of a GSE-representative task (e.g., compute one team's full-season EPA table from nflverse), record per-invocation wall-clock and the achieved-parallelism curve. Metric: time-to-completion for the batch vs the same job on the current VM, and cost per run. Baseline to beat: the VM's wall-clock at equal or lower cost. Time window: a single measurement session; rerun quarterly since vendor behavior drifts (the paper's own staleness is the cautionary tale).

## 13. Acceptance / rejection gate

ADAPT the benchmark methodology (not the 2019 numbers) if a GSE batch job is identified that exceeds the 2-hour/8-vCPU-hour trigger — run the ported harness once and adopt serverless bursting only if it beats the VM on wall-clock at ≤ 1.5× cost. REJECT any use of the paper's absolute figures (GFlops tables, the ~1,000-concurrency step, 100 ms billing math) — they describe 2019 infrastructure and must never be quoted as current.

## 14. Improvement experiment

Go beyond the paper by benchmarking what it did not: **cold-start-aware cost modeling for inference, not just batch.** The paper measures homogeneous compute tasks; GSE's real serverless question is per-request model inference (e.g., a WP/prop model behind an API). Run the same concurrency-ramp protocol with a serialized XGBoost/ONNX model payload, measuring cold-start latency distribution (p50/p99) vs provisioned-concurrency cost — the quantity that actually determines whether a live GSE endpoint can run serverless. The paper's batch lens cannot answer that; this experiment would.
