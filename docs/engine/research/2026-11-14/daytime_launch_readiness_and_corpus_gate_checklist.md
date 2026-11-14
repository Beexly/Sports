# Daytime Go-Live Readiness and Corpus Gate Checklist (2026-11-14)

- **Generated:** `2026-11-14T11:37Z` (`05:37 CST`) on branch `feat/autonomous-workflows-and-corpus-wiring-2026-11-13`
- **Last Corpus Matrix Refresh:** `2026-11-14T15:00Z` (`09:00 CST`, Post-Wave-15 / `AUTON-CORPUS-15` closure + Motif `9,944` X/IG sweep ingestion!)
- **Governing Doctrines:** `MIND-FIRST`, `WIRE-FIRST SEQUENCING` (`research -> wire -> weight -> calibrate -> test -> polish`), and Zero-Paid-OpenRouter-Spend (`$0.00` overnight delta).
- **Current Go-Live Hold Posture (FAIL-CLOSED):**
  - `LIVE_BOARD`: closed (`FAIL_CLOSED_UNCHANGED`)
  - `PUBLIC_PICKS_ENABLED`: closed (`/api/picks` intentionally returns `HTTP 503` `feature_gate`)
  - `PERFORMANCE_STATS_ENABLED`: closed (`FAIL_CLOSED_UNCHANGED`)
  - `PUBLISH_LEDGER`: closed (`FAIL_CLOSED_UNCHANGED`)
  - `CALIBRATION_ADJUSTMENTS_ENABLED`: closed (`FAIL_CLOSED_UNCHANGED`; `generate-signal-slate.ts` untouched)
  - `WEEK10_HELD_FOR_CORPUS_COMPLETION`: held fail-closed in `apps/web/lib/autonomy/site-wide-workflow-fabric.ts` (`checkCorpusCompletionBeforeSlatePrep`) until pending corpus extraction and wiring finish.

---

## 1. Post-Wave-15 Corpus Completion Matrix (Observed Read-Only Snapshot)

### Sovereign Partition x Tier Census (`foundry.db` `?mode=ro` + Disk JSON Union)
- **On-disk Sovereign JSON count:** `1,009` worktree JSONs (`failures=0` in `foundry/gatekeeper.py`) + `180` shared repo JSONs = **`1,064` unique books loaded into router manifest**.
- **Compiler & Router Wiring Counts (Wave 15 + Motif `9,944` Sweep):**
  - `1,003` complete Sovereign books (`112` fail-closed stub refusals in synthesizer / `114` total refusal receipts in router, `54,580` pages inspected, `173` explicit arXiv IDs, `6,183` indexed arXiv IDs, `16,445` Sovereign trainer-feed rows)
  - `1,064` Sovereign books loaded into router manifest (`14,667` primitives, `3,405` reasoning traces)
  - `7,846` Shard B markdown extractions parsed (`7,772` with XML sections, `26,723` equations, `10,272` Shard B + Drive trainer-feed rows) -> `8,143` GCP Shard B docs routed
  - `200` RLVR rules/lessons + `69` Drive master clusters (`1,042,184` total records indexed: `940,102` equations + `102,082` situational rows) + `518` Week 10 entity/venue rows
  - **`26,415` total routed intelligence units** across `30` domains with `276/279` context mask bits active
  - **Motif `9,944` Sports Sweep (`origin/motif/sweep-ingestion-2026-11-14` @ `674698f5`, rebucketed per `AGENTS.md` to `docs/data-sources/research/2026-11-14/sweep-ingestion/`):** `2,720` `ig_for_you` + `5,609` `x_for_you` + `1,615` `x_analytics` (`86/86` `x-intel-*.md` files; IG Nov 4 AM ~53 unrecoverable browser-handoff source-loss exception documented) + `9,944` trainer-feed rows at `brain/feeds/2026-11-14/motif_x_ig_sweep_9944_trainer_feed.jsonl` (`brain/mind.jsonl` untouched)
  - **BigQuery (`galaxysportsedge.gse_data`):** **`36,877` verified SQL rows across `6` tables** (`26,933` across the 5 core tables in `05b_bigquery_gse_data_hydration_receipt.json` + `9,944` in `motif_social_analytics_sweeps`, `$0.00`)
- **Always-Free Cloud Vision OCR Rescues (`5/5` Tier-B PDFs):** `591d1c3f6efeb8d1` (Perin et al. 2018), `5cb0e87ae9a2517e` (WeatherCompany US12631787), `5d3564fdc4f39d5f` (WeatherCompany US12025768), `6cb818e53ff368b9` (Galton 1889 *Natural Inheritance*), `7a407377b5f10417` (Second Spectrum 2014 *Quantifying Shot Quality in the NBA*, `8/8`p full paper) - `88/1,000` monthly Always-Free Vision pages (`8.8%`, `$0.00`), all `5` now Gatekeeper-validated Sovereign JSONs.

