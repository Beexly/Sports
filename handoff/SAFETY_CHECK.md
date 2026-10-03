# SAFETY CHECK — the four hard stops

Row: **P4-8** · Command: `.claude/commands/safety-check.md` (allowed-tools: Read, Grep, Glob,
`git diff/log/status`, `npm run guard:*`) · Run 2026-09-26 23:10 CDT, branch
`hermes/live-wip-2026-09-24` @ `7f3cf956b`.

**No product code was touched.** Every number below came from a command in this session or a file
read. Where a check could not be settled from the repo, it says so rather than guessing.

## RESULT

| # | Hard stop | Verdict |
|---|---|---|
| 1 | No destructive DB operations possible in normal flows | **AT-RISK** (F1) |
| 2 | Stripe key mode / no live secrets / webhook signature / per-interval price IDs | **AT-RISK** (F2) — 3 of 4 clauses PASS |
| 3 | No automated production deploys without explicit approval | **ENFORCED** |
| 4 | No public accuracy claims unsupported by graded data | **ENFORCED** (with a stated blind spot) |

Reproducible helper: `handoff/safety-db-scan.mjs` (node, exit 0). `node handoff/safety-db-scan.mjs
--selftest` → **SELFTEST PASS: all 7 rules fire**, so the zeros below are real zeros and not a
scanner that cannot match.

---

## Check 1 — destructive DB operations in normal flows — AT-RISK

**Method.** `safety-db-scan.mjs` over 6,504 git-tracked `.ts/.tsx/.js/.mjs/.sql` files, 7 rules
(raw-unsafe SQL, DDL/TRUNCATE/DELETE-FROM, unbounded `deleteMany`/`updateMany`/`delete`,
`prisma migrate reset`/`--force-reset`/`--accept-data-loss`). 87 production hits, 76 test-file
hits. Every production hit was read, not pattern-matched.

**Two scanner bugs of my own, recorded rather than quietly fixed** (both would have inflated the
result):

1. The DDL rule was originally case-insensitive and matched Tailwind's `truncate` utility class
   **157 times** across JSX (`app/cockpit/page.tsx:499`, `components/cards/player-card.tsx:80`,
   and ~155 more) — a 100% false-positive class that buried the real signal. SQL keywords in this
   repo are uppercase, so the rule is now case-sensitive, with a separate case-insensitive rule
   scoped to real `.sql` files only.
2. `--selftest` initially **failed** on rule `unbounded-delete`, correctly: the specimen string
   contained `.deleteMany({})` and `.updateMany({})` but not `.delete({})`. I fixed the specimen,
   not the rule. This is exactly why the selftest exists — a rule that cannot fire is a rule that
   reports a false zero forever.

**What the 87 hits actually are.** 63 are `$executeRawUnsafe`/`$queryRawUnsafe`, all in
`lib/ai-control-plane/` (`budget.ts`, `credit-admission.ts`, `control-store.ts`). Every SQL string
there is a template literal with `$1`, `$2` placeholders and values passed as bind arguments. The
one apparent exception, `budget.ts:974` `"${confirmedColumn}" = "${confirmedColumn}" + $2::numeric`,
interpolates a **column identifier** — the one place a value cannot be a bind parameter. I did not
trace `confirmedColumn` to its origin, so I am not calling it safe; I am recording that it is the
only identifier interpolation found and is the thing to check first. `$executeRawUnsafe` here
means "not Prisma-typed", not "unparameterized".

8 production DDL hits are all `lib/api/v1/schema-proposal.ts:273-275`, three
`DROP TABLE IF EXISTS` strings inside the exported `rollbackSqlDraft` **array**. It is read in
exactly three places: its own declaration, a doc line, and
`api-v1-db-schema-proposal.test.ts:184`. The validator at `:371-375` only checks the strings
*contain* the right table names. Nothing executes it. **Inert.**

The 4 `prisma-reset` hits are the guardrail that *blocks* those commands
(`agent-bash-guard.mjs:629-630, 760, 811-813`) plus the one archived migration SQL. A guard
matching the thing it forbids is the correct direction.

### F1 (medium) — the archive delete is guarded on emptiness, not on completeness

