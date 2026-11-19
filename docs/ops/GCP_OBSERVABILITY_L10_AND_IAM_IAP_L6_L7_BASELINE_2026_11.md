# GCP Observability (L10) and IAM/IAP (L6+L7) P0 Baseline (2026-11)

**Date:** 2026-11-18
**Status:** Active P0 Governance Baseline (Zero-Waste + Fail-Closed)
**Compliance Anchor:** Incorporates Motif's Interim Google Skills Baseline. Contains zero unconfirmed lab IDs and zero primitive broad roles.

---

## 1. L10 Observability Baseline (Uptime Checks, Symptom Alerts, Ops Dashboard, Saved Queries)

Observability tracks user-facing symptoms and freshness SLAs while filtering out noisy non-human probe chatter from PostHog Project `516325` and Sentry `$5k` credit budgets (`tracesSampleRate: 0.1` in production).

### 1.1 Six Multi-Region Uptime Checks

| ID | Target URL Path | Regions | Cadence | Expected Status & Body Assertion | Timeout |
|---|---|---|---|---|---|
| **Uptime Check 1** | `/api/health` | `us-central1`, `us-east1`, `europe-west1` | 1 min | HTTP `200`, JSON `ok === true` and `checks.db.status === "ok"` | 10s |
| **Uptime Check 2** | `/` | `us-central1`, `us-east1`, `us-west1` | 5 min | HTTP `200`, HTML includes `Galaxy Sports Edge` and `<main id="main-content"` | 10s |
| **Uptime Check 3** | `/board` | `us-central1`, `us-east1`, `us-west1` | 5 min | HTTP `200`, zero unhandled error boundary markers | 10s |
| **Uptime Check 4** | `/record` | `us-central1`, `us-east1`, `europe-west1` | 5 min | HTTP `200`, renders `The Sealed Record` and `79-46-0` (or updated verified ledger counts) | 10s |
| **Uptime Check 5** | `/api/ops/public-surface-truth` | `us-central1`, `us-east1` | 5 min | HTTP `200`, JSON `ok === true` and `detail === "public"` | 15s |
| **Uptime Check 6** | `/llms.txt` | `us-central1`, `europe-west1` | 15 min | HTTP `200`, `text/plain`, includes canonical `/record` link and calibration policy | 10s |

### 1.2 Five Owned Symptom-Based Alert Policies (With Explicit Teardown Triggers)

| Policy | Symptom Condition | Owner | Channel | Threshold | Teardown Trigger |
|---|---|---|---|---|---|
| **Alert Policy 1** | Production Health or 5xx Availability Burn | Platform Ops Lead (Garrett / On-Call SRE) | Sentry Pager + Email (`galaxy-sports-edge` ops) + Discord `#ops-alerts` | `Uptime Check 1` fails in >= 2 regions for 2 consecutive probes OR 5xx rate >= 2.0% over 5m | Teardown / auto-resolve after 15 consecutive healthy minutes across all 3 regions AND `deployment.sha` matches `origin/main` |
| **Alert Policy 2** | Odds Ingestion & Market Freshness SLA Breach | Data Ingestion Owner | Discord `#ingestion-alerts` + Email | `oddsInserting.withinRefreshSla === false` (> 240 min since last `oddsInserted > 0`) OR `freeSpine.withinSla === false` | Teardown when `/api/ops/public-surface-truth` reports `oddsInserting.withinRefreshSla === true` for 2 consecutive cycles |
| **Alert Policy 3** | Settlement Overdue Backlog / Critical Health | Settlement & Ledger Owner | Sentry Issue Alert + Discord `#ops-alerts` | `settlement.overduePending > 0` past grace hours OR `settlement.health === "CRITICAL"` for 30m | Teardown when `settlement.overduePending === 0` and `settlement.health === "HEALTHY"` |
| **Alert Policy 4** | Post-Publish Calibration Drift or Public Ledger Mismatch | Calibration & Trust Gate Owner | Pager Email + Discord `#trust-gate` | `calibrationDrift !== null` OR `verify_founder_program_evidence_urls.py --live` flags non-200 / stale `+81.47u` without `+25.82u` | Teardown after calibration streak clears GREEN or `calibrationPublish.autoUnpublish` halts public stats exposure |
| **Alert Policy 5** | Event Bus DLQ Depth & Stripe Webhook Failures | Billing & Worker Bus Owner | Sentry High-Priority + Email | `dead_lettered` count >= 1 on any Pub/Sub `.dlq` topic (`age > 300s`) OR Stripe webhook 5xx >= 1 in 5m | Teardown once `.dlq` backlog drains to `0` and `/api/ops/public-surface-truth` reports `repair-checkout-attempts` clean |

