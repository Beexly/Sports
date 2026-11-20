# Cloudflare Workers Paid Plan ($5/mo) Governance & Incident Runbook

## Overview & Plan Verdict

**Upgrade Verdict:** Recommended for `Beexly/Sports`. The **$5/month Cloudflare Workers Paid Plan** directly unblocks required bindings in [stealth-skeleton-provider](file:///c:/Users/Garrett/Sports/workers/stealth-skeleton-provider/wrangler.jsonc) and [immortal-orchestrator](file:///c:/Users/Garrett/Sports/workers/immortal-orchestrator/wrangler.jsonc) that cannot deploy or run sustainably on the Workers Free tier, while remaining fully aligned with the **Uncompressed-Intelligence Zero-Waste Cost Doctrine**.

## Feature-to-GSE/GSI Architecture Mapping

| Paid Plan Feature | Included Allowance | GSE / GSI Workload Mapping | Overage Rate |
|---|---|---|---|
| **Workers Requests & CPU** | `10M` req/mo, `30s` max/req, `30M CPU-ms/mo` | Unblocks iterative mathematical proofs (`Sinkhorn-Knopp`, `Romano CQR`, `Hou-Li` filters) that exceed the 10ms Free CPU limit | `+$0.30/1M` req, `+$0.02/1M CPU-ms` |
| **Queues** | `1M` operations/mo | Required for `CROWD_RLHF_QUEUE` (`gse-crowd-rlhf-queue`) in `gse-stealth-skeleton-provider` | `+$0.40/1M` ops |
| **Durable Objects (SQLite)** | `1M` req, `400K GB-s`, `25B` rows read, `50M` rows written, `5 GB-mo` | Powers `ImmortalControlAgent` (`new_sqlite_classes`) heartbeat & weekly NFL cadence lock (`PHASE_1..PHASE_6`) | `+$0.15/1M` req, `+$12.50/1M GB-s`, `+$1.00/1M` writes |
| **Workflows** | `500K` steps/mo, `1 GB-mo` state | Executes durable multi-stage weekly NFL lifecycle workflows (`Tuesday 04:00 CT` lock -> `T-90m` -> post-game settlement) | `+$0.80/100K` steps |
| **Hyperdrive** | Unlimited queries | Zero-surcharge connection pooling from Workers into **Neon PostgreSQL 17** | Included (`$0`) |
| **Observability (Logs & Traces)** | `50 GB/mo` ingestion, `10 GB-mo` storage | Captures structured worker telemetry; `traces.head_sampling_rate: 0.1` mirrors Sentry grant preservation | Usage-based above 50 GB |
| **Vectorize vs. AI Search** | Vectorize: `50M` queried dims, `10M` stored dims; AI Search starts Dec 1, 2026 (`$2/GB-mo` + `$0.75/1k`) | Prefer `Vectorize` (`+$0.01/1M` dims) or vectorless `PageIndex` tree RAG over `AI Search` to avoid storage/query spikes | Vectorize `+$0.01/1M` dims |

## Five Zero-Waste Overage Circuit Breakers

1. **Strict CPU Ceilings (`limits.cpu_ms`):** Both `wrangler.jsonc` files cap runaway requests (`5000ms` for `gse-stealth-skeleton-provider`, `2000ms` for `gse-immortal-orchestrator`) well below the 30s ceiling so a stuck loop cannot exhaust `30M CPU-ms/mo`.
2. **Trace Head Sampling (`0.1`):** Observability enables full structured JSON logs (`head_sampling_rate: 1`) while sampling traces at `10%` (`head_sampling_rate: 0.1`) to keep ingestion comfortably inside the included `50 GB/mo` bucket.
3. **DO SQLite / D1 Writes Over KV Writes:** Store heartbeat, RLHF metadata, and cadence phase transitions in Durable Object SQLite (`50M` rows written included; `$1.00/1M` overage) or D1 (`50M` rows written; `$1.00/1M` overage) rather than Workers KV (`1M` writes included; `$5.00/1M` overage).
4. **DO Duration Protection (`400K GB-s/mo`):** Never keep long-lived CPU loops or active WebSocket intervals awake inside `ImmortalControlAgent`; use DO Alarms (`*/15 * * * *` or scheduled phase alarms) and Hibernatable WebSockets so idle memory charges drop to zero.
5. **Avoid Unbounded AI Search / Browser / Container Costs:** Use local Python Playwright/NumPy/DuckDB and `PageIndex` / `Vectorize` instead of Cloudflare Browser Rendering (`10 hr/mo`, `$2.00/concurrent browser`) or Cloud Containers (`25 GiB-hr/mo`). Never commit secrets in `wrangler.jsonc` (`vars` only for non-secrets; secrets via `wrangler secret put`).

---

## Incident & Cost-Spike Runbook (`SEV1` - `SEV4`)

### Severity Matrix

| Severity | Trigger / Impact | Target Response |
|---|---|---|
| **SEV1** | Worker returning `5xx` on `x402` or `/v1/chat/completions`, or runaway DO/Queue billing loop | 15 min |
| **SEV2** | `cpu_ms` approaching cap, DO `GB-s` spike, or `CROWD_RLHF_QUEUE` backlog growing | 30 min |
| **SEV3** | Elevated `head_sampling_rate` or observability volume > `2 GB/day` | 2 hr |
| **SEV4** | Non-urgent `compatibility_date` or `wrangler types` drift | Next business day |

### Initial Triage (First 5 Minutes)

```bash
# 1. Verify worker configuration & active deployments
npx wrangler whoami
npx wrangler deployments list --config workers/stealth-skeleton-provider/wrangler.jsonc
npx wrangler deployments list --config workers/immortal-orchestrator/wrangler.jsonc

# 2. Tail live structured JSON logs for error bursts
npx wrangler tail gse-stealth-skeleton-provider --format json
npx wrangler tail gse-immortal-orchestrator --format json

# 3. Inspect queue backlog if CROWD_RLHF_QUEUE is backed up
npx wrangler queues info gse-crowd-rlhf-queue
```

### Mitigation & Rollback Procedures

1. **Runaway CPU / Queue Loop:** Temporarily throttle via Cloudflare Dashboard or lower `limits.cpu_ms` in `wrangler.jsonc` and deploy, or roll back to the previous known-good deployment:
   ```bash
   npx wrangler rollback --config workers/stealth-skeleton-provider/wrangler.jsonc
   ```
2. **Observability Ingestion Spike:** Drop `observability.traces.head_sampling_rate` from `0.1` to `0.01` and `observability.logs.head_sampling_rate` from `1` to `0.1` in `wrangler.jsonc` and redeploy.
3. **Verify Recovery:** Re-run local worker suites (`node --experimental-strip-types --test src/__tests__/stealth-skeleton-provider.test.ts` and `npx tsx --test src/__tests__/immortal-orchestrator.test.ts`) and verify `200 OK` on `/v1/models` and `/v1/providers/health`.
