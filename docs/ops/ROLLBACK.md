# Rollback & Incident Recovery Runbook

**Audience:** the operator, at 2am, with production misbehaving.
**Companion docs:** [`GO_LIVE_RUNBOOK.md`](GO_LIVE_RUNBOOK.md) is how it goes live.
This is what to do once it *is* live and something is wrong.
[`runbook.md`](runbook.md) has the 5-line version; this is the grounded one.

> **Every step below is anchored to a file in this repo.** Anything that could not
> be verified from code is marked **UNVERIFIED** and says so explicitly rather than
> guessing. A confidently wrong runbook is worse than none.

---

## 0. The 60-second decision

| Symptom | First lever | Why |
|---|---|---|
| Site down / every route 500s / obviously bad deploy | **§2 Instant Rollback** | Fastest, reuses a known-good artifact, does not touch the schema |
| One feature is wrong, rest is fine | **§4 Kill switch** — then redeploy | Narrower blast radius |
| Picks/odds are stale or wrong | **§4**, `FORCE_NO_BET_IF_STALE` / `PUBLIC_PICKS_ENABLED` | Withholds the surface, keeps the site up |
| Checkout is 500ing right after a Terms change | **§4**, `STRIPE_TERMS_CONSENT_ENABLED` → unset | Stripe rejects the session when the Dashboard ToS URL is missing |
| Bad data was written to the database | **§5 — read it first.** There is no verified restore path. | Do not assume a backup exists |
| Build is failing and nothing new ships | Production keeps serving the last good deploy. Not an outage. See [`MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`](MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md) | The migrate gate is fail-closed by design |

**The single most important fact on this page:** migrations run inside the Vercel
**production build** (`apps/web/vercel.json` → `buildCommand` →
`scripts/deploy/migrate-if-configured.mjs`). Rolling the *app* back does not roll
the *schema* back. That is safe here **only because every migration is additive** —
see §3.

---

## 1. First, establish what is actually live

Do this before changing anything. All three are public, unauthenticated, no secrets needed.

```bash
BASE=https://www.galaxysportsedge.com

# Which commit is serving? (VERCEL_GIT_COMMIT_SHA — lib/health/capability-state.ts:139)
curl -s "$BASE/api/health" | jq '.ok, .status, .deployment.sha'

# Scheduler alive? Settlement behind? Which gates are open?
curl -s "$BASE/api/ops/public-surface-truth" \
  | jq '.deployment.sha, .schedulerLiveness, .settlement.health, .gates, .host'

# Do the user-facing routes actually render?
node scripts/post-deploy-smoke.mjs --url="$BASE"
```

Reading it:

- `deployment.sha` is the ground truth for "did my rollback take". Compare it before
  and after. It is the only field that answers that question.
- `ok:false` / HTTP 503 on `/api/health` means the **database ping or ingestion
  freshness** failed — nothing else can produce it
  (`apps/web/app/api/health/route.ts:23`). A deploy that breaks page *rendering*
  leaves this at `ok:true`. See §6.
- `status:"degraded"` with `ok:true` means settlement is behind — real, but not a
  reason to roll back a deploy.
- `gates.canExposePublicPicks` etc. reflect the env as the **running deployment**
  sees it. This is how you confirm a flag flip actually took effect (§4).

> After PR #631 lands, `/api/health` redacts `capabilityGraph`, `schedulerLiveness`
> and all `reason`/`detail` strings from anonymous callers. Send
> `Authorization: Bearer $CRON_SECRET` for the operator payload
> (`detail:"operator"`). `ok`, `status`, `checks[].status`, `checks[].ageMinutes`
> and `deployment.sha` stay public either way — the commands above keep working.

---

## 2. Deploy rollback

### 2a. Instant Rollback / Promote — **the default**

Vercel Dashboard → the project → **Deployments** → pick the last known-good
production deployment → **Promote to Production** (or **Instant Rollback**).