### 1.3 Ops Dashboard Layout (`GSE-P0-Production-Observability`)

**Dashboard Layout** (4 horizontal rows, 12-column Cloud Monitoring grid):
1. **Row 1 -- Edge Availability & Golden Signals:** Multi-region uptime status tiles (`Uptime Check 1`..`6`), HTTP status code stacked bar (`2xx`/`4xx`/`5xx`), and p50/p95/p99 latency curves for `/`, `/board`, `/record`, `/api/health`, and `/api/ops/public-surface-truth`.
2. **Row 2 -- Ingestion & Odds Freshness:** Minutes since last `oddsInserted > 0` (`240m` SLA line), `freeSpine.ageMinutes`, Rundown/Odds API quota remaining gauge (C-109 governor), and `/api/cron/refresh-odds` duration heatmap.
3. **Row 3 -- Settlement, CLV & Calibration Drift:** `settlement.overduePending` time series, `canonicalSettled` vs `clvBackedSettled` (`200`-bet calibration gate progress), and open `calibrationDrift` banner status.
4. **Row 4 -- Event Bus DLQs, Billing & Credit Burn:** Pub/Sub subscription backlog + `.dlq` oldest unacked message age across all 5 event contracts (`odds.updated.v1`, `injury.designated.v1`, `slate.sealed.v1`, `game.settled.v1`, `clv.captured.v1`), Stripe webhook error rate, and Sentry/PostHog daily ingested event count vs grant cap.

### 1.4 Six Saved Logs Explorer Queries

- **Saved Query 1 (5xx Edge & API Failures):**
  `resource.type=("cloud_run_revision" OR "https_load_balancer") httpRequest.status>=500 severity>=ERROR`
- **Saved Query 2 (IAP & Auth Denials / 401-403 Spikes):**
  `jsonPayload.surface=("admin" OR "cockpit" OR "ops" OR "airwave") (httpRequest.status=401 OR httpRequest.status=403 OR textPayload:"x-goog-iap-jwt-assertion")`
- **Saved Query 3 (Odds Ingestion & Free-Spine Fallbacks):**
  `jsonPayload.route=("/api/cron/refresh-odds" OR "/api/cron/free-spine-health") (jsonPayload.oddsInserted=0 OR jsonPayload.status="429" OR severity>=WARNING)`
- **Saved Query 4 (Stripe Webhooks & CheckoutAttempt Repairs):**
  `jsonPayload.route=("/api/webhooks/stripe" OR "/api/cron/repair-checkout-attempts" OR "/api/packages/checkout") (severity>=WARNING OR jsonPayload.repairedCount>0)`
- **Saved Query 5 (Pub/Sub & QStash Dead-Lettered Event Contracts):**
  `jsonPayload.eventName:(".v1") (jsonPayload.status="dead_lettered" OR jsonPayload.status="retry")`
- **Saved Query 6 (AI Telemetry & Sentry Credit Sampling Guard):**
  `jsonPayload.telemetrySource=("sentry" OR "posthog" OR "vertex") (jsonPayload.tracesSampleRate!=0.1 OR jsonPayload.latencyMs>5000)`

---

## 2. L6 + L7 Identity, Route Inventory, and Least-Privilege IAM Baseline

### 2.1 Verified Next.js App Router Route Classification (`apps/web/app/**`)

Scanned directly from disk on `apps/web/app`: **246** `page.tsx` page routes + **258** `route.ts` route handlers = **504** total App Router endpoints (plus metadata generators such as `apps/web/app/sitemap.ts` and `robots.ts`).

