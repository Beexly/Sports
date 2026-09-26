# `workers/` is not deployed. Read this before you believe anything else about it.

> **Status: NOT DEPLOYED. NOT A QUEUE. NOT THE PRODUCTION SCHEDULER.**
>
> This directory is a standalone-worker topology that the platform does not run.
> Nothing in production imports it, nothing schedules it, and as of this writing
> three of its four entry points do not even start (see *Do they run?* below).

Every wrong belief this repo has produced about its own architecture started here:
a `workers/` directory that looks like a running subsystem. That belief reached the
operator-facing Jarvis assistant, which answered `"Workers: BullMQ + Redis queue."`
to the owner's face. This file exists so the next reader, human or agent, stops at
the facts instead of inferring them from the directory listing.

---

## What actually schedules production work

**21 Vercel cron jobs**, declared in `apps/web/vercel.json`, each hitting an
`/api/cron/*` route handler in `apps/web/app/api/cron/`.
`.github/workflows/external-cron.yml` is a higher-cadence backstop, and that file
records **Vercel-only** as the production scheduler source of truth until
private-repo Actions minutes are restored.

That is the whole production scheduling story. There is no second scheduler.

## There is no queue

`bullmq` is not installed. It appears **0 times in `package-lock.json`** and is a
dependency of no `package.json` in the repo:

```
$ grep -ci "bullmq" package-lock.json
0
```

Every "BullMQ" string left in the repo is a comment, a design doc, or an
aspiration in the optional `docker/oracle-vps/` self-host stack. None of it is
running code.

**No application code reads `REDIS_URL`.** The only reader in the whole repo is
`scripts/check-deploy-readiness.mjs`, which uses it as a reachability probe. Redis
in `docker/docker-compose.yml` is a local dev service; do not read its presence as
evidence of a queue.

---

## The four workers

| Worker | What it does | Live invocation path? | Duplicated by a Vercel cron? | Tests |
|---|---|---|---|---|
| `data-refresh` | `setTimeout` loop, 30-min cycle. Calls `processSport()` / `settleSport()` from `@sports/ingestion-pipeline`, re-arming only after the previous cycle settles. | **None.** Only `npm run workers:refresh`, which fails on start. | **Yes.** `/api/cron/refresh-odds` (`*/15 * * * *`) and `/api/cron/settle-picks` (`20 * * * *`) call the same shared `@sports/ingestion-pipeline` functions. | None |
| `data-refresh/hydrate-cold-plane.ts` | Exports `hydrateColdPlaneFromDb()`: Prisma `PlayerGameStat` to `NflverseMemoryStore`. | **None.** Nothing imports the export. | **Yes.** `/api/cron/hydrate-cold-plane` (`30 9 * * *`) re-implements the identical 17-field row mapping inline rather than importing this function. | None |
| `pick-generation` | 18-line stub. Logs "pick generation is integrated into the data-refresh worker" and `process.exit(0)`. Contains no logic. | **None.** Only `npm run workers:picks`, which fails on start. | N/A, there is nothing to duplicate. | None |
| `content-publishing` | Exports `runContentPublisher()`: a hard kill switch. `INTERNAL_CALIBRATION_ONLY` defaults ON, every request is REFUSED, and even with the gate off it only QUEUEs. It can never publish. | **None** as a process. But see the coupling note below. | No. `INTERNAL_CALIBRATION_ONLY` is declared **only** here. | 5 tests, `src/__tests__/index.test.ts` |
| `airwave-listener` | Read-only dry-run report script. Imports schedule/intake/policy libraries from `apps/web/lib/airwave/` and prints a plan. No capture, no writes. | Dev-only: `npm run dry-run --workspace=workers/airwave-listener`. **This one does run.** | No, it is a report, not a job. | None |

### The one non-obvious coupling

`apps/web/__tests__/calibration-cockpit.test.ts` reads
`workers/content-publishing/src/index.ts` **as text** and asserts four things about
it (declares `INTERNAL_CALIBRATION_ONLY`, requires `CONTENT_WORKER_ENABLED`, never
writes `status: "PUBLISHED"`, never writes `publishedAt`). That is a live app test
that runs in CI. Deleting `workers/content-publishing/` breaks it.

It is a text read, not an import, so it does not violate the import boundary guard
(`apps/web/__tests__/workers-import-boundary.test.ts`), but it is real blast radius.

## Do they run?

Three of the four documented entry points fail immediately under Node 20, the
version CI pins:

```
$ PATH=/opt/node20/bin:$PATH npm run workers:picks
> ts-node --esm src/index.ts
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts"
```

