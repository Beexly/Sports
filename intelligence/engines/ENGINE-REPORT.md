# ENGINE-REPORT — which engine runs our brain better

**Date:** 2026-10-02 · **Mission:** Garrett's order — "put our brain in another engine," working system with test results.

## The test

T1 (Steelers–Browns Week 4 pre-kickoff, Flacco variant): 4-leg stack
(Mixon anytime TD, PIT ML, Under 41.5, PIT −2.5) sharing causal link
`pit_pressure_lands`; breaking condition `ttt_seconds < 2.3`; observed
ttt 2.1, quick-game 0.639, air yards 6.12. The deterministic contract must:
kill the funnel at L4, bundle the 4 legs as one thesis, recommend REJECT.

## Results

| Check | Engine 1: Qwen2.5-72B-Instruct (studio-chat) | Engine 2: MiMo-V2.6-Distill-Qwen-9B 4-bit (mimo-brain-engine) |
|---|---|---|
| Funnel dies at L4? | **YES** — model emitted `pit_pressure_lands` with BC `ttt_seconds < 2.3`; deterministic `adversary_review` evaluated 2.1 < 2.3 → KILL | **NO** — model made 2 load-bearing links, BC `ttt_seconds > 2.1` (wrong direction); 2.1 > 2.1 is FALSE → survives |
| 4 legs bundled as one thesis? | **YES** — 1 thesis, shared link `pit_pressure_lands` | **YES** |
| Recommendation REJECT? | **YES** (model L5 + contract) | **YES** (model L5; contract says UNKNOWN — divergence flagged) |
| Hallucinations (ungrounded numbers) | **0** | **0** |
| Latency L3 / L4 / L5 | 62.2s / 35.6s / 22.7s (total 122.4s) | 26.9s / 39.5s / 22.6s (total 90.7s) |

### Engine 1 detail (Qwen2.5-72B-Instruct, ZeroGPU, free)

- Full T1 contract pass: kill + bundle + REJECT, zero hallucinations.
- **Key finding:** on the first attempt the model got the metric right
  (`ttt_seconds`) but **inverted the inequality** (`>` instead of `<`). Its L5
  still said REJECT — qualitatively right, structurally wrong. A 3-step
  NEED → DATA → BREAK instruction in the L3 prompt fixed it. Lesson: LLMs need
  explicit directional scaffolding for breaking conditions; the deterministic
  contract is the backstop that catches inversions.
- ~2 min/run is pre-kickoff analysis speed, not in-game. ZeroGPU queue waits
  dominate.
- Re-verification with final prompts was quota-blocked (see Quota section);
  the passing run used the same prompt minus the conciseness line, which the
  72B already satisfied.

### Engine 2 detail (MiMo-V2.6-Distill-Qwen-9B, 4-bit, ZeroGPU, free)

- **Live:** https://huggingface.co/spaces/Beexly/mimo-brain-engine
  (`zero-a10g` hardware, $0).
- The 9B reaches REJECT qualitatively and hallucinates nothing, but **does
  not reliably emit the machine-readable breaking condition**: it split the
  thesis across 2 load-bearing links and inverted the inequality
  (`ttt_seconds > 2.1`). The deterministic L4 therefore does NOT kill the
  funnel — a model↔contract divergence the harness flags.
- Also observed: verbosity (7-link chains, JSON syntax errors at 1024 tokens;
  fixed with a conciseness instruction + 2048 max tokens) and `<think>`
  reasoning traces in output (handled by the JSON extractor).
- Faster than the 72B (90.7s vs 122.4s) and cheaper on quota.

## Which engine runs our brain better?

**Engine 1 (Qwen2.5-72B) — by a clear margin today.** It is the only engine
that passes the full T1 contract. The 72B follows the grounding JSON contract
reliably; the 9B reasons well qualitatively but fumbles the structured
breaking condition.

**Engine 2 (MiMo 9B) is the efficiency bet:** ~25% faster, ~4× lighter on
quota, $0. If the 9B's structured output can be fixed (or the bigger
Pro/Flash variants tried), it becomes the default. Today it does not pass.

## What's needed to go further

1. **MiMo-Pro / Flash variants.** The 9B distill is the smallest MiMo-V2.6.
   Flash-RL likely fits ZeroGPU `large` in 4-bit and may hold the breaking-
   condition direction. Try T1 on Flash next.
2. **T2–T7 through the LLM engine.** T1 is one scenario; the contract suite
   is seven. Run all seven per model before trusting either.
3. **Real provider data.** T1 used fixture observations; wire the live
   qb-behavior/coaching/trust-signals providers and re-run.
4. **Latency.** ~2 min/run (72B) / ~90s (9B) is pre-game only.
5. **Quota.** See below.

## ZeroGPU billing policy (verified from HF official docs 2026-10-02)

- ZeroGPU is **free to host and use** (free accounts: 2 Spaces; PRO: 10).
- **Daily quotas:** unauthenticated 2 min · free 5 min · **PRO 40 min**
  (highest queue priority). Resets 24h after first GPU use.
- **Overage draws from the pre-paid credit balance only** — no card charge
  unless credits were explicitly purchased or auto-recharge enabled. Without
  credits, over-quota requests fail/queue; they do not bill.
- **The billing risk is paid Space hardware** (t4-small, a10g, …), not
  ZeroGPU. Both Spaces are pinned to `zero-a10g`; `drift_monitor.py` alerts
  loudly (exit 2) if hardware ever leaves the free tier or a Space stops
  serving.
- **"Heavy use" (observed today):** one T1 run ≈ 90–120s GPU time. The
  account quota hit zero during testing — the harness caught
  `QuotaExhausted`, fell back gracefully, and said so. **Authenticate the
  Gradio client** (HF token) to use the PRO 40-min quota instead of the
  2-min anonymous quota. At the cap: requests fail until the 24h reset.
  No surprise charges — ever.
- Sources: https://huggingface.co/docs/hub/spaces-zerogpu ·
  https://huggingface.co/docs/hub/billing

## Reliability design

- Cold starts / Space sleep (503) / queue waits → retries with backoff, clear
  errors. Quota exhaustion → `QuotaExhausted` (observed live today). Any
  backend failure → harness falls back to the deterministic Python engine and
  annotates the trace (`llm_fallback=True` + reason). Never fails silently.
- `engines/drift_monitor.py` (cron every 30 min): verifies both Spaces are on
  free hardware and serving; exit 2 + stderr alert on drift.

## Deliverables

- `intelligence/engines/` — backends, prompts, LLM specialists, harness,
  drift monitor, Space app, this report. Provenance headers throughout.
- `intelligence/tests/test_engines.py` — 16 contract tests (mock backend, no
  network). Full suite: **770 passed**.
- Live Space: https://huggingface.co/spaces/Beexly/mimo-brain-engine
  (ZeroGPU `zero-a10g`, $0).