| Security Zone | App Router Counts | Exact Workspace Surfaces | Auth & Enforcement Mechanism |
|---|---|---|---|
| **Public** | `152` `page.tsx` + `145` `route.ts` | `/`, `/about`, `/academy`, `/board` (public preview), `/record`, `/media-kit`, `/case-studies/*`, `/parlay-mri` (free X-Ray only), `/packages`, `/pricing`, `/proof`, `/props`, `/research`, `/tools/*`, `/vs/tout-services`, `/llms.txt`, `/llms-full.txt`, `/news-sitemap.xml`, `/.well-known/*`, `/api/health` (redacted public), `/api/ops/public-surface-truth` (redacted public), `/api/webhooks/*` (HMAC-verified), `/api/public-*` | Anonymous public access with CSP/HSTS headers (`apps/web/vercel.json`), Postgres rate limiting on `/api/ops/public-surface-truth` & lead forms, HMAC signature check on `/api/webhooks/{stripe,whop,telegram}` |
| **Member** | `14` `page.tsx` (auth/tier-gated tools) + `15` `route.ts` | `/dashboard`, `/watchlist`, `/picks`, `/slate`, `/slate/[sport]`, `/fantasy/*` (member/Pro gates), `/track`, `/track/platform`, `/trends`, `/room/[gameId]`, `/observatory`, `/optimizer`, `/blog/[slug]`, `/api/auth/*`, `/api/mobile/v1/*`, `/api/packages/*`, `/api/subscriptions/*`, `/api/checkout`, `/api/billing/*`, `/api/watchlist/*` | NextAuth v5 session cookie (`auth()`) or Mobile Bearer token (`apps/web/lib/mobile/bearer-auth.ts`) + server-side `getUserEntitlements()` / Stripe/Whop entitlement reconciliation |
| **Internal-IAP** | `80` `page.tsx` (`40` `/admin/*` + `40` `/cockpit/*`) + `98` `route.ts` (`40` `/api/cron/*`, `32` `/api/cockpit/*`, `5` `/api/admin/*`, `17` `/api/ops/*` operator/cron routes, `4` `/api/airwave/*`) + `14` dark internal-fence pages (`/intelligence/reconstruction` permanently dark; `/methodology`, `/intelligence/metrics`, `/nflverse`, `/players/*` env-gated) | Admin cockpit, StatKing internal research views, Airwave review queue, Cron runners, Operator truth/RCA/backfill routes | Google Cloud IAP at ALB/Cloud Run edge (`x-goog-iap-jwt-assertion`) PLUS defense-in-depth server checks: `middleware.ts` session check, `isAdminSession()` (`role === "ADMIN"`), and `cronAuthError` / `opsReadAuthError` / `hasOpsAuth` (`CRON_SECRET` / `OPS_READ_SECRET`) |

Note on `/api/ops/public-surface-truth`: anonymous requests receive only redacted public posture (`detail: "public"`, rate-limited at 60 req/min); full operator diagnostics (`detail: "operator"`, `bySport`, `stripeWebhookHosts`, `lineIntegrity`, `mainFeatureMarkers`, `stripe`) require `hasOpsAuth(request)` and remain behind the Internal-IAP operator boundary.

### 2.2 Server-Side IAP JWT Verification Checklist (`x-goog-iap-jwt-assertion`)

Every Cloud Run / internal backend behind Google Cloud Identity-Aware Proxy MUST verify the signed assertion server-side on every request (never rely on network perimeter or unsigned headers alone):

1. **Require Header Presence:** Reject with HTTP `401` (`Cache-Control: no-store`) if `x-goog-iap-jwt-assertion` is missing or empty.
2. **Never Trust Unsigned Identity Headers Alone:** Ignore `x-goog-authenticated-user-email` and `x-goog-authenticated-user-id` unless the `x-goog-iap-jwt-assertion` JWT signature has already verified.
3. **Fetch & Cache Google IAP Public Keys (ES256):** Verify the JWT `alg === "ES256"` and `kid` against Google's official JWKS endpoint (`https://www.gstatic.com/iap/verify/public_key-jwk`) with bounded key caching and automatic refresh on unknown `kid`.
4. **Enforce Issuer (`iss`) & Audience (`aud`):**
   - `iss` MUST strictly equal `https://cloud.google.com/iap`.
   - `aud` MUST strictly match `/projects/<PROJECT_NUMBER>/global/backendServices/<BACKEND_SERVICE_ID>` (or regional App Engine/Cloud Run backend audience).