`workers:content` and `workers:refresh` fail identically. All three `start` scripts
are `ts-node --esm src/index.ts`, and each worker's `tsconfig.json` compiles to
CommonJS or NodeNext, so the ESM loader has no handler for `.ts`.

The container path is broken too. `workers/data-refresh/Dockerfile` ends in
`CMD ["npx", "ts-node", "--esm", "src/index.ts"]`, the same failing command, and
its deps stage never copies `packages/stats-api/package.json` even though
`@sports/stats-api` is a declared dependency of `workers/data-refresh`.

Only `airwave-listener`'s dry-run works, because it uses
`ts-node --project tsconfig.json` rather than `--esm`.

## What references `workers/`

**Nothing imports it.** There are no `@sports/worker-*` imports and no relative
imports reaching into `workers/` anywhere in `apps/` or `packages/`. The dependency
edge is one-way: `airwave-listener` imports *out of* `workers/` into
`apps/web/lib/airwave/`, and nothing imports *in*. That boundary is now pinned by
`apps/web/__tests__/workers-import-boundary.test.ts`.

The remaining references are structural or textual:

| Reference | Kind |
|---|---|
| `package.json` `workspaces: ["workers/*"]` | Structural. Puts all four in `--workspaces` typecheck/test runs. |
| `package.json` `workers:refresh` / `workers:picks` / `workers:content` | Entry-point scripts. All three currently fail. |
| `docker/oracle-vps/compose.yml` | Builds all three Dockerfiles as services on the optional self-host box. **Not** the dev compose file. |
| `docker/docker-compose.yml` | Does **not** reference any worker. Postgres, Redis, and ncaa-api only. |
| `apps/web/__tests__/calibration-cockpit.test.ts` | Reads a worker source file as text. |
| `scripts/vercel-skip-build.mjs`, `scripts/ai/build-call-site-inventory.mjs`, `scripts/guardrails/affiliate-structural-separation.mjs` | Path-prefix rules that classify `workers/` paths. |
| `packages/ingestion-pipeline/src/settle-sport.ts`, `apps/web/app/api/cron/refresh-odds/route.ts`, `apps/web/app/api/cron/settle-picks/route.ts` | Comments only, pointing at the worker as the parallel implementation. |
| `docs/ops-runbook.md`, `docs/ops/HYDRATE_WRITE_THROUGH.md`, `docs/ai/airwave/*` | Docs. |

Note that `apps/web/lib/workers/orchestration-policy.ts` is a **different thing**.
It lives inside the Next.js app, not here, and its only consumer is its own test.

## What CI spends on it

`workers/*` is in the root `workspaces` array, and CI runs `npm run lint`,
`npm run typecheck`, and `npm test`, each of which is `--workspaces --if-present`.
So on every push to every open PR:

- **4 of 25 workspaces** are worker workspaces, and all four declare `typecheck`.
- **1** declares `test`: `content-publishing`, 5 tests in 1 file.
- **0** declare `lint`.

Measured in a sandbox container under Node 20 (`node v20.20.2`), wall clock per
`npm run typecheck --workspace=...`:

| Workspace | Time |
|---|---|
| `workers/data-refresh` | 174.4s |
| `workers/pick-generation` | 54.3s |
| `workers/airwave-listener` | 48.2s |
| `workers/content-publishing` | 36.6s |
| **Total** | **~313s** |

`data-refresh` dominates because it pulls the Prisma client types through
`@sports/db` plus `ingestion-pipeline`, `prediction-engine`, and `stats-api`. CI
hardware differs from this sandbox, so treat these as relative magnitudes, not a
CI budget. The `content-publishing` test run adds ~6.2s of vitest time.

---

## If you are about to change this

Three options, and only the owner should pick.

1. **Keep and document** (the current state). Zero risk. The cost is the CI time
   above and the standing risk that the next reader re-infers a running queue.
2. **Delete `workers/`.** Reclaims the CI time. Requires removing `"workers/*"`
   from `workspaces` and the three `workers:*` scripts in `package.json`, and
   rewriting the `describe("legacy publisher worker")` block in
   `apps/web/__tests__/calibration-cockpit.test.ts` to assert the kill switch
   somewhere that still exists. It also discards `airwave-listener`, which works
   and is referenced by three airwave design docs.
3. **Wire them up.** Much larger. The `start` scripts and the Dockerfile `CMD`s
   need fixing first, `data-refresh`'s Dockerfile needs the `stats-api` manifest,
   and someone must decide what the workers do that the 21 crons do not, because
   today the answer is "nothing except `hydrate-cold-plane`'s unused export."

Until that decision is made, this file is the truth. If you change what
`workers/` is, change this file in the same commit.
