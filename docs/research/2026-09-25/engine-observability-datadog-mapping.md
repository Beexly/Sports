# Engine Observability: What Datadog's LLM Playbook Teaches GSE

**Date:** 2026-09-25 (Garrett: "We're basically building this — just in a different way. We can use a lot of this for our engine.")
**Source:** Datadog whitepaper, *Best Practices for Monitoring, Optimizing, and Securing Your LLM Applications* (4 pillars).
**Thesis:** Datadog's LLM observability stack maps 1:1 onto a sports prediction engine. They monitor
model pipelines; we run a model pipeline. Tonight's merges (#910, #912) already gave us half the
building blocks — this note specifies the observability layer that ties them together.

---

## Pillar 1 → Monitor operational performance → Pipeline health monitoring

Datadog tracks: request volume, errors, latency, token cost per request, with alerts on degradation.

GSE equivalent — instrument the prediction pipeline end to end:

| Datadog metric | GSE metric | Where it lives |
|---|---|---|
| Request latency | Time from intake → published pick, per sport/market | New: wrap each intake + pipeline stage with timing |
| Error rate | Intake failures, parse errors, pipeline exceptions | The 5 live intakes (DK Pick6, Underdog, PrizePicks, Sleeper, Action Network) each get an error counter |
| Token/cost per request | API credits per prediction (Odds API 20K/mo budget), compute time | Cost ledger per pipeline run |
| Data freshness | Odds-feed staleness: alert when any intake's data is older than threshold | Intake-level heartbeat timestamps |

**Alert rules to implement:** intake error spike, any feed stale > X minutes before lock, pipeline latency p99 breach on game day.

## Pillar 2 → Track security exposures → Input integrity + secret hygiene

Datadog tracks: prompt injection, PII leakage, anomalous behavior in traces.

GSE equivalent — the threat isn't prompt injection, it's **bad data poisoning the ensemble**:

- **Anomalous line movements:** distinguish real steam from corrupt feed data. A line that jumps 5 points on one source while others hold still is either the sharpest signal on earth or a broken parser — the system must flag it, not blindly ingest it.
- **Per-source trust scoring:** every intake gets a reliability score that decays on errors and recovers on clean runs. Feed those scores as weights into the ensemble — *this is exactly what `source-reliability.ts` (merged tonight in #912) was built for.* The wiring from reliability scores → `multi-market-ensemble.ts` precision weights is the highest-value follow-up.
- **Secret hygiene:** tonight's Neon `neondb_owner` leak into the public repo is the live case study. CI secret scan already gates the full tree — keep it, and add pre-commit hooks as a second layer.

## Pillar 3 → Evaluate functional quality → Calibration + CLV tracking

Datadog tracks: quality checks (failure-to-answer, topic relevancy, toxicity), user sentiment, custom evaluations, drift over time.

GSE equivalent — **calibration is our quality metric**, CLV is our user sentiment:

- **Binned calibration curves per market**, tracked over time. Predicted 60% should win ~60%. When a market's curve drifts, that's Datadog's "degrading model output" alert. *Building blocks merged tonight:* `calibration-ladder.ts` (the ladder itself), `apps/web/lib/calibration/ladder-state.ts` (state), `tracker/segments.ts` (per-sport×market units/win%/ROI).
- **Per-pick CLV in basis points** as the continuous quality signal — *`pick-clv.ts` merged tonight.* Aggregate CLV by market/source/model version; negative drift = the model is losing its edge before the win/loss record shows it.
- **Promotion governance:** no model version ships without passing the out-of-sample harness — *`oos-split.ts` merged tonight.* This is Datadog's "quality checks before deploy," applied to model versions instead of LLM prompts.
- **Nightly calibration report job:** binned accuracy vs predicted prob, CLV aggregates, drift flags. This is the single highest-leverage artifact — one cron, one report.

## Pillar 4 → End-to-end tracing → Pick lineage

Datadog's core primitive: every request traced through each chain step (vector search → LLM call → JSON formatting), so failures are debuggable to the exact step.

GSE equivalent — **every published pick gets a lineage trace:**

```
pick_id → model_version → intake snapshots (with timestamps)
        → feature vector hash → raw model probs
        → calibration step → final prob → CLV at publish
```

When a pick loses badly, walk the trace: was the input stale? Did calibration misfire? Was the line already gone (negative CLV at publish)? Without lineage, every bad pick is a mystery; with it, every bad pick is a bug report with a stack trace. Tie traces to `MODEL_VERSION` (the CI freeze guardrail already enforces versioning).

---

## Implementation spec (for the builder)

1. **New package `packages/engine-observability/`** (or extend prediction-engine):
   - `trace.ts` — pick lineage record type + writer (append-only store).
   - `pipeline-metrics.ts` — per-stage latency/error/cost counters, intake heartbeats.
   - `source-trust.ts` — reliability scoring, wired into `source-reliability.ts` and consumed by `multi-market-ensemble.ts` as precision weights.
   - `nightly-calibration-report.ts` — binned calibration + CLV aggregates + drift flags; output markdown, committed to `docs/research/<date>/`.
2. **Wire reliability → ensemble weights** (highest value, smallest change).
3. **Cron:** nightly calibration report; game-day pipeline health alerts.
4. **Dashboard:** reuse `tracker/segments` + `intelligence/edge-board` UI patterns for a calibration/lineage view.

## What NOT to copy

Datadog sells hosted dashboards and per-seat pricing. We build our own on our own data — the *methods* (tracing, quality gates, drift detection, cost accounting) transfer; the product doesn't. Per Garrett's standing rule: learn from builders' methods, reimplement as GSE's own work.