5. **Validate Time Claims (`exp`, `iat`):** Reject expired tokens (`now > exp + 60s`) or future-dated tokens (`iat > now + 60s`).
6. **Enforce Identity Allowlist & App-Level Role Check:** Verify `email_verified === true` and `email` belongs to the operator allowlist, then still verify NextAuth `isAdminSession()` or `CRON_SECRET` where applicable (dual-lock defense in depth).

### 2.3 Least-Privilege IAM Roles Matrix

Strict rule: ZERO broad primitive roles granted to any human, CI runner, or service account. Every identity receives only the minimum single-resource IAM role required.

| Actor (Service Account / Principal) | Target GCP Resource | Least-Privilege Role | Justification (Why) |
|---|---|---|---|
| `sa-web-runtime@gse-prod.iam.gserviceaccount.com` | Secret Manager (`CRON_SECRET`, `OPS_READ_SECRET`, `STRIPE_SECRET_KEY`) | `roles/secretmanager.secretAccessor` (per-secret binding) | Reads runtime secrets without ability to list/edit other secrets |
| `sa-web-runtime@gse-prod.iam.gserviceaccount.com` | Pub/Sub Topics (`gse.*.v1`) | `roles/pubsub.publisher` (topic-scoped) | Publishes domain events (`odds.updated.v1`, `slate.sealed.v1`, `clv.captured.v1`) |
| `sa-web-runtime@gse-prod.iam.gserviceaccount.com` | Cloud Logging & Trace | `roles/logging.logWriter`, `roles/cloudtrace.agent` | Emits structured logs and traces (10% sampling) without log-delete permission |
| `sa-worker-offload@gse-prod.iam.gserviceaccount.com` | Pub/Sub Subscriptions (`gse.*.sub` + `.dlq`) | `roles/pubsub.subscriber` (subscription-scoped) | Consumes async ingestion/settlement jobs and writes failed messages to DLQ |
| `sa-worker-offload@gse-prod.iam.gserviceaccount.com` | GCS Archive Bucket (`gs://gse-sealed-artifacts`) | `roles/storage.objectCreator` (bucket-scoped) | Writes immutable SHA-256 sealed artifacts without delete/overwrite rights |
| `sa-worker-offload@gse-prod.iam.gserviceaccount.com` | BigQuery (`gse_data` dataset) | `roles/bigquery.jobUser` + `roles/bigquery.dataViewer` | Executes dry-run capped (`1 GiB`) analytical queries via `GcpWarehouseAdapter` |
| `sa-scheduler-invoker@gse-prod.iam.gserviceaccount.com` | Cloud Run Worker Services | `roles/run.invoker` (service-scoped) | Invokes scale-to-zero Cloud Run HTTP targets with OIDC identity token |
| `sa-github-ci-deploy@gse-prod.iam.gserviceaccount.com` | Artifact Registry + Cloud Run Deploy | `roles/artifactregistry.writer`, `roles/run.developer` | Pushes container images via Workload Identity Federation (zero static JSON keys) |
| `group:gse-operators@galaxysportsedge.com` | Internal Admin / Cockpit IAP Backend | `roles/iap.httpsResourceAccessor` | Grants human operators zero-trust HTTPS tunnel access to `/admin/*` and `/cockpit/*` |
| `group:gse-operators@galaxysportsedge.com` | Cloud Monitoring & Logs Explorer | `roles/monitoring.viewer`, `roles/logging.viewer` | Read-only inspection of dashboards, uptime checks, and saved log queries |

---

## 3. L9 CI Public-Root Zero-Vault-Leak Gate

Automated guard: `scripts/guardrails/verify_public_root_zero_vault_leak.py` validates that `apps/web/public/` contains zero `.csv`, `.jsonl`, `.parquet`, `.env`, `vault`, `signal`, or `equation` files outside the 6 allowlisted brand visual assets under `apps/web/public/immersive/`.
