# GSE PR2 — Local Waitlist + No-Op Analytics (Implementation Report)

**Status:** GREEN (local-only). Implemented per `docs/gse/pr2-waitlist-implementation-readiness.md`.
**Repo / branch:** C:/Users/Garrett/Sports — `codex/galaxy-dynasty-studio-rescue-v2`.
**Date:** 2026-06-29. **Owner approval:** local-only PR2 (no deploy/push/publish/flags/Stripe/pricing/sportsbook/affiliate/send/perf-claims).

## What was built (smallest local-only path)

A complete, local, no-claim waitlist path: page → client form → local API handler → local-file store, plus a no-op analytics extension and tests. **No database/schema change** — storage is a local-file fallback because the `WaitlistLead` table is an owner-gated migration.

### Files created
- `apps/web/lib/gse/waitlist-copy.ts` — single source of no-claim copy + the honest backtest-truth line (10,301 samples; model MAE ~5.18 vs naive ~5.00; **does not beat naive**). Authored to pass the platform compliance scanner.
- `apps/web/lib/gse/waitlist-validation.ts` — `zod` schema + `validateWaitlistLead()` (server re-validates; consent hard-gated) + `runNoClaimGuard()` which **reuses** `@/lib/compliance-scanner/rules` (`getRulesForTemplate`) — the scanner is not weakened or forked — plus `hasNoPerformanceClaim()`.
- `apps/web/lib/gse/waitlist-store.ts` — local-file fallback store: lazy `fs`, dedupe by lowercased email, default path under the OS temp dir (override `GSE_WAITLIST_STORE_PATH`). No DB, no network.
- `apps/web/components/gsn/waitlist-form.tsx` — `"use client"` form; consent checkbox; client validation; posts to `/api/waitlist`; fires no-op `track()` events. (Placed under `components/gsn/`, the real convention — not `gse/`.)
- `apps/web/app/waitlist/page.tsx` — server page; renders no-claim copy + backtest transparency + form. `robots: noindex`. No flag flips, no pricing.
- `apps/web/app/api/waitlist/route.ts` — `POST` handler: parse → validate → consent gate → local store. `runtime=nodejs`, `dynamic=force-dynamic`. **No email send, no external call.**
- `apps/web/__tests__/gse-waitlist.test.ts` — 17 tests (below).

### Files edited (additive only)
- `apps/web/lib/analytics/events.ts` — added `waitlist_viewed/started/submitted/consent_blocked`, `audit_offer_clicked`, `transparency_read`, `research_brief_clicked`, `claim_gate_hit` to the typed union + the documented map. `track()` stays a NO-OP (no provider, no PII, no network).

## Schema decision (why no DB change)
Adding a Prisma `WaitlistLead` model requires a generated migration touching `packages/db` and the database — a gated, not-clearly-safe change. Per the task, the schema was **not** edited. Storage uses the local-file fallback. The durable `WaitlistLead` table remains the documented, owner-gated next step (see the readiness doc, section 3 / 7).

## No-claim verification
- Every user-facing copy string passes the platform compliance scanner (`runNoClaimGuard`) with **zero `block` flags** — same banned-vocabulary rules every other surface uses.
- Every copy string passes `hasNoPerformanceClaim` (no numeric win/ROI/accuracy/edge/profit, no "guarantee", no "risk-free").
- Copy contains no pricing/Stripe references (tested).
- Backtest truth is surfaced and honest: `BACKTEST_TRUTH.beatsNaive === false`; the transparency line contains "10,301" and "does not beat naive". Not altered.

## Commands run + results
- `npx vitest run __tests__/gse-waitlist.test.ts` → **17/17 passed**.
- `npm run typecheck --workspace=apps/web` → **exit 0** (after fixing two `noUncheckedIndexedAccess` issues).
- `npx vitest run __tests__/gse-waitlist.test.ts __tests__/guardrails.test.ts` → **22/22 passed** (guardrails: trust-gate / draft-only / claude-api-usage all green — the new route writes no `publishedAt` and flips no `PUBLISHED`).
- `npm run lint --workspace=apps/web` → **exit 0** (`--max-warnings=0`).
- Full multi-workspace `npm run typecheck` / `npm run test` not re-run: changes are confined to `apps/web`; web typecheck + targeted tests cover them.

## Owner gates preserved
No deploy, push, publish, public-flag flips, Stripe/billing, pricing changes, sportsbook/affiliate paths, published picks, external messaging/sends, win-rate/ROI/accuracy/edge/performance claims, schema/auth/payment/prod-config changes, or commit. Confirmation/follow-up emails remain draft-only. GSE-only; no Lumera/XXX, no cross-lane.

## Blockers / next safe action
- Durable persistence (`WaitlistLead` table + migration) is owner-gated — local-file fallback is in place until approved.
- Wiring a real analytics provider is owner-gated — `track()` stays no-op.
- Page is `noindex` and local; making `/waitlist` publicly reachable is a gated deploy/publish action.
- Next safe step: owner review of copy + the local path; then (if approved) the gated DB migration and provider wiring as a follow-up PR.
