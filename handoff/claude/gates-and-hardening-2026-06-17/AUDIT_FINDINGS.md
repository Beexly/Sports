# Consolidated Audit Findings — 2026-06-17

Run as **8 parallel read-only subagents** (ultracode) over the full repo, then
consolidated here. Each finding is verified against real `file:line`. Disposition:
**[FIX]** done in-session · **[HANDOFF]** for local Claude · **[ACCEPTED]** intentional/low.

> Status: 6 of 8 audit domains consolidated below; **types/architecture** and
> **accuracy-claims/calibration** were still finishing at write time and are
> appended in a follow-up commit.

---

## ⭐ LAUNCH-GATE BLOCKERS — fix before flipping `PERFORMANCE_STATS_ENABLED` publicly

The gating *machinery* is correct (preflight = GO; stats are withheld until the
gate + 100-floor). The risk is **grading correctness**: once the number is shown,
these can make it WRONG. The platform's #1 rule is "no fabricated/▒unsupported
stats," so these come first.

| # | Finding | File:line | Disposition |
|---|---|---|---|
| **G1** | **No VOID/postponement path** — cancelled/abandoned games (API marks `completed:true`) are graded as real WIN/LOSS/PUSH and flow into the published record. `VOID` is referenced everywhere but never written. | `packages/prediction-engine/src/settlement.ts:43-80`; `packages/data-ingestion/src/normalizer.ts:116-139`; `packages/ingestion-pipeline/src/settle-sport.ts:83` | **[FIX]** (see HARDENING_APPLIED) |
| **G2** | **NaN scores bypass the null guard** — a non-numeric score (`""`,`"-"`,`"PPD"`) → `parseInt`=`NaN`, `NaN !== null` passes, mis-grades (everyone LOSS) or aborts the sport. | `packages/data-ingestion/src/normalizer.ts:134-135`; guard at `settle-sport.ts:96` | **[FIX]** |
| **G3** | **Double-settle race** — settle write is `update({where:{id}})` with no `result:"PENDING"` precondition and no transaction; the 30-min worker and the daily cron can both grade the same pick and overwrite `settledAt` (breaks proof-of-record ordering). | `packages/ingestion-pipeline/src/settle-sport.ts:85-140` | **[FIX]** |
| **G4** | **Empty-but-200 odds response → recorded SUCCESS → resets freshness clock**, so `/api/health` and the stale-kill-switch can read "fresh" while no real odds flow. | `packages/ingestion-pipeline/src/process-sport.ts:111-138,404-412`; `public-freshness-gate.ts:46-53` | **[FIX]** |

---

## SECURITY (secrets / auth / stripe) — verdict: secrets clean · stripe clean · **one HIGH auth gap**

- **[FIX] HIGH — Server Actions mutate the DB with no in-action auth/role check.**
  `apps/web/app/cockpit/memory/page.tsx:46-72` (`"use server"` form actions →
  `confirmMemory`/`rejectMemory`, `lib/jarvis/memory/actions.ts:100,136`). The cockpit
  *layout* guard protects page render, **not** the Server-Action POST endpoint. Latent
  siblings: `lib/community/moderation-actions.ts:99,125,168,233`, `lib/jarvis/ledgers.ts:96,165,198`.
  Fix = `const s = await auth(); if (s?.user?.role !== "ADMIN") throw` inside each action,
  and derive `actor` from the session, not the argument.
- **[ACCEPTED] LOW** — `/api/airwave/*`, `/api/human/*`, `/api/intelligence/*` return
  derived counts unauthenticated (private fields stripped). Document as public or gate.
- **[HANDOFF] LOW** — cron bearer compares with `!==` (timing side-channel); use
  `crypto.timingSafeEqual` (pattern already in `api/cipher/verify/route.ts:53-60`).
- **PASSED (verified):** no hardcoded secrets (1,622 files + `.next/static` scanned), no
  tracked `.env`, no secret in any `"use client"` file or `NEXT_PUBLIC_*`, API-route +
  page RBAC enforced and test-pinned, paywall server-side, Stripe test-mode + webhook
  signature + idempotency all present, `DEV_FAKE_ADMIN` refuses to escalate in prod.

## DATA-RELIABILITY (The Odds API) — verdict: solid retries/fail-safe · **G4 + default-off gap**

- **[FIX] CRITICAL G4** (above).
- **[HANDOFF] HIGH — `FORCE_NO_BET_IF_STALE` defaults OFF**, so no customer surface
  consults freshness by default. Flip it ON with the stats gate (already in
  GATE_FLIP_HANDOFF Part A). `platform-config.ts:143,175`.
- **[HANDOFF] HIGH — `validateFreshness` checks the local fetch clock, not upstream data
  age** (`normalizer.ts:111-114`, `process-sport.ts:112`) — effectively a run-duration
  guard, not a staleness guard. Rename/redocument or validate payload timestamps.
- **[HANDOFF] HIGH — odds failover is dead code** (`odds-failover.ts` never called by
  `process-sport.ts`); the live pipeline is single-source. Wire it or correct the docs.
- **[ACCEPTED]** per-sport freshness masking (known, documented); fail-open on DB error
  (intentional); GitHub Actions `external-cron.yml` (*/30) is the real cadence (Vercel
  daily cron is a backstop) — monitor that the Actions schedule stays enabled.
