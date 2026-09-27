# Authn/Authz Audit — P4-7

Command: `.claude/commands/audit-auth.md`
Allowed tools: Read, Grep, Glob, `Bash(git diff*)`, `Bash(git log*)`, `Bash(git status*)`
Date: 2026-09-26 · branch `hermes/live-wip-2026-09-24` · commit base `585eb4ee5`

**RESULT: NO FINDING IS AN EXPLOITABLE BYPASS.** The command asks for four things;
all four were measured. Two real gaps exist, both defence-in-depth rather than
exposure, and one repo-documented invariant was independently confirmed rather
than assumed. No product code was modified.

Reproducible helpers, all read-only, all exit 0:

| helper | what it measures |
|---|---|
| `handoff/auth-scan.mjs` | gate vocabulary over all 194 `route.ts`; `--selftest` |
| `handoff/auth-page-check.sh` | per-page `auth()`/`redirect()` under middleware prefixes |
| `handoff/auth-premium-check.sh` | the repo's own premium-gate claim, per prefix |

---

## The four questions, answered

### 1. API routes and server actions missing session checks

194 tracked `route.ts`; 42 export a mutating verb.

**The decisive structure first, because it reframes the count:** `apps/web/middleware.ts:120-124`
matches `"/((?!_next/static|_next/image|favicon.ico|api/).*)"` — the matcher
**excludes `api/` entirely**. Middleware is therefore not, and was never, an API
auth layer. Every API route is its own boundary. That is a legitimate design
(and the file says so at :11-16), but it means a route's gate is whatever that
one file calls, and nothing catches a new file that calls nothing.

A naive "which mutating routes have no gate" scan returns 13. **Read one by one,
0 are unauthenticated mutations**, and the scan's own vocabulary was wrong twice,
which is recorded below rather than hidden:

- 8 of the 13 are `/api/gse/v1/*` + `/api/contests/enter` + `age-verify`,
  `cipher/verify`, `receipts/verify`, `moderation/anonymous-report`, `waitlist`,
  `human/roster-availability`. Verified individually:
  - `/api/gse/v1/*` (hydration/plan, own/values, rights/classify-export,
    truth/fire) — **pure evaluators, no database**. `git grep "@sports/db|prisma"`
    over the prefix returns nothing. Each is IP rate-limited at 8/60s and
    fail-closed (`requireSpdx` 422s a missing licence; `asOf` refuses on
    missing/future). `guard:api-v1-boundary` passes and its header states the
    surface is "shadow/proposal-only", blocking live routes, models, env vars,
    db imports and network calls before an owner-approved promotion.
  - `contests/enter` — deliberate public form: `isContestsPublic()` surface gate,
    `consumePublicFormRateLimit` 8/min keyed on `x-forwarded-for`, zod
    `ContestEntrySchema.safeParse`, and a honeypot that returns a fake success.
  - `age-verify`, `cipher/verify`, `receipts/verify` — verification endpoints
    over caller-supplied material; no session is the correct shape.
  - `dev/state` — returns 404 when `NODE_ENV === "production"`, and every field
    is a **boolean `*Set`**, never a value.
- **Two scan bugs, both mine, both fixed before any conclusion was drawn:**
  1. First vocabulary omitted `cronAuthError`, so all 25 cron routes read as
     "ungated" and the mutating-unauthenticated count read 15 instead of 13.
     They are gated by `cronAuthError(request)`, which returns 401 on mismatch
     and **500 when `CRON_SECRET` is unset** — unset is not "open".
  2. `/api/v1/*` read as ungated because it uses `resolveB2bKeyScope`
     (`lib/b2b/api-key-auth.ts:62`) rather than the `api-auth/` helper I
     searched for. It is gated, and well: `timingSafeEqual` constant-time
     compare (`:55-59`), **fail-closed when `GSE_B2B_API_KEYS` is unset**
     (`if (!raw) return null`), and free-scope is the default with `:premium` an
     explicit per-key opt-in — the comment records that the prior version leaked
     Pro-gated `confidence` to any key holder.

