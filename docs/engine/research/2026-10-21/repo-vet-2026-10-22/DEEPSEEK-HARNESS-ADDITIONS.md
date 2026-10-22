# What was added from the 2026-10-22 repo list

Pasted 7, distinct 7. Metadata from `gh api`. This machine has no `nvidia-smi`.

| repo | stars | pushed_at | license | language | added? |
|---|---:|---|---|---|---|
| deepseek-ai/DeepEP | 10328 | 2026-10-21 | MIT | Cuda | no |
| deepseek-ai/DeepGEMM | 9070 | 2026-10-20 | MIT | Cuda | no |
| deepseek-ai/DeepInfer | 18434 | 2026-10-21 | Apache-2.0 | Python | no |
| deepseek-ai/DeepJIT | 415 | 2026-10-19 | MIT | C++ | no |
| deepseek-ai/DeepSpec | 7240 | 2026-07-09 | MIT | Python | no |
| deepseek-ai/deepseek-recipe | 1995 | 2026-10-19 | MIT | Rust | yes, the host-side budget check |
| google-research/harness2 | 17365 | 2026-10-14 | Apache-2.0 | Python | already ported; not re-vendored |

## Not added

DeepEP, DeepGEMM, DeepJIT, and DeepInfer require NVIDIA SM90 or SM100 (DeepInfer's README says SM100 only) plus CUDA 12.9. They do not run here. Cloning them into this repo would not change a pick, a Brier score, or an API bill. DeepSpec trains draft models and its default target cache is about 38 TB. It was not installed.

Harness² Propose-Probe-Compose is already in `packages/prediction-engine/src/continual/harness2-propose-probe-compose.ts`. Re-vendoring the JobBench framework would not score sports.

## Added

`deepseek-recipe` documents `resolve_max_tokens`: refuse a prompt that does not fit the context, and do not leave generation uncapped. The thinking-mode defaults (65536 and 131072) would raise GSE cost, so they are ceilings only when a caller asks for them. A `costCeiling` keeps free-tier calls small.

That check is on the one live paid call in the prediction engine: `openRouterEmbedder` now clamps input to the bge-m3 context (8192 tokens, counted at 2 chars/token so the request is shorter, not longer) before it hits OpenRouter. Test: `deepseek-recipe-budget.test.ts`, 3 passed.
