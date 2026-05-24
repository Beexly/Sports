# ADR 003 — Next.js 16 and Turbopack Migration

**Status:** Accepted
**Date:** 2026-05-24
**Author:** Autonomous Operator (overnight session)

## Context

`next@14.2.35` had 14 HIGH-severity CVEs including DoS, HTTP request
smuggling, cache poisoning, SSRF, and XSS. The CVEs were unfixable within
the 14.x line — the only remediation path was a major version upgrade.

Additionally, Next.js 14 used webpack as the default bundler. Next.js 16
defaults to Turbopack, which is incompatible with webpack extension aliases
and requires `.js` extensions to be removed from TypeScript relative imports
in workspace packages.

## Decision

Upgrade from `next@14.2.35` → `next@16.2.6` with the following required
changes:

1. **`next.config.mjs`**: Replace `experimental.serverComponentsExternalPackages`
   with `serverExternalPackages`. Add `turbopack: {}`. Replace
   `images.domains` with `images.remotePatterns`. Remove all webpack config.

2. **`middleware.ts` → `proxy.ts`**: Next.js 16 uses a new route protection
   paradigm. The file was renamed and the export renamed from `middleware` to
   `proxy` to match the expected export name.

3. **Async params/searchParams**: All dynamic page components (`params`,
   `searchParams`) must be `Promise<T>` types and awaited before use. This
   affects ~15 pages and API route handlers.

4. **Workspace package imports**: Turbopack does not support `.js` extension
   resolution aliasing. All relative imports like `from "./scoring.js"` must
   become `from "./scoring"` across all workspace packages (37 occurrences).

5. **`cockpit/layout.tsx`**: Added `export const dynamic = "force-dynamic"`
   to prevent static prerender of admin-only pages during build.

6. **`proxy.ts` middleware contract test**: Updated to reference `proxy.ts`
   instead of `middleware.ts`.

## Consequences

**Positive:**
- 14 HIGH CVEs eliminated (verified via `npm audit --audit-level=high`)
- Turbopack as default bundler: faster local builds and HMR
- React 19 compatibility via `react@^18.3.1 || ^19.0.0` peer deps
- CI now gates on HIGH/CRITICAL CVEs (`npm audit --audit-level=high`)

**Negative:**
- Breaking change: async params pattern required changes across all dynamic
  pages. Any future page or API route must use `await params` / `await searchParams`.
- Workers/packages using `moduleResolution: "node"` must add
  `"ignoreDeprecations": "5.0"` until they migrate to ESM.
- `next@16.2.6` has 3 residual MODERATE CVEs via postcss (unfixable until
  `next@16.3.0+` which is not yet stable as of 2026-05-24).

## Alternatives Considered

- **Stay on Next.js 14**: Unacceptable — 14 HIGH CVEs with no fix in 14.x.
- **Upgrade to Next.js 15**: 15.x was skipped because 16 was already stable
  and provides more complete Turbopack integration.
- **Canary build of next@16.3.0**: Would fix postcss MODERATE but canary
  builds are not suitable for production. Watch for next@16.3.0 stable.
