# Worker Fleet Offload and Airwave Activation Topology (2026-11)

**Date:** 2026-11-18
**Status:** Design + Inventory Truth + Fail-Closed Offload Map
**Scope:** Reconciles the 5 active/scaffolded worker subsystems under `workers/` against the live Vercel cron scheduler (`apps/web/vercel.json`), Cloudflare Workers / Durable Objects, and GCP Cloud Run offload boundaries.

---

## 1. Ground-Truth Worker Inventory

Per `workers/README.md`, production scheduling today runs through the 40 Vercel cron routes declared in `apps/web/vercel.json`. No `bullmq` dependency is installed anywhere in `package.json` or `package-lock.json`, and `workers/` entrypoints remain non-production unless explicitly wired and gated.

| Worker Package | Workspace Status | Current Runtime Entrypoint | Fail-Closed Kill Switches / Gates | Primary Offload / Activation Target |
|---|---|---|---|---|
| `workers/airwave-listener` | Workspace member (`@sports/worker-airwave-listener`) | `src/dry-run.ts` (read-only plan reporter; working) | `AIRWAVE_ENABLED`, `AIRWAVE_SIRIUSXM_LEGAL_ACK`, `AIRWAVE_TRANSCRIPT_IMPORT_ENABLED`, `AIRWAVE_YOUTUBE_FEEDS_ENABLED`, `AIRWAVE_PODCAST_RSS_ENABLED`, `AIRWAVE_BEAT_REPORTS_ENABLED`, `AIRWAVE_STUDIO_HANDOFF_ENABLED` | Cloud Run stateless intake job + Pub/Sub `slate.sealed.v1` / operator review queue |
| `workers/immortal-orchestrator` | Excluded from root npm workspaces (`!workers/immortal-orchestrator`) | `src/index.ts` (`wrangler.toml` Cloudflare Worker + Durable Object `ImmortalControlAgent`) | `verifyX402UsdcMicropayment` fail-closed payment gate; `WeeklyNflLifecycleWorkflow` phase gates; `buildJulesSelfHealingDispatch` dry payload | Cloudflare Workers + Durable Object SQLite (`gse-immortal-orchestrator`) |
| `workers/content-publishing` | Workspace member (`@sports/worker-content-publishing`) | `src/index.ts` (hard kill-switch; `.ts` ESM loader issue under Node 20 `workers:content`) | `INTERNAL_CALIBRATION_ONLY` defaults ON (refuses all requests); `CONTENT_WORKER_ENABLED` must be `"true"` (still queues only, never sets `PUBLISHED`) | Vercel / Cloud Run manual review queue behind `apps/web/__tests__/calibration-cockpit.test.ts` text invariants |
| `workers/data-refresh` | Workspace member (`@sports/worker-data-refresh`) | `src/index.ts` (30-min `setTimeout` loop calling `@sports/ingestion-pipeline`; `hydrate-cold-plane.ts` unused export) | Delegated `getReadinessGates()` + `PlatformConfig` flags; duplicated by `/api/cron/refresh-odds` and `/api/cron/settle-picks` | Cloud Run scale-to-zero (`min-instances=0`) container offload for long-running hydration / backfill bursts |
| `workers/twitter-bot` | Workspace member (`@sports/twitter-bot`, CJS) | `oauth1.js` + `sender.js` + `ledger.js` + `x-client.js` (`wrangler.toml` `gse-twitter-bot`) | `LIVE_POSTING_ENABLED = "false"`, `DRAFT_ONLY_MODE = "true"` in `wrangler.toml`; `MUTE_BOT` checked at send time; idempotency key logged before POST | Cloudflare Worker (`gse-twitter-bot`) gated behind manual operator outbox approval |

---

## 2. Per-Worker Architecture, Safety Invariants, and Offload Plan

### 2.1 `workers/airwave-listener` (Transcript & Media Intelligence Activation)
- **Current Behavior (`workers/airwave-listener/src/dry-run.ts`):** Pure read-only CLI report (`npm run dry-run --workspace=workers/airwave-listener`). Imports `apps/web/lib/airwave/channel-87-schedule.ts`, `intake-contract.ts`, and `source-policy.ts`. Never captures audio, never calls SiriusXM endpoints, never writes to Postgres, and never publishes claims.
- **Non-Negotiable Compliance Rules (`apps/web/lib/airwave/source-policy.ts`):**
  1. `satellite_radio_context` requires human-signed `AIRWAVE_SIRIUSXM_LEGAL_ACK=true`, may NEVER archive raw audio (`canStoreRawAudio: false`), and may NEVER store public verbatim transcripts (`canStoreVerbatimTranscript: false`).
  2. Paraphrased claims (`paraphrased_claim` in `AIRWAVE_SPREADSHEET_CONTRACT`) are the sole permitted public unit; `source_pointer` stays private.
  3. Zero auto-publish (`canAutoPublish: false`); all derived candidates stage into `/api/airwave/review-queue` (admin-gated via `isAdminSession`).
- **Activation Sequence:**
  1. Keep `AIRWAVE_SIRIUSXM_LEGAL_ACK=false` until written rights clearance is archived.
  2. Activate free/owned lanes first (`AIRWAVE_PODCAST_RSS_ENABLED=true`, `AIRWAVE_YOUTUBE_FEEDS_ENABLED=true`, `AIRWAVE_BEAT_REPORTS_ENABLED=true`) after setting `AIRWAVE_ENABLED=true`.
  3. Offload scheduled RSS/transcript parsing to a scale-to-zero Cloud Run Job emitting `injury.designated.v1` events via QStash/Pub/Sub after operator approval.

