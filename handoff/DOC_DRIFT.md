# DOC_DRIFT — verified documentation lies

Sweep: 2026-08-18. Scope: live `docs/ops/*.md` and `handoff/*.md` (not
`docs/ops/archive/**`). An entry is here only if a command I ran proved it.
Unverified hunches are omitted on purpose.

## Seed entries (handoff v4)

### D1. `scripts/ops/cron-matrix-from-vercel.mjs` used to be missing

- Claim: `docs/ops/CRON_MATRIX.md:12-13` prescribes
  `node scripts/ops/cron-matrix-from-vercel.mjs` and `--check`.
- Was: script did not exist (v4 seed).
- Now: **FIXED this session (H-B)**.
- Prove: `test -f scripts/ops/cron-matrix-from-vercel.mjs` → exists.
  `node scripts/ops/cron-matrix-from-vercel.mjs --check` → exit 0.

### D2. LEDGER guardrail baseline was 22/25

- Claim (stale): `handoff/LEDGER.md` baseline `guards=22/25` with
  `ai-council` + `dependency-audit` failing.
- Now: **FIXED**. Line 4 reads `guards=24/26`.
- Prove: `grep -n 'guards=' handoff/LEDGER.md` →
  `4:baseline: ... guards=24/26 ...`.

### D3. `CRON_MATRIX.md:7` names `vercel.json` without saying which copy

- Claim: Vercel schedules SoT is `` `vercel.json` → `crons` ``.
- Fact: two copies exist (`vercel.json` and `apps/web/vercel.json`).
  Vercel reads the app-directory copy. H-B generator defaults to
  `apps/web/vercel.json`.
- Prove: `ls vercel.json apps/web/vercel.json` → both exist.
  `cmp -s vercel.json apps/web/vercel.json` → IDENTICAL today.
- Status: **wording still ambiguous**. Copies currently agree; the pointer
  still does not say which file Vercel reads.

## Schedule truth vs the cadence table

Source of live schedules: `apps/web/vercel.json` `crons`.
Prove: `node -e` reading that file.

| Job | `docs/ops/CRON_MATRIX.md:31-36` | Live `apps/web/vercel.json` | Verdict |
|-----|----------------------------------|-----------------------------|---------|
| settle-picks | `20 * * * *` | `20 * * * *` | match |
| autonomy-cycle | `7,22,37,52 * * * *` | `7,22,37,52 * * * *` | match |
| calibration-metrics | `40 */6 * * *` | `40 */6 * * *` | match |
| health-alert | `*/15 * * * *` | `*/15 * * * *` | match |
| refresh-odds | `*/30 * * * *` | `*/15 * * * *` | **DRIFT** |
| free-spine-health | `10,40 * * * *` | `0 */2 * * *` | **DRIFT** |

`docs/ops/CRON_MATRIX.md:38` says "Vercel 30m + GH 2h" for the free-spine
SLA. Live Vercel is every 2 hours, not every 30 minutes.

GH backstop `5 */2 * * *` for free-spine **does** match
`.github/workflows/external-cron.yml:34`. Prove: `sed -n '31,34p'
.github/workflows/external-cron.yml`.

## orbit-unlock-smoke vs live (report only — do not touch)

`scripts/ops/orbit-unlock-smoke.mjs:65,68` asserts:

| Path | Smoke wants | Live |
|------|-------------|------|
| `/api/cron/settle-picks` | `0 */3 * * *` | `20 * * * *` |
| `/api/cron/free-spine-health` | `0 10 * * *` | `0 */2 * * *` |

Prove: `grep -n 'settle-picks\\|free-spine-health' scripts/ops/orbit-unlock-smoke.mjs`
and the vercel.json dump above. Founder call: do not change the smoke
expectations (handoff v4).

## Missing paths cited by live docs

Each row: `test -f <path>` (or `test -e` for directories) returned missing.

