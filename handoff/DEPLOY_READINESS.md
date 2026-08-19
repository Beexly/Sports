# Deploy-Readiness Assessment

**Branch:** `claude/fable-5-ultracode-plan-ptru4e` (186 commits ahead of `origin/main`; zero commits behind — a strict, non-divergent superset).
**Date:** 2026-08-15
**Source of truth:** grounded in `vercel.json`, `scripts/check-deploy-readiness.mjs`, `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/`, `.env.example`, `CLAUDE.md`, and `docs/ops/` deploy docs. No claims are inferred from the nightly journal; every citation below was verified by `git show`, `git diff --name-only`, or a direct read of the file on disk.

---

## 1. How a change actually reaches production

**Model:** merge-to-main → Vercel automated deploy → alias promotion.

- `vercel.json` (line 3) drives the build via the `buildCommand`: `cd ../.. && npm run db:generate && node scripts/deploy/migrate-if-configured.mjs && NODE_OPTIONS=--max-old-space-size=8192 npm run build --workspace=@sports/web`. Vercel auto-deploys every push to `main` (and to the branch alias for PRs).
- `docs/ops/DEPLOY_LAG.md` states the invariant plainly: **code on `main` is not live until Vercel serves that SHA.** The live deployment is confirmed by reading `deployment.sha` from `/api/ops/public-surface-truth` (which `DEPLOY_LAG.md` line 14 and `CLAUDE_OWNER_LAUNCH_HANDOFF.md` line 34 both cite as the source of truth).
- `docs/ops/CLAUDE_OWNER_LAUNCH_HANDOFF.md` §START (lines 29-34) shows the owner sequence: `git fetch origin main && git checkout main` → run preflight → **confirm Vercel Production READY on main HEAD**. There is no separate "promote/alias" button documented for application code — Vercel's default production deployment on `main` is the path. (The alias-based note in P9-01's own text refers to the R&D-branch context in Phase 6, not this branch.)
- **Conclusion:** a change reaches production by merging to `main` and waiting for Vercel's production deployment to reflect `main`'s SHA. The `check-deploy-readiness.mjs` gate runs at build time and blocks the build on missing critical env vars.

---

## 2. DB migrations — does this branch require one to be applied first?

**Yes — one migration ships in this branch and must be applied before production deploy.**

### The migration

Commit `9cfb91b1` (Aug 13 2026): `feat(db): entity graph — two additive Prisma models (ADR 005, migration NOT applied)`.