**Why this one:** it re-points the alias at an already-built artifact. It does not
re-run `buildCommand`, therefore it does not run
`scripts/deploy/migrate-if-configured.mjs`, therefore **it cannot fail on the
migration gate and cannot change the schema.** The app goes back; the schema stays
forward. §3 is why that is safe.

Confirm: re-run the §1 commands. `deployment.sha` must now be the older commit.

### 2b. Redeploy an older commit — only if 2a is unavailable

This **rebuilds**, which re-runs the migrate gate against a database whose
`_prisma_migrations` ledger may contain migrations that are *not in that older
commit's* `packages/db/prisma/migrations/`.

- The repo's own Neon-HTTP parity checker treats that state as fine — see
  `classifyAppliedVsRepo` in `scripts/deploy/migrate-if-configured.mjs:105-117`:
  *"Missing repo folders in the table → pending. Extra applied rows are fine
  (history)."* But that checker only runs as a **fallback**, after four transient
  `DIRECT_URL` failures (`:239-250`).
- **UNVERIFIED:** what the *primary* path — `prisma migrate deploy` — does when the
  database ledger is ahead of the repo folder is not proven anywhere in this repo.
  The one recorded observation of ledger divergence
  ([`MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`](MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md),
  2026-07-10) had *both* directions at once and reported `pending`, which
  fail-closes the build.
- If it does fail-close, production **keeps serving the current deployment** — you
  have not made things worse, but you also have not rolled back. Go back to 2a.

**Do not reach for `MIGRATE_GATE_ALLOW_UNVERIFIED=true` to force it through.** That
break-glass (`migrate-if-configured.mjs:201-210`) *skips schema verification
entirely*. It exists for the ledger-reconciliation window only, for a deploy known
to carry no schema change. If you do set it, remove it the moment the deploy
finishes — leaving it set reopens the fail-open hole behind the 2026-07-10 outage.

### 2c. What rollback does **not** undo

| Already happened | Rolling back the app… |
|---|---|
| A migration applied | …does not revert it (§3) |
| Rows written by the newer code | …leaves them. Additive schema means the old code simply ignores new columns; but new *rows* in old tables stay. |
| A Stripe subscription created | …does not cancel it. Stripe is the system of record. |
| An email or web-push alert delivered | …cannot be recalled |
| A slate commitment opened via `SLATE_OPENING_REVEAL_ENABLED` | …cannot be un-disclosed. Information one-way door (`apps/web/app/api/verify/slate/opening/route.ts:65`). |

---

## 3. Migration reversibility

**Every migration in `packages/db/prisma/migrations/` is additive.** Verified
mechanically — `apps/web/__tests__/migration-additivity.test.ts` fails the build if
a future one is not.

Across all 53 migrations there is **zero** of the following: `DROP TABLE`,
`DROP COLUMN`, `DROP TYPE`, `RENAME`, `ALTER COLUMN ... SET NOT NULL`,
`ALTER COLUMN ... TYPE`, `TRUNCATE`, `DELETE FROM`, or `UPDATE ... SET`. The only
`DROP` statements present are `DROP CONSTRAINT IF EXISTS` immediately followed by
re-adding the same constraint — this repo's re-appliability idiom
(`20260722140000_add_ai_control_plane_ledger`), which removes nothing.

### Reversibility table