| path:line | Claimed path | Actually true |
|-----------|--------------|---------------|
| `docs/ops/PROVE_THE_EDGE.md:91` | `apps/lib/ingestion/player-stats.ts` | no such tree; ingestion lives under `packages/` |
| `docs/ops/GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md:153` | `docs/ops/CLOUD_CREDITS_MAXIMIZATION_STRATEGY_2026-07-08.md` | missing (maybe archived) |
| `docs/ops/PHASE_05B_REVEAL_PROTOCOL.md:4` | `docs/ops/ZK_PROOF_EVOLUTION_ROADMAP.md` | missing; a copy exists under `docs/ops/archive/dated/` |
| `handoff/CLAIMS_TRUTH_AUDIT.md:185` | `packages/prediction-engine/src/calibration/apply.ts` | missing; live file is `packages/prediction-engine/src/calibration-apply.ts` (name check: `ls packages/prediction-engine/src/calibration-apply.ts`) |
| `handoff/LAUNCH_BLOCKERS.md:77` | `apps/web/.env.example` | missing; repo SoT is root `.env.example` |
| `handoff/LAUNCH_BLOCKERS_ONLY.md:104` | `docs/ops/INCIDENT_RUNBOOK.md` | missing |
| `handoff/TEST_CENSUS.md:214` | `scripts/build-web.mjs` | missing; real path `apps/web/scripts/build-web.mjs` |
| `handoff/SESSION_HANDOFF_2026-08-18.md:91` | `.github/workflows/quality.yml` | missing **on purpose** (8-violation halt). Do not recreate. |
| `handoff/BATTLE_TEST_LOG.md:1964` | `packages/data-ingestion/src/process-sport.ts` and `settle-sport.ts` | missing; both live in `packages/ingestion-pipeline/src/` |
| `handoff/OPTIMIZER_CALIBRATION_AUDIT.md:25` | `apps/web/lib/fantasy/dfs-exact.ts` | missing |
| `handoff/REMEDIATION_EXECUTION.md:61` | `apps/web/lib/claude-api/remote-model-client.ts` | missing |
| `handoff/SESSION_HANDOFF_free-first.md:85` | `apps/web/lib/data-sources/resource-intelligence.ts` | missing |
| `handoff/SPRINT_QUEUE.md:1264` | `handoff/E2E_BLOCKED.md` | missing |
| `handoff/PHASE5_SUMMARY.md:65` | `handoff/SPRING_QUEUE.md` | missing (likely typo for `SPRINT_QUEUE.md`) |
| `docs/ops/EFFICIENCY_AUDIT_2026-08-13.md:71` | `scripts/guardrails/X.mjs` | placeholder, not a file |
| `handoff/LAUNCH_BLOCKERS.md:32` | `apps/web/app/checkout/` | missing directory (`test -e`) |

## Commands that are not npm scripts

Filtered out journal lines that were `npm run lint:` / `typecheck:`
(trailing colon, not a script name).

| path:line | Claim | Prove |
|-----------|-------|-------|
| `docs/ops/hermes/BUILD_QUEUE.md:814` | `npm run eval:routing-cost` | `node -e` reading `package.json` scripts → key absent. Also `test -f scripts/eval/routing-cost-report.mjs` → missing. |

## Env vars

`docs/ops/CRON_MATRIX.md:20-21` names `CRON_SECRET` and
`CRON_SECRET_PREVIOUS`. Both are referenced in
`apps/web/lib/cron/authorize.ts:71-72`. Prove:
`grep -n CRON_SECRET apps/web/lib/cron/authorize.ts`. **Not drift.**

No other live-doc env-var claim was checked. Unchecked ≠ confirmed.

## Sweep method

1. Listed `docs/ops/*.md` and `handoff/*.md` (225 files).
2. Extracted backtick paths, `node scripts/...`, and `npm run <name>`.
3. `test -f` / `test -e` / `package.json` script key lookup.
4. Dropped archive trees, line-number suffixes, and punctuation-false-positives.
5. Re-ran `test -f` / `cmp` / `grep` on every row in this file.

Archive docs under `docs/ops/archive/**` contain many more dead links. They
were not promoted into this map because the sweep was scoped to live
pointers the next agent will actually follow.
