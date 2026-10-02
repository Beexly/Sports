# engines/ — the GSE brain in another engine

**Provenance:** Garrett 2026-10-02: "take our brain and put it in another engine." Not a side look — a working system with test results.

## Architecture

```
DataContext (our verified providers: qb-behavior, coaching, trust-signals)
    → LLM specialists (L3 chains, L4 adversary, L5 synthesis) — the model REASONS
    → deterministic contract (adversary_review, correlated_theses, checklist) — the contract DISPOSES
    → ReasoningTrace (identical format; T1–T7 keep passing)
```

The LLM proposes; the contract disposes. Every prompt forces the model to cite
provided numbers and label anything inferred as INFERENCE with a breaking
condition. A grounding audit counts ungrounded numbers (hallucinations).

## Backends

- `GradioBackend(space, api_name="/chat")` — HF Spaces via gradio_client.
- `OpenAICompatBackend(base_url, model, api_key)` — any `/v1/chat/completions` API.

Reliability: cold starts, Space sleep (503), queue waits → retries with
backoff and clear errors. Quota exhaustion → `QuotaExhausted`. Any failure →
the harness falls back to the deterministic Python engine and annotates the
trace (`llm_fallback=True`). Never fails silently.

## Engines

| Engine | Model | Backend | Cost |
|---|---|---|---|
| 1 — `Beexly/studio-chat` | Qwen2.5-72B-Instruct | Gradio (ZeroGPU) | $0 |
| 2 — `Beexly/mimo-brain-engine` | MiMo-V2.6-Distill-Qwen-9B (4-bit) | Gradio (ZeroGPU) | $0 |

## ZeroGPU billing policy (from HF official docs, verified 2026-10-02)

Source: https://huggingface.co/docs/hub/spaces-zerogpu and https://huggingface.co/docs/hub/billing

- ZeroGPU Spaces are **free to use and host**. Free accounts host up to 2; PRO up to 10.
- **Daily GPU quotas:** unauthenticated 2 min · free account 5 min · **PRO 40 min** (highest queue priority). Resets 24h after first GPU use of the day.
- **Overage:** "Once your daily quota is exhausted, any additional GPU usage is automatically billed against your credit balance." The credit balance = pre-paid credits (PRO includes monthly compute credits). **No card is charged unless credits were explicitly purchased or auto-recharge is enabled** — with no credits and no auto-recharge, over-quota requests fail/queue (service disruption), they do not bill.
- **The real billing risk is NOT ZeroGPU — it is paid Space hardware** (t4-small, a10g, etc.), which bills usage-based. Our Spaces stay pinned to ZeroGPU hardware. The drift monitor (`drift_monitor.py`) trips a loud alert if hardware ever leaves the free tier.
- GPU sizes: `large` (default, 48GB, 1× quota) vs `xlarge` (96GB, 2× quota). We use `large`.

**What "heavy use" looks like:** one full T1 run = 3 GPU calls ≈ 1–3 min of GPU time. On PRO (40 min/day): ~13–40 runs/day. On free (5 min/day): ~2–5 runs/day. At the cap: requests queue/fail until the 24h reset (or draw from credit balance if one exists).

## Files

| File | Purpose |
|---|---|
| `backends.py` | Gradio + OpenAI-compatible backends, error taxonomy, retries |
| `prompts.py` | Grounding prompts (L3/L4/L5) + defensive JSON extraction |
| `llm_specialists.py` | LLMChainSpecialist, LLMAdversarySpecialist, LLMSynthesisSpecialist + `audit_grounding` |
| `harness.py` | LLMEngine, T1 fixture, T1Result, deterministic fallback |
| `drift_monitor.py` | Cron-friendly ZeroGPU hardware/serving check (exit 2 = DRIFT) |
| `ENGINE-REPORT.md` | Which engine runs our brain better (T1 results, latency, hallucinations) |

## Tests

`tests/test_engines.py` — harness contract with a mock backend (no network):
grounded claims only, INFERENCE flagged, trace shape valid, fallback on
backend failure, JSON extraction robustness.

## Drift monitor

```bash
python3 engines/drift_monitor.py                 # checks both Spaces
python3 engines/drift_monitor.py Beexly/foo      # check specific Spaces
```

Exit 0 = all clear. Exit 2 = DRIFT (stderr explains). Run every 30 min via cron.
