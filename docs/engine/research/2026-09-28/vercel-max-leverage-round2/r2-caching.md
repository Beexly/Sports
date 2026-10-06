# Next.js App Router caching — deep research for GSE sports-web on Vercel

**Date:** 2026-09-28 · **Constraint applied:** public web sources only; no repository access, no deployment/testing.
**Every factual claim carries its source URL.** Anything not verifiable from public documentation is labeled **queued for evaluation**.

---

## 0. The decision that frames everything: which caching model is your app on?

Next.js 16 documents two mutually exclusive caching models, and mixing them is a build error, not a warning:

1. **Previous model (default, no `cacheComponents`)** — the App Router caching most apps run today: route segment exports (`export const revalidate`, `export const dynamic`), `fetch(url, { next: { revalidate, tags }})`, `revalidatePath` / `revalidateTag`, ISR on route handlers. [source](https://preview.nextjs.org/docs/app/getting-started/caching) · [source](https://preview.nextjs.org/docs/app/guides/migrating-to-cache-components)
2. **Cache Components model (Next.js 16, opt-in)** — enabled by top-level `cacheComponents: true` in `next.config.ts`. Uses the `'use cache'` directive, `cacheLife`, `cacheTag`, `updateTag`, `revalidateTag(tag, profile)`. PPR (Partial Prerendering) becomes the default rendering behavior once enabled. [source](https://preview.nextjs.org/docs/app/getting-started/caching)

Critical migration fact: **when Cache Components is enabled, route segments that still export `dynamic`, `revalidate`, or `fetchCache` error** — "this will likely be the biggest change." Existing `fetch` and `unstable_cache` caching keeps working during migration. [source](https://preview.nextjs.org/docs/app/guides/migrating-to-cache-components)

**Bottom-line recommendation for GSE:** implement the previous model now (Section 1–4), and treat Cache Components as a deliberate later migration (Section 5, evaluation checklist), not an incremental adoption. Whether your sports-web app has `cacheComponents: true` is **queued for evaluation** (check `next.config.ts` in the repo — not inspected for this research).

> Note: the docs observed for this research are Next.js **v16.3.6** (last updated 2026-06-25 / 2026-08-25); the Cache Components migration guide was last updated **2026-09-10**, i.e. days before this research. [source](https://nextjs.org/docs/app/api-reference/functions/updateTag)

---

## 1. ISR in the App Router (previous model)

### 1.1 Time-based revalidation — one export per route

`export const revalidate` accepts `false | 0 | number` and defaults to `false`:

| Value | Meaning |
|---|---|
| `false` (default) | Cache indefinitely; only on-demand revalidation refreshes it |
| `0` | Always revalidate — effectively dynamic |
| `N` (seconds) | Revalidate at most once every N seconds (stale-while-revalidate) |

[source](https://github.com/sylvanxd/next.js/blob/HEAD/docs/01-app/03-api-reference/02-file-conventions/10-route-segment-config.mdx)

On a **static route** (`revalidate = false`), the cached page is served from cache until you call on-demand revalidation. [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)

### 1.2 Data-level control — `fetch` with `next: { revalidate, tags }`

Per-request cache control on `fetch`:

```ts
fetch('https://...', { next: { revalidate: 3600 } })   // cache 1h
fetch('https://...', { next: { revalidate: false } })  // cache indefinitely
fetch('https://...', { next: { tags: ['a', 'b'] } })    // tag for on-demand invalidation
fetch('https://...', { next: { revalidate: 0 } })      // never cache
```

[source](https://github.com/sgaoperations/aplio/blob/HEAD/docs/ENGINEERING.md)

When multiple `fetch` calls in a route use different `revalidate` frequencies, **the lowest time is used for ISR**; using a high revalidation window with on-demand invalidation is the recommended precise pattern. [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)

### 1.3 On-demand revalidation — `revalidatePath` / `revalidateTag`

Callable from Route Handlers and Server Actions ([source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)):

- `revalidatePath('/projections')` — purges that path; the next request regenerates it.
- `revalidateTag('slate')` — purges all fetches tagged `'slate'`, then each tagged fetch revalidates individually; stale data is served in the meantime (stale-while-revalidate).

**ISR caveats that matter operationally** (all from the official ISR guide, [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)):

- **Revalidation is lazy.** After `revalidatePath`, regeneration happens on the *next request*, not immediately. A cron-triggered revalidation should optionally warm the page by fetching it afterward.
- **Background regeneration (stale-while-revalidate) runs on the instance that receives the triggering request — on platforms with per-request billing, this background work counts as additional compute.** This is the revalidation cost on Vercel: one function invocation plus compute per regenerated page.
- If **any** fetch in the route uses `revalidate: 0` or `cache: 'no-store'`, the **whole route renders dynamically** — one uncached fetch poisons the route.
- **Proxy (middleware) does not run for on-demand ISR requests** — always revalidate the exact path.
- ISR is **only supported with the Node.js runtime** (default) and is **not supported with static export**.
- Verification: `next build && next start` (not dev), `NEXT_PRIVATE_DEBUG_CACHE=1` to log cache hits/misses, and the `x-nextjs-cache` response header: `HIT`, `STALE`, `MISS`, `REVALIDATED`.
- Build output legend (current docs): `○` Static — prerendered as static content; `◐` Partial Prerender — prerendered as static HTML with dynamic server-streamed content. [source](https://github.com/mtrackeros/next.js/blob/HEAD/docs/01-app/02-guides/building.mdx) · `λ` Dynamic, `ƒ` Function (serverless functions). [source](https://github.com/squaredr98/react-js-nextjs-challenge/blob/HEAD/CONCEPTS.md)

### 1.4 What a Route Handler can cache

Route Handlers are **not cached by default**; only `GET` can opt in under the previous model with `export const dynamic = 'force-static'`. Other HTTP methods stay dynamic even when placed in the same file as a cached GET. [source](https://github.com/samiislam851/next.js/blob/HEAD/docs/01-app/01-getting-started/15-route-handlers.mdx)

The "what makes a route dynamic" list (previous model): `cookies()`, `headers()`, `connection()`, awaited `searchParams`/`params` (unknown at build), `fetch` with `cache: 'no-store'` / `next: { revalidate: 0 }`, direct `DB.query()` calls, `export const dynamic = 'force-dynamic'`, `export const fetchCache = 'default-no-store'`. [source](https://github.com/rohanrajgautam/book-my-counselling/blob/HEAD/AGENTS.md)

And the **v15+ default change** that still bites: **fetch requests are not cached by default** — in v14 a bare `fetch()` was cached and reused; in v15 you must explicitly opt in. Additionally, a fetch is discovered in `next build` only if reachable before any request-time API; requests after a request-time API run on every request. [source](https://github.com/rohanrajgautam/book-my-counselling/blob/HEAD/AGENTS.md) · [source](https://github.com/sgaoperations/aplio/blob/HEAD/docs/ENGINEERING.md)

### 1.5 The Cache-Control headers Next.js emits (rendering strategy → CDN behavior)

Per the official CDN-caching guide (observed via a verbatim docs mirror):

- **Static pages** (no revalidation): `Cache-Control: s-maxage=31536000` (one year)
- **ISR pages** (time-based): `s-maxage={revalidate}, stale-while-revalidate={expire - revalidate}` (default `expire` is one year)
- **Dynamic pages** (no caching): `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`

CDNs respecting `s-maxage`/`stale-while-revalidate` cache static/ISR pages at the edge. Note for third-party CDNs: on-demand `revalidateTag()`/`revalidatePath()` invalidates the Next.js server cache, but the CDN keeps its copy until the `s-maxage` TTL expires — CDN purges must be triggered alongside. (On Vercel's own CDN the ISR/CDN layers are integrated; purges propagate globally in ~300ms.) [source](https://github.com/yournextstore/yournextstore/blob/HEAD/.next-docs/01-app/02-guides/cdn-caching.mdx) · [source](https://github.com/catcorner22/cursor_skills/blob/HEAD/skills/vercel/cdn-caching/SKILL.md)

The dynamic-page header above is the mechanism for the internal fence (Section 4d): **no manual header needed** — force a route dynamic and Next emits `private, no-cache, no-store` for you.

---

## 2. The `'use cache'` directive (Cache Components model, Next 16)

### 2.1 Status and scope

`'use cache'` is **stable** (current docs v16.3.6, last updated 2026-08-25), requires Next.js 16 and `cacheComponents: true`, and is only available under Cache Components. It can be applied to an async server function, an async Server Component, or a module. [source](https://github.com/mtrackeros/next.js/blob/HEAD/docs/01-app/03-api-reference/01-directives/use-cache.mdx) · [source](https://nextjs.org/docs/app/api-reference/functions/cacheLife)

Key differences from the previous model ([source](https://github.com/mtrackeros/next.js/blob/HEAD/docs/01-app/03-api-reference/01-directives/use-cache.mdx)):

- It caches **any async work** — `fetch` calls, direct DB queries (e.g. Prisma/Drizzle `db.query.rankings`), even imported third-party data.
- **Cache keys** are composed of the build ID, the function ID, the serializable arguments, and captured closure values.
- **Non-serializable arguments (class instances) are not allowed** and throw.
- **Cannot read `cookies()`, `headers()`, or `searchParams` inside** a `'use cache'` scope — read them outside and pass minimal serializable inputs in.
- `draftMode()` can be read inside; `enable()`/`disable()` throw. A `'use cache'` scope cannot create a new `'use cache'` scope (but can *call* other cached functions).
- `'use cache: remote'` and `'use cache: private'` variants exist for persistence/browser-cache (compliance) use cases. [source](https://github.com/samiislam851/next.js/blob/HEAD/docs/01-app/01-getting-started/15-route-handlers.mdx)

**Hard boundary:** `'use cache'` **cannot be the body of a Route Handler** — extract the cached work into a helper function and call it from the handler. [source](https://github.com/samiislam851/next.js/blob/HEAD/docs/01-app/01-getting-started/15-route-handlers.mdx)

### 2.2 Serverless persistence caveat (critical for Vercel cost modeling)

At runtime, `'use cache'` output is **in-memory by default**; "on serverless platforms, like Vercel, **entries typically don't persist across requests**," so cached DB-query results may still re-execute in a fresh serverless instance. Build-time prerendered static shells are still cacheable — the durability for cached *pages* comes from the prerender/CDN layer, not the runtime in-memory cache. [source](https://preview.nextjs.org/docs/app/getting-started/caching)

Practical consequence: **`'use cache'` on a helper alone does not replace ISR for cost savings on Vercel** — the route itself must be statically prerendered (in the shell) so the CDN serves it without invoking the function.

### 2.3 `cacheLife` profiles (built-in, current)

`cacheLife(profile)` sets stale / revalidate / expire for the enclosing `'use cache'` scope. Current built-ins ([source](https://nextjs.org/docs/app/api-reference/functions/cacheLife), [source](https://nextjs.org/docs/app/getting-started/revalidating)):

| Profile | stale | revalidate | expire |
|---|---|---|---|
| `default` | 5m | 15m | never |
| `seconds` | 30s | 1s | 1m |
| `minutes` | 5m | 1m | 1h |
| `hours` | 5m | 1h | 1d |
| `days` | 5m | 1d | 1w |
| `weeks` | 5m | 1w | 30d |
| `max` | 5m | 30d | 1y |

Custom profiles go under **top-level** `cacheLife` in `next.config.ts` (not under `experimental`). [source](https://nextjs.org/docs/app/api-reference/functions/cacheLife)

For event-driven freshness (slate publish, rankings publish): use `cacheTag('slate')` + a long profile like `'max'` — "keep it in the static shell" — and invalidate via webhook/cron, rather than time-based polling. [source](https://nextjs.org/docs/app/getting-started/revalidating)

### 2.4 `updateTag` vs `revalidateTag` — the critical correction

- **`updateTag(tag)`** is stable in Next 16 docs, **but can only be called from a Server Action**. It *immediately* expires cached data; the next request waits for fresh data (no stale-while-revalidate). It must be called from a component's Server Action or `useActionState` — never from a Route Handler or cron endpoint. [source](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- **`revalidateTag(tag, profile)`** — in Next 16, `revalidateTag` takes a **second required argument, the cache profile**: `revalidateTag('posts', 'max')` gives stale-while-revalidate semantics; omitting the profile gives legacy behavior (equivalent to `updateTag`). Call it from a Route Handler, cron handler, or Server Action. [source](https://nextjs.org/docs/app/api-reference/functions/updateTag) · [source](https://github.com/midfieldmafia/cfb-pickem/blob/HEAD/docs/research/vercel-neon-nextjs-constraints.md)
- `revalidatePath(path)` also works in Route Handlers and Server Actions. [source](https://nextjs.org/docs/app/getting-started/revalidating)

This is a correction to any plan that shows `updateTag` inside a cron `route.ts` — it will not work there; use `revalidateTag(tag, 'max')` (or `revalidatePath`) in the cron handler and reserve `updateTag` for Server Actions.

---

## 3. PPR status (late 2026)

- PPR is **stable** and becomes the **default rendering behavior once Cache Components is enabled** (Next 16). The old opt-ins are gone: `experimental_ppr`, `experimental.dynamicIO`, and `experimental.useCache` have been removed or replaced by the `cacheComponents` flag. [source](https://preview.nextjs.org/docs/app/getting-started/caching) · [source](https://preview.nextjs.org/docs/app/guides/migrating-to-cache-components)
- Current flag shape ([source](https://preview.nextjs.org/docs/app/guides/migrating-to-cache-components)):
  ```ts
  const nextConfig = {
    cacheComponents: true,
  }
  ```
- Static/predictable content and sufficiently long-lived `'use cache'` output go into the **static shell**; request-time data and uncached async work must move behind `<Suspense>` boundaries and stream in as **dynamic holes**. [source](https://preview.nextjs.org/docs/app/getting-started/caching)
- **Validation is strict**: uncached async work rendered outside a Suspense boundary produces a build/validation error; `cookies()`, `headers()`, `searchParams`, unknown-at-build params, `Math.random()`/`Date.now()` at prerender scope, and runtime APIs inside `'use cache'` are all flagged. [source](https://preview.nextjs.org/docs/app/getting-started/caching) · [source](https://github.com/midfieldmafia/cfb-pickem/blob/HEAD/docs/research/vercel-neon-nextjs-constraints.md)
- Canonical shape ([source](https://preview.nextjs.org/docs/app/guides/migrating-to-cache-components)):
  ```tsx
  import { Suspense } from 'react'

  export default function Page() {
    return (
      <>
        <StaticHeader />
        <CachedRankings />
        <Suspense fallback={<UserControlsSkeleton />}>
          <RequestSpecificControls />
        </Suspense>
      </>
    )
  }
  ```

**PPR vs plain ISR for GSE's pages:** when projections/rankings are identical for every visitor, **plain hole-free ISR (previous model) is cheaper than PPR**. Vercel's cache-layer documentation is explicit: **"A route with holes still invokes the function on a shell hit; a holeless route is just ISR (a pure prerender HIT)."** [source](https://github.com/catcorner22/cursor_skills/blob/HEAD/skills/vercel/cdn-caching/SKILL.md) — a PPR shell hit still runs server compute for the dynamic holes, while hole-free ISR serves from CDN/ISR cache with zero invocation. Reserve PPR for pages that genuinely need per-request content; GSE's public pages don't.

Whether Client Components affect the static shell is **queued for evaluation** (no first-party citation found in this research pass).

---

## 4. Cost gotchas specific to Vercel

All of these are verified from public sources; each is cheap to fix once and expensive while unfixed:

1. **A route that should be static is silently dynamic.** `cookies()`, `headers()`, awaited `searchParams`, or a single `cache: 'no-store'` fetch anywhere in the route opts the whole route into per-request rendering (previous model). Symptom: response carries `Cache-Control: private, no-cache, no-store` and `x-nextjs-cache` is absent. Diagnosis: `next build && next start`, `curl -sI <url> | grep -i cache-control`, `NEXT_PRIVATE_DEBUG_CACHE=1`. [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx) · [source](https://github.com/rohanrajgautam/book-my-counselling/blob/HEAD/AGENTS.md)
2. **Function invocations are the meter that matters; cache hits don't count.** "Cache hits never count as function invocations." [source](https://github.com/rector-labs/core/blob/HEAD/content/journal/understanding-vercel-usage.md) — every public page that serves from ISR/CDN cache is free of invocation cost.
3. **ISR cache reads/writes are billed in 8 KB units; writes are roughly 10× pricier than reads** (per a Vercel-cost reference using the public `vercel.json` `isr` pricing fields). CDN cache reads/writes are free. [source](https://github.com/saleor/storefront/blob/HEAD/skills/saleor-paper-storefront/rules/paper-vercel-cost.md)
4. **Revalidation costs compute.** Time-based revalidation regenerates on the triggering instance, and on per-request billing platforms that background work counts as additional compute — so prefer **long revalidate windows plus on-demand invalidation** over short polling windows. [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)
5. **`'use cache'` runtime output does not durably persist on serverless** — in-memory entries typically don't survive across Vercel requests; don't model DB-query savings on it. Durable savings come from the prerendered shell + CDN. [source](https://preview.nextjs.org/docs/app/getting-started/caching)
6. **PPR holes cost invocations on shell hits** (Section 3) — hole-free ISR is the cheapest shape for uniform pages. [source](https://github.com/catcorner22/cursor_skills/blob/HEAD/skills/vercel/cdn-caching/SKILL.md)
7. **Unverified / queued for evaluation:** whether Vercel Fluid Compute is enabled on GSE's project (changes how background revalidation is billed); the exact ISR read/write unit counts on his current bill (check the Vercel dashboard usage tab).

---
## 5. Exact recommendations by page type

### 5a. Public projections page — hole-free ISR, event-driven invalidation (previous model)

The projections page is identical for every visitor, so it should have **no dynamic holes** and refresh only when a slate publishes. Recommended:

```tsx
// app/projections/page.tsx
export const revalidate = false // cache indefinitely; only on-demand refreshes it

import { getCurrentSlate } from '@/lib/slate'

export default async function ProjectionsPage() {
  const slate = await getCurrentSlate() // direct DB read; runs at build + on regeneration
  return <ProjectionsView slate={slate} />
}
```

Why `revalidate = false` + on-demand instead of time-based polling: time-based revalidation would regenerate (one invocation + compute) on every window whether or not the slate changed; on-demand regenerates only on publish. The official guidance is exactly this: high (or indefinite) revalidation windows with on-demand invalidation. [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)

**Invalidation from the slate-publish flow.** The cleanest wiring: the existing publish job calls revalidation at the end of its run. If publish runs in a Vercel Cron route handler, add `revalidatePath` there (Route Handlers may call it — [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)). Otherwise use a dedicated secret-protected route hit by the publisher:

```ts
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  revalidatePath('/projections')
  // Optional: warm the cache so the next visitor gets fresh HTML immediately.
  // revalidatePath is lazy — regeneration happens on the next request.
  await fetch(new URL('/projections', request.url).toString())
  return NextResponse.json({ revalidated: true })
}
```

The CRON_SECRET pattern is Vercel's documented cron auth: Vercel Cron sends an HTTP GET to the production deployment URL with `Authorization: Bearer <CRON_SECRET>`; schedules are declared in `vercel.json` (cron expressions use UTC), and cron delivery can miss or duplicate an invocation, so jobs should be idempotent. [source](https://github.com/theimhtikesoe/new-life-ledger/blob/HEAD/audit/vercel-cron-reference-2026-08-27.md) (audit of https://vercel.com/docs/cron-jobs, https://vercel.com/docs/cron-jobs/manage-cron-jobs, 2026-08-27)

```json
// vercel.json (example — only needed if publish is schedule-driven)
{ "crons": [{ "path": "/api/cron/publish-slate", "schedule": "0 10 * * 3" }] }
```

A route handler that only runs revalidation stays dynamic by design (Route Handlers are dynamic by default — [source](https://github.com/samiislam851/next.js/blob/HEAD/docs/01-app/01-getting-started/15-route-handlers.mdx)) — that is correct and cheap (one invocation per publish).

**Cache Components variant (if migrated):**

```ts
// lib/slate.ts
import { cacheLife, cacheTag } from 'next/cache'

export async function getCurrentSlate() {
  'use cache'
  cacheLife('max') // long-lived; refreshed on demand
  cacheTag('slate')
  return db.query.slates.findFirst({ /* ... */ })
}
```

```ts
// app/api/cron/publish-slate/route.ts
import { revalidateTag } from 'next/cache'
// ... auth check as above ...
revalidateTag('slate', 'max') // NOT updateTag — updateTag is Server Actions only
```

`revalidateTag(tag, profile)` needs the second profile argument in Next 16; `updateTag` from a Route Handler is not allowed. [source](https://nextjs.org/docs/app/api-reference/functions/updateTag)

### 5b. Public weekly rankings page — weekly TTL, on-demand as primary

Two equivalent options; **prefer on-demand with a safety-net TTL**:

```tsx
// app/rankings/page.tsx
export const revalidate = 86400 // 24h safety net if the publish signal ever misses

export default async function RankingsPage() {
  const rankings = await getWeeklyRankings() // direct DB read
  return <RankingsView rankings={rankings} />
}
```

The rankings publish job (Vercel Cron or wherever it runs) calls `revalidatePath('/rankings')` on success, same pattern as 5a. If a pure time-based schedule is acceptable, `export const revalidate = 604800` regenerates at most once per week (stale-while-revalidate: the triggering visitor gets stale HTML, the next gets fresh). [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)

Cache Components variant: `cacheLife('weeks')` + `cacheTag('rankings')`, invalidated by `revalidateTag('rankings', 'max')` from the publish route; the `weeks` profile gives 5m stale / 1w revalidate / 30d expire. [source](https://nextjs.org/docs/app/api-reference/functions/cacheLife)

### 5c. Internal read API routes (signals read surface)

**Rule: cache only what is safe to share.** Route Handlers are uncached by default; a GET that returns *public-safe derived data* can opt into caching:

```ts
// app/api/signals/public/route.ts  — only if the payload is public-safe
export const dynamic = 'force-static'
export const revalidate = 300 // 5m

export async function GET() {
  const signals = await getPublicSignals() // direct DB read
  return Response.json(signals)
}
```

Only `GET` caches under this pattern; POST/PUT/DELETE in the same file remain dynamic. [source](https://github.com/samiislam851/next.js/blob/HEAD/docs/01-app/01-getting-started/15-route-handlers.mdx)

**If the read surface is authenticated or per-user (internal tooling), do the opposite:** keep it dynamic and uncached:

```ts
export const dynamic = 'force-dynamic' // → Cache-Control: private, no-cache, no-store automatically
```

Security guidance concurs: never put user-specific or sensitive data behind `force-static`/shared caches, and set explicit private/no-store semantics for sensitive responses. [source](https://github.com/khaneliman/khanelinix/blob/HEAD/modules/common/ai-tools/skills/security-toolkit/references/javascript-typescript-nextjs-web-server-security.md) · [source](https://github.com/yournextstore/yournextstore/blob/HEAD/.next-docs/01-app/02-guides/cdn-caching.mdx)

Given the **public/private surface doctrine** (public site shows only projections and rankings; all signals/methodology stay behind the fence), the signals read API should default to the private variant unless a specific payload has been cleared as public.

### 5d. Pages behind the internal fence — force dynamic, private by default

```tsx
// app/internal/.../page.tsx
export const dynamic = 'force-dynamic'
```

This makes the route render per request, and Next.js automatically emits `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` for dynamic pages — **no manual header code needed**. [source](https://github.com/yournextstore/yournextstore/blob/HEAD/.next-docs/01-app/02-guides/cdn-caching.mdx)

Pair with request-time auth in `proxy.ts`/middleware so unauthenticated requests never reach the page. If Cache Components is ever enabled, keep sensitive reads **outside** any shared `'use cache'` scope (cached work is keyed by build ID + function ID + arguments — a shared cache key must never serve one user's proprietary data to another). [source](https://github.com/mtrackeros/next.js/blob/HEAD/docs/01-app/03-api-reference/01-directives/use-cache.mdx)

---

## 6. Migration checklist (Cache Components — later, deliberate)

Queued as a single migration, not incremental adoption, because enabling `cacheComponents` errors on leftover `dynamic`/`revalidate`/`fetchCache` exports ([source](https://preview.nextjs.org/docs/app/guides/migrating-to-cache-components)):

1. `cacheComponents: true` in `next.config.ts`; move custom `cacheLife` profiles to top-level config. [source](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
2. Replace `export const revalidate` with `'use cache'` + `cacheLife(profile)` + `cacheTag(tag)` on the data functions. [source](https://preview.nextjs.org/docs/app/guides/migrating-to-cache-components)
3. Replace `revalidatePath` cron invalidation with `revalidateTag(tag, 'max')` in the publish/cron route handler; reserve `updateTag` for Server Actions only. [source](https://nextjs.org/docs/app/api-reference/functions/updateTag)
4. Audit for strict-validation errors: uncached async work outside `<Suspense>`, `cookies()`/`headers()`/`searchParams` in the shell, `Math.random()`/`Date.now()` at prerender scope. [source](https://preview.nextjs.org/docs/app/getting-started/caching)
5. Keep the internal fence: `'use cache'` helpers must not capture per-user secrets; sensitive routes stay dynamic with private headers. [source](https://github.com/mtrackeros/next.js/blob/HEAD/docs/01-app/03-api-reference/01-directives/use-cache.mdx)

---

## 7. Queued for evaluation (not verified from public docs in this pass)

- Whether sports-web runs with `cacheComponents: true` and which Next.js major version is installed (check `next.config.ts` / `package.json`; repo not inspected for this research).
- Whether Client Components alone affect the PPR static shell (no first-party citation found).
- Whether Vercel Fluid Compute is enabled on the GSE project (affects how background revalidation compute is billed).
- Exact ISR read/write unit counts on the current Vercel bill (check dashboard usage tab).
- Eager/on-build regeneration for App Router ISR: official docs say "we're working on adding new methods for programmatically or automatically triggering regenerations" — status unconfirmed. [source](https://github.com/acdlite/next.js/blob/HEAD/docs/01-app/02-guides/incremental-static-regeneration.mdx)
- Third-party CDN behavior in front of Vercel: the "on-demand revalidation doesn't reach the CDN until s-maxage expires" caveat applies to external CDNs; on Vercel's integrated CDN purges propagate globally in ~300ms (per community Vercel cache-layer reference — verify against the Vercel dashboard if a third-party CDN is ever added). [source](https://github.com/catcorner22/cursor_skills/blob/HEAD/skills/vercel/cdn-caching/SKILL.md)
