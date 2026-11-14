# Daytime Go-Live Readiness and Corpus Gate Checklist (2026-11-14)

- **Generated:** `2026-11-14T11:37Z` (`05:37 CST`) on branch `feat/autonomous-workflows-and-corpus-wiring-2026-11-13`
- **Governing Doctrines:** `MIND-FIRST`, `WIRE-FIRST SEQUENCING` (`research -> wire -> weight -> calibrate -> test -> polish`), and Zero-Paid-OpenRouter-Spend (`$0.00` overnight delta).
- **Current Go-Live Hold Posture (FAIL-CLOSED):**
  - `LIVE_BOARD`: closed (`FAIL_CLOSED_UNCHANGED`)
  - `PUBLIC_PICKS_ENABLED`: closed (`/api/picks` intentionally returns `HTTP 503` `feature_gate`)
  - `PERFORMANCE_STATS_ENABLED`: closed (`FAIL_CLOSED_UNCHANGED`)
  - `PUBLISH_LEDGER`: closed (`FAIL_CLOSED_UNCHANGED`)
  - `CALIBRATION_ADJUSTMENTS_ENABLED`: closed (`FAIL_CLOSED_UNCHANGED`; `generate-signal-slate.ts` untouched)
  - `WEEK10_HELD_FOR_CORPUS_COMPLETION`: held fail-closed in `apps/web/lib/autonomy/site-wide-workflow-fabric.ts` (`checkCorpusCompletionBeforeSlatePrep`) until pending corpus extraction and wiring finish.

---

## 1. Post-Wave-10 Corpus Completion Matrix (Observed Read-Only Snapshot)

### Sovereign Partition x Tier Census (`foundry.db` `?mode=ro` + Disk JSON Union)
- **On-disk Sovereign JSON count:** `554` worktree JSONs (`failures=0` in `foundry/gatekeeper.py`) + `166` shared repo JSONs = **`705` unique artifacts**.
- **Compiler & Router Wiring Counts (Wave 10):**
  - `635` complete Sovereign books (`22` fail-closed stub refusals, `36,948` pages inspected, `81` explicit arXiv IDs, `6,183` indexed arXiv IDs)
  - `684` Sovereign books loaded into router manifest (`8,737` primitives, `1,989` reasoning traces)
  - `9,693` Shard B markdown extractions parsed (`9,568` with XML sections, `37,490` equations) -> `4,822` deduplicated Shard B docs routed
  - `201` RLVR rules/lessons + `69` Drive master clusters (`1,042,184` total records indexed) + `518` Week 10 entity/venue rows
  - `15,749` total routed intelligence units across `30` domains with `276/279` context mask bits active

| Partition | Owner | Tier A Status | Tier B Status | Tier C Status |
|---|---|---|---|---|
| `0-3` | `hermes` | `110` total: `95` w/ JSON (`82` COMPLETE, `5` DUPLICATE_WORK, `4` INSUFFICIENT_OCR, `4` INSUFFICIENT_SOURCE_ACCESS), `2` DUPLICATE_WORK no-json, `12` PENDING, `1` CLAIMED (`13` active remaining) | `835` PENDING (`0` w/ JSON; `hermes` transitions here after `0-3` Tier-A hits `0`) | `3,325` PENDING, `24` QUARANTINED |
| `4-7` | `antigravity` | `129/129` (`100%`) have JSON | `814` total: `469` (`57.6%`) w/ JSON (`467` PENDING w/ JSON + `1` COMPLETE + `1` DUPLICATE_WORK), **`345` PENDING remaining** (`3` Wave 10 failures queued for Vision OCR rescue: `591d1c3f6efeb8d1`, `5cb0e87ae9a2517e`, `5d3564fdc4f39d5f`) | `3,303` PENDING, `43` QUARANTINED, `1` INSUFFICIENT_SOURCE_ACCESS (w/ JSON) |
| `8-f` + Drive | `gse-foundry-gcp-01..04` | `226` total (`8` COMPLETE, `1` DELEGATED_GCP w/ JSON, `1` INSUFFICIENT_SOURCE_ACCESS w/ JSON, `216` DELEGATED_GCP no-json) | `1,606` DELEGATED_GCP | `6,775` DELEGATED_GCP, `1` INSUFFICIENT_SOURCE_ACCESS (w/ JSON), `65` QUARANTINED |

### 4-VM GCP Cloud Foundry Fleet (`GCP-LEV-06` Guard Active)
- **Active Workers:** `gse-foundry-gcp-01` (`us-central1-a`), `gse-foundry-gcp-02` (`us-central1-a`), `gse-foundry-gcp-03` (`us-east1-b`), `gse-foundry-gcp-04` (`us-west1-b`) -- all 4 active on v2 Dual-Cloud (`OpenRouter DISABLED`, 8 threads each across Dual NVIDIA NIM, Alibaba QwenCloud Singapore, BazaarLink, ZeroLimit).
- **Shard B Mirror Progress (`05:36 UTC` sync cycle):** `4,822` unique artifacts (`4,880` branch blobs: `Node 1=1526`, `Node 2=1414`, `Node 3=969`, `Node 4=971`; `gcp_fleet_billing_and_teardown_guard.py`: `4822/8598` = `56.08%`, `KEEP_RUNNING_ACTIVE_SHARD_B_SWEEP`, `teardown_authorized: false`).

