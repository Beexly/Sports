# 11 — Performance / Reliability / Observability

**Grade: C+ (deploy target) / B (canonical platform) — split by clone.**

**Verdict (honest).** The engineering instincts here are good: health checks fail closed on stale data, the RSC/WebGL bundle hygiene in the canonical platform is genuinely excellent (every Three.js scene is `'use client'` + `dynamic(ssr:false)` with a static fallback), and degraded payloads exist on the read-heavy slate path. But the two clones have **drifted apart on exactly the surfaces this lens cares about**, and the drift cuts against the launch target. The OSS observability stack (PostHog, Langfuse, SigNoz/OTel, Novu, Unkey, Formbricks, Trigger.dev) and the server-startup `instrumentation.ts` live **only in canonical** — the actual deploy clone `C:/Users/Garrett/Sports` has **none of it wired**, so a production incident there is observable only through raw `console.*` in Vercel logs. The deploy clone also has the cleaner liveness/readiness *split* (`/api/live`, `/api/ready`, `/api/health`) that canonical lacks — so neither clone is the strict superset. Net: failures are **partially** observable in prod, error-tracking is **not** wired on either clone's client error boundary, and several launch-critical DB reads throw unhandled 500s instead of degrading. None of this is launch-blocking on its own, but the observability gap on the deploy target is the thing most likely to make a real incident invisible.

Clones audited: **DEPLOY** = `C:/Users/Garrett/Sports` (launch target), **CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform). Forward-slash paths. Read-only audit.

---

## Findings by severity

### P1 — Observability stack is absent on the DEPLOY target (canonical-only)

**Clone: both (the gap is on deploy).** The OSS observability/telemetry stack is wired in CANONICAL and **completely missing** from the DEPLOY clone:

- CANONICAL `apps/web/package.json:18-42` declares `@opentelemetry/*`, `posthog-js`/`posthog-node`, `langfuse`, `@novu/node`, `@unkey/api`, `@formbricks/js`, `@trigger.dev/sdk`. DEPLOY `apps/web/package.json:16-35` declares **none** of these.
- CANONICAL has `apps/web/instrumentation.ts` (server-startup hook) which calls `initOtel()` (`apps/web/lib/observability/otel.ts:22`) and `experimental.instrumentationHook: true` in `next.config.mjs:16`. DEPLOY has **no** `instrumentation.ts` and **no** `instrumentationHook` flag (`apps/web/next.config.mjs:11-13`).
- CANONICAL wires `PostHogProvider` + `FormbricksProvider` in `app/layout.tsx:221-226`. DEPLOY does not (no PostHog dependency exists to wire).

The integrations are all correctly **no-op without keys** (e.g. `otel.ts:23` `if (!ENDPOINT) return;`, `langfuse.ts:20` `if (!SECRET_KEY || !PUBLIC_KEY) return null;`, `posthog-provider.tsx:45` returns children untouched when `!KEY`) — so they are zero-risk to enable. The problem is they only exist on the clone we are **not** shipping. On the deploy target, the only production signal is `console.warn`/`console.error` in Vercel's log stream (e.g. `lib/health/checks.ts:30,66`). There is no traces backend, no product analytics, no AI-call cost/latency tracing, no error aggregation.

**Recommendation (founder reconciliation call).** Decide whether the deploy target should carry the observability stack. If yes, port `instrumentation.ts` + `lib/observability/otel.ts` + the analytics providers into DEPLOY (they stay inert until keys are set, so this is safe to merge pre-launch). At minimum, set `SIGNOZ_OTLP_ENDPOINT` (or equivalent) so server traces exist before launch night. This is the single highest-leverage reliability fix because right now a prod incident on the launch site is near-blind.

---

### P1 — Client error boundary captures nothing to a sink (both clones)

**Clone: both.** `apps/web/app/error.tsx:20-23` (DEPLOY) and the identical handler in CANONICAL only `console.error("[app] error boundary caught:", error)`. There is no `Sentry.captureException`, no `posthog.capture`, no OTel span — even in CANONICAL where PostHog is available. The on-screen copy even promises "the observatory has the trace either way" (`error.tsx:43`), but on the DEPLOY clone **no trace is captured at all**: `console.error` inside a client component lands in the browser console, not in any server log or backend. The production digest is shown (`error.tsx:29-33`) which is good for support correlation, but only if someone is already tailing Vercel server logs for that digest.