| Class | Migrations | Reversible? | Manual recovery |
|---|---|---|---|
| **New table + indexes** (the large majority — `loss_autopsies`, `gate_decisions`, `creator_assets`, `watchlists`, `push_subscriptions`, `checkout_attempts`, `ai_*`, `entity_graph`, …) | 40+ | **Yes, trivially** | `DROP TABLE IF EXISTS "<name>" CASCADE;` — plus `DELETE FROM "_prisma_migrations" WHERE migration_name = '<dir>';` or the gate reports it pending forever. **Destroys that table's data.** Not needed for an app rollback: an older client never queries a table it doesn't know. |
| **New nullable column** — `games.currentEdgeIndex`, `subscriptions.pastDueSince`, `picks.clv*` (9 cols), `pick_proof_receipts.slateKey`, `jarvis_memory_events.related_agent_run_id`, `formal_incident.review*`, all `ADD COLUMN IF NOT EXISTS` in `20260722120000` / `20260722150000` / `20260722183000` | ~12 | **Yes** | `ALTER TABLE "<t>" DROP COLUMN IF EXISTS "<c>";` + the ledger delete. Again **not needed** for rollback — Prisma emits an explicit column list, so an older client cannot see a column it wasn't generated against. |
| **New `NOT NULL` column *with* `DEFAULT`** — `ai_invocations.requestFingerprint/stealCount`, `ai_attempts.*`, `ai_financial_attributions.version/isCurrent` | 6 cols | **Yes** | Same as above. Safe on a populated table (Postgres 11+ does not rewrite), and an older client's `INSERT` still succeeds because the default fills it. |
| **New `CHECK` constraint on an existing table** — `ai_*`, `credit_grant_*`, `checkout_attempts` | ~20 | **Yes** | `ALTER TABLE "<t>" DROP CONSTRAINT IF EXISTS "<name>";` In every case the table is created in the *same* migration, so no pre-rollback app version writes to it. |
| **Seed `INSERT`** — `20260523031000_seed_claude_api_budgets`, `20260603130000_seed_pick_explanation_budget`, `20260603140000_seed_loss_autopsy_draft_budget` | 3 | **Yes** | `DELETE` the seeded rows by their known keys. Budget config rows only; no user data. |
| **Destructive** | **none** | — | — |
| **`ADD COLUMN NOT NULL` without a default** | **none** | — | — |

**No migration requires a documented manual inverse for a deploy rollback**, because
none of them removes or narrows anything an older app version depends on.

### Downtime / lock risk

A plain `CREATE INDEX` (not `CONCURRENTLY`) holds a `SHARE` lock: reads continue,
**writes to that table block** for the build. No migration here uses `CONCURRENTLY`
(`20260709000000_add_ladder_events` explains why: the table was new and empty).

Five migrations build a plain index on a **pre-existing** table — all already
applied in production, pinned by the guard test so a *new* one has to be added
deliberately:

| Migration | Table |
|---|---|
| `20260603120000_add_pick_clv` | `picks` |
| `20260622180000_add_slate_commitment` | `pick_proof_receipts` |
| `20260708000000_add_hot_path_indexes` | `odds`, `ingestion_runs`, `picks` |
| `20260723140000_add_formal_incident_review_outcome` | `formal_incident` |
| `20260807120000_jarvis_memory_scope_type_created_idx` | `jarvis_memory_events` |

`odds` is the one that matters: a 2026-08-19 census counted **1,368,288 rows**
(`docs/ops/hermes/l14-label-census/RESULTS.md`). A future plain index on `odds`
should be scheduled, or written `CONCURRENTLY` (which requires taking it out of the
transaction Prisma wraps migrations in — **UNVERIFIED** whether this repo's toolchain
supports that).

### PR #601 (`claude/f9-ledger-chain`) — owner sign-off

**Migration:** `20260820090000_add_ledger_chain_entries`.

> **Reversible: YES. Zero-downtime: YES. This migration is safe to apply.**