### 2.2 `workers/immortal-orchestrator` (Cloudflare Control Plane & Fleet Heartbeat)
- **Current Behavior (`workers/immortal-orchestrator/src/index.ts` & `wrangler.toml`):** Implements `ImmortalControlAgent` (Durable Object SQLite), `WeeklyNflLifecycleWorkflow` (6 deterministic stages from Tuesday 04:00 CT master lock through post-game RLVR feedback), `verifyX402UsdcMicropayment` (`$0.15 USDC` on Base Mainnet `eip155:8453` or `$499/mo` Syndicate key), and `buildJulesSelfHealingDispatch`.
- **Schedule:** Configured in `workers/immortal-orchestrator/wrangler.toml` for Tuesday morning UTC master lock and 15-minute heartbeat ticks (never duplicated into `apps/web/vercel.json`).
- **Offload Role:** Coordinates lightweight edge heartbeats across `metamus_controller`, `hermes_jev_daemon`, `opendots_local_5173`, `openbot_worker`, `opentag_telemetry`, `openmuse_verifier`, `google_jules_healer`, and `cloudflare_immortal_cron`, keeping heavy vectorized simulations local or on ephemeral burst compute.

### 2.3 `workers/content-publishing` (Hard Kill-Switch & Queue-Only Fence)
- **Current Behavior (`workers/content-publishing/src/index.ts`):** Enforces a hard kill switch: `INTERNAL_CALIBRATION_ONLY` defaults `true` (every request returns `status: "REFUSED"`, `refusedByInternalCalibrationGates: true`). Even when `INTERNAL_CALIBRATION_ONLY=false`, `runContentPublisher()` only returns `status: "QUEUED"` and NEVER writes `status: "PUBLISHED"` or `publishedAt`.
- **CI Coupling Invariant:** `apps/web/__tests__/calibration-cockpit.test.ts` inspects `workers/content-publishing/src/index.ts` directly as text to enforce these four invariants. Never delete `workers/content-publishing/` or alter the kill-switch defaults without updating the calibration gate policy.
- **Offload Role:** Downstream Content-OS packets (`data/content-os/week11_dvp_free_sheet_2026.json`) are staged for manual review and served behind `/api/content-os/packet`; automated external publishing remains locked.

### 2.4 `workers/data-refresh` (Ingestion & Hydration Offload Target)
- **Current Behavior (`workers/data-refresh/src/index.ts`):** Implements a self-arming 30-minute `setTimeout` loop calling `runRefreshCycle()` and `settleSport()`, plus `hydrateColdPlaneFromDb()` in `hydrate-cold-plane.ts`.
- **Known Defect Documented in `workers/README.md`:** Root script `npm run workers:refresh` (`ts-node --esm src/index.ts`) fails under Node 20 with `ERR_UNKNOWN_FILE_EXTENSION` because worker `tsconfig.json` targets CJS/NodeNext, and `workers/data-refresh/Dockerfile` omits `packages/stats-api/package.json`. Meanwhile, Vercel crons `/api/cron/refresh-odds` and `/api/cron/settle-picks` already execute the shared `@sports/ingestion-pipeline` logic in production (see `docs/ops/CRON_MATRIX.generated.md`).
- **Offload Plan:** Fix `Dockerfile` + CJS/tsx execution only when moving heavy multi-sport historical backfills or cold-plane hydration off Vercel serverless duration limits onto GCP Cloud Run (`min-instances=0`, `max-instances=2`, IAM service account restricted to Secret Manager accessor + Pub/Sub publisher).

### 2.5 `workers/twitter-bot` (Idempotent X Transport for `@GalaxySportsHQ`)
- **Current Behavior (`workers/twitter-bot/oauth1.js`, `sender.js`, `ledger.js`, `wrangler.toml`):** Hand-rolled RFC 5849 OAuth 1.0a HMAC-SHA1 signer (`oauth1.js`, zero third-party signing dependencies) paired with `TwitterSender` (`agent: "motif-muse"`, `account: "@GalaxySportsHQ"`).
- **Safety Guarantees (`workers/twitter-bot/sender.js`):**
  1. `wrangler.toml` pins `LIVE_POSTING_ENABLED = "false"` and `DRAFT_ONLY_MODE = "true"`.
  2. `MUTE_BOT` is evaluated at send time (not schedule time).
  3. Idempotency key is written to the ledger BEFORE sending the HTTP request; network timeouts resolve to `Outcome.UNKNOWN` and are NEVER automatically retried, eliminating duplicate tweet storms.
  4. Threads validate 280-char limits upfront (`Outcome.INVALID`) and report `Outcome.PARTIAL` honestly on mid-thread failure.
- **Activation Gate:** Remains in `DRAFT_ONLY_MODE` until explicit founder sign-off flips `LIVE_POSTING_ENABLED` and clears outbox rows via `apps/web/lib/bot-outbox`.

---

## 3. Event-Driven Offload Bus (`@sports/ops`)

All cross-worker triggers (`odds.updated.v1`, `injury.designated.v1`, `slate.sealed.v1`, `game.settled.v1`, `clv.captured.v1`) use the versioned TypeScript contracts in `packages/ops/src/google-cloud-event-contracts.ts` so Vercel crons, QStash webhooks, Cloudflare Workers, and GCP Pub/Sub push endpoints share deterministic SHA-256 idempotency keys and dead-letter policies.
