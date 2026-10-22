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

## What the first pass missed

The CUDA repos were correctly left out. The miss was treating "cannot run the kernel" as "nothing in the idea transfers."

DeepInfer's README does not require a GPU to use the schedule: when the target is uncertain, shorten the speculative block; when it is confident, lengthen it. That rule was already a function nobody called. It now sizes a game's market slate. A coin-flip probability emits one market. A sharp probability may emit up to five. A probability outside (0, 1) emits none. That is not a measured speedup. There is still no draft model and no SM100.

Harness²'s README keeps a mutation only after a second run of the same task beats the first. The existing PPC loop scores its own checklist and can report an improvement percent from that score. `composeFromMeasuredContrast` will not adopt a mutation unless the caller passes a positive measured delta. It does not compute closing-line error or Brier. Those still have to be supplied.

code-review-graph and AACR-Bench still do not change a pick. Installing a graph of this monorepo was not the efficiency win. The win was stopping a coin-flip game from printing five correlated tickets.

This is not a claim that the engine now does something no system has done. The five partial gaps are still partial.

