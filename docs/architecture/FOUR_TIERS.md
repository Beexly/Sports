# FOUR TIER ARCHITECTURE — brief 2026-10-02

GSE is FOUR TIERS, split across GitHub and Hugging Face. Every prior audit has
treated GitHub as the whole system. It is not.

## TIER 4 — DELIVERY (GitHub)

**apps/web** — Next.js, subscriptions, cockpit, guardrails.

**Hugging Face: GSE Proof MCP** — external proof verification. An independent,
read-only MCP (Model Context Protocol) server that gives LLM agents tool access to
GSE's public, unauthenticated JSON endpoints. Relays GSE's own public JSON,
unmodified, plus caching and rate-limiting. This is not an official Galaxy Sports
Edge product; it is a third-party client built against GSE's own public JSON
endpoints, hosted as a Gradio Space with `mcp_server=True`.

## TIER 3 — REASONING (Hugging Face)

**Hugging Face Space: Beexly/mimo-brain-engine** — the reasoner. Model:
XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B (MIT license, 4-bit, ZeroGPU `zero-a10g`,
free). Runtime: ZeroGPU. Free.

**Function:** generate data-grounded answers with citations. The /chat endpoint
speaks the GSE grounding contract: every prompt should include VERIFIED DATA and
demand cited numbers + INFERENCE flags. The model reasons (L3 causal chains,
L4 adversarial review, L5 synthesis) under hard rules: cite provided numbers,
label inference as INFERENCE with a breaking_condition, output the requested JSON
schema. The deterministic GSE contract (adversary_review, correlated_theses,
checklist) still disposes — the model proposes.

The brief calls this the reasoner and the product. Measured wiring does not.
`packages/prediction-engine/src/scoring.ts` does not call this Space. The
`intelligence/engines/` harness can. A published pick does not currently pass
through MiMo.

## TIER 2 — SIGNALS / FORECASTING (Hugging Face)

**Bucket: Beexly/timesfm-3.0-pytorch-bucket** (1.32 GB, private). Model:
TimesFM 3.0 (Google Research, zero-shot multivariate forecaster, 330M params,
1T training points).

**LICENSE: TimesFM Non-Commercial License v1.0.** Benchmarking, evaluation, and
research are allowed; commercial or production use — published picks, client
deliverables, distilling into the production engine — requires a commercial license
from Google. This Space stays in the research lane by construction: it cannot emit
forecasts on demand.

**Space: Beexly/gse-watch-pipeline** (docker, `cpu-basic` hardware). Function:
live data watching and pipeline execution. Receives JPEG frames from a Windows
watcher POST /process-frame; YOLO detection + BoT-SORT tracking → field homography
→ derived metrics → JSON → watcher relays JSON to Vercel /api/ops/watch-ingest →
Neon (watch.* tables). Raw frames are never stored and never leave the request
lifecycle.

**Function:** live data watching and pipeline execution.

## TIER 1 — CORE ENGINE (GitHub)

**packages/prediction-engine** — edge-engine.ts, scoring.ts,
calibration-map.ts.

**intelligence/** — DataContext, TauFitter, SituationalEngine,
behavior.expected_wp_given_coach.

## Fact Flow Across Tiers

| From Tier | To Tier | Fact | Crossing Mechanism |
|---|---|---|---|
| Core Engine (GitHub) | HF Space | ScoredPick + factorBreakdown (JSON) | /chat prompt: VERIFIED DATA + grounding prompt → MiMo reasons → JSON output |
| HF Space | Core Engine | Reasoning Trace + factorBreakdown | Inverse /chat call: engine sends data, receives reasoned JSON |
| Core Engine (GitHub) | HF Bucket | None direct | TimesFM bucket is research-only; no direct flow |
| HF Bucket | Core Engine | None | TimesFM NC-licensed; cannot silently route to commercial path |
| Core Engine (GitHub) | Proof MCP | receipt hashes, ledger state | MCP reads core engine's committed picks; MCP is read-only |
| Proof MCP | Core Engine | proof verification status | Read-only; does not modify engine |

## The Facts the Prior Briefs Missed

1. **The producers the GitHub agent cannot find may be the HF layers.**
   `gse-watch-pipeline` is likely a producer (of derived CV metrics). The
   TimesFM bucket is likely a producer (of forecast baselines). Do not assume
   the producer lives on the local disk. Look in the HF runtime.

2. **The reasoner already exists and is running.** It is MiMo-V2.6 on
   ZeroGPU. The GitHub core engine produces facts; MiMo reasons over them;
   the MCP exports proof. The engine is not "to be built." It is split
   across two platforms and must be reconciled.

3. **TimesFM 3.0 is Non-Commercial.** Every forecast it produces is NC-licensed.
   Any downstream signal that consumes a TimesFM output inherits that constraint.
   Flag it.

## Bridges Between Tiers

| Boundary | Current State | Bridge Needed |
|---|---|---|
| GitHub → HF Space (Tier 1 → Tier 3) | Engines called via /chat; data flows in prompts | JSONL bridge on disk or shared Postgres (currently /chat prompts) |
| HF Space → GitHub Core (Tier 3 → Tier 1) | /chat returns JSON; engine consumes it | Same /chat call — inverse direction |
| GitHub Core → HF Bucket (Tier 1 → Tier 2) | No direct flow | Do NOT route TimesFM output into commercial path without Google commercial license |
| HF Bucket → GitHub Core (Tier 2 → Tier 1) | No direct flow | Document NC constraint; do not consume as signal |
| Core Engine → Proof MCP (Tier 1 → Tier 4) | Committed picks → MCP receipt hashes | MCP reads committed picks; no code change needed |
| Proof MCP → Core Engine (Tier 4 → Tier 1) | Read-only | No code change needed; audit surface only |

## What was measured, not proposed

1. Tier 1 coaching producer now writes `intelligence/coaching/data/tau_hat.csv`
   (1,523 cells, manifest beside it). `tests/test_tau_artifact_contract.py`
   pins the CSV hash to the manifest. `tests/test_coaching_gates.py` passed
   4/4 on 2026-10-02 against nflverse parquet, not a fixture.
2. Tier 1 to Tier 3 has no production bridge. The engines harness builds a
   prompt and can post it to `/chat`. Scoring does not. No JSONL bridge was
   added, because a file nobody reads is not an integration.
3. Tier 2 to Tier 1 has no consumer. TimesFM output is not in a commercial
   path. That is the constraint. No TimesFM forecast was generated for this.
4. Tier 4 reads the public site, not the repo. It cannot see an unpushed pick.

## License Constraints Across Tiers

- **Tier 1 (GitHub core):** nflverse data = CC-BY-4.0; coaching seed CSVs need
  committing; tau_hat.csv produced by refit_tau — license to be documented.
- **Tier 2 (TimesFM):** Non-Commercial. Any downstream signal inherits NC.
  Must flag. Cannot silently route to commercial path.
- **Tier 3 (mimo-brain-engine):** MIT — commercial-ok. The reasoner is free
  and can be used in commercial paths.
- **Tier 4 (Proof MCP):** MIT. Read-only verification surface.

This file replaces any prior assumption that GitHub is the whole system. The
engine is split across GitHub and Hugging Face and must be reconciled as such.

`docs/architecture/FOUR_TIERS.md`