- **PASSED:** retry/backoff (429/5xx + jitter + Retry-After), failed-run recording,
  insert-only odds (no destructive overwrite), fail-safe suppression on outage, the
  earlier "failed sport reported ok" bug is fixed on the cron path.

## DB + PERFORMANCE — verdict: **migration baseline missing (Critical)** · perf fine-now/scales-poorly

- **[HANDOFF] CRITICAL — Migration history has no baseline.** ~17 core tables
  (`picks`,`games`,`odds`,`users`,`subscriptions`,…) exist only via `db push`, never a
  migration. `prisma migrate deploy` won't recreate them in a fresh Neon branch/preview →
  non-reproducible deploys + drift risk. Fix = generate a reconciled baseline
  (`prisma migrate diff --from-empty --to-schema-datamodel … > …/migration.sql` then
  `migrate resolve --applied`). Reconciliation, not a forward change.
- **[FIX] HIGH — missing hot-path indexes** on `Pick.isPublished/isBootstrap/confidence`
  hammered by ~16 cockpit aggregates/60s + `/api/performance` + board. Add
  `@@index([result, isPublished, isBootstrap])` and
  `@@index([isPublished, isBootstrap, generatedAt])`, plus
  `IngestionRun @@index([status, completedAt])` (public freshness path) and
  `Pick @@index([ingestionRunId])`. (Index DDL is additive + safe; pairs with the
  baseline so it lands as a real migration.)
- **[HANDOFF] HIGH — `/api/performance` does an unbounded `findMany`** (no `take`/`select`)
  over all settled picks just to bucket-count (`route.ts:34-47`) → push to `groupBy`.
- **[HANDOFF] MEDIUM** — cockpit runs count+findMany over the same predicate (`page.tsx:36-54`);
  `Odds` lacks `(gameId, fetchedAt)` composite; homepage `game.findMany` over-fetches.
- **[ACCEPTED]** cascade-deletes all reviewed safe (Pick→Game is Restrict; audit rows SetNull).

## PREFLIGHT + HARD-STOPS + DEPS — verdict: **GO**

- typecheck ✓ · lint ✓ · all four hard-stops enforced (no destructive DB in request
  paths; Stripe test-mode; no auto-deploy in CI; stats withheld until gate+floor).
- **[HANDOFF] MEDIUM — `npm audit`: 13 vulns (1 critical-class, 6 high)**, almost all
  dev/build toolchain (vitest/vite/esbuild, eslint-config-next, babel) + Next.js. Safe
  non-breaking: `form-data`, `@babel/core`, `js-yaml` (`npm audit fix` in a branch).
  Breaking (review only): `next` majors, `vitest@4`, `eslint-config-next@16`.
- **[HANDOFF] LOW** — env docs drift: legacy `STRIPE_PRO_PRICE_ID`/`STRIPE_ELITE_PRICE_ID`
  + 8 optional flags (`HC_REFRESH_PING_URL`, `FORCE_REAL_PRISMA`, `SENTRY_DSN`, …) read
  by code but not in `.env.example`. 2 worker `console.log` (non-request).

## COCKPIT VISUAL/UI — verdict: structurally sound, **not AA-ready** (mechanical fixes)

- **[FIX] CRITICAL — faint sub-labels fail WCAG AA (~2.0–2.5:1).** `text-ion-3/40` and
  `/50` collapse contrast (full `text-ion-3` already passes at 6.48:1). Worst offenders:
  the Drilldowns disclosure summary `page.tsx:296` (`/50`, the only affordance to open the
  forensic layer — **this is the disclosure added this session**; bump to `text-ion-2` to
  match the sibling at `:273`), department `agentMode` `:995`, the drilldown arrow `:999`
  (`/30`, invisible), `ask-jarvis-panel.tsx:184,187`, `agent-council-panel.tsx:206-215`.
- **[FIX] HIGH — gated Win Rate "—" reads as broken, not locked** (`page.tsx:877-888`).
  Add a lock glyph + `gated · {remainingToThreshold} more settled` caption (value already
  in scope), tinted to match the "Gated" pill.
- **[HANDOFF] HIGH — accent role drift** (`yellow`/`orange`/`red`/`rose`/`green` literals
  doing the work of 3 roles; semantic tokens `caution`/`alert`/`verify` exist but unused).
- **[HANDOFF] MEDIUM** — 8–9px type below the 12px eyebrow floor (48× in page.tsx);
  `ultraviolet` text near the AA edge below 18px (use `ultraviolet-glow`); inconsistent
  stat-card padding/radius.
- **PASSED:** no `gray-`/`slate-` literals (palette test green); `tabular-nums` consistent;
  the session's calming work (details disclosures, softened rose) is on-identity.

---

## Disposition summary

- **Fixing in-session (safe + test-covered):** G2 (NaN guard), G3 (double-settle
  precondition), G4 (empty→non-success), the HIGH server-action auth gap, the cockpit
  contrast/locked-state mechanical fixes, and the additive Pick/IngestionRun indexes.
- **G1 (VOID path):** carries a status signal adapter→normalizer→settle; implemented
  carefully with tests if it stays localized, else handed off — see HARDENING_APPLIED.md.
- **Handoff (needs prod/owner judgment):** DB migration baseline, `/api/performance`
  `groupBy`, `npm audit fix`, `next` CVE review, failover wiring, color-role token sweep.
