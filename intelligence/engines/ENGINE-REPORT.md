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
| Funnel dies at L4? | **YES** — model emitted `pit_pressure_lands` with BC `ttt_seconds < 2.3`; deterministic `adversary_review` evaluated 2.1 < 2.3 → KILL | PENDING (Space building) |
| 4 legs bundled as one thesis? | **YES** — `correlated_theses` → 1 thesis, shared link `pit_pressure_lands` | PENDING |
| Recommendation REJECT? | **YES** — model L5: REJECT; contract: REJECT | PENDING |
| Hallucinations (ungrounded numbers) | **0** | PENDING |
| Latency L3 / L4 / L5 | 62.2s / 35.6s / 22.7s (total 122.4s) | PENDING |

### Engine 1 detail (Qwen2.5-72B-Instruct, ZeroGPU, free)

- The model identified the shared thesis link (`pit_pressure_lands`,
  load-bearing, INFERENCE-flagged) and the correct breaking condition on the
  first structured attempt after one prompt iteration.
- **Notable finding:** on the first attempt the model got the metric right
  (`ttt_seconds`) but **inverted the inequality** (`>` instead of `<`). Its L5
  still said REJECT — qualitatively right, structurally wrong. A 3-step
  NEED → DATA → BREAK instruction in the L3 prompt fixed it. Lesson: LLMs need
  explicit directional scaffolding for breaking conditions; the deterministic
  contract is the backstop that catches inversions.
- Grounding audit: every number in the model's chains (2.1, 0.639, 6.12, 2.3,
  41.5, 2 starters) traced to the provided data. Zero hallucinations.
- Latency (~2 min for a full L3→L5 run) is fine for pre-kickoff analysis, not
  for in-game. ZeroGPU queue waits dominate; the 72B model itself is fast once
  scheduled.

## Which engine runs our brain better?

**On today's evidence: Engine 1 (Qwen2.5-72B).** It is live, it passes the
full T1 contract (kill + bundle + REJECT), and it hallucinated nothing. The
72B instruct model follows the grounding JSON contract reliably.

**Engine 2 (MiMo-V2.6 9B 4-bit)** is the bet for the future: ~8× smaller,
cheaper on quota (shorter GPU time per call), and purpose-built for reasoning.
But it is unproven until the Space serves and runs T1. Update this report when
it does. If the 9B matches the 72B on T1, it becomes the default (quota goes
~4× further); if it can't hold the breaking-condition direction, the 72B stays.

## What's needed to go further

1. **MiMo-Pro / Flash variants.** The 9B distill is the smallest MiMo-V2.6.
   Pro-RL and Flash-RL are larger/stronger reasoners; if the 9B underperforms
   on T1, retry T1 on Flash (still fits ZeroGPU `large` in 4-bit).
2. **T2–T7 through the LLM engine.** T1 is one scenario; the contract suite is
   seven. Run all seven per model before trusting either.
3. **Real provider data.** T1 used fixture observations; wire the live
   qb-behavior/coaching/trust-signals providers and re-run.
4. **Latency.** ~2 min/run is pre-game only. Shorter prompts, smaller model,
   or persistent (non-ZeroGPU) inference for in-game use.
5. **Quota.** PRO = 40 min/day ≈ 13–20 full T1 runs/day on the 72B. The 9B
   should ~4× that. Monitor via the drift script.

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
- **"Heavy use":** one T1 run ≈ 2 min GPU time. PRO quota ≈ 13–20 runs/day
  (72B). At the cap: requests queue/fail until the 24h reset (or draw from
  credit balance if one exists). No surprise charges.
- Sources: https://huggingface.co/docs/hub/spaces-zerogpu ·
  https://huggingface.co/docs/hub/billing

## Reliability design

- Cold starts / Space sleep (503) / queue waits → retries with backoff, clear
  errors. Quota exhaustion → `QuotaExhausted`. Any backend failure → harness
  falls back to the deterministic Python engine and annotates the trace
  (`llm_fallback=True` + reason). Never fails silently.
- `engines/drift_monitor.py` (cron every 30 min): verifies both Spaces are on
  free hardware and serving; exit 2 + stderr alert on drift.

## Deliverables

- `intelligence/engines/` — backends, prompts, LLM specialists, harness,
  drift monitor, Space app, this report. Provenance headers throughout.
- `intelligence/tests/test_engines.py` — 16 contract tests (mock backend, no
  network). Full suite: **770 passed**.
- Live Space: https://huggingface.co/spaces/Beexly/mimo-brain-engine
  (ZeroGPU `zero-a10g`, $0).