| Question | Answer | Evidence |
|---|---|---|
| Additive? | Yes — one brand-new table + 6 indexes, nothing else | The whole diff is `CREATE TABLE IF NOT EXISTS` + 6 `CREATE ... INDEX IF NOT EXISTS`. No `ALTER` of any existing table. |
| Locks anything? | **No.** Creating a new table takes no lock on any existing object; the 6 indexes are on that same empty table, so they build instantly. | Deliberately **no foreign key to `picks`** — *"the chain is evidence. Deleting a pick must not delete or block history."* An FK would have taken a lock on `picks`. |
| Re-appliable? | Yes, end to end. Uses `TEXT` + `CHECK` instead of a native enum precisely because Postgres has no `CREATE TYPE ... IF NOT EXISTS`. | Migration header |
| Safe if the table is absent? | Yes — the application **fails open**. `isLedgerTableMissingError` maps `P2021` to `skipped:"table_missing"`; a missing Prisma delegate maps to `skipped:"delegate_missing"`. | `packages/ingestion-pipeline/src/ledger-chain-store.ts` |
| Can it break picks or settlement? | No. Both call sites are inside `if (isLedgerChainEnabled())`, wrapped in `try/catch`, and log a warning on any skip. | `process-sport.ts` (post-receipt) and `settle-sport.ts` (post-CLV-grade) |
| Runtime default | **OFF.** `LEDGER_CHAIN_ENABLED` must be the literal string `"true"`; anything else returns `skipped:"flag_off"` before any I/O. | `ledger-chain-store.ts` `isLedgerChainEnabled()` |

**To reverse:** `DROP TABLE IF EXISTS "ledger_chain_entries";` plus
`DELETE FROM "_prisma_migrations" WHERE migration_name = '20260820090000_add_ledger_chain_entries';`
That is a clean, complete inverse. It destroys the chain's contents — but if the
flag was never turned on, the table is empty and there is nothing to lose.

**Flag rollback is clean too.** `seq` and `prevHash` are derived from the chain's
tail at append time, inside a transaction holding `pg_advisory_xact_lock(chainId)`
(`persistEntry` in `ledger-chain-store.ts`). Turning the flag off mid-life leaves
**no gap in `seq` and no broken `prevHash` link** — the picks made while it was off
simply have no chain entry. Turning it back on resumes from the existing tail. The
chain stays internally valid; only its *coverage* has a hole.

**The one thing to be aware of:** the entries are append-only by doctrine
(*"Application code never UPDATE/DELETE these rows"*) — so once the flag is on and
rows exist, "rolling back" means dropping evidence, which is a product decision, not
an ops one. Decide the flag before it accumulates history, not after.

---

## 4. Kill switches — what each one *actually* does when flipped OFF

> **A flag flip is not instant.** This repo's own procedure is *"Flip one,
> redeploy/restart, watch, then the next"* (`GO_LIVE_RUNBOOK.md`, Phase 4). Treat a
> Vercel env change as requiring a **redeploy** to take effect. Confirm it landed
> with `curl .../api/ops/public-surface-truth | jq '.gates, .host'` — never assume.
> **Because of that, §2a Instant Rollback is the faster containment lever for a bad
> deploy.** Flags are for turning off a *feature*, not for stopping a *deploy*.
>
> All of these are exact-string flags: only the literal `"true"` enables. Unsetting
> is equivalent to `false`.