`apps/web/lib/ingestion/historical-games.ts:98` — `await db.historicalGame.deleteMany({})`, inside
a function whose own comment (`:84-86`) says it "replaces the ENTIRE multi-season archive (the
table calibration and backtests read from)."

The guard at `:87-94` is `if (data.length === 0) return { status: "source-error" }`. That correctly
stops a *fully empty* upstream from wiping the table, and the comment shows the author knew the
risk. But the delete is reached whenever `data.length >= 1`.

The realistic failure is not an empty response, it is a **partial** one. The row filter at `:60` is
`if (season === null || week === null || !awayTeam || !homeTeam) continue;` — rows are skipped, not
rejected. If nflverse renames `away_team`, or the `schedules` file returns a recent slice instead of
all seasons, the fetch succeeds, `data` is non-empty, and `:98` deletes ~26 seasons of settled
archive and replaces it with whatever survived the filter. The archive is the settled
(forecast, outcome) corpus the calibration and Elo/market backtests read
(`elo-backtest.ts:51`, `market-backtest.ts:45`), so the blast radius is the calibration history
itself, and it is silent: the function returns `status: "ok"` with whatever `rowsWritten` came out.

Reachability: this is not a manual script. `ingestHistoricalGames` is called by the cron route
`app/api/cron/backfill-historical-games/route.ts:18`.

The fix shape is a floor on `seasons.size` or a ratio against the current row count — refuse and
report `source-error` when the incoming population is implausibly smaller than the stored one. I am
**not** applying it: the command is read-only, and picking the threshold is a data decision.

**Second instance, lower severity, and it is correctly guarded.**
`lib/performance/persist-performance-summaries.ts:60` — `tx.performanceSummary.deleteMany({})`,
also a full replace, but the whole function returns early unless
`PERFORMANCE_SUMMARIES_WRITE_ENABLED === "true"` (`:56-58`, flag name at `:25`). Default-closed, and
the empty-population case is deliberately treated as legitimate and reported (`:61-66`). Its only
caller is `rebuild-performance-summaries.ts:106`. **Correct as written** — recorded so the pattern
is not "fixed" by someone who sees the bare `deleteMany({})` without reading the flag.

**No guardrail covers destructive DB operations.** Of 30 files in `scripts/guardrails/`, none
matches `db`/`sql`/`destructive`/`raw` (the one near-miss, `no-raw-ngs-export.mjs`, is about NGS
data export, not SQL). So nothing in CI would fail if a new `deleteMany({})` landed in a request
path. That is the structural half of F1.

## Check 2 — Stripe — AT-RISK (one clause)

**2a. Key mode matches the environment — AT-RISK.** This independently reproduces P4-6/F1, and
the finding stands. `scripts/check-deploy-readiness.mjs:253` computes
`const live = !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")` and `:254` prints it inside
`ok(...)` — a **green** line. There is no `bad()` branch for a test key in production or a live key
in preview. Three amplifiers: `:243` `if (!STRIPE_SECRET_KEY) return;` makes an absent key
indistinguishable from a checked one; the script is wired only to `package.json:99 deploy:ready`
and runbook prose — **not** to CI and not to any deploy step; and `lib/stripe.ts` accepts any
non-blank key, so the runtime cannot tell the modes apart either. Mode is *displayed*, never
*asserted*.

**2b. No live secret key or webhook secret in tracked files or the client bundle — PASS.**
`npm run guard:secrets` → `[secret-scan] OK - scanned 10830 file(s) [all-tracked] (29 file(s) >2MB
not scanned); no secrets detected.` Zero `NEXT_PUBLIC_*` Stripe vars: the only
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is a web-push public key. **Scope limit, stated:** the 29 files >2MB
were not scanned, and I did not inspect a built `.next` bundle.

**2c. Every Stripe route verifies the webhook signature — PASS.** P4-6 measured exactly one webhook
receiver tree-wide and verified the order of operations; nothing has changed. Recording the
load-bearing detail so it is not re-derived: signature verification happens **before** the durable
store check (`route.ts:78-79` gates the store, `:80-93` after verify), and
`lib/api-auth/webhook-signature.ts:7-11` is sound but **dead** for this route (barrel-re-exported
only) — it is not what protects the endpoint.

