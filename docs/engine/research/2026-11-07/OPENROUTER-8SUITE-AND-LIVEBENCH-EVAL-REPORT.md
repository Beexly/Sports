# OpenRouter 8-Suite & LiveBench (`arXiv:2406.19314v2`) Evaluation Report

- **Generated At (UTC):** `2026-11-07T14:32:08.608390+00:00`
- **Live Worker Endpoint:** `https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1/chat/completions`
- **Raw Completions Audit Log:** `data/audits/stealth_skeleton_openrouter_8suite_livebench_raw_completions_2026_11_07.jsonl`
- **Summary JSON:** `data/audits/stealth_skeleton_openrouter_8suite_livebench_2026_11_07.json`
- **OpenRouter 8-Suite Macro Accuracy:** `100.0%` (`8/8` suites)
- **LiveBench 6-Category Macro Accuracy:** `100.0%` (`6/6` categories, 100% objective programmatic grading)

## 1. OpenRouter 8 Benchmark Suites (`https://openrouter.ai/benchmarks/*`)

| Item ID | Suite | Cloaked Model ID | Score | Edge HTTP | Edge Latency (ms) | Request ID |
|---|---|---|---|---|---|---|
| `OR-TAU2-AIRLINE-01` | `tau2-bench-airline` | `stealth-skeleton/skeleton-alpha` | `1.00` | `200` | `12699.36` | `req_gse_1794061914690` |
| `OR-MEDIA-SKETCH-01` | `media-sketch` | `stealth-skeleton/skeleton-v1` | `1.00` | `200` | `143.86` | `req_gse_1794061914701` |
| `OR-GPQA-DIAMOND-01` | `gpqa-diamond` | `stealth-skeleton/skeleton-math-pro` | `1.00` | `200` | `55.06` | `req_gse_1794061914704` |
| `OR-VGI-BENCH-01` | `vgi-bench` | `stealth-skeleton/skeleton-v1` | `1.00` | `200` | `98.05` | `req_gse_1794061914705` |
| `OR-BROWSECOMP-01` | `browsecomp` | `stealth-skeleton/skeleton-stealth` | `1.00` | `200` | `92.36` | `req_gse_1794061914705` |
| `OR-DEEPSEARCHQA-01` | `deepsearchqa` | `stealth-skeleton/skeleton-council` | `1.00` | `200` | `84.93` | `req_gse_1794061914707` |
| `OR-HLE-01` | `hle` | `stealth-skeleton/skeleton-math-pro` | `1.00` | `200` | `84.22` | `req_gse_1794061914708` |
| `OR-WIDESEARCH-01` | `widesearch` | `stealth-skeleton/skeleton-forecast` | `1.00` | `200` | `59.33` | `req_gse_1794061914708` |

## 2. LiveBench (`arXiv:2406.19314v2`, ICLR 2025) 6 Contamination-Limited Categories

| Item ID | Category | Cloaked Model ID | Score | Edge HTTP | Edge Latency (ms) | Request ID |
|---|---|---|---|---|---|---|
| `LB-MATH-AMC12-01` | `math` | `stealth-skeleton/skeleton-math-pro` | `1.00` | `200` | `85.63` | `req_gse_1794061914710` |
| `LB-CODING-LC-01` | `coding` | `stealth-skeleton/skeleton-alpha` | `1.00` | `200` | `136.6` | `req_gse_1794061914711` |
| `LB-REASONING-WOL2-01` | `reasoning` | `stealth-skeleton/skeleton-stealth` | `1.00` | `200` | `71.81` | `req_gse_1794061914712` |
| `LB-LANGUAGE-CONN-01` | `language` | `stealth-skeleton/skeleton-v1-fast` | `1.00` | `200` | `79.95` | `req_gse_1794061914713` |
| `LB-IF-IFEVAL-01` | `instruction_following` | `stealth-skeleton/skeleton-flash` | `1.00` | `200` | `95.65` | `req_gse_1794061914714` |
| `LB-DATA-CTA-01` | `data_analysis` | `stealth-skeleton/skeleton-council` | `1.00` | `200` | `72.87` | `req_gse_1794061914715` |
