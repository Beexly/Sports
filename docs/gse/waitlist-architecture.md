> **UPDATE 2026-06-30:** Superseded on deploy status — this waitlist is MERGED into `main` as PR #57 (commit `6084550c`) and the prod DB is LIVE (`/api/performance` returns real data, 397 settled picks). The "Everything here is local-only; nothing deploys" line below is historical; the architecture itself is unchanged.

# GSE Waitlist — As-Built Architecture

The shipped local no-claim founding-waitlist (PR2). Reference for reviewers and for
the PR3 follow-up. Everything here is local-only; nothing deploys, publishes, sends,
or makes a performance claim.

## Flow

```
/waitlist (server page, noindex)
  └─ WaitlistForm (client)
       ├─ validates with the shared zod schema
       ├─ fires no-op analytics (waitlist_viewed / _started / _submitted / _consent_blocked)
       └─ POST /api/waitlist (JSON, same-origin)
            ├─ honeypot check → silently drop bots (store nothing)
            ├─ validateWaitlistLead (server re-validate; consent hard-gate)
            └─ selectWaitlistStore().record() → local-file fallback (.gse-local/, gitignored)
```

## Modules

| File | Role |
|---|---|
| `apps/web/app/waitlist/page.tsx` | server page; renders no-claim copy + backtest transparency + form; `robots: noindex` |
| `apps/web/components/gsn/waitlist-form.tsx` | client form; consent gate; honeypot + `renderedAt` timing; a11y (aria-invalid/describedby/required, error-summary role=alert with focus-on-error, aria-busy); no-op `track()` |
| `apps/web/app/api/waitlist/route.ts` | `POST` handler; anti-bot (honeypot + too-fast `renderedAt`) silent drop; validate; consent gate; store via `selectWaitlistStore()`; **no send/external**; `runtime=nodejs`, `dynamic=force-dynamic` |
| `apps/web/lib/gse/waitlist-copy.ts` | single source of no-claim copy + `BACKTEST_TRUTH` + `BACKTEST_TRANSPARENCY` |
| `apps/web/lib/gse/waitlist-validation.ts` | zod schema, `validateWaitlistLead`, `runNoClaimGuard` (reuses compliance scanner), `hasNoPerformanceClaim` |
| `apps/web/lib/gse/waitlist-store.ts` | `WaitlistStore` interface, `createWaitlistStore` (local-file, dedupe, per-file write lock), `selectWaitlistStore` (PR3 switch point) |
| `apps/web/lib/gse/waitlist-store-db.ts` | PR3 durable-store LOGIC: `createDbWaitlistStore(delegate)` against an injected Prisma-compatible `WaitlistLeadDelegate` (dedup, P2002 race, soft-delete). Tested with a fake; **no schema/migration** (owner-gated) |
| `apps/web/lib/gse/content-drafts.ts` | canonical no-claim social/brief drafts (CI-scanned, 50 posts + 10 brief topics) |
| `apps/web/lib/analytics/events.ts` | typed no-op event registry (`track()` inert until a provider is wired) |
| `scripts/gse-waitlist-list.mjs` | local read-only review of captured leads |

## No-claim enforcement points (defense in depth)

1. **Authoring**: copy/content avoid banned vocabulary (incl. literal "guarantee").
2. **Scanner**: `runNoClaimGuard` reuses the platform `compliance-scanner/rules`
   (`block` severity = fail) over copy, content drafts, the **assembled rendered page**,
   and the email drafts — all CI-tested (`apps/web/__tests__/gse-waitlist.test.ts`).
3. **Positive-claim check**: `hasNoPerformanceClaim` rejects numeric win/ROI/accuracy/
   edge/profit, "guarantee", "risk-free".
4. **Backtest truth**: `BACKTEST_TRUTH` (code) is drift-guarded against
   `backtest-transparency.md` (doc); the page surfaces "does not beat naive".

## Safety properties

- `/waitlist` is `noindex`; not linked from nav; reachable only when the app runs.
- Storage is a local gitignored file (`.gse-local/`), not a database; per-file write
  lock prevents lost leads under in-process concurrency.
- No email send (confirmation/follow-up are draft-only, owner-gated).
- No external analytics vendor (`track()` is a no-op); only same-origin fetch.
- No Stripe/pricing/sportsbook/affiliate/picks/performance claims anywhere.

## PR3 hooks (owner-gated)

- Durable storage: implement `createDbWaitlistStore(): WaitlistStore` + flip the
  commented branch in `selectWaitlistStore()` on `WAITLIST_STORAGE=db`. See
  `pr3-durable-storage-plan.md` + `pr3-migration-runbook.md`.
- Analytics provider: guard a dispatch inside `track()` on a provider key. See
  `pr3-analytics-provider-plan.md`.
- Public deploy: remove `noindex` + nav at go-live. See `release-gate-plan.md`.