| Partition | Owner | Tier A Status | Tier B Status | Tier C Status |
|---|---|---|---|---|
| `0-3` | `hermes` | `0` `PENDING` left (`93` COMPLETE, `7` DUPLICATE_WORK, `6` INSUFFICIENT_OCR, `4` INSUFFICIENT_SOURCE_ACCESS`) | `835` total: **`5` COMPLETE, `830` PENDING** (`hermes` advancing free Aliyun lane per `e95386bfc`) | `3,325` PENDING, `24` QUARANTINED |
| `4-7` | `antigravity` | **`129/129` (`100%`)** have JSON (`0` remaining on disk) | **`814/814` (`100%`)** have JSON (`0` remaining on disk) | `3,303` DB `PENDING` (`110` new Wave 15 Tier-C JSONs landed on disk -> `1,009` total worktree JSONs; `Wave 16` launching on `--lane free`), `43` QUARANTINED, `1` INSUFFICIENT_SOURCE_ACCESS |
| `8-f` + Drive | `gse-foundry-gcp-01..04` | `226` total (`8` COMPLETE, `217` DELEGATED_GCP, `1` INSUFFICIENT_SOURCE_ACCESS) | `1,606` DELEGATED_GCP | `6,775` DELEGATED_GCP, `1` INSUFFICIENT_SOURCE_ACCESS, `65` QUARANTINED |

### 4-VM GCP Cloud Foundry Fleet (`GCP-LEV-06` Guard Active)
- **Active Workers:** `gse-foundry-gcp-01` (`us-central1-a`), `gse-foundry-gcp-02` (`us-central1-a`), `gse-foundry-gcp-03` (`us-east1-b`), `gse-foundry-gcp-04` (`us-west1-b`) -- all 4 active on v2 Dual-Cloud (`OpenRouter DISABLED`, 8 threads each across Dual NVIDIA NIM, Alibaba QwenCloud Singapore, BazaarLink, ZeroLimit).
- **Shard B Mirror Progress (`09:00` CST `GCP-LEV-06` check):** **`8,041/8,598`** unique flat files (`93.52%`, `8,099` branch blobs: `Node 1=2354`, `Node 2=2266`, `Node 3=1725`, `Node 4=1754`; `8,143` deduplicated Shard B docs routed; `gcp_fleet_billing_and_teardown_guard.py`: `KEEP_RUNNING_ACTIVE_SHARD_B_SWEEP`, `teardown_authorized: false`).

---

## 2. Production Launch-Readiness Probe Baseline (`2026-11-14T11:51:08Z`)

Executed read-only against `https://www.galaxysportsedge.com` via `node scripts/check-launch-readiness.mjs` after fixing the `/api/ops/public-surface-truth` client timeout (`95s` matching route `maxDuration = 120`) and direct Windows `node_modules/tsx/dist/cli.mjs` invocation (**`0 FAIL, 7 WARN, 15 PASS`**):

- **PASS (`15`):**
  - `health (strict)`: `HTTP 200, status=healthy, settlement=healthy`
  - `settlement`: `HEALTHY, 0 overdue of 4492 commenced`
  - `gates`: `publicPicks=false performanceStats=false statsPublic=true calibrationPublished=false`
  - `stale-data kill switch`: `FORCE_NO_BET_IF_STALE=true`
  - `record gate`: `performance stats closed unless eligibility is GREEN`
  - `canonical sample`: `settled=4003 pending=78 floor=100`
  - `odds freshness`: `last insert 36m ago (soccer_usa_mls), key present=true`
  - `free score spine`: `7/7 sports returned games (99m ago)`
  - `pricing ladder`: `FOUNDING -> PROVEN; blockers: Calibration not published`
  - `closing-line value`: `graded=2545; counts and rate gated by the CLV policy (GATE_OFF_PERFORMANCE_STATS) - read them from the database, never from this public surface`
  - `money path`: `stripe secret + webhook + 6/6 price slots`
  - `GET /api/picks`: `HTTP 503 feature gate (deliberate: public picks off; see the gates row)`
  - `GET /api/proof/ledger`: `HTTP 200`
  - `GET /api/proof/openapi.json`: `HTTP 200`
  - `cron config`: `40 schedules in apps/web/vercel.json; root mirror identical`
- **WARN (`7`):**
  - `scheduler liveness`: `not reported`
  - `calibration eligibility`: `RED: n=470 brier=0.181 (floor 0.22) ece=0.0575 (floor 0.05) streak 0/3` (Brier clears `<0.22` floor, ECE `0.0575` vs `0.05` floor keeps record/calibration gates fail-closed)
  - `market coverage`: `americanfootball_ncaaf:MONEYLINE (56 games, 0 picks) | americanfootball_nfl:MONEYLINE (13 games, 0 picks) | americanfootball_nfl:SPREAD (13 games, 0 picks) | americanfootball_nfl:TOTAL (13 games, 0 picks) | basketball_ncaab:MONEYLINE (11 games, 0 picks) | icehockey_nhl:MONEYLINE (21 games, 0 picks)` (expected while `WEEK10_HELD_FOR_CORPUS_COMPLETION` holds Week 10 slate generation)
  - `confidence tail`: `overconfident at >=80: n=268 win=52.2% claimed=86.4%` (confirms why `PERFORMANCE_STATS` remains closed pending corpus wiring + calibration)
  - `founder P0 queue`: `stats-public-on: STATS_PUBLIC is ON - confirm rights memo + feed SLA before promoting StatKing.`
  - `operator tasks`: `9 open, 1 done, 1 repo-verified; 1 repo-verifiable item(s) UNVERIFIED` (`SANDBOX-NET` in `.claude/settings.json`; manual items include `NEON-RO`, `CONN-PRUNE`, `PRE-COMMIT-BRAND`, `HENRYGD-REG`, `PUSH-PROTECT`, `BRANCH-PROTECT`, `NEXT-MAJOR`)
  - `nflverse currency`: `1 dataset(s) not yet at the current season (expected before week 1; re-check after kickoff)`
- **FAIL (`0`):** None after fixing the two client probe defects in `scripts/check-launch-readiness.mjs`.

---

## 3. Ordered Founder Daytime Go-Live Sequence

Do **not** promote public surfaces until every prerequisite below clears in order:

1. **Stage 1 -- Complete Pending Corpus Ingestion & Router Wiring (`MIND-FIRST` + `WIRE-FIRST SEQUENCING`):**
   - **Completed as of Wave 15 (`AUTON-CORPUS-15`):** `4-7` Tier-A (`129/129`, `100%`), `4-7` Tier-B (`814/814`, `100%`), `0-3` Tier-A (`hermes`, `0` `PENDING` remaining), `5/5` Vision OCR Tier-B PDF rescues (`88/1,000` monthly pages, `$0.00`), `110` Wave 15 `4-7` Tier-C Sovereign extractions (`1,009` worktree JSONs, `failures=0`), and **`9,944` Motif X/IG sports sweep records** (`2,720` IG + `5,609` X For You + `1,615` X Analytics across `86/86` intel files, BigQuery `36,877` verified SQL rows across `6` tables at `$0.00`).
   - **Remaining active queues:** drain `0-3` Tier-B (`830` `PENDING` via `hermes` on free Aliyun lane), `4-7` Tier-C (`Wave 16` launching via `antigravity` on `--lane free`), `0-3` Tier-C (`3,325` `PENDING`), and the final 4-VM GCP Shard B sweep (`8,041/8,598` = `93.52%` mirrored at `09:00` CST; execute `GCP-LEV-06` zero-idle teardown once `8,598/8,598` completes).
   - Activate wired corpus immediately into internal engine layers (`AUTON-ENGINE-WIRE-16`: 288-bit equation matrix, `@sports/prediction-engine` Stage-2 EB priors + OOF book-path calibration, `site-wide-workflow-fabric.ts` `internalWorkflowCorpusReady: true`, and `gse_coach_mind_simulator.py --with-corpus-priors`) while keeping all public/publish/calibration flags fail-closed and letting Windows trainer ingest `brain/feeds/*` into `brain/mind.jsonl`.
   - Note: `generate-signal-slate.ts` must remain untouched per `WIRE-FIRST SEQUENCING` and `MIND-FIRST` baseline doctrine.
2. **Stage 2 -- Code, Guardrail & Ledger Verification Before Merging `feat/autonomous-workflows-and-corpus-wiring-2026-11-13`:**
   - Run `C-375` `apps/web` test suite + `npm run guardrails` + `node scripts/guardrails/trust-gate.mjs` + `node apps/mobile/scripts/lint-rules.js` + `python scripts/guardrails/connected-workflow-dossier-guard.py` + `npm run check:ledger` + `npx.cmd tsx scripts/check-nflverse-currency.ts`.
   - Run `npm run verify:ledger` (`scripts/verify-ledger.ts` using read-only `hermes_ro`) so `apps/web/lib/ledger/verified-ledger.json` reflects latest Neon truth.
   - Merge feature branch to `origin/main` cleanly and verify Vercel Production deployment reaches `READY`.
3. **Stage 3 -- Live Production Pre-Flip Sign-Off:**
   - Confirm `/api/ops/public-surface-truth` latency (`21` sequential DB awaits currently warm-runs under `95s` but cold-exceeded `20s`) and confirm founder P0 action (`stats-public-on: confirm rights memo + feed SLA before promoting StatKing`).
   - Verify `node scripts/check-launch-readiness.mjs` stays `0 FAIL` and run `node scripts/check-deploy-readiness.mjs` against production env (DB, Odds API, Stripe slots, webhook, crons).
4. **Stage 4 -- Explicit Founder Flag Flip (Only After Stages 1-3 Pass):**
   - `FORCE_NO_BET_IF_STALE=true` is already verified `PASS` in Vercel Production (`scripts/ops/owner-runbook.mjs` requirement).
   - Founder explicitly decides whether to flip `PUBLIC_PICKS_ENABLED=true` / `LIVE_BOARD` on Vercel Production once corpus + 5-stage Week 10 Connected Workflow Dossier + Conjunction Gate clear (clearing `market coverage` WARNs cleanly).
   - Keep `PERFORMANCE_STATS_ENABLED` and `PUBLISH_LEDGER` **closed (`false`)** while `calibration eligibility` is `RED` (`ece=0.0575 > 0.05`, `streak 0/3`) and `confidence tail` warns at `>=80`, per `scripts/ops/launch-preflight.mjs` and `scripts/check-launch-readiness.mjs`.


## AUTON-ENGINE-WIRE-16 Execution & Live Readiness Update (2026-11-14)

- **Seam 1 (`@sports/mcp-equations-server`):** Verified fast prefiltered situational matchers (`7 passed`), compiled `9,092` equations into `data/engine/thousand_equation_matrix_2026.json` (`CITABLE_VERIFIED: 3210`, `COMPUTED: 3868`, `INFERENCE: 2014`, `Load-Bearing Active: 7078`) with all `12` Motif `KILL`/`WITHDRAWN` rows excluded, only `36` strict-prefix `ADOPT` sweep rows promoted load-bearing (`0.04`), all non-`ADOPT` sweep verdicts (`TEST`, `NEW`, `DIFFERENT ANGLE`, `LEARN-ONLY`, `CONTEXT-ONLY`, `WATCH`, `SKIPPED`) quarantined at zero-weight `INFERENCE`, and `O(topK)` stratified per-bit router selection.
- **Seam 2 (`@sports/prediction-engine`):** Wired Wave 15 EB six-family priors, SPD `CORPUS_REGULARIZED_SIX_FAMILY_CORRELATION_MATRIX`, and strictly monotonic `NaN`-safe `applyCorpusRegularizedBookPathCalibration` (`"signal"` path kept verbatim untouched, `liveCalibrationFlagEnabled: false`, zero `node:fs`/`node:path` in browser-pure `foundry-corpus-situational-priors.ts` and `calibration-map.ts`, while server-side root barrel exports remain unused by client/Edge routes); passed `typecheck` and `5` Vitest files.
- **Seam 3 (Workflow Fabric & PBP Trajectory Simulator):** Wired `internalWorkflowCorpusReady` + fail-closed `publicBoardPublishAllowed: false` in `site-wide-workflow-fabric.ts` (`4/4` tests), `ACTIVE_INCREMENTAL_OOF_CALIBRATION` (`public_publish_allowed: False`, `live_calibration_flag_enabled: False`) in `gse_autonomous_platform_fabric.py`, and optional `--with-corpus-priors` / `corpus_conditioner` in `scripts/ops/gse_coach_mind_simulator.py` preserving bit-identical baseline when `None` (`8/8` pytest cases).
- **Live Readiness (`node scripts/check-launch-readiness.mjs`):** `0 FAIL, 7 WARN, 15 PASS` on `https://www.galaxysportsedge.com` (`health=healthy`, `settlement=healthy`, `0 overdue of 4492 commenced`, `settled=4003 pending=81`, `publicPicks=false`, `performanceStats=false`, `calibrationPublished=false`).
- **GCP Billing & Teardown Guard (`gcp_fleet_billing_and_teardown_guard.py`):** `decision=KEEP_RUNNING_ACTIVE_SHARD_B_SWEEP`, `teardown_authorized=false` (`progress=8581/8598`, `completion_ratio=0.998`).
- **OpenRouter Paid Spend Delta:** `usage_daily=10.045309505` (`$0.00` delta).
- **Action Required From Operator:**
  - `Jev unavailable (auth_failed)`: run `/jev-setup` or `/wizard` to restore `~typesafe/jev-latest` authentication before running Stage-3 snap-by-snap JEV simulations.
  - Keep `LIVE_BOARD`, `PUBLISH_LEDGER`, `PUBLIC_PICKS`, `PERFORMANCE_STATS`, and `CALIBRATION_ADJUSTMENTS_ENABLED` fail-closed (`false`) until remaining corpus queue completion and `C-393` / SLA checks clear.