---

## 2. Production Launch-Readiness Probe Baseline (`2026-11-14T11:27:37Z`)

Executed read-only against `https://www.galaxysportsedge.com` via `node scripts/check-launch-readiness.mjs` (`5 PASS, 2 WARN, 2 FAIL`):

- **PASS:** `health (strict)` -> `HTTP 200, status=healthy, settlement=healthy`
- **PASS:** `GET /api/picks` -> `HTTP 503 feature gate (deliberate: public picks off)`
- **PASS:** `GET /api/proof/ledger` -> `HTTP 200`
- **PASS:** `GET /api/proof/openapi.json` -> `HTTP 200`
- **PASS:** `cron config` -> `40 schedules in apps/web/vercel.json; root mirror identical`
- **WARN:** `scheduler liveness` -> `not reported`
- **WARN:** `operator tasks` (`node scripts/check-operator-tasks.mjs`) -> `9 open, 1 done, 1 repo-verified; 1 repo-verifiable item(s) UNVERIFIED` (`SANDBOX-NET` has `failIfUnavailable=false` in `.claude/settings.json`; manual items include `NEON-RO`, `CONN-PRUNE`, `PRE-COMMIT-BRAND`, `HENRYGD-REG`, `PUSH-PROTECT`, `BRANCH-PROTECT`, `NEXT-MAJOR`)
- **FAIL:** `ops truth` (`GET /api/ops/public-surface-truth`) -> `HTTP 0 This operation was aborted` (exceeded 20s timeout; must be diagnosed/fast before daytime launch flip)
- **FAIL:** `nflverse currency` (`npx tsx scripts/check-nflverse-currency.ts`) -> probe exited without dataset verdict under `check-launch-readiness.mjs` Windows `spawnSync` invocation; run `npx.cmd tsx scripts/check-nflverse-currency.ts` directly before launch.

---

## 3. Ordered Founder Daytime Go-Live Sequence

Do **not** promote public surfaces until every prerequisite below clears in order:

1. **Stage 1 -- Complete Pending Corpus Ingestion & Router Wiring (`MIND-FIRST` + `WIRE-FIRST SEQUENCING`):**
   - Finish `0-3` Tier-A (`13` active left -> `hermes`) and drain Tier-B across both `4-7` (`345` remaining) and `0-3` (`835` pending), plus Vision OCR rescue on the 3 Wave-10 scanned PDFs (`empty_pages`) and continued 4-VM Shard B / Drive sweep (`4822/8598`).
   - Re-run compilers (`arxiv_and_tierb_corpus_synthesizer.py`, `shard_b_and_drive_master_compiler.py`, `sovereign_to_cognitive_router_wiring.py`, `corpus_wired_calibration_and_ablation.py`), refresh BigQuery `galaxysportsedge.gse_data` across all 5 tables, and let Windows trainer ingest `brain/feeds/*` into `brain/mind.jsonl`.
   - Note: `generate-signal-slate.ts` must remain untouched per `WIRE-FIRST SEQUENCING` and `MIND-FIRST` baseline doctrine.
2. **Stage 2 -- Code, Guardrail & Ledger Verification Before Merging `feat/autonomous-workflows-and-corpus-wiring-2026-11-13`:**
   - Run `C-375` `apps/web` test suite + `npm run guardrails` + `node scripts/guardrails/trust-gate.mjs` + `node apps/mobile/scripts/lint-rules.js` + `python scripts/guardrails/connected-workflow-dossier-guard.py` + `npm run check:ledger` + `npx.cmd tsx scripts/check-nflverse-currency.ts`.
   - Run `npm run verify:ledger` (`scripts/verify-ledger.ts` using read-only `hermes_ro`) so `apps/web/lib/ledger/verified-ledger.json` reflects latest Neon truth.
   - Merge feature branch to `origin/main` cleanly and verify Vercel Production deployment reaches `READY`.
3. **Stage 3 -- Resolve Readiness Probe Blockers:**
   - Diagnose why `GET /api/ops/public-surface-truth` timed out at 20s and re-run `node scripts/check-launch-readiness.mjs` until `ops truth` returns `HTTP 200` and strict readiness checks pass.
   - Verify `node scripts/check-deploy-readiness.mjs` against production env (DB, Odds API, Stripe slots, webhook, crons).
4. **Stage 4 -- Explicit Founder Flag Flip (Only After Stages 1-3 Pass):**
   - Verify `FORCE_NO_BET_IF_STALE=true` is set in Vercel Production before opening public picks (`scripts/ops/owner-runbook.mjs` requirement).
   - Founder explicitly decides whether to flip `PUBLIC_PICKS_ENABLED=true` / `LIVE_BOARD` on Vercel Production once corpus + 5-stage Week 10 Connected Workflow Dossier + Conjunction Gate are complete.
   - Keep `PERFORMANCE_STATS_ENABLED` and `PUBLISH_LEDGER` **closed (`false`)** unless `/api/ops/public-surface-truth` reports calibration eligibility `GREEN` (`>= 200` CLV-backed settled official plays) per `scripts/ops/launch-preflight.mjs` and `scripts/check-launch-readiness.mjs`.
