# Parked Libraries (complete code, no tests yet)

These libraries were generated during the analytics-toolkit build initiative but their
worker agents stalled before producing test suites. Per the project's non-negotiable rule
("Tests required — no feature is complete without passing tests"), they are **not** wired
into the `apps/web` build until they have passing test coverage.

| File | Lines | Status |
|---|---|---|
| `event-analytics.ts` | ~998 | Complete library, untested — needs a Vitest suite before integration |
| `forecasting-analytics.ts` | ~726 | Complete library, untested — needs a Vitest suite before integration |
| `risk-analytics.ts` | ~817 | Complete library, untested — needs a Vitest suite before integration |

To integrate any of these: move it back to `apps/web/lib/analytics/`, add
`apps/web/__tests__/<name>.test.ts` with ≥130 passing tests, run the green gate
(`tsc --noEmit` + targeted `vitest` + `trust-gate` + `model-freeze`), then add it to the
domain barrel in `apps/web/lib/analytics/index.ts`.

> NOTE: each came from an agent that hung — verify for runtime bugs (one sibling, `queue-utils`,
> shipped with an infinite-loop bug that was caught and fixed during this consolidation).
