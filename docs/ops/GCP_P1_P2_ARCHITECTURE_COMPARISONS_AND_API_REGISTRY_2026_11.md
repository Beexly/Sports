# GCP P1/P2 Architecture Comparisons, API Registry, and Motif Conflict Log (2026-11)

**Date:** 2026-11-19
**Status:** Evaluation Decision Pack (Zero Unapproved Migrations / Zero Paid Cloud Spend)
**Compliance Note:** Aligned with Motif's final Path 36 Write-Up (`docs/ops/GCP_PATH36_FOUNDATIONS_IMPLEMENTATION_RECORD_2026_11_19.md`): **Path 36 is NOT 100%** (`1,977` pts: Course 1 `100%`, Course 2 `100%`, Course 3 `96%` [`GSP215` `95/100`], Course 4 `87%` [`GSP192` `80/100`, `GSP207` `50/100`, deprecated/unavailable Dataprep `640821` preventing Course 4 from ever reaching `100%`]; `0 TOTAL CREDITS` blocking 4 skill badges & Paths `420/419/4525` at `0%`). Plus Google AI Ultra `$100/mo` = `$1,200/yr` GCP credit, Career Launchpad `$5K` GCSB recovery, Qwiklabs `640821` waiver. Keeps zero excluded lab IDs in this baseline document.

---

## 1. L3 Architecture Decision: Cloud Run vs GKE

**Decision:** **Default Cloud Run scale-to-zero (`min-instances=0`) -- zero GKE migration.**

| Dimension | Cloud Run (Selected Offload Target) | GKE (Rejected for Current Stage) |
|---|---|---|
| **Idle Cost Floor** | `$0.00/mo` at `min-instances=0`; billed strictly per 100ms active request CPU/memory | Always-on control plane / node pool overhead even with Autopilot minimum allocations |
| **Operational Overhead** | Zero cluster upgrades, zero node-pool patching, native HTTPS + IAM + IAP integration | High Kubernetes YAML, ingress, CNI, RBAC, and cluster lifecycle maintenance burden |
| **Workload Fit** | Ideal for bursty ingestion jobs (`workers/data-refresh`), Airwave dry-run/intake workers, and Pub/Sub push subscribers (`event-contracts`) | Designed for stateful long-lived microservice meshes or multi-node persistent GPU pools |
| **GPU / Heavy Math Path** | Heavy 10,000-world vectorized math runs locally via NumPy/DuckDB/Sinkhorn or RunPod FlashBoot (`min_workers=0`) | Unnecessary when local host + RunPod FlashBoot already deliver sub-second execution |
| **Migration Posture** | Ready for stateless worker containers (`max-instances=2`, OIDC-authenticated) | **Zero GKE migration** -- explicitly deferred until sustained 24/7 multi-pod demand exceeds Cloud Run quotas |

---

## 2. L4 Database Decision: Neon vs Cloud SQL

**Decision:** **Cloud SQL is evaluation-only -- zero Neon migration.**

| Dimension | Neon Serverless Postgres 17 (Production SoT) | Cloud SQL for PostgreSQL (Evaluation-Only) |
|---|---|---|
| **Production Status** | Active system of record (`apps/web`, `packages/db`, Prisma 5.22, `pg_cron` weekly vacuum/analyze) | Documented cold-standby / grant-evaluation blueprint only; **zero Neon migration** |
| **Cost & Autosuspend** | Zero-waste autosuspend with `02:30-06:30 CST` sleep window and zero fixed VM floor | Requires continuous instance reservation (minimum monthly VM + HA storage billing) |
| **Branching & CI** | Instant copy-on-write DB branching and ephemeral disposable preview environments | Slow clone/restore cycles unsuitable for rapid PR verification |
| **Data Residency / Failover Trigger** | Remains primary OLTP store (`picks`, `games`, `odds_line_snapshots`, `CheckoutAttempt`) | Re-evaluate ONLY if Google Cloud Startup Grant requires VPC-peered AlloyDB/Cloud SQL for internal BigQuery federation |

---

## 3. L8 / L9 Edge Security: Global External ALB + Cloud Armor WAF

For any GCP-hosted backend or custom-domain reverse-proxy path, edge protection uses Google Cloud External Application Load Balancer (ALB) paired with Cloud Armor WAF policies:

1. **OWASP Core Rule Set (CRS) Baseline:** Enable Cloud Armor preconfigured WAF rules (`sqli-v33-stable`, `xss-v33-stable`, `lfi-v33-stable`, `rfi-v33-stable`, `scannerdetection-v33-stable`) in `enforce` mode after 72h preview audit.
2. **Adaptive Rate Limiting:**
   - `/api/ops/public-surface-truth`: enforce edge throttle backing up the app-level 60 req/min per-IP limiter (`429 Retry-After`).
   - `/api/parlay-mri/*` & `/api/waitlist`: throttle automated scraping bursts to preserve Stripe/Neon quota.