**Server actions:** `apps/web/lib/jarvis/memory/actions.ts` is `"use server"`,
so its exports are externally invocable, and the file itself carries no
`auth()` call. The guarantee lives in a test, not the file. That test exists and
**passes**: `npx vitest run __tests__/jarvis-memory-authorization.test.ts` → 9/9.
`lib/community/moderation-actions.ts` derives reporter, appellant and reviewer
identity from the session and says so at :97/:110/:136/:207 — a caller cannot
claim another actor.

### 2. Client-side-only gating

**No premium surface relies on the client alone.** The repo makes this claim in
`lib/api-entitlement.ts:9-16` — that a Pro page's underlying JSON is
"trivially bypassed by requesting the JSON URL directly". Measured per prefix
(`auth-premium-check.sh`):

- `/api/intelligence/*` — 20 routes, **0 ungated**
- `/api/nflverse/*` — 12 routes, **0 ungated**

The pattern at `app/trends/page.tsx` is the model: `getViewerEntitlements()` at
:55, early return with `TierGatePanel` at :56-56, and the premium loaders
(`loadTrendWorkbench`, `loadNflverseTrendReadiness`, `loadQbAgeRbTrendReport`)
only at :84-85 — **the gated data is never loaded for an under-tier viewer**,
rather than loaded and hidden. That is stronger than the command requires.

Client components do read tier/session state (`subscribe-button.tsx`,
`pricing-plans.tsx`, the fantasy boards) but in every case they are given a
server-resolved value; the deciding check is server-side.

### 3. Role checks that can be bypassed

`isAdminEmail()` (`lib/auth.ts:80-89`) is **re-applied fresh in the `session`
callback** (`auth.ts:145-147`), never baked into the token, so removing an email
from `CODE_OWNER_ALLOWLIST` or `ADMIN_EMAILS` revokes admin on the next request
rather than persisting for the token's 24h life. `auth.ts:118-135` re-resolves
the DB role on every refresh and **leaves the existing role untouched on a failed
lookup** — fail-safe, never fail-open to ADMIN.

**No privilege-escalation write path exists.** Repo-wide, `user.role` is written
in exactly two places, both server-side and neither request-controlled:
`packages/db/prisma/seed.ts:161,163` and the `DEV_FAKE_ADMIN` synthetic session
at `auth.ts:189` — which is hard-gated to `NODE_ENV !== "production"` at both
:182 and :234, mirroring itself as defence-in-depth. No API route accepts a role
from a body, query, or header.

**One genuine inconsistency, and it is presentational.** `requireAdmin()` is
**re-implemented in 9 route files** rather than imported. 27 cockpit API routes
exist; 9 use that local helper and 18 inline the same check. All 27 share the
identical condition — verified as the literal string
`!session?.user || session.user.role !== "ADMIN"` in every file, not inferred
from a shape heuristic. They differ only in **status code and message text**:
8 of the 9 return 403, and `bot-outbox/preview` returns **401**; the 18 inline
copies split 401/403. So an unauthenticated caller probing the cockpit sees two
different statuses for the same condition. Cosmetic, not a bypass — the grant
decision is identical — but it is the same "one rule, two spellings" drift that
`adverse-edge-suppression.ts` was written to eliminate, and it is the one place
this audit would change code.

### 4. Tokens/secrets reachable from the client bundle

**Clean, and this is a sweep, not a spot check.** 7 `NEXT_PUBLIC_*` variables
exist repo-wide; all are public by construction — `APP_URL`, `VERCEL_GIT_COMMIT_SHA`,
`ANALYTICS_ENABLED`, `CLARITY_PROJECT_ID`, `SENTRY_DSN` (ingest-only, written to
the page at `layout.tsx:252,257`), `VAPID_PUBLIC_KEY` (web-push public half),
`CF_BEACON_TOKEN` (Cloudflare analytics ingest token). No `NEXT_PUBLIC_*` carries
a Stripe key, DB URL, OAuth secret or webhook secret.

Across every `"use client"` file, the **only** `process.env` read is
`process.env.NODE_ENV` (5 occurrences) — so no server-only variable can be
inlined into a client bundle. `guard:secrets` exit 0 over 10,826 tracked files.
Same scope limit as the Stripe audit: 29 tracked files >2MB are not scanned and
no built-`.next` bundle was inspected.

---

## The two real gaps

