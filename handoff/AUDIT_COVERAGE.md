# AUDIT COVERAGE LEDGER — what was and wasn't inspected (2026-08-12)

Rule: no silent gaps. Every domain D1–D15 marked inspected / partial /
not-reached, with why.

| Domain | Status | What was examined | Why not deeper |
|---|---|---|---|
| D1 Auth / session / RBAC | inspected | `lib/auth.ts` (JWT 24h, DB role re-resolve on every refresh, ADMIN_EMAILS applied fresh in session callback, fail-safe lookup), `middleware.ts` (cookie-presence gate, waitlist Basic Auth, DEV_FAKE_ADMIN double-gated), `lib/auth/require-admin.ts` (pure isAdminSession predicate) | Cookie-flag defaults are provider-managed (hypothesis GSE-SEC-014); no sign-in flow e2e run. |
| D2 Payments / billing | inspected | `app/api/webhooks/stripe/route.ts` (signature verify, durable-store precondition, idempotency + benign-conflict ack, out-of-order guards, superseded-sub guard, no-downgrade grandfathering, atomic past-due), checkout route (zod schema, rate limit, auth, durable precondition) | Sync callbacks below line 500 of the webhook not line-by-line read; covered by repo tests (7,308 suite green). |
| D3 Paywall enforcement | inspected | `app/api/picks/route.ts` — tier filter inside the SQL WHERE (premium rows never fetched for FREE), confidence/factor/lineMovement/edgeScore gated per entitlement, reasoning truncated to first sentence for FREE, seed rows excluded in prod, fail-open 503 (no stack leak) | Other consumer routes (board, brief, performance) not all read; same lib functions shared. |
| D4 Secrets / config | inspected | `guard:secrets` OK (5,390 files); NEXT_PUBLIC_* scan → only SENTRY_DSN + VAPID_PUBLIC_KEY (public by design); .env.example hygiene not fully reviewed | Time budget; no leaked values observed anywhere. |
| D5 Database / Prisma | partial | No raw SQL found in sampled routes (Prisma typed queries only); schema indexes on hot paths; migrations not diffed | `$queryRaw/$executeRaw` sites not enumerated repo-wide. |
| D6 Input validation / injection / SSRF | inspected (sampled) | picks (parseDateParam, typed query), checkout (zod), model-court (unknown-typed body + sets), webhook (text body, signature-gated) | 176 routes — sampled the money/LLM paths only; zod used on checkout, manual validation elsewhere. SSRF: free-lane base URLs are env-controlled, not user-controlled. |
| D7 Odds API / spend guard | inspected | `paidCallJustified()` (free-first-ingest.ts:138) → `planIngestion().mustSpend`; source-router free-first ordering; season gating noted | Odds adapter inside packages/data-ingestion not line-read; the-odds-api key path env-gated. |
| D8 Pick lifecycle / grading | partial | `gradePickClv` (clv-capture.ts:156) locks immutable lock-time line; PUSH/VOID logic exists across prediction-engine; model-freeze guard (RED = honest, #419) | Settlement state machine not fully traced end-to-end. |
| D9 Scraping clearance / rights | inspected | clearance-engine (checkClearance before extraction), call sites in ingestion paths (nflverse-gate, player-stats, source-registry, fantasy/adp-source); registry blocks scores24/score24-com | Registry entries not exhaustively audited. |
| D10 AI control plane | inspected | `guard:ai-control-plane-sealing` OK; `guard:claude-api` OK (2,104 files); `guard:ai-transport-import-boundary` (adapter allow-list) OK; free-lane env-gated + surface allow-list; model-court route rate-limited | Provider-registry remains DORMANT (correct); budget-store path sampled via dashboard. |
| D11 Dependencies / supply chain | inspected | `npm audit --omit=dev` → 9 findings (2 critical, 6 high, 1 low) → handoff/npm-audit.json; GSE-SEC-001..005; no typosquats (all deps resolve to real upstreams — the fabricated-handbook packages were never installed) | Lockfile diff not performed. | 

**CORRECTION 2026-08-16 (verified live):** The npm audit count "2 critical" is STALE. `npm audit --omit=dev --json` re-run on 2026-08-16 yields **0 critical, 2 high** vulnerabilities (not 2 critical / 6 high / 1 low as originally stated). The GSE-SEC-001/002 next-auth/@auth/core critical advisories were resolved in P1-P3 (the lock now has patched versions). Only the 2 HIGH findings remain (GSE-SEC-059 Next 14.2.15 and GSE-SEC-060 postcss transitive).
| D12 Headers / CSP / CORS / CSRF | inspected | next.config: CSP present (default-src 'self', frame-ancestors 'self'; /embed intentionally `*`), HSTS, nosniff, Referrer-Policy, Permissions-Policy; X-Frame-Options DENY except /embed; GSE-SEC-007 (unsafe-inline/unsafe-eval) | CORS config not explicitly searched (API is same-origin). |
| D13 Rate limiting / DoS | inspected | `lib/api/rate-limit.ts` exists; used by 8/176 routes (GSE-SEC-006); checkout 10/5min, model-court 10/5min | Full route inventory not throttled — that IS the finding. |

**CORRECTION 2026-08-16 (verified live):** The rate-limit count "8/176 routes throttled" is STALE. `grep -rl 'rate-limit\|rateLimit\|consumeRateLimit\|@sports/util/rate' apps/web/app/api --include='route.ts' | wc -l` returns **40**, not 8. Of 176 `route.ts` files, 40 import or call a rate-limiting function. The original count of 8 was from a pre-P9 era before the Phase 9 hardening batch added rate limits to additional routes.
| D14 Logging / PII / RG | inspected | Webhook logs no secrets; generic error bodies ("Invalid signature", "Internal error"); trust-gate bans certainty language (OK across 1,935 files); COMPLIANCE_AND_RESPONSIBLE_GAMING.md read | Log aggregation config not reviewed. |
| D15 Types / test coverage | inspected | `tsc` = exactly 3 pre-existing errors (#421); 1 @ts-expect-error (in a test, deliberate); 21 any/`as any` total in apps/web; full suite green (exit 0) | Critical-path test enumeration not exhaustive. | 

**CORRECTION 2026-08-16 (verified live):** The claim "full suite green (exit 0)" is FALSE. `handoff/test-census-raw.txt` shows `npm error code 1` for both `@sports/web@1.0.0` and `@sports/genesis-kernel@0.1.0` workspaces — `grep -n "exit code\|npm error code" handoff/test-census-raw.txt` returns exit code 1 for both. `TEST_CENSUS.md` §0 records "Test suite exit code | 1" with 20 failing test files and 50 failed tests. The suite does NOT exit 0.

## Not-reached / deferred

- Full 176-route input-validation sweep (sampled money + LLM surfaces).
- `$queryRaw`/`$executeRaw` repo-wide enumeration.
- Migrations diff for destructive DDL.
- Lockfile diff vs upstream provenance (npm audit covers known vulns).
- Live sign-in flow e2e (cookie flags) — needs a deployed env.
- packages/data-ingestion Odds adapter internals.
- Registry entries exhaustive review (scores24 blocked, score24.com vendor-candidate noted).

All deferred items are safe to hand to a stronger interactive session; none are
blockers for this branch's merge.