**2d. Checkout reads per-interval price IDs from env — PASS.** `lib/billing/price-ids.ts:184-186`
declares the per-tier × per-interval vars (`STRIPE_{ELITE,PRO,FANTASY}_{MONTHLY,ANNUAL}_PRICE_ID`),
resolved at `:209-219` with `month` vs `year` selecting the key. The readiness script *does* assert
these — `:259-302` resolves every tiered price ID, compares **amount and currency** against the
advertised value, and calls `bad()` (non-zero exit), never `warn()`. The comment at `:261-266`
records the exact past failure this fixes: the old loop printed whatever amount it fetched as a
green line, so a wrong-price checkout passed the checklist and then 503'd in production. Legitimate
`bad()` calls at `:276` (unset price ID), `:286` (unresolvable), `:299` (mismatch).

## Check 3 — no automated production deploys without explicit approval — ENFORCED

**No workflow can deploy to production.** All 9 workflows inspected. The only `vercel`/`deploy`
strings in `.github/workflows/` are `ci.yml:90-91` (`prisma migrate deploy` against an **empty
localhost test DB**, `:63`) and `ci.yml:105-106` (a skip-gate unit test). No Vercel CLI invocation,
no deploy action, no production credential in any workflow.

Trigger surface: `ci.yml` and `python-tests.yml` are push/test-only. `daily-smoke.yml`,
`external-cron.yml`, `external-watchdog.yml` are `schedule`-only. `fable-evidence.yml` and
`nova-convergence-inventory.yml` are `workflow_dispatch`-only (manual — the
`nova-convergence-inventory` header explicitly says "Deliberately NOT on push").

`neon_workflow.yml` deserves its own line because it is the one workflow that touches the database
provider. It creates and deletes Neon branches named `preview/pr-${{ github.event.number }}-${{
github.event.number }}` (`:46`, `:96`) — a **preview** branch per PR, never the production branch.
The migration step is commented out (`:57-65`). It cannot deploy and cannot migrate production.

**Enforcement is by construction, not by a guard.** The protection is the absence of a deploy step
plus Vercel's own git integration. A future workflow that adds one would not fail any check I can
see, so this is the honest weak form of "enforced" — I am recording it rather than claiming a
guard exists.

## Check 4 — no public accuracy claims unsupported by graded data — ENFORCED

`no-unsupported-performance-claims.mjs` is at `run-all.mjs:44`, and `run-all.mjs` is
`package.json:86 guardrails`, which **CI invokes at `.github/workflows/ci.yml:360`**
(`npm run guardrails`). So this is not a script nobody runs — it fails the build.

`npm run guard:performance-claims` → `[no-unsupported-performance-claims] OK - scanned 476 file(s);
no unsupported performance claims.`

**The blind spot, stated because it bounds the guarantee.** P4-1 measured this guard's lexicon as
**14 strings**, and it never reads the database. Two consequences, both carried forward: a
non-superlative claim ("our reads beat the books") is **structurally invisible** to it, and
"backed by graded-pick data" is **not determined** by running it. Its scan roots also exclude
`packages/` and `docs/`. P4-1's supplementary superlative probe over `components` + `app`
(excluding `api/`) returned 2 hits, 0 findings, both the restraint line in
`world/no-bet-gate.tsx`. Not re-run here; recorded so nobody re-runs it.

---

## What is NOT determined

- **Live env values.** Whether production actually holds an `sk_live_` key is a Vercel fact outside
  the command's allowlist. Check 2a reports that nothing *asserts* the mode — it does not report
  that the mode is wrong.
- **29 tracked files >2MB** not scanned by the secret guard; **no built `.next` bundle** inspected.
  The client-bundle half of 2b is therefore a claim about *source*, not about shipped output.
- **`confirmedColumn`** (`budget.ts:974`) not traced to its origin — the only SQL identifier
  interpolation found, and unverified.
- **Stripe Dashboard configuration** (endpoints, price/account split) untouched, despite
  `lib/ops/stripe-webhook-hosts.ts` existing. Webhook replay-window and rate-limit behaviour not
  audited: `webhookEvent` dedupe bounds duplicate processing, but that is not a replay window.
- **F1's completeness threshold** is a data decision left to the owner; the audit supplies the
  failure mode, not the number.