### F1 (medium) — the spoofable cron header is unreachable in practice, but the switch that arms it is unguarded

`lib/cron/authorize.ts:41-44` documents that `x-vercel-cron: 1` is **not
cryptographic proof of Vercel origin** and that `mode: "dual"` exists to accept
it anyway. Default is `bearer_only` (GSE-SEC-016), so a side-effecting cron is
safe unless a route opts in.

**Measured: zero routes opt in.** `git grep "mode: \"dual\""` over
`apps/web/app/api/cron/` returns only a comment (`autonomy-cycle/route.ts:53`) and
a docstring (`gamma/route.ts:5`) — no live call. All 25 cron routes call
`cronAuthError(request)` with no options, or `cronAuthErrorBearerOnly`. So today
the spoofable path is **closed by default and closed by convention**.

The gap is that the convention has no guard. `scripts/guardrails/` contains 26
guardrails and **none of them asserts that no side-effecting cron route passes
`mode: "dual"`**. The protection is currently a code-review convention plus a
comment. The one-line-per-file fix is a guardrail that fails the build when a
`/api/cron/*` route passes `mode: "dual"`, which is exactly the class
`guard:api-v1-boundary` already covers for the v1 surface.

### F2 (low) — `requireAdmin` is spelled nine ways, and one spells the status code wrong

Per §3 above. Minimal fix: move the helper to `lib/api-auth/admin.ts`, import it
in all 27 cockpit routes, and pin the status code in a test — the same
import-don't-restate rule the repo already wrote down for
`pricesWorseThanMarket`. Deliberately **not** applied here: the command is
read-only.

## Verified false positives, recorded so nobody re-runs them

- **`/cockpit` page-level auth looked like 33/35 unprotected.** It is not. The
  gate is in `app/cockpit/layout.tsx:88-95`, which is correct: a Next.js layout
  wraps every page beneath it, and the non-admin branch returns a terminal
  screen rather than redirecting (the comment at :88-91 records that redirecting
  looped forever). My per-page scan was the wrong granularity for a
  layout-gated tree. `/admin` (40 pages) and `/dashboard` (1) each check in the
  page, which is why they read 0/40 and 0/1 — a difference in convention, not in
  security.
- **26 of the 25 cron routes "ungated"** — vocabulary bug, corrected above.
- **`/api/gse/v1/*` "ungated"** — intended; the boundary guard passes and the
  routes hold no data.
- **`/api/v1/*` "ungated"** — uses the B2B key path, gated and fail-closed.

## Not determined

- Whether any **live** deployment has `GSE_B2B_API_KEYS`, `CRON_SECRET`,
  `ADMIN_EMAILS` or `DEV_FAKE_ADMIN` set. Every one of these defaults closed, so
  the code is safe under an empty env — but "safe because unset" and "safe
  because correctly configured" are different claims and only the operator can
  make the second. `layout.tsx:100-107` already surfaces an "ADMIN_EMAILS unset"
  badge, which is the right instinct.
- The 29 tracked files >2MB, and any built bundle.
- Session-cookie hardening attributes (`httpOnly`/`sameSite`/`secure`) — not in
  the command's four questions, not measured.
- Whether `/api/contests/enter`'s 8/min IP limit survives a proxy that does not
  set `x-forwarded-for`; it falls back to `"anon"`, which would make the limit
  global rather than per-caller. Worth a look, out of scope here.
- Middleware `PROTECTED_ROUTES` covers `/dashboard`, `/admin`, `/cockpit` only.
  Whether that list is meant to be exhaustive is a product decision, not an
  audit finding.

## Verification

`npm run typecheck` 0 · `npm run lint` 0 · `guard:secrets` OK 10,826 files ·
`guard:commercial-copy` OK 470 files · `guard:trust` OK 3,329 files ·
`guard:openapi-security` OK 3 contracts · `guard:api-v1-boundary` OK ·
`auth-scan.mjs --selftest` PASS (proves the gate rule can fire, so a future
zero is a real zero) · `vitest jarvis-memory-authorization.test.ts` 9/9.

**No product code, schema, gate, env flag or dependency was touched.** The four
committed files are this report and three read-only helpers under `handoff/`.
