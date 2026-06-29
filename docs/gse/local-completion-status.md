# GSE Waitlist — Local Completion Status

**As of:** 2026-06-29 · branch `claude/gse-no-claim-waitlist` (12 ahead / 0 behind
`origin/main`; 4 pushed earlier at Level 2A, 8 local-only). typecheck 0, lint 0,
waitlist **49/49**, guardrails **6/6**. No schema change; backtest false preserved.

This is the honest line between what is **100% done locally** and what is **owner-gated**
(intentionally NOT done autonomously). The local product is feature-complete.

## ✅ Done locally (complete + tested)

| Area | What | Tests |
|---|---|---|
| Page | `/waitlist` server page, `noindex`, no-claim copy + backtest transparency | source + render |
| Form | client form, consent hard-gate, no-op funnel analytics | render + behavior |
| Validation | zod schema, server re-validate, oversized-input rejection | unit |
| Storage (file) | local-file fallback, dedupe-by-email, **per-file write lock** (no lost leads) | unit + concurrency |
| Storage (DB logic) | `createDbWaitlistStore(delegate)` — dedup, P2002 race, file↔DB parity | fake-delegate unit |
| Anti-bot | off-screen honeypot **+ submit-timing** guard (+ edge cases) | route |
| a11y | aria-invalid/describedby/required, error-summary (role=alert, focus-on-error), aria-busy | render |
| No-claim CI | scanner over copy + **50** content posts + assembled page + email drafts + research briefs | unit |
| Backtest integrity | `BACKTEST_TRUTH` code↔doc drift guard; "beats naive = false" surfaced | unit |
| Analytics | typed **no-op** registry (inert until a provider is wired) | unit |
| Tooling/docs | review CLI; architecture, PR3 plan + runbook, release-gate, owner-decision, content plan | n/a |

## 🔒 Owner-gated (NOT done autonomously — by design)

| # | Step | Why gated |
|---|---|---|
| 1 | Apply the `WaitlistLead` Prisma **schema + migration** | deploy-target has `migrate-in-build` → auto-applies on a future deploy; DB target unverifiable locally |
| 2 | Wire the real `db.waitlistLead` delegate into `selectWaitlistStore()` on `WAITLIST_STORAGE=db` | depends on (1) |
| 3 | Enable an analytics provider | privacy/DPA decision |
| 4 | Remove `noindex` + nav + **deploy** `/waitlist` | publish/deploy gate |
| 5 | Send confirmation/follow-up email | external-messaging gate |
| 6 | **Push** the branch / open or merge the PR | push gate (PR was pushed once at Level 2A; merge = production) |

## How to finish each gated step
See `pr3-migration-runbook.md` (steps 1–2), `pr3-analytics-provider-plan.md` (3),
`release-gate-plan.md` (4 + smoke tests + rollback), and the email drafts (5, draft-only).

## Definition of "100% local" — met
- Every automated gate in `release-gate-plan.md` §1 is GREEN.
- No remaining local code/test/doc item adds value without crossing an owner gate.
- The only way to advance is an explicit owner decision on one of the six gated steps.