| Flag | Flipping OFF is a clean off-switch? | Evidence |
|---|---|---|
| `PUBLIC_PICKS_ENABLED` | **Yes — but narrower than it sounds.** 503s `/api/picks`, `/api/picks/daily-slate`, `/api/picks/[id]/audit`, `/api/picks/[id]/explain`; zeroes pick counts in `/api/brief`; `slate-twin` serves a *labelled* demo slate. **It does NOT close `/api/board/state` or `/board`** — that route has no gate check at all. No durable writes either way. | `platform-config.ts:166` → `readiness.ts:134`; `api/board/state/route.ts` (no gate) |
| `FORCE_NO_BET_IF_STALE` | **Yes.** Pure read-boundary check. ON + stale ingestion → distinct 503 body; OFF → no freshness check at all, identical to before. Fails **open** on a DB error so a blip can't black out a fresh surface. Zero writes. | `platform-config.ts` (`forceNoBetIfStale`), `api/picks/route.ts:57-62` |
| `PERFORMANCE_STATS_ENABLED` | **Yes.** `/api/performance` 503s. Read-side only. | `platform-config.ts`, `readiness.ts:137` |
| `LEDGER_CHAIN_ENABLED` (PR #601) | **Yes.** Returns `skipped:"flag_off"` before touching the DB. No gap in the chain. See §3. | `ledger-chain-store.ts` |
| `LINE_ARCHIVE_ENABLED` | **Yes.** Append-only snapshot writes simply stop. Existing rows are inert history. | `packages/ingestion-pipeline/src/line-archive.ts:163` |
| `SEALED_ENGINE_ENABLED` | **Yes.** `/sealed` renders the honest gated state. | `apps/web/lib/sealed/sealed-slate-view.ts:115` |
| `JARVIS_MEMORY_WRITE_ENABLED` | **Yes.** Write path no-ops. | `apps/web/lib/jarvis/memory/write-gate.ts:46` |
| `SLATE_OPENING_REVEAL_ENABLED` | **Yes for state, NO for information.** Endpoint returns to 404, no durable write either way — but anything already disclosed stays disclosed. | `api/verify/slate/opening/route.ts:65` |
| `STRIPE_TERMS_CONSENT_ENABLED` | **Yes, with one bounded side effect.** New Checkout Sessions omit `consent_collection` and behave exactly as before (`lib/stripe.ts:326`). *But* the flag is folded into `currentCommercialTermsVersion()`, which is part of the checkout request fingerprint — so an **in-flight attempt** created under the old value gets a different fingerprint on retry and is answered **409**, not a silent key reuse. Self-clearing within `CHECKOUT_ATTEMPT_TTL_MS` (24h). Expect a small burst of 409s; that is the guard working. | `lib/billing/checkout-attempt.ts:203, 263, 47` |
| `LIVE_BOARD` | ⚠️ **It does not do what `runbook.md` says.** `docs/ops/runbook.md` names `LIVE_BOARD=off` as the containment step. `LIVE_BOARD` is read in exactly three places, and **none of them gates the public board**: two feed observability payloads, the third sets `draftOnly` in the free-settlement runner. Flipping it will not take the board down. Use `PUBLIC_PICKS_ENABLED` (and note its limits, above). | `api/ops/public-surface-truth/route.ts:494`; `api/cron/health-alert/route.ts:160`; `lib/data-sources/free-settlement-runner.ts:628,632` |
| `WATCHLIST_ALERTS_ENABLED` | ❌ **NOT a clean off-switch on `main` today.** See below. | |
| `CANONICAL_HISTORY_ENABLED` | ⚠️ **One-way stamp.** `isBootstrap: !gates.canPersistCanonicalHistory` is written onto each pick at creation. Flipping OFF stops *new* canonical stamps; it does **not** un-canonicalise rows already written, and no tool in this repo backfills them. | `packages/ingestion-pipeline/src/generate-signal-slate.ts:302` |
| `OUTCOME_LEARNING_ENABLED` | ⚠️ **One-way stamp**, same shape — `eligibleForLearning` + `learningEligibleAt` are frozen onto the settlement snapshot. | `packages/ingestion-pipeline/src/settlement-snapshots.ts:87` |
| `FEATURED_PICK_PROMOTION_ENABLED` | ⚠️ **One-way stamp.** New picks stop being featured; already-featured picks stay featured. | `readiness.ts:135` |

The three ⚠️ stamps are **provenance, not corruption** — nothing is destroyed and
nothing breaks. But they are not reversible by flipping the flag back, so treat
opening them as a decision, not an experiment. If you open one prematurely, the
recovery is a targeted `UPDATE` on the affected rows, which this repo does not
provide and which nothing here has verified.

**Order matters when closing gates.** `scripts/check-deploy-readiness.mjs:390-416`
enforces a dependency chain and will fail red on an inconsistent combination. Close
in **reverse** dependency order:

```
CALIBRATION_ADJUSTMENTS_ENABLED
  → OUTCOME_LEARNING_ENABLED
    → PERFORMANCE_STATS_ENABLED / PUBLIC_BLOG_ENABLED
      → PUBLIC_PICKS_ENABLED
        → DERIVED_MODEL_HISTORY_ENABLED
          → CANONICAL_HISTORY_ENABLED
```

Run `npm run deploy:ready` after any gate change. Closing a *parent* while a child
is still open is exactly what that script refuses.

### ❌ `WATCHLIST_ALERTS_ENABLED` corrupts durable state when flipped off

**Status on `main` (`bb0e7dfc0`): the defect is present. The fix is on
`claude/fix-alert-suppression` (PR #632) and is NOT merged.**

With the flag off, the settlement-outbox expansion writes **terminal `SUPPRESSED`
rows** with `lastErrorCode:"alerts_disabled"` and moves the parent event to
`EXPANDED` (`apps/web/lib/settlement-outbox/worker.ts:892-950`). `SUPPRESSED` is in
`TERMINAL_DELIVERY_STATUSES` (`:98-104`), so those deliveries are never re-claimed;
`idempotencyKey` is unique, so `createMany(skipDuplicates)` will not recreate them;
and the event is no longer `PENDING`, so it is never re-expanded.

**Turning the flag back on does not backfill anything.** Every Elite subscriber owed
an alert during the off-window gets nothing, permanently, and the queue-health check
counts only dead letters, retryables and old pendings — so it reports green
throughout.

**Operator guidance until #632 lands:** treat `WATCHLIST_ALERTS_ENABLED` as
**one-way**. Do not use it as an incident kill switch. If alerts must be stopped,
prefer unsetting the *channel* credentials instead: the worker classes
channel-unconfigured as `RETRYABLE_FAILED` — *"an infra condition, never a policy
terminal"* (`worker.ts:15-17`) — so those deliveries stay re-claimable and resume
when the credentials come back, instead of being terminally suppressed.

*(#632 changes the switch to a deferral: expansion is skipped, the event stays
`PENDING`, nothing is written, and enabling the flag within
`OUTBOX_MAX_PAYLOAD_AGE_HOURS` = 24h really does deliver the backlog. Nothing in
this document duplicates that fix.)*

---

## 5. Data recovery — read this before you need it

**There is no backup or restore procedure in this repository, and no evidence that
any scheduled backup runs.** Stated plainly because assuming otherwise is the
expensive mistake:

- No workflow in `.github/workflows/` performs a backup. `neon_workflow.yml` creates
  **ephemeral per-PR Neon branches with a 14-day expiry** — that is preview
  infrastructure, not disaster recovery.
- `docs/ops-runbook.md:118-121` shows a one-off `pg_dump` command. It is not
  scheduled, not automated, has no retention policy, and sits inside a block the
  same document marks as describing a topology that **"is NOT how the platform
  currently runs in production"**.
- Neon branching appears in the docs only for backtests and research
  (`CLOUD_CREDITS_MAXIMIZATION_STRATEGY_2026-07-08.md:302-305`,
  `docs/ops/hermes/*/RESULTS.md`). **Neon point-in-time restore is referenced
  nowhere.**

**UNVERIFIED, and it is the single largest gap on this page:** whether the Neon
project has PITR enabled and what its retention window is. That is a console
setting this repo cannot see. **Owner action — confirm it in the Neon console
before launch and record the retention window here.** Without it, "restore the
database" is not a recovery option that exists.

What *does* exist, and is genuinely useful:

- **The schema is additive-only** (§3), so no migration has ever destroyed data.
- **Append-only ledgers.** `PickProofReceipt` is written `update: {}` — *"immutable —
  a frozen receipt is never rewritten"* (`process-sport.ts`). `OddsLineSnapshot`,
  `SignalLedger` and (#601) `LedgerChainEntry` are append-only by doctrine. Where
  these cover a surface, the history survives an app-level bug.
- **Stripe is the system of record for billing.** Entitlements are reconciled from
  it by the `reconcile-entitlements` cron (`0 8 * * *`), so local entitlement
  corruption is self-healing within a day, or immediately by re-running that cron.
- **`npm run export:settled-picks`** produces a read-only JSONL export of settled
  picks — the closest thing to a manual snapshot of the product's core asset.

---

## 6. Confirming recovery — and the gap you should know about

After any rollback or flag change:

```bash
BASE=https://www.galaxysportsedge.com
curl -s "$BASE/api/health" | jq '.ok, .status, .deployment.sha'   # sha changed?
node scripts/post-deploy-smoke.mjs --url="$BASE"                  # 19 routes render
APP_URL="$BASE" node scripts/prod-probe.mjs                       # route + JSON shapes
curl -s "$BASE/api/ops/public-surface-truth" | jq '.gates, .settlement.health'
```

Do **not** treat `/api/health` returning 200 as proof the site works.

### The specific detection gap

`/api/health` computes `ok` from exactly two probes — a DB ping and ingestion
freshness (`live-capability-probes.ts`, surfaced at `route.ts:23`). It never
fetches a page. So:

| Failure | Detected by | Worst-case time to detect |
|---|---|---|
| Total outage (nothing responds) | `external-watchdog.yml` — polls `/api/ops/public-surface-truth` every 30 min from *outside* Vercel, fails the job on non-200 | ~30 min |
| DB down / ingestion stale > 240 min (`REFRESH_STALE_AFTER_MINUTES`) | `/api/health` 503 + `health-alert` cron (every 15 min) | ~15 min |
| Scheduler dead | `scheduler-liveness.ts` + the external watchdog | ~30 min |
| **A deploy that 500s `/board`, `/pricing` or `/picks` while the DB and crons stay healthy** | **`daily-smoke.yml` only — and it runs once a day at 13:30 UTC** | **up to ~24 hours** |

**That last row is the gap.** Nothing runs a route-level smoke test on deploy, and
nothing runs one between the daily job. `scripts/post-deploy-smoke.mjs` and
`scripts/prod-probe.mjs` both exist and both do exactly the right checks — they are
just never invoked automatically after a production deploy. **Until that is wired
up, running `node scripts/post-deploy-smoke.mjs` by hand after every production
merge is the operator's job.** With ~38 PRs merging at once, that matters more than
usual.

**Second gap — the pager may be mute.** `/api/cron/health-alert` only delivers if
`HEALTH_ALERT_WEBHOOK_URL` is set; otherwise it returns `configured:false` and pages
nobody (`api/cron/health-alert/route.ts:40-46` — the code is explicit that this is a
distinct state: *"A monitor that cannot page anyone, and does not say so, is worse
than no monitor"*). **UNVERIFIED** whether that variable is set in
production; it is a Vercel console value. **Owner action: confirm it, and confirm
GitHub Actions notifications are on for `external-watchdog.yml` and
`daily-smoke.yml`** — those two workflows are the only alarms that live outside the
platform they are watching.

*(PR #618 fixes a related hole: the ingestion probe currently accepts a
`SUCCESS` run with `oddsInserted: 0`, so a total paid-odds outage can read as
healthy. PR #631 tightens `/api/health` disclosure. PR #634 adds cron
route-existence and auth-coverage guards. All three are open drafts, none merged;
none of them closes the route-level detection gap above.)*

---

## 7. After the incident

1. Note what happened in `docs/ops/` within 48h — what, impact, prevention
   (`runbook.md`'s existing rule).
2. If a kill switch behaved differently than this table says, **fix this table**.
3. If you had to invent a step that isn't here, add it — with the file:line that
   makes it true.
