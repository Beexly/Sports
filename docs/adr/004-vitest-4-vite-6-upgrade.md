# ADR 004 — vitest@4 + vite@6 Upgrade

**Status:** Accepted
**Date:** 2026-05-24
**Author:** Autonomous Operator (overnight session)

## Context

`vitest@2.x` + `vite@5.x` had 5 MODERATE CVEs:
- esbuild ≤0.24.2: any website can send requests to the dev server and read responses
- vite ≤6.4.1: transitive through vulnerable esbuild
- @vitest/mocker ≤3.0.0-beta.4: transitive through vite
- vite-node ≤2.2.0-beta.2: transitive through vite
- vitest 0.x–3.x: transitive through @vitest/mocker and vite

Additionally, vitest@2 used Vite's CJS build which emitted a deprecation
warning on every test run. vitest@4 uses ESM natively.

## Decision

Upgrade all test workspace packages from `vitest@^2.1.1` → `vitest@^4.1.7`
and `vite@5.x` → `vite@^6.3.0`.

Affected packages: `apps/web`, `packages/prediction-engine`,
`packages/data-ingestion`, `packages/types`.

`@vitejs/plugin-react@4.7.0` (already installed) supports Vite 4–7 and
required no version change.

## Consequences

**Positive:**
- 5 MODERATE CVEs eliminated (esbuild, vite, @vitest/mocker, vite-node, vitest)
- Total MODERATE CVEs: 8 → 3 (only next/postcss/next-auth chain remains)
- No more CJS build deprecation warning on test runs
- Test suite: 1,603+ tests, all passing after upgrade

**Negative:**
- vitest@4 requires `vite@^6.0.0 || ^7.0.0` — cannot be independently
  downgraded without also downgrading vite
- vitest@4 has some minor API differences from v2 (none affected this codebase)

## Alternatives Considered

- **Stay on vitest@2**: Acceptable for dev-only risk but leaves 5 CVEs open
  and the deprecation warning in every CI run.
- **Upgrade to vitest@3**: v3 doesn't fix the esbuild/vite CVEs; v4 is the
  first version with a clean audit.