3. **Zero-Vault-Leak & Perimeter Isolation:**
   - Static public assets pass `scripts/guardrails/verify_public_root_zero_vault_leak.py` before deploy.
   - Internal routes (`/admin/*`, `/cockpit/*`, `/api/admin/*`, `/api/cockpit/*`, `/api/airwave/*`, `/api/cron/*`) are restricted behind Identity-Aware Proxy (IAP) + server-side `x-goog-iap-jwt-assertion` verification (`GCP_OBSERVABILITY_L10_AND_IAM_IAP_L6_L7_BASELINE_2026_11.md`).
4. **Transport Hardening:** TLS 1.2+ minimum (TLS 1.3 preferred), HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`.

---

## 4. L11 Per-Environment GCP APIs Registry (`dev` / `staging` / `prod`)

| GCP API Service | Purpose | `dev` | `staging` | `prod` | Cost & Governance Guardrail |
|---|---|---|---|---|---|
| `run.googleapis.com` | Serverless worker offload containers (`GSP644`, `2M` req/mo Always Free) | Enabled | Enabled | Enabled | `min-instances=0`, `max-instances=2`, zero idle spend |
| `pubsub.googleapis.com` | Async event bus (`gse-odds-ticks`, `gse-injury-wire`, `gse-intake-dlq` + `.v1`/`.dlq`, `10 GB/mo` free, `GSP095`) | Emulator/Minimal | Enabled | Enabled | Deterministic SHA-256 idempotency + 7d retention cap (`GCP_FREE_TIER_PUBSUB_TOPICS`) |
| `secretmanager.googleapis.com` | Runtime secret injection (`CRON_SECRET`, etc.) | Disabled (local `.env`) | Enabled | Enabled | Per-secret `secretAccessor` IAM only |
| `monitoring.googleapis.com` | L10 uptime checks, 5 alerts, dashboard (`GSP089`) | Disabled | Enabled | Enabled | Custom metrics capped; zero high-cardinality labels |
| `logging.googleapis.com` | Cloud Run / ALB structured JSON logs | Disabled | Enabled | Enabled | Exclude `/api/health` noisy 200 pings from log sinks |
| `cloudtrace.googleapis.com` | Distributed latency flamegraphs | Disabled | 10% sample | 10% sample | Matches `tracesSampleRate: 0.1` zero-waste rule |
| `iap.googleapis.com` | Zero-trust access on `/admin` & `/cockpit` (`X-Goog-IAP-JWT-Assertion`) | Disabled | Enabled | Enabled | Server-side JWT assertion verification required |
| `compute.googleapis.com` | External ALB + Cloud Armor WAF | Disabled | Enabled | Enabled | Strict egress rules; zero unneeded static VMs |
| `bigquery.googleapis.com` | Partitioned calibration & archive (`gse_calibration` US `1 TB/mo` + `10 GB` free, `gse_data`, `GSP071`, `GSP247`) | Disabled | Dry-run gated | Dry-run gated | `GcpWarehouseAdapter` `1 GiB` `max_bytes_billed` hard stop + `validate_partitioned_calibration_sql` (no `SELECT *`) |
| `storage.googleapis.com` | Immutable SHA-256 artifact archive | Disabled | Enabled | Enabled | Lifecycle archive -> Nearline/Coldline after 30 days |
| `artifactregistry.googleapis.com` | Signed container images for Cloud Run | Disabled | Enabled | Enabled | Vulnerability scanning on push + 5-tag cleanup policy |
| `aiplatform.googleapis.com` | Vertex AI (`gemini-2.5-pro` / Claude Vertex grant) | Grant-gated | Grant-gated | Grant-gated | Tier 3B fallback only after Tier 0/1 free lanes |
| `container.googleapis.com` | GKE Kubernetes Engine | **Disabled** | **Disabled** | **Disabled** | Zero GKE migration (`L3` decision) |
| `sqladmin.googleapis.com` | Cloud SQL Postgres | **Disabled** | **Disabled** | **Disabled** | Zero Neon migration (`L4` evaluation-only) |

---

## 5. Course 4 Dataflow / Spark Placeholder Framework (Evaluation-Only)

GSE's active Tier-0 analytics and simulation pipeline (`10,000` worlds x `175` snaps) executes locally via vectorized NumPy, DuckDB, and SciPy in sub-second wall time (`$0.00` cloud compute). Managed **Cloud Dataflow (Apache Beam)** and **Dataproc Serverless (Spark)** remain **evaluation-only placeholders**, activated ONLY if future raw optical/tracking ingestion exceeds `500 GB/season`:

1. **Stage A -- Partitioned Staging (`GCS`):** Land immutable seasonal Parquet shards (`gs://gse-raw-tracking/season=YYYY/week=WW/`) with SHA-256 checksums via `GcpWarehouseAdapter.upload_artifact()`.
2. **Stage B -- Ephemeral Batch Transform (`Dataflow Flex Template` / `Dataproc Serverless`):** Run bounded batch-only (`--experiments=use_runner_v2`, zero always-on streaming clusters) feature aggregation into partitioned BigQuery external/native tables.
3. **Stage C -- Cost Circuit Breaker:** Mandatory `--max_num_workers=4`, preemptible/Spot workers where supported, and BigQuery `1 GiB` dry-run scan cap before any SQL read.