Additionally, **neither clone has `app/global-error.tsx`** (confirmed: glob returns no file in either). `error.tsx` does not catch errors thrown in the root `layout.tsx`/`template.tsx` — those will hit Next's default white-screen error page with no on-brand fallback and no capture.

**Recommendation.** (1) Wire the error boundary to a sink: in CANONICAL, `posthog.capture("$exception", { digest, message })`; on DEPLOY, at minimum POST the digest+message to a lightweight `/api/client-error` route that `console.error`s server-side so it lands in Vercel logs. (2) Add `app/global-error.tsx` on both clones for root-layout error coverage.

---

### P1 — Launch-critical DB reads throw unhandled 500s instead of degrading (DEPLOY)

**Clone: DEPLOY.** The public picks endpoint `apps/web/app/api/picks/route.ts` gates correctly on readiness (`route.ts:12-14` returns 503 via `bootstrapGateResponse` when picks can't be exposed), but the actual data path is unguarded:
- `route.ts:38` `await db.pick.findMany(...)` has **no surrounding try/catch**.
- `route.ts:17,19` `await auth()` and `await getUserEntitlements(...)` are also unguarded.

A database outage (or a slow/timed-out connection) on this, the product's primary public surface, produces an unhandled exception → Next returns an opaque 500. Contrast with the sibling slate route `apps/web/app/api/picks/daily-slate/route.ts:21-23`, which does this right: `await db.pick.count(...).catch(() => 0)` degrades to an empty-but-valid payload. The good pattern exists in the codebase; it just isn't applied consistently on the highest-traffic route.

The Stripe webhook `apps/web/app/api/webhooks/stripe/route.ts` wraps signature verification (`:19-29`) and event handling (`:39-54`) in try/catch, but the idempotency lookup `db.webhookEvent.findUnique` at `:32-34` sits **outside** any try/catch — a DB blip there returns an unhandled 500 to Stripe. Stripe retries webhooks, so this self-heals, but it's an unguarded DB call on the money path that will spew unexplained 500s.

**Recommendation.** Wrap the picks `findMany` (and the auth/entitlements calls) in try/catch that returns a degraded `{ success: true, data: [], meta: { degraded: true } }` (200) or an explicit 503 — not a bare 500. Move the Stripe idempotency lookup inside the existing try/catch. Audit the other ~24 DB-touching routes for the same pattern (the `.catch(() => fallback)` idiom from `daily-slate` is the model to replicate).

---

### P2 — No automatic schema migration on the DEPLOY build (clone drift)

**Clone: DEPLOY.** Memory/runbook says "migrations must lead code" and "migrate-in-build added to vercel.json." That is true in **CANONICAL**: `vercel.json:3` runs `... && node scripts/migrate-if-configured.mjs && npm run build ...` and the script exists at `scripts/migrate-if-configured.mjs`. In **DEPLOY**, `vercel.json:3` runs only `... && npm run db:generate && npm run build ...` — **no migrate step**, and `scripts/migrate-if-configured.mjs` **does not exist** in the deploy clone (confirmed via glob). So on the actual launch target, a schema change shipped with code will **not** auto-migrate the production DB; the app boots against an out-of-date schema and every Prisma query referencing the new column throws at runtime.

**Recommendation (founder/infra).** Decide the migration strategy for the deploy target explicitly. Either port `scripts/migrate-if-configured.mjs` + the build step into DEPLOY `vercel.json`, or document that migrations are run manually pre-deploy (and gate the deploy on it). Do not flip this silently — it touches prod DB. Flag for founder sign-off.

---

### P2 — `three` is a dead dependency on the DEPLOY clone (bundle/install bloat)

**Clone: DEPLOY.** `apps/web/package.json:35` declares `"three": "^0.184.0"` (and `@types/three` in devDeps), but **`three` is never imported anywhere in DEPLOY source** (grep for `from "three"` / `import * as THREE` returns zero hits). The deploy hero deliberately avoids it — `components/hero/interactive-galaxy.tsx:8` is explicitly "Pure 2D canvas. No Three.js. Smaller bundle." So Three.js (~150kB min+gz, ~600kB unpacked) is installed on every CI/Vercel build for nothing. It is tree-shaken out of the client bundle (no import), so there's no runtime payload cost — this is install-time/build-time bloat and a maintenance smell, not a Core-Web-Vitals hit.

**Recommendation.** Remove `three` and `@types/three` from DEPLOY `apps/web/package.json`. (In CANONICAL `three` is genuinely used and correctly lazy-loaded — see strengths — so leave it there.)

---

### P2 — Liveness/readiness split exists on DEPLOY but NOT on CANONICAL (clone drift)

**Clone: CANONICAL (missing the split).** DEPLOY has the textbook three-way split:
- `app/api/live/route.ts:6-15` — **always 200**, no dependencies touched (true liveness; a passing process probe).
- `app/api/ready/route.ts:15` — `status: payload.ok ? 200 : 503` (dependency readiness; fails closed).
- `app/api/health/route.ts:16` — **always 200** with a dependency summary (liveness + diagnostics).

Shared logic is factored into `app/lib/health/checks.ts:23-78` and the freshness gate fails closed at 60 min (`checks.ts:8,59`) with a clear "do not loosen this" comment. This is genuinely well done.

CANONICAL has **only** `app/api/health/route.ts`, and its semantics are different: `route.ts:55` returns **503 when degraded**. There is no `/api/live` always-200 endpoint. If a platform liveness probe is pointed at CANONICAL's `/api/health`, a transient DB blip or stale-ingestion window (`route.ts:41` `ageHours > 2`) will make the probe return 503 and the orchestrator may **restart a healthy container** — exactly the liveness/readiness conflation the DEPLOY split was built to avoid.

**Recommendation.** Standardize on DEPLOY's split. Port `lib/health/checks.ts` + `/api/live` + `/api/ready` into CANONICAL and make CANONICAL's `/api/health` always-200. Confirm the Vercel/uptime probe targets `/api/live` for liveness and `/api/ready` for traffic-gating.

---

### P3 — `node:zlib` RSC footgun is contained today but fragile (CANONICAL)

**Clone: CANONICAL.** `apps/web/lib/trends/nflverse-readiness.ts:1` imports `gunzipSync` from `node:zlib` at module top level, and the same module co-locates the **pure** helper `latestNflverseInspectionSeason` (`:47-50`). Today this is safe: the only importers are Server Components / route handlers — `app/trends/page.tsx:18` (a `force-dynamic` server page, `page.tsx:21`) and `app/cockpit/sources/page.tsx:480` (a string path, not an import). No `'use client'` component imports it (grep confirms). But the footgun is real: the moment any client component imports `latestNflverseInspectionSeason` (a tempting, innocuous-looking pure function) from this module, webpack pulls `node:zlib` into the client graph and the build breaks with a cryptic error. This exact class of issue is logged in project memory. DEPLOY has **zero** `node:zlib` usage anywhere (it lacks the nflverse intelligence layer entirely), so this is canonical-only.

**Recommendation.** Extract `latestNflverseInspectionSeason` (and any other pure helpers) into a `node:zlib`-free module (e.g. `lib/trends/season.ts`) so a future client import can never drag the Node built-in across the boundary. Low effort, removes a latent landmine.

---

### P3 — `engines.node` pinned at root only, not per-app (both clones)

**Clone: both.** Root `package.json:50-51` (DEPLOY) / `:52-53` (CANONICAL) pins `"node": ">=20.0.0"`, but the per-app `apps/web/package.json` has **no `engines` field**. Vercel reads the project-root or deployed-app `package.json` for the Node version; in a monorepo deploy where `apps/web` is the project root, the root pin may not be the one consulted, and `>=20.0.0` is a floor, not a pin (Node 22/23 would satisfy it). For reproducible builds this is loose.

**Recommendation.** Add an explicit `"engines": { "node": "20.x" }` (or the exact Vercel runtime, e.g. `"22.x"`) to `apps/web/package.json` on both clones, and/or set the Node version in the Vercel project settings so dev/CI/prod agree. Confirm which `package.json` Vercel actually reads for this monorepo layout.

---

## Strengths (real, grounded)

- **WebGL bundle hygiene is excellent (CANONICAL).** All four Three.js components are `'use client'` (`components/hero/consensus-engine-3d.tsx:1`, `consensus-constellation.tsx:1`, `slate-twin/galaxy-slate-twin.tsx:1`, `fantasy/league-twin-galaxy.tsx:1`) and every one is loaded via `dynamic(..., { ssr: false })` with a brand-matched static fallback: `components/hero/consensus-engine-3d-lazy.tsx:28-31`, `slate-twin/galaxy-slate-twin-lazy.tsx:19-24` (+ a GL-free `galaxy-slate-twin-static.tsx` stand-in), `fantasy/league-twin-lazy.tsx:22`. Three.js (~150kB) is correctly deferred out of first-load JS. This is exactly right and protects LCP.
- **Health checks fail closed on stale data, with intent documented.** `lib/health/checks.ts:55-60` and `app/api/health/route.ts:41` (canonical) treat stale ingestion as `error` and 503 readiness — the freshness rule (60 min deploy / 2h canonical) is enforced with an explicit "do not loosen this to make readiness green" comment (`checks.ts:56-57`). The readiness gate refuses to serve stale odds as live.
- **The clean liveness/readiness/health split on DEPLOY** (`api/live`, `api/ready`, `api/health`) with shared `loadHealthChecks()` is a correct, textbook design.
- **Every health check is individually try/caught** (`checks.ts:26-38, 40-74`) — a DB failure degrades the payload rather than crashing the endpoint, and logs a `console.warn` with the error message.
- **Degraded-payload pattern exists and works** on the slate path: `api/picks/daily-slate/route.ts:21-23` (`.catch(() => 0)`), plus stub/demo awareness baked in.
- **Observability integrations are genuinely no-op-safe** (CANONICAL): OTel (`otel.ts:23`), Langfuse (`langfuse.ts:20`), PostHog (`posthog-provider.tsx:45,67,79`) all guard on env presence and never block a request or crash on missing keys — zero overhead in dev/CI. Langfuse masks prompts/PII-ish content and PostHog masks all inputs in session replay (`posthog-provider.tsx:24-27`) — privacy-aware by default.
- **The graded-projections instrumentation hook is exemplary** (CANONICAL `instrumentation.ts`): founder-gated + inert by default (`:45-49`), non-blocking so it never delays cold starts (`:84-94`), Edge-bundle-safe via a literal `NEXT_RUNTIME` guard + dynamic import (`:77`), and a load failure can never crash startup (three layers of `.catch`).
- **Error boundary is production-aware:** `error.tsx:25-33` shows only the Next.js digest in prod (no stack leakage) and the full message in dev — correct security posture.
- **Security headers + API cache-control** are set in both `vercel.json` and `next.config.mjs` (`vercel.json:46-64`: HSTS, nosniff, frame-deny, scoped Permissions-Policy, `no-store` on `/api/*`).

---

## What would move this from C+/B to an A

1. **Make failures observable on the launch target.** Port the observability stack (`instrumentation.ts`, `lib/observability/otel.ts`, PostHog/Langfuse providers) into the DEPLOY clone — it stays inert without keys, so it's a safe pre-launch merge — and set at least one traces endpoint + product-analytics key before launch night. Wire `error.tsx` to actually capture exceptions to a sink (the copy already claims it does). Add `app/global-error.tsx`. (Resolves P1 #1, #2.)
2. **No bare 500s on money/launch paths.** Wrap the picks `findMany` and the Stripe idempotency lookup in try/catch with degraded/typed responses, mirroring the `daily-slate` `.catch()` idiom, then sweep the other DB-touching routes. (Resolves P1 #3.)
3. **Reconcile the two clones so the deploy target is the strict superset of what it needs.** Decide the migrate-in-build strategy for DEPLOY explicitly (founder/infra sign-off — it touches prod DB), give CANONICAL the always-200 `/api/live` split, drop the dead `three` dep from DEPLOY, and pin `engines.node` per-app on both. (Resolves P2 #4, #5, #6, P3 #9.)
4. **Defuse the latent RSC landmine.** Split the pure `latestNflverseInspectionSeason` out of the `node:zlib` module in CANONICAL. (Resolves P3 #7.)
5. **Add a thin synthetic-uptime signal in prod.** DEPLOY already has a synthetic-monitoring dashboard surface (`api/health/synthetic-monitoring/route.ts`, `lib/synthetic-monitoring/dashboard.ts`) reading from disk — close the loop with an external uptime probe hitting `/api/live` + `/api/ready` and alerting on 503, so a degraded readiness window pages someone instead of sitting silently in a JSON payload.

---

*Scope note: the data-source/mesh state is covered by the parallel data-mesh workstream (`docs/command-center/data-mesh/20-24`); this lens audits performance/reliability/observability and references that work only where the readiness/freshness gates intersect it.*
