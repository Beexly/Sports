# Validation Ledger

All results below were observed on 2026-07-15 in the recovery worktree.

| Check | Result | Honest boundary |
|---|---|---|
| `npm.cmd test` | 9,309 passed | 7,778 web + 13 crypto + 170 data ingestion + 14 DB + 106 ingestion pipeline + 1,151 prediction engine + 72 types + 5 content worker. Persistence/providers are mocked or stubbed where tests require it. |
| Final focused playback run | 14/14 passed | Delta, consumers, UI, and focusable scroll region after the accessibility fix. |
| `npm.cmd run typecheck` | Exit 0 | All workspaces. |
| `npm.cmd run lint` | Exit 0 | All workspace lint scripts, zero warnings. |
| `npm.cmd run build` | Exit 0 | Next 14.2.35 optimized build; type validity; 205 routes; `/room/[gameId]` dynamic. Used an unreachable non-secret local Postgres URL and local auth placeholder. |
| `npm.cmd run guardrails` | Exit 0 | Trust, model freeze, draft-only, Claude use, secret, API-v1, commercial/performance claims, NGS rights, partner, API payload, OpenAPI, ZK, AWS, and 34 eval contracts. |
| No-excuse checker | 32 files, zero violations | Exact bundled TypeScript rules; one non-null assertion was found and removed before commit. |
| `git diff --check` | Exit 0 | No whitespace errors in the staged implementation slice. |
| Commit hook | Exit 0 | Staged secret scan passed for all 35 implementation files. |
| Playwright + axe-core | Exit 0, both viewports | 1440x900 and 390x844; zero WCAG A/AA violations; no browser console/page errors; no page overflow; keyboard, scrubber, focus, transcript/table, reduced motion, and 200% text zoom passed. |

## Expected warnings, not hidden failures

- Next build emits the known Sentry/OpenTelemetry dynamic-require warning.
- The deliberate unreachable DB logs Prisma connection failures during legacy prerender loaders. Build still completes and degraded states render; this does not prove a live DB.
- Vite reports its CJS Node API deprecation warning during tests.

No result above proves production deployment identity, live provider data, production cron execution, or a real persisted playback record.