---

## 6. ML APIs Candidate vs No-Use Table

| GCP / Vertex ML API | Status | Verdict | Rationale |
|---|---|---|---|
| **Vertex AI (`aiplatform.googleapis.com` -- Gemini / Claude Partner Models)** | **CANDIDATE (Tier 3B Grant Lane)** | Approved under credit budget | Used via `apps/web/lib/claude-api/providers/vertex.ts` strictly when free local/NIM/OpenRouter lanes are exhausted |
| **Vertex AI Batch Prediction / Vector Search** | **CANDIDATE (R&D Only)** | Hold until corpus > 1M embeddings | Local FAISS/DuckDB/JSONL indexes currently serve all corpus lookups at `$0.00` |
| **Cloud Vision API (`vision.googleapis.com`)** | **NO-USE** | Rejected | Video/pose research runs offline via open weights (`YOLO`/`SkeleTrack`); commodity Vision OCR adds recurring per-image spend |
| **Cloud Video Intelligence (`videointelligence.googleapis.com`)** | **FREE-TIER CANDIDATE (`1,000 min/mo`, `GSP154`)** | Bounded to permitted internal Film-Room shot tags ONLY | Use strictly inside the `1,000 min/mo` Always-Free quota for internal non-broadcast shot-change tagging before custom GPU hours; broadcast redistribution remains banned |
| **Cloud Speech-to-Text (`speech.googleapis.com`)** | **FREE-TIER CANDIDATE (`60 min/mo`, `GSP119`)** | Bounded to public Tuesday/Friday coach pressers ONLY | Legal-clean Tuesday/Friday coach presser transcription up to `60 min/mo` free quota feeding `beat_langextract`; SiriusXM audio remains strictly blocked without legal ack |
| **Cloud Natural Language (`language.googleapis.com`)** | **FREE-TIER CANDIDATE (`5K units/mo`, `GSP097`)** | Pre-filter for `beat_langextract` entity extraction | Extracts injury/coach entities up to `5K units/mo` free tier before any LLM call; AutoML Tables remains NO-USE (tabular NFL uses causal FWL/Conformal/Sinkhorn math) |
| **BigQuery ML (`bigquery.googleapis.com` `gse_calibration`, `GSP071`, `GSP247`)** | **FREE-TIER CANDIDATE (`1 TB/mo` query, `10 GB` storage)** | Baseline SQL CRPS/ECE/CLV audit | Partitioned US dataset `gse_calibration` guarded by `validate_partitioned_calibration_sql` (never unpartitioned `SELECT *`) |

---

## 7. Motif Conflict Log

Tracks every conflict surfaced during Motif's Interim Google Skills Baseline reconciliation against GSE's actual production repository and cost doctrine:

| Conflict ID | Generic Lab / Baseline Assumption | Actual GSE Production Reality | Resolution & Rule |
|---|---|---|---|
| **MC-01** | Standard cloud-native blueprints default to GKE clusters for containerized workloads | GSE runs Next.js on Vercel + local vectorized NumPy/DuckDB + scale-to-zero workers | Adopt **Cloud Run (`min-instances=0`)** for container offload; **zero GKE migration** (`L3`) |
| **MC-02** | Standard GCP architectures place OLTP Postgres on Cloud SQL | Production runs on **Neon Serverless Postgres 17** with `pg_cron` and autosuspend | Mark Cloud SQL **evaluation-only**; **zero Neon migration** (`L4`) |
| **MC-03** | Generic tutorials reference `GSP***` lab codes as setup checklists | Four candidate GSP numbers lacked primary verification in the workspace | Strictly ban unconfirmed lab IDs; organize baseline purely by verified L1-L11 architecture layers |
| **MC-04** | Labs often assign broad Editor/Owner IAM roles during rapid prototyping | Violates fail-closed least-privilege security and exposes Stripe/Neon/CRON secrets | Zero broad primitive roles permitted; enforce per-resource IAM matrix (`L6+L7`) |
| **MC-05** | Static `public/` folders can accidentally collect `.csv`/`.jsonl`/`.env` exports during sprints | Public root files are served unauthenticated by Vercel CDN | Enforce `scripts/guardrails/verify_public_root_zero_vault_leak.py` in CI (`L9`) |
| **MC-06** | Public proof manifests previously showed `+81.47u` without 1u-normalized context or risked stale ledger text | `apps/web/lib/ledger/public-record.ts` requires `+25.82u` 1u-normalized flat `-110` parity alongside `+81.47u` and bans voided `62-23-1` | Enforce automated checks across all 11 canonical URLs via `scripts/ops/verify_founder_program_evidence_urls.py` |