- **Schema change:** adds two models to `packages/db/prisma/schema.prisma` (lines 3814-3904): `EntityType` enum, `Entity`, and `EntityEdge`.
- **Migration file on disk:** `packages/db/prisma/migrations/20260813200000_add_entity_graph/migration.sql` (read in full — 87 lines, purely additive: 1 CREATE TYPE, 2 CREATE TABLE, 8 CREATE INDEX, 2 ADD CONSTRAINT FK; zero ALTER/DROP/backfill).
- **ADR:** `docs/adr/005-entity-graph-minimal-schema.md` (referenced in the commit and in the sprint queue's Phase 2 scope guard).

### Verification: migration is NOT yet applied in production

The commit message explicitly says "migration NOT applied" and the scope-guard in SPRINT_QUEUE.md (Phase 2, line 508-510) confirms:
> Applying the Entity Graph Prisma migration (`20260813200000_add_entity_graph`) — additive-only and already reviewed, but a DB migration requires explicit owner approval before `db:migrate deploy`.

### The build-time gate

`scripts/deploy/migrate-if-configured.mjs` (read in full) is Vercel's `buildCommand` step that runs `prisma migrate deploy`. Its policy:
- `VERCEL_ENV=production` → runs `prisma migrate deploy` (line 236-238). Missing DB env fails the build loudly (lines 5, 16-18).
- `VERCEL_ENV=preview|dev` → skips migration (line 231-233) — previews must not mutate the production DB.
- Fails closed on transient DB errors after retries: only proceeds if the pooled endpoint confirms zero pending migrations (lines 186-209). This was added specifically to prevent the #70 outage class ("shipping a client referencing columns whose migration was never applied").
- A break-glass override `MIGRATE_GATE_ALLOW_UNVERIFIED=true` exists but is explicitly documented as a deliberate, logged, temporary decision for deploys known to carry no schema change (lines 148-157) — it must be removed after use.

### The blocker: owner-only approval

The sprint queue's Phase 2 scope guard states explicitly: **a DB migration requires explicit owner approval before `db:migrate deploy`.** This is owner-gated. A merge to `main` will trigger the Vercel build, which will run `prisma migrate deploy` in production context. If the migration has already been applied to the production Neon database (the owner must have done this), the build proceeds. If not, `migrate deploy` will try to apply it.

**Risk:** This branch was developed against `origin/main` (which does NOT contain the entity-graph migration — confirmed: `git diff --name-only origin/main..HEAD` shows `packages/db/prisma/migrations/20260813200000_add_entity_graph/migration.sql` is new to this branch). Merging this branch to `main` without first applying the migration to production Neon means either (a) the `migrate-if-configured.mjs` gate fails the production build, or (b) the owner sets `MIGRATE_GATE_ALLOW_UNVERIFIED=true` to skip the migration — which lands code referencing `entities`/`entity_edges` tables ahead of the schema, exactly the #70 outage class.

**Bottom line:** the entity-graph migration must be applied to production (or the owner must explicitly sign off on `MIGRATE_GATE_ALLOW_UNVERIFIED=true` for this deploy) before or as part of the merge. Nothing in this branch auto-applies it.

---

## 3. Env-var contract changes

`.env.example` was read in full (510 lines). A diff against `origin/main`:

```
$ git diff --name-only origin/main..HEAD -- '.env*'
(empty)
```

**No `.env.example` changes in this branch.** All new env-var usage was added against existing keys already documented in `.env.example`. Verified cases:

- `STRIPE_SECRET_KEY` guarding (`b606d4a8`, `stripe.ts`): the code still reads `STRIPE_SECRET_KEY` — already in `.env.example` line 89. No new var.
- `STRIPE_PRO_PRICE_ID` / `STRIPE_ELITE_PRICE_ID` (legacy fallbacks): referenced in `price-ids.ts:133-134` and `stripe.ts:118-122` as fallback aliases. Already documented on `.env.example` line 93-96 as the new `STRIPE_PRO_MONTHLY_PRICE_ID` form; the legacy names are explicitly commented as fallbacks.
- `DURABLE_WRITE_CAPABILITIES` addition of `"stripe-portal"` (`packages/db/src/durable-write-guard.ts`): reads no new env var — the `stripe-portal` capability string is hard-coded, not env-driven.
- New routes (`/api/subscriptions/portal`, `/api/cron/prune-rate-limits`, `/api/gse/v1/truth/*`): no new required env vars — they use existing keys (`REDIS_URL`, `CRON_SECRET`, `STRIPE_SECRET_KEY`).

**`check-deploy-readiness.mjs` (line 92-110)** enforces 17 required production env vars. All of them are already present in `.env.example`. The required list per the script:

`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `THE_ODDS_API_KEY`, `ANTHROPIC_API_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`, `STRIPE_ELITE_MONTHLY_PRICE_ID`, `STRIPE_ELITE_ANNUAL_PRICE_ID`, `NEXT_PUBLIC_APP_URL`.

None of these are newly introduced by this branch.

---

## 4. Schema drift / client mismatch

- `git diff --name-only origin/main..HEAD` for Prisma schema: only `packages/db/prisma/schema.prisma` (the entity-graph addition). The commit (`9cfb91b1`) explicitly states: **"Verified without a live database: `prisma validate` passes, and the hand-written migration was diffed against `prisma migrate diff --from-empty` canonical output — columns, defaults, index names and FK semantics are identical, so there is no schema/migration drift."**
- No code on this branch reads from `Entity` or `EntityEdge` models (grep for `prisma.entity` / `EntityEdge` in `apps/web/lib` and `packages/`: zero code hits). The models are declared but have no consumers yet — the commit says "Nothing reads these tables yet; the primitive lands before any consumer."

---

## 5. If the owner merged and deployed this branch today, what breaks?

### BLOCKING (must be resolved before merge):

1. **Entity-graph migration is unapplied.** Merging triggers `vercel.json`'s build, which runs `migrate-if-configured.mjs` in production context. Per that script's fail-closed policy (lines 22-34), if the migration is not already on the production Neon ledger, it will be applied at build time. If the production DB was migrated out-of-band and the ledger is reconciled, it proceeds; if not, the build fails (by design). **Owner action:** run `prisma migrate deploy` (or `db:migrate`) against production first, or confirm the ledger is reconciled via `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`.

2. **Production env vars are owner-controlled and absent from this repo.** `check-deploy-readiness.mjs` (lines 120-153) confirms that `DIRECT_URL`, `STRIPE_WEBHOOK_SECRET`, and the `STRIPE_*_PRICE_ID` vars are Vercel "Sensitive" (write-only, unreadable by `vercel env pull`). The owner must have these set in the Vercel Production dashboard. This is not a branch defect — it is the documented owner action in `CLAUDE_OWNER_LAUNCH_HANDOFF.md` §P0/P1.

### RISK ACCEPTED (owner should knowingly accept):

1. **186 commits land at once.** Per `docs/ops/DEPLOYMENT_TIMELINE_2026-08-07.md` (lines 1-26), a single large merge is realistic but carries rollout risk (the same doc records `6c9c848` failing with a TypeScript error: `'RUN_GENERATE_DRAFTS' does not exist in type Partial<Record<AutonomyActionKind, string>>`). The owner should confirm the latest commit on this branch typechecks (Phase 7's `P7-06` committed `TYPE_LINT_DEBT.md` showing residual debt).

2. **`STRIPE_TERMS_CONSENT_ENABLED` ordering (CLAUDE.md line 101-104, .env.example lines 103-117).** If the owner sets this to `"true"` before configuring the Terms-of-Service URL in the Stripe Dashboard, every new subscription checkout 500s. Documented but easy to get wrong.

3. **Canonical host must be `www.galaxysportsedge.com`** (CLAUDE.md line 122-131, .env.example lines 17-23). If `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` are set to the apex instead of `www`, OAuth callbacks and post-checkout redirects break silently.

### POST-LAUNCH (genuinely can wait):

1. The entity-graph `entities`/`entity_edges` tables have no consumers — no behavior depends on them. They are latent schema.
2. `PUBLIC_PICKS_ENABLED` / `PERFORMANCE_STATS_ENABLED` gates flags are all `false` by default (.env.example lines 289-294) — the public site renders honest empty states until the owner opens them deliberately.

---

## 6. Summary table

| Question | Answer | Evidence |
|---|---|---|
| How does code reach production? | Merge to `main`; Vercel auto-deploys; verify via `deployment.sha` on `/api/ops/public-surface-truth` | `vercel.json:3`, `DEPLOY_LAG.md:12-14`, `CLAUDE_OWNER_LAUNCH_HANDOFF.md:29-34` |
| Build-time DB migration? | `prisma migrate deploy` via `migrate-if-configured.mjs`, gated fail-closed | `vercel.json:3`, `migrate-if-configured.mjs:236-238` |
| New migration in this branch? | Yes — `20260813200000_add_entity_graph` (commit `9cfb91b1`) | `schema.prisma:3814-3904`, `migration.sql` (additive: 1 enum, 2 tables, 8 indexes, 2 FKs) |
| Migration already applied? | No — commit says "NOT applied"; scope-guard confirms owner must approve | `9cfb91b1` commit msg, SPRINT_QUEUE.md lines 508-510 |
| New required env vars? | None — `.env.example` diff vs main is empty; all 17 required vars already documented | `git diff --name-only origin/main..HEAD -- '.env*'` |
| Schema drift risk? | None — `prisma validate` + `prisma migrate diff` confirmed identical; no code reads the new models | `9cfb91b1` commit msg |
| Mergeable? | Yes as a code merge to `main` — but owner must apply/confirm the migration first to avoid a gate-failed build | `migrate-if-configured.mjs` fail-closed policy |

---

## 7. Owner-gated blockers (short list)

1. **Apply the entity-graph migration** to production (`20260813200000_add_entity_graph`) OR confirm the migration ledger is already reconciled — without this, the Vercel build-time `migrate deploy` step will either apply it (if DB reachable) or fail the production build (fail-closed).
2. **Set the 17 required Production env vars** in the Vercel dashboard (Stripe live keys, webhook secret, price IDs, Google OAuth, Neon URLs, etc.) — per `CLAUDE_OWNER_LAUNCH_HANDOFF.md` §P1.
3. **Verify Stripe webhook endpoint** at `https://www.galaxysportsedge.com/api/webhooks/stripe` includes `checkout.session.expired` and its signing secret matches `STRIPE_WEBHOOK_SECRET` — per `STRIPE_GO_LIVE_CHECKLIST.md` §3.
4. **Confirm production SHA lag is cleared** — `DEPLOY_LAG.md` records a prior incident where code was merged but never deployed. Probe `deployment.sha` before declaring the deploy live.
